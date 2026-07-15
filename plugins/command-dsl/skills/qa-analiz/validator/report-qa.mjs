#!/usr/bin/env node

// <define:__BUILD_INFO__>
var define_BUILD_INFO_default = { tool: "report-qa", srcHash: "ba5a4abc13bc", srcFiles: ["report-qa.src.mts", "report-index.src.mts"], builtAt: "2026-07-15T21:14:52.065Z" };

// report-qa.src.mts
import { readFileSync as readFileSync2, writeFileSync as writeFileSync2, mkdirSync } from "node:fs";
import { join as join2, resolve } from "node:path";

// report-index.src.mts
import { readdirSync, readFileSync, writeFileSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { deflateRawSync } from "node:zlib";
var ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_";
function encode64(data) {
  let out = "";
  for (let i = 0; i < data.length; i += 3) {
    const b1 = data[i];
    const b2 = data[i + 1] ?? 0;
    const b3 = data[i + 2] ?? 0;
    out += ALPHABET[b1 >> 2];
    out += ALPHABET[(b1 & 3) << 4 | b2 >> 4];
    out += ALPHABET[(b2 & 15) << 2 | b3 >> 6];
    out += ALPHABET[b3 & 63];
  }
  return out;
}
function encodePlantUml(text) {
  return encode64(new Uint8Array(deflateRawSync(Buffer.from(text, "utf8"), { level: 9 })));
}
var SECTIONS = ["business", "tech", "frontend", "qa"];
function walk(dir, acc = []) {
  for (const name of readdirSync(dir).sort()) {
    if (name.startsWith(".")) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}
function pumlLabel(content, rel) {
  const m = content.match(/^\s*title\s+(.+)$/m);
  return m ? m[1].trim() : rel;
}
function collect(reportsRoot2, section) {
  const dir = join(reportsRoot2, section);
  if (!existsSync(dir)) return [];
  return walk(dir).map((full) => {
    const rel = relative(reportsRoot2, full).split("\\").join("/");
    if (full.endsWith(".puml")) {
      const content = readFileSync(full, "utf8");
      return {
        rel,
        kind: "puml",
        label: pumlLabel(content, rel),
        url: `https://www.plantuml.com/plantuml/svg/${encodePlantUml(content)}`
      };
    }
    if (full.endsWith(".md") || full.endsWith(".html")) return { rel, kind: "doc", label: rel };
    return { rel, kind: "other", label: rel };
  });
}
function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function regenerateIndex(reportsRoot2, opts = {}) {
  const metaPath = join(reportsRoot2, ".report-meta.json");
  let title2 = opts.title;
  if (title2) writeFileSync(metaPath, JSON.stringify({ title: title2 }, null, 2) + "\n");
  else if (existsSync(metaPath)) {
    try {
      title2 = JSON.parse(readFileSync(metaPath, "utf8")).title;
    } catch {
    }
  }
  title2 = title2 || "\u0130nsan-Okur Raporlar";
  const note = `\xDCretim: CommandDSL playground'unun KEND\u0130 programatik \xFCrete\xE7leriyle (el yaz\u0131m\u0131 g\xF6rsel yok). .puml dosyalar\u0131 PlantUML kaynaklar\u0131d\u0131r; "g\xF6r\xFCnt\xFCle" linkleri plantuml.com sunucusunda SVG render eder.`;
  const md = [`# ${title2} \u2014 \u0130nsan-Okur Raporlar`, "", `> ${note}`, ""];
  const html = [
    `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>${escapeHtml(title2)} \u2014 Raporlar</title><style>`,
    "body{font:14px/1.6 -apple-system,system-ui,sans-serif;background:#1b1e23;color:#d6d9de;max-width:960px;margin:24px auto;padding:0 16px}",
    "h1{font-size:19px}h2{font-size:15px;margin-top:28px;border-bottom:1px solid #33363c;padding-bottom:4px}",
    "a{color:#6db3f2;text-decoration:none}a:hover{text-decoration:underline}",
    "li{margin:3px 0}code{font-family:ui-monospace,Menlo,monospace;font-size:12.5px;color:#9aa0a8}",
    ".note{color:#9aa0a8;font-size:12.5px}",
    `</style></head><body><h1>${escapeHtml(title2)} \u2014 \u0130nsan-Okur Raporlar</h1><p class="note">${escapeHtml(note)}</p>`
  ];
  for (const section of SECTIONS) {
    const entries = collect(reportsRoot2, section);
    if (entries.length === 0) continue;
    md.push("", `## ${section}`, "");
    html.push(`<h2>${section}</h2><ul>`);
    for (const e of entries) {
      if (e.kind === "puml") {
        md.push(`- \`${e.rel}\` \u2014 ${e.label} \xB7 [g\xF6r\xFCnt\xFCle](${e.url})`);
        html.push(`<li><code>${escapeHtml(e.rel)}</code> \u2014 ${escapeHtml(e.label)} \xB7 <a href="${e.url}">g\xF6r\xFCnt\xFCle</a> \xB7 <a href="${e.rel}">kaynak</a></li>`);
      } else if (e.kind === "doc") {
        md.push(`- [\`${e.rel}\`](${e.rel})`);
        html.push(`<li><a href="${e.rel}"><code>${escapeHtml(e.rel)}</code></a></li>`);
      } else {
        md.push(`- \`${e.rel}\``);
        html.push(`<li><code>${escapeHtml(e.rel)}</code></li>`);
      }
    }
    html.push("</ul>");
  }
  md.push("");
  html.push("</body></html>");
  writeFileSync(join(reportsRoot2, "index.md"), md.join("\n"));
  writeFileSync(join(reportsRoot2, "index.html"), html.join("\n"));
}

// report-qa.src.mts
var BUILD_INFO = typeof define_BUILD_INFO_default !== "undefined" ? define_BUILD_INFO_default : { tool: "report-qa", srcHash: "dev", builtAt: "dev" };
var BRANCH_KINDS = /* @__PURE__ */ new Set([
  "success",
  "validationGuard",
  "ruleGuard",
  "anonymousNotValid",
  "anonymousNotProcessable",
  "error",
  "notAuthorized",
  "callFailure"
]);
var STATUSES = /* @__PURE__ */ new Set(["covered", "waived", "uncovered"]);
function validateMerged(x, src) {
  const fail = (msg) => {
    throw new Error(`\u015Fema-d\u0131\u015F\u0131 girdi (${src}): ${msg}`);
  };
  if (typeof x !== "object" || x === null || Array.isArray(x)) fail("k\xF6k JSON nesnesi de\u011Fil");
  const m = x;
  const meta = m.meta;
  if (typeof meta !== "object" || meta === null) fail("meta yok");
  if (meta.dsl !== "qa") fail(`meta.dsl "qa" de\u011Fil: ${JSON.stringify(meta.dsl)}`);
  if (typeof meta.schemaVersion !== "number") fail("meta.schemaVersion say\u0131 de\u011Fil");
  const cov = m.coverage;
  if (typeof cov !== "object" || cov === null) fail("coverage yok");
  if (!Array.isArray(cov.operations)) fail("coverage.operations dizi de\u011Fil");
  if (!Array.isArray(cov.flows)) fail("coverage.flows dizi de\u011Fil");
  if (!Array.isArray(cov.processes)) fail("coverage.processes dizi de\u011Fil");
  for (const op of cov.operations) {
    const o = op;
    if (typeof o?.id !== "string") fail("operations[].id string de\u011Fil");
    if (!Array.isArray(o.branches)) fail(`op ${o.id}: branches dizi de\u011Fil`);
    for (const bc of o.branches) {
      const b = bc;
      const br = b?.branch;
      if (typeof br !== "object" || br === null || !BRANCH_KINDS.has(String(br.kind)))
        fail(`op ${o.id}: bilinmeyen dal kind: ${JSON.stringify(br?.kind)}`);
      if (!STATUSES.has(String(b.status)))
        fail(`op ${o.id}: bilinmeyen status: ${JSON.stringify(b.status)}`);
      if (b.status === "covered" && !Array.isArray(b.coveredBy))
        fail(`op ${o.id}: covered dalda coveredBy dizi de\u011Fil`);
    }
  }
  const groups = Array.isArray(cov.outcomes) ? ["flows", "processes", "outcomes"] : ["flows", "processes"];
  for (const grp of groups) {
    for (const r of cov[grp]) {
      const rr = r;
      if (typeof rr?.id !== "string") fail(`coverage.${grp}[].id string de\u011Fil`);
      if (rr.status !== "covered" && rr.status !== "uncovered")
        fail(`${grp} ${rr.id}: bilinmeyen status: ${JSON.stringify(rr.status)}`);
    }
  }
  return m;
}
function branchLabel(b) {
  switch (b.kind) {
    case "success":
      return "Success";
    case "validationGuard":
      return `guard "${b.id}" (validation)`;
    case "ruleGuard":
      return `guard "${b.id}" (rule)`;
    case "anonymousNotValid":
      return "NotValid (anonim)";
    case "anonymousNotProcessable":
      return "NotProcessable (anonim)";
    case "error":
      return `error ${b.id}`;
    case "notAuthorized":
      return `NotAuthorized${b.via ? ` \xB7 ${b.via}` : ""}`;
    case "callFailure":
      return `callFailure ${b.target}`;
  }
}
function coverRefLabel(ref) {
  if (ref.test !== void 0) return `test "${ref.test}"`;
  if (ref.scenario !== void 0) return `senaryo "${ref.scenario}"${ref.step !== void 0 ? ` \xB7 ad\u0131m ${ref.step + 1}` : ""}`;
  return ref.file;
}
function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function renderHtml(merged2, title2, sourceLabel) {
  const docTitle = title2 ? `${title2} \u2014 QA Kapsama` : "QA Kapsama";
  const h1 = title2 ? `${title2} \u2014 QA Kapsama Matrisi` : "QA Kapsama Matrisi";
  const h = [];
  h.push('<!doctype html><html lang="tr"><head><meta charset="utf-8">');
  h.push(`<title>${esc(docTitle)}</title><style>`);
  h.push("body{font:13px/1.5 -apple-system,system-ui,sans-serif;background:#1b1e23;color:#d6d9de;max-width:1100px;margin:24px auto;padding:0 16px}");
  h.push("h1{font-size:18px} h2{font-size:15px;margin-top:28px} code{font-family:ui-monospace,Menlo,monospace}");
  h.push(".cov-op{border:1px solid #33363c;border-radius:4px;padding:8px 10px;margin:10px 0}");
  h.push(".cov-op h3{margin:0 0 6px;font-size:12.5px;display:flex;gap:10px;align-items:baseline}");
  h.push(".cov-badge{font-size:11px;font-weight:400}.cov-badge.ok{color:#3fbf8f}.cov-badge.warn{color:#f26d6d}");
  h.push(".cov-table{border-collapse:collapse;width:100%;font-size:12px}");
  h.push(".cov-table td{padding:3px 8px 3px 0;vertical-align:top;border-top:1px solid #33363c}");
  h.push(".cov-table tr:first-child td{border-top:none}");
  h.push(".cov-branch{font-family:ui-monospace,Menlo,monospace;white-space:nowrap}.cov-info{color:#9aa0a8}");
  h.push(".chip{display:inline-block;padding:1px 8px;border-radius:9px;font-size:11px}");
  h.push(".chip-covered{background:#16825d33;color:#3fbf8f}.chip-waived{background:#cca70033;color:#d9b13b}.chip-uncovered{background:#f1434333;color:#f26d6d}");
  h.push("table.presence{border-collapse:collapse;font-size:12px}table.presence td{padding:3px 12px 3px 0;border-top:1px solid #33363c}");
  h.push(".err-band{background:#f14343;color:#fff;font-weight:600;padding:10px 14px;border-radius:4px;margin:14px 0}");
  h.push(".meta{color:#9aa0a8;font-size:11.5px;margin-top:24px;border-top:1px solid #33363c;padding-top:8px}");
  h.push("</style></head><body>");
  h.push(`<h1>${esc(h1)}</h1>`);
  if (merged2.meta.hasErrors) {
    h.push(`<p class="err-band">\u26A0 \u0130\u015EARETL\u0130 KO\u015EU \u2014 kaynak dok\xFCmanlarda ${merged2.meta.errorCount ?? "?"} hata; bu kapsama matrisi k\u0131sm\xEE AST'den hesaplanm\u0131\u015F olabilir. Sonu\xE7lara g\xFCvenmeden \xF6nce hatalar\u0131 giderin.</p>`);
  }
  h.push(`<p>Kaynak: <code>${esc(sourceLabel)}</code> (birle\u015Fik manifest). Playground "Kapsama" sekmesinin statik e\u015Fde\u011Feri.</p>`);
  let tCov = 0, tWaived = 0, tUncov = 0;
  for (const op of merged2.coverage.operations) {
    const covered = op.branches.filter((b) => b.status === "covered").length;
    const waived = op.branches.filter((b) => b.status === "waived").length;
    const uncovered = op.branches.length - covered - waived;
    tCov += covered;
    tWaived += waived;
    tUncov += uncovered;
    const badge = `${covered}/${op.branches.length} covered` + (waived ? ` \xB7 ${waived} waived` : "") + (uncovered ? ` \xB7 ${uncovered} uncovered` : "");
    h.push('<section class="cov-op">');
    h.push(`<h3><code>${esc(op.id)}</code><span class="cov-badge ${uncovered > 0 ? "warn" : "ok"}">${esc(badge)}</span></h3>`);
    h.push('<table class="cov-table">');
    for (const b of op.branches) {
      let info;
      if (b.status === "covered") info = (b.coveredBy ?? []).map(coverRefLabel).join(" \xB7 ");
      else if (b.status === "waived") info = `waive: ${b.reason ?? ""}${b.until ? ` (until ${b.until})` : ""}`;
      else info = "kapsanmad\u0131 \u2014 test/step yaz\u0131n ya da gerek\xE7eli waive edin";
      h.push(`<tr><td><span class="chip chip-${b.status}">${b.status}</span></td><td class="cov-branch">${esc(branchLabel(b.branch))}</td><td class="cov-info">${esc(info)}</td></tr>`);
    }
    h.push("</table></section>");
  }
  const realizes = [
    ...merged2.coverage.flows.map((f) => ({ ...f, kind: "flow" })),
    ...merged2.coverage.processes.map((p) => ({ ...p, kind: "process" })),
    ...(merged2.coverage.outcomes ?? []).map((o) => ({ ...o, kind: "outcome" }))
  ];
  if (realizes.length > 0) {
    h.push('<h2>Ak\u0131\u015F / S\xFCre\xE7 / Outcome presence</h2><table class="presence">');
    for (const r of realizes) {
      const info = r.status === "covered" ? (r.coveredBy ?? []).map(coverRefLabel).join(" \xB7 ") : r.kind === "outcome" ? `'satisfies' senaryosu yok \u2014 kapat\u0131labilir hedef` : `'realizes ${r.kind}' senaryosu yok`;
      h.push(`<tr><td>${r.kind}</td><td><code>${esc(r.id)}</code></td><td><span class="chip chip-${r.status}">${r.status}</span></td><td class="cov-info">${esc(info)}</td></tr>`);
    }
    h.push("</table>");
  }
  const waives = merged2.coverage.operations.flatMap((op) => op.branches.filter((b) => b.status === "waived").map((b) => ({ op: op.id, branch: branchLabel(b.branch), reason: b.reason, until: b.until })));
  if (waives.length > 0) {
    const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    const soon = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10);
    const cls = (u) => !u ? "s\xFCresiz" : u < today ? "dolmu\u015F" : u <= soon ? "s\xFCresi-yak\u0131n" : "aktif";
    const counts = { "aktif": 0, "s\xFCresi-yak\u0131n": 0, "dolmu\u015F": 0, "s\xFCresiz": 0 };
    for (const w of waives) counts[cls(w.until)]++;
    h.push(`<h2>Waiver'lar (${waives.length})</h2>`);
    h.push(`<p class="meta">${counts["aktif"]} aktif \xB7 ${counts["s\xFCresi-yak\u0131n"]} s\xFCresi-yak\u0131n \xB7 ${counts["dolmu\u015F"]} dolmu\u015F \xB7 ${counts["s\xFCresiz"]} s\xFCresiz</p>`);
    h.push('<table class="presence"><tr><th>Op</th><th>Dal</th><th>Durum</th><th>until</th><th>Gerek\xE7e</th></tr>');
    for (const w of waives) {
      h.push(`<tr><td><code>${esc(w.op)}</code></td><td>${esc(w.branch)}</td><td>${esc(cls(w.until))}</td><td>${esc(w.until ?? "\u2014")}</td><td class="cov-info">${esc(w.reason ?? "")}</td></tr>`);
    }
    h.push("</table>");
  }
  h.push(`<p><b>Toplam:</b> ${tCov} covered \xB7 ${tWaived} waived \xB7 ${tUncov} uncovered</p>`);
  const srcNote = merged2.meta.sources?.length ? ` \xB7 sources: ${merged2.meta.sources.length} dosya` : "";
  h.push(`<p class="meta">Kaynak dosya: <code>${esc(sourceLabel)}</code> \xB7 schemaVersion ${merged2.meta.schemaVersion}${srcNote} \u2014 report-qa ${BUILD_INFO.srcHash} (${BUILD_INFO.builtAt})</p>`);
  h.push("</body></html>");
  return h.join("\n");
}
function usage() {
  console.error('Kullan\u0131m: node report-qa.mjs <merged-qa.json> --reports <dizin> [--title "<Proje>"] [--quiet]');
  console.error("          node report-qa.mjs --version");
  process.exit(2);
}
var argv = process.argv.slice(2);
if (argv.includes("--version")) {
  console.log(JSON.stringify(BUILD_INFO, null, 2));
  process.exit(0);
}
var input;
var reportsRoot;
var title;
var quiet = false;
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--reports") {
    reportsRoot = argv[++i];
    if (!reportsRoot) usage();
  } else if (a === "--title") {
    title = argv[++i];
    if (!title) usage();
  } else if (a === "--quiet") quiet = true;
  else if (a.startsWith("--")) {
    console.error(`Bilinmeyen bayrak: ${a}`);
    usage();
  } else if (input === void 0) input = a;
  else {
    console.error(`Fazla arg\xFCman: ${a}`);
    usage();
  }
}
if (!input || !reportsRoot) usage();
var raw;
try {
  raw = readFileSync2(resolve(input), "utf8");
} catch (e) {
  console.error(`Girdi yolu okunamad\u0131: ${input}`);
  console.error(`  ${e instanceof Error ? e.message : String(e)}`);
  process.exit(2);
}
var merged;
try {
  merged = validateMerged(JSON.parse(raw), input);
} catch (e) {
  console.error(`Hata: girdi bozuk/\u015Fema-d\u0131\u015F\u0131 \u2014 rapor \xDCRET\u0130LMED\u0130.`);
  console.error(`  ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
}
var root = resolve(reportsRoot);
var qaDir = join2(root, "qa");
mkdirSync(qaDir, { recursive: true });
var outFile = join2(qaDir, "kapsama.html");
writeFileSync2(outFile, renderHtml(merged, title, input));
regenerateIndex(root, { title });
if (!quiet) {
  const ops = merged.coverage.operations.length;
  console.error(`\u2713 ${outFile} yaz\u0131ld\u0131 \xB7 ${ops} op \xB7 index yenilendi${merged.meta.hasErrors ? " \xB7 \u26A0 hasErrors: i\u015Faretli ko\u015Fu" : ""}`);
}
