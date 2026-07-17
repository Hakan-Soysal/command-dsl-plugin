/**
 * report-qa.src.mts → report-qa.mjs (tek dosyalık standalone bundle: SAF json→html).
 *
 * build.qa.mjs'in rapor-aracı kardeşi — ama bu araç dil servisi/grammar GÖMMEZ:
 * yalnız node:fs/path + ortak index modülü (report-index.src.mts) bundle'lanır,
 * bundle bilinçli KÜÇÜK kalır. CommandDSL deposu SADECE esbuild'i çözmek için
 * READ-ONLY kullanılır; oraya hiçbir şey yazılmaz.
 *
 * Kullanım:
 *   node build.report.mjs [<CommandDSL-yolu>]
 *   CMDDSL=<yol> node build.report.mjs
 *
 * BUILD_INFO (Faz-3 2026-07-17 — bayatlık-denetimine GERİ-KATILIM):
 *   wrapperFiles/wrapperHash = Pass-1 esbuild-metafile'ından türetilen PLUGIN-LOKAL
 *             girdiler (entry .src.mts + import zinciri; statik SRC_FILES listesi
 *             SÜPERSEDE — metafile-türetim import-zinciri driftini de kapsar).
 *             grammar hash YOK (json→html; girdi şeması spec §6.2, dil servisleri
 *             kullanılmaz) → check-skill-staleness'ta grammar:null + srcField:null
 *             (wrapper-only denetim).
 *   builtAt = PLUGIN git HEAD tarihi (12 bundle'ın CommandDSL-commitDate analoğu;
 *             eski `new Date().toISOString()` her rebuild'de farklı byte üretiyordu —
 *             non-determinizm fix, idempotens T3 kanıtı).
 *   Kayıt: REPORT-SNAPSHOT.json (mevcut SNAPSHOT.json'a DOKUNULMAZ).
 */
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const cmdPath = resolve(process.env.CMDDSL ?? process.argv[2] ?? resolve(here, '../../../CommandDSL'));

if (!existsSync(resolve(cmdPath, 'node_modules/esbuild'))) {
    console.error(`Hata: esbuild bulunamadı: ${resolve(cmdPath, 'node_modules/esbuild')}`);
    console.error('CommandDSL yolunu argümanla veya CMDDSL ile ver.');
    process.exit(2);
}

// esbuild'i CommandDSL'in node_modules'ından çöz (validator'ın kendi deps'i yok).
const require = createRequire(resolve(cmdPath, 'package.json'));
const esbuild = require('esbuild');

// --- İKİ-PASS BUILD (Faz-3: wrapper reçetesi metafile-türetimli, statik liste yok) ---
// absWorkingDir = here (12 CommandDSL-src bundle'ından FARKLI — onlar cmdPath'e çıpalı;
// bu araç CommandDSL-src almaz, girdileri validator dizininde yaşar → metafile yolları
// zaten here-göreli çıkar).
const commonOptions = {
    entryPoints: [resolve(here, 'report-qa.src.mts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    absWorkingDir: here,
};

const probe = await esbuild.build({
    ...commonOptions,
    write: false,
    metafile: true,
    define: { __BUILD_INFO__: '{}' },
    logLevel: 'silent',
});
// Faz-3 filtresi (12 bundle ile AYNI): CommandDSL-src (burada zaten yok) + node_modules +
// sentetik girdiler ('<define:__BUILD_INFO__>' — dosya değil → readFileSync ENOENT) DIŞLANIR.
const wrapperFiles = [...new Set(
    Object.keys(probe.metafile.inputs)
        .filter(p => !p.startsWith('src/') && !p.includes('node_modules') && !p.startsWith('<'))
        .map(p => relative(here, resolve(here, p))),
)].sort();
// Reçete check-skill-staleness shaWrapper ile BİREBİR: sorted rel-path → update(rel)+update(içerik).
const wHash = createHash('sha256');
for (const rel of wrapperFiles) { wHash.update(rel); wHash.update(readFileSync(resolve(here, rel))); }
const wrapperHash = wHash.digest('hex').slice(0, 12);

// builtAt = plugin HEAD commit tarihi (deterministik; rebuild başına değişen Date.now yok).
const pluginRoot = resolve(here, '../../../../..');
let builtAt = 'unknown';
try {
    builtAt = execFileSync('git', ['show', '-s', '--format=%cI', 'HEAD'], { cwd: pluginRoot })
        .toString().trim();
} catch { /* git yoksa sorun değil */ }

const BUILD_INFO = {
    tool: 'report-qa',
    wrapperFiles,    // Faz-3: plugin-lokal wrapper girdileri (validator-dizini-göreli; check-staleness damgası)
    wrapperHash,     // Faz-3: wrapper-drift parmak izi (entry .src.mts + plugin-lokal import zinciri)
    builtAt,
};

// Pass-2: gerçek build (BUILD_INFO artık wrapperFiles + wrapperHash damgasını taşır).
await esbuild.build({
    ...commonOptions,
    outfile: resolve(here, 'report-qa.mjs'),
    define: { __BUILD_INFO__: JSON.stringify(BUILD_INFO) },
    banner: { js: '#!/usr/bin/env node' },
    logLevel: 'info',
});

// REPORT-SNAPSHOT.json — rapor-aracı kaynak izi (bayatlama tespiti, insan-okur).
writeFileSync(resolve(here, 'REPORT-SNAPSHOT.json'), JSON.stringify({
    ...BUILD_INFO,
    note: 'SAF json→html rapor aracı; grammar/dil servisi gömülmez. ' +
        'Girdi şeması: CommandDSL spec qa-dsl-tasarim-spec-2026-07-02.md §6.2 (merged qa.json). ' +
        'HTML yapısı: playground qa-main.ts renderCoverage/branchLabel portu + emsal reports/qa/kapsama.html CSS.',
}, null, 2) + '\n');

console.error(`\n✓ report-qa.mjs yazıldı · wrapper ${wrapperHash} [${wrapperFiles.join(' ')}]`);
