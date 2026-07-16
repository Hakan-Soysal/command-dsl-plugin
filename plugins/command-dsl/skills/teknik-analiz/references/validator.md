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
node validate-tech.mjs <dosya.tcdsl | dizin> [--json] [--single]
node validate-tech.mjs --version
```
- **Birim = DİZİN.** Bir dosya verilirse onu içeren dizin doğrulanır (tüm `.tcdsl` birlikte →
  import/cross-module çözümü). ⚠ Bu yüzden emit dizininde **yalnız o analizin** dosyaları olsun;
  alakasız `.tcdsl`'ler çift-tanım/çakışma üretir.
- **`--single` (opt-in):** yukarıdaki tuzağın çıkış yolu — dizin-genişletme atlanır, yalnız
  verilen **DOSYA** girdi olur; alakasız komşu `.tcdsl`'ler HİÇ yüklenmez (komşu hataları
  çıktıya/exit-code'a karışmaz). `import` (extension-pack) kapanışı yine TAM çözülür
  (TechDsl'in kendi DocumentBuilder'ı kapanışı otomatik çeker); linked `contract`
  (operations.json) çözümü de DEĞİŞMEZ. Kapanış dosyalarındaki tanılar **fail-loud**'dur:
  `(kapanış)` etiketiyle raporlanır VE sayılır (bozuk import hedefi = exit 1); `--json`'da
  bu tanılar `"closure": true` alanı taşır. `--single` bir **dizinle** çağrılırsa exit 2.
  Varsayılan davranış (bayraksız = dizin-birimi) DEĞİŞMEDİ.
- **`--json`:** stdout = saf diagnostics dizisi (`{severity,line,col,message,file}`); stderr =
  meta + özet. **Varsayılan:** insan-okur rapor.
- **Çıkış kodu:** `0` = error yok · `1` = ≥1 severity-1 error · `2` = kullanım/girdi hatası.
- **severity:** 1=error · 2=warning · 3=info.

## 4. Diagnostics → düzeltme döngüsü

1. Çalıştır. **error (severity 1)** varsa → düzelt, tekrar çalıştır. **0 error olmadan döngüden
   ÇIKMA.** (Yarım bırakma.) Yeni provenance/cross-module error sınıfları (ADR-0030/0031) ve fix'i:
   - *`validation = input-only; 'X' input parametresi değil`* → `validation` state'e bakıyor; ya
     `X`'i param yap ya da bu kontrolü **`rule`'a taşı** (state-bağımlıysa).
   - *`rule: 'X' gizli veri bağımlılığı`* → rule kökü bildirilmemiş; `access { reads E as X by <param> }`
     ekle (entity state) ya da `calls M.Q as X` (cross-module/dış read).
   - *`rule: 'X' belirsiz instance (≥2 read)`* (B3) → aynı tipten iki read; her birine `as <alias> by <param>`
     ver, rule'da alias kullan.
   - *`cross-module 'X' write-sınıfı (command)`* → cross-module `calls` query-only; write'ı **event/saga**'ya
     çevir (`emits`/`on`). *`'X' @internal (module-private)`* → hedef op'tan `@internal`'i kaldır (cross-module
     çağrılabilir olmalı) ya da farklı (exposed) bir query çağır.
   - *`read-only olmayan call sonucu gate-edilemez`* → gate edilen boundary-op'a `readonly` ekle (gerçekten
     read-only ise) ya da rule'u o sonuçtan ayır.
   - *`in`-kümesi enum-üyelik (`checkInSetEnumMembership`, ADR-0038 K9b):* `x in { … }` LHS yaprağı
     enum-tipliyse kümenin her üyesi o enum'un üyesi olmalı (dört bağlam: invariant/validation/rule/permit) →
     TYPO/enum-dışı değeri gerçek enum üyesiyle değiştir (manifest tip-uzayıyla çelişen predicate emit edilmez).
2. **warning (severity 2)** çoğunlukla **divergence/kapsam sinyali**dir (ownership/access-sapma,
   consistency mode-eksik, görünürlük-belirsiz, rolemap-typo, SharedUtils, "differs",
   **kapsam-eksik**). Her birini **kullanıcıya takip sorusu** olarak yansıt:
   - *Ownership-sapma:* "İş analizi daha dar (`own`) diyor, `any`'e genişletme bilinçli mi?"
   - *Ownership sütun-bağı eksik (`checkOwnershipBinding`, ADR-0038):* "`own`/`<relation>` satır-filtresi
     kurar — hangi sütunda? (`by <Entity>.<alan>` bildir; aksi halde üreteç filtre sütununu tahmin eder.)"
   - *Erişim-sapma:* "İş bu kaydı salt-okunur sayıyor; tech'te yazıyorsun — kasıtlı mı?"
   - *Consistency mode-eksik:* "Bu cross-module yazma anında mı (async) yoksa dayanıklı mı (durable)?"
   - *Görünürlük:* "Bu işlem nasıl çağrılıyor — bir protokol mü, yoksa iç (@internal) mi?"
   - *Rule misclassification (ADR-0031):* "rule yalnız input'a bağlı (state kökü yok) → `validation`
     daha doğru" — kontrol gerçekten request-only mi? Öyleyse `validation`'a çevir.
   - *Guard rol-sapması (`role-mismatch`, ADR-0039):* *"business guard '<id>' bir sonuç-filtresi
     (role=result-filter …); tech 'rule/validation' onu fail-semantiğine eşliyor"* — sorgunun
     `only when`'i dönen kümeyi DARALTIR; `rule` (422) / `validation` (400) ise operasyonu DÜŞÜRÜR:
     "kümeyi daralt" sessizce "hata ver"e dönüşmüş. **Fix: bu `for guard` link'ini kaldır** — bu bir
     sonuç-filtresidir, fail-check'e eşlenmez; tech'e filtre clause'u da YAZILMAZ (filtre
     `operations.json`'da `ast`+`role` ile hazır durur, üreteç `.Where(ast)`'i ORADAN uygular;
     manifest süperset değil, ADR-0013 K1). Bu warning'de o link için AST-kıyası ("differs") atlanır.
   - *Kapsam-eksik (`checkUnrealizedBusinessOps`):* "Şu business-op'lar hiçbir tech operation'a
     bağlanmadı — bunları bu turda kapsamayacak mıyız (bilinçli erteleme) yoksa atladık mı?"
   Warning'i ya **gider** ya da kullanıcı onayıyla "bilinçli" olarak **belgele**.
3. **info (severity 3):** kayıt amaçlı (kapsama: linklenmemiş guard vb.). Gerekmedikçe kullanıcıya
   taşıma; ama "business guard tech'te ele alınmadı" info'ları bir **eksik** işaret edebilir — gözden geçir.

## 5. Doğrulama yoksa

Bundle üretilemiyorsa (CommandDSL erişilemez), valid-by-construction + §A self-check (`consistency-
and-emit.md`) ile devam et; ama bundle varsa **MUTLAKA çalıştır** ve error'da düzeltme döngüsüne gir.

## İnsan-okur rapor aracı (`report-tech.mjs`)

0-error emit'ten (`emit-manifest.mjs` → `manifest.json`) sonra çalışan gömülü rapor
üreteci (varsayılan otomatik; opt-out kuralı SKILL.md'de):

```
node ${CLAUDE_SKILL_DIR}/validator/report-tech.mjs <manifest.json> --reports <dizin> [--title "<Proje>"] [--quiet]
```

- **exit:** 0 = üretildi · 1 = girdi bozuk/şema-dışı (HİÇBİR rapor yazılmaz — gate) ·
  2 = kullanım hatası (olmayan girdi yolu dahil — aile hizası).
- **Üretilenler** (`reports/tech/…`): `context.puml` (modül-bağlam haritası: modüller +
  external/uncharted sistemler; callEdges okları — external düz · uncharted «?» ·
  compensate'li kenarda telafi etiketi · eventual kesikli — + subscription yayın okları) ·
  `er/<modül>.puml` (modül-başına ER: entity alanları + `ref`-ilişki kenarları +
  invariant note'ları + concurrency/realizes etiketleri) · `sagas/<op-slug>.puml`
  (YALNIZ compensate'li dış çağrısı olan op'lar: çağrı sırası + failure dalında
  telafiler TERS sırada + başarıda emits) · `events.puml` (üretici op → event →
  subscription consumer akışı) · `docs/<modül>.md` (operasyon el kitabı: imza +
  serving + visibility + realizes + yetki eksenleri + guard metinleri + throws +
  access CRUD + emits/calls + idempotent/concurrency/consistency/pagination) ·
  `ACCESS.md` (op × entity CRUD matrisi) · `AUTH.md` (op × yetki mekanizması:
  roles · ownership · abac · scopes) · `COVERAGE.md` (op→realizes tablosu +
  `coverage.unrealizedBusinessOps` + `uncoveredEntities`).
- `meta.hasErrors: true` taşıyan bir girdi (skill akışının dışından gelen manifest —
  `emit-manifest.mjs` gate'i skill akışında böylesini üretmez) raporlarda belirgin
  "işaretli koşu" uyarısıyla işaretlenir.
- **Index regen kuralı:** her koşu sonunda `reports/index.md` + `index.html` **diski
  TARAYARAK yeniden üretilir** (idempotent — hangi aile aracı son koşarsa koşsun aynı
  index; bölüm sırası business→tech→frontend→qa; dört aile skill'i aynı `reports/`
  kökünde birleşir, aynı `--title`'ı ver). `.puml` girdileri göreli kaynak linki +
  plantuml.com/plantuml/svg/ görüntüleme linkiyle listelenir (render harici
  sunucuda — hassas içerikte tıklamamak kullanıcının tercihi).
- **Bayatlık:** `REPORT-SNAPSHOT.json` — `srcHash` = CommandDSL `src/tech-report/**`
  kaynakları + ortak report-index modülü. **Grammar hash'i YOK** — araç saf
  manifest→puml/md dönüşümüdür, dile dokunmaz; §2'deki `validate-tech`/`emit-manifest`
  SNAPSHOT'ından bağımsızdır ve ona dokunmaz. Rapor bundle'ı **aile-eşzamanlı build**
  kuralına tabidir: ortak index modülü dört skill'de byte-özdeş kopyadır → tüm aile
  rapor bundle'ları AYNI CommandDSL repo durumundan birlikte tazelenir.
