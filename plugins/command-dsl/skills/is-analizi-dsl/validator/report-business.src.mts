/**
 * Business `.cdsl` → İNSAN-OKUR RAPORLAR standalone üretici — kaynak.
 *
 * `build.report.mjs` ile tek dosyalık `report-business.mjs` bundle'ına derlenir:
 * CommandDSL (business) dil servisleri + playground'un KENDİ programatik üreteçleri
 * (plantuml / plantuml-flow / plantuml-process / plantuml-blueprint / process-doc /
 * cockburn / coverage) + langium içeri gömülür → çalışma anında ne CommandDSL deposu
 * ne node_modules gerekir, yalnız Node + hedef `.cdsl`.
 *
 * Çağrı (ortak araç sözleşmesi — INSAN-OKUR-RAPOR-EKI-TASARIM.md):
 *   node report-business.mjs <girdi.cdsl|dizin> --reports <dizin> [--title "…"] [--quiet]
 *   node report-business.mjs --version
 *
 * Çıkış kodu: 0 = raporlar üretildi · 1 = girdide severity-1 error (HİÇBİR rapor
 * yazılmaz — gate) · 2 = kullanım/girdi hatası.
 *
 * Üretim (`<reports>/business/` altına):
 *   usecase.puml                       — generateUseCaseDiagram (tüm model)
 *   flows/<slug>.puml                  — flow başına generateActivityDiagram
 *   processes/<slug>.puml              — process başına generateProcessDiagram
 *   processes/<slug>.blueprint.puml    — process başına generateProcessBlueprint
 *   docs/**                            — genProcessDocFiles + genFlowDocFiles
 *                                        (GeneratedFile[] kendi göreli yolunu taşır)
 *   COVERAGE.md                        — genCoverageFiles (coverage.json makine
 *                                        türevidir, rapora ALINMAZ — emsal kapsamı)
 * Sonra `<reports>/index.md` + `index.html` diski TARAYARAK yeniden üretilir
 * (report-index.src.mts — üç skill'de byte-özdeş kanonik kopya).
 *
 * Doğrulama birimi = DİZİN (validate.mjs ile aynı): bir DOSYA verilirse onu içeren
 * dizin yüklenir ki çapraz-modül `import` kapanışı çözülsün; gate dizindeki TÜM
 * .cdsl'lerin error'ları üzerinden işler. Üretim modeli: dosya girdisinde entry'nin
 * import kapanışı (importClosureModels), dizin girdisinde dizindeki tüm modeller.
 */
import { mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { URI, type LangiumDocument } from 'langium';
import { NodeFileSystem } from 'langium/node';
// build.report.mjs bunları canlı CommandDSL'in business kaynaklarına alias'lar.
import { createCommandDslServices } from '@cmddsl/services';
import { collectCommands } from '@cmddsl/generator';
import { generateUseCaseDiagram } from '@cmddsl/plantuml';
import { generateActivityDiagram } from '@cmddsl/plantuml-flow';
import { generateProcessDiagram } from '@cmddsl/plantuml-process';
import { generateProcessBlueprint } from '@cmddsl/plantuml-blueprint';
import { genProcessDocFiles } from '@cmddsl/process-doc';
import { genFlowDocFiles } from '@cmddsl/cockburn';
import { genCoverageFiles } from '@cmddsl/coverage';
import { isFlowDef, isProcessDef, type Model } from '@cmddsl/ast';
import { importClosureModels } from '@cmddsl/imports';
import { kebab } from '@cmddsl/naming';
import { regenerateIndex } from './report-index.src.mts';

declare const __BUILD_INFO__: {
    grammarVersion: string;
    grammarHash: string;
    srcHash: string;
    commit: string;
    builtAt: string;
    langium: string;
};

const USAGE =
    'Kullanım: node report-business.mjs <girdi.cdsl|dizin> --reports <dizin> [--title "…"] [--quiet]';

// ---- argümanlar ----
const argv = process.argv.slice(2);
if (argv.includes('--version')) {
    console.log(JSON.stringify(__BUILD_INFO__, null, 2));
    process.exit(0);
}
const quiet = argv.includes('--quiet');
let reportsArg: string | undefined;
let title: string | undefined;
const positional: string[] = [];
for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--quiet') continue;
    if (a === '--reports') {
        reportsArg = argv[++i];
        if (!reportsArg || reportsArg.startsWith('--')) { console.error(USAGE); process.exit(2); }
    } else if (a === '--title') {
        title = argv[++i];
        if (title === undefined) { console.error(USAGE); process.exit(2); }
    } else if (a.startsWith('--')) {
        console.error(`Hata: bilinmeyen seçenek: ${a}\n${USAGE}`);
        process.exit(2);
    } else positional.push(a);
}
if (positional.length !== 1 || !reportsArg) {
    console.error(USAGE);
    process.exit(2);
}

