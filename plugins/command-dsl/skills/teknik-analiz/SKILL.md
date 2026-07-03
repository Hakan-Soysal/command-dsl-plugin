---
name: teknik-analiz
description: >-
  Onaylanmış bir İş Analizini (CommandDSL `.cdsl` ve/veya onun `operations.json`
  çıktısı) girdi alıp, bir mimar gibi her teknik belirsizliği amansızca sorgulayarak
  ve her aşamada onay alarak tutarlı bir Teknik Analiz'e — module/deployable topolojisi,
  entity sınırları, operation imzaları, yetki eksenleri, hata taksonomisi, tutarlılık ve
  etkileşim — çevirir; çıktıyı **linked** TechDsl (`.tcdsl`) olarak üretir ve Tech DSL'in
  kendi doğrulayıcısıyla 0 error'a kadar kanıtlar. 0-error geçince gömülü araçla
  üreteç/kesif girdisi `manifest.json` (dil-nötr tech model) OTOMATİK üretilir. Şu durumlarda MUTLAKA kullan: kullanıcı
  bir iş analizini/`.cdsl`'i teknik tasarıma dökmek istediğinde — "teknik analiz",
  "tech DSL üret", ".tcdsl yaz", "module/deployable tasarla", "operation imzası çıkar",
  "yetki/consistency/saga kararı", "operations.json'dan tech üret" dediğinde — veya açıkça
  DSL demese bile bir iş analizinin teknik karşılığını (mimari kararlarını) kurmak
  istediğinde. İş analizinin KENDİSİNİ çıkarmak için `is-analizi-dsl`'i kullan; bu skill
  onun ÇIKTISINDAN başlar.
---

# İş Analizi → Teknik Analiz (TechDsl)

Onaylanmış bir iş analizini, **tutarlı ve doğrulayıcı-temiz** bir Teknik Analiz'e çevir.
Karşındaki kişi mimari kararları veren biridir (mimar/teknik ürün sahibi); senin işin
DSL-jargonu (consistency mode, ABAC, saga, sourceOfTruth) sormadan, **somut sorularla**
kararı çıkarıp teknik karşılığını **arka planda** kurmaktır.

## Neyi neden böyle yapıyoruz (özü kavra)

Tech DSL, iş analizini **yeniden bildirmez** — ona `realizes` ile bağlanıp yalnız **teknik
delta**yı (sapmayı) taşır. İki ilke skill'in tüm tasarımını dayatır:

1. **Linked zorunlu — fidelity'nin tek garantisi.** Tech DSL'in tüm iş'e-sadakat
   denetimleri (entity-kapsama, CQRS kayması, roles/ownership/access **güvenlik-zayıflatma**,
   çift-sahiplik, sözleşme sürümü) doğrulayıcıda `contract` yoksa **sessizce geçer**.
   Bu yüzden çıktı her zaman **linked**'dir: model başında `contract './<...>.operations.json'`,
   her op'ta `realizes <BizOpID>`, her entity'de `realizes <BizEntityID>`. Standalone üretmek
   doğrulamayı içi-boş bırakır (yalnız sözdizimi onaylanır) — "doğru yazdığını kontrol et"
   amacı tam da **sadakat**tir.
2. **Büyü yok — her şey authored.** Tech DSL'de gizli miras YOKTUR: route/roles/ownership/
   validation/rule/access her zaman **kaynakta açıkça yazılır**. Yani business değeri
   "otomatik dolmaz" → her ekseni **kullanıcıya sorup açıkça yazdırırsın**. Sapma (divergence)
   bir hata değil **bilinçli sinyaldir** → doğrulayıcının çoğu çıktısı **warning**'dir ve
   senin **ikinci tur sorgulamandır**.

**Doğrulayıcı = sorgulama checklist'in.** Her elicitation fazı tam olarak bir doğrulayıcı
karar-eksenini kapatır (bkz. faz başlıklarındaki "kapatır" satırı). Sorduğun her soru bir
bütünlük kuralını discharge eder — bu, "tutarlılık > sözdizimi" ilkesinin keyfi-olmayan iskeleti.

