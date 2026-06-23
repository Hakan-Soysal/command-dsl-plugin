---
name: teknik-analiz
description: >-
  Onaylanmış bir İş Analizini (CommandDSL `.cdsl` ve/veya onun `operations.json`
  çıktısı) girdi alıp, bir mimar gibi her teknik belirsizliği amansızca sorgulayarak
  ve her aşamada onay alarak tutarlı bir Teknik Analiz'e — module/deployable topolojisi,
  entity sınırları, operation imzaları, yetki eksenleri, hata taksonomisi, tutarlılık ve
  etkileşim — çevirir; çıktıyı **linked** TechDsl (`.tcdsl`) olarak üretir ve Tech DSL'in
  kendi doğrulayıcısıyla 0 error'a kadar kanıtlar. Şu durumlarda MUTLAKA kullan: kullanıcı
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
  `calls Stripe.Charge compensate with Stripe.Refund`'a çevirirsin.
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

- **`operations.json` var mı?** Varsa doğrulamanın omurgasıdır; **v2** (`schemaVersion: 2`)
  olduğunu teyit et (değilse doğrulayıcı error verir → güncel İş DSL üreticisiyle yeniden üret).
- **Sadece `.cdsl` mı var?** Önce ondan operations.json üret:
  `npx tsx <CommandDSL>/scripts/emit-operations.ts <girdi.cdsl> <çıktı.operations.json>`.
  `.cdsl` parse hatalıysa CLI emit etmez — **önce iş tarafını düzelttir**, tech'e geçme.

Sonra sekiz fazı sırayla yürüt. (Elicit top-down: büyük resim → detay; emit dependency-order.)

---

## Faz 0 — Bağlam & Mod

**Amaç:** Linked moda bağlan. `contract './<...>.operations.json'` bildir.
**Kapatır:** `checkContractVersion` (v2 değilse error) + tüm fidelity check'lerinin önkoşulu.

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

**⚠ Anti-pattern — validation↔rule karışması:** request-only deterministik-fail → validation;
dış/stateful data gereken → rule. İş guard'ından ifade sapması → warning.
**Kapatır:** `checkExprDivergence`; 6'lı result-type taksonomisi.

---

## Faz 6 — Etkileşim & tutarlılık

**Amaç:** Sistemler-arası akışı, tutarlılığı ve tetiklemeyi netleştirmek.
**Elicit et:**
- "Dış sistem / başka module çağrısı var mı?" → `calls Sys.Op`. "Başarısız olursa geri
  alınmalı mı?" → `compensate with Sys.Undo` (saga).
- "Cross-module yazma **anında mı** olmalı yoksa **arka planda dayanıklı** mı?" →
  `consistency async|durable`. (Cross-write var ama mode yoksa → warning.)
- "Aynı çağrı yanlışlıkla iki kez gelirse ne olmalı?" → `idempotent by <param>`.
- "Bir olay yayıyor / dinliyor mu?" → `emits <Event>` / `on <Module.Event>`.
- "Liste dönüşü sayfalanıyor mu?" → `paginated by cursor|offset <field> asc|desc`.
- "Bu işlem **nasıl tetikleniyor / yayınlanıyor**?" → `@rest(...)`/`@internal`/`@trigger.*`.
  (Görünürlük belirsizse → warning.)

**⚠ Anti-pattern:** mode'suz cross-write (warning); key'siz idempotent (error); komutta/
list-değilde pagination (error); ne protokol ne `@internal` (warning).
**Kapatır:** `checkConsistencyMode`, `checkPagination`, `checkVisibility`, idempotent/emits/on linker'ları.

---

## Faz 7 — External / Uncharted sınırları

**Amaç:** Üretmediğimiz ama çağırdığımız sistemleri bildirmek.
**Elicit et:**
- "3. parti mi (Stripe — sahibi sen değilsin) yoksa **şirkete ait ama dökümante edilmemiş**
  bir sistem mi (mainframe)?" → `external N{…}` vs `uncharted N{…}`.
- Her çağrılan uç: imza + (varsa) `serving` (nasıl çağrılır) + bilinen `validation` (caller-side
  fail-fast). Üreteç bu sistemin KENDİSİNİ üretmez ama **çağrı adapter'ını** üretir.
**Kapatır:** sınır muafiyeti (entity-kapsamadan muaf).

---

## Emit (dependency-order) + Doğrulama

**Emit:** Linked `.tcdsl`, **module-bazlı** dosyalara böl (tip bazlı değil), dependency
sırasında (referans verilen önce). `contract` + her op/entity'de `realizes` zorunlu.
Tam tutarlılık self-check'i ve dosya bölme: `references/consistency-and-emit.md`.

**Doğrula (zorunlu):** Gömülü Tech doğrulayıcısını çalıştır:
```
node <validator>/validate-tech.mjs <emit-dizini> --json
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
  warning→takip-sorusu döngüsü.
- `references/examples/` — parser-doğrulanmış (0 error) linked `.tcdsl` exemplar'lar.
