/**
 * validate.src.mts → validate.mjs (tek dosyalık standalone bundle).
 *
 * Canlı CommandDSL deposunu READ-ONLY okur; oraya HİÇBİR şey yazmaz. Çıktıyı
 * yalnız bu skill dizinine (validator/validate.mjs) koyar.
 *
 * Kullanım:
 *   node build.mjs [<CommandDSL-yolu>]
 *   CMDDSL=<yol> node build.mjs
 * Varsayılan CommandDSL yolu: ../../../CommandDSL (bu skill'in komşusu).
 *
 * Bundle'a gömülen BUILD_INFO drift tespiti içindir (validator.md §4):
 * grammarHash = sha256(command-dsl.langium + shared.langium); grammar değişince
 * hash değişir → bayat bundle yakalanabilir.
 */
import { createRequire } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const cmdPath = resolve(process.env.CMDDSL ?? process.argv[2] ?? resolve(here, '../../../CommandDSL'));

const servicesEntry = resolve(cmdPath, 'src/language/command-dsl-module.ts');
if (!existsSync(servicesEntry)) {
    console.error(`Hata: CommandDSL dil servisleri bulunamadı: ${servicesEntry}`);
    console.error(`CommandDSL yolunu argümanla veya CMDDSL ile ver.`);
    process.exit(2);
}

// esbuild'i CommandDSL'in node_modules'ından çöz (skill'in kendi deps'i yok).
const require = createRequire(resolve(cmdPath, 'package.json'));
const esbuild = require('esbuild');

// --- BUILD_INFO ---
function sha(...files) {
    const h = createHash('sha256');
    for (const f of files) h.update(readFileSync(resolve(cmdPath, f)));
    return h.digest('hex').slice(0, 12);
}
const grammarHash = sha('command-dsl.langium', 'shared.langium');

let commit = 'unknown';
let commitDate = 'unknown';
try {
    commit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: cmdPath })
        .toString().trim();
    // Deterministik damga: rebuild başına değişen `Date.now()` yerine commit tarihi
    // (aynı grammar durumu → aynı byte → gürültüsüz diff).
    commitDate = execFileSync('git', ['show', '-s', '--format=%cI', 'HEAD'], { cwd: cmdPath })
        .toString().trim();
} catch { /* git yoksa sorun değil */ }

let langium = 'unknown';
try {
    langium = JSON.parse(readFileSync(resolve(cmdPath, 'node_modules/langium/package.json')))
        .version;
} catch { /* */ }

const BUILD_INFO = {
    // Etiket grammar HASH'ini İÇERİR → grammar değişince emitlenen kimlik de değişir.
    // Böylece config.grammarVersion ↔ bundle karşılaştırması drift'te GERÇEKTEN
    // uyuşmazlık verir (sabit etiket olsa hep eşleşir = sessiz yanlış-yeşil, §4).
    grammarVersion: `v3.x-${grammarHash}`,
    grammarHash,                     // grammar parmak izi (etikete de gömülü)
    commit,                          // CommandDSL HEAD (izlenebilirlik)
    builtAt: commitDate,             // commit tarihi (deterministik; rebuild gürültüsü yok)
    langium,
};

await esbuild.build({
    entryPoints: [resolve(here, 'validate.src.mts')],
    outfile: resolve(here, 'validate.mjs'),
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    // CommandDSL services'i mutlak yola alias'la — kaynak portable kalır.
    alias: { '@cmddsl/services': servicesEntry },
    // bare import'lar (langium, vscode-languageserver-*) CommandDSL node_modules'ından çözülür.
    // entry skill dizininde olduğu için node-resolution oraya bakmaz → nodePaths ile zorla.
    absWorkingDir: cmdPath,
    nodePaths: [resolve(cmdPath, 'node_modules')],
    define: { __BUILD_INFO__: JSON.stringify(BUILD_INFO) },
    // ESM bundle içindeki CJS bağımlılıklar (vscode-jsonrpc vb.) runtime'da
    // require('util') çağırır; ESM'de require yok → createRequire ile sağla.
    banner: {
        js: [
            '#!/usr/bin/env node',
            "import { createRequire as __cr } from 'node:module';",
            'const require = __cr(import.meta.url);',
        ].join('\n'),
    },
    logLevel: 'info',
});

console.error(`\n✓ validate.mjs yazıldı · grammar ${grammarHash} · commit ${commit} · langium ${langium}`);