## Altın kurallar (her oturumda geçerli)

- **DSL-jargonu gösterme.** "consistency mode", "ABAC", "saga", "sourceOfTruth", "deployable"
  gibi terimleri ASLA kullanıcıya sorma. Somut cümleden *sen* türet: kullanıcı "bu işlem
  ödeme sağlayıcısını çağırıp başarısız olursa geri almalı" der; sen bunu
  `calls Stripe.Charge compensate with Stripe.Refund`'a çevirirsin. "Havale, hesabın bakiyesi
  yeterliyse geçer" → `access { reads Account as src by from }` + `rule { amount <= src.balance }`.
  "Limit kontrolü için risk-module'üne bakmalı" → `calls Risk.GetLimit as cap` + `rule { amount <= cap }`.
- **Hibrit onay.** Her fazda önce **toplu öneri** (kısa liste), sonra tek soruyla onay.
  Kullanıcı bir öğeye takılırsa orada derinleş. Onay almadan alt faza inme.
- **Güvenlik-zayıflatan her eksende MUTLAKA sor.** ownership genişletme, roles yetki-aşımı,
  access read→write yükseltme — bunlarda varsayım YAPMA, açıkça sor ve onayla. Saf-teknik
  mekanikte (pagination key, idempotent param) makul varsayım + toplu onay yeterli.
- **Anti-pattern guard'larını aktif tut.** Her fazın tipik hatası işaretli; sessizce yakala,
  nazikçe sor.
- **Onaylanmamış hiçbir şeyi emit etme.** Üretim en sondadır.

## Başlamadan

Girdiyi netleştir:

- **`operations.json` var mı?** Varsa doğrulamanın omurgasıdır; **v3** (`schemaVersion: 3`)
  olduğunu teyit et (değilse doğrulayıcı error verir → güncel İş DSL üreticisiyle yeniden üret).
- **Sadece `.cdsl` mı var?** Önce ondan operations.json üret — **gömülü self-contained araç**
  (CommandDSL deposu GEREKMEZ):
  `node ${CLAUDE_SKILL_DIR}/validator/emit-operations.mjs <girdi.cdsl> <çıktı.operations.json>`
  (`${CLAUDE_SKILL_DIR}` = bu skill'in dizini; CWD kullanıcının cwd'si olduğundan göreli yol kullanma).
  `.cdsl` parse hatalıysa araç emit etmez (exit 1) — **önce iş tarafını düzelttir**, tech'e geçme.

Sonra sekiz fazı sırayla yürüt. (Elicit top-down: büyük resim → detay; emit dependency-order.)

---

## Faz 0 — Bağlam & Mod

**Amaç:** Linked moda bağlan. `contract './<...>.operations.json'` bildir.
**Kapatır:** `checkContractVersion` (v3 değilse error) + tüm fidelity check'lerinin önkoşulu.

---

## Faz 1 — Module / Deployable topolojisi (SINIRLAR)

**Amaç:** Bağımsız tutarlılık + deploy sınırlarını çıkarmak.
**Elicit et (düz dille):**
- "Hangi işler **tek bir tutarlılık balonu** içinde olmalı (aynı anda, ya hep ya hiç)?"
  → her balon bir `module`. **Transaction module sınırını AŞMAZ**; module-arası = async/eventual.
- "Bunlar tek bir uygulama olarak mı dağıtılıyor, yoksa ayrı ayrı mı?" → `deployable`
  (varsayılan tek monolit; yalnız >1 olunca bildir). In-process vs ağ çağrısını belirler.
- İş `operations.json` işlemlerini module'lere dağıt (M:N — paylaşılan işlemden türer).

**⚠ Anti-pattern — Module şişmesi:** Her şeyi tek module'e tıkma. "Bu iki iş gerçekten aynı
transaction'da mı olmalı, yoksa biri olup diğeri sonra mı olabilir?" Cevap "sonra olabilir"
ise sınır oradadır.
**Kapatır:** entity-kapsama zemini, `checkDoubleOwnership`, consistency `risk` türevi
(cross-module write → eventual), write-cycle (SCC) tespiti.

