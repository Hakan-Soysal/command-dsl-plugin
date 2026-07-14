#!/usr/bin/env node

// <define:__BUILD_INFO__>
var define_BUILD_INFO_default = { grammarVersion: "frontend-v1.x-bfeb6db74b94", grammarHash: "bfeb6db74b94", srcHash: "6bf4df0890ed", commit: "1ca2337", builtAt: "2026-07-14T00:49:36+03:00" };

// ../../../.claude/plugins/marketplaces/command-dsl-tools/plugins/command-dsl/skills/frontend-analiz/validator/report-frontend.src.mts
import { readFileSync as readFileSync2, writeFileSync as writeFileSync2, mkdirSync, readdirSync as readdirSync2, statSync as statSync2, rmSync } from "node:fs";
import { resolve, join as join2, dirname } from "node:path";

// src/playground/frontend-salt.ts
function esc(s) {
  return s.replace(/\|/g, "\u2223").replace(/[{}]/g, " ").replace(/\[/g, "(").replace(/\]/g, ")").replace(/"/g, "\u201D");
}
function sensitiveFieldMap(exp) {
  const m = /* @__PURE__ */ new Map();
  for (const u of exp?.usesInterfaces ?? []) {
    const s = /* @__PURE__ */ new Set();
    for (const f of u.out?.fields ?? []) if (f.sensitive !== void 0 || f.encrypted) s.add(f.name);
    for (const f of u.in ?? []) if (f.sensitive !== void 0 || f.encrypted) s.add(f.name);
    if (s.size) m.set(u.name, s);
  }
  return m;
}
function saltFrames(m) {
  const frames = [];
  for (const s of m.shared?.screens ?? []) {
    frames.push(screenFrame("shared", s));
  }
  for (const exp of m.experiences) {
    for (const s of exp.screens) frames.push(screenFrame(exp.name, s, exp));
  }
  return frames;
}
function screenTitle(owner, screen) {
  const params = screen.params.length ? `(${screen.params.map((p) => p.name).join(", ")})` : "";
  return `${owner} \xB7 ${screen.name}${params}`;
}
function stripLabel(owner, screen) {
  return screen.title ?? screenTitle(owner, screen);
}
function screenSaltLines(owner, screen, exp) {
  const persona = screen.persona ? `  <i>for ${esc(screen.persona)}</i>` : "";
  const lines = [];
  const legend = { conditional: false, masked: false, sensitiveByOp: sensitiveFieldMap(exp) };
  const emph = (screen.decorations ?? []).includes("emphasis") ? "\xABvurgu\xBB " : "";
  lines.push("{+");
  lines.push(`{* <b>${emph}${esc(stripLabel(owner, screen))}</b>${persona} }`);
  for (const r of screen.regions) regionLines(r, lines, legend);
  for (const w of screen.whenDeltas) lines.push(...whenLines(w));
  for (const w of exp?.whenDeltas ?? []) lines.push(...whenLines(w, true));
  if (legend.conditional) lines.push("<i>\xB0 ko\u015Fullu g\xF6r\xFCn\xFCr (visible-when \u2014 yaln\u0131z UX)</i>");
  if (legend.masked) lines.push("<i>\u2022 hassas/\u015Fifreli (tech @sensitivity/@crypto) \u2014 hedef maskeler</i>");
  lines.push("}");
  return lines;
}
function screenFrame(owner, screen, exp) {
  return {
    // Kart altyazısı teknik adı korur; görünen ad varsa yanına eklenir.
    title: screen.title ? `${screenTitle(owner, screen)} \u2014 \u201C${screen.title}\u201D` : screenTitle(owner, screen),
    salt: ["@startsalt", ...screenSaltLines(owner, screen, exp), "@endsalt"].join("\n")
  };
}
function regionLines(r, out, legend) {
  const roleTag = r.role ? ` (${r.role})` : "";
  out.push(`{^"${esc(r.name)}${roleTag}"`);
  for (const c of r.components) componentLines(c, out, legend);
  for (const child of r.children) regionLines(child, out, legend);
  for (const t of r.targetEscapes) {
    out.push(`<i>\xAB @target(${esc(t.args.map((a) => (a.name ? `${a.name}: ` : "") + String(a.value)).join(", "))}) \xBB</i>`);
  }
  if (r.components.length === 0 && r.children.length === 0 && r.targetEscapes.length === 0) {
    out.push("<i>(bo\u015F region)</i>");
  }
  out.push("}");
}
function componentLines(c, out, legend) {
  switch (c.kind) {
    case "list":
      return listLines(c, out, legend);
    case "detail":
      return detailLines(c, out, legend);
    case "value":
      out.push(`${esc(c.query.op)} | <b>\u2026</b>`);
      return;
    case "form":
      return formLines(c, out, legend);
    case "action":
      out.push(actionButton(c, legend));
      return;
    case "ext":
      out.push(`<i>\xAB @${esc(c.ext.ns)}.${esc(c.ext.name)}${c.query ? ` \u2014 ${esc(c.query.op)}` : ""} \xBB</i>`);
      return;
  }
}
function listLines(c, out, legend) {
  const fields = c.show?.fields ?? [c.query.op];
  const sens = legend.sensitiveByOp.get(c.query.op);
  const isSens = (f) => {
    const s = !!sens?.has(f);
    if (s) legend.masked = true;
    return s;
  };
  out.push("{#");
  out.push(fields.map((f) => `<b>${esc(f)}${isSens(f) ? " \u2022" : ""}</b>`).join(" | "));
  out.push(fields.map((f) => isSens(f) ? "\u2022\u2022\u2022\u2022" : "\u2026").join(" | "));
  out.push(fields.map((f) => isSens(f) ? "\u2022\u2022\u2022\u2022" : "\u2026").join(" | "));
  out.push("}");
  const extras = [];
  if (c.refreshable) extras.push("[\u27F3 yenile]");
  if (c.pagination?.intent === "pager") extras.push("[\xAB] 1 2 3 [\xBB]");
  if (c.pagination?.intent === "infinite") extras.push("<i>\u2193 kayd\u0131rd\u0131k\xE7a y\xFCklenir\u2026</i>");
  if (extras.length) out.push(extras.join(" | "));
  for (const a of c.actions) out.push(actionButton(a, legend));
  for (const w of c.whenDeltas) out.push(...whenLines(w));
}
function detailLines(c, out, legend) {
  const sens = legend.sensitiveByOp.get(c.query.op);
  for (const f of c.show?.fields ?? [c.query.op]) {
    const s = !!sens?.has(f);
    if (s) legend.masked = true;
    out.push(`${esc(f)}${s ? " \u2022" : ""} | <i>${s ? "\u2022\u2022\u2022\u2022" : "\u2026"}</i>`);
  }
  if (c.refreshable) out.push("[\u27F3 yenile]");
  for (const w of c.whenDeltas) out.push(...whenLines(w));
}
function formLines(c, out, legend) {
  const sens = legend.sensitiveByOp.get(c.submits.op);
  const fl = (f) => {
    const s = !!sens?.has(f.name);
    if (s) legend.masked = true;
    return fieldLine(f, s);
  };
  if (c.steps.length > 0) {
    out.push(`{/ ${c.steps.map((s, i) => i === 0 ? `<b>${esc(s.name)}</b>` : esc(s.name)).join(" | ")} }`);
    c.steps.forEach((s, i) => {
      if (i > 0) out.push("--");
      for (const f of s.fields) out.push(fl(f));
    });
  }
  for (const f of c.fields) out.push(fl(f));
  const mech = c.submits.mechanic ? ` (${c.submits.mechanic})` : "";
  out.push(`[G\xF6nder \u2014 ${esc(c.submits.op)}${mech}]`);
}
function fieldLine(f, sensitive) {
  const deco = new Set(f.decorations ?? []);
  const req = f.validation.required ? "*" : "";
  const name = `${esc(f.name)}${req}`;
  const label = deco.has("emphasis") ? `<b>${name}</b>` : name;
  if (deco.has("hidden")) return `<i>${name} \xABgizli\xBB</i>`;
  if (deco.has("readonly")) return `${label} | <i>\xABokunur\xBB</i>`;
  if (sensitive) return `${label} \u2022 | "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"`;
  return `${label} | "                "`;
}
function actionButton(a, legend) {
  let label = a.name;
  if (a.confirm) label += "\u2026";
  if (a.visibleWhen) {
    label += "\xB0";
    legend.conditional = true;
  }
  return `[${esc(label)}]`;
}
function whenLines(w, dim = false) {
  return w.delta.map((d) => {
    const text = d.verb === "banner" || d.verb === "badge" ? `${d.verb} "${esc(d.text)}"` : `${d.verb} ${esc(d.target)}`;
    const line = `\u26A0 <i>${esc(w.state)}</i> \u2014 ${text}`;
    return dim ? `<i>${line}</i>` : line;
  });
}

// src/playground/frontend-flow.ts
function escLabel(s) {
  return s.replace(/[:\n]/g, " ").replace(/"/g, "\u201D");
}
function flowDiagrams(m) {
  const sharedScreens = new Map((m.shared?.screens ?? []).map((s) => [s.name, s]));
  return m.experiences.filter((exp) => exp.screens.length > 0).map((exp) => storyboard(exp, sharedScreens));
}
function storyboard(exp, sharedScreens) {
  const localNames = new Set(exp.screens.map((s) => s.name));
  const edges = [];
  const usedShared = /* @__PURE__ */ new Set();
  const addEdge = (e) => {
    if (!edges.some((x) => x.from === e.from && x.to === e.to && x.label === e.label && x.style === e.style)) {
      edges.push(e);
    }
    if (!localNames.has(e.to) && sharedScreens.has(e.to)) usedShared.add(e.to);
    if (!localNames.has(e.from) && sharedScreens.has(e.from)) usedShared.add(e.from);
  };
  for (const screen of exp.screens) collectScreenEdges(screen, addEdge);
  for (const nav of exp.navigation) addEdge({ from: nav.from, to: nav.to, label: "nav", style: "solid" });
  for (const flow of exp.flows) {
    const tag = flow.realizes ? `\xAB${flow.name}\xBB \u21D0 ${flow.realizes}` : `\xAB${flow.name}\xBB`;
    for (let i = 0; i + 1 < flow.steps.length; i++) {
      addEdge({ from: flow.steps[i], to: flow.steps[i + 1], label: `${tag} ${i + 1}/${flow.steps.length - 1}`, style: "bold" });
    }
    if (flow.steps.length === 1) {
      addEdge({ from: flow.steps[0], to: flow.steps[0], label: tag, style: "bold" });
    }
  }
  const defaultEdges = exp.resultDefaults.filter((d) => d.handler.verb === "navigate").map((d) => ({ result: d.result, to: d.handler.screen }));
  for (const d of defaultEdges) {
    addEdge({ from: "__app__", to: d.to, label: d.result, style: "dashed" });
  }
  const lines = [];
  lines.push("@startuml");
  lines.push("left to right direction");
  lines.push("skinparam rectangleBorderColor #888888");
  lines.push("skinparam rectangleBackgroundColor White");
  lines.push(`title ${escLabel(exp.name)} \u2014 ekran ak\u0131\u015F\u0131`);
  for (const screen of exp.screens) lines.push(...screenRect(exp.name, screen, exp));
  for (const name of usedShared) {
    lines.push(...screenRect("shared", sharedScreens.get(name)));
    lines.push(`note bottom of ${name} : Success \u2192 geldi\u011Fi ekrana d\xF6ner (interrupt/resume)`);
  }
  if (defaultEdges.length > 0) {
    lines.push('rectangle "\u2200 ekran\\n(app-default)" as __app__ #eeeeee');
  }
  for (const e of edges) {
    const arrow = e.style === "dashed" ? "-[dashed]->" : e.style === "bold" ? "-[bold]->" : "-->";
    lines.push(`${e.from} ${arrow} ${e.to} : ${escLabel(e.label)}`);
  }
  lines.push("@enduml");
  return { title: `${exp.name} \u2014 ekran ak\u0131\u015F\u0131`, uml: lines.join("\n") };
}
function screenRect(owner, screen, exp, alias = screen.name) {
  return [
    `rectangle ${alias} [`,
    "{{salt",
    ...screenSaltLines(owner, screen, exp),
    "}}",
    "]"
  ];
}
function businessFlowDiagram(m, flowId, flowOps) {
  const flowSet = new Set(flowOps);
  const sharedScreens = m.shared?.screens ?? [];
  const sharedUses = new Map((m.shared?.usesInterfaces ?? []).map((u) => [u.name, u.realizes?.op ?? null]));
  const nodes = [];
  const aliasOf = /* @__PURE__ */ new Map();
  const offered = /* @__PURE__ */ new Set();
  const collectNodes = (owner, screens, uses, exp) => {
    for (const screen of screens) {
      const ops = [...new Set(screenBizOps(screen, uses))].filter((o) => flowSet.has(o));
      if (ops.length === 0) continue;
      ops.forEach((o) => offered.add(o));
      const alias = `${owner}_${screen.name}`;
      nodes.push({ owner, screen, exp, alias, ops });
      aliasOf.set(`${owner}/${screen.name}`, alias);
    }
  };
  for (const exp of m.experiences) {
    const uses = new Map(sharedUses);
    for (const u of exp.usesInterfaces) uses.set(u.name, u.realizes?.op ?? null);
    collectNodes(exp.name, exp.screens, uses, exp);
  }
  collectNodes("shared", sharedScreens, sharedUses);
  const edges = [];
  for (const exp of m.experiences) {
    const localNames = new Set(exp.screens.map((s) => s.name));
    const resolveAlias = (name) => localNames.has(name) ? aliasOf.get(`${exp.name}/${name}`) : aliasOf.get(`shared/${name}`);
    const add = (e) => {
      const from = resolveAlias(e.from);
      const to = resolveAlias(e.to);
      if (!from || !to) return;
      const mapped = { ...e, from, to };
      if (!edges.some((x) => x.from === mapped.from && x.to === mapped.to && x.label === mapped.label && x.style === mapped.style)) {
        edges.push(mapped);
      }
    };
    for (const screen of exp.screens) collectScreenEdges(screen, add);
    for (const nav of exp.navigation) add({ from: nav.from, to: nav.to, label: "nav", style: "solid" });
    for (const flow of exp.flows) {
      if (flow.realizes !== flowId) continue;
      for (let i = 0; i + 1 < flow.steps.length; i++) {
        add({ from: flow.steps[i], to: flow.steps[i + 1], label: `\xAB${flow.name}\xBB ${i + 1}/${flow.steps.length - 1}`, style: "bold" });
      }
    }
  }
  const missing = flowOps.filter((o) => !offered.has(o));
  const lines = [];
  lines.push("@startuml");
  lines.push("left to right direction");
  lines.push("skinparam rectangleBorderColor #888888");
  lines.push("skinparam rectangleBackgroundColor White");
  lines.push(`title ${escLabel(flowId)} \u2014 i\u015F-ak\u0131\u015F\u0131 \xD7 ekranlar`);
  for (const n of nodes) {
    lines.push(...screenRect(n.owner, n.screen, n.exp, n.alias));
    lines.push(`note bottom of ${n.alias} : ${escLabel("\u25B8 " + n.ops.join(" \xB7 "))}`);
  }
  for (const op of missing) {
    lines.push(`rectangle "\u26A0 ${escLabel(op)}\\nhi\xE7bir ekran sunmuyor" as uncovered_${op} #FFE0E0`);
  }
  if (nodes.length === 0 && missing.length === 0) {
    lines.push(`rectangle "flow '${escLabel(flowId)}' i\xE7in op bulunamad\u0131" as empty #eeeeee`);
  }
  for (const e of edges) {
    const arrow = e.style === "dashed" ? "-[dashed]->" : e.style === "bold" ? "-[bold]->" : "-->";
    lines.push(`${e.from} ${arrow} ${e.to} : ${escLabel(e.label)}`);
  }
  lines.push("@enduml");
  return { title: `${flowId} \u2014 i\u015F-ak\u0131\u015F\u0131 \xD7 ekranlar`, uml: lines.join("\n") };
}
function screenBizOps(screen, uses) {
  const out = [];
  for (const c of screenComponents(screen)) {
    if (c.kind === "action") {
      if (c.command) {
        const biz = uses.get(c.command.op);
        if (biz) out.push(biz);
      }
    } else if (c.kind === "form") {
      const biz = uses.get(c.submits.op);
      if (biz) out.push(biz);
      if (c.loads) {
        const lbiz = uses.get(c.loads.op);
        if (lbiz) out.push(lbiz);
      }
    } else if (c.kind !== "ext") {
      const biz = uses.get(c.query.op);
      if (biz) out.push(biz);
    }
  }
  return out;
}
function screenComponents(s) {
  const out = [];
  const walk2 = (regions) => {
    for (const r of regions) {
      for (const c of r.components) {
        out.push(c);
        if (c.kind === "list" || c.kind === "detail") out.push(...c.actions);
      }
      walk2(r.children);
    }
  };
  walk2(s.regions);
  return out;
}
function collectScreenEdges(screen, addEdge) {
  const from = screen.name;
  for (const c of screenComponents(screen)) {
    if (c.kind === "action") actionEdges(from, c, addEdge);
    else if (c.kind === "form") formEdges(from, c, addEdge);
    if (c.kind === "list" || c.kind === "detail") {
      for (const ev of c.uiEvents) uiEventEdges(from, ev, addEdge, c);
    }
  }
  for (const ev of screen.uiEvents) uiEventEdges(from, ev, addEdge);
}
function actionEdges(from, a, addEdge) {
  if (a.navigation) addEdge({ from, to: a.navigation.screen, label: `[${a.name}]`, style: "solid" });
  for (const h of a.resultHandlers) {
    if (h.handler.verb === "navigate") {
      addEdge({ from, to: h.handler.screen, label: `${a.name} \xB7 ${h.result}`, style: "solid" });
    }
  }
}
function formEdges(from, f, addEdge) {
  for (const h of f.resultHandlers) {
    if (h.handler.verb === "navigate") {
      addEdge({ from, to: h.handler.screen, label: `${f.submits.op} \xB7 ${h.result}`, style: "solid" });
    }
  }
}
function uiEventEdges(from, ev, addEdge, owner) {
  const t = ev.trigger;
  let trigger;
  if (t.kind === "timer" || t.kind === "interval") trigger = `${t.kind} ${t.value}${t.unit}`;
  else if (t.kind === "activate" || t.kind === "secondary") {
    const target = t.target ?? (owner ? owner.query.op : "");
    trigger = `${t.kind}${target ? `(${target})` : ""}`;
  } else trigger = t.kind;
  for (const a of ev.actions) {
    if (a.do === "navigate") addEdge({ from, to: a.screen, label: trigger, style: "solid" });
  }
}

// ../../../.claude/plugins/marketplaces/command-dsl-tools/plugins/command-dsl/skills/frontend-analiz/validator/report-index.src.mts
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
  let title = opts.title;
  if (title) writeFileSync(metaPath, JSON.stringify({ title }, null, 2) + "\n");
  else if (existsSync(metaPath)) {
    try {
      title = JSON.parse(readFileSync(metaPath, "utf8")).title;
    } catch {
    }
  }
  title = title || "\u0130nsan-Okur Raporlar";
  const note = `\xDCretim: CommandDSL playground'unun KEND\u0130 programatik \xFCrete\xE7leriyle (el yaz\u0131m\u0131 g\xF6rsel yok). .puml dosyalar\u0131 PlantUML kaynaklar\u0131d\u0131r; "g\xF6r\xFCnt\xFCle" linkleri plantuml.com sunucusunda SVG render eder.`;
  const md = [`# ${title} \u2014 \u0130nsan-Okur Raporlar`, "", `> ${note}`, ""];
  const html = [
    `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>${escapeHtml(title)} \u2014 Raporlar</title><style>`,
    "body{font:14px/1.6 -apple-system,system-ui,sans-serif;background:#1b1e23;color:#d6d9de;max-width:960px;margin:24px auto;padding:0 16px}",
    "h1{font-size:19px}h2{font-size:15px;margin-top:28px;border-bottom:1px solid #33363c;padding-bottom:4px}",
    "a{color:#6db3f2;text-decoration:none}a:hover{text-decoration:underline}",
    "li{margin:3px 0}code{font-family:ui-monospace,Menlo,monospace;font-size:12.5px;color:#9aa0a8}",
    ".note{color:#9aa0a8;font-size:12.5px}",
    `</style></head><body><h1>${escapeHtml(title)} \u2014 \u0130nsan-Okur Raporlar</h1><p class="note">${escapeHtml(note)}</p>`
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

// ../../../.claude/plugins/marketplaces/command-dsl-tools/plugins/command-dsl/skills/frontend-analiz/validator/report-frontend.src.mts
function usage() {
  console.error(`Kullan\u0131m: node report-frontend.mjs <experience.json\u2026|dizin> [--flows <operations.json>] --reports <dizin> [--title "<Proje>"] [--quiet]

  <dosya|dizin>      *.experience.json manifest'leri; dizinler recursive taran\u0131r
  --flows <dosya>    business operations.json \u2192 \u0130\u015F-Ak\u0131\u015F\u0131 g\xF6r\xFCn\xFCm\xFC (bizflows/) \xFCretilir
  --reports <dizin>  rapor k\xF6k\xFC; ara\xE7 <dizin>/frontend/** yazar + index.md/html'i yeniler
  --title "<Proje>"  index ba\u015Fl\u0131\u011F\u0131 (reports/.report-meta.json'a kal\u0131c\u0131la\u015F\u0131r)
  --quiet            bilgi sat\u0131rlar\u0131 bast\u0131r\u0131l\u0131r
  --version          g\xF6m\xFCl\xFC BUILD_INFO (grammar + src hash \u2014 bayatl\u0131k tespiti)

\xC7\u0131k\u0131\u015F kodu: 0 = \xFCretildi \xB7 1 = girdi bozuk (H\u0130\xC7B\u0130R rapor yaz\u0131lmaz \u2014 gate) \xB7 2 = kullan\u0131m hatas\u0131.`);
}
function parseArgs(argv) {
  const args2 = { inputs: [], quiet: false, version: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--flows" || a === "--reports" || a === "--title") {
      const v = argv[++i];
      if (v === void 0) {
        console.error(`Hata: ${a} bir de\u011Fer ister.`);
        usage();
        process.exit(2);
      }
      if (a === "--flows") args2.flows = v;
      else if (a === "--reports") args2.reports = v;
      else args2.title = v;
    } else if (a === "--quiet") args2.quiet = true;
    else if (a === "--version") args2.version = true;
    else if (a === "--help" || a === "-h") {
      usage();
      process.exit(0);
    } else if (a.startsWith("--")) {
      console.error(`Hata: bilinmeyen se\xE7enek: ${a}`);
      usage();
      process.exit(2);
    } else args2.inputs.push(a);
  }
  return args2;
}
var args = parseArgs(process.argv.slice(2));
if (args.version) {
  console.log(JSON.stringify(define_BUILD_INFO_default, null, 2));
  process.exit(0);
}
if (args.inputs.length === 0 || !args.reports) {
  usage();
  process.exit(2);
}
function collectManifestPaths(paths) {
  const out = [];
  const visit = (p) => {
    const st = statSync2(p);
    if (st.isDirectory()) {
      for (const e of readdirSync2(p).sort()) {
        if (e === "node_modules" || e.startsWith(".")) continue;
        const full = join2(p, e);
        if (statSync2(full).isDirectory()) visit(full);
        else if (e.endsWith(".experience.json")) out.push(resolve(full));
      }
    } else {
      out.push(resolve(p));
    }
  };
  for (const p of paths) visit(p);
  return [...new Set(out)].sort();
}
var manifestPaths;
try {
  manifestPaths = collectManifestPaths(args.inputs);
  if (args.flows) statSync2(args.flows);
} catch (e) {
  console.error(`Hata: yol bulunamad\u0131: ${e.path ?? args.inputs.join(", ")}`);
  process.exit(2);
}
if (manifestPaths.length === 0) {
  console.error("Hi\xE7 .experience.json dosyas\u0131 bulunamad\u0131.");
  process.exit(2);
}
function fail(msg) {
  console.error(`\u2717 ${msg}`);
  console.error("\u2717 girdi bozuk \u2014 H\u0130\xC7B\u0130R rapor yaz\u0131lmad\u0131 (gate).");
  process.exit(1);
}
var manifests = [];
for (const p of manifestPaths) {
  let raw;
  try {
    raw = readFileSync2(p, "utf8");
  } catch (e) {
    fail(`okunamad\u0131: ${p} \u2014 ${e.message}`);
  }
  let json;
  try {
    json = JSON.parse(raw);
  } catch (e) {
    fail(`bozuk JSON: ${p} \u2014 ${e.message}`);
  }
  const m = json;
  if (typeof m !== "object" || m === null || !Array.isArray(m.experiences)) {
    fail(`experience manifest'i de\u011Fil (experiences[] yok): ${p}`);
  }
  manifests.push({ path: p, m });
}
var bizFlows;
if (args.flows) {
  let raw;
  try {
    raw = readFileSync2(args.flows, "utf8");
  } catch (e) {
    fail(`okunamad\u0131: ${args.flows} \u2014 ${e.message}`);
  }
  let json;
  try {
    json = JSON.parse(raw);
  } catch (e) {
    fail(`bozuk JSON: ${args.flows} \u2014 ${e.message}`);
  }
  if (typeof json !== "object" || json === null || Array.isArray(json)) {
    fail(`operations.json de\u011Fil (nesne bekleniyordu): ${args.flows}`);
  }
  const ops = json.operations ?? [];
  bizFlows = /* @__PURE__ */ new Map();
  for (const op of ops) {
    for (const f of op.flows ?? []) {
      const list = bizFlows.get(f) ?? [];
      list.push(op.id);
      bizFlows.set(f, list);
    }
  }
}
function slugify(s) {
  return s.replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase();
}
function uniq(slug, used) {
  let out = slug || "adsiz";
  for (let n = 2; used.has(out); n++) out = `${slug}-${n}`;
  used.add(out);
  return out;
}
var files = /* @__PURE__ */ new Map();
var usedWf = /* @__PURE__ */ new Set();
var usedFlow = /* @__PURE__ */ new Set();
var usedBiz = /* @__PURE__ */ new Set();
var wfCount = 0;
var flowCount = 0;
var bizCount = 0;
try {
  for (const { m } of manifests) {
    for (const f of saltFrames(m)) {
      files.set(`wireframes/${uniq(slugify(f.title), usedWf)}.puml`, f.salt + "\n");
      wfCount++;
    }
    for (const d of flowDiagrams(m)) {
      files.set(`flows/${uniq(slugify(d.title), usedFlow)}.puml`, d.uml + "\n");
      flowCount++;
    }
    if (bizFlows) {
      for (const flowId of [...bizFlows.keys()].sort()) {
        const d = businessFlowDiagram(m, flowId, bizFlows.get(flowId) ?? []);
        files.set(`bizflows/${uniq(slugify(flowId), usedBiz)}.puml`, d.uml + "\n");
        bizCount++;
      }
    }
  }
} catch (e) {
  fail(`rapor \xFCretilemedi: ${e instanceof Error ? e.message : String(e)}`);
}
if (!bizFlows) {
  console.log("Not: --flows <operations.json> verilmedi \u2014 \u0130\u015F-Ak\u0131\u015F\u0131 g\xF6r\xFCn\xFCm\xFC (bizflows/) atland\u0131.");
} else if (bizFlows.size === 0) {
  console.log("Not: operations.json hi\xE7 flow \xFCyeli\u011Fi ta\u015F\u0131m\u0131yor (operations[].flows bo\u015F) \u2014 bizflows/ atland\u0131.");
}
var reportsRoot = resolve(args.reports);
var frontendRoot = join2(reportsRoot, "frontend");
rmSync(frontendRoot, { recursive: true, force: true });
for (const [rel, content] of files) {
  const target = join2(frontendRoot, rel);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync2(target, content);
}
regenerateIndex(reportsRoot, { title: args.title });
if (!args.quiet) {
  console.error(
    `\u2713 ${frontendRoot}: ${wfCount} wireframe \xB7 ${flowCount} flow` + (bizFlows ? ` \xB7 ${bizCount} bizflow` : "") + ` \xB7 index.md + index.html yenilendi`
  );
  console.error(`  \xFCrete\xE7: playground frontend-salt/frontend-flow \xB7 grammar ${define_BUILD_INFO_default.grammarHash} \xB7 src ${define_BUILD_INFO_default.srcHash}`);
}
process.exit(0);
