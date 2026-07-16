#!/usr/bin/env node

// <define:__BUILD_INFO__>
var define_BUILD_INFO_default = { tool: "report-tech", srcHash: "1c06677f20fc", commit: "2b683d7", builtAt: "2026-07-16T21:59:41+03:00" };

// ../DSL Business Analyses/command-dsl-plugin/plugins/command-dsl/skills/teknik-analiz/validator/report-tech.src.mts
import { readFileSync as readFileSync2, writeFileSync as writeFileSync2, mkdirSync, rmSync } from "node:fs";
import { resolve, join as join2, dirname } from "node:path";

// src/generator/naming.ts
function kebab(s) {
  return s.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

// src/tech-report/common.ts
function isRecord(v) {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function str(v, dflt = "") {
  return typeof v === "string" ? v : dflt;
}
function strOrNull(v) {
  return typeof v === "string" ? v : null;
}
function strArr(v) {
  return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
}
function guardArr(v) {
  if (!Array.isArray(v)) return [];
  return v.filter(isRecord).map((g) => ({ text: str(g.text), guardRef: strOrNull(g.guardRef) }));
}
function paramArr(v) {
  if (!Array.isArray(v)) return [];
  return v.filter(isRecord).map((p) => ({ name: str(p.name), type: str(p.type), collection: p.collection === true }));
}
function opsOf(m) {
  if (!Array.isArray(m.operations)) return [];
  return m.operations.filter(isRecord).map((o) => {
    const sig = isRecord(o.signature) ? o.signature : {};
    const acc = isRecord(o.access) ? o.access : {};
    const cons = isRecord(o.consistency) ? o.consistency : {};
    const idem = isRecord(o.idempotent) ? { keys: strArr(o.idempotent.keys) } : null;
    const pag = isRecord(o.pagination) ? {
      strategy: str(o.pagination.strategy),
      keys: Array.isArray(o.pagination.keys) ? o.pagination.keys.filter(isRecord).map((k) => ({ field: str(k.field), direction: str(k.direction) })) : [],
      size: typeof o.pagination.size === "number" ? o.pagination.size : null
    } : null;
    return {
      id: str(o.id),
      module: str(o.module),
      visibility: str(o.visibility),
      realizes: strOrNull(o.realizes),
      signature: { params: paramArr(sig.params), returns: str(sig.returns) },
      serving: Array.isArray(o.serving) ? o.serving.filter(isRecord).map((s) => ({ protocol: str(s.protocol), raw: str(s.raw) })) : [],
      roles: strArr(o.roles),
      ownership: strOrNull(o.ownership),
      abac: isRecord(o.abac) ? o.abac : null,
      scopes: strArr(o.scopes),
      access: { reads: strArr(acc.reads), creates: strArr(acc.creates), updates: strArr(acc.updates), deletes: strArr(acc.deletes) },
      validation: guardArr(o.validation),
      rule: guardArr(o.rule),
      throws: strArr(o.throws),
      emits: strArr(o.emits),
      idempotent: idem,
      consistency: { risk: strOrNull(cons.risk), mode: strOrNull(cons.mode) },
      pagination: pag,
      note: strOrNull(o.note),
      businessNote: strOrNull(o.businessNote)
    };
  });
}
function boundaryOf(list) {
  return list.filter(isRecord).map((b) => ({ name: str(b.name) })).filter((b) => b.name !== "");
}
function opModuleIndex(ops) {
  const map = /* @__PURE__ */ new Map();
  for (const op of ops) {
    if (op.id && !map.has(op.id)) map.set(op.id, op.module);
  }
  return map;
}
function slugOf(name) {
  const k = kebab(name).replace(/[^a-z0-9-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return k || "adsiz";
}
function pumlId(prefix, name) {
  return `${prefix}_${name.replace(/[^A-Za-z0-9]+/g, "_")}`;
}
function escPuml(s) {
  return s.replace(/"/g, "'").replace(/[\r\n]+/g, " ");
}
function escPumlLabel(s) {
  return s.replace(/[\r\n]+/g, " ").replace(/"/g, "'");
}
function escMd(s) {
  return s.replace(/\|/g, "\\|").replace(/[\r\n]+/g, " ");
}
function mdCode(s) {
  const t = s.replace(/`/g, "'");
  return t ? `\`${escMd(t)}\`` : "\u2014";
}
function mdWarnBanner(m) {
  if (!m.meta?.hasErrors) return [];
  return [
    `> \u26A0 **\u0130\u015EARETL\u0130 KO\u015EU** \u2014 manifest ${m.meta.errorCount} hata ile emit edildi;`,
    "> bu g\xF6r\xFCn\xFCm eksik ya da yan\u0131lt\u0131c\u0131 olabilir. \xD6nce modeli 0-error yap\u0131n.",
    ""
  ];
}
function titleSuffix(m) {
  return m.meta?.hasErrors ? " \u26A0" : "";
}
var PUML_STYLE = [
  "skinparam shadowing false",
  "skinparam defaultFontName Helvetica"
];

// src/tech-report/context.ts
function generateContextDiagram(m) {
  const lines = ["@startuml", ...PUML_STYLE];
  lines.push(`title Mod\xFCl-Ba\u011Flam Haritas\u0131 \u2014 Teknik Model${titleSuffix(m)}`);
  lines.push("");
  const declared = /* @__PURE__ */ new Set();
  const aliasOf = /* @__PURE__ */ new Map();
  for (const mod of m.modules) {
    const alias = pumlId("mod", mod.name);
    aliasOf.set(mod.name, alias);
    declared.add(alias);
    const stereo = mod.pureTechnical ? " <<pure-technical>>" : "";
    lines.push(`component "${escPuml(mod.name)}" as ${alias}${stereo}`);
  }
  for (const ext of boundaryOf(m.externals)) {
    const alias = pumlId("ext", ext.name);
    aliasOf.set(ext.name, alias);
    declared.add(alias);
    lines.push(`component "${escPuml(ext.name)}" as ${alias} <<external>>`);
  }
  for (const unc of boundaryOf(m.uncharted)) {
    const alias = pumlId("unc", unc.name);
    aliasOf.set(unc.name, alias);
    declared.add(alias);
    lines.push(`component "${escPuml(unc.name)}" as ${alias} <<uncharted>>`);
  }
  lines.push("");
  const byOp = opModuleIndex(opsOf(m));
  const edgeLines = [];
  for (const e of m.callEdges) {
    const fromModule = byOp.get(e.from);
    const fromAlias = fromModule ? aliasOf.get(fromModule) : void 0;
    const toAlias = aliasOf.get(e.to.system);
    if (!fromAlias || !toAlias || !declared.has(fromAlias) || !declared.has(toAlias)) continue;
    const arrow = e.consistency === "eventual" ? "..>" : "-->";
    const marks = `${e.kind === "uncharted" ? " \xAB?\xBB" : ""}${e.compensate ? ` \u27F2 ${e.compensate.system}.${e.compensate.op}` : ""}`;
    edgeLines.push(`${fromAlias} ${arrow} ${toAlias} : ${escPumlLabel(`${e.from} \u2192 ${e.to.op}${marks}`)}`);
  }
  for (const s of m.subscriptions) {
    const fromAlias = aliasOf.get(s.event.module);
    const toAlias = aliasOf.get(s.consumer.module);
    if (!fromAlias || !toAlias) continue;
    edgeLines.push(`${fromAlias} ..> ${toAlias} : ${escPumlLabel(`\xABevent\xBB ${s.event.name} \u2192 ${s.consumer.op}`)}`);
  }
  lines.push(...new Set(edgeLines));
  if (m.modules.length === 0) {
    lines.push("note as bos_model", "  Model bo\u015F \u2014 manifest mod\xFCl i\xE7ermiyor.", "end note");
  }
  lines.push("", "@enduml");
  return lines.join("\n") + "\n";
}

// src/tech-report/er.ts
function generateErDiagrams(m) {
  const byId = new Map(m.entities.map((e) => [e.id, e]));
  return m.modules.map((mod) => ({
    module: mod.name,
    slug: slugOf(mod.name),
    puml: moduleEr(m, mod.name, byId)
  }));
}
function moduleEr(m, moduleName, byId) {
  const entities = m.entities.filter((e) => e.module === moduleName);
  const lines = ["@startuml", ...PUML_STYLE, "hide empty members"];
  lines.push(`title ER \u2014 ${escPuml(moduleName)}`);
  lines.push("");
  const notes = [];
  const edges = [];
  const shadows = /* @__PURE__ */ new Map();
  for (const e of entities) {
    const alias = pumlId("ent", e.id);
    const stereo = e.concurrency === "optimistic" ? " <<optimistic>>" : "";
    lines.push(`class "${escPuml(e.id)}" as ${alias}${stereo} {`);
    if (e.realizes.length > 0) {
      lines.push(`  \u21D0 realizes: ${escPuml(e.realizes.join(", "))}`);
      lines.push("  --");
    }
    for (const f of e.fields) {
      const many = f.cardinality === "many" ? " [*]" : "";
      lines.push(`  ${escPuml(f.name)} : ${escPuml(f.type)}${many}`);
    }
    lines.push("}");
    for (const inv of e.invariants) {
      if (!inv.text) continue;
      notes.push(`note bottom of ${alias}`, `  inv: ${escPuml(inv.text)}`, "end note");
    }
    for (const f of e.fields) {
      if (f.ref !== "entity") continue;
      const target = byId.get(f.type);
      const targetModule = f.targetModule ?? target?.module ?? "";
      let targetAlias;
      if (targetModule === moduleName && target) {
        targetAlias = pumlId("ent", target.id);
      } else {
        targetAlias = pumlId("sh", `${targetModule}_${f.type}`);
        const label = targetModule ? `${targetModule}.${f.type}` : f.type;
        shadows.set(targetAlias, `class "${escPuml(label)}" as ${targetAlias} <<cross-module>>`);
      }
      const card = f.cardinality === "many" ? "*" : "1";
      edges.push(`${alias} --> "${card}" ${targetAlias} : ${escPumlLabel(f.name)}`);
    }
  }
  if (entities.length === 0) {
    lines.push("note as bos_modul", `  '${escPuml(moduleName)}' mod\xFCl\xFCnde entity yok.`, "end note");
  }
  if (shadows.size > 0) lines.push("", ...shadows.values());
  if (edges.length > 0) lines.push("", ...edges);
  if (notes.length > 0) lines.push("", ...notes);
  lines.push("", "@enduml");
  return lines.join("\n") + "\n";
}

// src/tech-report/saga.ts
function generateSagaDiagrams(m) {
  const edgesByOp = /* @__PURE__ */ new Map();
  for (const e of m.callEdges) {
    const list = edgesByOp.get(e.from) ?? [];
    list.push(e);
    edgesByOp.set(e.from, list);
  }
  const out = [];
  for (const op of opsOf(m)) {
    const edges = edgesByOp.get(op.id) ?? [];
    if (!edges.some((e) => e.compensate !== null)) continue;
    out.push({
      op: op.id,
      slug: slugOf(`${op.module}-${op.id}`),
      puml: sagaPuml(op, edges)
    });
  }
  return out;
}
function sagaPuml(op, edges) {
  const lines = ["@startuml", ...PUML_STYLE];
  lines.push(`title Saga \u2014 ${escPuml(`${op.module}.${op.id}`)}`);
  lines.push("");
  const src = pumlId("p", op.module);
  const aliasOf = /* @__PURE__ */ new Map([[op.module, src]]);
  lines.push(`participant "${escPuml(op.module)}" as ${src}`);
  const declare = (system) => {
    let alias = aliasOf.get(system);
    if (!alias) {
      alias = pumlId("p", system);
      aliasOf.set(system, alias);
      lines.push(`participant "${escPuml(system)}" as ${alias}`);
    }
    return alias;
  };
  for (const e of edges) declare(e.to.system);
  for (const e of edges) {
    if (e.compensate) declare(e.compensate.system);
  }
  const hasEmits = op.emits.length > 0;
  if (hasEmits) lines.push('participant "Event Bus" as p__bus');
  lines.push("");
  lines.push("alt ba\u015Far\u0131");
  for (const e of edges) {
    const alias = aliasOf.get(e.to.system);
    const arrow = e.consistency === "eventual" ? "-->" : "->";
    const mark = e.kind === "uncharted" ? " \xAB?\xBB" : "";
    lines.push(`  ${src} ${arrow} ${alias} : ${escPumlLabel(`${e.to.op}${mark}`)}`);
  }
  for (const ev of op.emits) {
    lines.push(`  ${src} -->> p__bus : ${escPumlLabel(`\xABevent\xBB ${ev}`)}`);
  }
  lines.push("else hata \u2014 telafi (ters s\u0131ra)");
  const compensated = edges.filter((e) => e.compensate !== null);
  for (const e of [...compensated].reverse()) {
    const alias = aliasOf.get(e.compensate.system);
    lines.push(`  ${src} -> ${alias} : ${escPumlLabel(`\u27F2 ${e.compensate.op}`)}`);
  }
  lines.push("end");
  lines.push("", "@enduml");
  return lines.join("\n") + "\n";
}

// src/tech-report/events.ts
function generateEventFlowDiagram(m) {
  const producers = opsOf(m).filter((op) => op.emits.length > 0);
  if (producers.length === 0 && m.subscriptions.length === 0) return null;
  const catalog = m.events;
  const resolveModule = (name, preferModule) => {
    const own = catalog.find((e) => e.id === name && e.module === preferModule);
    if (own) return own.module;
    const any = catalog.find((e) => e.id === name);
    return any ? any.module : preferModule;
  };
  const lines = ["@startuml", "left to right direction", ...PUML_STYLE];
  lines.push(`title Event Ak\u0131\u015F\u0131${titleSuffix(m)}`);
  lines.push("");
  const declared = /* @__PURE__ */ new Map();
  const edges = [];
  const opNode = (module, op) => {
    const alias = pumlId("op", `${module}_${op}`);
    declared.set(alias, `rectangle "${escPuml(`${module}.${op}`)}" as ${alias}`);
    return alias;
  };
  const eventNode = (module, name) => {
    const alias = pumlId("ev", `${module}_${name}`);
    declared.set(alias, `queue "${escPuml(`${module}.${name}`)}" as ${alias}`);
    return alias;
  };
  for (const op of producers) {
    const from = opNode(op.module, op.id);
    for (const ev of op.emits) {
      const to = eventNode(resolveModule(ev, op.module), ev);
      edges.push(`${from} --> ${to} : ${escPumlLabel("emits")}`);
    }
  }
  for (const s of m.subscriptions) {
    const from = eventNode(s.event.module, s.event.name);
    const to = opNode(s.consumer.module, s.consumer.op);
    edges.push(`${from} --> ${to} : ${escPumlLabel("on")}`);
  }
  lines.push(...declared.values());
  lines.push("");
  lines.push(...new Set(edges));
  lines.push("", "@enduml");
  return lines.join("\n") + "\n";
}

// src/tech-report/opdoc.ts
function generateOpDocs(m) {
  const ops = opsOf(m);
  const errorType = new Map(m.errors.map((e) => [e.id, e.resultType]));
  const edgesByOp = /* @__PURE__ */ new Map();
  for (const e of m.callEdges) {
    const list = edgesByOp.get(e.from) ?? [];
    list.push(e);
    edgesByOp.set(e.from, list);
  }
  return m.modules.map((mod) => ({
    module: mod.name,
    slug: slugOf(mod.name),
    md: moduleDoc(m, mod.name, mod.pureTechnical, ops.filter((o) => o.module === mod.name), errorType, edgesByOp)
  }));
}
function moduleDoc(m, moduleName, pureTechnical, ops, errorType, edgesByOp) {
  const lines = [...mdWarnBanner(m)];
  lines.push(`# ${escMd(moduleName)} \u2014 Operasyon El Kitab\u0131`);
  lines.push("");
  if (pureTechnical) {
    lines.push("_Saf-teknik mod\xFCl (hi\xE7bir \xFCyesi business s\xF6zle\u015Fmesi realize etmiyor)._");
    lines.push("");
  }
  if (ops.length === 0) {
    lines.push("Bu mod\xFClde operasyon yok.");
    lines.push("");
    return lines.join("\n");
  }
  for (const op of ops) {
    lines.push(...opCard(op, errorType, edgesByOp.get(op.id) ?? []));
  }
  return lines.join("\n");
}
function signatureOf(op) {
  const params = op.signature.params.map((p) => `${p.name}: ${p.type}${p.collection ? "[]" : ""}`).join(", ");
  const ret = op.signature.returns ? ` : ${op.signature.returns}` : "";
  return `${op.id}(${params})${ret}`;
}
function opCard(op, errorType, edges) {
  const lines = [`## ${escMd(op.id)}`, ""];
  const row = (label, value) => {
    lines.push(`- **${label}:** ${value}`);
  };
  row("\u0130mza", mdCode(signatureOf(op)));
  if (op.serving.length > 0) row("Sunum", op.serving.map((s) => mdCode(s.raw || s.protocol)).join(" \xB7 "));
  if (op.visibility) row("G\xF6r\xFCn\xFCrl\xFCk", escMd(op.visibility));
  if (op.realizes) row("Realizes", mdCode(op.realizes));
  const auth = [];
  if (op.roles.length > 0) auth.push(`roller: ${escMd(op.roles.join(", "))}`);
  if (op.ownership) auth.push(`sahiplik: ${escMd(op.ownership)}`);
  if (op.abac) auth.push("abac: permit kural\u0131 var");
  if (op.scopes.length > 0) auth.push(`scope'lar: ${escMd(op.scopes.join(", "))}`);
  if (auth.length > 0) row("Yetki", auth.join(" \xB7 "));
  if (op.validation.length > 0 || op.rule.length > 0) {
    lines.push("- **Guard'lar:**");
    for (const g of op.validation) {
      lines.push(`  - validation: ${mdCode(g.text)}${g.guardRef ? ` (guard: ${escMd(g.guardRef)})` : ""}`);
    }
    for (const g of op.rule) {
      lines.push(`  - rule: ${mdCode(g.text)}${g.guardRef ? ` (guard: ${escMd(g.guardRef)})` : ""}`);
    }
  }
  if (op.throws.length > 0) {
    row("Hatalar (throws)", op.throws.map((t) => `${mdCode(t)}${errorType.has(t) ? ` \u2192 ${escMd(errorType.get(t))}` : ""}`).join(" \xB7 "));
  }
  const acc = [];
  if (op.access.creates.length > 0) acc.push(`creates: ${escMd(op.access.creates.join(", "))}`);
  if (op.access.reads.length > 0) acc.push(`reads: ${escMd(op.access.reads.join(", "))}`);
  if (op.access.updates.length > 0) acc.push(`updates: ${escMd(op.access.updates.join(", "))}`);
  if (op.access.deletes.length > 0) acc.push(`deletes: ${escMd(op.access.deletes.join(", "))}`);
  if (acc.length > 0) row("Eri\u015Fim (CRUD)", acc.join(" \xB7 "));
  if (op.emits.length > 0) row("Yay\u0131nlar (emits)", op.emits.map((e) => mdCode(e)).join(" \xB7 "));
  if (edges.length > 0) {
    row("\xC7a\u011Fr\u0131lar (calls)", edges.map((e) => {
      const tags = [e.kind];
      if (e.consistency === "eventual") tags.push("eventual");
      if (e.compensate) tags.push(`telafi \u27F2 ${e.compensate.system}.${e.compensate.op}`);
      return `${mdCode(`${e.to.system}.${e.to.op}`)} (${escMd(tags.join(", "))})`;
    }).join(" \xB7 "));
  }
  if (op.idempotent) row("\u0130dempotens", `key: ${escMd(op.idempotent.keys.join(", ") || "\u2014")}`);
  if (op.consistency.risk || op.consistency.mode) {
    const cons = [];
    if (op.consistency.risk) cons.push(`risk: ${escMd(op.consistency.risk)}`);
    if (op.consistency.mode) cons.push(`mode: ${escMd(op.consistency.mode)}`);
    row("Tutarl\u0131l\u0131k", cons.join(" \xB7 "));
  }
  if (op.pagination) {
    const keys = op.pagination.keys.map((k) => `${k.field} ${k.direction}`).join(", ");
    row("Sayfalama", `${escMd(op.pagination.strategy)}(${escMd(keys)})${op.pagination.size !== null ? ` \xB7 size ${op.pagination.size}` : ""}`);
  }
  if (op.note) row("Not", escMd(op.note));
  if (op.businessNote) row("\u0130\u015F notu", escMd(op.businessNote));
  lines.push("");
  return lines;
}

// src/tech-report/matrices.ts
function generateMatrices(m) {
  const ops = opsOf(m);
  return {
    access: accessMd(m, ops),
    auth: authMd(m, ops),
    coverage: coverageMd(m, ops)
  };
}
function accessMd(m, ops) {
  const rows = ops.filter((op) => op.access.creates.length + op.access.reads.length + op.access.updates.length + op.access.deletes.length > 0);
  const used = new Set(rows.flatMap((op) => [...op.access.creates, ...op.access.reads, ...op.access.updates, ...op.access.deletes]));
  const columns = m.entities.map((e) => e.id).filter((id) => used.has(id));
  for (const op of rows) {
    for (const name of [...op.access.creates, ...op.access.reads, ...op.access.updates, ...op.access.deletes]) {
      if (!columns.includes(name)) columns.push(name);
    }
  }
  const lines = [...mdWarnBanner(m)];
  lines.push("# ACCESS \u2014 op \xD7 entity CRUD matrisi", "");
  if (rows.length === 0) {
    lines.push("Hi\xE7bir op entity eri\u015Fimi bildirmiyor.", "");
    return lines.join("\n");
  }
  lines.push(`| Mod\xFCl | Op | ${columns.map(escMd).join(" | ")} |`);
  lines.push(`|---|---|${columns.map(() => "---").join("|")}|`);
  for (const op of rows) {
    const cells = columns.map((entity) => {
      let s = "";
      if (op.access.creates.includes(entity)) s += "C";
      if (op.access.reads.includes(entity)) s += "R";
      if (op.access.updates.includes(entity)) s += "U";
      if (op.access.deletes.includes(entity)) s += "D";
      return s || " ";
    });
    lines.push(`| ${escMd(op.module)} | ${escMd(op.id)} | ${cells.join(" | ")} |`);
  }
  lines.push("");
  return lines.join("\n");
}
function authMd(m, ops) {
  const lines = [...mdWarnBanner(m)];
  lines.push("# AUTH \u2014 op \xD7 yetki mekanizmas\u0131 matrisi", "");
  if (ops.length === 0) {
    lines.push("Manifest operasyon i\xE7ermiyor.", "");
    return lines.join("\n");
  }
  lines.push("| Mod\xFCl | Op | G\xF6r\xFCn\xFCrl\xFCk | Roller | Sahiplik | ABAC (permit) | Scope'lar |");
  lines.push("|---|---|---|---|---|---|---|");
  for (const op of ops) {
    lines.push([
      "",
      escMd(op.module),
      escMd(op.id),
      escMd(op.visibility || "\u2014"),
      op.roles.length > 0 ? escMd(op.roles.join(", ")) : "\u2014",
      op.ownership ? escMd(op.ownership) : "\u2014",
      op.abac ? "\u2713" : "\u2014",
      op.scopes.length > 0 ? escMd(op.scopes.join(", ")) : "\u2014",
      ""
    ].join(" | ").trim());
  }
  lines.push("");
  return lines.join("\n");
}
function coverageMd(m, ops) {
  const lines = [...mdWarnBanner(m)];
  lines.push("# COVERAGE \u2014 realizes kapsamas\u0131", "");
  lines.push("## Op \u2192 realizes", "");
  if (ops.length === 0) {
    lines.push("Manifest operasyon i\xE7ermiyor.", "");
  } else {
    lines.push("| Mod\xFCl | Op | Realizes |");
    lines.push("|---|---|---|");
    for (const op of ops) {
      lines.push(`| ${escMd(op.module)} | ${escMd(op.id)} | ${op.realizes ? mdCode(op.realizes) : "\u2014"} |`);
    }
    lines.push("");
  }
  lines.push("## Business'ta var, tech'te kar\u015F\u0131l\u0131ks\u0131z", "");
  if (m.coverage.unrealizedBusinessOps.length === 0) {
    lines.push("Yok \u2014 s\xF6zle\u015Fmedeki t\xFCm business op'lar\u0131 realize edilmi\u015F.", "");
  } else {
    for (const id of m.coverage.unrealizedBusinessOps) lines.push(`- ${mdCode(id)}`);
    lines.push("");
  }
  lines.push("## Kapsanmayan business entity'leri", "");
  if (m.coverage.uncoveredEntities.length === 0) {
    lines.push("Yok \u2014 s\xF6zle\u015Fmedeki t\xFCm entity'ler realize edilmi\u015F.", "");
  } else {
    for (const id of m.coverage.uncoveredEntities) lines.push(`- ${mdCode(id)}`);
    lines.push("");
  }
  return lines.join("\n");
}

// src/tech-report/assurance.ts
function generateAssurance(m) {
  const lines = [...mdWarnBanner(m)];
  lines.push("# ASSURANCE \u2014 guarantee izlenebilirli\u011Fi", "");
  lines.push('Her guarantee bir insan-garantisini yap\u0131sal y\xFCk\xFCml\xFCl\xFCklere (invariant / guard / throws / operation) E\u015ELER \u2014 salt mapping, mant\u0131k ta\u015F\u0131maz. Tech-taraf\u0131 izlenebilirlik; QA test-kapsamas\u0131 burada DE\u011E\u0130L (qa.html "Garantiler").', "");
  const gs = m.guarantees ?? [];
  if (gs.length === 0) {
    lines.push("Model hi\xE7 guarantee bildirmiyor.", "");
    return lines.join("\n");
  }
  lines.push("## Garantiler", "");
  lines.push("| Garanti | Metin | \u0130zler (goalId) | # Y\xFCk\xFCml\xFCl\xFCk |");
  lines.push("|---|---|---|---|");
  for (const g of gs) {
    const traces = g.traces.length > 0 ? g.traces.map(mdCode).join(", ") : "\u2014";
    lines.push(`| ${mdCode(g.id)} | ${escMd(g.text)} | ${traces} | ${g.obligations.length} |`);
  }
  lines.push("");
  lines.push("## Y\xFCk\xFCml\xFCl\xFCk ayr\u0131nt\u0131s\u0131", "");
  for (const g of gs) {
    lines.push(`### ${escMd(g.id)}`, "");
    if (g.note) lines.push(`> ${escMd(g.note)}`, "");
    lines.push("| T\xFCr | Hedef | Ayr\u0131nt\u0131 |");
    lines.push("|---|---|---|");
    for (const ob of g.obligations) {
      const { target, detail } = obligationCells(ob);
      lines.push(`| ${ob.kind} | ${target} | ${detail} |`);
    }
    lines.push("");
  }
  return lines.join("\n");
}
function obligationCells(ob) {
  if (ob.kind === "invariant") {
    return { target: mdCode(`${ob.entity.module}.${ob.entity.name}`), detail: ob.label != null ? mdCode(ob.label) : "\u2014" };
  }
  const op = mdCode(`${ob.op.system}.${ob.op.op}`);
  if (ob.kind === "guard") return { target: op, detail: mdCode(ob.guard) };
  if (ob.kind === "throws") return { target: op, detail: mdCode(ob.error) };
  return { target: op, detail: "\u2014" };
}

// src/tech-report/index.ts
function generateTechReport(manifest2) {
  const files2 = [];
  files2.push({ path: "tech/context.puml", content: generateContextDiagram(manifest2) });
  for (const er of generateErDiagrams(manifest2)) {
    files2.push({ path: `tech/er/${er.slug}.puml`, content: er.puml });
  }
  for (const saga of generateSagaDiagrams(manifest2)) {
    files2.push({ path: `tech/sagas/${saga.slug}.puml`, content: saga.puml });
  }
  const events = generateEventFlowDiagram(manifest2);
  if (events !== null) files2.push({ path: "tech/events.puml", content: events });
  for (const doc of generateOpDocs(manifest2)) {
    files2.push({ path: `tech/docs/${doc.slug}.md`, content: doc.md });
  }
  const matrices = generateMatrices(manifest2);
  files2.push({ path: "tech/ACCESS.md", content: matrices.access });
  files2.push({ path: "tech/AUTH.md", content: matrices.auth });
  files2.push({ path: "tech/COVERAGE.md", content: matrices.coverage });
  files2.push({ path: "tech/ASSURANCE.md", content: generateAssurance(manifest2) });
  return files2;
}

// ../DSL Business Analyses/command-dsl-plugin/plugins/command-dsl/skills/teknik-analiz/validator/report-index.src.mts
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

// ../DSL Business Analyses/command-dsl-plugin/plugins/command-dsl/skills/teknik-analiz/validator/report-tech.src.mts
var BUILD_INFO = typeof define_BUILD_INFO_default !== "undefined" ? define_BUILD_INFO_default : { tool: "report-tech", srcHash: "dev", builtAt: "dev" };
function usage() {
  console.error(`Kullan\u0131m: node report-tech.mjs <manifest.json> --reports <dizin> [--title "<Proje>"] [--quiet]
          node report-tech.mjs --version

  <manifest.json>    emit-manifest \xE7\u0131kt\u0131s\u0131 (0-error ko\u015Funun \xFCr\xFCn\xFC)
  --reports <dizin>  rapor k\xF6k\xFC; ara\xE7 <dizin>/tech/** yazar + index.md/html'i yeniler
  --title "<Proje>"  index ba\u015Fl\u0131\u011F\u0131 (reports/.report-meta.json'a kal\u0131c\u0131la\u015F\u0131r)
  --quiet            bilgi sat\u0131rlar\u0131 bast\u0131r\u0131l\u0131r
  --version          g\xF6m\xFCl\xFC BUILD_INFO (src hash \u2014 bayatl\u0131k tespiti)

\xC7\u0131k\u0131\u015F kodu: 0 = \xFCretildi \xB7 1 = girdi bozuk/\u015Fema-d\u0131\u015F\u0131 (H\u0130\xC7B\u0130R rapor yaz\u0131lmaz \u2014 gate) \xB7 2 = kullan\u0131m hatas\u0131.`);
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
  else if (a === "--help" || a === "-h") usage();
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
function validateManifest(x, src) {
  const fail2 = (msg) => {
    throw new Error(`\u015Fema-d\u0131\u015F\u0131 girdi (${src}): ${msg}`);
  };
  if (typeof x !== "object" || x === null || Array.isArray(x)) fail2("k\xF6k JSON nesnesi de\u011Fil");
  const m = x;
  if (typeof m.mode !== "string") fail2(`mode string de\u011Fil: ${JSON.stringify(m.mode)} \u2014 manifest.json (emit-manifest \xE7\u0131kt\u0131s\u0131) m\u0131?`);
  if (!Array.isArray(m.operations)) fail2("operations dizi de\u011Fil");
  if (!Array.isArray(m.entities)) fail2("entities dizi de\u011Fil");
  return m;
}
var raw;
try {
  raw = readFileSync2(resolve(input), "utf8");
} catch (e) {
  console.error(`Girdi yolu okunamad\u0131: ${input}`);
  console.error(`  ${e instanceof Error ? e.message : String(e)}`);
  process.exit(2);
}
function fail(msg) {
  console.error(`\u2717 ${msg}`);
  console.error("\u2717 girdi bozuk/\u015Fema-d\u0131\u015F\u0131 \u2014 H\u0130\xC7B\u0130R rapor yaz\u0131lmad\u0131 (gate).");
  process.exit(1);
}
var manifest;
try {
  manifest = validateManifest(JSON.parse(raw), input);
} catch (e) {
  fail(e instanceof Error ? e.message : String(e));
}
var files;
try {
  files = generateTechReport(manifest);
} catch (e) {
  fail(`rapor \xFCretilemedi: ${e instanceof Error ? e.message : String(e)}`);
}
var root = resolve(reportsRoot);
var techRoot = join2(root, "tech");
rmSync(techRoot, { recursive: true, force: true });
for (const f of files) {
  const target = join2(root, f.path);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync2(target, f.content);
}
regenerateIndex(root, { title });
if (!quiet) {
  const n = (pre) => files.filter((f) => f.path.startsWith(pre)).length;
  const hasErrors = typeof manifest.meta === "object" && manifest.meta !== null && manifest.meta.hasErrors === true;
  console.error(
    `\u2713 ${techRoot}: ${files.length} dosya (${n("tech/context")} context \xB7 ${n("tech/er/")} er \xB7 ${n("tech/sagas/")} saga \xB7 ${n("tech/events")} events \xB7 ${n("tech/docs/")} docs \xB7 3 matris) \xB7 index.md + index.html yenilendi${hasErrors ? " \xB7 \u26A0 hasErrors: i\u015Faretli ko\u015Fu" : ""}`
  );
  console.error(`  \xFCrete\xE7: CommandDSL src/tech-report \xB7 src ${BUILD_INFO.srcHash} (${BUILD_INFO.builtAt})`);
}
process.exit(0);
