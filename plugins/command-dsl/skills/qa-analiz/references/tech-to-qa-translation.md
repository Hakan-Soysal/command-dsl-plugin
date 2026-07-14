# Tech → QA eşlemesi (.tcdsl + operations.json → .qa)

> **En kritik dosya.** Faz 2-5'te oku. Dal envanteri kullanıcıdan DEĞİL, buradaki
> mekanik türetimden çıkar — kullanıcıya yalnız KARAR sorulur (nasıl test / neden
> waive). İki girdinin NE verdiğini karıştırmak bu skill'in en büyük hata sınıfıdır:
> dal/veri/stub/assert **tech**'ten, akış/süreç evreni **operations.json**'dan gelir.

## A. `.tcdsl` clause → dal eşleme tablosu (spec §4.1 birebir + §4.5 event-tetikli satırı)

Op-başına dal envanterini bu tabloyla KENDİN çıkar, kullanıcıya düz dille sun:

| Tech clause | Doğurduğu dal | covers biçimi | Kullanıcıya düz-dil sunumu |
|---|---|---|---|
| her operation | Success | `covers Success` | "başarılı çağrı" |
| `validation { … for guard "x" }` | guard-dalı (NotValid sınıfı) | `covers guard "x"` | "girdi kuralı: <kuralın anlamı>" |
| `rule { … for guard "y" }` | guard-dalı (NotProcessable sınıfı) | `covers guard "y"` | "iş kuralı: <kuralın anlamı>" |
| `throws E` | named-error dalı | `covers error E` | "<E'nin anlamı> hatası" |
| `roles …` | NotAuthorized·roles | `covers NotAuthorized roles` | "yanlış roldeki kullanıcı" |
| `ownership …` (`public`, `any`, `all` hariç — any/all dal türetmez, waive de yazma) | NotAuthorized·ownership | `covers NotAuthorized ownership` | "başkasının kaydına erişim" |
| `permit when …` | NotAuthorized·permit | `covers NotAuthorized permit` | "koşullu izin dışı çağrı" |
| `scope …` | NotAuthorized·scope | `covers NotAuthorized scope` | "kapsam dışı çağrı" |
| id'siz validation check(ler)i | TEK anonim NotValid dalı (S5) | `covers NotValid` | "adsız girdi kuralları (topluca)" |
| id'siz rule check(ler)i | TEK anonim NotProcessable dalı (S5) | `covers NotProcessable` | "adsız iş kuralları (topluca)" |
| `calls <Ext.Op> compensate with <Ext.Op2>` — hedef `external`\|`uncharted` | callFailure dalı | `covers callFailure <Ext.Op>` | "dış servis çökerse (telafisiyle)" |
| `on Module.Event` (consumer op) | dal uzayı AYNI kurallarla; tek fark act biçimi | test `when event … with { … }` yazar (karar #11) | "olay gelince ne yapıyor" |

- Karşılıksız hedef (olmayan guard-id, olmayan error, mekanizmasız op'a NotAuthorized,
  olmayan mekanizma-niteleyicisi, compensate'siz/iç calls'a callFailure) → **error**
  (covers/expect/waive üçünde de aynı kural — spec §4.3/m6).
- Aynı dalı birden çok test kapsayabilir (redundans serbest; merged `coveredBy[]`
  hepsini listeler). Senaryo `expect`'leri de coverage'a sayılır (karar #12).

## A2. Tech `guarantee` → coverage rollup (guarantee-coverage sinerjisi)

Tech DSL'de bir `guarantee` (çapraz-kesen izlenebilirlik; tech-dsl §11) **yeni dal
DOĞURMAZ** — zaten §A'da türettiğin guard/throws dallarına bir **eşleme** koyar. QA
tarafı guarantee YAZMAZ; merged `qa.json`'a garantinin **rollup**'ını ekler. Yükümlülük
türü → durum kaynağı:

| Guarantee yükümlülüğü | testable? | coverage durumu nereden |
|---|---|---|
| `by guard <Op> : "id"` | **evet** | o op'un `guard "id"` dalının QA durumu (covered/waived/uncovered) — §A |
| `by throws <Op> : E` | **evet** | o op'un `error E` dalının QA durumu — §A |
| `by invariant <Ent> : "etiket"` | hayır | **structural** (dal değil; `coveredBy: []`, rollup dışı) |
| `by operation <Op>` | hayır | **structural** (belirli dal yok) |

- **Garanti rollup'ı:** `covered` (tüm testable yükümlülük covered/waived) · `partial`
  (bazısı) · `uncovered` (hiçbiri) · `structural` (hiç testable yok — yalnız invariant/operation).
- **Türetim mekaniği:** guarantee'nin `by guard`/`by throws` işaret ettiği op-dalı zaten
  §A envanterindedir; onu test/waive ederek garantiyi de ilerletirsin. Ekstra bir `covers`
  biçimi YOK — guarantee'ye doğrudan test yazılmaz, yükümlülük-dalları test edilir.
- **Sorgulama sinyali:** `partial`/`uncovered` bir garanti = çapraz-kesen bir güvencenin
  test-kapsaması eksik. CLI `garantiler:` özeti + `⚠` ile kapsanmayan yükümlülükleri listeler;
  kapanışta (Faz 6) "bu garantinin şu guard'ı test edilmemiş — test mi, waive mı?" sorusuna çevir.

## B. NotAuthorized mekanizma-seçim rehberi (karar #21 + İQ8)

- Op'ta **TEK** yetki mekanizması varsa: çıplak `covers NotAuthorized` yeterlidir —
  emit'te etkin mekanizmaya çözülür (İQ8: per-file manifest'te bile `via:'roles'` vb.
  yazılır; `via:null` manifest'te görünmez). Yine de okunabilirlik için niteleyiciyi
  yazmak serbesttir.
- **BİRDEN ÇOK** mekanizma varsa (ör. `roles` + `ownership`): niteleyici **ZORUNLU**
  (niteleyicisiz → error "mekanizma belirtin"). Gerekçe güvenlik-kritiktir: yanlış-rol
  testi ownership yolunu sessizce örtmemeli.
- Sorgulama kalıbı (mekanizma-başına AYRI karar al): "Bu işleme iki ayrı kapı var —
  (a) yanlış roldeki kullanıcı, (b) doğru rolde ama **başkasının kaydına** erişen
  kullanıcı. Hangilerini test edelim, hangisini neden geçelim?" Tipik desen (spec §7
  exemplar): ownership yolu elle test edilir (`as musteri` + `seed p1 = … owner:
  baskaMusteri` + `when call with { id: p1 }`), roles yolu P1 jenerik-kimlik
  gerekçesiyle waive edilir.
- Test verisi ipucu: ownership testi İKİ persona ister (çağıran + kaydın sahibi) —
  Faz 1'de `baskaMusteri` benzeri ikinci kimliği ekletmiş ol.

## C. Anonim dal katlaması (S5)

Tech'te `for guard` opsiyoneldir; id'siz check'ler tek tek adreslenemez
(indeks-tabanlı adresleme kırılgan). Kural:

- Op'un id'siz **validation** check'leri (0'dan çoksa) → TEK "anonim NotValid" dalı;
  `covers NotValid` hepsini birden kapsar.
