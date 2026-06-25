/**
 * Linked/standalone `.tcdsl` → `manifest.json` standalone üretici — kaynak.
 *
 * `build.manifest.mjs` ile tek dosyalık `emit-manifest.mjs` bundle'ına derlenir:
 * TechDsl dil servisleri + `manifestContent` (src/tech/manifest.ts) + langium içeri
 * gömülür → çalışma anında ne CommandDSL deposu ne node_modules gerekir, yalnız Node +
 * hedef `.tcdsl` (+ linked modda `contract` hedefi `operations.json`, fs'ten okunur).
 *
 * Doc-setup'ı `validate-tech.src.mts` ile AYNI: dizindeki tüm `.tcdsl` dosyaları
 * yüklenir (import/extension-pack kapanışı çözülsün diye) ve `validation:true` ile
 * build edilir; `contract` → `emitManifest` içinde doc.uri'ye göre çözülür → gerçek
 * dosya URI'si (NodeFileSystem) şart. Manifest, `contract`'ı bildiren KÖK dokümandan
 * üretilir (import edilen pack'ler ADR-0019 gereği manifest'e girmez).
 *
 * Çağrı:
 *   node emit-manifest.mjs <kök.tcdsl | dizin> <çıktı.manifest.json>
 *   node emit-manifest.mjs --version
 *
 * Çıkış kodu: 0 = üretildi · 1 = `.tcdsl`'de ≥1 severity-1 error (emit YOK — `emitManifest`
 * hatalı modelde de degrade manifest döndürür; bu yüzden gate aracın İÇİNDE: hatalı manifest
 * techgen'e gitmesin) · 2 = kullanım/girdi hatası.
 */
import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, isAbsolute, dirname, resolve } from 'node:path';
import { URI, type LangiumDocument } from 'langium';
import { NodeFileSystem } from 'langium/node';
// build.manifest.mjs bunları canlı CommandDSL'in tech kaynaklarına alias'lar.
import { createTechDslServices } from '@techdsl/services';
import { manifestContent } from '@techdsl/manifest';

declare const __BUILD_INFO__: {
    grammarVersion: string;
    grammarHash: string;
    techSrcHash: string;
    commit: string;
    builtAt: string;
    langium: string;
};

const argv = process.argv.slice(2);
if (argv.includes('--version')) {
    console.log(JSON.stringify(__BUILD_INFO__, null, 2));
    process.exit(0);
}
const positional = argv.filter(a => !a.startsWith('--'));
const [inArg, outArg] = positional;
if (!inArg || !outArg) {
    console.error('Kullanım: node emit-manifest.mjs <kök.tcdsl | dizin> <çıktı.manifest.json>');
    process.exit(2);
}

const inPath = isAbsolute(inArg) ? inArg : resolve(process.cwd(), inArg);
const outPath = isAbsolute(outArg) ? outArg : resolve(process.cwd(), outArg);

let inStat;
try {
    inStat = statSync(inPath);
} catch {
    console.error(`Hata: girdi okunamadı: ${inPath}`);
    process.exit(2);
}

// Doğrulama/emit birimi = DİZİN (import/extension-pack kapanışı). Bir DOSYA verilirse
// onu içeren dizin yüklenir; o dosya kök kabul edilir.
const rootFileGiven = inStat.isFile() ? inPath : null;
const dir = inStat.isDirectory() ? inPath : dirname(inPath);

const tcdslFiles = readdirSync(dir).filter(f => f.endsWith('.tcdsl')).sort();
if (tcdslFiles.length === 0) {
    console.error(`Hata: ${dir} içinde .tcdsl dosyası yok.`);
    process.exit(2);
}

const { shared } = createTechDslServices(NodeFileSystem);
const documents = shared.workspace.LangiumDocuments;
const loaded: LangiumDocument<any>[] = [];
for (const f of tcdslFiles) {
    loaded.push(await documents.getOrCreateDocument(URI.file(join(dir, f))) as LangiumDocument<any>);
}
await shared.workspace.DocumentBuilder.build(loaded, { validation: true });

