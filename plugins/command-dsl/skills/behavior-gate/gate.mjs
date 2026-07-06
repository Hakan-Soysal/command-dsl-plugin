// UNIFIED behavior-gate runner (Faz-2 promotion) — one manifest + one adapter + one app.
// Dispatches the three VALIDATED tier-1 probes over the manifest:
//   - op.roles[]         -> AUTHZ probe        (§11.1, grup2-poc/auth-matrix)
//   - op.validation/rule -> PAYLOAD-GUARD probe (§6.3/§11 core, grup2-poc/tier1-manifest)
//   - entity.invariants[]-> INVARIANT probe    (§11.2, grup2-poc/state-oracle)
// One coverage-primary report; three outcomes (realized / proven-fail / dark); never a
// green when dark. Payload & invariant drives authenticate as the op's AUTHORIZED principal
// so authz never masks them. Adapter here is hand-written; in production = discovery (§12.H) + runtime-input UX.
//
// Usage: node gate.mjs <app-dir>  |  node gate.mjs --selftest

import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';

const here = new URL('.', import.meta.url);
const argVal = (n) => { const a = process.argv.find((x) => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3) : null; };
const specPath = argVal('spec'), adapterPath = argVal('adapter');
const manifest = JSON.parse(readFileSync(specPath || new URL('./spec/manifest.json', here)));
const adapter = JSON.parse(readFileSync(adapterPath || new URL('./adapter.json', here)));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// PROBE ISOLATION: each probe gets a FRESH app instance on a fresh port, so accepted
// side-effect drives from one probe never pollute another's state (soundness — a shared
// instance would inflate e.g. a count<=N invariant with prior probes' accepted writes).
let curPort = adapter.boot.port;
const base = () => `http://127.0.0.1:${curPort}`;

// ── DRIVER selection (OPT-IN in-process app.fetch; default http-spawn) ──
// adapter.boot.driver: 'http-spawn' (default) spawns a real process and drives it over HTTP;
// 'app-fetch' imports the app module and drives it in-process via app.fetch(new Request(...)).
// For 'app-fetch': adapter.boot.appModule = module path (resolved against appDir), and
// adapter.boot.appExport = 'default' (module-level app) | a factory fn name (fresh instance).
const DRIVER = (adapter.boot && adapter.boot.driver) || 'http-spawn';
let curApp = null;          // app-fetch mode: fresh app instance per probe (isolation)
let appDirGlobal = null;    // set in main(); base dir for app-fetch module resolution
async function loadFreshApp() {
  // fresh module each probe → fresh in-memory state (isolation). cache-bust via query.
  const url = new URL(adapter.boot.appModule, `file://${appDirGlobal}/`).href + `?probe=${curPort}`;
  const mod = await import(url);
  const exp = adapter.boot.appExport || 'default';
  const app = typeof mod[exp] === 'function' && exp !== 'default' ? mod[exp]() : mod[exp]; // factory → fresh; else module-default
  if (!app || typeof app.fetch !== 'function') throw new Error(`app-fetch: ${exp} has no .fetch(Request)`);
  return app;
}

