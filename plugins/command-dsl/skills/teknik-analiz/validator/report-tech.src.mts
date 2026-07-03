/**
 * TechDsl İNSAN-OKUR RAPOR aracı — kaynak.
 *
 * `build.report.mjs` ile tek dosyalık `report-tech.mjs` bundle'ına derlenir.
 * Üreteçler CommandDSL'in KENDİ saf tech-report modülleridir (el yazımı görsel yok):
 *   src/tech-report/** → generateTechReport(manifest) → T1–T6c dosyaları
 *   (context.puml · er/<module>.puml · sagas/<op>.puml · events.puml ·
 *    docs/<module>.md · ACCESS.md · AUTH.md · COVERAGE.md)
 *
 * Girdi MANİFEST'tir (.tcdsl değil): 0-error emit-manifest'in ürünü `manifest.json`
 * — dil servisi GEREKMEZ, bundle küçük kalır (frontend rapor aracı emsali).
 *
 * Çağırma sözleşmesi (TECH-RAPOR-TASARIM.md §3.2, aile sözleşmesi birebir):
 *   node report-tech.mjs <manifest.json> --reports <dizin> [--title "<Proje>"] [--quiet]
 *   node report-tech.mjs --version
 *
 * Çıkış kodu: 0 = üretildi · 1 = girdi okunur ama bozuk/şema-dışı (HİÇBİR rapor
 * yazılmaz — gate) · 2 = kullanım hatası (argüman eksik/yanlış, olmayan yol dahil —
 * aile hizası, qa düzeltme dersi).
 *
 * `meta.hasErrors:true` manifest'te üreteçler md dosyalarına işaretli-koşu uyarısı
 * basar (tech-report modüllerinin sorumluluğu); bu araç özet satırında da bildirir.
 *
 * Üretim: `<reports>/tech/**` (önce TAMAMI bellekte kurulur, sonra tech/ temiz
 * yeniden yazılır — idempotent, bayat dosya kalmaz); ardından ortak index modülüyle
 * `reports/index.md` + `index.html` diski tarayarak yeniden üretilir.
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { generateTechReport, type TechManifestJson, type TechReportFile } from '@techreport/index';
import { regenerateIndex } from './report-index.src.mts';

// build.report.mjs tarafından esbuild `define` ile gömülür.
declare const __BUILD_INFO__: Record<string, string>;
const BUILD_INFO = typeof __BUILD_INFO__ !== 'undefined'
    ? __BUILD_INFO__
    : { tool: 'report-tech', srcHash: 'dev', builtAt: 'dev' };

// ── argüman ayrıştırma (bağımlılıksız; report-qa/report-frontend emsali) ─────

function usage(): never {
    console.error(`Kullanım: node report-tech.mjs <manifest.json> --reports <dizin> [--title "<Proje>"] [--quiet]
          node report-tech.mjs --version

  <manifest.json>    emit-manifest çıktısı (0-error koşunun ürünü)
  --reports <dizin>  rapor kökü; araç <dizin>/tech/** yazar + index.md/html'i yeniler
  --title "<Proje>"  index başlığı (reports/.report-meta.json'a kalıcılaşır)
  --quiet            bilgi satırları bastırılır
  --version          gömülü BUILD_INFO (src hash — bayatlık tespiti)

Çıkış kodu: 0 = üretildi · 1 = girdi bozuk/şema-dışı (HİÇBİR rapor yazılmaz — gate) · 2 = kullanım hatası.`);
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
    else if (a === '--help' || a === '-h') usage();
    else if (a.startsWith('--')) { console.error(`Bilinmeyen bayrak: ${a}`); usage(); }
    else if (input === undefined) input = a;
    else { console.error(`Fazla argüman: ${a}`); usage(); }
}
if (!input || !reportsRoot) usage();

// ── GATE: oku + parse + şema-sanity — HERHANGİ biri düşerse HİÇBİR yazım olmaz ──
// Olmayan yol = KULLANIM hatası (exit 2 — aile hizası); okunabilen ama bozuk/
// şema-dışı girdi = girdi-error'u (exit 1, gate).

/** Şema-dışı girdide açıklayıcı hata fırlatır (gate: yazımdan ÖNCE koşar). */
function validateManifest(x: unknown, src: string): TechManifestJson {
    const fail = (msg: string): never => { throw new Error(`şema-dışı girdi (${src}): ${msg}`); };
    if (typeof x !== 'object' || x === null || Array.isArray(x)) fail('kök JSON nesnesi değil');
    const m = x as Record<string, unknown>;
    if (typeof m.mode !== 'string') fail(`mode string değil: ${JSON.stringify(m.mode)} — manifest.json (emit-manifest çıktısı) mı?`);
    if (!Array.isArray(m.operations)) fail('operations dizi değil');
    if (!Array.isArray(m.entities)) fail('entities dizi değil');
    return m as unknown as TechManifestJson;
}

let raw: string;
try {
    raw = readFileSync(resolve(input), 'utf8');
} catch (e) {
    console.error(`Girdi yolu okunamadı: ${input}`);
    console.error(`  ${e instanceof Error ? e.message : String(e)}`);
    process.exit(2);
}

function fail(msg: string): never {
    console.error(`✗ ${msg}`);
    console.error('✗ girdi bozuk/şema-dışı — HİÇBİR rapor yazılmadı (gate).');
    process.exit(1);
}

let manifest: TechManifestJson;
try {
    manifest = validateManifest(JSON.parse(raw), input);
} catch (e) {
    fail(e instanceof Error ? e.message : String(e));
}

// ── üretim (tamamı BELLEKTE — saf modül; yazım en sonda) ────────────────────

let files: TechReportFile[];
try {
    files = generateTechReport(manifest);
} catch (e) {
    fail(`rapor üretilemedi: ${e instanceof Error ? e.message : String(e)}`);
}

// ── yazım: reports/tech/** temiz yeniden kurulur + kök index yenilenir ──────

const root = resolve(reportsRoot);
const techRoot = join(root, 'tech');
rmSync(techRoot, { recursive: true, force: true });   // idempotent: bayat dosya kalmaz
for (const f of files) {
    // f.path zaten 'tech/…' POSIX-göreli (tech-report barrel sözleşmesi).
    const target = join(root, f.path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, f.content);
}
regenerateIndex(root, { title });

if (!quiet) {
    const n = (pre: string): number => files.filter(f => f.path.startsWith(pre)).length;
    const hasErrors = typeof manifest.meta === 'object' && manifest.meta !== null && manifest.meta.hasErrors === true;
    console.error(
        `✓ ${techRoot}: ${files.length} dosya (${n('tech/context')} context · ${n('tech/er/')} er · ` +
        `${n('tech/sagas/')} saga · ${n('tech/events')} events · ${n('tech/docs/')} docs · 3 matris)` +
        ` · index.md + index.html yenilendi${hasErrors ? ' · ⚠ hasErrors: işaretli koşu' : ''}`);
    console.error(`  üreteç: CommandDSL src/tech-report · src ${BUILD_INFO.srcHash} (${BUILD_INFO.builtAt})`);
}
process.exit(0);
