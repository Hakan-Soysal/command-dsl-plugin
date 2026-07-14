/**
 * FrontendDsl standalone doğrulayıcı + GATE'Lİ emitter — kaynak.
 *
 * Bu dosya `build.frontend.mjs` ile tek dosyalık bir `fcdsl.mjs` bundle'ına derlenir:
 * FrontendDsl dil servisleri + emitter + langium içeri gömülür; çalışma anında ne
 * CommandDSL deposuna ne `node_modules`'a ihtiyaç duyar — yalnız Node + hedef
 * `.fcdsl`'ler (+ linked modda `contract`/`tech` hedefleri fs'ten okunur).
 *
 * Repo emsali `CommandDSL/scripts/fcdsl.ts` (workspace-pass CLI). İKİ BİLİNÇLİ FARK:
 *   1. EMIT GATE: repo CLI'ı error olsa da `--out` yazar (CI-raporlama aracı;
 *      meta.hasErrors işaretler). BURADA severity-1 error varsa `.experience.json`
 *      YAZILMAZ (exit 1, partial yok) — "0-error → otomatik emit" garantisi prose'a
 *      değil araca gömülüdür (teknik-analiz `emit-manifest` fail-loud emsali).
 *   2. `--merged` yok (üreteç-turu kararı; skill akışı per-file emit kullanır).
 *
 * Çağırma sözleşmesi (references/validator.md ile paralel):
 *   node fcdsl.mjs <dosya.fcdsl | dizin ...> [--out <dizin>] [--json] [--quiet]
 *   node fcdsl.mjs --version
 *
 * Çıkış kodu: 0 = error yok · 1 = ≥1 severity-1 error (emit yapılmadı) · 2 = kullanım/girdi hatası.
 *
 * --json:  stdout = SAF diagnostics dizisi ({severity,line,col,message,file});
 *          stderr = insan-okur meta banner. varsayılan: stdout = insan-okur rapor.
 *
 * Doğrulama birimi = verilen dosya/dizinlerin TAMAMI, TEK build koşusunda
 * (workspace-pass): union-coverage ("bir op'u HERHANGİ bir experience sunuyorsa
 * kapsanmıştır") ve import'lar ancak böyle dosyalar-arası doğru çalışır. Bu yüzden
 * modele ait TÜM `.fcdsl` dosyalarını tek çağrıda ver.
 */
import { readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join, basename } from 'node:path';
import { URI, type LangiumDocument } from 'langium';
import { NodeFileSystem } from 'langium/node';
// build.frontend.mjs bunları canlı CommandDSL'in src/frontend/'ine alias'lar.
// createFrontendDslServices, registerFrontendValidationChecks'i İÇERDE çağırır.
import { createFrontendDslServices } from '@frontenddsl/services';
import { emitExperience, type ExperienceManifestJson } from '@frontenddsl/experience';
import type { Model } from '@frontenddsl/ast';

// build.frontend.mjs tarafından esbuild `define` ile gömülür.
declare const __BUILD_INFO__: {
    grammarVersion: string;
    grammarHash: string;
    frontendSrcHash: string;
    commit: string;
    builtAt: string;
    langium: string;
};

// ── argüman ayrıştırma (bağımlılıksız; repo fcdsl.ts emsali) ────────────────

interface CliArgs { inputs: string[]; out?: string; json: boolean; quiet: boolean; version: boolean }

function parseArgs(argv: string[]): CliArgs {
    const args: CliArgs = { inputs: [], json: false, quiet: false, version: false };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--out') args.out = argv[++i];
        else if (a === '--json') args.json = true;
        else if (a === '--quiet') args.quiet = true;
        else if (a === '--version') args.version = true;
        else if (a === '--help' || a === '-h') { usage(); process.exit(0); }
        else args.inputs.push(a);
    }
    return args;
}

function usage(): void {
    console.error(`Kullanım: node fcdsl.mjs <dosya.fcdsl | dizin ...> [--out <dizin>] [--json] [--quiet]

  <dosya|dizin>   .fcdsl dosyaları; dizinler recursive taranır; TEK koşuda derlenir (workspace-pass)
  --out <dizin>   0 error İSE dosya başına <ad>.experience.json emit eder (error'da YAZMAZ — gate)
  --json          stdout'a saf diagnostics dizisi (meta banner stderr'e)
  --quiet         bilgi (info) satırları bastırılır
  --version       gömülü BUILD_INFO (grammar + src hash — bayatlık tespiti)

Çıkış kodu: 0 = temiz · 1 = ≥1 error (emit yapılmadı) · 2 = kullanım/girdi hatası.`);
}

function collectFcdsl(paths: string[]): string[] {
    const out: string[] = [];
    const visit = (p: string): void => {
        const st = statSync(p);
        if (st.isDirectory()) {
            for (const e of readdirSync(p)) {
                if (e === 'node_modules' || e.startsWith('.')) continue;
                visit(join(p, e));
            }
        } else if (p.endsWith('.fcdsl')) {
            out.push(resolve(p));
        }
    };
    for (const p of paths) visit(p);
    return [...new Set(out)].sort();
}

