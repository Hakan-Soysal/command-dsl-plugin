/**
 * FrontendDsl İNSAN-OKUR RAPOR aracı — kaynak.
 *
 * `build.report.mjs` ile tek dosyalık `report-frontend.mjs` bundle'ına derlenir.
 * Üreteçler CommandDSL playground'unun KENDİ saf modülleridir (el yazımı görsel yok):
 *   - src/playground/frontend-salt.ts  → ekran başına PlantUML Salt wireframe
 *   - src/playground/frontend-flow.ts  → experience başına storyboard + İş-Akışı görünümü
 *
 * Girdi MANİFEST'tir (.fcdsl değil): 0-error emit'in ürünü `*.experience.json`
 * [+ `--flows <operations.json>`] — dil servisi GEREKMEZ, bundle küçük kalır.
 *
 * Çağırma sözleşmesi (INSAN-OKUR-RAPOR-EKI-TASARIM.md):
 *   node report-frontend.mjs <experience.json…|dizin> [--flows <operations.json>]
 *        --reports <dizin> [--title "<Proje>"] [--quiet]
 *   node report-frontend.mjs --version
 *
 * Çıkış kodu: 0 = üretildi · 1 = girdi okunamaz/bozuk JSON (HİÇBİR rapor yazılmaz — gate)
 *             · 2 = kullanım hatası (argüman eksik/yanlış, yol bulunamadı).
 *
 * Üretim (reports/frontend/ — önce TAMAMI bellekte kurulur, gate geçerse yazılır):
 *   wireframes/<slug>.puml   ekran başına Salt frame (slug = frame başlığından)
 *   flows/<slug>.puml        experience başına storyboard
 *   bizflows/<slug>.puml     business flow × ekranlar (YALNIZ --flows verilince;
 *                            verilmezse stdout'a not basılır, bölüm atlanır)
 * Sonda `regenerateIndex(reportsRoot, { title })` — index.md + index.html diski
 * tarayarak yeniden üretilir (üç DSL aynı reports/ kökünde birleşebilir).
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, rmSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { saltFrames } from '@frontenddsl/salt';
import { flowDiagrams, businessFlowDiagram } from '@frontenddsl/flow';
import type { ExperienceManifestJson } from '@frontenddsl/experience';
import { regenerateIndex } from './report-index.src.mts';

// build.report.mjs tarafından esbuild `define` ile gömülür.
declare const __BUILD_INFO__: {
    grammarVersion: string;
    grammarHash: string;
    srcHash: string;
    commit: string;
    builtAt: string;
};

// ── argüman ayrıştırma (bağımlılıksız; fcdsl.src.mts emsali) ────────────────

interface CliArgs { inputs: string[]; flows?: string; reports?: string; title?: string; quiet: boolean; version: boolean }

function usage(): void {
    console.error(`Kullanım: node report-frontend.mjs <experience.json…|dizin> [--flows <operations.json>] --reports <dizin> [--title "<Proje>"] [--quiet]

  <dosya|dizin>      *.experience.json manifest'leri; dizinler recursive taranır
  --flows <dosya>    business operations.json → İş-Akışı görünümü (bizflows/) üretilir
  --reports <dizin>  rapor kökü; araç <dizin>/frontend/** yazar + index.md/html'i yeniler
  --title "<Proje>"  index başlığı (reports/.report-meta.json'a kalıcılaşır)
  --quiet            bilgi satırları bastırılır
  --version          gömülü BUILD_INFO (grammar + src hash — bayatlık tespiti)

Çıkış kodu: 0 = üretildi · 1 = girdi bozuk (HİÇBİR rapor yazılmaz — gate) · 2 = kullanım hatası.`);
}

function parseArgs(argv: string[]): CliArgs {
    const args: CliArgs = { inputs: [], quiet: false, version: false };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--flows' || a === '--reports' || a === '--title') {
            const v = argv[++i];
            if (v === undefined) { console.error(`Hata: ${a} bir değer ister.`); usage(); process.exit(2); }
            if (a === '--flows') args.flows = v;
            else if (a === '--reports') args.reports = v;
            else args.title = v;
        }
        else if (a === '--quiet') args.quiet = true;
        else if (a === '--version') args.version = true;
        else if (a === '--help' || a === '-h') { usage(); process.exit(0); }
        else if (a.startsWith('--')) { console.error(`Hata: bilinmeyen seçenek: ${a}`); usage(); process.exit(2); }
        else args.inputs.push(a);
    }
    return args;
}

const args = parseArgs(process.argv.slice(2));

if (args.version) {
    console.log(JSON.stringify(__BUILD_INFO__, null, 2));
    process.exit(0);
}
if (args.inputs.length === 0 || !args.reports) { usage(); process.exit(2); }

// ── girdi toplama (yol bulunamadı → 2; fcdsl emsali) ────────────────────────

function collectManifestPaths(paths: string[]): string[] {
    const out: string[] = [];
    const visit = (p: string): void => {
        const st = statSync(p);
        if (st.isDirectory()) {
            for (const e of readdirSync(p).sort()) {
                if (e === 'node_modules' || e.startsWith('.')) continue;
                const full = join(p, e);
                if (statSync(full).isDirectory()) visit(full);
                else if (e.endsWith('.experience.json')) out.push(resolve(full));
            }
        } else {
            out.push(resolve(p));
        }
    };
    for (const p of paths) visit(p);
    return [...new Set(out)].sort();
}

let manifestPaths: string[];
try {
    manifestPaths = collectManifestPaths(args.inputs);
    if (args.flows) statSync(args.flows);   // --flows yolu da var olmalı (yoksa → 2)
} catch (e) {
    console.error(`Hata: yol bulunamadı: ${(e as { path?: string }).path ?? args.inputs.join(', ')}`);
    process.exit(2);
}
if (manifestPaths.length === 0) {
    console.error('Hiç .experience.json dosyası bulunamadı.');
    process.exit(2);
}

// ── GATE: tüm girdiler önce okunur+ayrıştırılır; hata → exit 1, HİÇ yazım yok ──

function fail(msg: string): never {
    console.error(`✗ ${msg}`);
    console.error('✗ girdi bozuk — HİÇBİR rapor yazılmadı (gate).');
    process.exit(1);
}

const manifests: { path: string; m: ExperienceManifestJson }[] = [];
for (const p of manifestPaths) {
    let raw: string;
    try { raw = readFileSync(p, 'utf8'); }
    catch (e) { fail(`okunamadı: ${p} — ${(e as Error).message}`); }
    let json: unknown;
    try { json = JSON.parse(raw); }
    catch (e) { fail(`bozuk JSON: ${p} — ${(e as Error).message}`); }
    const m = json as ExperienceManifestJson;
    if (typeof m !== 'object' || m === null || !Array.isArray(m.experiences)) {
        fail(`experience manifest'i değil (experiences[] yok): ${p}`);
    }
    manifests.push({ path: p, m });
}

/** operations[].flows üyeliğinden flowId → op-id'leri (src/frontend/contracts.ts loadBusiness eşleniği). */
let bizFlows: Map<string, string[]> | undefined;
if (args.flows) {
    let raw: string;
    try { raw = readFileSync(args.flows, 'utf8'); }
    catch (e) { fail(`okunamadı: ${args.flows} — ${(e as Error).message}`); }
    let json: unknown;
    try { json = JSON.parse(raw); }
    catch (e) { fail(`bozuk JSON: ${args.flows} — ${(e as Error).message}`); }
    if (typeof json !== 'object' || json === null || Array.isArray(json)) {
        fail(`operations.json değil (nesne bekleniyordu): ${args.flows}`);
    }
    const ops = (json as { operations?: { id: string; flows?: string[] }[] }).operations ?? [];
    bizFlows = new Map();
    for (const op of ops) {
        for (const f of op.flows ?? []) {
            const list = bizFlows.get(f) ?? [];
            list.push(op.id);
            bizFlows.set(f, list);
        }
    }
}

