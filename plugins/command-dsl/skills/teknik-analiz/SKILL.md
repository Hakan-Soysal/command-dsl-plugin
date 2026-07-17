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

## Değişmezler (v1 — parafraz YASAK, harfiyen taşınır)

Bu blok fazlardan bağımsızdır: **fazlar "ne zaman", değişmezler "her zaman"**.
Uzun/çok-fazlı oturumda aşınırlar; bu yüzden faz-sınırında, emit öncesinde ve her
hata-düzeltme döngüsünden sonra **harfiyen** yeniden okunur (parafraz = anchor-drift).

1. **Büyü yok — her şey authored.** Skill SORAR, cevabı UYDURMAZ. Boşluğu örtük
   yetkiyle doldurma; **çıkarım soru üretir, cevap üretmez.**
2. **ÇİFT-SIFIR.** Emit ancak 0-error VE 0-sessiz-eksik ile geçer: ★-süpürme
   yapılmış, güvenlik-değeri (yetki/hassasiyet genişliği) teşhir edilmiş, sınır-devri —
   başka aktör/modül/ekrana el-değiştirme — sorulmuş olmalı.
3. **Warning = çözülmemiş soru.** Skill warning'i kendi uydurduğu düzeltmeyle
   kapatamaz — kapanış authored: sor→düzelt / gerekçeli-kabul / yanlış-pozitif
   göster. Sessiz auto-fix YASAK.
4. **Structural-first.** Yapısal çözülebilen yapısal kalır; yalnız gerçek
   serbest-proza `note`. Yorumlar makinece anlamsızdır.
5. **Gate ≠ niyet.** Gate'ler yalnız MEKANİĞİ kanıtlar; niyet-uyumunun tek
   otoritesi KULLANICIDIR — hiçbir gate-geçişi AskUser'ı iptal edemez.

## In-flight öz-denetim (bahane → çürütme · red-flags)

Bir değişmezi (★-süpürme, güvenlik-teşhiri, geri-okuma) atlamak için içten gelen
gerekçeye karşı — Gate ÇIKIŞTA kilitler, bu blok SÜREÇ-İÇİNDE, Gate'e varmadan düzeltir:

| Atlatma bahanesi | Çürütme |
|---|---|
| "Bu proje basit, Envanter'e gerek yok" | Basitlik ★-süpürmeyi kaldırmaz; ★ yine sorulur ya da örtük-kapandığı gösterilir. |
| "Kullanıcı acele ediyor" | ÇİFT-SIFIR hiçbir tempoda kısalmaz; hız = daha az laf, daha az soru DEĞİL. |
| "Cevabı tahmin edebiliyorum" | Tahmin = çıkarım; çıkarım cevap değil SORU üretir (Değişmez-1). |
| "Bunu sonra hallederiz" | Ertelenen ★ authored-kayıt olur (durum=beklemede), sessizce düşmez. |

**Red flags (kendini yakala):** ★-soru atlandı · faz-sırası bozuldu · kullanıcıya
sorulmadan clause dolduruldu · warning sessiz kapatıldı · gate-geçti diye AskUser
atlandı. Biri olduysa DUR, adını koy, düzelt.

## Altın kurallar (her oturumda geçerli)

- **DSL-jargonu gösterme.** "consistency mode", "ABAC", "saga", "sourceOfTruth", "deployable"
  gibi terimleri ASLA kullanıcıya sorma. Somut cümleden *sen* türet: kullanıcı "bu işlem
  ödeme sağlayıcısını çağırıp başarısız olursa geri almalı" der; sen bunu
  `calls Stripe.Charge compensate with Stripe.Refund`'a çevirirsin. "Havale, hesabın bakiyesi
  yeterliyse geçer" → `access { reads Account as src by from }` + `rule { amount <= src.balance }`.
  "Limit kontrolü için risk-module'üne bakmalı" → `calls Risk.GetLimit as cap` + `rule { amount <= cap }`.