- Id'siz **rule** check'leri → TEK "anonim NotProcessable" dalı.
- Doğrulayıcı info üretir: "dal-düzeyi coverage için `for guard` önerilir" — bunu
  **tech'e iyileştirme önerisi** olarak raporla ("teknik analizde şu kurallara ad
  verilirse her biri ayrı izlenebilir"); qa tarafında bekletme, katlanmış dalı
  tek testle/waive'le kapat.

## D. Stub-birleşimi HESABI (QA-07) — emit'ten önce KENDİN hesapla

Bir test/senaryo için zorunlu stub kümesi:

```
yürütülen op'lar  = { when-op }                    (testte)
                  ∪ { tüm step-op'ları }           (senaryoda)
                  ∪ { tüm given-call op'ları }     (ikisinde de)

zorunlu stub'lar  = bu op'ların DOĞRUDAN `calls` hedeflerinden
                    external | uncharted BoundaryOp olanların BİRLEŞİMİ
```

- **Eksik stub → error; birleşim-dışı hedefe stub → error.** Stub `defaults for <Op>`
  bloğundan gelebilir (İQ3 öncelik: given-stub > defaults; ilk sağlayan kazanır).
- **İç-modül `calls` stub'LANMAZ (karar #10)** — gerçek koşar; birleşime girmez.
- **S14:** iç-modül compensate'li calls **callFailure dalı da doğurmaz** (stub'lanamaz
  → deterministik tetiklenemez); doğrulayıcı bunları uses-tech node'una info ile
  listeler — kullanıcıya açıkla: "bu telafi yolu, hedef op'un kendi dallarıyla dolaylı
  test edilir".
- Compensate'siz external calls: stub beyanı yine ZORUNLU (birleşim kuralı), ama
  failure dalı zorunlu coverage DEĞİL.
