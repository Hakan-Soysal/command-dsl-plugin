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
 * Kapsam: (1) primary-validator bundle grammarHash + srcHash (HER İKİSİ — srcHash
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
 * NOT: emit/report bundle'ları primary-validator ile AİLE-EŞZAMANLI rebuild edilir
 * (validator.md); primary stale ise tüm aile rebuild edilir → ayrı denetlenmez (kayıtlı).
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
// asgari-akıl-sağlığı çıpasıdır (skill'in KENDİ dizini damgada yoksa türetim bozuktur → loud STALE).
const SKILLS = {
    'is-analizi-dsl': { bundle: 'validator/validate.mjs', grammar: ['command-dsl.langium', 'shared.langium'], srcField: 'businessSrcHash', mustInclude: 'src/language', langium: 'command-dsl.langium', ref: 'references/dsl-reference.md' },
    'teknik-analiz':  { bundle: 'validator/validate-tech.mjs', grammar: ['tech-dsl.langium', 'shared.langium'], srcField: 'techSrcHash', mustInclude: 'src/tech', langium: 'tech-dsl.langium', ref: 'references/tech-dsl-reference.md' },
    'qa-analiz':      { bundle: 'validator/qcdsl.mjs', grammar: ['qa-dsl.langium', 'tech-dsl.langium', 'shared.langium'], srcField: 'qaSrcHash', mustInclude: 'src/qa', langium: 'qa-dsl.langium', ref: 'references/qa-dsl-reference.md' },
    'frontend-analiz':{ bundle: 'validator/fcdsl.mjs', grammar: ['frontend-dsl.langium', 'shared.langium'], srcField: 'frontendSrcHash', mustInclude: 'src/frontend', langium: 'frontend-dsl.langium', ref: 'references/frontend-dsl-reference.md' },
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

let anyStale = false;
console.log(`Skill bayatlık-denetimi · CommandDSL: ${cmdPath}\n${'─'.repeat(64)}`);

for (const [name, s] of Object.entries(SKILLS)) {
    const dir = resolve(skillsRoot, name);
    const problems = [];

    // (1) bundle hash-tazeliği (grammarHash + srcHash) — CANLI gramere karşı
    let liveGrammar = null;
    let stampedDirs = null;
    try {
        liveGrammar = sha(...s.grammar);
        const info = bundleInfo(dir, s.bundle);
        if (info.grammarHash !== liveGrammar) problems.push(`grammarHash STALE: bundle ${info.grammarHash} ≠ canlı ${liveGrammar}`);
        // srcDirs DAMGASI: reçete build'in metafile'ından türer, buradan yalnız OKUNUR.
        // HİBRİT SİGORTA: damga yok/deforme (eski-format bundle) ya da mustInclude çıpası
        // eksik (metafile-türetim bug'ı) → sessiz-yeşile dönüşemez, loud STALE.
        const dirs = info.srcDirs;
        if (!Array.isArray(dirs) || !dirs.length || !dirs.every(d => /^src\/[^/]+$/.test(d)) || !dirs.includes(s.mustInclude)) {
            problems.push(`srcDirs damgası yok/deforme (eski-format bundle ya da '${s.mustInclude}' kapsam-dışı) → rebuild gerekir`);
        } else {
            stampedDirs = dirs;
            const liveSrc = shaTree(...dirs);
            const bundleSrc = info[s.srcField];
            if (bundleSrc !== liveSrc) problems.push(`${s.srcField} STALE: bundle ${bundleSrc} ≠ canlı ${liveSrc} (validator-mantık drifti · izlenen: ${dirs.join(' ')})`);
        }
    } catch (e) { problems.push(`bundle okunamadı (${s.bundle}): ${e.message}`); }

    // (2) envanter-snapshot damgası: ref-doküman canlı grammarHash'i İÇERMELİ
    const refPath = resolve(dir, s.ref);
    const refText = existsSync(refPath) ? readFileSync(refPath, 'utf-8') : '';
    if (liveGrammar && !refText.includes(liveGrammar)) problems.push(`envanter-damgası STALE: ${s.ref} canlı grammarHash '${liveGrammar}' içermiyor`);

    // (3) içerik-kapsaması: gramerdeki construct-keyword'ler ref-doküman'da öğretiliyor mu
    const missing = grammarKeywords(s.langium).filter(k => !refText.includes(k));
    if (missing.length > 0) problems.push(`içerik-eksik (keyword gramerde var, ${s.ref}'de yok): ${missing.join(', ')}`);

    if (problems.length === 0) {
        console.log(`✓ ${name} — TAZE (grammar ${liveGrammar} · src ${shaTree(...stampedDirs)} [${stampedDirs.join(' ')}])`);
    } else {
        anyStale = true;
        console.log(`✗ ${name} — STALE:`);
        for (const p of problems) console.log(`    · ${p}`);
    }
}

console.log('─'.repeat(64));
if (anyStale) {
    console.log('STALE skill(ler) var → aile-eşzamanlı bundle rebuild + referans/envanter güncelle.');
    console.log('  (rebuild: <skill>/validator/ içindeki her build.*.mjs\'i CMDDSL ile koştur)');
    process.exit(1);
}
console.log('Tüm skiller TAZE — bundle/envanter/referans canlı CommandDSL ile senkron.');
process.exit(0);