---

## Faz 2 — Entity & veri sınırları

**Amaç:** Her module'ün sahip olduğu teknik kayıtları ve sınır-aşan bağları kurmak.
**Elicit et:**
- "Bu sınırda hangi kayıtlar tutuluyor, hangi alanlarla?" → `entity` + nötr-tipli alanlar
  (teknik-only alanlar dahil). İş entity'sine **kaba** `realizes` (0..N).
- "Bu kayıt **başka bir sınırdaki** kayda bağlanıyor mu?" → **ASLA** entity-tipli alan;
  **ID-skaler + sourceOfTruth(Module.Entity)**. (Aynı sınırdaki bağ → doğrudan entity-tipi serbest.)
- "Bu kayıt için **her zaman** doğru kalması gereken bir kural var mı?" → `invariant`.
- "Aynı kaydı iki kişi aynı anda güncellerse çakışma riski var mı?" → `concurrency optimistic`.

**⚠ Anti-pattern — Sınır-aşan navigasyon:** cross-module entity-tipli alan (error) veya
cross-module entity üzerinden path navigasyonu (error). Modül verisi internal; cross-module
veri yalnız `calls` ile akar.
**Kapatır:** `checkCrossModuleEntityField`, `checkSourceOfTruth`, `checkInvariantScope`,
`checkConcurrency`, `checkEntityCoverage` (write-set entity aynı module'de realize edilmeli).

---

## Faz 3 — Operation imzası & realizes

**Amaç:** Her iş işlemini teknik bir operation'a çevirmek — **açık imza** (iş'ten türetilemez).
**Elicit et:**
- "Bu işlem teknik olarak hangi girdileri alır, ne döner?" → `operation Ad(p: Tip, …): Dönüş
  realizes BizOp`.
- "Hangi kayıtları okuyor / yaratıyor / güncelliyor / siliyor?" → `access { reads … creates …
  updates … deletes … }`. Komut/sorgu ayrımı access'ten türer (write-sınıfı varsa komut).

**⚠ Anti-pattern — CQRS kayması & access yükseltme:** iş'in "sorgu" saydığı işleme write
access verme (warning); iş'in salt-okunur saydığı entity'yi tech'te mutasyon etme
(güvenlik-zayıflatma warning) — **kasıtlıysa onaylat**.
**Kapatır:** `deriveKind`, `checkCqrsKind`, `checkAccessDivergence`.

---

## Faz 4 — Yetki eksenleri (üç dik eksen)

**Amaç:** Kim / hangi satır / hangi öznitelik — üçünü açıkça yazdırmak.
**Elicit et:**
- "Bu işlemi **kim** çağırabilir?" → `roles` (capability; top-level `rolemap` ile iş
  aktörüne M:N bağlanır).
- "**Kimin kaydı** üzerinde?" → `ownership own|any|all|public|<relation>` (satır-düzeyi).
- "Bir **öznitelik koşulu** var mı (ör. sadece kendi bölgesindeki kayıt)?" → `permit when
  resource.* … actor.*` (ABAC).
- OAuth kapsamı gerekiyorsa → `scope "…"`.

**⚠ Anti-pattern — Yetki gevşetme:** ownership'i iş'ten geniş yapma (`own`→`any`), roller
yetkili aktör kümesini aşma. Bunlar **güvenlik-zayıflatma warning**'i — her birini açıkça onaylat.
**Kapatır:** `checkRoles`, `checkOwnershipDivergence`, `checkOwnershipRelation`, `checkAbac`.

---

## Faz 5 — Hata & sonuç taksonomisi

**Amaç:** Başarısızlıkları client'ın ayırt-edebileceği biçimde sınıflandırmak.
**Elicit et:**
- "Bu işlem hangi **ayırt-edilebilir** hatalarla başarısız olur?" → module-level
  `error N: <ResultType>` + op'ta `throws`. ResultType ∈ {NotAuthenticated, NotAuthorized,
  NotValid, NotProcessable}.