- Kullanıcıya taşıma biçimi: error'ı değil İHTİYACI söyle — "bu test şu dış servise
  dokunuyor; test sırasında ne cevap versin?" (`returns { … }` — dönüş tipine
  tip-doğrulanır, S18 degrade) veya "çökmüş gibi mi davransın?" (`fails`).

## E. callFailure → ServerError türetimi (P8)

`covers callFailure <Ext.Op>` dalının türetilmiş beklenen outcome'u **ServerError**'dır
(S10 tablosu; P8: stub `fails` davranışının sonuç sınıfı normatif olarak ServerError).
Dal anahtarı yine `callFailure{target}` kalır — manifest'te ikisi ayrı alandır.
Kullanıcıya: "dış servis çökünce kullanıcıya sistem-hatası döner; biz burada ayrıca
**telafinin koştuğunu** kanıtlarız" → `then { compensated <compensator>  not emitted …
state <Entity> absent { … } }`.

## F. Dal uzayına GİRMEYENLER — "sorma, üreteç yapar" tablosu

Bunlar için test İSTENMEZ ve YAZILMAZ; kullanıcı isterse tek cümle gerekçeyle sınırı
açıkla (politika detayları: `interrogation-playbook.md` §P):

| Kullanıcı isteği / tech sinyali | Neden dal DEĞİL | Karşılığı |
|---|---|---|
| "girişsiz/kimliksiz deneyince ne olur testi" (NotAuthenticated) | global politika (karar #6) | P1: üreteç, kimlik isteyen (roles\|ownership\|permit\|scope taşıyan) her op için jenerik kimliksiz-çağrı testi üretir |
| "sunucu hatası testi" (ServerError) | altyapı davranışı | P2: üreteç isterse taksonomi-uyumlu hata zarfını tek altyapı testiyle doğrular (callFailure dalının outcome'u ServerError'dur ama dal anahtarı callFailure kalır — §E) |
| "sayfa boyutu / imleç testi" (`paginated by`) | mekanik | P3: jenerik sıralama-tutarlılığı + size-üst-sınırı + imleç-devamlılığı testleri üretilir; yazar isterse `page`/`after` yüzeyiyle VERİ-ÖZEL doğrulama ekler (karar #16) |
| `consistency async` | politika | P12: async efektler test yürütmesinde senkron-eşdeğer tamamlanmış kabul edilir; polling YASAK |
| entity `invariant` | politika | P13/S16: dokunulan entity'lerin invariant'ları her test/step sonunda ÖRTÜK assert edilir — ayrıca yazdırma |
| "her testten sonra temizlik" | politika | P6: her test/senaryo temiz state ile başlar |
| `idempotent by` / `concurrency optimistic` | v1.1 dal-adayı (spec §9) | bugün istenirse senaryo + `state count 1` ile elle modellenebilir; zorunlu coverage değil |
| "yük/performans/kaos testi" | kapsam dışı (spec §9) | bu DSL davranış-doğrulama modelidir; başka araç işi |

Kullanıcı bu politikalardan FARKLI davranış isterse not düş — üreteç-politikası
değişikliği ayrı iştir, test-niyeti beyanı değil.

## G. operations.json → flow/process evreni (+ S12)

- Evren = operations.json v3'teki op-üyelik listelerinin **union'ı**: her op'un
  `flows[]` ve `processes[]` alanlarındaki id'lerin birleşimi (karar #20). Ayrı bir
  flow kataloğu aranmaz.
- `uses flows` bağlıyken her flow-id ve process-id için workspace'te en az bir
  `realizes flow/process` senaryosu yoksa → **warning** (#23/#24; strict'te de warning
  kalır — S6 yalnız dal-coverage vaadi). Presence uyarısı waive ile KAPANMAZ — ya
  senaryo yazılır ya belgeli-açık kalır.
- **Sınır beyanı (karar #24):** flow-coverage presence-DÜZEYİDİR; business flow'un
  iç-dallanmaları (either/optional/repeat) v1'de dal-düzeyi coverage'a girmez.
  Business OnSuccess aksiyonları test-dünyasında kapsam dışıdır.
- **S12:** bağlanan tech dosyasının kendi `contract` path'i, `uses flows`'a verilen
  dosyadan FARKLIYSA info — kullanıcıya sor: "teknik analiz başka sözleşmeye realizes
  ediyor; doğru operations.json'u mu bağladık?" Cevaba göre ya flows yolunu düzelt ya
  tech'i güncellet.

## G2. operations.json → outcome (ürün-hedefi) evreni (F3.6 `satisfies`, ADR-0037)

Flow/process evreninin YANINDA operations.json ölçülebilir bir **ürün-hedefi** evreni de
taşır: `successCriteria[]` (business `outcome { measure … }` construct'ının emit'i). Bu,
"davranış doğru" (dal-coverage) ile **"ürün başarılı"** (ölçülebilir sonuç) ayrımının
QA-tarafı kancasıdır — bir senaryo `satisfies <outcome>` yazarak o hedefin test-kanıtı
olduğunu bildirir.

- **Evren = `operations.json.successCriteria[].id`** (flows.ts bu id'leri okur; measure/
  covers/note QA-tarafını ETKİLEMEZ — yalnız `id` satisfaction-hedefidir). Ayrı bir hedef
  kataloğu aranmaz.
- **Presence-coverage (kapatılabilir hedef):** her outcome-id için workspace'te en az bir
  `satisfies` senaryosu yoksa → **warning** (`uses flows` satırında konsolide;
  warning-routed — strict'te de warning, **waive ile KAPANMAZ**; flow/process presence
  emsali). CLI: `outcome (authored satisfies): N · … karşılanan / … açık-hedef` + `⚠
  karşılanmayan outcome (senaryo yaz): …`.
- **Bilinmeyen outcome `satisfies` → error** (`realizes`'ın karşılıksız-hedef kuralıyla aynı).
- **PIN — `covers` bir OP olan outcome:** business `outcome … covers <op>` yalnız bir op'u
  kapsıyorsa, senaryo o op'u ASLA realize edemez (senaryo yalnız flow/process realize eder)
  → o hedefin satisfaction-bağı için **TEK yol `satisfies`**'tir. Bu, `analyze --outcomes`
  türetilmiş op-kapsama raporundan AYRIDIR: o mevcut op-dal kapsamasını TOPLAR (rapor);
  `satisfies` outcome-düzeyinde YENİ kapatılabilir HEDEF yaratır (authored niyet).

**"Hangi senaryo hangi outcome'u satisfies eder" (elicitation-sunumu için):**

| operations.json `successCriteria.id` | QA-tarafı bağı | durum |
|---|---|---|
| ölçülebilir ürün-hedefi (ör. `ProposalThroughput`) | `scenario "…" [realizes flow/process X] satisfies ProposalThroughput { … }` | covered (satisfies senaryosu var) |
| `satisfies` senaryosu YAZILMAMIŞ hedef | — | uncovered = **kapatılabilir açık-hedef** (warning; senaryo yaz ya da belgeli-açık bırak) |

- **Sınır:** `satisfies` presence-DÜZEYİDİR — outcome'un `measure` eşiğinin GERÇEKTEN
  tutulup tutulmadığını ölçmez (metrik prozadır, ADR-0037 #1); senaryo yalnız o hedefi
  **kanıtlama-niyetini** bildirir. Eşiğin sağlanması çalışma-zamanı/analitik işidir, QA
  DSL kapsamı değil.

## H. Guard-id tekilliği (S17) — düzeltme yeri TECH

- Op-içi `validation ∪ rule` birleşiminde guard-id'ler tekil olmalı; ihlal qa
  link-time **error**'dur ve guard'a referans yazılmasa bile PROAKTİF raporlanır
  (uses-tech özetinde). Tech bugün bunu kendisi denetlemiyor — ilk yakalayan qa'dır.
- **Qa tarafında yamalamaya çalışma** (farklı guard'a covers yazmak, dalı waive'lemek
  çözüm değildir): kullanıcıya "teknik analizde aynı kural-adı iki kez kullanılmış;
  önce orayı düzeltelim" de, `teknik-analiz` skill'ine yönlendir, tech düzelince
  doğrulamayı tekrarla.

## I. Neyi YAZMAYACAKSIN (sınır disiplini)

- **Beklenen outcome** — S10 türetir; `then outcome` diye bir yüzey yok.
- **Üreteç-politikası testleri** — §F tablosu; DSL yüzeye çıkarmaz (S8: manifest'e de
  yazılmaz).
- **Test kodu / framework adı** (xUnit/Jest/K6) — üreteç kapsamı (karar #1); qa'nın
  işi test-manifest sözleşmesinin doğru ve tam olması.
- **Negatif veri türetimi** — v1'de negatif veri ELLE yazılır (karar #8): validator
  dalın kapsandığını sayar, girdinin gerçekten ihlal ettiğini İDDİA ETMEZ; bu yüzden
  ihlal-girdisini kullanıcıyla birlikte bilinçli kur.
- **Business gerçeğinin kopyası** — kural sorgulaması `teknik-analiz`'in işiydi; qa
  kuralları yeniden bildirmez, test niyetini bildirir.
