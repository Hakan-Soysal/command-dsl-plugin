#!/usr/bin/env node
/**
 * Skill bayatlık-denetçisi (meta-fix E — 2026-07-08 skill-denetimi).
 *
 * KÖK-NEDEN: her skill'in gömülü validator-bundle'ı + envanter-snapshot damgası +
 * referans-doküman'ı CommandDSL gramer/validator'ının gerisine kayabilir. Eski
 * bayatlık-kontrolü BUNDLE'a çıpalıydı (bundle stale olunca damga bayat-bundle'la
 * eşleşir = YANLIŞ "taze"). Bu araç CANLI CommandDSL gramerine/kaynağına çıpalar:
 * bundle'ın gömülü hash'ini (--version BUILD_INFO) canlı repodan yeniden-hesaplanan
 * hash'le karşılaştırır. Fark → STALE (aile-eşzamanlı rebuild gerekir).
 *
 * Kapsam: (1) skill'in CommandDSL-src taşıyan TÜM bundle'ları (primary + emit + report,
 * Faz-2) grammarHash + srcHash (HER İKİSİ — srcHash
 * grammar-DIŞI validator-mantık driftini yakalar, grammarHash tek başına kaçırırdı);
 * (2) envanter-snapshot damgası (ref doc canlı grammarHash'i içermeli); (3) içerik-
 * kapsaması (gramerdeki keyword'ler ref-doküman'da öğretiliyor mu — hash-eşitliğinin
 * yakalayamadığı "construct var ama belgesiz" sınıfı, örn. rule/requires).
 *
 * SRC-REÇETESİ BUNDLE-DAMGALIDIR (2026-07-17): hangi src/ dizinlerinin hash'leneceği
 * artık burada STATİK yazmaz — her build.*.mjs Pass-1 esbuild-metafile'ından türetir ve
 * BUILD_INFO'ya `srcDirs` olarak damgalar; bu araç damgayı okuyup canlı repodan aynı
 * dizinleri yeniden-hash'ler. Reçete build'de, check damgayı okur → reçete-drifti
 * imkansız (eski statik reçete is-analizi'yi tam-kör, qa'yı src/tech'e kör bırakmıştı).
 * SÜPERSEDE (2026-07-17 Faz-2): eski karar "emit/report bundle'ları ayrı denetlenmez —
 * aile-eşzamanlı rebuild yeter" idi; KISMİ-REBUILD DELİĞİ ölçüldü: is-analizi emit
 * e680de0'da kalmışken aile 2b683d7'deydi ve denetçi 4/4 TAZE diyordu. Artık CommandDSL-src
 * taşıyan HER emit/report bundle'ı skill-başına BUNDLE LİSTESİYLE ayrı denetlenir (aile-
 * eşzamanlı rebuild disiplini KALIR; bu denetim onun sigortasıdır). Bundle-başına grammar
 * reçetesi: undefined → skill grammar'ı; null → grammar denetimi YOK (saf json→rapor aracı);
 * array → o liste (cross-DSL: emit-operations BUSINESS gramerine bağlıdır).
 *
 * Kullanım: node scripts/check-skill-staleness.mjs [<CommandDSL-yolu>]
 *           CMDDSL=<yol> node scripts/check-skill-staleness.mjs
 * Exit: 0 tümü taze · 1 en az bir stale/eksik · 2 CommandDSL/araç hatası.
 */
import { createHash } from 'node:crypto';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pluginRoot = resolve(here, '..');
const skillsRoot = resolve(pluginRoot, 'plugins/command-dsl/skills');
const cmdPath = resolve(process.env.CMDDSL ?? process.argv[2] ?? resolve(pluginRoot, '../CommandDSL'));

if (!existsSync(resolve(cmdPath, 'command-dsl.langium'))) {
    console.error(`Hata: CommandDSL bulunamadı: ${cmdPath}\n  CMDDSL=<yol> ile ver ya da arg geç.`);
    process.exit(2);
}

