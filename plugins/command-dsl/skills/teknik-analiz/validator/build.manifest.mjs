/**
 * emit-manifest.src.mts → emit-manifest.mjs (tek dosyalık standalone bundle).
 *
 * `build.tech.mjs`'in manifest-emitter ikizi. Canlı CommandDSL deposunu READ-ONLY okur;
 * oraya HİÇBİR şey yazmaz. Çıktıyı yalnız bu validator dizinine (emit-manifest.mjs) koyar.
 *
 * Kullanım:
 *   node build.manifest.mjs [<CommandDSL-yolu>]
 *   CMDDSL=<yol> node build.manifest.mjs
 * Varsayılan CommandDSL yolu: ../../../CommandDSL (bu skill'in komşusu).
 *
 * BUILD_INFO drift tespiti içindir (validate-tech ile AYNI hash'ler): grammarHash =
 * sha256(tech-dsl.langium + shared.langium); techSrcHash = src/tech + src/shared kapanışı —
 * manifest.ts değişince techSrcHash değişir → bayat bundle yakalanır.
 */
import { createRequire } from 'node:module';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const cmdPath = resolve(process.env.CMDDSL ?? process.argv[2] ?? resolve(here, '../../../CommandDSL'));

const servicesEntry = resolve(cmdPath, 'src/tech/tech-dsl-module.ts');
const manifestEntry = resolve(cmdPath, 'src/tech/manifest.ts');
for (const [label, entry] of [['TechDsl dil servisleri', servicesEntry], ['TechDsl manifest üreteci', manifestEntry]]) {
    if (!existsSync(entry)) {
        console.error(`Hata: ${label} bulunamadı: ${entry}`);
        console.error(`CommandDSL yolunu argümanla veya CMDDSL ile ver.`);
        process.exit(2);
    }
}

// esbuild'i CommandDSL'in node_modules'ından çöz (validator'ın kendi deps'i yok).
const require = createRequire(resolve(cmdPath, 'package.json'));
const esbuild = require('esbuild');

// --- BUILD_INFO (validate-tech ile aynı hash mantığı) ---
function sha(...files) {
    const h = createHash('sha256');
    for (const f of files) h.update(readFileSync(resolve(cmdPath, f)));
    return h.digest('hex').slice(0, 12);
}
const grammarHash = sha('tech-dsl.langium', 'shared.langium');

function walkTs(dir, acc = []) {
    for (const name of readdirSync(dir).sort()) {
        const full = resolve(dir, name);
        if (statSync(full).isDirectory()) walkTs(full, acc);
        else if (name.endsWith('.ts') || name.endsWith('.mts')) acc.push(full);
    }
    return acc;
}
function shaTree(...dirs) {
    const h = createHash('sha256');
    const files = [];
    for (const d of dirs) {
        const abs = resolve(cmdPath, d);
        if (existsSync(abs)) files.push(...walkTs(abs));
    }
    files.sort();
    for (const f of files) {
        h.update(f.slice(cmdPath.length));
        h.update(readFileSync(f));
    }
    return h.digest('hex').slice(0, 12);
}
const techSrcHash = shaTree('src/tech', 'src/shared');

let commit = 'unknown';
let commitDate = 'unknown';
try {
    commit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: cmdPath }).toString().trim();
    commitDate = execFileSync('git', ['show', '-s', '--format=%cI', 'HEAD'], { cwd: cmdPath }).toString().trim();
} catch { /* git yoksa sorun değil */ }

let langium = 'unknown';
try {
    langium = JSON.parse(readFileSync(resolve(cmdPath, 'node_modules/langium/package.json'))).version;
} catch { /* */ }

const BUILD_INFO = {
    grammarVersion: `tech-v1.x-${grammarHash}`,
    grammarHash,
    techSrcHash,
    commit,
    builtAt: commitDate,
    langium,
};

await esbuild.build({
    entryPoints: [resolve(here, 'emit-manifest.src.mts')],
    outfile: resolve(here, 'emit-manifest.mjs'),
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    alias: {
        '@techdsl/services': servicesEntry,
        '@techdsl/manifest': manifestEntry,
    },
    absWorkingDir: cmdPath,
    nodePaths: [resolve(cmdPath, 'node_modules')],
    define: { __BUILD_INFO__: JSON.stringify(BUILD_INFO) },
    banner: {
        js: [
            '#!/usr/bin/env node',
            "import { createRequire as __cr } from 'node:module';",
            'const require = __cr(import.meta.url);',
        ].join('\n'),
    },
    logLevel: 'info',
});

console.error(`\n✓ emit-manifest.mjs yazıldı · grammar ${grammarHash} · src ${techSrcHash} · commit ${commit} · langium ${langium}`);
