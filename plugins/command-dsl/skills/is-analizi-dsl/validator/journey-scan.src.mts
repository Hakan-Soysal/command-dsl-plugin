/**
 * Business `.cdsl` → journey tetik-envanteri (JSON) standalone tarayıcı — kaynak.
 *
 * `build.journey-scan.mjs` ile tek dosyalık `journey-scan.mjs` bundle'ına derlenir:
 * CommandDSL (business) dil servisleri + `hesaplaTetikler`/`kapsamaDegerlendir`
 * (journey-triggers) + langium içeri gömülür → çalışma anında ne CommandDSL deposu
 * ne node_modules gerekir, yalnız Node + hedef `.cdsl`.
 *
 * NEDEN AYRI ARAÇ (P1-D): skill'in Faz 3.6 (`references/journey-closure.md`) TARAMA
 * adımı, her tetik-noktasının DENEYİMLEYEN(ler)ini bilmek zorunda (mutation/failure
 * durum-şablonları "kim" ile kurulur; J22 boş-deneyimleyen düşmesi ★-kaydına dönüşür).
 * Skill'in scratch `journey __scan__ {}` yolu J2 diagnostiğini parse eder ama J2 yalnız
 * `(kind, anchorName)` taşır — DENEYİMLEYEN YOK. Bu araç `hesaplaTetikler`'i doğrudan
 * çağırır → deneyimleyen + droppedJ22 + unclassified TAM envanteri basar. Ayrıca dead
 * `journey __scan__ {}` (J14 / emit kirliliği) riskini tümüyle kaldırır.
 *
 * ÇIKTI (tek JSON, stdout):
 *   {
 *     schema: 'journey-scan/1',
 *     source: <girdi yolu>,
 *     today: 'YYYY-MM-DD',
 *     journeyActive: boolean,          // birimde ≥1 journey bloğu var mı (kapı açık mı)
 *     total: number,                   // tetik sayısı (deneyimleyensiz düşenler HARİÇ)
 *     byKind: { empty: n, blocked: n, ... },
 *     byStatus: { covered, waived, uncovered, 'step-partial' },
 *     triggers: [ { kind, anchor, experiencers[], status, by?, reason?, until?, openSteps? } ],
 *     droppedJ22: [ { kind, anchor } ],   // deneyimleyen ∅ → GÖRÜNÜR düşme (durable ★ malzemesi)
 *     unclassified: [ <op adı> ]          // J16: journey aktifken sınıfsız özel komut-fiili
 *   }
 *
 * Çağrı:
 *   node journey-scan.mjs <girdi.cdsl> [--today YYYY-MM-DD]
 *   node journey-scan.mjs --version
 *
 * Çıkış kodu: 0 = tarandı · 1 = lexer/parser hatası (AST güvenilmez — düzelt, tekrar
 * tara) · 2 = kullanım/girdi hatası.
 *
 * NOT (bilinçli tasarım): araç YALNIZ lexer/parser hatasında durur; validation
 * severity-1 (ör. journey J2 kapsanmamış-tetik, tutarlılık) hatalarında DURMAZ —
 * çünkü tarayıcının amacı tam da açıktaki tetikleri (uncovered) YÜZEYE ÇIKARMAKTIR.
 * emit-operations gate'inden (severity-1 → exit 1) ayrılışı buradan gelir.
 *
 * NOT (kapanış): kapsam import KAPANIŞI FORWARD-only'dir (`visibleModels`; girdinin
 * import ettikleri). Ters-yön (bu dosyayı import edenler) TARANMAZ — emit-operations'ın
 * per-dosya davranışının aynısı. Bir tech root'un bağlayacağı tüm business op'ları tek
 * `.cdsl`'de toplanır (SKILL.md "operations.json per-dosya" kuralı) → forward-closure yeter.
 */
import { readFileSync, statSync } from 'node:fs';
import { resolve, isAbsolute } from 'node:path';
import { URI, type LangiumDocument, type LangiumDocuments } from 'langium';
import { NodeFileSystem } from 'langium/node';
// build.journey-scan.mjs bunları canlı CommandDSL'in business kaynaklarına alias'lar.
import { createCommandDslServices } from '@cmddsl/services';
import {
    hesaplaTetikler, kapsamaDegerlendir, buildFlowStepIndex, type CoverageEntry
} from '@cmddsl/journey';
import { visibleModels } from '@cmddsl/imports';
import { isJourneyDef, type Model } from '@cmddsl/ast';