// --- build'lerdeki hash FONKSİYONLARININ mantık-özdeş kopyası (drift → yanlış-STALE = fail-safe).
//     Hangi src/ dizinlerinin hash'leneceği (reçete) burada değil, bundle'ın srcDirs damgasındadır. ---
function sha(...files) {
    const h = createHash('sha256');
    for (const f of files) h.update(readFileSync(resolve(cmdPath, f)));
    return h.digest('hex').slice(0, 12);
}
function walkTs(dir, acc = []) {
    for (const name of readdirSync(dir).sort()) {
        const full = resolve(dir, name);
        if (statSync(full).isDirectory()) walkTs(full, acc);
        else if (name.endsWith('.ts') || name.endsWith('.mts')) acc.push(full);
    }
    return acc;
}
function shaTree(...dirs) {
    const h = createHash('sha256');
    const files = [];
    for (const d of dirs) { const abs = resolve(cmdPath, d); if (existsSync(abs)) files.push(...walkTs(abs)); }
    files.sort();
    for (const f of files) { h.update(f.slice(cmdPath.length)); h.update(readFileSync(f)); }
    return h.digest('hex').slice(0, 12);
}

// Grammar reçetesi build.*.mjs'lerle eşleşir (drift olursa yanlış-STALE = loud, güvenli).
// src reçetesi ise STATİK DEĞİL: bundle'ın srcDirs damgasından okunur; `mustInclude` o damganın
// asgari-akıl-sağlığı çıpasıdır (bundle'ın ANA dizini damgada yoksa türetim bozuktur → loud STALE).
//
// Skill başına BUNDLE LİSTESİ (Faz-2): CommandDSL-src taşıyan her bundle ayrı kayıt.
// Bundle.grammar: undefined → skill grammar'ı · null → grammar denetimi YOK · array → o liste.
// qa report-qa.mjs LİSTEDE YOK (kayıtlı): CommandDSL-src taşımaz (yalnız kendi .src.mts'leri),
// CommandDSL değişince rebuild edilmez → bu araçla denetlenecek canlı-kaynak izi yok.
const CDSL_GRAMMAR = ['command-dsl.langium', 'shared.langium'];
const SKILLS = {
    'is-analizi-dsl': {
        grammar: CDSL_GRAMMAR, langium: 'command-dsl.langium', ref: 'references/dsl-reference.md',
        bundles: [
            { bundleRel: 'validator/validate.mjs',        srcField: 'businessSrcHash', mustInclude: 'src/language' },
            { bundleRel: 'validator/emit-operations.mjs', srcField: 'srcHash',         mustInclude: 'src/generator' },
            { bundleRel: 'validator/report-business.mjs', srcField: 'srcHash',         mustInclude: 'src/generator' },
        ],
    },
    'teknik-analiz': {
        grammar: ['tech-dsl.langium', 'shared.langium'], langium: 'tech-dsl.langium', ref: 'references/tech-dsl-reference.md',
        bundles: [
            { bundleRel: 'validator/validate-tech.mjs',   srcField: 'techSrcHash', mustInclude: 'src/tech' },
            { bundleRel: 'validator/emit-manifest.mjs',   srcField: 'techSrcHash', mustInclude: 'src/tech' },
            { bundleRel: 'validator/emit-operations.mjs', srcField: 'srcHash',     mustInclude: 'src/generator', grammar: CDSL_GRAMMAR },
            { bundleRel: 'validator/report-tech.mjs',     srcField: 'srcHash',     mustInclude: ['src/tech-report', 'src/tech'], grammar: null },  // src/tech = EXTRA_SRC_DIRS (type-only şema); çıpası da korunur
        ],
    },
    'qa-analiz': {
        grammar: ['qa-dsl.langium', 'tech-dsl.langium', 'shared.langium'], langium: 'qa-dsl.langium', ref: 'references/qa-dsl-reference.md',
        bundles: [
            { bundleRel: 'validator/qcdsl.mjs',           srcField: 'qaSrcHash', mustInclude: 'src/qa' },
            { bundleRel: 'validator/emit-operations.mjs', srcField: 'srcHash',   mustInclude: 'src/generator', grammar: CDSL_GRAMMAR },
        ],
    },
    'frontend-analiz': {
        grammar: ['frontend-dsl.langium', 'shared.langium'], langium: 'frontend-dsl.langium', ref: 'references/frontend-dsl-reference.md',
        bundles: [
            { bundleRel: 'validator/fcdsl.mjs',           srcField: 'frontendSrcHash', mustInclude: 'src/frontend' },
            { bundleRel: 'validator/emit-operations.mjs', srcField: 'srcHash',         mustInclude: 'src/generator', grammar: CDSL_GRAMMAR },
            { bundleRel: 'validator/report-frontend.mjs', srcField: 'srcHash',         mustInclude: ['src/playground', 'src/frontend'] },  // src/frontend = EXTRA_SRC_DIRS (type-only şema); çıpası da korunur
        ],
    },
};

