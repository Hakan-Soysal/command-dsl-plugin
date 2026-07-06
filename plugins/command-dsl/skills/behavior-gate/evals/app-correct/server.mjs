import { createServer } from 'node:http';
// CORRECT: authz (System only), payload (amount>0), invariant (ledger total == sum of entries).
const PORT = Number(process.env.PORT || 7855);
const ledger = { entries: [], total: 0 };
const body = (req) => new Promise((r) => { let d = ''; req.on('data', (c) => (d += c)); req.on('end', () => { try { r(JSON.parse(d || '{}')); } catch { r({}); } }); });
const json = (res, c, o) => { res.writeHead(c, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/gift-cards') {
    if (req.headers['x-actor-role'] !== 'System') return json(res, 403, { result: 'NotAuthorized' });   // authz
    const { amount } = await body(req);
    if (!(amount > 0)) return json(res, 400, { result: 'NotValid' });                                   // payload
    ledger.entries.push({ amount }); ledger.total += amount;                                             // invariant maintained
    return json(res, 201, { result: 'Success', data: { id: 'gc', amount } });
  }
  if (req.method === 'GET' && req.url === '/ledger') return json(res, 200, { entries: ledger.entries, total: ledger.total });
  json(res, 404, { result: 'NotFound' });
}).listen(PORT);