// ── üretim (tamamı BELLEKTE — yazım en sonda) ───────────────────────────────

/** Emsal slug deseni: camelCase sınırına '-', ASCII-dışı/ayraç koşuları '-',
 *  SONRA lowercase (Türkçe 'İ'.toLowerCase() sürprizinden kaçınmak için sıra önemli). */
function slugify(s: string): string {
    return s
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .replace(/[^A-Za-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .toLowerCase();
}

/** Aynı alt-dizinde slug çakışırsa -2, -3… soneki. */
function uniq(slug: string, used: Set<string>): string {
    let out = slug || 'adsiz';
    for (let n = 2; used.has(out); n++) out = `${slug}-${n}`;
    used.add(out);
    return out;
}

const files = new Map<string, string>();   // reports/frontend'e göreli yol → içerik
const usedWf = new Set<string>();
const usedFlow = new Set<string>();
const usedBiz = new Set<string>();
let wfCount = 0, flowCount = 0, bizCount = 0;

try {
    for (const { m } of manifests) {
        for (const f of saltFrames(m)) {
            files.set(`wireframes/${uniq(slugify(f.title), usedWf)}.puml`, f.salt + '\n');
            wfCount++;
        }
        for (const d of flowDiagrams(m)) {
            files.set(`flows/${uniq(slugify(d.title), usedFlow)}.puml`, d.uml + '\n');
            flowCount++;
        }
        if (bizFlows) {
            for (const flowId of [...bizFlows.keys()].sort()) {
                const d = businessFlowDiagram(m, flowId, bizFlows.get(flowId) ?? []);
                files.set(`bizflows/${uniq(slugify(flowId), usedBiz)}.puml`, d.uml + '\n');
                bizCount++;
            }
        }
    }
} catch (e) {
    fail(`rapor üretilemedi: ${e instanceof Error ? e.message : String(e)}`);
}

if (!bizFlows) {
    console.log('Not: --flows <operations.json> verilmedi — İş-Akışı görünümü (bizflows/) atlandı.');
} else if (bizFlows.size === 0) {
    console.log('Not: operations.json hiç flow üyeliği taşımıyor (operations[].flows boş) — bizflows/ atlandı.');
}

// ── yazım: reports/frontend/** temiz yeniden kurulur + kök index yenilenir ──

const reportsRoot = resolve(args.reports);
const frontendRoot = join(reportsRoot, 'frontend');
rmSync(frontendRoot, { recursive: true, force: true });   // idempotent: bayat dosya kalmaz
for (const [rel, content] of files) {
    const target = join(frontendRoot, rel);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, content);
}
regenerateIndex(reportsRoot, { title: args.title });

if (!args.quiet) {
    console.error(
        `✓ ${frontendRoot}: ${wfCount} wireframe · ${flowCount} flow` +
        (bizFlows ? ` · ${bizCount} bizflow` : '') +
        ` · index.md + index.html yenilendi`);
    console.error(`  üreteç: playground frontend-salt/frontend-flow · grammar ${__BUILD_INFO__.grammarHash} · src ${__BUILD_INFO__.srcHash}`);
}
process.exit(0);