// ── PAYLOAD deriver (single-field numeric cmp) ──
const SUPPORTED_OPS = new Set(['<=', '<', '>=', '>', '=', '==', '!=']);
function resolveRhs(node, seed) {
  if (!node) return { ok: false };
  if (node.kind === 'number') return { ok: true, value: node.value };
  if (Array.isArray(node.path)) { const k = node.path[node.path.length - 1]; return seed && k in seed ? { ok: true, value: seed[k] } : { ok: false, why: `unresolved seed '${k}'` }; }
  return { ok: false, why: 'rhs not literal/path' };
}
function toConstraint(pred, field, seed) {
  const a = pred.ast;
  if (!a || a.node !== 'cmp') return { mappable: false, why: `not a cmp (${a ? a.node ?? 'bare' : 'none'})` };
  if (!SUPPORTED_OPS.has(a.op)) return { mappable: false, why: `unsupported op '${a.op}'` };
  const lp = a.left && a.left.path;
  if (!Array.isArray(lp) || lp[lp.length - 1] !== field) return { mappable: false, why: 'left not the field' };
  const r = resolveRhs(a.right, seed);
  if (!r.ok) return { mappable: false, why: r.why };
  return { mappable: true, op: a.op, rhs: r.value, text: pred.text };
}
function holds(v, c) { switch (c.op) { case '<=': return v <= c.rhs; case '<': return v < c.rhs; case '>=': return v >= c.rhs; case '>': return v > c.rhs; case '==': case '=': return v === c.rhs; case '!=': return v !== c.rhs; default: return null; } }
function range(cs) { const r = cs.map((c) => c.rhs).concat([0]); const lo = Math.min(...r) - 5, hi = Math.max(...r) + 5; const o = []; for (let v = lo; v <= hi; v++) o.push(v); return o; }
function satisfyAll(cs) { return range(cs).find((v) => cs.every((c) => holds(v, c) === true)) ?? null; }
function isolatedViolating(t, cs) { const o = cs.filter((c) => c !== t); return [t.rhs, t.rhs + 1, t.rhs - 1, ...range(cs)].find((v) => holds(v, t) === false && o.every((c) => holds(v, c) === true)) ?? null; }
function insideBoundary(c) { switch (c.op) { case '<=': case '>=': case '==': case '=': return c.rhs; case '<': return c.rhs - 1; case '>': return c.rhs + 1; default: return null; } }
function positivePoints(cs) { const p = new Set(); const m = satisfyAll(cs); if (m != null) p.add(m); for (const c of cs) { const b = insideBoundary(c); if (b != null && cs.every((x) => holds(b, x) === true)) p.add(b); } return [...p]; }

// ── INVARIANT evaluator (agg + cmp, epsilon-tolerant for Decimal) ──
const EPS = 1e-9;
function evalNode(node, state) {
  if (node && node.node === 'agg') { const [coll, ...rest] = node.path; const arr = state[coll]; if (!Array.isArray(arr)) return { ok: false, why: `state.${coll} not array` }; const vals = arr.map((e) => rest.reduce((o, k) => (o == null ? undefined : o[k]), e)); if (vals.some((v) => typeof v !== 'number')) return { ok: false, why: 'non-numeric agg elem' }; if (node.fn === 'sum') return { ok: true, value: vals.reduce((a, b) => a + b, 0) }; if (node.fn === 'count') return { ok: true, value: vals.length }; return { ok: false, why: `agg fn ${node.fn}` }; }
  if (node && Array.isArray(node.path)) { let c = state; for (const s of node.path) c = c == null ? undefined : c[s]; return typeof c === 'number' ? { ok: true, value: c } : { ok: false, why: `path ${node.path.join('.')} not numeric` }; }
  if (node && node.kind === 'number') return { ok: true, value: node.value };
  return { ok: false, why: `node ${node && (node.node || node.kind)}` };
}
function evalInvariant(ast, state) {
  if (!ast || ast.node !== 'cmp') return { ok: false, why: `invariant not top-level cmp (${ast && ast.node})` };
  const l = evalNode(ast.left, state), r = evalNode(ast.right, state);
  if (!l.ok) return { ok: false, why: 'LHS ' + l.why }; if (!r.ok) return { ok: false, why: 'RHS ' + r.why };
  const d = l.value - r.value; const c = { '=': Math.abs(d) < EPS, '==': Math.abs(d) < EPS, '!=': Math.abs(d) >= EPS, '>=': d >= -EPS, '<=': d <= EPS, '>': d > EPS, '<': d < -EPS };
  return ast.op in c ? { ok: true, holds: c[ast.op], lhs: l.value, rhs: r.value } : { ok: false, why: `op ${ast.op}` };
}

// ── AUTHZ classify ──
function classify(status) { return status < 300 ? 'accept' : status === 401 ? 'authn-reject' : status < 500 ? 'authz-reject' : 'crash'; }

// ── HTTP ──
async function req(method, path, headers, bodyObj) {
  const h = { 'content-type': 'application/json', ...headers };
  const init = { method, headers: h, body: bodyObj !== undefined ? JSON.stringify(bodyObj) : undefined };
  let r;
  if (DRIVER === 'app-fetch') { r = await curApp.fetch(new Request('http://local' + path, init)); }
  else { r = await fetch(base() + path, init); }
  let j = {}; try { j = await r.json(); } catch {}
  return { status: r.status, cls: classify(r.status), result: j[adapter.errorField], body: j };
}
async function waitReady(ms) { const s = Date.now(); while (Date.now() - s < ms) { try { await fetch(base() + '/__ping'); return true; } catch { await sleep(80); } } return false; }

