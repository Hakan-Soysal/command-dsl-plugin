/**
 * report-qa — merged qa.json → İNSAN-OKUR kapsama raporu (statik HTML).
 *
 * Playground "Kapsama" sekmesinin (src/playground/qa-main.ts renderCoverage)
 * statik eşdeğeri; CSS/yapı emsal BrandedPinCDSL/reports/qa/kapsama.html'den.
 * SAF json→html — dil servisi/grammar YOK (bundle bilinçli küçük).
 *
 * Kullanım:
 *   node report-qa.mjs <merged-qa.json> --reports <dizin> [--title "<Proje>"] [--quiet]
 *
 * Exit: 0 üretildi · 1 girdi okunamaz/bozuk/şema-dışı (HİÇBİR rapor yazılmaz —
 * gate) · 2 kullanım hatası. `meta.hasErrors:true` girdide sayfa başına belirgin
 * kırmızı uyarı bandı basılır (işaretli koşu — kısmî AST'den hesaplanmış olabilir).
 *
 * Üretim: `<reports>/qa/kapsama.html`; ardından ortak index modülüyle
 * `reports/index.md` + `index.html` diski tarayarak yeniden üretilir.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { regenerateIndex } from './report-index.src.mts';

declare const __BUILD_INFO__: Record<string, string>;
const BUILD_INFO = typeof __BUILD_INFO__ !== 'undefined'
    ? __BUILD_INFO__
    : { tool: 'report-qa', srcHash: 'dev', builtAt: 'dev' };

// ---------------------------------------------------------------------------
// Merged qa.json şeması (spec §6.2) — raporun tükettiği alt-küme
// ---------------------------------------------------------------------------

type BranchKind =
    | 'success' | 'validationGuard' | 'ruleGuard' | 'anonymousNotValid'
    | 'anonymousNotProcessable' | 'error' | 'notAuthorized' | 'callFailure';

interface Branch { kind: BranchKind; id?: string; via?: string; target?: string }
interface CoverRef { file: string; test?: string; scenario?: string; step?: number }
interface BranchCoverage {
    branch: Branch;
    status: 'covered' | 'waived' | 'uncovered';
    coveredBy?: CoverRef[];
    until?: string;
    reason?: string;
}
interface OpCoverage { id: string; tech?: string; branches: BranchCoverage[] }
interface RealizeCoverage { id: string; status: 'covered' | 'uncovered'; coveredBy?: CoverRef[] }
interface QaMerged {
    meta: { dsl: string; schemaVersion: number; merged?: boolean; sources?: string[]; hasErrors?: boolean; errorCount?: number };
    coverage: { operations: OpCoverage[]; flows: RealizeCoverage[]; processes: RealizeCoverage[] };
}

const BRANCH_KINDS = new Set<string>([
    'success', 'validationGuard', 'ruleGuard', 'anonymousNotValid',
    'anonymousNotProcessable', 'error', 'notAuthorized', 'callFailure',
]);
const STATUSES = new Set<string>(['covered', 'waived', 'uncovered']);

/** Şema-dışı girdide açıklayıcı hata fırlatır (gate: yazımdan ÖNCE koşar). */
function validateMerged(x: unknown, src: string): QaMerged {
    const fail = (msg: string): never => { throw new Error(`şema-dışı girdi (${src}): ${msg}`); };
    if (typeof x !== 'object' || x === null || Array.isArray(x)) fail('kök JSON nesnesi değil');
    const m = x as Record<string, unknown>;
    const meta = m.meta as Record<string, unknown> | undefined;
    if (typeof meta !== 'object' || meta === null) fail('meta yok');
    if (meta!.dsl !== 'qa') fail(`meta.dsl "qa" değil: ${JSON.stringify(meta!.dsl)}`);
    if (typeof meta!.schemaVersion !== 'number') fail('meta.schemaVersion sayı değil');
    const cov = m.coverage as Record<string, unknown> | undefined;
    if (typeof cov !== 'object' || cov === null) fail('coverage yok');
    if (!Array.isArray(cov!.operations)) fail('coverage.operations dizi değil');
    if (!Array.isArray(cov!.flows)) fail('coverage.flows dizi değil');
    if (!Array.isArray(cov!.processes)) fail('coverage.processes dizi değil');
    for (const op of cov!.operations as unknown[]) {
        const o = op as Record<string, unknown>;
        if (typeof o?.id !== 'string') fail('operations[].id string değil');
        if (!Array.isArray(o.branches)) fail(`op ${o.id}: branches dizi değil`);
        for (const bc of o.branches as unknown[]) {
            const b = bc as Record<string, unknown>;
            const br = b?.branch as Record<string, unknown> | undefined;
            if (typeof br !== 'object' || br === null || !BRANCH_KINDS.has(String(br.kind)))
                fail(`op ${o.id}: bilinmeyen dal kind: ${JSON.stringify(br?.kind)}`);
            if (!STATUSES.has(String(b.status)))
                fail(`op ${o.id}: bilinmeyen status: ${JSON.stringify(b.status)}`);
            if (b.status === 'covered' && !Array.isArray(b.coveredBy))
                fail(`op ${o.id}: covered dalda coveredBy dizi değil`);
        }
    }
    for (const grp of ['flows', 'processes'] as const) {
        for (const r of cov![grp] as unknown[]) {
            const rr = r as Record<string, unknown>;
            if (typeof rr?.id !== 'string') fail(`coverage.${grp}[].id string değil`);
            if (rr.status !== 'covered' && rr.status !== 'uncovered')
                fail(`${grp} ${rr.id}: bilinmeyen status: ${JSON.stringify(rr.status)}`);
        }
    }
    return m as unknown as QaMerged;
}