- **⭐ Jargon-gizlemenin İSTİSNASI = kavram-koçluğu.** Bazı teknik eksenler kullanıcının iş-cümlesinden
  TÜRETİLEMEZ, çünkü kavramın var olduğunu bilmez (OAuth scope, idempotency, optimistic-locking, PKCE…).
  Böyle bir eksende ne **sessizce atla** (spec eksik kalır) ne de **jargon dök**. Üçüncü yol: **düz-dille
  açıkla + neden BU app için önemli + hangi SOYUT kararı istiyorsun** — sonra kararı al; teknik terimi yine
  SEN türetip DSL'e yazarsın. Örn: *"İki üye aynı son koltuğa aynı anda basarsa çift-rezervasyon olabilir;
  'aynı kişi bir derse bir kez' güvencesini koyalım mı?"* (idempotency). *"Bazı kullanıcıları sadece-okumaya
  kısıtlamak ister misin?"* (scope). **KURAL KORUNUR:** çıktı (manifest) hâlâ SOYUT + sağlayıcı-nötr'dür —
  provider adı / secret / PKCE / konsol-ekran-yolu manifest'e GİRMEZ. Bunlar **runtime kararı**dır; kurulum
  el-tutması `spec-context`'in CLAUDE.md'sine ve `behavior-gate` runtime-input'una aittir (canlı-dökümanla,
  ekran-yolu gömmeden). **Kavramı öğret, soyut kararı çıkar; kurulumu downstream'e bırak.**
- **Hibrit onay.** Her fazda önce **toplu öneri** (kısa liste), sonra tek soruyla onay.
  Kullanıcı bir öğeye takılırsa orada derinleş. Onay almadan alt faza inme.
- **Güvenlik-zayıflatan her eksende MUTLAKA sor.** ownership genişletme, roles yetki-aşımı,
  access read→write yükseltme — bunlarda varsayım YAPMA, açıkça sor ve onayla. Saf-teknik
  mekanikte (pagination key, idempotent param) makul varsayım + toplu onay yeterli.
- **Anti-pattern guard'larını aktif tut.** Her fazın tipik hatası işaretli; sessizce yakala,
  nazikçe sor.
- **Birinci-sınıf olmayanı `note` ile yakala.** DSL'in yapısal karşılamadığı ama işe-ait bir
  kural/kısıt/karar (op-kapsamlı SLO/performans, veri-saklama/silme, in-transit şifreleme,
  arayüz-sürümü, ya da formalize edilemeyen bir iş-kuralı) gelirse **kaybetme** — op-düzeyi
  `note` ile DSL dosyasına yaz (`#` yorumu derlemede atılır; `note` makinece taşınır →
  üretece/geliştiriciye ulaşır). Sıra: **yapısal-önce** (hassas→`@sensitivity`/`@crypto`,
  çapraz-kesen güvence→`guarantee`), yapısal karşılık yoksa `note`. Saf proje-yönetimi (maliyet,
  milestone, paydaş-siyaseti) DSL'e GİRMEZ — aile-üstü.
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
- **İkisi de YOKSA (ne `operations.json` ne `.cdsl`) → DUR.** Kullanıcıyı `is-analizi-dsl` skill'ine
  yönlendir (önce iş analizi çıkarılır); bu skill onun ÇIKTISINDAN başlar. **Sessizce `standalone`'a
  düşme** — standalone TÜM fidelity check'lerini (entity-kapsama, CQRS, güvenlik-zayıflatma, kapsam)
  içi-boş bırakır ve skill'in "sadakat" amacını geçersiz kılar (bkz. "Neyi neden" §1). Kullanıcı
  bilinçle saf-tech (iş analizi olmayan) bir model istiyorsa bunu AÇIKÇA onaylat ve belgele.

Sonra sekiz elicitation fazını (Faz 0–7) sırayla yürüt; ardından **opsiyonel** Faz 8'i (guarantee,
yalnız çapraz-kesen garanti varsa). (Elicit top-down: büyük resim → detay; emit dependency-order.)

