/**
 * emit-operations.src.mts → emit-operations.mjs (tek dosyalık standalone bundle).
 *
 * `build.tech.mjs` emsali, ama BUSINESS tarafı: command-dsl dil servisleri + generator
 * (collectCommands/genOperationsIndex)'i bundle'lar → `.cdsl → operations.json` üretimi
 * CommandDSL deposu olmadan çalışır. Canlı CommandDSL READ-ONLY okunur; çıktı yalnız bu dizine.
 *
 * Kullanım: node build.emit.mjs [<CommandDSL-yolu>]   (CMDDSL=<yol> de olur; vars. ../../../CommandDSL)
 *
 * BUILD_INFO iki hash (Faz-2 2026-07-17 — primary build.mjs ile hizalı):
 *   grammarHash = sha256(command-dsl.langium + shared.langium) — business primary'nin
 *                 (build.mjs) reçetesiyle AYNI; shared.langium önceden KAÇIYORDU (kör nokta).
 *   srcHash     = sha256(bundle'a giren TÜM src/ dizinleri — Pass-1 metafile'dan türetilir,
 *                 BUILD_INFO.srcDirs olarak damgalanır) → generator/services mantığı
 *                 değişince yakalanır; check-skill-staleness damgayı okuyup yeniden-hash'ler.
 */
import { createRequire } from 'node:module';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const cmdPath = resolve(process.env.CMDDSL ?? process.argv[2] ?? resolve(here, '../../../CommandDSL'));

const servicesEntry = resolve(cmdPath, 'src/language/command-dsl-module.ts');
const generatorEntry = resolve(cmdPath, 'src/generator/generator.ts');
const operationsEntry = resolve(cmdPath, 'src/generator/operations.ts');
for (const f of [servicesEntry, generatorEntry, operationsEntry]) {
    if (!existsSync(f)) {
        console.error(`Hata: CommandDSL kaynağı bulunamadı: ${f}`);
        console.error(`CommandDSL yolunu argümanla veya CMDDSL ile ver.`);
        process.exit(2);
    }
}

const require = createRequire(resolve(cmdPath, 'package.json'));
const esbuild = require('esbuild');

// --- BUILD_INFO ---
function sha(...files) {
    const h = createHash('sha256');
    for (const f of files) h.update(readFileSync(resolve(cmdPath, f)));
    return h.digest('hex').slice(0, 12);
}
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
    for (const f of files) { h.update(f.slice(cmdPath.length)); h.update(readFileSync(f)); }
    return h.digest('hex').slice(0, 12);
}
// Grammar reçetesi primary (build.mjs) ile AYNI: command-dsl.langium + shared.langium.
const grammarHash = sha('command-dsl.langium', 'shared.langium');

// --- İKİ-PASS BUILD (bundle-damgalı dinamik src-reçetesi — Faz-1 build.mjs şablonu) ---
// Pass-1 (write:false + metafile, hiçbir dosya yazılmaz): esbuild'in bundle'a GERÇEKTEN
// aldığı src/ dosyalarından izlenen dizinler türetilir. check-skill-staleness bu damgayı
// okur → statik-reçete drifti imkansız; gelecekte eklenen cross-dizin import otomatik kapsanır.
const commonOptions = {
    entryPoints: [resolve(here, 'emit-operations.src.mts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    alias: {
        '@cmddsl/services': servicesEntry,
        '@cmddsl/generator': generatorEntry,
        '@cmddsl/operations': operationsEntry,
    },
    absWorkingDir: cmdPath,
    nodePaths: [resolve(cmdPath, 'node_modules')],
};

const probe = await esbuild.build({
    ...commonOptions,
    write: false,
    metafile: true,
    define: { __BUILD_INFO__: '{}' },
    logLevel: 'silent',
});
// metafile.inputs yolları cmdPath-göreli (absWorkingDir=cmdPath); node_modules girdileri
// startsWith('src/') filtresiyle dışarıda kalır (ZORUNLU — inputs node_modules'ı da içerir).
const srcDirs = [...new Set(
    Object.keys(probe.metafile.inputs)
        .filter(p => p.startsWith('src/'))
        .map(p => 'src/' + p.split('/')[1])
)].sort();
const srcHash = shaTree(...srcDirs);

let commit = 'unknown', commitDate = 'unknown';
try {
    commit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: cmdPath }).toString().trim();
    commitDate = execFileSync('git', ['show', '-s', '--format=%cI', 'HEAD'], { cwd: cmdPath }).toString().trim();
} catch { /* git yoksa sorun değil */ }

let langium = 'unknown';
try {
    langium = JSON.parse(readFileSync(resolve(cmdPath, 'node_modules/langium/package.json'))).version;
} catch { /* */ }

const BUILD_INFO = {
    grammarVersion: `cdsl-v3.x-${grammarHash}`,
    grammarHash,
    srcDirs,     // Pass-1 metafile'dan türetilen izlenen src/ dizinleri (check-staleness damgası)
    srcHash,     // generator/services mantığı parmak izi (grammar-dışı bayatlık dedektörü; kapsam = srcDirs)
    commit,
    builtAt: commitDate,
    langium,
};

// Pass-2: gerçek build (BUILD_INFO artık srcDirs + srcHash damgasını taşır).
await esbuild.build({
    ...commonOptions,
    outfile: resolve(here, 'emit-operations.mjs'),
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

console.error(`\n✓ emit-operations.mjs yazıldı · grammar ${grammarHash} · src ${srcHash} [${srcDirs.join(' ')}] · commit ${commit} · langium ${langium}`);
