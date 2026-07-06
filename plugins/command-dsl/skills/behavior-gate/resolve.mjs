// runtime-input resolver (§11.3) — turns discovery's requiredRuntimeInputs[] into a batched
// prompt-form, merges human answers (or proposals) into the static adapter, and reports
// provenance. GRACEFUL DEGRADATION: a skipped / unanswerable gap becomes ABSENT — its
// obligation goes DARK downstream (never silently pass; dark != pass, dark != fail).
//
// Provenance per gap: user-provided (human answered) | auto-proposed (safe default, e.g. a
// presence-checked secret or an arbitrary non-authorized role) | absent (skipped or no proposal).
//
// Usage: node resolve.mjs --base=base-adapter.json --gaps=gaps.json --answers=answers.json --out=resolved.json
import { readFileSync, writeFileSync } from 'node:fs';
const arg = (n, d) => { const a = process.argv.find((x) => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : d; };
const base = JSON.parse(readFileSync(arg('base')));
const gaps = JSON.parse(readFileSync(arg('gaps')));
const answers = arg('answers') ? JSON.parse(readFileSync(arg('answers'))) : {};
const out = arg('out');

function setPath(obj, path, val) { const ks = path.split('.'); let o = obj; for (let i = 0; i < ks.length - 1; i++) { o[ks[i]] = o[ks[i]] || {}; o = o[ks[i]]; } o[ks[ks.length - 1]] = val; }

console.log('\n=== RUNTIME-INPUT FORM (discovery flagged these gaps) ===');
const ledger = [];
for (const g of gaps) {
  const answered = Object.prototype.hasOwnProperty.call(answers, g.id);
  let value, prov;
  if (answered && answers[g.id] !== null) { value = answers[g.id]; prov = 'user-provided'; }
  else if (answered && answers[g.id] === null) { value = undefined; prov = 'absent (skipped)'; }
  else if (g.proposable !== null) { value = g.proposable; prov = 'auto-proposed'; }
  else { value = undefined; prov = 'absent (must-ask, unanswered)'; }
  if (value !== undefined) setPath(base, g.adapterPath, value);
  const tag = g.proposable === null ? 'ASK ' : 'confr';
  console.log(`  [${tag}] ${g.id} (${g.kind}) — ${g.why}`);
  console.log(`         evidence: ${g.evidence}`);
  console.log(`         ${g.proposable !== null ? 'proposed: ' + JSON.stringify(g.proposable) : 'no safe default'} | skip → ${g.skipConsequence}`);
  console.log(`         → ${prov}${value !== undefined ? ': ' + JSON.stringify(value) : ''}`);
  ledger.push({ id: g.id, prov });
}
if (out) { writeFileSync(out, JSON.stringify(base, null, 2)); console.log(`\nresolved adapter → ${out}`); }
const absent = ledger.filter((l) => l.prov.startsWith('absent'));
console.log(`PROVENANCE: ${ledger.filter((l) => l.prov === 'user-provided').length} user · ${ledger.filter((l) => l.prov === 'auto-proposed').length} proposed · ${absent.length} absent${absent.length ? ' (' + absent.map((a) => a.id).join(', ') + ' → those obligations DARK)' : ''}\n`);
