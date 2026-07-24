/**
 * journey-scan.src.mts → journey-scan.mjs (tek dosyalık standalone bundle).
 *
 * Canlı CommandDSL deposunu READ-ONLY okur; oraya HİÇBİR şey yazmaz. Çıktıyı
 * yalnız bu skill dizinine (validator/journey-scan.mjs) koyar.
 *
 * Kullanım:
 *   node build.journey-scan.mjs [<CommandDSL-yolu>]
 *   CMDDSL=<yol> node build.journey-scan.mjs
 * Varsayılan CommandDSL yolu: ../../../CommandDSL (bu skill'in komşusu).
 *
 * Hash reçetesi build.mjs (validate) ile ÖZDEŞ — journey-triggers `src/language`'te
 * yaşar, bu yüzden GENERATOR bundle'ı (build.emit.mjs, src/generator) değil VALIDATION
 * bundle'ının (businessSrcHash + src/language) reçetesi izlenir. Bundle'a gömülen
 * BUILD_INFO drift tespiti içindir (validator.md §4):
 *   grammarHash     = sha256(command-dsl.langium + shared.langium) → GRAMMAR izi.
 *   businessSrcHash = sha256(bundle'a giren TÜM src/ dizinleri — Pass-1 metafile'dan
 *                     türetilir, BUILD_INFO.srcDirs olarak damgalanır)
 *                     → VALIDATION/tetik-hesabı mantığı izi.
 */
import { createRequire } from 'node:module';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const cmdPath = resolve(process.env.CMDDSL ?? process.argv[2] ?? resolve(here, '../../../CommandDSL'));

const servicesEntry = resolve(cmdPath, 'src/language/command-dsl-module.ts');
const journeyEntry = resolve(cmdPath, 'src/language/journey-triggers.ts');
const importsEntry = resolve(cmdPath, 'src/language/imports.ts');
const astEntry = resolve(cmdPath, 'src/generated/ast.ts');
for (const f of [servicesEntry, journeyEntry, importsEntry, astEntry]) {
    if (!existsSync(f)) {
        console.error(`Hata: CommandDSL kaynağı bulunamadı: ${f}`);
        console.error(`CommandDSL yolunu argümanla veya CMDDSL ile ver.`);
        process.exit(2);
    }
}

// esbuild'i CommandDSL'in node_modules'ından çöz (skill'in kendi deps'i yok).
const require = createRequire(resolve(cmdPath, 'package.json'));
const esbuild = require('esbuild');

// --- BUILD_INFO ---
function sha(...files) {
    const h = createHash('sha256');
    for (const f of files) h.update(readFileSync(resolve(cmdPath, f)));
    return h.digest('hex').slice(0, 12);
}
const grammarHash = sha('command-dsl.langium', 'shared.langium');

// businessSrcHash: bundle'a giren VALIDATION-kaynak kapanışının (recursive *.ts/*.mts)
// parmak izi. relpath de hash'lenir → taşıma/yeniden-adlandırma kaydolur.
// (walkTs/shaTree build.mjs ile mantık-özdeş kopya.)
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

// --- İKİ-PASS BUILD (bundle-damgalı dinamik src-reçetesi) ---
const commonOptions = {
    entryPoints: [resolve(here, 'journey-scan.src.mts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    alias: {
        '@cmddsl/services': servicesEntry,
        '@cmddsl/journey': journeyEntry,
        '@cmddsl/imports': importsEntry,
        '@cmddsl/ast': astEntry,
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
const srcDirs = [...new Set(
    Object.keys(probe.metafile.inputs)
        .filter(p => p.startsWith('src/'))
        .map(p => 'src/' + p.split('/')[1])
)].sort();
const businessSrcHash = shaTree(...srcDirs);

// --- PLUGIN-LOKAL wrapper reçetesi (build.mjs Faz-3 ile birebir) ---
const wrapperFiles = [...new Set(
    Object.keys(probe.metafile.inputs)
        .filter(p => !p.startsWith('src/') && !p.includes('node_modules') && !p.startsWith('<'))
        .map(p => relative(here, resolve(cmdPath, p))),
)].sort();
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

let langium = 'unknown';
try {
    langium = JSON.parse(readFileSync(resolve(cmdPath, 'node_modules/langium/package.json')))
        .version;
} catch { /* */ }

const BUILD_INFO = {
    grammarVersion: `v3.x-${grammarHash}`,
    grammarHash,
    srcDirs,
    businessSrcHash,
    wrapperFiles,
    wrapperHash,
    commit,
    builtAt: commitDate,
    langium,
};

await esbuild.build({
    ...commonOptions,
    outfile: resolve(here, 'journey-scan.mjs'),
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

console.error(`\n✓ journey-scan.mjs yazıldı · grammar ${grammarHash} · src ${businessSrcHash} [${srcDirs.join(' ')}] · wrapper ${wrapperHash} · commit ${commit} · langium ${langium}`);
