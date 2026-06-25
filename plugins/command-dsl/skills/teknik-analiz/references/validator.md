# Doğrulayıcı — çağrı, bayatlık, düzeltme döngüsü

> Üretilen `.tcdsl`'in **doğrulayıcı-temiz** olduğunu kanıtlamak en güçlü "hatasız" garantisidir.
> Doğrulayıcı **gömülü ve self-contained**'dir (TechDsl dil servisleri + langium bundle'lı) —
> çalışma anında ne CommandDSL deposu ne node_modules gerekir, yalnız Node + hedef `.tcdsl`.

## 1. Konum

`${CLAUDE_SKILL_DIR}/validator/validate-tech.mjs` (bu skill'in `validator/` dizini; `${CLAUDE_SKILL_DIR}`
çağrıyı CWD'den bağımsız kılar — skill bash'inin CWD'si kullanıcının cwd'sidir, göreli yol güvenilmez). Yoksa `build.tech.mjs`
ile üretilir (aşağı §2). Linked modda hedef `.tcdsl`'in `contract` yolu **dosya sistemi**nden
okunur → gerçek dosya konumu (NodeFileSystem) şart; in-memory/stdin ile linked çalışmaz.

## 2. Build & bayatlık (snapshot disiplini)

Bundle bir **grammar + validation-mantığı snapshot**'tır. Üretmek/tazelemek:
```
node <skill>/validator/build.tech.mjs [<CommandDSL-yolu>]
# CMDDSL=<yol> node build.tech.mjs   (varsayılan: ../../../CommandDSL)
```
- CommandDSL **read-only** okunur; oraya hiçbir şey yazılmaz. Çıktı yalnız `validate-tech.mjs`.
- **Kardeş self-contained araçlar (aynı dizin):**
  - `emit-operations.mjs` (`.cdsl → operations.json`, "Başlamadan" fallback'i) — `build.emit.mjs`
    ile bundle'lanır (business servisleri + generator gömülü). Kanonik üretici `is-analizi`'dedir;
    buradaki kopya "yalnız .cdsl verildi" fallback'idir (tek kaynak = CommandDSL repo, BUILD_INFO
    parmak izli iki türev).
  - `emit-manifest.mjs` (`.tcdsl → manifest.json`, emit sonrası **otomatik** adım) — `build.manifest.mjs`
    ile bundle'lanır (TechDsl servisleri + `manifestContent` gömülü). `validate-tech` ile **aynı**
    grammar+src hash'i taşır (aynı `src/tech` kaynağı). `contract` araç içinde doc.uri'ye göre çözülür;
    severity-1 error'da emit ETMEZ (exit 1). `--version` → `grammarHash` + `techSrcHash`.
- Gömülü `__BUILD_INFO__` İKİ parmak izi taşır (`node validate-tech.mjs --version`):
  - **`grammarHash`** = `sha256(tech-dsl.langium + shared.langium)` → **grammar**'ı izler.
  - **`techSrcHash`** = `sha256(src/tech/**.ts + src/shared/**.ts, relpath dahil)` → **validation
    mantığını** izler (manifest/edges/validation/entity-graph/witness/scope…).
- **Bayatlık (iki eksen):** grammar değişti → `grammarHash` değişir; validation mantığı değişti
  (grammar-DIŞI bir fix — ör. `manifest.ts` görünürlük türevi) → **`techSrcHash` değişir** (grammar
  hash AYNI kalsa bile). İki hash'ten biri kaynakla uyuşmuyorsa bundle bayattır → yeniden build et.
  > **Neden iki hash:** grammar-hash tek başına `src/tech/*.ts` mantık değişikliklerini kaçırırdı
  > (validation `riskOf/modeOf/accessOf/serializeExpr/exprNodeEqual` ve check'leri grammar değil).
  > `techSrcHash` bu boşluğu kapatır.

## 3. Çağrı sözleşmesi

```
node validate-tech.mjs <dosya.tcdsl | dizin> [--json]
node validate-tech.mjs --version
```
- **Birim = DİZİN.** Bir dosya verilirse onu içeren dizin doğrulanır (tüm `.tcdsl` birlikte →
  import/cross-module çözümü). ⚠ Bu yüzden emit dizininde **yalnız o analizin** dosyaları olsun;
  alakasız `.tcdsl`'ler çift-tanım/çakışma üretir.
- **`--json`:** stdout = saf diagnostics dizisi (`{severity,line,col,message,file}`); stderr =
  meta + özet. **Varsayılan:** insan-okur rapor.
- **Çıkış kodu:** `0` = error yok · `1` = ≥1 severity-1 error · `2` = kullanım/girdi hatası.
- **severity:** 1=error · 2=warning · 3=info.

## 4. Diagnostics → düzeltme döngüsü

1. Çalıştır. **error (severity 1)** varsa → düzelt, tekrar çalıştır. **0 error olmadan döngüden
   ÇIKMA.** (Yarım bırakma.)
2. **warning (severity 2)** çoğunlukla **divergence/kapsam sinyali**dir (ownership/access-sapma,
   consistency mode-eksik, görünürlük-belirsiz, rolemap-typo, SharedUtils, "differs",
   **kapsam-eksik**). Her birini **kullanıcıya takip sorusu** olarak yansıt:
   - *Ownership-sapma:* "İş analizi daha dar (`own`) diyor, `any`'e genişletme bilinçli mi?"
   - *Erişim-sapma:* "İş bu kaydı salt-okunur sayıyor; tech'te yazıyorsun — kasıtlı mı?"
   - *Consistency mode-eksik:* "Bu cross-module yazma anında mı (async) yoksa dayanıklı mı (durable)?"
   - *Görünürlük:* "Bu işlem nasıl çağrılıyor — bir protokol mü, yoksa iç (@internal) mi?"
   - *Kapsam-eksik (`checkUnrealizedBusinessOps`):* "Şu business-op'lar hiçbir tech operation'a
     bağlanmadı — bunları bu turda kapsamayacak mıyız (bilinçli erteleme) yoksa atladık mı?"
   Warning'i ya **gider** ya da kullanıcı onayıyla "bilinçli" olarak **belgele**.
3. **info (severity 3):** kayıt amaçlı (kapsama: linklenmemiş guard vb.). Gerekmedikçe kullanıcıya
   taşıma; ama "business guard tech'te ele alınmadı" info'ları bir **eksik** işaret edebilir — gözden geçir.

## 5. Doğrulama yoksa

Bundle üretilemiyorsa (CommandDSL erişilemez), valid-by-construction + §A self-check (`consistency-
and-emit.md`) ile devam et; ama bundle varsa **MUTLAKA çalıştır** ve error'da düzeltme döngüsüne gir.