// İçerik-kapsaması: bu keyword'ler grammatik-glue/sentetik; ref-doküman'da AYRI construct olarak
// aranmaz (yanlış-pozitif önler). Anlamlı construct-keyword'leri (rule/outcome/satisfies…) yakalar.
const IGNORE_KW = new Set([
    'of', 'to', 'with', 'for', 'from', 'on', 'by', 'as', 'in', 'at', 'or', 'and', 'not', 'is', 'own', 'any', 'all',
    'true', 'false', 'if', 'when', 'where', 'then', 'end', 'set', 'min', 'max', 'page', 'size', 'count', 'more',
    // literal-birimler / sıralama-yönleri / glue (AYRI construct değil — Duration/order-by/schedule içi)
    'minute', 'minutes', 'hour', 'hours', 'day', 'days', 'week', 'month', 'every',
    'ascending', 'descending', 'asc', 'desc',
]);
function grammarKeywords(langiumFile) {
    const text = readFileSync(resolve(cmdPath, langiumFile), 'utf-8')
        .replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');   // yorumları at
    const kw = new Set();
    for (const m of text.matchAll(/'([a-zA-Z][a-zA-Z ]{2,})'/g)) {
        const k = m[1].trim();
        if (k.includes(' ')) { kw.add(k); continue; }          // çok-kelimeli keyword (on success do)
        if (!IGNORE_KW.has(k)) kw.add(k);
    }
    return [...kw];
}

function bundleInfo(skillDir, bundleRel) {
    const out = execFileSync('node', [resolve(skillDir, bundleRel), '--version'], { encoding: 'utf-8' });
    const start = out.indexOf('{'); const end = out.lastIndexOf('}');
    if (start < 0 || end < 0) throw new Error(`--version JSON bulunamadı: ${bundleRel}`);
    return JSON.parse(out.slice(start, end + 1));
}

// Grammar-sha memoizasyonu: aynı grammar listesi (örn. CDSL_GRAMMAR ×4 bundle) bir kez hash'lenir.
const grammarShaCache = new Map();
function shaGrammar(files) {
    const key = files.join('+');
    if (!grammarShaCache.has(key)) grammarShaCache.set(key, sha(...files));
    return grammarShaCache.get(key);
}

let anyStale = false;
let totalBundles = 0;
let freshBundles = 0;
console.log(`Skill bayatlık-denetimi · CommandDSL: ${cmdPath}\n${'─'.repeat(64)}`);

