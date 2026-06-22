/**
 * CommandDSL standalone doğrulayıcı — kaynak.
 *
 * Bu dosya `build.mjs` ile tek dosyalık bir `validate.mjs` bundle'ına derlenir:
 * CommandDSL dil servisleri + langium içeri gömülür, çalışma anında ne CommandDSL
 * deposuna ne de `node_modules`'a ihtiyaç duyar — yalnız Node + hedef `.cdsl`.
 *
 * Çağırma sözleşmesi (references/validator.md §3):
 *   node validate.mjs <dosya.cdsl | dizin> [--json]
 *   node validate.mjs --version
 *
 * Çıkış kodu: 0 = error yok · 1 = ≥1 severity-1 error · 2 = kullanım/girdi hatası.
 *
 * --json:  stdout = SAF diagnostics dizisi (her biri {severity,line,col,message,code,file});
 *          stderr = insan-okur meta banner (grammarVersion, kaynak, dosya listesi, özet).
 * varsayılan: stdout = insan-okur rapor.
 *
 * Doğrulama birimi = DİZİN (modül kümesi). Bir DOSYA verilirse onu içeren dizin
 * doğrulanır — böylece çapraz-modül `import` kapanışı çözülür (load-whole-dir,
 * CommandDSL'in kendi testleriyle kanıtlı yaklaşım).
 */
import { readdirSync, statSync } from 'node:fs';
import { join, isAbsolute, dirname, basename, resolve } from 'node:path';
import { URI, type LangiumDocument } from 'langium';
import { NodeFileSystem } from 'langium/node';
// build.mjs bunu canlı CommandDSL'in command-dsl-module.ts'ine alias'lar.
import { createCommandDslServices } from '@cmddsl/services';

// build.mjs tarafından esbuild `define` ile gömülür.
declare const __BUILD_INFO__: {
    grammarVersion: string;
    grammarHash: string;
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
    console.error('Kullanım: node validate.mjs <dosya.cdsl | dizin> [--json]');
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

const cdslFiles = readdirSync(dir).filter(f => f.endsWith('.cdsl')).sort();
if (cdslFiles.length === 0) {
    console.error(`Hata: ${dir} içinde .cdsl dosyası yok.`);
    process.exit(2);
}

const { shared } = createCommandDslServices(NodeFileSystem);
const documents = shared.workspace.LangiumDocuments;
const loaded: LangiumDocument[] = [];
for (const f of cdslFiles) {
    loaded.push(await documents.getOrCreateDocument(URI.file(join(dir, f))));
}
await shared.workspace.DocumentBuilder.build(loaded, { validation: true });

// Kodu mesaja gömülü konvansiyondan çıkar: "(P6 — ...)" / "(T5)" / "(F6 ...)".
// CommandDSL diagnostics'i `code` alanını structured taşımaz; mesaj içindeki
// "(<HARF><RAKAM>...)" kalıbından best-effort kurtarılır. Bulunamazsa null.
function extractCode(message: string): string | null {
    const m = message.match(/\(([A-Z]{1,2}\d+)\b/);
    return m ? m[1] : null;
}

type Diag = { severity: number; line: number; col: number; message: string; code: string | null; file: string };
const diagnostics: Diag[] = [];
let errors = 0, warns = 0, infos = 0;

for (let i = 0; i < loaded.length; i++) {
    const doc = loaded[i];
    const file = cdslFiles[i];

    // Parse (lexer/parser) hataları — severity 1 sayılır.
    for (const e of doc.parseResult.lexerErrors) {
        errors++;
        diagnostics.push({ severity: 1, line: 0, col: 0, message: `lexer: ${e.message}`, code: null, file });
    }
    for (const e of doc.parseResult.parserErrors) {
        errors++;
        diagnostics.push({ severity: 1, line: 0, col: 0, message: `parser: ${e.message}`, code: null, file });
    }

    for (const d of doc.diagnostics ?? []) {
        const sev = d.severity ?? 1;
        if (sev === 1) errors++; else if (sev === 2) warns++; else if (sev === 3) infos++;
        diagnostics.push({
            severity: sev,
            line: d.range.start.line + 1,   // 1-tabanlı
            col: d.range.start.character + 1, // 1-tabanlı
            message: d.message,
            code: extractCode(d.message),
            file,
        });
    }
}

const ok = errors === 0;

if (jsonMode) {
    // stderr: meta (drift/grammarVersion + özet) — stdout'u kirletmez.
    console.error(
        `CommandDSL doğrulayıcı · grammar ${__BUILD_INFO__.grammarVersion} (${__BUILD_INFO__.grammarHash}) · ` +
        `commit ${__BUILD_INFO__.commit} · langium ${__BUILD_INFO__.langium}`);
    console.error(`Dosyalar (${cdslFiles.length}): ${cdslFiles.join(', ')}`);
    console.error(`Özet: ${errors} error, ${warns} warning, ${infos} info`);
    // stdout: SAF diagnostics dizisi.
    process.stdout.write(JSON.stringify(diagnostics) + '\n');
} else {
    const sevName: Record<number, string> = { 1: 'ERROR', 2: 'WARN', 3: 'INFO', 4: 'HINT' };
    console.log(
        `\n=== CommandDSL doğrulama · grammar ${__BUILD_INFO__.grammarVersion} (${__BUILD_INFO__.grammarHash}) ===`);
    console.log(`Dosyalar (${cdslFiles.length}): ${cdslFiles.join(', ')}\n`);
    for (const d of diagnostics) {
        const where = d.code ? `${d.file}:${d.line} [${d.code}]` : `${d.file}:${d.line}`;
        console.log(`${sevName[d.severity] ?? d.severity} ${where}: ${d.message}`);
    }
    if (diagnostics.length === 0) console.log('(temiz — hiç diagnostic yok)');
    console.log(`\n=== ÖZET: ${errors} error, ${warns} warning, ${infos} info ===`);
}

process.exit(ok ? 0 : 1);
