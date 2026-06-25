/**
 * Business `.cdsl` → `operations.json` (v2) standalone üretici — kaynak.
 *
 * `build.emit.mjs` ile tek dosyalık `emit-operations.mjs` bundle'ına derlenir:
 * CommandDSL (business) dil servisleri + generator (collectCommands/genOperationsIndex)
 * + langium içeri gömülür → çalışma anında ne CommandDSL deposu ne node_modules gerekir,
 * yalnız Node + hedef `.cdsl`. Skill'in "sadece .cdsl verildi → contract üret" adımı bunu
 * kullanır (artık CommandDSL repo'suna GİTMEZ).
 *
 * Çağrı:
 *   node emit-operations.mjs <girdi.cdsl> <çıktı.operations.json>
 *   node emit-operations.mjs --version
 *
 * Çıkış kodu: 0 = üretildi · 1 = .cdsl'de severity-1 error (emit YOK — parse hatası varsa
 * tech'e geçme) · 2 = kullanım/girdi hatası.
 */
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { resolve, isAbsolute } from 'node:path';
import { URI, type LangiumDocument } from 'langium';
import { NodeFileSystem } from 'langium/node';
// build.emit.mjs bunları canlı CommandDSL'in business kaynaklarına alias'lar.
import { createCommandDslServices } from '@cmddsl/services';
import { collectCommands } from '@cmddsl/generator';
import { genOperationsIndex } from '@cmddsl/operations';

declare const __BUILD_INFO__: {
    grammarVersion: string;
    grammarHash: string;
    srcHash: string;
    commit: string;
    builtAt: string;
    langium: string;
};

const argv = process.argv.slice(2);
if (argv.includes('--version')) {
    console.log(JSON.stringify(__BUILD_INFO__, null, 2));
    process.exit(0);
}
const positional = argv.filter(a => !a.startsWith('--'));
const [inArg, outArg] = positional;
if (!inArg || !outArg) {
    console.error('Kullanım: node emit-operations.mjs <girdi.cdsl> <çıktı.operations.json>');
    process.exit(2);
}
const inPath = isAbsolute(inArg) ? inArg : resolve(process.cwd(), inArg);
const outPath = isAbsolute(outArg) ? outArg : resolve(process.cwd(), outArg);

try {
    if (!statSync(inPath).isFile()) throw new Error('dosya değil');
} catch {
    console.error(`Hata: girdi okunamadı: ${inPath}`);
    process.exit(2);
}

const { shared } = createCommandDslServices(NodeFileSystem);
const doc = await shared.workspace.LangiumDocuments.getOrCreateDocument(URI.file(inPath)) as LangiumDocument<any>;
await shared.workspace.DocumentBuilder.build([doc], { validation: true });

// severity-1 (error) say — varsa emit etme.
let errors = 0;
for (const e of doc.parseResult.lexerErrors) { errors++; console.error(`lexer: ${e.message}`); }
for (const e of doc.parseResult.parserErrors) { errors++; console.error(`parser: ${e.message}`); }
for (const d of doc.diagnostics ?? []) {
    if ((d.severity ?? 1) === 1) { errors++; console.error(`error ${d.range.start.line + 1}: ${d.message}`); }
}
if (errors > 0) {
    console.error(`\n✗ ${errors} error — operations.json üretilmedi. Önce .cdsl'i düzelt.`);
    process.exit(1);
}

const model = doc.parseResult.value;
const units = collectCommands(model);
const { content } = genOperationsIndex(model, units);
writeFileSync(outPath, content);
console.error(`✓ operations.json yazıldı: ${outPath}`);