// SATISFY-CONTEXT (§6.6 isolation, header axis): merge adapter-supplied `satisfyHeaders` (values that
// satisfy the op's OTHER stacked guards — e.g. the role header while probing scope) UNDER the probe's
// target-axis header. Spread order guarantees the target axis ALWAYS wins → isolation cannot break even
// if satisfyHeaders accidentally names the target header. If `oa.satisfyHeaders` is absent, this is
// BYTE-IDENTICAL to the old single-header request (regression-safe). Oracle-wall: satisfy values come
// from spec (op.roles[0]/op.scopes[0]) + discovery evidence, never from impl accept/reject behavior.
const SH = (oa, target) => ({ ...((oa && oa.satisfyHeaders) || {}), ...target });

// ── probes ──
async function authzProbe(op, oa, push) {
  const g = `authz:${op.roles[0]}`, ah = oa.authHeader, P = oa.principals;
  if (!P || !P.authorized || !P.underPrivileged) { push({ scope: op.id, guard: g, status: 'dark', detail: 'principal runtime-input ABSENT (need authorized + under-privileged) — cannot run auth-axis controls' }); return; }
  const pos = await req(oa.endpoint.method, oa.endpoint.path, SH(oa, { [ah]: P.authorized }), oa.satisfyBody);
  if (pos.cls !== 'accept') { push({ scope: op.id, guard: g, status: 'dark', detail: `authorized '${P.authorized}' REJECTED (${pos.status}/${pos.result}) — apparatus broken on auth axis` }); return; }
  const neg = await req(oa.endpoint.method, oa.endpoint.path, SH(oa, { [ah]: P.underPrivileged }), oa.satisfyBody);
  if (neg.cls === 'accept') push({ scope: op.id, guard: g, status: 'proven-fail', detail: `under-priv '${P.underPrivileged}' ACCEPTED — authz guard MISSING` });
  else if (neg.cls === 'authz-reject') push({ scope: op.id, guard: g, status: 'realized', detail: `authorized->accept ∧ under-priv->reject(${neg.status})` });
  else if (neg.cls === 'authn-reject') push({ scope: op.id, guard: g, status: 'dark', detail: `under-priv rejected by 401 authN not 403 authZ — cannot isolate` });
  else push({ scope: op.id, guard: g, status: 'dark', detail: `crash ${neg.status}` });
}
async function scopeProbe(op, oa, push) {
  const g = `scope:${op.scopes[0]}`, sx = oa.scopeAxis;
  if (!sx || !sx.withScope || !sx.withoutScope) { push({ scope: op.id, guard: g, status: 'dark', detail: 'scope runtime-input ABSENT (need with-scope + without-scope principal) — cannot run scope-axis controls' }); return; }
  const ah = sx.authHeader || oa.authHeader;
  const pos = await req(oa.endpoint.method, oa.endpoint.path, SH(oa, { [ah]: sx.withScope }), oa.satisfyBody);
  if (pos.cls !== 'accept') { push({ scope: op.id, guard: g, status: 'dark', detail: `with-scope '${sx.withScope}' REJECTED (${pos.status}/${pos.result}) — apparatus broken on scope axis` }); return; }
  const neg = await req(oa.endpoint.method, oa.endpoint.path, SH(oa, { [ah]: sx.withoutScope }), oa.satisfyBody);
  if (neg.cls === 'accept') push({ scope: op.id, guard: g, status: 'proven-fail', detail: `without-scope '${sx.withoutScope}' ACCEPTED — scope guard MISSING` });
  else if (neg.cls === 'authz-reject') push({ scope: op.id, guard: g, status: 'realized', detail: `with-scope->accept ∧ without-scope->reject(${neg.status})` });
  else if (neg.cls === 'authn-reject') push({ scope: op.id, guard: g, status: 'dark', detail: `without-scope rejected by 401 authN not 403 — cannot isolate scope` });
  else push({ scope: op.id, guard: g, status: 'dark', detail: `crash ${neg.status}` });
}
async function replayProbe(op, oa, push) {
  const cases = oa.replayCases || {};
  // ACCOUNTABILITY: a manifest-declared idempotent obligation (structured op.idempotent.keys —
  // grammar-guaranteed, NOT name-classification) must never be silently dropped from the
  // denominator. If declared but the adapter supplied NO replay case → DARK (matches discovery.md
  // "case yoksa DARK"). Prose-call existence guards (no op.idempotent) are already DARK via payloadProbe.
  if (op.idempotent && Array.isArray(op.idempotent.keys) && op.idempotent.keys.length && !Object.keys(cases).length) {
    push({ scope: op.id, guard: `idempotent:${op.idempotent.keys.join(',')}`, status: 'dark', detail: 'manifest declares idempotent obligation but adapter supplied NO replay case (oa.replayCases) — no-duplicate UNVERIFIABLE (never silently dropped)' });
    return;
  }
  const ah = oa.authHeader, role = oa.principals && oa.principals.authorized;
  for (const [label, rc] of Object.entries(cases)) {
    const g = `replay:${label}`;
    if (!rc || !rc.first || !rc.replay) { push({ scope: op.id, guard: g, status: 'dark', detail: 'replay case incomplete (need {first, replay}) — cannot run no-duplicate control' }); continue; }
    const first = await req(oa.endpoint.method, oa.endpoint.path, SH(oa, { [ah]: role }), rc.first);
    if (first.cls !== 'accept') { push({ scope: op.id, guard: g, status: 'dark', detail: `first request REJECTED (${first.status}) — no baseline for replay` }); continue; }
    const rep = await req(oa.endpoint.method, oa.endpoint.path, SH(oa, { [ah]: role }), rc.replay);
    if (rep.cls === 'crash') push({ scope: op.id, guard: g, status: 'dark', detail: `replay crash ${rep.status}` });
    else if (rep.cls === 'accept') push({ scope: op.id, guard: g, status: 'proven-fail', detail: `replay (same key) ACCEPTED — no-duplicate/existence guard '${label}' MISSING (silent)` });
    else push({ scope: op.id, guard: g, status: 'realized', detail: `replay (same key)->rejected(${rep.status}); no-duplicate '${label}' enforced` });
  }
}
async function payloadProbe(op, oa, push) {
  const ah = oa.authHeader, role = oa.principals.authorized;
  const guards = [...(op.validation || []), ...(op.rule || [])].map((p, i) => ({ id: `V_${i}`, ...toConstraint(p, oa.field, oa.seed), text: p.text }));
  for (const gd of guards) if (!gd.mappable) push({ scope: op.id, guard: gd.text, status: 'dark', detail: `unmappable: ${gd.why}` });
  const cs = guards.filter((g) => g.mappable);
  if (!cs.length) return;
  const pts = positivePoints(cs);
  let over = null, infra = null;
  for (const pv of pts) { const r = await req(oa.endpoint.method, oa.endpoint.path, SH(oa, { [ah]: role }), { [oa.field]: pv }); if (r.cls === 'accept') continue; if (r.cls === 'authz-reject' && r.result) { over = { pv, e: r.result }; break; } infra = { pv, s: r.status }; break; }
  if (over) { cs.forEach((g) => push({ scope: op.id, guard: g.text, status: 'dark', detail: `baseline tainted: valid ${oa.field}=${over.pv} rejected (${over.e}) — over-fire` })); return; }
  if (infra) { cs.forEach((g) => push({ scope: op.id, guard: g.text, status: 'dark', detail: `positive control rejected INFRA (${infra.s})` })); return; }
  for (const g of cs) {
    const bad = isolatedViolating(g, cs);
    if (bad == null) { push({ scope: op.id, guard: g.text, status: 'dark', detail: 'cannot isolate' }); continue; }
    const r = await req(oa.endpoint.method, oa.endpoint.path, SH(oa, { [ah]: role }), { [oa.field]: bad });
    if (r.cls === 'crash') push({ scope: op.id, guard: g.text, status: 'dark', detail: `crash ${r.status}` });
    else if (r.cls === 'accept') push({ scope: op.id, guard: g.text, status: 'proven-fail', detail: `violating ${oa.field}=${bad} ACCEPTED (silent guard)` });
    else push({ scope: op.id, guard: g.text, status: 'realized', detail: `violating ${oa.field}=${bad}->rejected(${r.status}); name-binding UNVERIFIED` });
  }
}
async function invariantProbe(ent, ea, push) {
  if (!ea.stateRead) { (ent.invariants || []).forEach((inv) => push({ scope: ent.id, guard: inv.text, status: 'dark', detail: 'state-oracle runtime-input ABSENT — invariant unobservable' })); return; }
  const drive = adapter.operations[ea.driveOp], ah = drive.authHeader, role = drive.principals.authorized;
  for (const amt of ea.trajectory) { const r = await req(drive.endpoint.method, drive.endpoint.path, SH(drive, { [ah]: role }), { [drive.field]: amt }); if (r.cls !== 'accept') { (ent.invariants || []).forEach((inv) => push({ scope: ent.id, guard: inv.text, status: 'dark', detail: `valid drive ${amt} REJECTED (${r.status}) — no trajectory` })); return; } }
  const st = await req(ea.stateRead.method, ea.stateRead.path, SH(drive, { [ah]: role }));
  if (st.cls !== 'accept') { (ent.invariants || []).forEach((inv) => push({ scope: ent.id, guard: inv.text, status: 'dark', detail: `state-oracle read failed (${st.status})` })); return; }
  const T = `[${ea.trajectory.join(',')}]`;
  for (const inv of ent.invariants || []) { const v = evalInvariant(inv.ast, st.body); if (!v.ok) push({ scope: ent.id, guard: inv.text, status: 'dark', detail: v.why }); else if (v.holds) push({ scope: ent.id, guard: inv.text, status: 'realized', detail: `held on trajectory ${T} (${v.lhs}=${v.rhs}, gate-computed)` }); else push({ scope: ent.id, guard: inv.text, status: 'proven-fail', detail: `VIOLATED on ${T}: ${v.lhs} ${inv.ast.op} ${v.rhs} false` }); }
}

