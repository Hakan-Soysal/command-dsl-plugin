/**
 * report-business.src.mts → report-business.mjs (tek dosyalık standalone bundle).
 *
 * `build.emit.mjs` emsali, ama İNSAN-OKUR RAPOR tarafı: command-dsl dil servisleri +
 * playground'un programatik üreteçleri (plantuml / plantuml-flow / plantuml-process /
 * plantuml-blueprint / process-doc / cockburn / coverage) bundle'lanır →
 * `.cdsl → reports/business/**` üretimi CommandDSL deposu olmadan çalışır.
 * Canlı CommandDSL READ-ONLY okunur; çıktı yalnız bu dizine.
 *
 * Kullanım: node build.report.mjs [<CommandDSL-yolu>]   (CMDDSL=<yol> de olur; vars. ../../../CommandDSL)
 *
 * BUILD_INFO (Faz-2 2026-07-17): grammarHash = sha256(command-dsl.langium + shared.langium —
 * build.mjs ile aynı); srcHash = sha256(bundle'a giren TÜM src/ dizinleri — Pass-1
 * metafile'dan türetilir, BUILD_INFO.srcDirs olarak damgalanır) → üreteç/servis mantığı
 * değişince yakalanır. Hash'ler ayrıca REPORT-SNAPSHOT.json'a yazılır (mevcut
 * SNAPSHOT disiplinine dokunmadan — rapor bundle'ının kendi kaydı).
 */
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const cmdPath = resolve(process.env.CMDDSL ?? process.argv[2] ?? resolve(here, '../../../CommandDSL'));

// esbuild alias hedefleri — rapor üreteç zinciri (hepsi CommandDSL kaynağında olmalı).
const ALIASES = {
    '@cmddsl/services': 'src/language/command-dsl-module.ts',
    '@cmddsl/generator': 'src/generator/generator.ts',
    '@cmddsl/plantuml': 'src/generator/plantuml.ts',
    '@cmddsl/plantuml-flow': 'src/generator/plantuml-flow.ts',
    '@cmddsl/plantuml-process': 'src/generator/plantuml-process.ts',
    '@cmddsl/plantuml-blueprint': 'src/generator/plantuml-blueprint.ts',
    '@cmddsl/process-doc': 'src/generator/process-doc.ts',
    '@cmddsl/cockburn': 'src/generator/cockburn.ts',
    '@cmddsl/coverage': 'src/generator/coverage.ts',
    '@cmddsl/ast': 'src/generated/ast.ts',
    '@cmddsl/imports': 'src/language/imports.ts',
    '@cmddsl/naming': 'src/generator/naming.ts',
};
const alias = {};
for (const [key, rel] of Object.entries(ALIASES)) {
    const abs = resolve(cmdPath, rel);
    if (!existsSync(abs)) {
        console.error(`Hata: CommandDSL kaynağı bulunamadı: ${abs}`);
        console.error(`CommandDSL yolunu argümanla veya CMDDSL ile ver.`);
        process.exit(2);
    }
    alias[key] = abs;
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
// build.mjs ile aynı grammar kapsamı: command-dsl.langium + shared.langium (import'u).
const grammarHash = sha('command-dsl.langium', 'shared.langium');

// --- İKİ-PASS BUILD (bundle-damgalı dinamik src-reçetesi — Faz-1 build.mjs şablonu) ---
// Pass-1 (write:false + metafile, hiçbir dosya yazılmaz): esbuild'in bundle'a GERÇEKTEN
// aldığı src/ dosyalarından izlenen dizinler türetilir. check-skill-staleness bu damgayı
// okur → statik-reçete drifti imkansız; gelecekte eklenen cross-dizin import otomatik kapsanır.
const commonOptions = {
    entryPoints: [resolve(here, 'report-business.src.mts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    alias,
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

// --- Faz-3 (2026-07-17): PLUGIN-LOKAL wrapper reçetesi ---
// Bundle'a giren CommandDSL-src ve node_modules DIŞI girdiler = entry .src.mts + plugin-lokal
// import zinciri (örn. report-index.src.mts). srcDirs/srcHash CommandDSL driftini izler ama
// wrapper elle değişip rebuild edilmezse dedektör YEŞİL kalırdı — bu damga o deliği kapatır.
// Filtre: sentetik girdiler ('<define:__BUILD_INFO__>') DIŞLANIR (dosya değil → readFileSync
// ENOENT). Normalize: validator-dizini-göreli (pratikte çıplak 'X.src.mts'); cmdPath-göreli
// '../DSL Business Analyses/…' KULLANILMAZ (taşınamaz + boşluklu).
const wrapperFiles = [...new Set(
    Object.keys(probe.metafile.inputs)
        .filter(p => !p.startsWith('src/') && !p.includes('node_modules') && !p.startsWith('<'))
        .map(p => relative(here, resolve(cmdPath, p))),
)].sort();
// Reçete check-skill-staleness shaWrapper ile BİREBİR: sorted rel-path → update(rel)+update(içerik).
const wHash = createHash('sha256');
for (const rel of wrapperFiles) { wHash.update(rel); wHash.update(readFileSync(resolve(here, rel))); }
const wrapperHash = wHash.digest('hex').slice(0, 12);

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
    srcHash,     // rapor üreteç/servis mantığı parmak izi (grammar-dışı bayatlık dedektörü; kapsam = srcDirs)
    wrapperFiles,    // Faz-3: plugin-lokal wrapper girdileri (validator-dizini-göreli; check-staleness damgası)
    wrapperHash,     // Faz-3: wrapper-drift parmak izi (entry .src.mts + plugin-lokal import zinciri)
    commit,
    builtAt: commitDate,
    langium,
};

// Pass-2: gerçek build (BUILD_INFO artık srcDirs + srcHash damgasını taşır).
await esbuild.build({
    ...commonOptions,
    outfile: resolve(here, 'report-business.mjs'),
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

// Rapor bundle'ının kendi snapshot kaydı (mevcut SNAPSHOT dosyalarına DOKUNMAZ).
writeFileSync(resolve(here, 'REPORT-SNAPSHOT.json'), JSON.stringify({
    source: 'CommandDSL',
    tool: 'report-business.mjs',
    ...BUILD_INFO,
    note: 'İnsan-okur rapor bundle\'ı — üreteçler: plantuml/plantuml-flow/plantuml-process/plantuml-blueprint/process-doc/cockburn/coverage + report-index (kanonik ortak kopya)',
}, null, 2) + '\n');

console.error(`\n✓ report-business.mjs yazıldı · grammar ${grammarHash} · src ${srcHash} [${srcDirs.join(' ')}] · wrapper ${wrapperHash} · commit ${commit} · langium ${langium}`);
console.error(`✓ REPORT-SNAPSHOT.json yazıldı`);