for (const [name, s] of Object.entries(SKILLS)) {
    const dir = resolve(skillsRoot, name);
    const problems = [];
    const freshLines = [];

    // (1) bundle hash-tazeliği — skill'in HER CommandDSL-src taşıyan bundle'ı ayrı denetlenir.
    for (const b of s.bundles) {
        totalBundles += 1;
        const bundleProblems = [];
        // grammar reçetesi: undefined → skill grammar'ı; null → denetim YOK; array → o liste.
        const grammarFiles = b.grammar === undefined ? s.grammar : b.grammar;
        try {
            const info = bundleInfo(dir, b.bundleRel);
            if (grammarFiles !== null) {
                const liveG = shaGrammar(grammarFiles);
                if (info.grammarHash !== liveG) bundleProblems.push(`grammarHash STALE: bundle ${info.grammarHash} ≠ canlı ${liveG} (reçete: ${grammarFiles.join('+')})`);
            }
            // srcDirs DAMGASI: reçete build'in metafile'ından (± EXTRA_SRC_DIRS) türer, buradan yalnız OKUNUR.
            // HİBRİT SİGORTA: damga yok/deforme (eski-format bundle) ya da mustInclude çıpa(lar)ı
            // eksik (metafile-türetim bug'ı VEYA EXTRA_SRC_DIRS düşmesi) → sessiz-yeşile dönüşemez, loud STALE.
            // mustInclude dizi olabilir: ana dizin + elle EXTRA_SRC_DIRS (type-only şema) HEP çıpalanır.
            const dirs = info.srcDirs;
            const anchors = [].concat(b.mustInclude);
            if (!Array.isArray(dirs) || !dirs.length || !dirs.every(d => /^src\/[^/]+$/.test(d)) || !anchors.every(mi => dirs.includes(mi))) {
                bundleProblems.push(`srcDirs damgası yok/deforme (eski-format bundle ya da '${anchors.join("','")}' kapsam-dışı) → rebuild gerekir`);
            } else {
                const liveSrc = shaTree(...dirs);
                const bundleSrc = info[b.srcField];
                if (bundleSrc !== liveSrc) bundleProblems.push(`${b.srcField} STALE: bundle ${bundleSrc} ≠ canlı ${liveSrc} (mantık drifti · izlenen: ${dirs.join(' ')})`);
                if (bundleProblems.length === 0) freshLines.push(`${b.bundleRel} · src ${liveSrc} [${dirs.join(' ')}]`);
            }
        } catch (e) { bundleProblems.push(`bundle okunamadı: ${e.message}`); }

        if (bundleProblems.length === 0) freshBundles += 1;
        else for (const p of bundleProblems) problems.push(`${b.bundleRel}: ${p}`);
    }

    // (2) envanter-snapshot damgası: ref-doküman canlı grammarHash'i İÇERMELİ (skill grammar'ı; skill-başına BİR kez)
    const liveGrammar = shaGrammar(s.grammar);
    const refPath = resolve(dir, s.ref);
    const refText = existsSync(refPath) ? readFileSync(refPath, 'utf-8') : '';
    if (!refText.includes(liveGrammar)) problems.push(`envanter-damgası STALE: ${s.ref} canlı grammarHash '${liveGrammar}' içermiyor`);

    // (3) içerik-kapsaması: gramerdeki construct-keyword'ler ref-doküman'da öğretiliyor mu (skill-başına BİR kez)
    const missing = grammarKeywords(s.langium).filter(k => !refText.includes(k));
    if (missing.length > 0) problems.push(`içerik-eksik (keyword gramerde var, ${s.ref}'de yok): ${missing.join(', ')}`);

    if (problems.length === 0) {
        console.log(`✓ ${name} — TAZE ${s.bundles.length}/${s.bundles.length} bundle (grammar ${liveGrammar})`);
        for (const l of freshLines) console.log(`    · ${l}`);
    } else {
        anyStale = true;
        console.log(`✗ ${name} — STALE:`);
        for (const p of problems) console.log(`    · ${p}`);
    }
}

console.log('─'.repeat(64));
if (anyStale) {
    console.log(`STALE var (${freshBundles}/${totalBundles} bundle taze) → aile-eşzamanlı bundle rebuild + referans/envanter güncelle.`);
    console.log('  (rebuild: <skill>/validator/ içindeki her build.*.mjs\'i CMDDSL ile koştur)');
    process.exit(1);
}
console.log(`Tüm skiller TAZE — ${freshBundles}/${totalBundles} bundle; bundle/envanter/referans canlı CommandDSL ile senkron.`);
process.exit(0);