**Sessiz-eksik disiplini (her faz + emit).** Faz'lar zorunlu ekseni kapatır; ama **opsiyonel**
yetenekler (hassasiyet, concurrency, idempotent, pagination, audit, trigger, saga…) sorulmazsa
**sessizce yok sayılır** — doğrulayıcı bunu YAKALAMAZ (YANLIŞ'ı yakalar, EKSİK'i değil). Dinlerken
`references/tech-dsl-reference.md` **Yetenek Envanteri**nin "sinyal" kolonunu tara (kullanıcı "SSN"
der, `@sensitivity`'yi *sen* bilirsin); eşleşmeyi aday-soru olarak kuyruğa al, hibrit onayla toplu
sor. Emit'ten önce **★** satırlarını süpür → aşağıda "Emit" (Pre-Emit Gate, ÇİFT-SIFIR).

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
- "Bu alanlardan biri **kişisel/hassas veri** mi (kimlik no, sağlık, iletişim, konum) ya da
  **at-rest şifrelenmeli** mi (parola, kart, sır)?" → alan-önü dekorasyon:
  `@sensitivity.tag(level: "pii")` ve/veya `@crypto.encrypted(description: "…", algorithm: "…")`.
  Opsiyonel/authored (sert-gate değil) — hassas görüneni **işaretsiz bırakma**; sor ve açıkça yaz
  (büyü yok). Sınıflandırma modelli; **saklama/silme gerçeklemesi** üreteç-politikasıdır (sorulursa
  söyle, DSL'e mekanik yazma; kalıcı bir kural notu gerekiyorsa op-`note`'a düşür).
- "Bu alanın **izinli değer-uzayı** dar mı — sayısal bir **aralık** (yaş 13-120, öncelik 1-5) ya da
  **kapalı bir küme/durum listesi** (durum ∈ {Taslak, Gönderildi})?" → alan-sonu `in <lo>..<hi>` (range,
  yalnız sayısal tip) veya `in {A|B|C}` (union, String/enum). **Sinyal soruyu TETİKLER, değer-uzayını
  UYDURMA — uçları/kümeyi kullanıcıdan al.** ⚠ Alanın tipi bir **enum** ise union üyeleri o enum'un
  **alt-kümesi** olmalı (enum-dışı değer → `union-not-in-enum` error); range yalnız sayısal, union
  yalnız String/enum tiptedir (§Refinement). Sınır belirlenince **boundary-value** aday-sorusunu da ekle
  (min-1/min/max/max+1; sınır dahil mi, sınır-dışı hangi `NotValid` payload'ını üretir).

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
  realizes BizOp`. **Param adları tekil olmalı** (`checkParamUniqueness` → dup=error).
- "Bir **girdi-parametresinin** izinli aralığı/kümesi var mı (miktar 1-100, tür ∈ {A,B})?" → param-sonu
  `in <lo>..<hi>` / `in {A|B|C}` (Field ile aynı tip-uyumu; §Refinement). Bu, sınır-dışı değerin
  **NotValid (400) hata-gövdesini** makine-okunur biçimde şekillendiren **`op.violations[]`**'a
  (`ruleId=<param>.<kind>`) derive edilir → üreteç/tüketici red'i kural-kimliğiyle kurar (elle-doğrulamaya
  düşmez). Değer-uzayını **sor, uydurma**; taksonomi eşlemesi (ihlal→NotValid) Faz 5'te teyit edilir.
- **Tekil obje dönen işlemde "onu NE belirliyor?" SOR.** Dönüş tek bir kayıtsa (`: Order` —
  `list of` DEĞİL) imzada o kaydı **belirleyen** bir girdi olmalı: ya **kaydın kendi ID'si**
  (`GetOrder(id: OrderId): Order`), ya da **onu var eden** kaydın ID'si (`GetCart(userId: UserId):
  Cart` — sepet kullanıcı yüzünden vardır). Belirleyici girdi yoksa seçimi tüketici **uydurur**
  (tablonun tamamında "ilk kaydı al") → dev'de tek satırla çalışır, prod'da YANLIŞ kayıt döner.
  **İstisnalar:** (a) **net filtre belirteci** — son/ilk/en büyük/en küçük
  (`GetLatestAnnouncement(): Announcement`); (b) **ephemeral/anlık türev** — kayıt değil, o an
  hesaplanan değer (şu anki hava durumu, şu anki kullanım adedi).
  ⚠ **İstisna bedava değildir:** (a)'da **seçim ölçütünü** (hangi alana göre "son"?) `note` ile
  yaz — yoksa tahmini yalnızca bir adım öteye taşımış olursun.
- "Hangi kayıtları okuyor / yaratıyor / güncelliyor / siliyor?" → `access { reads … creates …
  updates … deletes … }`. Komut/sorgu ayrımı access'ten türer (write-sınıfı varsa komut).
- **`@rest`'li op'ta param-bağlama SOR:** "Hangi girdi **URL'de** (path), hangisi **query/header'da**,
  hangisi **gövdede** taşınıyor?" → param-önü `@http.path` · `@http.query(name: "…")` ·
  `@http.header(name: "…")` · `@http.payload` (isimli-arg zorunlu; reference §9). Yazılmazsa
  bağlama üretecin varsayımına kalır → uç sözleşmesi kayar.
- "Bu işlemin çağrılması **denetim/uyum kaydı** gerektiriyor mu (finansal işlem, kişisel-veri
  erişimi)?" → op-önü `@audit.logged(category: "…", retention: "…")` (opsiyonel/authored). `retention`
  sınıflandırmadır; saklama gerçeklemesi üreteç-politikası. **SIRA:** annotation prelude'ları
  (`@audit`/`@trigger`/`@metric`) serving'lerden (`@rest`/`@internal`) ÖNCE yazılır — ters sıra
  parse HATASI (grammar: annotation=member-öneki, serving=operation-içi; bkz. reference §9 SIRA).

**⚠ Anti-pattern — CQRS kayması & access yükseltme:** iş'in "sorgu" saydığı işleme write
access verme (warning); iş'in salt-okunur saydığı entity'yi tech'te mutasyon etme
(güvenlik-zayıflatma warning) — **kasıtlıysa onaylat**.
**⚠ Anti-pattern — belirsiz tekil dönüş:** tek kayıt dönen imzada belirleyici girdi yok
(`GetActiveOrder(): Order`) → tüketici kayıt seçimini uydurur. **Hiçbir validator bunu
yakalamaz** — imza 0-error geçer → sorumluluk SENDE. İstisna değilse ID iste; istisnaysa
ölçütü `note`'a yaz.
**Kapatır:** `deriveKind`, `checkCqrsKind`, `checkAccessDivergence`. **Belirsiz tekil dönüş
için validator YOK** → elicitation + Pre-Emit Gate.

---

## Faz 4 — Yetki eksenleri (üç dik eksen)

**Amaç:** Kim / hangi satır / hangi öznitelik — üçünü açıkça yazdırmak.
**Elicit et:**
- "Bu işlemi **kim** çağırabilir?" → `roles` (capability; top-level `rolemap` ile iş
  aktörüne M:N bağlanır).
- "**Kimin kaydı** üzerinde?" → `ownership own|any|all|public|<relation>` (satır-düzeyi).
- Cevap `own`/`<relation>` ise **MUTLAKA devam sor**: "Bu sahiplik filtresi **hangi sütunda**
  kurulur — kaydın sahibini hangi alan tutuyor (`customerId`? `orgId`?)?" → `ownership … by
  <Entity>.<alan>, …` (sütun bağı; iş-entity'si >1 tech-entity'ye bölündüyse her birine ayrı bağ,
  virgülle). Sormazsan DSL eksik çıkar: validator **warning** verir ve üreteç filtre sütununu
  **TAHMİN** eder (yanlış sütun = satır sızıntısı). Bağlanan entity op'un `access`'inde ve alan
  skaler/enum olmalı (ADR-0038).
- **Cevap `<relation>` ise (own DEĞİL — "kendi kaydı değil, yetkilendirildiği/delege edildiği
  kayıtlar": bayi kendi müşterilerini, ajans temsil ettiği markaları görür) → `axis` ZORUNLU devam
  sorusu** (ADR-0040): *"Bu 'delege edilmiş' küme **hangi tabloda** tutuluyor? O satırın **hangi
  sütunu** çağıranla eşleşiyor — çağıranın **hangi alanıyla**? O satırda **erişilen hedefi gösteren**
  sütun hangisi — delege edilen müşteri/marka **hangi kolonda** (projeksiyon → `yields`)? Sette
  olması için satırın sağlaması gereken **koşullar** neler (iptal/pasif satırlar sette OLMAMALI)?"* →
  top-level
  `axis <ad> { principal … entity <Module>.<Entity>  yields <alan>  scoped by <sütun> = caller.<alan>
  when … }` + op'ta `ownership <ad> by <Entity>.<alan>`.
  ⚠ Link-tablosu alan **tiplerini VARSAYMA**: kapsam sütunu ile projeksiyon sütunu çoğu zaman
  **aynı tiptedir** (`agencyOrgId` ve `clientOrgId` — ikisi de OrgId); hangisinin çağıranla
  eşleştiğini (`scoped by`), hangisinin erişilen hedefi gösterdiğini (`yields`) **kullanıcıdan al**,
  ad-benzerliğinden çıkarma.
  **Sormazsan `ownership <ad>` yalnız bir İSİM olur** — hangi satırların sete girdiği sözleşmede HİÇ
  yazmaz → tüketici seti **TAHMİN** eder (ÖLÇÜLDÜ: sahada delege-olmayan kayıtlar sızdı). `when`
  sormayı atlarsan validator **warning** verir (koşulsuz axis = revoke edilmiş satırlar sette kalır).
  Axis'in kaynağı op'un `access { reads … }`'inde **authored** olmalı (yoksa error).
- "Bir **öznitelik koşulu** var mı (ör. sadece kendi bölgesindeki kayıt)?" → `permit when
  resource.* … actor.*` (ABAC). **Sorgularda da yazılabilir** (ADR-0040: `resource` = komutta tek
  write-hedefi, **sorguda tek read-hedefi**; manifest `effect:'filter'` → üreteç `.Where` emit eder).
- **`actor.*` yazdıran her cevap `principal` bildirimini TETİKLER** (ADR-0040): *"Çağıranın bu
  özniteliği (bölge/organizasyon/departman) **nerede** duruyor — hangi tabloda, hangi alanda? Kimliği
  (token/oturum claim'i) hangi ad taşıyor? Bu özne **hangi tech rolleriyle** çağırır?"* → top-level
  `principal <Ad> { identity <claim>  binds <Module>.<Entity> by <alan>  roles <r> }`.
  `roles` slot'u **authored**'dır (gramer ≥1 zorlar) — op'un `roles`'undan ÇIKARIM yapma
  (Değişmez-1 ihlali: çıkarım soru üretir, cevap üretmez); rolleri kullanıcıdan al. **Sormazsan `actor.*` OPAK kalır** ve yazar runtime
  karşılığı OLMAYAN bir ad uydurur — bu ÖLÇÜLMÜŞ kusur sınıfıdır (`actor.delegatedOrgIds`: runtime'da
  öyle bir şey yok + skaler=küme tip-yalanı → sahada **çağıran-bağımsız** denetim). Principal
  bildirilmişse `actor.<alan>` typo'su **error** olur; bildirilmemişse yalnız warning.
- OAuth kapsamı gerekiyorsa → `scope "…"`. **Kavram-koçluğuyla çıkar** (kullanıcı "scope"u bilmeyebilir):
  *"Giriş yapmış bir uygulamanın neyi yapabileceğini sınırlamak ister misin — ör. bu işlemi yalnız belirli
  yetkiye sahip token'lar çağırabilsin?"* → soyut `scope`. **Provider / secret / PKCE / konsol-ekranı
  manifest'e GİRMEZ** (runtime kararı → `spec-context` CLAUDE.md'si scope-varsa bunları canlı-dökümanla
  el-tutar; ekran-yolu gömmez).

**⚠ Anti-pattern — Yetki gevşetme:** ownership'i iş'ten geniş yapma (`own`→`any`), roller
yetkili aktör kümesini aşma. Bunlar **güvenlik-zayıflatma warning**'i — her birini açıkça onaylat.
**Kapatır:** `checkRoles`, `checkOwnershipDivergence`, `checkOwnershipRelation`, `checkOwnershipBinding`, `checkAbac`, `checkPrincipal`, `checkAxis`, `checkOwnershipAxis`.

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
- "Bir olay yayıyor / dinliyor mu?" → `emits <Event>` / `on <Module.Event>`. **Yayıyorsa ZORUNLU
  devam:** "Dinleyen tarafın işini görmesi için olay **hangi alanları** taşımalı?" → `event <Ad> { … }`
  payload'ı (entity DEĞİL — entity-tipli alan error; **ID + değerler** taşı; reference §3 wire-DTO).
  Payload'ı sormazsan olay yayılır ama tüketici kaynak modüle geri-sorgu uydurur.
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

## Faz 8 — Guarantee (opsiyonel, izlenebilirlik)

**Amaç:** Birden çok op/entity'ye **yayılan** çapraz-kesen bir insan-garantisini, onu ENFORCE
eden **mevcut** yapısal yükümlülüklere (invariant/guard/throws) bir **eşleme** ile bağlamak —
böylece o yükümlülüklerden biri silinir/yeniden-adlandırılırsa validator drift'i derleme-zamanı
yakalar. Bu faz **yeni mantık üretmez**; yalnız zaten yazılmış yükümlülükleri haritalar. **Yoksa atla.**
**Elicit et (yalnız gerekiyorsa):**
- "Bu tasarımda **birden çok işlemi kesen**, tek bir kayıt/kuralla sınırlı olmayan bir güvence
  var mı (ör. 'bir hesabın bakiyesi asla negatif olamaz', 'para hareketleri yalnız pozitif tutarla')?"
  → varsa `guarantee <Ad> "<insan-metni>"` + onu tutan yükümlülükleri `by invariant/guard/throws`
  ile eşle. Üst-akış gereksinim ID'si varsa → `traces "REQ-…"`.
- **Fonksiyonel-OLMAYAN, çapraz-kesen bir güvence** ("veri asla kaybolmaz", bir SLO/yanıt-süresi
  hedefi) geçerse mekanizma **uydurma**: yapısal yükümlülüğü (invariant/guard/throws) varsa
  `guarantee` + `traces "REQ-…"` ile bağla; salt-proza ise op-`note`'a düşür (üst-akış REQ-ID'sini
  not metnine yaz). İkisi de bilgiyi DSL dosyasında tutar — izlenebilirliği sessizce düşürme.
- Etiketle bağlanacak invariant'a §2'deki `as "<etiket>"` ekliliğini ver (`by invariant M.E : "etiket"`).

**⚠ Anti-pattern — garantiyi mantık zannetme / gereksiz sarma:** guarantee'ye kural YAZMA (mantık
invariant/rule/throws'ta kalır); **tek-op yerel** kuralı guarantee'ye sarma (zaten `invariant`/`rule`).
Yükümlülüğü olmayan salt-proza garanti → warning (`note` kullan). Yinelenen ad → error.
**Kapatır:** `checkGuarantee` (guard/throws/invariant-etiket çözünürlüğü → error; boş → warning),
`checkGuaranteeNames` (dup → error). Tam sözdizimi/kısıt: `references/tech-dsl-reference.md §11`.

---

## Emit (dependency-order) + Doğrulama + manifest.json

**Emit:** Linked `.tcdsl`. ⚠ Bir sistemin **tüm domain module'leri TEK kök dosyada** olmalı
(manifest üreteci yalnız kök dokümanı gezer — `consistency-and-emit.md §C` manifest kısıtı);
modülleri tip-bazlı dosyalara **bölme**, dosya içinde dependency sırasında diz (referans verilen
önce). `import` yalnız extension-pack içindir. `contract` + her op/entity'de `realizes` zorunlu.
(Varsa) `guarantee`'ler **en sonda** — module/op/invariant'lara referans verdikleri için.
Tam tutarlılık self-check'i ve dosya kuralı: `references/consistency-and-emit.md`.

**Emit-öncesi "Ne sormadım?" geçidi — ÇİFT-SIFIR (0-error VE 0-sessiz-eksik).** 0-error tek başına
YETMEZ: doğrulayıcı YANLIŞ'ı yakalar, EKSİK'i değil. Emit'ten önce üç süpürme:
1. **Sessiz-eksik (★ süpürmesi):** `references/tech-dsl-reference.md` **Yetenek Envanteri**nin **★**
   satırlarını gez; bu oturumda sorulmamış her ★ için ya örtük kapandığını/gerçekten yok olduğunu
   göster, ya tek doğrulama sorusu sor ("Bu kayıtlarda hassas veri var mı? / Bu liste büyüyebilir
   mi, sayfalama gerekir mi? / Aynı istek iki kez gelirse sorun olur mu?"). Hiçbir ★'ı sessizce atlama.
2. **Sessiz-yanlış (teşhir):** zorunlu construct'lar **yanlış değerle de** 0-error geçer — özellikle
   **yetki eksenleri** (`roles` genişliği · `ownership own|any|all|public` · `permit`). Seçtiğin authz
   değerini sessiz emit etme: "Bu op'u yalnız X rolü, kendi kaydında yapabiliyor — doğru mu?" diye
   açıkça söyle ve onaylat (Faz 4 "güvenlik-zayıflatan eksende sor" ilkesinin emit-anı teşhiri).
   Aynı sınıf: **tekil dönüşlü her op'ta belirleyici girdi var mı?** (`: <Entity>`, `list of` değil)
   — yoksa istisna mı (son/ilk/en büyük · ephemeral) ve **ölçütü `note`'ta mı**? İmza 0-error
   geçer ama kayıt seçimi tüketiciye kalır → sessiz-yanlış.
3. **Sınır-devri (köprü süpürmesi):** bir fact sınırı geçip **köprüsüz** mü kaldı?
   - **Cross-module (kardeş module):** bir module başka module'ün verisine/olayına muhtaç mı? Köprü
     açık olmalı — read → `calls <Module>.<Query>` (yalnız QUERY); write → `emits`+`on` (event;
     kardeş module'e `calls`-write YOK); referans → `sourceOfTruth`. Köprüsüz "öteki module halleder"
     varsayımı = sessiz kayıp.
   - **External/uncharted:** bir dış-sistem çağrısı köprüsüz mü varsayılıyor? → `calls System.Op`
     (yan-etkili ise `compensate with` = saga; salt-okur ise `readonly`).

**Kalan warning = çözülmemiş soru (üçüncü hâl — error değil, sessiz-eksik değil).** Warning'i skill
KENDİ uydurduğu düzeltmeyle kapatamaz — çözüm **authored**'dır (büyü yok). Meşru kapanış üç: (a) sor →
cevaba göre düzelt, (b) gerekçeli kabul, (c) yanlış-pozitif olduğunu göster. Sessiz auto-fix / sessiz
geçiştirme YASAK. Kabul gerekçesi düşülebilir bilgidir → op-`note` ile makinece taşı.

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
