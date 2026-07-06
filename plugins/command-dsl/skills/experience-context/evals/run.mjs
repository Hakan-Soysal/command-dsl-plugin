#!/usr/bin/env node
// experience-context eval — byte-stability + snapshot + coverage + no-hallucination + provenance + no-timestamp.
// Frontend sibling of spec-context/evals/run.mjs. Drives the real CLI as a subprocess (DOER≠CHECKER: the
// emitter runs for real; nothing here re-implements the renderer). Fixture: spec/library.experience.json.
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
// fileURLToPath: boşluklu proje yolunda `.pathname` %20-encode edip var-olmayan dizin üretir (spawn ENOENT).
// Plugin genelindeki tüm runner'lar bu idiom'u kullanır — byte-stable + boşluk-güvenli.
const here = fileURLToPath(new URL('.', import.meta.url));
const skillDir = join(here, '..');
const fixture = join(skillDir, 'spec', 'library.experience.json'); // absolute — yalnız coverage readFileSync için
// KRİTİK: CLI'ı cwd=skillDir + RELATIVE pozisyonel ('spec/library.experience.json') ile koş — böylece provenance
// `source:` satırı Step 3'te üretilen snapshot ile AYNI olur. Absolute path geçmek header'a absolute `source:`
// gömer → byte-stable kalır ama snapshot != expected (source satırı farklı). Snapshot ve run.mjs AYNI string.
const run = () => { const d = mkdtempSync(join(tmpdir(), 'ec-')); execFileSync('node', ['experience-context.mjs', 'spec/library.experience.json', '--out', d, '--quiet'], { cwd: skillDir }); return readFileSync(join(d, 'CLAUDE.md'), 'utf8'); };

let p = 0, f = 0; const chk = (n, ok) => { console.log(`  ${ok ? 'PASS' : 'FAIL'} ${n}`); ok ? p++ : f++; };

// (a) byte-stable — two full CLI runs identical
const a = run(), b = run();
chk('byte-stable (iki koşum özdeş)', a === b);

// (b) snapshot — emitter output == committed expected-CLAUDE.md (üretilmiş, elle-yazım değil)
const expected = readFileSync(join(here, 'expected-CLAUDE.md'), 'utf8');
chk('snapshot eşleşir (expected-CLAUDE.md emitter-üretimi)', a === expected);

// ── coverage: her ekran / form-alanı+validation / action-op-binding / navigasyon çıktıda mı? ──
const exp = JSON.parse(readFileSync(fixture, 'utf8'));
const shared = exp.shared && typeof exp.shared === 'object' ? exp.shared : {};
const allScreens = [...(shared.screens || []), ...exp.experiences.flatMap((e) => e.screens || [])];

const KINDS = new Set(['form', 'action', 'list', 'detail']);
// recognized components (nested list/detail actions dahil) → obligation olup olmadığını belirler
function walkComponents(comps, bag, screenName) {
  for (const c of comps || []) {
    if (!c || typeof c !== 'object') continue;
    if (c.kind === 'form') { bag.recognized = true; for (const fld of c.fields || []) if (fld && fld.name) bag.fields.push(fld.name); if (c.submits && c.submits.op) bag.ops.add(c.submits.op); }
    else if (c.kind === 'action') { bag.recognized = true; if (c.command && c.command.op) bag.ops.add(c.command.op); if (c.navigation && c.navigation.screen) bag.nav.push(`\`${screenName}\` → \`${c.navigation.screen}\``); }
    else if (c.kind === 'list' || c.kind === 'detail') { bag.recognized = true; if (c.query && c.query.op) bag.ops.add(c.query.op); walkComponents(c.actions, bag, screenName); }
    for (const ev of c.uiEvents || []) for (const act of ev.actions || []) if (act && act.do === 'navigate' && act.screen) bag.nav.push(`\`${screenName}\` → \`${act.screen}\``);
  }
}
const bag = { recognized: false, fields: [], ops: new Set(), nav: [] };
const obligationScreens = [];
for (const s of allScreens) {
  if (!s || typeof s !== 'object') continue;
  const sb = { recognized: false, fields: [], ops: new Set(), nav: [] };
  for (const region of s.regions || []) walkComponents(region.components, sb, s.name);
  for (const ev of s.uiEvents || []) for (const act of ev.actions || []) if (act && act.do === 'navigate' && act.screen) sb.nav.push(`\`${s.name}\` → \`${act.screen}\``);
  if (sb.recognized) {
    obligationScreens.push(s.name);
    bag.fields.push(...sb.fields); sb.ops.forEach((o) => bag.ops.add(o)); bag.nav.push(...sb.nav);
  }
}

