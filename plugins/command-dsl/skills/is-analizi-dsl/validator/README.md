# CommandDSL Standalone Doğrulayıcı

`is-analizi-dsl` skill'inin ürettiği `.cdsl` dosyalarını **gerçek CommandDSL dil
servisleriyle** parse-temiz + tutarlı olduğunu kanıtlayan tek dosyalık bundle.

- **`validate.mjs`** — derlenmiş standalone bundle. CommandDSL deposuna veya
  `node_modules`'a ihtiyaç **duymaz**; yalnız Node + hedef `.cdsl` yeter.
- **`validate.src.mts`** — bundle'ın kaynağı (CLI mantığı).
- **`build.mjs`** — kaynağı canlı CommandDSL'den `validate.mjs`'e derleyen script.

Bu, `references/validator.md`'deki **`bundled`** çözümleme yolunun artefaktıdır
(config: `bundledPath: "./validator/validate.mjs"`). Aynı dosya bir URL'e konursa
**`url`** yolunu da besler (aşağıda "Dağıtım").

## Kullanım (çağırma sözleşmesi — validator.md §3)

```bash
node validate.mjs <dosya.cdsl | dizin> [--json]
node validate.mjs --version
```

- Doğrulama birimi **dizindir** (çok-modüllü `import` kapanışı birlikte derlenir).
  Bir **dosya** verirsen, o dosyayı içeren dizin doğrulanır.
- **Çıkış kodu:** `0` = error yok · `1` = ≥1 severity-1 error · `2` = kullanım/girdi hatası.
- **`--json`:** `stdout` = SAF diagnostics dizisi; her eleman
  `{ severity, line, col, message, code, file }`
  (severity: 1=error, 2=warning, 3=info; line/col 1-tabanlı; `code` mesajdan
  best-effort çıkarılır, ör. `P6`/`T5`/`F6`, yoksa `null`).
  `stderr` = insan-okur meta (grammarVersion, grammarHash, dosya listesi, özet)
  — `stdout`'u kirletmez, makine-okur parse'ı bozmaz.

Örnek (JSON):
```json
[{"severity":1,"line":46,"col":5,"message":"'by' aktörü ... (P6 — ...)","code":"P6","file":"support.cdsl"}]
```

## Yeniden derleme (drift olunca)

Grammar değişince (`command-dsl.langium` / `shared.langium`) bundle **bayatlar**.
Yeniden derle:

```bash
node build.mjs                       # varsayılan: komşu ../../../CommandDSL
node build.mjs /yol/CommandDSL       # veya yolu ver
CMDDSL=/yol/CommandDSL node build.mjs
```

`build.mjs` canlı CommandDSL'i **READ-ONLY** okur, oraya hiçbir şey yazmaz; çıktı
yalnız bu dizine düşer.

## Drift tespiti (validator.md §4)

Drift'in gerçek çıpası `grammarHash = sha256(command-dsl.langium + shared.langium)`'dir
ve emitlenen **`grammarVersion` etiketine gömülüdür** (`v3.x-<hash>`). Yani grammar
değişip bundle yeniden derlenince emitlenen kimlik de değişir — sabit etiket
olsaydı her zaman eşleşir, sessiz yanlış-yeşil verirdi (§4'ün en kötü senaryosu).

`node validate.mjs --version` bu `grammarVersion`'ı + `commit`'i basar. Skill,
`validator.config.json`'daki `grammarVersion` ile bundle'ınkini karşılaştırır;
uyuşmazsa ("yeniden derlendi ama config pinlenmedi" durumu) kullanıcıyı uyarır.

> **Çıkartılabilen drift / çıkarılamayan drift.** Etiket karşılaştırması,
> bundle'ın hangi grammar'a göre derlendiğini config'in beklediğiyle kıyaslar.
> Ama bundle grammar değiştikten sonra **hiç yeniden derlenmediyse** (gerçek
> staleness), bundle bunu kendi başına bilemez — bu yalnız canlı proje
> erişilebilirken yakalanır, ki o durumda zaten `project` çözümleme yolu kazanır.
> Saf `bundled`/`url` kullanımında **etiket güven sınırıdır**: grammar her
> değiştiğinde yeniden derle (`node build.mjs`) ve config'i yeni etikete pinle.

## Dağıtım

İki seçenek (tercih sırası):

1. **Skill içinde gömülü (önerilen, varsayılan).** `validate.mjs` skill'in
   yanında durur → skill'e sahip herkeste validator hazır. Ağ yok, URL yok,
   versiyon skill ile birlikte sabit. `bundled` çözümleme yolu bunu kullanır.

2. **Playground deploy'una host (merkezî güncelleme istenirse).** Playground
   tamamen statik bir Cloudflare asset SPA'sıdır (`wrangler.jsonc` → `assets`).
   `validate.mjs` CommandDSL'in **`public/`** dizinine konur; Vite her build'de
   `public/*`'ı `dist/`'e kopyalar, yani `npm run build` dosyayı **silmez, yeniden
   üretir** (kalıcı). Deploy sonrası `https://<playground>/validate.mjs`
   adresinden servis edilir; skill config'inde `url` oraya işaret eder
   (indir → `cacheDir` → `node ... --json`).

   Kurulum (CommandDSL tarafında, bir kez):
   ```bash
   cp validate.mjs <CommandDSL>/public/validate.mjs   # kalıcı kaynak
   cd <CommandDSL> && npm run build && npx wrangler deploy
   ```
   Validator yeniden derlenince (`node build.mjs`) `public/validate.mjs`'i tazele
   ve yeniden deploy et. `wrangler deploy` dışarı yayın yapan, paylaşımlı bir
   aksiyondur → **CommandDSL sahibi çalıştırmalı**.

   Merkezî host'un tek kazancı: skill'i yeniden dağıtmadan validator'ı
   güncellemek. Ama grammar değişince zaten yeniden derleme gerektiği için bu
   kazanç sınırlıdır; çoğu durumda (1) yeterlidir.
