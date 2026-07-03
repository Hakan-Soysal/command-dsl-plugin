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
 * BUILD_INFO: grammarHash = sha256(command-dsl.langium + shared.langium — build.mjs ile aynı);
 * srcHash = sha256(src/language + src/generator, *.ts/*.mts, relpath dahil) → üreteç/servis
 * mantığı değişince yakalanır. Hash'ler ayrıca REPORT-SNAPSHOT.json'a yazılır (mevcut
 * SNAPSHOT disiplinine dokunmadan — rapor bundle'ının kendi kaydı).
 */
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
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
const srcHash = shaTree('src/language', 'src/generator');

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
    srcHash,
    commit,
    builtAt: commitDate,
    langium,
};

await esbuild.build({
    entryPoints: [resolve(here, 'report-business.src.mts')],
    outfile: resolve(here, 'report-business.mjs'),
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    alias,
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

// Rapor bundle'ının kendi snapshot kaydı (mevcut SNAPSHOT dosyalarına DOKUNMAZ).
writeFileSync(resolve(here, 'REPORT-SNAPSHOT.json'), JSON.stringify({
    source: 'CommandDSL',
    tool: 'report-business.mjs',
    ...BUILD_INFO,
    note: 'İnsan-okur rapor bundle\'ı — üreteçler: plantuml/plantuml-flow/plantuml-process/plantuml-blueprint/process-doc/cockburn/coverage + report-index (kanonik ortak kopya)',
}, null, 2) + '\n');

console.error(`\n✓ report-business.mjs yazıldı · grammar ${grammarHash} · src ${srcHash} · commit ${commit} · langium ${langium}`);
console.error(`✓ REPORT-SNAPSHOT.json yazıldı`);