// ── ana akış ────────────────────────────────────────────────────────────────

const args = parseArgs(process.argv.slice(2));

if (args.version) {
    console.log(JSON.stringify(__BUILD_INFO__, null, 2));
    process.exit(0);
}

if (args.inputs.length === 0) { usage(); process.exit(2); }

let files: string[];
try {
    files = collectFcdsl(args.inputs);
} catch (e) {
    console.error(`Hata: yol bulunamadı: ${(e as { path?: string }).path ?? args.inputs.join(', ')}`);
    process.exit(2);
}
if (files.length === 0) {
    console.error('Hiç .fcdsl dosyası bulunamadı.');
    process.exit(2);
}

const { shared } = createFrontendDslServices(NodeFileSystem);
const documents = shared.workspace.LangiumDocuments;

// TEK build koşusu — union-coverage/import çözümü dosyalar-arası bu sayede doğru.
const docs: LangiumDocument<Model>[] = [];
for (const f of files) {
    docs.push(await documents.getOrCreateDocument(URI.file(f)) as LangiumDocument<Model>);
}
await shared.workspace.DocumentBuilder.build(docs, { validation: true });

type Diag = { severity: number; line: number; col: number; message: string; file: string };
const diagnostics: Diag[] = [];
let errors = 0, warns = 0, infos = 0;

for (let i = 0; i < docs.length; i++) {
    const doc = docs[i];
    const file = basename(files[i]);

    // Lexer/parser hataları AYRICA push EDİLMEZ: Langium DocumentValidator
    // (processLexingErrors/processParsingErrors) bunları zaten doc.diagnostics'e
    // GERÇEK konumla ekler. Elle 0:0 push = çift-basım + çift-sayım (drift bulgusu G).
    for (const d of doc.diagnostics ?? []) {
        const sev = d.severity ?? 1;
        if (sev === 1) errors++; else if (sev === 2) warns++; else if (sev >= 3) infos++;
        diagnostics.push({
            severity: sev,
            line: d.range.start.line + 1,     // 1-tabanlı
            col: d.range.start.character + 1, // 1-tabanlı
            message: d.message,
            file,
        });
    }
}

const ok = errors === 0;

// ── rapor ───────────────────────────────────────────────────────────────────

const shown = args.quiet ? diagnostics.filter(d => d.severity < 3) : diagnostics;

if (args.json) {
    console.error(
        `FrontendDsl doğrulayıcı · grammar ${__BUILD_INFO__.grammarVersion} (${__BUILD_INFO__.grammarHash}) · ` +
        `src ${__BUILD_INFO__.frontendSrcHash} · commit ${__BUILD_INFO__.commit} · langium ${__BUILD_INFO__.langium}`);
    console.error(`Dosyalar (${files.length}): ${files.map(f => basename(f)).join(', ')}`);
    console.error(`Özet: ${errors} error, ${warns} warning, ${infos} info`);
    process.stdout.write(JSON.stringify(diagnostics) + '\n');
} else {
    const sevName: Record<number, string> = { 1: 'ERROR', 2: 'WARN', 3: 'INFO', 4: 'HINT' };
    console.log(
        `\n=== FrontendDsl doğrulama · grammar ${__BUILD_INFO__.grammarVersion} (${__BUILD_INFO__.grammarHash}) · src ${__BUILD_INFO__.frontendSrcHash} ===`);
    console.log(`Dosyalar (${files.length}): ${files.map(f => basename(f)).join(', ')}\n`);
    for (const d of shown) {
        console.log(`${sevName[d.severity] ?? d.severity} ${d.file}:${d.line}: ${d.message}`);
    }
    if (shown.length === 0) console.log('(temiz — hiç diagnostic yok)');
    console.log(`\n=== ÖZET: ${errors} error, ${warns} warning, ${infos} info ===`);
}

// ── GATE'Lİ emit ────────────────────────────────────────────────────────────
// severity-1 error varken emit YOK (partial da yok) — bilinçli fark #1.

if (args.out) {
    if (!ok) {
        console.error(`\n✗ emit atlandı: ${errors} error var — .experience.json ancak 0 error'da üretilir (gate).`);
    } else {
        mkdirSync(args.out, { recursive: true });
        for (let i = 0; i < docs.length; i++) {
            const manifest: ExperienceManifestJson = emitExperience(docs[i], documents);
            const target = join(args.out, basename(files[i]).replace(/\.fcdsl$/, '.experience.json'));
            writeFileSync(target, JSON.stringify(manifest, null, 2) + '\n');
            console.error(`→ ${target}`);
        }
    }
}

process.exit(ok ? 0 : 1);