// ---------------------------------------------------------------------------
// Etiketler — qa-main.ts branchLabel/coverRefLabel BİREBİR portu
// ---------------------------------------------------------------------------

function branchLabel(b: Branch): string {
    switch (b.kind) {
        case 'success': return 'Success';
        case 'validationGuard': return `guard "${b.id}" (validation)`;
        case 'ruleGuard': return `guard "${b.id}" (rule)`;
        case 'anonymousNotValid': return 'NotValid (anonim)';
        case 'anonymousNotProcessable': return 'NotProcessable (anonim)';
        case 'error': return `error ${b.id}`;
        case 'notAuthorized': return `NotAuthorized${b.via ? ` · ${b.via}` : ''}`;
        case 'callFailure': return `callFailure ${b.target}`;
    }
}

function coverRefLabel(ref: CoverRef): string {
    if (ref.test !== undefined) return `test "${ref.test}"`;
    if (ref.scenario !== undefined) return `senaryo "${ref.scenario}"${ref.step !== undefined ? ` · adım ${ref.step + 1}` : ''}`;
    return ref.file;
}

function esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ---------------------------------------------------------------------------
// HTML üretimi — emsal kapsama.html'in CSS/yapısı
// ---------------------------------------------------------------------------

function renderHtml(merged: QaMerged, title: string | undefined, sourceLabel: string): string {
    const docTitle = title ? `${title} — QA Kapsama` : 'QA Kapsama';
    const h1 = title ? `${title} — QA Kapsama Matrisi` : 'QA Kapsama Matrisi';
    const h: string[] = [];
    h.push('<!doctype html><html lang="tr"><head><meta charset="utf-8">');
    h.push(`<title>${esc(docTitle)}</title><style>`);
    h.push('body{font:13px/1.5 -apple-system,system-ui,sans-serif;background:#1b1e23;color:#d6d9de;max-width:1100px;margin:24px auto;padding:0 16px}');
    h.push('h1{font-size:18px} h2{font-size:15px;margin-top:28px} code{font-family:ui-monospace,Menlo,monospace}');
    h.push('.cov-op{border:1px solid #33363c;border-radius:4px;padding:8px 10px;margin:10px 0}');
    h.push('.cov-op h3{margin:0 0 6px;font-size:12.5px;display:flex;gap:10px;align-items:baseline}');
    h.push('.cov-badge{font-size:11px;font-weight:400}.cov-badge.ok{color:#3fbf8f}.cov-badge.warn{color:#f26d6d}');
    h.push('.cov-table{border-collapse:collapse;width:100%;font-size:12px}');
    h.push('.cov-table td{padding:3px 8px 3px 0;vertical-align:top;border-top:1px solid #33363c}');
    h.push('.cov-table tr:first-child td{border-top:none}');
    h.push('.cov-branch{font-family:ui-monospace,Menlo,monospace;white-space:nowrap}.cov-info{color:#9aa0a8}');
    h.push('.chip{display:inline-block;padding:1px 8px;border-radius:9px;font-size:11px}');
    h.push('.chip-covered{background:#16825d33;color:#3fbf8f}.chip-waived{background:#cca70033;color:#d9b13b}.chip-uncovered{background:#f1434333;color:#f26d6d}');
    h.push('table.presence{border-collapse:collapse;font-size:12px}table.presence td{padding:3px 12px 3px 0;border-top:1px solid #33363c}');
    h.push('.err-band{background:#f14343;color:#fff;font-weight:600;padding:10px 14px;border-radius:4px;margin:14px 0}');
    h.push('.meta{color:#9aa0a8;font-size:11.5px;margin-top:24px;border-top:1px solid #33363c;padding-top:8px}');
    h.push('</style></head><body>');
    h.push(`<h1>${esc(h1)}</h1>`);
    if (merged.meta.hasErrors) {
        h.push(`<p class="err-band">⚠ İŞARETLİ KOŞU — kaynak dokümanlarda ${merged.meta.errorCount ?? '?'} hata; ` +
            'bu kapsama matrisi kısmî AST\'den hesaplanmış olabilir. Sonuçlara güvenmeden önce hataları giderin.</p>');
    }
    h.push(`<p>Kaynak: <code>${esc(sourceLabel)}</code> (birleşik manifest). Playground "Kapsama" sekmesinin statik eşdeğeri.</p>`);

    let tCov = 0, tWaived = 0, tUncov = 0;
    for (const op of merged.coverage.operations) {
        const covered = op.branches.filter(b => b.status === 'covered').length;
        const waived = op.branches.filter(b => b.status === 'waived').length;
        const uncovered = op.branches.length - covered - waived;
        tCov += covered; tWaived += waived; tUncov += uncovered;
        const badge = `${covered}/${op.branches.length} covered` +
            (waived ? ` · ${waived} waived` : '') + (uncovered ? ` · ${uncovered} uncovered` : '');
        h.push('<section class="cov-op">');
        h.push(`<h3><code>${esc(op.id)}</code><span class="cov-badge ${uncovered > 0 ? 'warn' : 'ok'}">${esc(badge)}</span></h3>`);
        h.push('<table class="cov-table">');
        for (const b of op.branches) {
            let info: string;
            if (b.status === 'covered') info = (b.coveredBy ?? []).map(coverRefLabel).join(' · ');
            else if (b.status === 'waived') info = `waive: ${b.reason ?? ''}${b.until ? ` (until ${b.until})` : ''}`;
            else info = 'kapsanmadı — test/step yazın ya da gerekçeli waive edin';
            h.push(`<tr><td><span class="chip chip-${b.status}">${b.status}</span></td>` +
                `<td class="cov-branch">${esc(branchLabel(b.branch))}</td>` +
                `<td class="cov-info">${esc(info)}</td></tr>`);
        }
        h.push('</table></section>');
    }

    // Flow / process presence (§4.4) — emsaldeki tek birleşik tablo (kind sütunlu)
    const realizes = [
        ...merged.coverage.flows.map(f => ({ ...f, kind: 'flow' as const })),
        ...merged.coverage.processes.map(p => ({ ...p, kind: 'process' as const })),
    ];
    if (realizes.length > 0) {
        h.push('<h2>Akış / Süreç presence</h2><table class="presence">');
        for (const r of realizes) {
            const info = r.status === 'covered'
                ? (r.coveredBy ?? []).map(coverRefLabel).join(' · ')
                : `'realizes ${r.kind}' senaryosu yok`;
            h.push(`<tr><td>${r.kind}</td><td><code>${esc(r.id)}</code></td>` +
                `<td><span class="chip chip-${r.status}">${r.status}</span></td>` +
                `<td class="cov-info">${esc(info)}</td></tr>`);
        }
        h.push('</table>');
    }

    h.push(`<p><b>Toplam:</b> ${tCov} covered · ${tWaived} waived · ${tUncov} uncovered</p>`);
    const srcNote = merged.meta.sources?.length ? ` · sources: ${merged.meta.sources.length} dosya` : '';
    h.push(`<p class="meta">Kaynak dosya: <code>${esc(sourceLabel)}</code> · schemaVersion ${merged.meta.schemaVersion}${srcNote}` +
        ` — report-qa ${BUILD_INFO.srcHash} (${BUILD_INFO.builtAt})</p>`);
    h.push('</body></html>');
    return h.join('\n');
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function usage(): never {
    console.error('Kullanım: node report-qa.mjs <merged-qa.json> --reports <dizin> [--title "<Proje>"] [--quiet]');
    console.error('          node report-qa.mjs --version');
    process.exit(2);
}

const argv = process.argv.slice(2);
if (argv.includes('--version')) {
    console.log(JSON.stringify(BUILD_INFO, null, 2));
    process.exit(0);
}

let input: string | undefined;
let reportsRoot: string | undefined;
let title: string | undefined;
let quiet = false;
for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--reports') { reportsRoot = argv[++i]; if (!reportsRoot) usage(); }
    else if (a === '--title') { title = argv[++i]; if (!title) usage(); }
    else if (a === '--quiet') quiet = true;
    else if (a.startsWith('--')) { console.error(`Bilinmeyen bayrak: ${a}`); usage(); }
    else if (input === undefined) input = a;
    else { console.error(`Fazla argüman: ${a}`); usage(); }
}
if (!input || !reportsRoot) usage();