declare const __BUILD_INFO__: {
    grammarVersion: string;
    grammarHash: string;
    businessSrcHash: string;
    srcDirs: string[];
    wrapperFiles: string[];
    wrapperHash: string;
    commit: string;
    builtAt: string;
    langium: string;
};

const argv = process.argv.slice(2);
if (argv.includes('--version')) {
    console.log(JSON.stringify(__BUILD_INFO__, null, 2));
    process.exit(0);
}

// --today YYYY-MM-DD (test determinizmi); yoksa gerçek gün.
function argValue(flag: string): string | undefined {
    const i = argv.indexOf(flag);
    return i >= 0 && i + 1 < argv.length ? argv[i + 1] : undefined;
}
const todayArg = argValue('--today');
const today = todayArg ?? new Date().toISOString().slice(0, 10);
if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) {
    console.error(`Hata: --today biçimi YYYY-MM-DD olmalı: ${today}`);
    process.exit(2);
}

const positional = argv.filter(a => !a.startsWith('--') && a !== todayArg);
const [inArg] = positional;
if (!inArg) {
    console.error('Kullanım: node journey-scan.mjs <girdi.cdsl> [--today YYYY-MM-DD]');
    process.exit(2);
}
const inPath = isAbsolute(inArg) ? inArg : resolve(process.cwd(), inArg);
try {
    if (!statSync(inPath).isFile()) throw new Error('dosya değil');
} catch {
    console.error(`Hata: girdi okunamadı: ${inPath}`);
    process.exit(2);
}

const { shared } = createCommandDslServices(NodeFileSystem);
const documents = shared.workspace.LangiumDocuments as LangiumDocuments;
const doc = await documents.getOrCreateDocument(URI.file(inPath)) as LangiumDocument<Model>;
await shared.workspace.DocumentBuilder.build([doc], { validation: true });

// YALNIZ lexer/parser hatasında dur (AST güvenilmez). Validation severity-1 (J2 vb.)
// tarayıcıyı DURDURMAZ — açıktaki tetikleri yüzeye çıkarmak işin ta kendisi.
let structural = 0;
for (const e of doc.parseResult.lexerErrors) { structural++; console.error(`lexer: ${e.message}`); }
for (const e of doc.parseResult.parserErrors) { structural++; console.error(`parser: ${e.message}`); }
if (structural > 0) {
    console.error(`\n✗ ${structural} lexer/parser error — tarama yapılamadı. Önce .cdsl'i düzelt.`);
    process.exit(1);
}

const model = doc.parseResult.value;
// FORWARD import-kapanışı (journeyUnit'in ileri yarısı; ters-yön per-dosya araçta YOK).
const unit = visibleModels(model, documents);

const comp = hesaplaTetikler(unit);
const journeyActive = unit.some(m => m.elements.some(isJourneyDef));
const journeys = unit.flatMap(m => m.elements.filter(isJourneyDef));
const entries: CoverageEntry[] = kapsamaDegerlendir(
    journeys, comp.triggers, buildFlowStepIndex(unit), today
);
// Trigger → CoverageEntry eşlemesi (aynı Trigger nesnesi; kapsamaDegerlendir sırasını korur).
const statusOf = new Map(entries.map(e => [e.trigger, e]));

const byKind: Record<string, number> = {};
const byStatus: Record<string, number> = { covered: 0, waived: 0, uncovered: 0, 'step-partial': 0 };
const triggers = comp.triggers.map(t => {
    byKind[t.kind] = (byKind[t.kind] ?? 0) + 1;
    const e = statusOf.get(t);
    const status = e?.status ?? 'uncovered';
    byStatus[status] = (byStatus[status] ?? 0) + 1;
    const row: Record<string, unknown> = {
        kind: t.kind,
        anchor: t.anchorName,
        experiencers: t.experiencers,
        status,
    };
    if (e?.by) row.by = e.by;
    if (e?.waive) {
        row.reason = e.waive.reason;
        if (e.waive.until) row.until = e.waive.until;
    }
    if (e?.openSteps) row.openSteps = e.openSteps;
    if (e?.expiredWaive?.until) row.expiredUntil = e.expiredWaive.until;
    return row;
});

const out = {
    schema: 'journey-scan/1',
    source: inPath,
    today,
    journeyActive,
    total: comp.triggers.length,
    byKind,
    byStatus,
    triggers,
    droppedJ22: comp.droppedJ22.map(t => ({ kind: t.kind, anchor: t.anchor.name })),
    unclassified: comp.unclassified.map(op => op.name),
};
console.log(JSON.stringify(out, null, 2));
