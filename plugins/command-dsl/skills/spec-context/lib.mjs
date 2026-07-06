// spec-context lib — PURE (no I/O). manifest.json -> obligation IR -> CLAUDE.md text.
// Emits EXACTLY the obligations behavior-gate/gate.mjs probes (roles, validation/rule,
// invariants) plus statically-visible authz/error obligations (scopes, ownership, abac,
// throws, visibility). Deterministic: no timestamps, no Math.random — byte-stable per input.
import { createHash } from 'node:crypto';

export const TOOL_STAMP = 'spec-context/1'; // CONSTANT — bump only on renderer format change. NEVER a timestamp.

export function sha256(s) { return createHash('sha256').update(s, 'utf8').digest('hex'); }

const isRecord = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v, d = '') => (typeof v === 'string' ? v : d);
const strArr = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []);
const guardText = (v) => (Array.isArray(v) ? v.filter(isRecord).map((g) => str(g.text)).filter(Boolean) : []);

export function extractObligations(m) {
  if (!isRecord(m)) throw new Error('manifest kök JSON nesnesi değil');
  if (!Array.isArray(m.operations)) throw new Error('operations dizi değil — manifest.json (emit-manifest çıktısı) mı?');
  if (!Array.isArray(m.entities)) throw new Error('entities dizi değil');
  const ops = m.operations.filter(isRecord).map((o) => ({
    id: str(o.id), module: str(o.module) || '(modülsüz)', visibility: str(o.visibility),
    roles: strArr(o.roles), scopes: strArr(o.scopes),
    ownership: typeof o.ownership === 'string' ? o.ownership : null,
    abacPresent: isRecord(o.abac), validation: guardText(o.validation),
    rule: guardText(o.rule), throws: strArr(o.throws),
  }));
  const entities = m.entities.filter(isRecord).map((e) => ({
    id: str(e.id), module: str(e.module) || '(modülsüz)',
    invariants: Array.isArray(e.invariants) ? e.invariants.filter(isRecord).map((i) => str(i.text)).filter(Boolean) : [],
  }));
  return { ops, entities };
}

