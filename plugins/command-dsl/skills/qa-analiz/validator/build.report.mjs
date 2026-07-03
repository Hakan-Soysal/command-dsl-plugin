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
 * BUILD_INFO (aile kuralının rapor-aracı uyarlaması):
 *   srcHash = sha256(report-qa.src.mts + report-index.src.mts) — grammar hash YOK
 *             (json→html; girdi şeması spec §6.2, dil servisleri kullanılmaz).
 *   Kayıt: REPORT-SNAPSHOT.json (mevcut SNAPSHOT.json'a DOKUNULMAZ).
 */
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, dirname } from 'node:path';
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

// --- BUILD_INFO: srcHash = YALNIZ bu aracın kaynağı + ortak index modülü ---
const SRC_FILES = ['report-qa.src.mts', 'report-index.src.mts'];
const h = createHash('sha256');
for (const f of SRC_FILES) { h.update(f); h.update(readFileSync(resolve(here, f))); }
const srcHash = h.digest('hex').slice(0, 12);

const BUILD_INFO = {
    tool: 'report-qa',
    srcHash,
    srcFiles: SRC_FILES,
    builtAt: new Date().toISOString(),
};

await esbuild.build({
    entryPoints: [resolve(here, 'report-qa.src.mts')],
    outfile: resolve(here, 'report-qa.mjs'),
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
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

console.error(`\n✓ report-qa.mjs yazıldı · src ${srcHash}`);
