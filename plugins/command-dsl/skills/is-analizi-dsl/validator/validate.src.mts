/**
 * CommandDSL standalone doğrulayıcı — kaynak.
 *
 * Bu dosya `build.mjs` ile tek dosyalık bir `validate.mjs` bundle'ına derlenir:
 * CommandDSL dil servisleri + langium içeri gömülür, çalışma anında ne CommandDSL
 * deposuna ne de `node_modules`'a ihtiyaç duyar — yalnız Node + hedef `.cdsl`.
 *
 * Çağırma sözleşmesi (references/validator.md §3):
 *   node validate.mjs <dosya.cdsl | dizin> [--json] [--single]
 *   node validate.mjs --version
 *
 * Çıkış kodu: 0 = error yok · 1 = ≥1 severity-1 error · 2 = kullanım/girdi hatası.
 *
 * --json:  stdout = SAF diagnostics dizisi (her biri {severity,line,col,message,code,file}
 *          + kapanış tanılarında closure:true);
 *          stderr = insan-okur meta banner (grammarVersion, kaynak, dosya listesi, özet).
 * varsayılan: stdout = insan-okur rapor.
 *
 * Doğrulama birimi = DİZİN (modül kümesi). Bir DOSYA verilirse onu içeren dizin
 * doğrulanır — böylece çapraz-modül `import` kapanışı çözülür (load-whole-dir,
 * CommandDSL'in kendi testleriyle kanıtlı yaklaşım).
 *
 * --single (opt-in, kalem J): dizin-genişletme ATLANIR — yalnız verilen DOSYA
 * girdi olarak yüklenir. `import` kapanışı yine tam çözülür: CommandDSL'in
 * kendi DocumentBuilder'ı (command-dsl-document-builder.ts collectImportClosure)
 * import edilen dosyaları AYNI build koşusuna otomatik çeker. Alakasız komşu
 * `.cdsl`'ler HİÇ yüklenmez → komşu-dosya hataları çıktıya/exit-code'a karışmaz.
 * Kapanış dosyalarındaki tanılar FAIL-LOUD raporlanır: `(kapanış)` etiketiyle
 * basılır VE sayılır (bozuk import hedefi = exit 1; qcdsl emsali). `--single`
 * bir dizinle çağrılırsa exit 2 (kullanım hatası).
 * NOT (F6/P8): ters-yön importer'lar (bu dosyayı import EDEN akış dosyaları)
 * `--single` modda yüklenmez → dizin moduna göre kapsama (F6) / destek-akışı
 * (P8) INFO-WARN farkı görülebilir; bu bir hata değil, birim farkıdır.
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
const singleMode = argv.includes('--single');
const positional = argv.filter(a => !a.startsWith('--'));

if (wantVersion) {
    console.log(JSON.stringify(__BUILD_INFO__, null, 2));
    process.exit(0);
}

if (positional.length === 0) {
    console.error('Kullanım: node validate.mjs <dosya.cdsl | dizin> [--json] [--single]');
    console.error('  --single  dizin-genişletme atlanır: yalnız verilen DOSYA + import kapanışı');
    console.error('            yüklenir (kapanış tanıları "(kapanış)" etiketiyle raporlanır ve sayılır).');
    console.error('            Dikkat: ters-yön importer yüklenmez → F6/P8 kapsama farkı olabilir.');
    process.exit(2);
}

const rawTarget = positional[0];
const target = isAbsolute(rawTarget) ? rawTarget : resolve(process.cwd(), rawTarget);

let isDir: boolean;
try {
    isDir = statSync(target).isDirectory();
} catch {
    console.error(`Hata: yol bulunamadı: ${target}`);
    process.exit(2);
}

let dir: string;
let cdslFiles: string[];
if (singleMode) {
    // --single: dizin-genişletme YOK — yalnız verilen dosya girdi olur.
    // Import kapanışını CommandDslDocumentBuilder.collectImportClosure otomatik çeker.
    if (isDir) {
        console.error(`Hata: --single bir DOSYA bekler, dizin verildi: ${target}`);
        process.exit(2);
    }
    if (!target.endsWith('.cdsl')) {
        console.error(`Hata: --single hedefi bir .cdsl dosyası olmalı: ${target}`);
        process.exit(2);
    }
    dir = dirname(target);
    cdslFiles = [basename(target)];
} else {
    dir = isDir ? target : dirname(target);
    cdslFiles = readdirSync(dir).filter(f => f.endsWith('.cdsl')).sort();
    if (cdslFiles.length === 0) {
        console.error(`Hata: ${dir} içinde .cdsl dosyası yok.`);
        process.exit(2);
    }
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

type Diag = {
    severity: number; line: number; col: number; message: string;
    code: string | null; file: string; closure?: true;
};
const diagnostics: Diag[] = [];
let errors = 0, warns = 0, infos = 0;

function pushDoc(doc: LangiumDocument, file: string, closure: boolean): void {
    // Lexer/parser hataları AYRICA push EDİLMEZ: Langium DocumentValidator
    // (processLexingErrors/processParsingErrors) bunları zaten doc.diagnostics'e
    // GERÇEK konumla ekler. Elle 0:0 push = çift-basım + çift-sayım (drift bulgusu G).
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
            ...(closure ? { closure: true as const } : {}),
        });
    }
}

for (let i = 0; i < loaded.length; i++) {
    pushDoc(loaded[i], cdslFiles[i], false);
}

// --single: import kapanışının (builder'ın otomatik yüklediği dosyalar) tanıları
// FAIL-LOUD dahil edilir — bozuk import hedefi sessiz geçmez, sayılır (exit 1).
// qcdsl "(kapanış)" emsali. Dizin modunda bu küme boştur (tüm .cdsl'ler zaten girdi).
if (singleMode) {
    const inputSet = new Set(loaded.map(d => d.uri.toString()));
    const closureDocs = [...documents.all]
        .filter(d => !inputSet.has(d.uri.toString()))
        .sort((a, b) => a.uri.fsPath.localeCompare(b.uri.fsPath));
    for (const doc of closureDocs) {
        pushDoc(doc, basename(doc.uri.fsPath), true);
    }
}

const ok = errors === 0;

const modeTag = singleMode ? ' · --single (dizin-genişletme yok; import kapanışı dahil)' : '';

if (jsonMode) {
    // stderr: meta (drift/grammarVersion + özet) — stdout'u kirletmez.
    console.error(
        `CommandDSL doğrulayıcı · grammar ${__BUILD_INFO__.grammarVersion} (${__BUILD_INFO__.grammarHash}) · ` +
        `commit ${__BUILD_INFO__.commit} · langium ${__BUILD_INFO__.langium}`);
    console.error(`Dosyalar (${cdslFiles.length}): ${cdslFiles.join(', ')}${modeTag}`);
    console.error(`Özet: ${errors} error, ${warns} warning, ${infos} info`);
    // stdout: SAF diagnostics dizisi.
    process.stdout.write(JSON.stringify(diagnostics) + '\n');
} else {
    const sevName: Record<number, string> = { 1: 'ERROR', 2: 'WARN', 3: 'INFO', 4: 'HINT' };
    console.log(
        `\n=== CommandDSL doğrulama · grammar ${__BUILD_INFO__.grammarVersion} (${__BUILD_INFO__.grammarHash}) ===`);
    console.log(`Dosyalar (${cdslFiles.length}): ${cdslFiles.join(', ')}${modeTag}\n`);
    for (const d of diagnostics) {
        const label = d.closure ? `${d.file} (kapanış)` : d.file;
        const where = d.code ? `${label}:${d.line} [${d.code}]` : `${label}:${d.line}`;
        console.log(`${sevName[d.severity] ?? d.severity} ${where}: ${d.message}`);
    }
    if (diagnostics.length === 0) console.log('(temiz — hiç diagnostic yok)');
    console.log(`\n=== ÖZET: ${errors} error, ${warns} warning, ${infos} info ===`);
}

process.exit(ok ? 0 : 1);
