# Gömülü doğrulayıcı + gate'li emitter (`fcdsl.mjs`)

## Çağrım

```
node ${CLAUDE_SKILL_DIR}/validator/fcdsl.mjs <dosya.fcdsl | dizin ...> [--out <dizin>] [--json] [--quiet]
node ${CLAUDE_SKILL_DIR}/validator/fcdsl.mjs --version
```

- `${CLAUDE_SKILL_DIR}` = bu skill'in kurulu dizini. CWD kullanıcının dizinidir —
  göreli yolla arama yapma.
- Self-contained bundle: Node 20+ yeter; CommandDSL deposu ve node_modules GEREKMEZ.
- Dizin verilirse recursive taranır (`node_modules` ve gizli dizinler atlanır).
- **TÜM model dosyalarını TEK çağrıda ver** (workspace-pass) — union-coverage ancak
  böyle doğru (bkz. consistency-and-emit.md §B).
- Linked `contract`/`tech` yolları her `.fcdsl`'in KENDİ konumuna göre çözülür —
  contract dosyalarının emit edilen `.fcdsl`'lerin yanında (veya doğru göreli yolda)
  olduğundan emin ol.

## Çıkış sözleşmesi

| Exit | Anlam |
|---|---|
| 0 | 0 error (warning/info olabilir) — `--out` verildiyse emit YAPILDI |
| 1 | ≥1 severity-1 error — `--out` verildiyse bile emit YAPILMADI (gate; partial yok) |
| 2 | Kullanım/girdi hatası (yol yok, hiç `.fcdsl` yok, argüman eksik) |

- `--json`: stdout = SAF diagnostics dizisi `[{severity, line, col, message, file}]`
  (severity 1=error 2=warning 3=info); meta banner stderr'de. Programatik döngü için bunu kullan.
- Varsayılan: insan-okur rapor. `--quiet`: info satırları bastırılır.

## Diagnostics → düzeltme döngüsü

1. Çalıştır (`--json` ile). **error** varsa: mesajlar Türkçe ve karar-numaralı —
   düzelt, TEKRAR çalıştır. **0 error olmadan döngüden çıkma.**
2. **warning**'leri kullanıcıya TAKİP SORUSU olarak taşı (soru kalıpları:
   `upstream-to-frontend-translation.md §F`). Cevaba göre ya modeli düzelt ya kararı
   belgele (dosyada `#` yorumu) — sonra yine çalıştır.
3. **info**'lar: by-name çıpalar (`'X' ad-eşleşmesiyle çıpalandı`) emit öncesi tek
   satırla onaylatılır; `contract'ta karşılıksız — standalone-arayüz` info'su ise o
   arayüzün kasıtlı-yerel (ör. Login) olduğunun teyididir.
4. 0-error'a gelince `--out <dizin>` ile son koşu → `.experience.json`'lar üretilir.

## Tech'siz mod (yalnız business bağlıyken KAPALI kalan denetimler)

`contract` var ama `tech` yoksa şunlar SESSİZCE çalışmaz — kullanıcıya baştan söyle:

- **Çağrılamaz-op** (op tech'te realize edilmiyor / @internal) — hiç uyarı gelmez.
- **Results-divergence** (sunucunun üretebildiği hatalar authored kümede eksik).
- **Validation-divergence** (sunucu kuralı var, form boş).
- **Pagination divergence** (3 kural — backend sayfalı/sayfasız uyumsuzlukları).
- **Uncovered-op (union)** — "exposed" bilgisi tech'ten gelir; tech yoksa denetim yok.

Çalışmaya DEVAM edenler: anchor (tanımsız-op/kind), audience/persona cross-check,
flow-kapsama, entry/erişilebilirlik, cardinality, queue×out, handler-tamlık, path-kökleri
ve tüm yapısal kurallar. Teknik analiz sonradan yapılınca: `contract` satırına
`tech './manifest.json'` ekle + yeniden doğrula (yeni warning'ler = yeni takip soruları).

## Bayatlık (staleness) kontrolü

`--version` gömülü BUILD_INFO'yu basar (`SNAPSHOT.json`'da da aynısı):

- `grammarHash` — `frontend-dsl.langium` + `shared.langium` parmak izi (GRAMMAR izi).
- `frontendSrcHash` — `src/frontend/**` + `src/shared/**` parmak izi (VALIDATION+EMIT
  mantığı izi; grammar değişmeden yapılan davranış fix'lerini de yakalar).
- `commit` / `builtAt` — kaynak CommandDSL commit'i.

Kullanıcının elinde canlı CommandDSL varsa ve dil davranışı bundle'la çelişiyorsa
(örn. yeni keyword parse olmuyor) hash'leri karşılaştır; bayatsa bundle'ı tazele:

```
CMDDSL=<CommandDSL-yolu> node ${CLAUDE_SKILL_DIR}/validator/build.frontend.mjs
```

(Read-only build; CommandDSL'e hiçbir şey yazmaz. Depo yoksa bundle olduğu gibi
kullanılır — snapshot tarihini kullanıcıya söyle.)

## `.cdsl → operations.json` fallback aracı

Kullanıcı yalnız `.cdsl` getirdiyse (operations.json yok):

```
node ${CLAUDE_SKILL_DIR}/validator/emit-operations.mjs <girdi.cdsl> <çıktı.operations.json>
```

Parse hatalı `.cdsl`'de emit etmez (exit 1) — önce iş tarafını `is-analizi-dsl` ile
düzelttir. (Kanonik üretici is-analizi skill'indedir; buradaki self-contained kopyadır.)

> **Sürüm politikası (2026-07-02'de ÇÖZÜLDÜ):** sözleşme **v3**'tür (`meta.schemaVersion: 3`,
> ADR-0033) — bu emit kopyası v3 üretir, `fcdsl.mjs` de v3 zorunlu kılar (v2 sözleşme →
> "Frontend DSL v3 bekler" error; tech ile aynı katı politika). Tarihçe: frontend
> validator'ı bir dönem `===2`'de kalmıştı; CommandDSL'de uyum fix'i uygulandı (kullanıcı
> onayıyla, local) ve iki bundle + `catalog.operations.json` fixture'ı birlikte tazelendi.
> Kural kalıcıdır: **iki bundle'ı hep AYNI repo durumundan birlikte build et**
> (`build.emit.mjs` + `build.frontend.mjs`) — tek tarafı tazelemek sürüm-kayması üretir.