async function withApp(appDir, fn, push, darkGuards) {
  curPort++;
  if (DRIVER === 'app-fetch') {
    try { curApp = await loadFreshApp(); }              // FRESH instance per probe = fresh state (GAP-2 fix)
    catch (e) { darkGuards.forEach((d) => push({ ...d, status: 'dark', detail: `app-fetch load failed: ${e.message}` })); return; }
    try { await fn(); } finally { curApp = null; }
    return;
  }
  // boot.env = user-provided runtime secrets (e.g. API_TOKEN). PORT is GATE-OWNED (per-probe
  // isolation) and must WIN over any adapter-supplied PORT — discovery can't know the gate's
  // dynamic port scheme, so the gate defends it (applied AFTER boot.env).
  const env = { ...process.env, ...(adapter.boot.env || {}), PORT: String(curPort) };
  const child = spawn(adapter.boot.cmd, [`${appDir}/${adapter.boot.arg}`], { env, stdio: ['ignore', 'ignore', 'ignore'] });
  const ready = await waitReady(adapter.boot.readyTimeoutMs);
  if (!ready) { try { child.kill(); } catch {} darkGuards.forEach((d) => push({ ...d, status: 'dark', detail: 'app did not boot / unreachable' })); return; }
  try { await fn(); } finally { try { child.kill(); } catch {} await sleep(60); }
}