- "Bu kontrol **isteğin kendisiyle** mi (yanlış format → 400) yoksa **sistem durumuyla** mı
  (yetersiz bakiye → 422) ilgili?" → `validation { }` (400) vs `rule { }` (422). İş guard'ına
  bağlanıyorsa guard-id link ver.
- **Provenance ZORUNLU (ADR-0031 — validator artık enforce eder):** ayraç verinin kökenidir.
  - `validation` ifadesi **yalnız input param**'a bakabilir (`amount > 0`). State'e bakıyorsa →
    error; ya `rule`'a taşı ya param'la.
  - `rule` state-kökü **bildirilmeli.** Stateful bir kural çıkarınca DEVAMINDA sor: "Bu kural
    **hangi kaydın** state'ine bakıyor, **hangi input** o kaydı seçiyor?" → `access { reads <E>
    as <alias> by <param> }`, rule'da `alias.field`. (Çıplak `balance` YAZMA → "gizli veri
    bağımlılığı" error; aynı tipten ≥2 read → `as`/`by` zorunlu, B3.) Başka context'in verisi
    gerekiyorsa → cross-module query (Faz 6).

**⚠ Anti-pattern — validation↔rule karışması + bildirilmemiş kök:** request-only deterministik-fail
→ validation; dış/stateful → rule (state-kökü access/calls ile **bildirilmiş**). state-in-validation
→ error; yalnız-input rule → misclassification warning; bildirilmemiş rule kökü → "gizli veri
bağımlılığı" error. İş guard'ından ifade sapması → "differs" warning (dik eksen).
**Kapatır:** `checkValidationInputScope`, `checkRuleStateScope`, `checkExprDivergence`; 6'lı result-type.

---

## Faz 6 — Etkileşim & tutarlılık

**Amaç:** Sistemler-arası akışı, tutarlılığı ve tetiklemeyi netleştirmek.
**Elicit et:**
- "Dış sistem / başka module çağrısı var mı?" → `calls Sys.Op`. "Başarısız olursa geri
  alınmalı mı?" → `compensate with Sys.Undo` (saga). **`calls` argümansızdır** (arg = gövde-seam).
- **Cross-module READ (ADR-0030):** "Bu işlem **başka bir module'ün** verisine (limit, skor,
  durum) ihtiyaç duyuyor mu — ve buna göre mi karar veriyor?" → `calls <Module>.<Query> as <alias>`,
  sonra `rule { … <alias> … }`. **Yalnız QUERY hedeflenebilir** (hedef write-sınıfı/command ise
  error → o etkileşim **event/saga**'dır); hedef **non-`@internal`** olmalı. Senkron read ama
  **consistency-garantisiz** (türev; ayrı `consistency` gerekmez). Entity'ler private → başka
  module'ün verisine **yalnız** böyle (op-çağrısıyla) erişilir.
- "Cross-module **yazma** **anında mı** olmalı yoksa **arka planda dayanıklı** mı?" →
  `consistency async|durable`. (Cross-write var ama mode yoksa → warning. Cross-module write
  `calls` ile DEĞİL — `emits`/`on`/saga ile.)
- "Aynı çağrı yanlışlıkla iki kez gelirse ne olmalı?" → `idempotent by <param>`.
- "Bir olay yayıyor / dinliyor mu?" → `emits <Event>` / `on <Module.Event>`.
- "Liste dönüşü sayfalanıyor mu?" → `paginated by cursor|offset <field> asc|desc`.
- "Bu işlem **nasıl tetikleniyor / yayınlanıyor**?" → `@rest(...)`/`@internal`/`@trigger.*`.
  (Görünürlük belirsizse → warning.)

**⚠ Anti-pattern:** mode'suz cross-write (warning); key'siz idempotent (error); komutta/
list-değilde pagination (error); ne protokol ne `@internal` (warning); **cross-module `calls`
hedefi command/write (error — event/saga'ya çevir) veya `@internal` (error — module-private)**;
`calls X.Y(arg)` (parse hatası — argümansız).
**Kapatır:** `checkConsistencyMode`, `checkPagination`, `checkVisibility`, `checkCrossModuleCall`,
idempotent/emits/on linker'ları.

---

## Faz 7 — External / Uncharted sınırları

**Amaç:** Üretmediğimiz ama çağırdığımız sistemleri bildirmek.
**Elicit et:**
- "3. parti mi (Stripe — sahibi sen değilsin) yoksa **şirkete ait ama dökümante edilmemiş**
  bir sistem mi (mainframe)?" → `external N{…}` vs `uncharted N{…}`.
- Her çağrılan uç: imza + (varsa) `serving` (nasıl çağrılır) + bilinen `validation` (caller-side
  fail-fast, **input-only**). Üreteç bu sistemin KENDİSİNİ üretmez ama **çağrı adapter'ını** üretir.
- "Bu dış uç **yan-etkisiz bir sorgu** mu (fraud-skoru, fiyat) ve sonucuna göre **rule** mı
  vereceksin?" → `readonly operation …` (ADR-0030 K4). Yalnız `readonly` işaretli boundary-op
  sonucu `rule`'da gate-edilebilir; işaretsiz = yan-etkili varsayılır (compensate-eligible).
**Kapatır:** sınır muafiyeti (entity-kapsamadan muaf); `readonly` ile rule-gateability.

---

## Emit (dependency-order) + Doğrulama + manifest.json

**Emit:** Linked `.tcdsl`. ⚠ Bir sistemin **tüm domain module'leri TEK kök dosyada** olmalı
(manifest üreteci yalnız kök dokümanı gezer — `consistency-and-emit.md §C` manifest kısıtı);
modülleri tip-bazlı dosyalara **bölme**, dosya içinde dependency sırasında diz (referans verilen
önce). `import` yalnız extension-pack içindir. `contract` + her op/entity'de `realizes` zorunlu.
Tam tutarlılık self-check'i ve dosya kuralı: `references/consistency-and-emit.md`.

**Doğrula (zorunlu):** Gömülü Tech doğrulayıcısını çalıştır:
```
node ${CLAUDE_SKILL_DIR}/validator/validate-tech.mjs <emit-dizini> --json
```
- **error** varsa → düzelt, tekrar çalıştır. **0 error olmadan döngüden çıkma.**
- **warning**'leri **kullanıcıya takip sorusu** olarak geri yansıt ("İş analizi bu entity'yi
  salt-okunur sayıyor ama sen yazıyorsun — kasıtlı mı?"). Validator'ın warning'leri ikinci tur
  sorgulamandır.
- **Kapsam (op-düzeyi fidelity):** Linked doğrulayıcı, sözleşmedeki **hiçbir tech operation'a
  bağlanmamış** business-op'ları tek warning'le listeler → "bunlar kapsam-dışı mı (bilinçli
  erteleme) yoksa atlandı mı?" diye sor; atlandıysa ekle, ertelendiyse onayla-belgele.
- Konum çözümleme, bayatlık (grammar + tech-src hash) uyarısı ve diagnostics→düzeltme döngüsü:
  `references/validator.md`.

**manifest.json'ı OTOMATİK üret (validate-tech 0-error geçince).** Bu, `kesif`/üretecin
(techgen) tükettiği **dil-nötr tech model**dir — `operations.json` ile birlikte devir paketini
tamamlar. Gömülü araç, `validate-tech` ile **aynı kaynaktan** derlenir (grammar+src hash birebir eşit):
```
node ${CLAUDE_SKILL_DIR}/validator/emit-manifest.mjs <kök.tcdsl | emit-dizini> <çıktı/manifest.json>
```
- Manifest, `contract`'ı bildiren **kök** `.tcdsl`'den üretilir; `contract` (operations.json)
  araç içinde doc.uri'ye göre çözülür → `realizes` join'leri ve `coverage` dolar. Import edilen
  extension-pack'ler (ADR-0019) manifest'e **girmez** ama closure'a yüklenir.
- Araç **kendi içinde gate'ler**: `.tcdsl`'de severity-1 error varsa manifest ÜRETMEZ (exit 1) —
  `emitManifest` hatalı modelde de degrade manifest döndürdüğü için "doğrulama tamamlanınca üret"
  garantisi prose'a değil **araca** gömülüdür.
- ⚠ **Validator-temiz ≠ üreteç-derlenebilir.** Doğrulayıcının kabul ettiği bazı yapılar üretecin
  desteğinin dışında olabilir (ör. techgen 0.2.x: `Timestamp` skaleri C#'a eşlenmez; `Money >= int`
  invariant'ı derlenmez). Bu emit'in değil **üreteç yeteneğinin** sınırıdır — kapsam eşlemesi
  `kesif` skill'inin işidir (capability gate). Manifest sadık kalır; sapma orada raporlanır.

---

## İnsan-okur raporlar (otomatik)

`manifest.json` 0-error'la üretildikten sonra rapor aracı **OTOMATİK** koşulur —
varsayılan davranıştır; kullanıcı istemezse tek cümleyle atlanır (opt-out):

```
node ${CLAUDE_SKILL_DIR}/validator/report-tech.mjs <çıktı>/manifest.json --reports <çıktı>/reports --title "<Proje>"
```

Girdi, `emit-manifest.mjs`'in ürettiği `manifest.json`'dır. Üretilenler
(`reports/tech/…`; hepsi araca gömülü **programatik üreteçlerden** — el yazımı
görsel yok): `context.puml` (modül-bağlam haritası) · `er/<modül>.puml`
(modül-başına ER) · `sagas/<op-slug>.puml` (YALNIZ telafili — compensate'li — dış
çağrısı olan op'lar) · `events.puml` (event akışı) · `docs/<modül>.md` (operasyon
el kitabı) · `ACCESS.md` / `AUTH.md` / `COVERAGE.md` matrisleri. Ardından araç
`reports/index.md` + `index.html`'i **diski tarayarak YENİDEN üretir** (idempotent;
bölüm sırası business→tech→frontend→qa) — dört aile skill'i aynı `reports/` kökünde
birleşir; hepsinde **aynı `--title`**'ı ver.

Exit sözleşmesi: **0** üretildi · **1** girdi bozuk/şema-dışı (HİÇBİR rapor
yazılmaz — gate; zaten 0-error emit'ten geliyorsan görülmez) · **2** kullanım
hatası (olmayan yol dahil). `meta.hasErrors: true` taşıyan bir manifest'te raporlar
belirgin "işaretli koşu" uyarısıyla işaretlenir — ama bu skill akışında manifest
zaten 0-error gate'inden üretildiğinden bu uyarı görülmez.

Kapanışta kullanıcıya `reports/index.md`'yi işaret et; `.puml`'ler index'teki
plantuml.com "görüntüle" linkleriyle açılır — görüntüleme harici sunucuda render
edildiğinden, içerik hassassa linke tıklamama tercihi kullanıcınındır (bunu tek
cümleyle not düş). Sözleşme detayı: `references/validator.md`.

---

## Referans dosyaları (gerektiğinde oku)

- `references/tech-dsl-reference.md` — TechDsl construct'larının tam sözdizimi/anlamı.
- `references/business-to-tech-translation.md` — operations.json → operation/entity eşlemesi;
  `realizes` köprüsü; authored vs derived; kaba read/write → CRUD. **En kritik dosya.**
- `references/interrogation-playbook.md` — her doğrulayıcı ekseni → düz-dil soruları +
  anti-pattern guard'ları.
- `references/consistency-and-emit.md` — emit öncesi bütünlük self-check + dependency-order
  emit + module-bazlı dosya bölme + linked zorunluluğu.
- `references/validator.md` — gömülü doğrulayıcı çağrımı + diagnostics→düzeltme +
  warning→takip-sorusu döngüsü + insan-okur rapor aracı (`report-tech.mjs`) sözleşmesi.
- `references/examples/` — parser-doğrulanmış (0 error) linked `.tcdsl` exemplar'lar.