chk('coverage: her obligation-ekranı çıktıda', obligationScreens.every((n) => a.includes(`### Ekran: ${n}`)));
chk('coverage: her form-alanı çıktıda', bag.fields.every((n) => a.includes(`\`${n}\``)));
chk('coverage: her action/query/submit op-binding çıktıda', [...bag.ops].every((o) => a.includes(`\`${o}\``)));
chk('coverage: her navigasyon geçişi çıktıda', bag.nav.every((t) => a.includes(t)));
// form-validation attr'ları (required/min/max/pattern) çıktıda
chk('coverage: form-validation zorlanıyor (required/min/max/pattern)', /required/.test(a) && /min:1/.test(a) && /max:5/.test(a) && /pattern:/.test(a));

// ── no-hallucination: çıktıdaki her ekran/op adı fixture'dan gelir (uydurma yok) ──
const fixtureScreenNames = new Set(allScreens.map((s) => s && s.name).filter(Boolean));
const fixtureOpNames = new Set([
  ...(shared.usesInterfaces || []),
  ...exp.experiences.flatMap((e) => e.usesInterfaces || []),
].map((i) => i && i.name).filter(Boolean));
// çıktıdaki tüm "### Ekran: <name>" başlıkları (param suffix'i soy)
const emittedScreens = [...a.matchAll(/^### Ekran: ([^\n(]+?)(?: \(params:.*)?$/gm)].map((m) => m[1].trim());
chk('no-hallucination: emit edilen her ekran fixture\'da var', emittedScreens.length > 0 && emittedScreens.every((n) => fixtureScreenNames.has(n)));
// "Veri arayüzleri" bölümündeki her op fixture usesInterfaces adı. Op-bullet hedefi backtick'siz
// (single/list/(çıktı yok)); nav-bullet hedefi backtick'li (`Screen`) → negative-lookahead ile ayır.
const emittedOps = [...a.matchAll(/^- `([^`]+)` → (?!`)/gm)].map((m) => m[1]);
chk('no-hallucination: emit edilen her op fixture usesInterfaces\'ta var', emittedOps.length > 0 && emittedOps.every((o) => fixtureOpNames.has(o)));

// (e) provenance — sha256 header
chk('provenance sha256 var', /sha256:[0-9a-f]{64}/.test(a));
// provenance sha256 gerçekten fixture'ın hash'i mi (pin doğru)
import { createHash } from 'node:crypto';
const realHash = createHash('sha256').update(readFileSync(fixture, 'utf8'), 'utf8').digest('hex');
chk('provenance sha256 fixture ile eşleşir (doğru pin)', a.includes(`sha256:${realHash}`));

// (f) no timestamp — çıktıda tarih yok (byte-stability garantisi)
chk('no timestamp (byte-stability)', !/\d{4}-\d\d-\d\dT/.test(a) && !/\d{4}-\d\d-\d\d/.test(a));

// ── gate: bozuk girdi → exit 1, HİÇBİR dosya yazılmaz (spec-context emsali) ──
function runInput(inputPath, extra = []) {
  const d = mkdtempSync(join(tmpdir(), 'ec-gate-'));
  try { execFileSync('node', ['experience-context.mjs', inputPath, '--out', d, '--quiet', ...extra], { cwd: skillDir, stdio: 'ignore' }); return { code: 0, dir: d }; }
  catch (e) { return { code: e.status ?? 1, dir: d }; }
}
const badPath = join(mkdtempSync(join(tmpdir(), 'ec-bad-')), 'bad.experience.json');
writeFileSync(badPath, '{}');
const rBad = runInput(badPath);
import { existsSync } from 'node:fs';
chk('gate: bozuk girdi exit 1, CLAUDE.md YAZILMADI', rBad.code === 1 && !existsSync(join(rBad.dir, 'CLAUDE.md')));

console.log(`EVAL: ${p} pass, ${f} fail`); if (f) process.exitCode = 1;
