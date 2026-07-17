/**
 * report-frontend.src.mts → report-frontend.mjs (tek dosyalık İNSAN-OKUR RAPOR aracı).
 *
 * `build.frontend.mjs`'in RAPOR mirror'ı. Canlı CommandDSL deposunu READ-ONLY okur;
 * oraya HİÇBİR şey yazmaz. Çıktıyı yalnız bu validator dizinine koyar
 * (report-frontend.mjs + REPORT-SNAPSHOT.json).
 *
 * Girdi MANİFEST olduğundan dil servisi GÖMÜLMEZ — yalnız playground'un saf
 * üreteç modülleri (frontend-salt.ts + frontend-flow.ts) bundle'a girer; onların
 * experience.js import'ları type-only'dir (esbuild sorunsuz siler) → bundle küçük.
 *
 * Kullanım:
 *   node build.report.mjs [<CommandDSL-yolu>]
 *   CMDDSL=<yol> node build.report.mjs
 *
 * BUILD_INFO iki-hash (aile disiplini; Faz-2 2026-07-17):
 *   grammarHash = sha256(frontend-dsl.langium + shared.langium)
 *                 — build.frontend.mjs ile AYNI tanım (fcdsl.mjs ile eşleşme kontrolü)
 *   srcHash     = sha256(bundle'a giren TÜM src/ dizinleri — Pass-1 metafile'dan türetilir —
 *                 + EXTRA_SRC_DIRS, BUILD_INFO.srcDirs olarak damgalanır) — RAPOR üreteç
 *                 mantığı izi (sonuç bugün: src/frontend + src/playground)
 */
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const cmdPath = resolve(process.env.CMDDSL ?? process.argv[2] ?? resolve(here, '../../../CommandDSL'));

const saltEntry = resolve(cmdPath, 'src/playground/frontend-salt.ts');
const flowEntry = resolve(cmdPath, 'src/playground/frontend-flow.ts');
if (!existsSync(saltEntry) || !existsSync(flowEntry)) {
    console.error(`Hata: playground üreteç modülleri bulunamadı: ${saltEntry}`);
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
const grammarHash = sha('frontend-dsl.langium', 'shared.langium');

// srcHash: rapor bundle'ına giren üreteç kapanışının parmak izi (over-inclusion bilinçli:
// izlenen src/ dizinlerinin TAMAMI hash'lenir — kaçırmaktansa fazladan tetikle, güvenli yön).
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
        h.update(f.slice(cmdPath.length)); // konum-bağımsız relpath → rename/move kaydolur
        h.update(readFileSync(f));
    }
    return h.digest('hex').slice(0, 12);
}

// --- İKİ-PASS BUILD (bundle-damgalı dinamik src-reçetesi — Faz-1 şablonu) + EXTRA_SRC_DIRS ---
// GEREKÇE (EXTRA_SRC_DIRS): experience.ts import'ları TYPE-ONLY → esbuild metafile'da GÖRÜNMEZ
// (probe srcDirs = yalnız [src/playground]) ama experience.json girdi-ŞEMASI src/frontend/
// experience.ts'te yaşar → şema değişimi raporu bayatlatır. Metafile bunu kaçırır, o yüzden
// src/frontend elle eklenir (damga union'ı; check-staleness damgayı okur, yeniden-hash'ler).
const EXTRA_SRC_DIRS = ['src/frontend'];

const commonOptions = {
    entryPoints: [resolve(here, 'report-frontend.src.mts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    // Playground üreteçlerini mutlak yola alias'la — kaynak portable kalır.
    alias: {
        '@frontenddsl/salt': saltEntry,
        '@frontenddsl/flow': flowEntry,
        '@frontenddsl/experience': resolve(cmdPath, 'src/frontend/experience.ts'),
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
// metafile.inputs yolları cmdPath-göreli (absWorkingDir=cmdPath); node_modules girdileri ve
// skill-dizinindeki .src.mts girdiler ('../…') startsWith('src/') filtresiyle dışarıda kalır.
const derivedDirs = [...new Set(
    Object.keys(probe.metafile.inputs)
        .filter(p => p.startsWith('src/'))
        .map(p => 'src/' + p.split('/')[1])
)];
const srcDirs = [...new Set([...derivedDirs, ...EXTRA_SRC_DIRS])].sort();
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

let commit = 'unknown';
let commitDate = 'unknown';
try {
    commit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: cmdPath })
        .toString().trim();
    commitDate = execFileSync('git', ['show', '-s', '--format=%cI', 'HEAD'], { cwd: cmdPath })
        .toString().trim();
} catch { /* git yoksa sorun değil */ }

const BUILD_INFO = {
    grammarVersion: `frontend-v1.x-${grammarHash}`,
    grammarHash,
    srcDirs,          // Pass-1 metafile türetimi + EXTRA_SRC_DIRS (check-staleness damgası)
    srcHash,          // rapor üreteç mantığı parmak izi (bayatlık dedektörü; kapsam = srcDirs)
    wrapperFiles,    // Faz-3: plugin-lokal wrapper girdileri (validator-dizini-göreli; check-staleness damgası)
    wrapperHash,     // Faz-3: wrapper-drift parmak izi (entry .src.mts + plugin-lokal import zinciri)
    commit,
    builtAt: commitDate,
};

// Pass-2: gerçek build (BUILD_INFO artık srcDirs + srcHash damgasını taşır).
await esbuild.build({
    ...commonOptions,
    outfile: resolve(here, 'report-frontend.mjs'),
    define: { __BUILD_INFO__: JSON.stringify(BUILD_INFO) },
    banner: { js: '#!/usr/bin/env node' },
    logLevel: 'info',
});

// REPORT-SNAPSHOT.json — kaynak repo + commit + hash kaydı (bayatlama tespiti, insan-okur).
writeFileSync(resolve(here, 'REPORT-SNAPSHOT.json'), JSON.stringify({ source: 'CommandDSL', ...BUILD_INFO }, null, 2) + '\n');

console.error(`\n✓ report-frontend.mjs yazıldı · grammar ${grammarHash} · src ${srcHash} [${srcDirs.join(' ')}] · wrapper ${wrapperHash} · commit ${commit}`);
