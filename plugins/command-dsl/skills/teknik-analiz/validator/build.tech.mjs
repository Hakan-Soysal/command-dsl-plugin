/**
 * validate-tech.src.mts → validate-tech.mjs (tek dosyalık standalone bundle).
 *
 * `is-analizi-dsl/validator/build.mjs`'in TECH mirror'ı. Canlı CommandDSL deposunu
 * READ-ONLY okur; oraya HİÇBİR şey yazmaz. Çıktıyı yalnız bu validator dizinine
 * (validate-tech.mjs) koyar.
 *
 * Kullanım:
 *   node build.tech.mjs [<CommandDSL-yolu>]
 *   CMDDSL=<yol> node build.tech.mjs
 * Varsayılan CommandDSL yolu: ../../../CommandDSL (bu skill'in komşusu).
 *
 * BUILD_INFO drift tespiti içindir: grammarHash = sha256(tech-dsl.langium +
 * shared.langium); tech grammar değişince hash değişir → bayat bundle yakalanabilir.
 */
import { createRequire } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const cmdPath = resolve(process.env.CMDDSL ?? process.argv[2] ?? resolve(here, '../../../CommandDSL'));

const servicesEntry = resolve(cmdPath, 'src/tech/tech-dsl-module.ts');
if (!existsSync(servicesEntry)) {
    console.error(`Hata: TechDsl dil servisleri bulunamadı: ${servicesEntry}`);
    console.error(`CommandDSL yolunu argümanla veya CMDDSL ile ver.`);
    process.exit(2);
}

// esbuild'i CommandDSL'in node_modules'ından çöz (validator'ın kendi deps'i yok).
const require = createRequire(resolve(cmdPath, 'package.json'));
const esbuild = require('esbuild');

// --- BUILD_INFO ---
function sha(...files) {
    const h = createHash('sha256');
    for (const f of files) h.update(readFileSync(resolve(cmdPath, f)));
    return h.digest('hex').slice(0, 12);
}
const grammarHash = sha('tech-dsl.langium', 'shared.langium');

let commit = 'unknown';
let commitDate = 'unknown';
try {
    commit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: cmdPath })
        .toString().trim();
    commitDate = execFileSync('git', ['show', '-s', '--format=%cI', 'HEAD'], { cwd: cmdPath })
        .toString().trim();
} catch { /* git yoksa sorun değil */ }

let langium = 'unknown';
try {
    langium = JSON.parse(readFileSync(resolve(cmdPath, 'node_modules/langium/package.json')))
        .version;
} catch { /* */ }

const BUILD_INFO = {
    grammarVersion: `tech-v1.x-${grammarHash}`,
    grammarHash,
    commit,
    builtAt: commitDate,
    langium,
};

await esbuild.build({
    entryPoints: [resolve(here, 'validate-tech.src.mts')],
    outfile: resolve(here, 'validate-tech.mjs'),
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    // TechDsl services'i mutlak yola alias'la — kaynak portable kalır.
    alias: { '@techdsl/services': servicesEntry },
    // bare import'lar (langium, vscode-languageserver-*) CommandDSL node_modules'ından çözülür.
    absWorkingDir: cmdPath,
    nodePaths: [resolve(cmdPath, 'node_modules')],
    define: { __BUILD_INFO__: JSON.stringify(BUILD_INFO) },
    // ESM bundle içindeki CJS bağımlılıklar (vscode-jsonrpc vb.) runtime'da require çağırır.
    banner: {
        js: [
            '#!/usr/bin/env node',
            "import { createRequire as __cr } from 'node:module';",
            'const require = __cr(import.meta.url);',
        ].join('\n'),
    },
    logLevel: 'info',
});

console.error(`\n✓ validate-tech.mjs yazıldı · grammar ${grammarHash} · commit ${commit} · langium ${langium}`);