// ---- gate: oku + parse + şema — HERHANGİ biri düşerse HİÇBİR yazım olmaz ----
// Olmayan yol = KULLANIM hatası (exit 2 — aile araçları qcdsl/fcdsl/report-business
// ile hizalı); okunabilen ama bozuk/şema-dışı girdi = girdi-error'u (exit 1, gate).
let raw: string;
try {
    raw = readFileSync(resolve(input), 'utf8');
} catch (e) {
    console.error(`Girdi yolu okunamadı: ${input}`);
    console.error(`  ${e instanceof Error ? e.message : String(e)}`);
    process.exit(2);
}
let merged: QaMerged;
try {
    merged = validateMerged(JSON.parse(raw), input);
} catch (e) {
    console.error(`Hata: girdi bozuk/şema-dışı — rapor ÜRETİLMEDİ.`);
    console.error(`  ${e instanceof Error ? e.message : String(e)}`);
    process.exit(1);
}

const root = resolve(reportsRoot);
const qaDir = join(root, 'qa');
mkdirSync(qaDir, { recursive: true });
const outFile = join(qaDir, 'kapsama.html');
writeFileSync(outFile, renderHtml(merged, title, input));
regenerateIndex(root, { title });

if (!quiet) {
    const ops = merged.coverage.operations.length;
    console.error(`✓ ${outFile} yazıldı · ${ops} op · index yenilendi${merged.meta.hasErrors ? ' · ⚠ hasErrors: işaretli koşu' : ''}`);
}