// severity-1 (error) say — varsa emit etme (validate-tech ile aynı sayım: lexer/parser + diagnostics).
let errors = 0;
const errLines: string[] = [];
for (let i = 0; i < loaded.length; i++) {
    const doc = loaded[i];
    const file = tcdslFiles[i];
    for (const e of doc.parseResult.lexerErrors) { errors++; errLines.push(`${file}: lexer: ${e.message}`); }
    for (const e of doc.parseResult.parserErrors) { errors++; errLines.push(`${file}: parser: ${e.message}`); }
    for (const d of doc.diagnostics ?? []) {
        if ((d.severity ?? 1) === 1) { errors++; errLines.push(`${file}:${d.range.start.line + 1}: ${d.message}`); }
    }
}
if (errors > 0) {
    console.error(`Hata: ${errors} severity-1 error — manifest üretilmedi (önce 0 error'a getir):`);
    for (const l of errLines.slice(0, 20)) console.error(`  ${l}`);
    process.exit(1);
}

// Kök dokümanı seç: dosya verildiyse o; dizin verildiyse `contract` bildiren tek doküman
// (linked). contract'ı olan yoksa tek dosyalık standalone kabul; belirsizse hata.
let rootDoc: LangiumDocument<any> | undefined;
if (rootFileGiven) {
    rootDoc = loaded.find(d => d.uri.fsPath === rootFileGiven);
} else {
    const linked = loaded.filter(d => d.parseResult.value?.contract?.path);
    if (linked.length === 1) rootDoc = linked[0];
    else if (linked.length === 0 && loaded.length === 1) rootDoc = loaded[0];
    else if (linked.length > 1) {
        console.error(`Hata: birden çok dosya 'contract' bildiriyor (${linked.map(d => d.uri.fsPath.split('/').pop()).join(', ')}) — kök .tcdsl dosyasını argümanla ver.`);
        process.exit(2);
    } else {
        console.error(`Hata: kök .tcdsl belirsiz (${tcdslFiles.length} dosya, 'contract' yok) — kök dosyayı argümanla ver.`);
        process.exit(2);
    }
}
if (!rootDoc) {
    console.error(`Hata: kök doküman çözümlenemedi: ${rootFileGiven ?? dir}`);
    process.exit(2);
}

// FAIL-LOUD: emitManifest YALNIZ kök dokümanı gezer (ADR-0019 — import edilen içerik manifest'e
// girmez). emitManifest TÜM top-level dizileri (modules/deployables/externals/uncharted/errors/
// events…) kök model'den toplar; bu yüzden kök DIŞINDA bir kardeş dosyada `module` DIŞINDA bir
// decl de (deployable/external/uncharted/error/event/type…) olsa manifest'e SESSİZCE girmez →
// eksik manifest techgen'e gider. ALLOWLIST: kök-dışı kardeş yalnız **saf extension-pack** ise
// meşrudur (tüm decl'leri `Extension`; ADR-0019 gereği zaten manifest dışı). Başka herhangi bir
// top-level decl içeren kardeş = stray → hata.
const strayFiles: string[] = [];
for (let i = 0; i < loaded.length; i++) {
    if (loaded[i] === rootDoc) continue;
    const decls = (loaded[i].parseResult.value?.decls ?? []) as any[];
    const nonExt = decls.filter(d => d.$type !== 'Extension');
    if (nonExt.length) {
        const kinds = [...new Set(nonExt.map(d => `${d.$type}${d.name ? ' ' + d.name : ''}`))];
        strayFiles.push(`${tcdslFiles[i]} (${kinds.join(', ')})`);
    }
}
if (strayFiles.length) {
    console.error('Hata: kök DIŞINDA, extension-pack olmayan içerik var — manifest yalnız kök dokümanı');
    console.error('kapsar (emitManifest, ADR-0019); şu dosyalardaki decl\'ler manifest\'e SESSİZCE girmezdi:');
    for (const s of strayFiles) console.error(`  ${s}`);
    console.error('Çözüm: tüm domain içeriğini (module/deployable/external/error/event/type…) TEK kök');
    console.error('.tcdsl dosyasında topla. (import yalnız extension-pack içindir: yalnız `extension` bildirir.)');
    process.exit(2);
}

writeFileSync(outPath, manifestContent(rootDoc as any), 'utf-8');
console.error(`✓ manifest.json yazıldı: ${outPath}`);
process.exit(0);