async function main(appDir) {
  appDirGlobal = appDir; // base dir for app-fetch module resolution (loadFreshApp)
  const results = [];
  const push = (r) => results.push(r);
  for (const op of manifest.operations || []) {
    const oa = adapter.operations[op.id]; if (!oa) continue;
    if (op.roles && op.roles.length) await withApp(appDir, () => authzProbe(op, oa, push), push, [{ scope: op.id, guard: `authz:${op.roles[0]}` }]);
    if (op.scopes && op.scopes.length) await withApp(appDir, () => scopeProbe(op, oa, push), push, [{ scope: op.id, guard: `scope:${op.scopes[0]}` }]);
    { const rc = oa.replayCases && Object.keys(oa.replayCases).length; const idem = op.idempotent && Array.isArray(op.idempotent.keys) && op.idempotent.keys.length;
      if (rc || idem) await withApp(appDir, () => replayProbe(op, oa, push), push, rc ? Object.keys(oa.replayCases).map((label) => ({ scope: op.id, guard: `replay:${label}` })) : [{ scope: op.id, guard: `idempotent:${op.idempotent.keys.join(',')}` }]); }
    if ((op.validation && op.validation.length) || (op.rule && op.rule.length)) await withApp(appDir, () => payloadProbe(op, oa, push), push, [{ scope: op.id, guard: 'payload' }]);
  }
  for (const ent of manifest.entities || []) {
    const ea = adapter.entities[ent.id]; if (!ea || !(ent.invariants && ent.invariants.length)) continue;
    await withApp(appDir, () => invariantProbe(ent, ea, push), push, (ent.invariants || []).map((inv) => ({ scope: ent.id, guard: inv.text })));
  }
  const dark = results.filter((r) => r.status === 'dark').length, fail = results.filter((r) => r.status === 'proven-fail').length, ok = results.filter((r) => r.status === 'realized').length;
  console.log(`\n=== BEHAVIOR-GATE (unified) :: ${appDir.split('/').pop()} ===`);
  console.log(`COVERAGE: exercised ${results.length - dark}/${results.length} (dark ${dark}) | realized ${ok} | proven-fail ${fail}`);
  for (const r of results) { const t = r.status === 'proven-fail' ? 'FAIL ✗' : r.status === 'realized' ? 'ok   ✓' : 'DARK ·'; console.log(`  [${t}] ${r.scope}:: ${r.guard} — ${r.detail}`); }
  console.log(`HEADLINE: ${fail > 0 ? `VIOLATIONS PROVEN (${fail})` : dark === results.length ? 'ALL DARK — NOT a clean bill' : dark > 0 ? `${dark} DARK — partial coverage` : 'no violations on tested inputs/trajectory (all exercised)'}\n`);
}

