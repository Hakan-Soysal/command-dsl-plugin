/**
 * TechDsl standalone doğrulayıcı — kaynak.
 *
 * Bu dosya `build.tech.mjs` ile tek dosyalık bir `validate-tech.mjs` bundle'ına
 * derlenir: TechDsl dil servisleri + langium içeri gömülür, çalışma anında ne
 * CommandDSL deposuna ne de `node_modules`'a ihtiyaç duyar — yalnız Node + hedef
 * `.tcdsl` (+ linked modda `contract` hedefi `operations.json`, fs'ten okunur).
 *
 * Çağırma sözleşmesi (references/validator.md ile paralel):
 *   node validate-tech.mjs <dosya.tcdsl | dizin> [--json]
 *   node validate-tech.mjs --version
 *
 * Çıkış kodu: 0 = error yok · 1 = ≥1 severity-1 error · 2 = kullanım/girdi hatası.
 *
 * --json:  stdout = SAF diagnostics dizisi (her biri {severity,line,col,message,file});
 *          stderr = insan-okur meta banner (grammarVersion, kaynak, dosya listesi, özet).
 * varsayılan: stdout = insan-okur rapor.
 *
 * Doğrulama birimi = DİZİN (modül/pack kümesi). Bir DOSYA verilirse onu içeren dizin
 * doğrulanır — böylece `import` (extension-pack) kapanışı çözülür. Linked `contract`
 * (operations.json) tech validator'ın `contractOf`'u tarafından doc.uri'ye göre
 * çözülür → gerçek dosya URI'si (NodeFileSystem) şart.
 */
import { readdirSync, statSync } from 'node:fs';
import { join, isAbsolute, dirname, resolve } from 'node:path';
import { URI, type LangiumDocument } from 'langium';
import { NodeFileSystem } from 'langium/node';
// build.tech.mjs bunu canlı CommandDSL'in tech-dsl-module.ts'ine alias'lar.
// createTechDslServices, registerTechValidationChecks'i İÇERDE çağırır → check'ler kayıtlı.
import { createTechDslServices } from '@techdsl/services';

// build.tech.mjs tarafından esbuild `define` ile gömülür.
declare const __BUILD_INFO__: {
    grammarVersion: string;
    grammarHash: string;
    techSrcHash: string;
    commit: string;
    builtAt: string;
    langium: string;
};

const argv = process.argv.slice(2);
const jsonMode = argv.includes('--json');
const wantVersion = argv.includes('--version');
const positional = argv.filter(a => !a.startsWith('--'));

if (wantVersion) {
    console.log(JSON.stringify(__BUILD_INFO__, null, 2));
    process.exit(0);
}

if (positional.length === 0) {
    console.error('Kullanım: node validate-tech.mjs <dosya.tcdsl | dizin> [--json]');
    process.exit(2);
}

const rawTarget = positional[0];
const target = isAbsolute(rawTarget) ? rawTarget : resolve(process.cwd(), rawTarget);

let dir: string;
try {
    dir = statSync(target).isDirectory() ? target : dirname(target);
} catch {
    console.error(`Hata: yol bulunamadı: ${target}`);
    process.exit(2);
}

const tcdslFiles = readdirSync(dir).filter(f => f.endsWith('.tcdsl')).sort();
if (tcdslFiles.length === 0) {
    console.error(`Hata: ${dir} içinde .tcdsl dosyası yok.`);
    process.exit(2);
}

const { shared } = createTechDslServices(NodeFileSystem);
const documents = shared.workspace.LangiumDocuments;
const loaded: LangiumDocument[] = [];
for (const f of tcdslFiles) {
    loaded.push(await documents.getOrCreateDocument(URI.file(join(dir, f))));
}
await shared.workspace.DocumentBuilder.build(loaded, { validation: true });

type Diag = { severity: number; line: number; col: number; message: string; file: string };
const diagnostics: Diag[] = [];
let errors = 0, warns = 0, infos = 0;

for (let i = 0; i < loaded.length; i++) {
    const doc = loaded[i];
    const file = tcdslFiles[i];

    // Parse (lexer/parser) hataları — severity 1 sayılır.
    for (const e of doc.parseResult.lexerErrors) {
        errors++;
        diagnostics.push({ severity: 1, line: 0, col: 0, message: `lexer: ${e.message}`, file });
    }
    for (const e of doc.parseResult.parserErrors) {
        errors++;
        diagnostics.push({ severity: 1, line: 0, col: 0, message: `parser: ${e.message}`, file });
    }

    for (const d of doc.diagnostics ?? []) {
        const sev = d.severity ?? 1;
        if (sev === 1) errors++; else if (sev === 2) warns++; else if (sev === 3) infos++;
        diagnostics.push({
            severity: sev,
            line: d.range.start.line + 1,    // 1-tabanlı
            col: d.range.start.character + 1, // 1-tabanlı
            message: d.message,
            file,
        });
    }
}

const ok = errors === 0;

if (jsonMode) {
    console.error(
        `TechDsl doğrulayıcı · grammar ${__BUILD_INFO__.grammarVersion} (${__BUILD_INFO__.grammarHash}) · ` +
        `src ${__BUILD_INFO__.techSrcHash} · commit ${__BUILD_INFO__.commit} · langium ${__BUILD_INFO__.langium}`);
    console.error(`Dosyalar (${tcdslFiles.length}): ${tcdslFiles.join(', ')}`);
    console.error(`Özet: ${errors} error, ${warns} warning, ${infos} info`);
    process.stdout.write(JSON.stringify(diagnostics) + '\n');
} else {
    const sevName: Record<number, string> = { 1: 'ERROR', 2: 'WARN', 3: 'INFO', 4: 'HINT' };
    console.log(
        `\n=== TechDsl doğrulama · grammar ${__BUILD_INFO__.grammarVersion} (${__BUILD_INFO__.grammarHash}) · src ${__BUILD_INFO__.techSrcHash} ===`);
    console.log(`Dosyalar (${tcdslFiles.length}): ${tcdslFiles.join(', ')}\n`);
    for (const d of diagnostics) {
        console.log(`${sevName[d.severity] ?? d.severity} ${d.file}:${d.line}: ${d.message}`);
    }
    if (diagnostics.length === 0) console.log('(temiz — hiç diagnostic yok)');
    console.log(`\n=== ÖZET: ${errors} error, ${warns} warning, ${infos} info ===`);
}

process.exit(ok ? 0 : 1);
