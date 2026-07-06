import { createServer } from 'node:http';
// FAULTED (authz only): NO role check — any principal accepted. Payload (amount>0) and the
// ledger invariant are CORRECT. Demonstrates a MIXED unified report: authz proven-fail while
// payload + invariant come back realized (the value of one gate spanning all guard-types).
const PORT = Number(process.env.PORT || 7855);
const ledger = { entries: [], total: 0 };
const body = (req) => new Promise((r) => { let d = ''; req.on('data', (c) => (d += c)); req.on('end', () => { try { r(JSON.parse(d || '{}')); } catch { r({}); } }); });
const json = (res, c, o) => { res.writeHead(c, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/gift-cards') {
    // BUG: no authz check — any x-actor-role is accepted.
    const { amount } = await body(req);
    if (!(amount > 0)) return json(res, 400, { result: 'NotValid' });
    ledger.entries.push({ amount }); ledger.total += amount;
    return json(res, 201, { result: 'Success', data: { id: 'gc', amount } });
  }
  if (req.method === 'GET' && req.url === '/ledger') return json(res, 200, { entries: ledger.entries, total: ledger.total });
  json(res, 404, { result: 'NotFound' });
}).listen(PORT);