function selftest() {
  let p = 0, f = 0; const chk = (n, g, w) => { const ok = JSON.stringify(g) === JSON.stringify(w); console.log(`  ${ok ? 'PASS' : 'FAIL'} ${n}`); ok ? p++ : f++; };
  console.log('\n=== UNIFIED DISPATCH SELF-TEST (pure fns) ===');
  chk('payload cmp mappable', toConstraint({ ast: { node: 'cmp', op: '>', left: { path: ['amount'] }, right: { kind: 'number', value: 0 } } }, 'amount').mappable, true);
  chk('payload agg unmappable', toConstraint({ ast: { node: 'agg', fn: 'sum', path: ['x'] } }, 'amount').mappable, false);
  chk('invariant holds', evalInvariant({ node: 'cmp', op: '=', left: { node: 'agg', fn: 'sum', path: ['entries', 'amount'] }, right: { path: ['total'] } }, { entries: [{ amount: 10 }, { amount: 20 }], total: 30 }).holds, true);
  chk('invariant decimal tolerance', evalInvariant({ node: 'cmp', op: '=', left: { node: 'agg', fn: 'sum', path: ['e', 'a'] }, right: { path: ['t'] } }, { e: [{ a: 0.1 }, { a: 0.2 }], t: 0.3 }).holds, true);
  chk('classify 403 authz-reject', classify(403), 'authz-reject');
  chk('classify 401 authn-reject', classify(401), 'authn-reject');
  chk('scope reuses classify 403->authz-reject', classify(403), 'authz-reject');
  chk('replay accept->2xx classify', classify(200), 'accept');
  chk('replay dup-reject->4xx classify', classify(409), 'authz-reject');
  chk('driver default http-spawn', DRIVER, (adapter.boot && adapter.boot.driver) || 'http-spawn');
  console.log(`SELFTEST: ${p} pass, ${f} fail\n`); if (f) process.exitCode = 1;
}

if (process.argv.includes('--selftest')) selftest();
else if (process.argv.includes('--help') || process.argv.includes('-h') || !process.argv.slice(2).find((a) => !a.startsWith('--'))) {
  console.log(
    'behavior-gate — tier-1 davranışsal kapı (DENEYSEL · ADVISORY; "tutarlı" sertifikası vermez)\n' +
    '\nKullanım:\n' +
    '  node ${CLAUDE_SKILL_DIR}/gate.mjs <app-dir>                                  # default spec/manifest.json + adapter.json\n' +
    '  node ${CLAUDE_SKILL_DIR}/gate.mjs --spec=<manifest.json> --adapter=<adapter.json> <app-dir>\n' +
    '  node ${CLAUDE_SKILL_DIR}/gate.mjs --selftest                                 # saf-fonksiyon testleri\n' +
    '\nÇıktı: kapsama-birincil rapor — her yükümlülük realized / proven-fail / DARK (DARK ≠ pass).\n' +
    '<app-dir> ZORUNLU (çalıştırılabilir vibecoded app dizini). Verilmezse bu mesaj gösterilir.');
}
else main(process.argv.slice(2).find((a) => !a.startsWith('--')));
