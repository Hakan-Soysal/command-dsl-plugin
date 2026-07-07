/**
 * QA DSL standalone doğrulayıcı + GATE'Lİ emitter — kaynak.
 *
 * Bu dosya `build.qa.mjs` ile tek dosyalık bir `qcdsl.mjs` bundle'ına derlenir:
 * QA birleşik dil servisleri (qa-dsl + tech-dsl aynı shared-container — spec §11)
 * + manifest emitter + langium içeri gömülür; çalışma anında ne CommandDSL deposuna
 * ne `node_modules`'a ihtiyaç duyar — yalnız Node + hedef `.qa`'lar (+ `uses tech`
 * kapanışındaki `.tcdsl`'ler ve `uses flows` JSON'u fs'ten okunur).
 *
 * Repo emsali `CommandDSL/scripts/qcdsl.ts` (workspace-pass CLI). BİLİNÇLİ FARKLAR:
 *   1. EMIT GATE: repo CLI'ı error olsa da `--out`/`--merged` YAZAR (CI-raporlama
 *      aracı; merged `meta.hasErrors` işaretler). BURADA severity-1 error varsa
 *      (strict-yükseltilmişler DAHİL) HİÇBİR JSON yazılmaz (exit 1, partial yok) —
 *      "0-error → otomatik emit" garantisi prose'a değil araca gömülüdür
 *      (fcdsl / teknik-analiz fail-loud emsali).
 *   2. `--strict` VARSAYILAN AÇIKTIR (kullanıcı kararı, tasarım §8/3): kapsanmamış-dal
 *      warning'i (diagnostic code `qa.uncovered-branches` — mesaj-eşleme DEĞİL)
 *      error'a yükselir. `--strict` bayrağı kabul edilir (no-op, okunabilirlik);
 *      `--no-strict` ile kapatılır (repo davranışına dönüş).
 *   3. `--json`: stdout = SAF diagnostics dizisi
 *      ({severity,line,col,message,file,code?,strictElevated?}); strict-yükseltilmiş
 *      tanılar severity:1 + `strictElevated:true` işaretiyle gelir. stderr =
 *      insan-okur meta banner (fcdsl paritesi).
 *   4. `--merged` DESTEKLENİR (frontend'te yoktu): QA'da coverage YALNIZ merged'de
 *      yaşar (karar #18) — "her dal kapalı" iddiasının makine-okur kanıtı buradadır.
 *   5. `--version`: gömülü BUILD_INFO (grammarHash + qaSrcHash — bayatlık tespiti).
 *
 * Çağırma sözleşmesi (references/validator.md ile paralel):
 *   node qcdsl.mjs <dosya.qa | dizin ...> [--out <dizin>] [--merged <dosya>]
 *                  [--strict|--no-strict] [--json] [--quiet]
 *   node qcdsl.mjs --version
 *
 * Çıkış kodu: 0 = error yok · 1 = ≥1 error (strict-yükseltilmiş dahil; emit yapılmadı)
 *             · 2 = kullanım/girdi hatası.
 *
 * Doğrulama birimi = verilen dosya/dizinlerin TAMAMI, TEK build koşusunda
 * (workspace-pass): union-coverage ("bir dal HERHANGİ bir dosyadaki test/step/waive
 * ile kapsanmışsa kapsanmıştır") ancak böyle dosyalar-arası doğru çalışır. Bu yüzden
 * modele ait TÜM `.qa` dosyalarını tek çağrıda ver (fcdsl emsali).
 */
import { readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join, basename, dirname } from 'node:path';
import { URI, type LangiumDocument } from 'langium';
import { NodeFileSystem } from 'langium/node';
// build.qa.mjs bunları canlı CommandDSL'in src/qa'sına alias'lar.
// createQaServices, registerQaValidationChecks + registerTechValidationChecks'i İÇERDE çağırır.
import { createQaServices } from '@qadsl/services';
import { UNCOVERED_BRANCHES_CODE } from '@qadsl/validation';
import { isQaModel, type QaModel } from '@qadsl/ast';
import { emitQaFile, emitMergedQa } from '@qadsl/manifest';
import { generateWaiverReport, renderWaiverLines } from '@qadsl/waiver-report';