const target = isAbsolute(positional[0]) ? positional[0] : resolve(process.cwd(), positional[0]);
const reportsRoot = isAbsolute(reportsArg) ? reportsArg : resolve(process.cwd(), reportsArg);

let isDir: boolean;
try {
    isDir = statSync(target).isDirectory();
} catch {
    console.error(`Hata: yol bulunamadı: ${target}`);
    process.exit(2);
}
if (!isDir && !target.endsWith('.cdsl')) {
    console.error(`Hata: girdi bir .cdsl dosyası veya dizin olmalı: ${target}`);
    process.exit(2);
}
const dir = isDir ? target : dirname(target);

const cdslFiles = readdirSync(dir).filter(f => f.endsWith('.cdsl')).sort();
if (cdslFiles.length === 0) {
    console.error(`Hata: ${dir} içinde .cdsl dosyası yok.`);
    process.exit(2);
}

// ---- yükleme + doğrulama (gate) ----
const { shared } = createCommandDslServices(NodeFileSystem);
const documents = shared.workspace.LangiumDocuments;
const loaded: LangiumDocument<Model>[] = [];
for (const f of cdslFiles) {
    loaded.push(await documents.getOrCreateDocument(URI.file(join(dir, f))) as LangiumDocument<Model>);
}
await shared.workspace.DocumentBuilder.build(loaded, { validation: true });

let errors = 0;
for (let i = 0; i < loaded.length; i++) {
    const doc = loaded[i];
    const file = cdslFiles[i];
    for (const e of doc.parseResult.lexerErrors) { errors++; console.error(`${file} lexer: ${e.message}`); }
    for (const e of doc.parseResult.parserErrors) { errors++; console.error(`${file} parser: ${e.message}`); }
    for (const d of doc.diagnostics ?? []) {
        if ((d.severity ?? 1) === 1) {
            errors++;
            console.error(`${file} error ${d.range.start.line + 1}: ${d.message}`);
        }
    }
}
if (errors > 0) {
    console.error(`\n✗ ${errors} error — HİÇBİR rapor yazılmadı (gate). Önce .cdsl'i düzelt.`);
    process.exit(1);
}

// ---- üretim modeli: dosya → import kapanışı; dizin → dizindeki tüm modeller ----
let models: readonly Model[];
if (isDir) {
    models = loaded.map(d => d.parseResult.value);
} else {
    const entryDoc = loaded[cdslFiles.indexOf(target.slice(dir.length + 1))]
        ?? loaded.find(d => d.uri.fsPath === target);
    if (!entryDoc) {
        console.error(`Hata: girdi dokümanı yüklenemedi: ${target}`);
        process.exit(2);
    }
    models = importClosureModels(entryDoc, documents);
}
const elements = models.flatMap(m => m.elements);
const units = collectCommands(models);

// ---- raporları ÖNCE bellekte üret (gate'ten sonra bile yarım yazım olmasın) ----
const out = new Map<string, string>(); // reportsRoot'a göre göreli yol → içerik

out.set('business/usecase.puml', generateUseCaseDiagram(models) + '\n');

const flows = elements.filter(isFlowDef).filter(f => f.name);
for (const flow of flows) {
    out.set(`business/flows/${kebab(flow.name)}.puml`, generateActivityDiagram(flow, models) + '\n');
}

const processes = elements.filter(isProcessDef).filter(p => p.name);
for (const p of processes) {
    out.set(`business/processes/${kebab(p.name)}.puml`, generateProcessDiagram(p, models) + '\n');
    out.set(`business/processes/${kebab(p.name)}.blueprint.puml`, generateProcessBlueprint(p, models) + '\n');
}

// docs/** — GeneratedFile[] kendi göreli yolunu taşır (docs/processes/*, docs/flows/*)
for (const f of [...genProcessDocFiles(models, units), ...genFlowDocFiles(models, units)]) {
    out.set(`business/${f.path}`, f.content);
}

// COVERAGE.md — coverage.json türev makine raporudur, insan-okur pakete girmez.
for (const f of genCoverageFiles(models, units)) {
    if (f.path === 'COVERAGE.md') out.set('business/COVERAGE.md', f.content);
}

// ---- diske yaz + index'i yeniden üret ----
for (const [rel, content] of out) {
    const full = join(reportsRoot, rel);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, content);
}
regenerateIndex(reportsRoot, { title });

if (!quiet) {
    console.error(
        `✓ business raporları yazıldı: ${join(reportsRoot, 'business')} — ` +
        `${out.size} dosya (1 usecase · ${flows.length} flow · ${processes.length}×2 process · ` +
        `${[...out.keys()].filter(k => k.startsWith('business/docs/')).length} doc · COVERAGE.md) · ` +
        `index.md + index.html yenilendi`);
}
process.exit(0);
