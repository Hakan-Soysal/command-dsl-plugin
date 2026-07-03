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
 * BUILD_INFO iki-hash (aile disiplini):
 *   grammarHash = sha256(frontend-dsl.langium + shared.langium)
 *                 — build.frontend.mjs ile AYNI tanım (fcdsl.mjs ile eşleşme kontrolü)
 *   srcHash     = sha256(src/playground/frontend-salt.ts + frontend-flow.ts
 *                 + src/frontend/**.ts, relpath dahil) — RAPOR üreteç mantığı izi
 */
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
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

// srcHash: rapor bundle'ına giren üreteç kapanışının parmak izi — playground'un
// iki saf modülü + src/frontend/** (tipler + emit mantığı; over-inclusion bilinçli).
function walkTs(dir, acc = []) {
    for (const name of readdirSync(dir).sort()) {
        const full = resolve(dir, name);
        if (statSync(full).isDirectory()) walkTs(full, acc);
        else if (name.endsWith('.ts') || name.endsWith('.mts')) acc.push(full);
    }
    return acc;
}
function shaFiles(files) {
    const h = createHash('sha256');
    for (const f of [...files].sort()) {
        h.update(f.slice(cmdPath.length)); // konum-bağımsız relpath → rename/move kaydolur
        h.update(readFileSync(f));
    }
    return h.digest('hex').slice(0, 12);
}
const srcHash = shaFiles([saltEntry, flowEntry, ...walkTs(resolve(cmdPath, 'src/frontend'))]);

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
    srcHash,          // rapor üreteç mantığı parmak izi (bayatlık dedektörü)
    commit,
    builtAt: commitDate,
};

await esbuild.build({
    entryPoints: [resolve(here, 'report-frontend.src.mts')],
    outfile: resolve(here, 'report-frontend.mjs'),
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
    define: { __BUILD_INFO__: JSON.stringify(BUILD_INFO) },
    banner: { js: '#!/usr/bin/env node' },
    logLevel: 'info',
});

// REPORT-SNAPSHOT.json — kaynak repo + commit + hash kaydı (bayatlama tespiti, insan-okur).
writeFileSync(resolve(here, 'REPORT-SNAPSHOT.json'), JSON.stringify({ source: 'CommandDSL', ...BUILD_INFO }, null, 2) + '\n');

console.error(`\n✓ report-frontend.mjs yazıldı · grammar ${grammarHash} · src ${srcHash} · commit ${commit}`);
