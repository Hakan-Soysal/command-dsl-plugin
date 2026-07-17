/**
 * fcdsl.src.mts → fcdsl.mjs (tek dosyalık standalone bundle: doğrulayıcı + gate'li emitter).
 *
 * `teknik-analiz/validator/build.tech.mjs`'in FRONTEND mirror'ı. Canlı CommandDSL
 * deposunu READ-ONLY okur; oraya HİÇBİR şey yazmaz. Çıktıyı yalnız bu validator
 * dizinine (fcdsl.mjs + SNAPSHOT.json) koyar.
 *
 * Kullanım:
 *   node build.frontend.mjs [<CommandDSL-yolu>]
 *   CMDDSL=<yol> node build.frontend.mjs
 * Varsayılan CommandDSL yolu: ../../../CommandDSL (bu workspace'te YANLIŞ —
 * CMDDSL veya argümanla ver; teknik-analiz dersi).
 *
 * BUILD_INFO drift tespiti içindir (İKİ hash — teknik-analiz dersi):
 *   grammarHash     = sha256(frontend-dsl.langium + shared.langium) → GRAMMAR izi
 *   frontendSrcHash = sha256(bundle'a giren TÜM src/ dizinleri — Pass-1 metafile'dan türetilir,
 *                     BUILD_INFO.srcDirs olarak damgalanır; bugün src/frontend + src/shared)
 *                     → VALIDATION+EMIT mantığı izi (grammar-dışı fix'ler de yakalanır)
 */
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const cmdPath = resolve(process.env.CMDDSL ?? process.argv[2] ?? resolve(here, '../../../CommandDSL'));

const servicesEntry = resolve(cmdPath, 'src/frontend/frontend-dsl-module.ts');
if (!existsSync(servicesEntry)) {
    console.error(`Hata: FrontendDsl dil servisleri bulunamadı: ${servicesEntry}`);
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

// frontendSrcHash: bundle'a giren kaynak kapanışının (recursive *.ts/*.mts) parmak izi.
// relpath de hash'lenir → taşıma/yeniden-adlandırma kaydolur. Over-inclusion bilinçli
// (generated/ dahil): kaçırmaktansa fazladan tetikle.
// KAPSAM DİNAMİK (2026-07-17): hash'lenecek src/ dizinleri statik reçete değil — Pass-1
// esbuild-metafile'ından türetilir ve BUILD_INFO'ya `srcDirs` olarak damgalanır (aşağı).
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
    files.sort(); // deterministik (mutlak path sırası)
    for (const f of files) {
        h.update(f.slice(cmdPath.length)); // konum-bağımsız relpath → rename/move kaydolur
        h.update(readFileSync(f));
    }
    return h.digest('hex').slice(0, 12);
}
// --- İKİ-PASS BUILD (bundle-damgalı dinamik src-reçetesi) ---
// Pass-1 (write:false + metafile, hiçbir dosya yazılmaz): esbuild'in bundle'a GERÇEKTEN
// aldığı src/ dosyalarından izlenen dizinler türetilir. check-skill-staleness bu damgayı
// okur → statik-reçete drifti imkansız; gelecekte eklenen cross-dizin import otomatik kapsanır.
const commonOptions = {
    entryPoints: [resolve(here, 'fcdsl.src.mts')],
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    // FrontendDsl servisleri/emitter'ı mutlak yola alias'la — kaynak portable kalır.
    alias: {
        '@frontenddsl/services': servicesEntry,
        '@frontenddsl/experience': resolve(cmdPath, 'src/frontend/experience.ts'),
        '@frontenddsl/ast': resolve(cmdPath, 'src/frontend/generated/ast.ts'),
    },
    // bare import'lar (langium, vscode-languageserver-*) CommandDSL node_modules'ından çözülür.
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
const frontendSrcHash = shaTree(...srcDirs);

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

let langium = 'unknown';
try {
    langium = JSON.parse(readFileSync(resolve(cmdPath, 'node_modules/langium/package.json')))
        .version;
} catch { /* */ }

const BUILD_INFO = {
    grammarVersion: `frontend-v1.x-${grammarHash}`,
    grammarHash,
    srcDirs,              // Pass-1 metafile'dan türetilen izlenen src/ dizinleri (check-staleness damgası)
    frontendSrcHash,      // validation+emit mantığı parmak izi (grammar-dışı bayatlık dedektörü; kapsam = srcDirs)
    wrapperFiles,    // Faz-3: plugin-lokal wrapper girdileri (validator-dizini-göreli; check-staleness damgası)
    wrapperHash,     // Faz-3: wrapper-drift parmak izi (entry .src.mts + plugin-lokal import zinciri)
    commit,
    builtAt: commitDate,
    langium,
};

// Pass-2: gerçek build (BUILD_INFO artık srcDirs + frontendSrcHash damgasını taşır).
await esbuild.build({
    ...commonOptions,
    outfile: resolve(here, 'fcdsl.mjs'),
    define: { __BUILD_INFO__: JSON.stringify(BUILD_INFO) },
    // ESM bundle içindeki CJS bağımlılıklar (vscode-jsonrpc vb.) runtime'da require çağırır.
    banner: {
        js: [
            '#!/usr/bin/env node',
            "import { createRequire as __cr } from 'node:module';",
            'const require = __cr(import.meta.url);',
        ].join('\n'),
    },
    logLevel: 'info',
});

// SNAPSHOT.json — kaynak repo + commit + hash kaydı (bayatlama tespiti, insan-okur).
writeFileSync(resolve(here, 'SNAPSHOT.json'), JSON.stringify({ source: 'CommandDSL', ...BUILD_INFO }, null, 2) + '\n');

console.error(`\n✓ fcdsl.mjs yazıldı · grammar ${grammarHash} · src ${frontendSrcHash} [${srcDirs.join(' ')}] · wrapper ${wrapperHash} · commit ${commit} · langium ${langium}`);
