/**
 * qcdsl.src.mts → qcdsl.mjs (tek dosyalık standalone bundle: doğrulayıcı + gate'li emitter).
 *
 * `frontend-analiz/validator/build.frontend.mjs`'in QA mirror'ı. Canlı CommandDSL
 * deposunu READ-ONLY okur; oraya HİÇBİR şey yazmaz. Çıktıyı yalnız bu validator
 * dizinine (qcdsl.mjs + SNAPSHOT.json) koyar.
 *
 * Kullanım:
 *   node build.qa.mjs [<CommandDSL-yolu>]
 *   CMDDSL=<yol> node build.qa.mjs
 * Varsayılan CommandDSL yolu: ../../../CommandDSL (bu workspace'te YANLIŞ —
 * CMDDSL veya argümanla ver; teknik-analiz dersi).
 *
 * BUILD_INFO drift tespiti içindir (İKİ hash — aile dersi):
 *   grammarHash = sha256(qa-dsl.langium + tech-dsl.langium + shared.langium) → GRAMMAR izi
 *                 (üçü birden: qa birleşik üretim tech'i de tüketir — spec §11;
 *                 teknik-analiz bundle'ıyla tech-grammar eşzamanlılığı bu yüzden kritik)
 *   qaSrcHash   = sha256(src/qa/**.ts + src/shared/**.ts, relpath dahil)
 *                 → VALIDATION+EMIT mantığı izi (grammar-dışı fix'ler de yakalanır)
 */
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const cmdPath = resolve(process.env.CMDDSL ?? process.argv[2] ?? resolve(here, '../../../CommandDSL'));

const servicesEntry = resolve(cmdPath, 'src/qa/qa-dsl-module.ts');
if (!existsSync(servicesEntry)) {
    console.error(`Hata: QA DSL dil servisleri bulunamadı: ${servicesEntry}`);
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
// ÜÇ grammar birden: src/qa/generated birleşik üretimi qa + tech + shared'dan türer.
const grammarHash = sha('qa-dsl.langium', 'tech-dsl.langium', 'shared.langium');

// qaSrcHash: bundle'a giren kaynak kapanışının (src/qa + src/shared, recursive
// *.ts/*.mts) parmak izi. relpath de hash'lenir → taşıma/yeniden-adlandırma
// kaydolur. Over-inclusion bilinçli (generated/ dahil): kaçırmaktansa fazladan tetikle.
// NOT: src/tech custom servisleri de bundle'a girer (qa-dsl-module import zinciri) ama
// hash kapsamı aile sözleşmesince src/qa + src/shared'dır; tech tarafının izi
// teknik-analiz bundle'ının kendi hash'lerinde yaşar (aile-eşzamanlı-build kuralı).
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
const qaSrcHash = shaTree('src/qa', 'src/shared');

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
    grammarVersion: `qa-v1.x-${grammarHash}`,
    grammarHash,
    qaSrcHash,            // validation+emit mantığı parmak izi (grammar-dışı bayatlık dedektörü)
    commit,
    builtAt: commitDate,
    langium,
};

await esbuild.build({
    entryPoints: [resolve(here, 'qcdsl.src.mts')],
    outfile: resolve(here, 'qcdsl.mjs'),
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    // QA servisleri/emitter'ı mutlak yola alias'la — kaynak portable kalır.
    alias: {
        '@qadsl/services': servicesEntry,
        '@qadsl/validation': resolve(cmdPath, 'src/qa/qa-dsl-validation.ts'),
        '@qadsl/manifest': resolve(cmdPath, 'src/qa/qa-manifest.ts'),
        '@qadsl/ast': resolve(cmdPath, 'src/qa/generated/ast.ts'),
    },
    // bare import'lar (langium, vscode-languageserver-*) CommandDSL node_modules'ından çözülür.
    absWorkingDir: cmdPath,
    nodePaths: [resolve(cmdPath, 'node_modules')],
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
writeFileSync(resolve(here, 'SNAPSHOT.json'), JSON.stringify({
    source: 'CommandDSL',
    ...BUILD_INFO,
    // emit-operations.{mjs,src.mts} + build.emit.mjs frontend-analiz kopyasıdır (build
    // edilmedi): kardeş kopyalar bit-özdeş doğrulandı — .mjs'te yalnız esbuild'in
    // yol-yorumu satırları farklıdır (işlevsel fark yok).
    emitOperations: 'frontend-analiz kopyası (2026-07-03; src/business hash\'i is-analizi-dsl kanonik üreticisiyle aynı repo durumundan)',
}, null, 2) + '\n');

console.error(`\n✓ qcdsl.mjs yazıldı · grammar ${grammarHash} · src ${qaSrcHash} · commit ${commit} · langium ${langium}`);
