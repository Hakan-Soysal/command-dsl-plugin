/**
 * reports/ kök index'inin (index.md + index.html) ORTAK üreteci.
 *
 * DÖRT rapor aracında (report-business / report-tech / report-frontend /
 * report-qa) BYTE-ÖZDEŞ kopya olarak yaşar (aile self-contained kuralı; kanonik
 * davranış = bu dosya). Kural: index diski TARAYARAK yeniden üretilir
 * (idempotent) — hangi araç son koşarsa koşsun aynı içerik; dört DSL aynı
 * reports/ kökünde birleşebilir.
 *
 * - Bölüm sırası: business → tech → frontend → qa (yalnız mevcut olanlar).
 * - Dosyalar bölüm içinde göreli-yol'a göre sıralı (basit codepoint sort).
 * - `.puml` → göreli kaynak linki + plantuml.com/plantuml/svg/ "görüntüle"
 *   linki (deflate-raw + PlantUML base64 alfabesi — src/playground/
 *   plantuml-encode.ts'in node portu; zlib senkron).
 * - `.md` / `.html` → göreli link. Diğer uzantılar listelenir, link'siz not.
 * - Başlık kalıcılığı: `--title` verildiğinde `reports/.report-meta.json`'a
 *   yazılır; verilmezse oradan okunur (araçlar-arası tutarlı başlık).
 * - Kök index.md / index.html / .report-meta.json taramada atlanır.
 */
import { readdirSync, readFileSync, writeFileSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { deflateRawSync } from 'node:zlib';

const ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_';

function encode64(data: Uint8Array): string {
    let out = '';
    for (let i = 0; i < data.length; i += 3) {
        const b1 = data[i];
        const b2 = data[i + 1] ?? 0;
        const b3 = data[i + 2] ?? 0;
        out += ALPHABET[b1 >> 2];
        out += ALPHABET[((b1 & 0x03) << 4) | (b2 >> 4)];
        out += ALPHABET[((b2 & 0x0f) << 2) | (b3 >> 6)];
        out += ALPHABET[b3 & 0x3f];
    }
    return out;
}

/** PlantUML sunucu URL kodlaması (plantuml-encode.ts portu; node:zlib senkron). */
export function encodePlantUml(text: string): string {
    return encode64(new Uint8Array(deflateRawSync(Buffer.from(text, 'utf8'), { level: 9 })));
}

const SECTIONS = ['business', 'tech', 'frontend', 'qa'] as const;
const ROOT_SKIP = new Set(['index.md', 'index.html', '.report-meta.json']);

interface Entry { rel: string; kind: 'puml' | 'doc' | 'other'; label: string; url?: string }

function walk(dir: string, acc: string[] = []): string[] {
    for (const name of readdirSync(dir).sort()) {
        if (name.startsWith('.')) continue;
        const full = join(dir, name);
        if (statSync(full).isDirectory()) walk(full, acc);
        else acc.push(full);
    }
    return acc;
}

/** .puml içindeki `title …` satırından insan-okur etiket (yoksa göreli yol). */
function pumlLabel(content: string, rel: string): string {
    const m = content.match(/^\s*title\s+(.+)$/m);
    return m ? m[1].trim() : rel;
}

function collect(reportsRoot: string, section: string): Entry[] {
    const dir = join(reportsRoot, section);
    if (!existsSync(dir)) return [];
    return walk(dir).map((full) => {
        const rel = relative(reportsRoot, full).split('\\').join('/');
        if (full.endsWith('.puml')) {
            const content = readFileSync(full, 'utf8');
            return {
                rel, kind: 'puml' as const,
                label: pumlLabel(content, rel),
                url: `https://www.plantuml.com/plantuml/svg/${encodePlantUml(content)}`,
            };
        }
        if (full.endsWith('.md') || full.endsWith('.html')) return { rel, kind: 'doc' as const, label: rel };
        return { rel, kind: 'other' as const, label: rel };
    });
}

function escapeHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export interface IndexOptions { title?: string }

export function regenerateIndex(reportsRoot: string, opts: IndexOptions = {}): void {
    const metaPath = join(reportsRoot, '.report-meta.json');
    let title = opts.title;
    if (title) writeFileSync(metaPath, JSON.stringify({ title }, null, 2) + '\n');
    else if (existsSync(metaPath)) {
        try { title = JSON.parse(readFileSync(metaPath, 'utf8')).title; } catch { /* bozuksa fallback */ }
    }
    title = title || 'İnsan-Okur Raporlar';

    const note =
        'Üretim: CommandDSL playground\'unun KENDİ programatik üreteçleriyle (el yazımı görsel yok). ' +
        '.puml dosyaları PlantUML kaynaklarıdır; "görüntüle" linkleri plantuml.com sunucusunda SVG render eder.';

    // ---- index.md ----
    const md: string[] = [`# ${title} — İnsan-Okur Raporlar`, '', `> ${note}`, ''];
    // ---- index.html ----
    const html: string[] = [
        `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>${escapeHtml(title)} — Raporlar</title><style>`,
        'body{font:14px/1.6 -apple-system,system-ui,sans-serif;background:#1b1e23;color:#d6d9de;max-width:960px;margin:24px auto;padding:0 16px}',
        'h1{font-size:19px}h2{font-size:15px;margin-top:28px;border-bottom:1px solid #33363c;padding-bottom:4px}',
        'a{color:#6db3f2;text-decoration:none}a:hover{text-decoration:underline}',
        'li{margin:3px 0}code{font-family:ui-monospace,Menlo,monospace;font-size:12.5px;color:#9aa0a8}',
        '.note{color:#9aa0a8;font-size:12.5px}',
        `</style></head><body><h1>${escapeHtml(title)} — İnsan-Okur Raporlar</h1><p class="note">${escapeHtml(note)}</p>`,
    ];

    for (const section of SECTIONS) {
        const entries = collect(reportsRoot, section);
        if (entries.length === 0) continue;
        md.push('', `## ${section}`, '');
        html.push(`<h2>${section}</h2><ul>`);
        for (const e of entries) {
            if (e.kind === 'puml') {
                md.push(`- \`${e.rel}\` — ${e.label} · [görüntüle](${e.url})`);
                html.push(`<li><code>${escapeHtml(e.rel)}</code> — ${escapeHtml(e.label)} · <a href="${e.url}">görüntüle</a> · <a href="${e.rel}">kaynak</a></li>`);
            } else if (e.kind === 'doc') {
                md.push(`- [\`${e.rel}\`](${e.rel})`);
                html.push(`<li><a href="${e.rel}"><code>${escapeHtml(e.rel)}</code></a></li>`);
            } else {
                md.push(`- \`${e.rel}\``);
                html.push(`<li><code>${escapeHtml(e.rel)}</code></li>`);
            }
        }
        html.push('</ul>');
    }

    md.push('');
    html.push('</body></html>');
    writeFileSync(join(reportsRoot, 'index.md'), md.join('\n'));
    writeFileSync(join(reportsRoot, 'index.html'), html.join('\n'));
}
