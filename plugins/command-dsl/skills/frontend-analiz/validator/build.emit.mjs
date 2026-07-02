/**
 * emit-operations.src.mts → emit-operations.mjs (tek dosyalık standalone bundle).
 *
 * `build.tech.mjs` emsali, ama BUSINESS tarafı: command-dsl dil servisleri + generator
 * (collectCommands/genOperationsIndex)'i bundle'lar → `.cdsl → operations.json` üretimi
 * CommandDSL deposu olmadan çalışır. Canlı CommandDSL READ-ONLY okunur; çıktı yalnız bu dizine.
 *
 * Kullanım: node build.emit.mjs [<CommandDSL-yolu>]   (CMDDSL=<yol> de olur; vars. ../../../CommandDSL)
 *
 * BUILD_INFO: grammarHash = sha256(command-dsl.langium); srcHash = sha256(src/language +
 * src/generator + src/shared, *.ts/*.mts, relpath dahil) → generator/services mantığı değişince yakalanır.
 */
import { createRequire } from 'node:module';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const cmdPath = resolve(process.env.CMDDSL ?? process.argv[2] ?? resolve(here, '../../../CommandDSL'));

const servicesEntry = resolve(cmdPath, 'src/language/command-dsl-module.ts');
const generatorEntry = resolve(cmdPath, 'src/generator/generator.ts');
const operationsEntry = resolve(cmdPath, 'src/generator/operations.ts');
for (const f of [servicesEntry, generatorEntry, operationsEntry]) {
    if (!existsSync(f)) {
        console.error(`Hata: CommandDSL kaynağı bulunamadı: ${f}`);
        console.error(`CommandDSL yolunu argümanla veya CMDDSL ile ver.`);
        process.exit(2);
    }
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
const grammarHash = sha('command-dsl.langium');
const srcHash = shaTree('src/language', 'src/generator', 'src/shared');

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
    entryPoints: [resolve(here, 'emit-operations.src.mts')],
    outfile: resolve(here, 'emit-operations.mjs'),
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node20',
    alias: {
        '@cmddsl/services': servicesEntry,
        '@cmddsl/generator': generatorEntry,
        '@cmddsl/operations': operationsEntry,
    },
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

console.error(`\n✓ emit-operations.mjs yazıldı · grammar ${grammarHash} · src ${srcHash} · commit ${commit} · langium ${langium}`);