// build.qa.mjs tarafından esbuild `define` ile gömülür.
declare const __BUILD_INFO__: {
    grammarVersion: string;
    grammarHash: string;   // sha256(qa-dsl.langium + tech-dsl.langium + shared.langium)[:12]
    qaSrcHash: string;     // shaTree(src/qa/**.ts + src/shared/**.ts)
    commit: string;
    builtAt: string;
    langium: string;
};

// ── argüman ayrıştırma (bağımlılıksız; repo qcdsl.ts emsali) ────────────────

interface CliArgs {
    inputs: string[]; out?: string; merged?: string;
    strict: boolean; json: boolean; quiet: boolean; version: boolean;
}

function parseArgs(argv: string[]): CliArgs {
    // strict VARSAYILAN AÇIK — bilinçli fark #2.
    const args: CliArgs = { inputs: [], strict: true, json: false, quiet: false, version: false };
    // flag-değeri başka bir flag olamaz (repo denetim bulgusu: `--out --strict`
    // literal '--strict' dizini yaratıp strict'i sessizce kapatıyordu).
    const value = (flag: string, v: string | undefined): string => {
        if (v === undefined || v.startsWith('--')) {
            console.error(`${flag} bir değer bekler (verilen: ${v ?? 'yok'}).`);
            process.exit(2);
        }
        return v;
    };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i];
        if (a === '--out') args.out = value(a, argv[++i]);
        else if (a === '--merged') args.merged = value(a, argv[++i]);
        else if (a === '--strict') args.strict = true;       // no-op (zaten varsayılan) — okunabilirlik
        else if (a === '--no-strict') args.strict = false;   // repo davranışına dönüş (belgeli kaçış)
        else if (a === '--json') args.json = true;
        else if (a === '--quiet') args.quiet = true;
        else if (a === '--version') args.version = true;
        else if (a === '--help' || a === '-h') { usage(); process.exit(0); }
        else if (a.startsWith('--')) { console.error(`Bilinmeyen seçenek: ${a}`); process.exit(2); }
        else args.inputs.push(a);
    }
    return args;
}

function usage(): void {
    console.error(`Kullanım: node qcdsl.mjs <dosya.qa | dizin ...> [--out <dizin>] [--merged <dosya>] [--strict|--no-strict] [--json] [--quiet]

  <dosya|dizin>    .qa dosyaları; dizinler recursive taranır; TEK koşuda derlenir (workspace-pass)
  --out <dizin>    0 error İSE dosya başına <ad>.qa.json emit eder (coverage içermez — karar #18)
  --merged <dosya> 0 error İSE birleşik workspace-görünümü, coverage dahil (coverage YALNIZ burada)
  --strict         VARSAYILAN AÇIK (no-op): kapsanmamış-dal warning'i error'a yükselir
  --no-strict      strict'i kapatır (repo CLI varsayılanı; kapsanmamış dal warning kalır)
  --json           stdout'a saf diagnostics dizisi (meta banner stderr'e)
  --quiet          bilgi (info) satırları bastırılır
  --version        gömülü BUILD_INFO (grammar + src hash — bayatlık tespiti)

Emit gate: ≥1 error varken (strict-yükseltilmiş DAHİL) --out ve --merged HİÇBİR dosya yazmaz.
Çıkış kodu: 0 = temiz · 1 = ≥1 error (emit yapılmadı) · 2 = kullanım/girdi hatası.`);
}