export function renderClaudeMd({ ops, entities }, header) {
  const L = [header, '',
    '# Spec-Context — Backend Yükümlülükleri',
    '',
    '> Bu dosya Teknik Analiz `manifest.json`\'undan **deterministik** üretildi (spec-context). Aşağıdaki',
    '> backend operasyonlarını gerçeklerken bu yükümlülükleri **ZORUNLU** kıl. Bunlar behavior-gate\'in AYNI',
    '> manifest\'ten denetlediği kurallardır — spec değişirse ikisini **BİRLİKTE** yeniden üret. Elle DÜZENLEME.',
    ''];
  const byMod = new Map();
  for (const op of ops) { if (!byMod.has(op.module)) byMod.set(op.module, []); byMod.get(op.module).push(op); }
  for (const [mod, list] of byMod) {
    const cards = list.map(opCard).filter(Boolean);
    if (!cards.length) continue;
    L.push(`## Modül: ${mod}`, '');
    for (const c of cards) L.push(...c, '');
  }
  const entWithInv = entities.filter((e) => e.invariants.length);
  if (entWithInv.length) {
    L.push('## Entity Invariant\'ları (app state\'i HER ZAMAN sağlamalı)', '');
    for (const e of entWithInv) { L.push(`### ${e.id}`); for (const t of e.invariants) L.push(`- \`${t}\` — bu özelliği daima koru`); L.push(''); }
  }
  // OAuth scope kurulumu — RUNTIME rehberi (yalnız scope-sınırlı op varsa). Manifest sağlayıcı-nötr
  // kalır; provider/secret/PKCE runtime kararıdır. Statik metin (byte-stable); ekran-yolu GÖMÜLMEZ.
  if (ops.some((o) => o.scopes.length)) {
    L.push(
      '## OAuth Scope Kurulumu (RUNTIME — implementasyon anında; spec sağlayıcı-nötr)', '',
      '> Yukarıdaki bazı operasyonlar **scope** ile yetki-sınırlı. Scope\'lar **çalışma-zamanında bir OAuth',
      '> sağlayıcısı** ile uygulanır — bu bir implementasyon/runtime kararıdır; spec (manifest) bunu KASITLI',
      '> olarak sağlayıcı-nötr bırakır. Vibecode/çalıştırma anında:', '',
      '- Bir **OAuth provider** seç (ihtiyacına göre; bu spec belirli bir provider dayatmaz).',
      '- `client id` / `client secret` değerlerini provider\'ının **GÜNCEL** dökümanından al — bu dosya',
      '  provider konsol-ekranlarını KASITLI olarak tarif etmez (konsollar sık değişir → bayat-yönlendirme',
      '  riski). Güncel dökümana bak (gerekirse Context7/web ile çek). Secret\'ı **repoya COMMIT ETME**',
      '  (env / secret-store).',
      '- **PKCE**\'yi provider\'ının önerdiği gibi ayarla (SPA/native istemcilerde genelde PKCE-açık).',
      '- Scope-sınırlı işaretlenen her operasyonda, runtime\'da **token\'ın gerekli scope\'a sahip olduğunu',
      '  doğrula**; yoksa **reddet** (bu, yukarıdaki "Yetki (ZORUNLU zorla)" satırının runtime karşılığıdır).',
      '');
  }
  return L.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd() + '\n';
}
function opCard(op) {
  const authz = [], lines = [];
  if (op.roles.length) authz.push(`yalnız roller: ${op.roles.join(', ')}`);
  if (op.scopes.length) authz.push(`scope: ${op.scopes.join(', ')}`);
  if (op.ownership) authz.push(`sahiplik: ${op.ownership}`);
  if (op.abacPresent) authz.push('abac permit kuralı var (manifest\'e uy)');
  const guards = [...op.validation, ...op.rule];
  // yükümlülüğü olmayan op'u atla
  if (!authz.length && !guards.length && !op.throws.length) return null;
  lines.push(`### ${op.id}${op.visibility ? ` (${op.visibility})` : ''}`);
  if (authz.length) lines.push(`- **Yetki (ZORUNLU zorla):** ${authz.join(' · ')}`);
  if (guards.length) { lines.push('- **Girdi guard\'ları (ihlal → ZORUNLU reddet):**'); for (const g of guards) lines.push(`  - \`${g}\``); }
  if (op.throws.length) lines.push(`- **Fırlatılabilir hatalar:** ${op.throws.map((t) => `\`${t}\``).join(' · ')}`);
  return lines;
}

export function provenanceHeader(srcPath, hash) {
  return `<!-- GENERATED by spec-context — DO NOT EDIT · source: ${srcPath} · sha256:${hash} · ${TOOL_STAMP} -->`;
}

function selftest() {
  let p = 0, f = 0; const chk = (n, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); console.log(`  ${ok ? 'PASS' : 'FAIL'} ${n}`); ok ? p++ : f++; };
  const m = { operations: [
    { id: 'IssueGiftCard', module: 'GC', visibility: 'exposed', roles: ['System'], scopes: [], abac: null, validation: [{ text: 'amount > 0' }], rule: [], throws: ['budgetExceeded'] },
    { id: 'Ping', module: 'GC', roles: [], validation: [], rule: [], throws: [] } ], // yükümlülüksüz → atlanmalı
    entities: [{ id: 'Ledger', module: 'GC', invariants: [{ text: 'sum of entries.amount = total' }] }] };
  const ir = extractObligations(m);
  chk('extract op count', ir.ops.length, 2);
  chk('extract roles', ir.ops[0].roles, ['System']);
  chk('extract validation text', ir.ops[0].validation, ['amount > 0']);
  chk('extract invariant', ir.entities[0].invariants, ['sum of entries.amount = total']);
  const md = renderClaudeMd(ir, provenanceHeader('x/manifest.json', 'abc'));
  chk('render has issue op', md.includes('### IssueGiftCard'), true);
  chk('render SKIPS obligationless op', md.includes('### Ping'), false);           // negatif
  chk('render imperative reject', md.includes('ZORUNLU reddet'), true);
  chk('render invariant section', md.includes('sum of entries.amount = total'), true);
  chk('render NO timestamp/manifest-dump', /serving|pagination|builtAt|\d{4}-\d\d-\d\dT/.test(md), false); // negatif: dökme/timestamp yok
  chk('header no timestamp', /\d{4}-\d\d-\d\dT/.test(provenanceHeader('a', 'b')), false);
  // OAuth scope kurulumu: scope YOK (gift-card fixture) → bölüm YOK (negatif)
  chk('NO scope section when no scopes', md.includes('OAuth Scope Kurulumu'), false);
  // scope VAR → bölüm çıkar (pozitif) + provider-nötr (belirli provider adı YOK) + secret-commit uyarısı
  const mScoped = { operations: [{ id: 'Pay', module: 'Bil', roles: ['User'], scopes: ['payments:write'], validation: [], rule: [], throws: [] }], entities: [] };
  const mdScoped = renderClaudeMd(extractObligations(mScoped), provenanceHeader('x', 'y'));
  chk('scope section appears when scoped', mdScoped.includes('OAuth Scope Kurulumu'), true);
  chk('scope section names NO specific provider', /Auth0|Okta|Cognito|Keycloak/.test(mdScoped), false); // sağlayıcı-nötr
  chk('scope section warns commit-etme', mdScoped.includes('COMMIT ETME'), true);
  chk('scope section byte-stable', renderClaudeMd(extractObligations(mScoped), provenanceHeader('x', 'y')) === mdScoped, true);
  // negatif: bozuk manifest throw
  let threw = false; try { extractObligations({ operations: 'x' }); } catch { threw = true; }
  chk('extract throws on malformed', threw, true);
  console.log(`SELFTEST: ${p} pass, ${f} fail`); if (f) process.exitCode = 1;
}
if (process.argv.includes('--selftest')) selftest();
