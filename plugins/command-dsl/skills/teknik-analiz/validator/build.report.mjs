/**
 * report-tech.src.mts → report-tech.mjs (tek dosyalık İNSAN-OKUR RAPOR aracı).
 *
 * `build.tech.mjs`'in RAPOR mirror'ı. Canlı CommandDSL deposunu READ-ONLY okur;
 * oraya HİÇBİR şey yazmaz. Çıktıyı yalnız bu validator dizinine koyar
 * (report-tech.mjs + REPORT-SNAPSHOT.json — mevcut SNAPSHOT.json'a DOKUNULMAZ).
 *
 * Girdi MANİFEST olduğundan dil servisi GÖMÜLMEZ — yalnız CommandDSL'in saf
 * tech-report modülleri (src/tech-report/**) bundle'a girer; manifest.ts import'u
 * type-only'dir (esbuild sorunsuz siler) → bundle küçük.
 *
 * Kullanım:
 *   node build.report.mjs [<CommandDSL-yolu>]
 *   CMDDSL=<yol> node build.report.mjs
 *
 * BUILD_INFO (aile kuralının rapor-aracı uyarlaması — TECH-RAPOR-TASARIM §3.2; Faz-2 2026-07-17):
 *   srcHash = sha256(bundle'a giren TÜM src/ dizinleri — Pass-1 metafile'dan türetilir —
 *             + EXTRA_SRC_DIRS, BUILD_INFO.srcDirs olarak damgalanır) — grammar hash YOK
 *             (saf json→puml/md; dil servisleri kullanılmaz). Kendi .src.mts'leri hash'ten
 *             DÜŞTÜ (primary emsali: damga CommandDSL kaynağını izler, aracın kendisini değil).
 */
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const cmdPath = resolve(process.env.CMDDSL ?? process.argv[2] ?? resolve(here, '../../../CommandDSL'));

const techReportEntry = resolve(cmdPath, 'src/tech-report/index.ts');
if (!existsSync(techReportEntry)) {
    console.error(`Hata: tech-report üreteç modülleri bulunamadı: ${techReportEntry}`);
    console.error('CommandDSL yolunu argümanla veya CMDDSL ile ver.');
    process.exit(2);
}

// esbuild'i CommandDSL'in node_modules'ından çöz (validator'ın kendi deps'i yok).
const require = createRequire(resolve(cmdPath, 'package.json'));
const esbuild = require('esbuild');

// --- BUILD_INFO: srcHash = bundle'a giren src/ dizinleri + EXTRA_SRC_DIRS ---
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
        h.update(f.slice(cmdPath.length));   // konum-bağımsız relpath → rename/move kaydolur
        h.update(readFileSync(f));
    }
    return h.digest('hex').slice(0, 12);
}

// --- İKİ-PASS BUILD (bundle-damgalı dinamik src-reçetesi — Faz-1 şablonu) + EXTRA_SRC_DIRS ---
// GEREKÇE (EXTRA_SRC_DIRS): manifest.ts import'u TYPE-ONLY → esbuild metafile'da GÖRÜNMEZ
// (probe srcDirs = [src/generator?, src/tech-report] civarı) ama manifest.json girdi-ŞEMASI
// src/tech/manifest.ts'te yaşar → şema değişimi raporu bayatlatır. Metafile bunu kaçırır,
// o yüzden src/tech elle eklenir (damga union'ı; check-staleness damgayı okur, yeniden-hash'ler).
const EXTRA_SRC_DIRS = ['src/tech'];

const commonOptions = {
    entryPoints: [resolve(here, 'report-tech.src.mts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    // tech-report barrel'ını mutlak yola alias'la — kaynak portable kalır.
    alias: {
        '@techreport/index': techReportEntry,
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

let commit = 'unknown';
let commitDate = 'unknown';
try {
    commit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: cmdPath })
        .toString().trim();
    commitDate = execFileSync('git', ['show', '-s', '--format=%cI', 'HEAD'], { cwd: cmdPath })
        .toString().trim();
} catch { /* git yoksa sorun değil */ }

const BUILD_INFO = {
    tool: 'report-tech',
    srcDirs,          // Pass-1 metafile türetimi + EXTRA_SRC_DIRS (check-staleness damgası)
    srcHash,          // rapor üreteç mantığı parmak izi (bayatlık dedektörü) — grammar hash YOK
    commit,
    builtAt: commitDate,
};

// Pass-2: gerçek build (BUILD_INFO artık srcDirs + srcHash damgasını taşır).
await esbuild.build({
    ...commonOptions,
    outfile: resolve(here, 'report-tech.mjs'),
    define: { __BUILD_INFO__: JSON.stringify(BUILD_INFO) },
    banner: { js: '#!/usr/bin/env node' },
    logLevel: 'info',
});

// REPORT-SNAPSHOT.json — rapor-aracı kaynak izi (bayatlama tespiti, insan-okur).
writeFileSync(resolve(here, 'REPORT-SNAPSHOT.json'), JSON.stringify({
    source: 'CommandDSL',
    tool: 'report-tech.mjs',
    ...BUILD_INFO,
    note: 'SAF json→puml/md rapor aracı; grammar/dil servisi gömülmez. ' +
        'Girdi: emit-manifest çıktısı manifest.json (tek-kaynak tip: src/tech/manifest.ts). ' +
        'Üreteçler: CommandDSL src/tech-report (context/er/saga/events/opdoc/matrices, T1–T6c) ' +
        '+ report-index (kanonik ortak kopya).',
}, null, 2) + '\n');

console.error(`\n✓ report-tech.mjs yazıldı · src ${srcHash} [${srcDirs.join(' ')}] · commit ${commit}`);
console.error('✓ REPORT-SNAPSHOT.json yazıldı');