function collectQa(paths: string[]): string[] {
    const out: string[] = [];
    const visit = (p: string): void => {
        let st;
        try {
            st = statSync(p);
        } catch {
            // olmayan path = argüman hatası (exit 2) — stack-trace değil (repo denetim bulgusu)
            console.error(`Girdi bulunamadı: '${p}'.`);
            process.exit(2);
        }
        if (st.isDirectory()) {
            for (const e of readdirSync(p)) {
                if (e === 'node_modules' || e.startsWith('.')) continue;
                visit(join(p, e));
            }
        } else if (p.endsWith('.qa')) {
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

const files = collectQa(args.inputs);
if (files.length === 0) {
    console.error('Hiç .qa dosyası bulunamadı.');
    process.exit(2);
}

// basename-çakışması sessiz ezer (son yazan kazanır) → erken açık hata (repo denetim bulgusu;
// burada emit'ten ÖNCE denetlenir: kullanım hatası doğrulamayı beklemesin).
if (args.out) {
    const names = files.map(f => basename(f));
    const dup = names.filter((n, i) => names.indexOf(n) !== i);
    if (dup.length > 0) {
        console.error(`--out çakışması: aynı-adlı .qa dosyaları farklı dizinlerde (${[...new Set(dup)].join(', ')}) — çıktılar birbirini ezerdi. Dosyaları yeniden adlandırın ya da ayrı koşular kullanın.`);
        process.exit(2);
    }
}

const { shared } = createQaServices(NodeFileSystem);
const documents = shared.workspace.LangiumDocuments;
const builder = shared.workspace.DocumentBuilder;

// TEK build koşusu — union-coverage ve uses-tech kapanışı dosyalar-arası bu sayede doğru.
const docs: LangiumDocument<QaModel>[] = [];
for (const f of files) {
    docs.push(await documents.getOrCreateDocument(URI.file(f)) as LangiumDocument<QaModel>);
}
await builder.build(docs, { validation: true });

// --json modunda TÜM insan-okur satırlar stderr'e gider (stdout saf kalır — fcdsl paritesi).
const log = (s: string): void => { (args.json ? console.error : console.log)(s); };

const SEV = ['', 'HATA', 'UYARI', 'BİLGİ', 'İPUCU'] as const;
type Diag = {
    severity: number; line: number; col: number; message: string; file: string;
    code?: number | string; strictElevated?: boolean;
};
const jsonDiags: Diag[] = [];
let errors = 0, warnings = 0, infos = 0;

/** strict: S6 kapsanmamış-dal warning'i error muamelesi görür (code ile tanınır — mesaj-eşleme değil). */
function effectiveSeverity(d: { severity?: number; code?: number | string }): number {
    const sev = d.severity ?? 1;
    if (args.strict && sev === 2 && d.code === UNCOVERED_BRANCHES_CODE) return 1;
    return sev;
}

function report(doc: LangiumDocument, tag: string): void {
    const rel = doc.uri.fsPath;
    const diags = (doc.diagnostics ?? []).slice().sort((a, b) => a.range.start.line - b.range.start.line);
    const e = diags.filter(d => effectiveSeverity(d) === 1).length;
    const w = diags.filter(d => effectiveSeverity(d) === 2).length;
    const i = diags.filter(d => effectiveSeverity(d) >= 3).length;
    errors += e; warnings += w; infos += i;
    log(`◦ ${basename(rel)}${tag} — ${e} hata, ${w} uyarı, ${i} bilgi`);
    for (const d of diags) {
        const sev = effectiveSeverity(d);
        const elevated = sev === 1 && (d.severity ?? 1) === 2;
        jsonDiags.push({
            severity: sev,
            line: d.range.start.line + 1,     // 1-tabanlı
            col: d.range.start.character + 1, // 1-tabanlı
            message: d.message,
            file: basename(rel),
            ...(d.code !== undefined ? { code: d.code as number | string } : {}),
            ...(elevated ? { strictElevated: true } : {}),
        });
        if (args.quiet && sev >= 3) continue;
        const badge = elevated ? 'HATA(strict)' : SEV[sev];
        log(`  [${badge} ${basename(rel)}:${d.range.start.line + 1}:${d.range.start.character + 1}] ${d.message}`);
    }
}

for (const doc of docs) report(doc, '');
// Kapanış dosyaları (uses tech → .tcdsl → import): tanısı olanlar raporlanır — bozuk
// tech kaynağı coverage'ı güvenilmez kılar, sessiz geçmez (gate bunları da sayar).
const inputSet = new Set(docs.map(d => d.uri.toString()));
for (const doc of documents.all) {
    if (inputSet.has(doc.uri.toString())) continue;
    if ((doc.diagnostics ?? []).length === 0) continue;
    report(doc, ' (kapanış)');
}

const ok = errors === 0;

// ── GATE'Lİ emisyon ─────────────────────────────────────────────────────────
// severity-1 error varken (strict-yükseltilmiş DAHİL) emit YOK (partial da yok) — bilinçli fark #1.

if (!ok && (args.out || args.merged)) {
    console.error(`\n✗ emit atlandı: ${errors} error var — .qa.json/merged ancak 0 error'da üretilir (gate).`);
}

if (ok && args.out) {
    mkdirSync(args.out, { recursive: true });
    for (const doc of docs) {
        const model = doc.parseResult.value;
        if (!isQaModel(model)) continue;
        const target = join(args.out, basename(doc.uri.fsPath).replace(/\.qa$/, '.qa.json'));
        writeFileSync(target, JSON.stringify(emitQaFile(model), null, 2) + '\n');
        log(`→ ${target}`);
    }
}

if (ok && args.merged) {
    const models = docs.map(d => d.parseResult.value).filter(isQaModel);
    const merged = emitMergedQa(models, documents);
    mkdirSync(dirname(resolve(args.merged)), { recursive: true });
    writeFileSync(args.merged, JSON.stringify(merged, null, 2) + '\n');
    const branches = merged.coverage.operations.flatMap(o => o.branches);
    const covered = branches.filter(b => b.status === 'covered').length;
    const waived = branches.filter(b => b.status === 'waived').length;
    log(`→ ${args.merged} (birleşik: ${merged.coverage.operations.length} op · dal ${covered} covered / ${waived} waived / ${branches.length - covered - waived} uncovered)`);
    // guarantee-coverage sinerjisi: tech garantilerinin testable yükümlülük (guard/throws) durumu.
    const gcov = merged.coverage.guarantees;
    if (gcov.length > 0) {
        const by = (s: string): number => gcov.filter(g => g.status === s).length;
        log(`  garantiler: ${gcov.length} · ${by('covered')} covered / ${by('partial')} partial / ${by('uncovered')} uncovered / ${by('structural')} structural`);
        for (const g of gcov.filter(g => g.status === 'partial' || g.status === 'uncovered')) {
            const gaps = g.obligations
                .filter(o => o.testable && o.status === 'uncovered')
                .map(o => o.guard ? `${o.op} guard "${o.guard}"` : o.error ? `${o.op} throws ${o.error}` : o.op);
            log(`    ⚠ ${g.id} [${g.status}] — kapsanmayan: ${gaps.join(', ')}`);
        }
    }
    // F3.6 authored SC→senaryo: `satisfies` presence-coverage (kapatılabilir hedef). AUTHORED
    // niyet — `analyze --outcomes` türetilmiş op-kapsama raporundan AYRI (o mevcut kapsamayı toplar).
    const ocs = merged.coverage.outcomes;
    if (ocs.length > 0) {
        const sat = ocs.filter(o => o.status === 'covered').length;
        log(`  outcome (authored satisfies): ${ocs.length} · ${sat} karşılanan / ${ocs.length - sat} açık-hedef`);
        const unsat = ocs.filter(o => o.status === 'uncovered').map(o => o.id);
        if (unsat.length > 0) log(`    ⚠ karşılanmayan outcome (senaryo yaz): ${unsat.join(', ')}`);
    }
    // Waiver gate-teşhiri (F2.2): merged manifest'teki TÜM authored waive'ler. `today`
    // CANLI (display-only) — merged.json'a yazılmaz, zaman-bağımsız kalır (S13). Enforcement
    // validator'da (stale-error + süre-dolumu warning); bu yalnız görünürlük.
    const today = new Date().toISOString().slice(0, 10);
    const waiverReport = generateWaiverReport(merged, today);
    if (waiverReport.rows.length > 0) {
        const c = waiverReport.counts;
        log(`  waiver'lar: ${waiverReport.rows.length} · ${c['aktif']} aktif / ${c['süresi-yakın']} süresi-yakın / ${c['dolmuş']} dolmuş / ${c['süresiz']} süresiz`);
        for (const line of renderWaiverLines(waiverReport)) log(line);
    }
}

// ── rapor kapanışı ──────────────────────────────────────────────────────────

if (args.json) {
    console.error(
        `QA DSL doğrulayıcı · grammar ${__BUILD_INFO__.grammarVersion} (${__BUILD_INFO__.grammarHash}) · ` +
        `src ${__BUILD_INFO__.qaSrcHash} · commit ${__BUILD_INFO__.commit} · langium ${__BUILD_INFO__.langium}`);
    console.error(`Dosyalar (${files.length}): ${files.map(f => basename(f)).join(', ')}`);
    console.error(`Özet: ${errors} error, ${warnings} warning, ${infos} info${args.strict ? ' · strict' : ''}`);
    process.stdout.write(JSON.stringify(jsonDiags) + '\n');
} else {
    console.log(`\nÖZET: ${files.length} dosya · ${errors} hata · ${warnings} uyarı · ${infos} bilgi${args.strict ? ' · strict' : ''}`);
}

process.exit(ok ? 0 : 1);
