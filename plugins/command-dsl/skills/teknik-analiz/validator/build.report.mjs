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
 * BUILD_INFO (aile kuralının rapor-aracı uyarlaması — TECH-RAPOR-TASARIM §3.2):
 *   srcHash = sha256(CommandDSL src/tech-report/** + report-tech.src.mts +
 *             report-index.src.mts, relpath dahil) — grammar hash YOK
 *             (saf json→puml/md; dil servisleri kullanılmaz).
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

// --- BUILD_INFO: srcHash = tech-report kaynak ağacı + bu aracın iki .src.mts'i ---
function walkTs(dir, acc = []) {
    for (const name of readdirSync(dir).sort()) {
        const full = resolve(dir, name);
        if (statSync(full).isDirectory()) walkTs(full, acc);
        else if (name.endsWith('.ts') || name.endsWith('.mts')) acc.push(full);
    }
    return acc;
}
const h = createHash('sha256');
for (const f of walkTs(resolve(cmdPath, 'src/tech-report')).sort()) {
    h.update(f.slice(cmdPath.length));   // konum-bağımsız relpath → rename/move kaydolur
    h.update(readFileSync(f));
}
for (const f of ['report-tech.src.mts', 'report-index.src.mts']) {
    h.update(f);
    h.update(readFileSync(resolve(here, f)));
}
const srcHash = h.digest('hex').slice(0, 12);

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
    srcHash,          // rapor üreteç mantığı parmak izi (bayatlık dedektörü) — grammar hash YOK
    commit,
    builtAt: commitDate,
};

await esbuild.build({
    entryPoints: [resolve(here, 'report-tech.src.mts')],
    outfile: resolve(here, 'report-tech.mjs'),
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

console.error(`\n✓ report-tech.mjs yazıldı · src ${srcHash} · commit ${commit}`);
console.error('✓ REPORT-SNAPSHOT.json yazıldı');
