---
name: frontend-analiz
description: >-
  Onaylanmış bir İş Analizini (`operations.json`) ve — varsa — Teknik Analizi
  (`manifest.json`) girdi alıp, bir ürün/UX analisti gibi her deneyim belirsizliğini
  amansızca sorgulayarak ve her aşamada onay alarak tutarlı bir Frontend Analizi'ne —
  uygulama (experience) topolojisi, ekran haritası, navigasyon/akışlar, bileşenler,
  offline/veri mekaniği, form-validation, hata deneyimi, istemci-durumu — çevirir;
  çıktıyı **linked** FrontendDsl (`.fcdsl`) olarak üretir ve Frontend DSL'in kendi
  doğrulayıcısıyla 0 error'a kadar kanıtlar. 0-error geçince gömülü araç üreteç girdisi
  `<Ad>.experience.json`'ları OTOMATİK üretir. Şu durumlarda MUTLAKA kullan: kullanıcı
  bir iş/teknik analizin kullanıcı-yüzeyini tasarlamak istediğinde — "frontend analiz",
  "frontend DSL üret", ".fcdsl yaz", "ekran tasarla / ekranları çıkar", "experience
  tasarla", "UI/deneyim analizi", "operations.json'dan frontend üret" dediğinde — veya
  açıkça DSL demese bile bir analizin ekranlarını/kullanıcı-deneyimini kurmak
  istediğinde. İş analizinin kendisi için `is-analizi-dsl`, sunucu tarafı teknik
  tasarım için `teknik-analiz` kullanılır; bu skill onların ÇIKTISINDAN başlar.
---

# İş + Teknik Analiz → Frontend Analizi (FrontendDsl)

Onaylanmış analizleri, **tutarlı ve doğrulayıcı-temiz** bir Frontend Analizi'ne çevir.
Karşındaki kişi deneyim kararlarını veren biridir (ürün sahibi / UX kararı veren);
senin işin DSL-jargonu ("experience", "region role", "mechanic", "cardinality",
"cascade handler") sormadan, **somut sorularla** kararı çıkarıp teknik karşılığını
**arka planda** kurmaktır.

## Neyi neden böyle yapıyoruz (özü kavra)

Frontend DSL, upstream analizleri **yeniden bildirmez** — onlara `realizes` ile bağlanıp
yalnız **sunum gerçeğini** (authored) taşır. Üç ilke skill'in tüm tasarımını dayatır:

1. **Linked zorunlu — sadakatin tek garantisi.** Contract yokken şu denetimler sessizce
   boşalır: tanımsız-op / kind-uyuşmazlığı / çağrılamaz-op / results-divergence
   (anchor), audience-persona cross-check, pagination divergence, uncovered-op (union),
   akış-kapsama. Bu yüzden çıktı her zaman **linked**'dir: model başında
   `contract './<...>.operations.json'` (+ varsa `tech './<...>manifest.json'`), her
   `uses`'ta `realizes <BizOpID>`, akışlarda `realizes flow <BizFlowID>`.
2. **İki upstream, iki ayrı katkı — DOĞRU ATIF.** business `operations.json` =
   **semantik kimlik** (op var mı, kind, flows, actors); tech `manifest.json` =
   **çağrılabilirlik + validation + result-type + pagination**. Bir cross-check
   uyarısını kullanıcıya taşırken kaynağı doğru söyle ("teknik analiz bu listeyi
   sayfalı kurmuş; sunum beyanı yok"). Detay: `references/upstream-to-frontend-translation.md`.
3. **Büyü yok — her şey authored.** Alan listesi, validation, görünürlük,
   pagination-niyeti, entry, gösterilecek alanlar — hiçbiri contract'tan "otomatik
   dolmaz"; her ekseni **kullanıcıya sorup açıkça yazdırırsın**. Sapma (divergence)
   hata değil **bilinçli sinyaldir** → doğrulayıcının çoğu çıktısı **warning**'dir ve
   senin **ikinci tur sorgulamandır**.

**Doğrulayıcı = sorgulama checklist'in.** Her elicitation fazı bir/birkaç doğrulayıcı
karar-eksenini kapatır (faz başlıklarındaki "kapatır" satırı). Sorduğun her soru bir
bütünlük kuralını discharge eder.

## Altın kurallar (her oturumda geçerli)

- **DSL-jargonu gösterme.** "experience", "region role", "mechanic", "cascade",
  "cardinality" terimlerini ASLA kullanıcıya sorma. Somut cümleden *sen* türet:
  "saha ekibi tablette, internet yokken de çalışmalı" → `delivery: offline-first` +
  kritik listelere `cache`, yazmalara `queue`. "listede sadece başlık ve durum görünsün"
  → `show title, status`. "iptal butonu onay sorsun" → `confirm "İptal edilsin mi?"`.
- **Hibrit onay.** Her fazda önce **toplu öneri** (kısa liste), sonra tek soruyla onay.
  Takılınan öğede derinleş. Onay almadan alt faza inme.
- **Kullanıcıya-görünen davranış eksenlerinde MUTLAKA sor** (güvenlik-ekseninin frontend
  karşılığı): başlangıç ekranı, kapsanmayan hata sonuçları, offline'da ne görüneceği,
  yıkıcı aksiyonlarda onay diyaloğu, kapsam-dışı bırakılan op'lar. Saf-sunum mekaniğinde
  (region rolü, `show` sırası, alias adı) makul öneri + toplu onay yeterli.
- **"visible-when güvenlik değildir."** İstemci-yetki YALNIZ UX'tir; gerçek kapı
  sunucudur. Kullanıcı güvenlik beklentisi kurarsa açıkça düzelt.
- **Canlı güncelleme VAAT ETME.** "X olunca ekran anında güncellensin" isteğinin v1
  karşılığı: `on enter` + `refreshable` + `invalidates` (+ gerekiyorsa `interval`).
  Backend-push v1-dışıdır; frontend backend-event'ine çıpalanmaz.
- **Anti-pattern guard'larını aktif tut.** Her fazın tipik hatası işaretli
  (`references/interrogation-playbook.md`); sessizce yakala, nazikçe sor.
- **Onaylanmamış hiçbir şeyi emit etme.** Üretim en sondadır.

## Başlamadan

Girdiyi netleştir:

- **`operations.json` var mı?** ZORUNLU omurga; **v3** (`meta.schemaVersion: 3`) olduğunu
  teyit et (değilse doğrulayıcı error verir → güncel İş DSL üreticisiyle yeniden üret).
- **Sadece `.cdsl` mı var?** Önce ondan operations.json üret — gömülü self-contained araç:
  `node ${CLAUDE_SKILL_DIR}/validator/emit-operations.mjs <girdi.cdsl> <çıktı.operations.json>`
  (`${CLAUDE_SKILL_DIR}` = bu skill'in dizini; göreli yol kullanma). `.cdsl` parse
  hatalıysa araç emit etmez (exit 1) — **önce iş tarafını düzelttir**.
- **`manifest.json` (teknik analiz çıktısı) var mı?** OPSİYONEL ama şiddetle önerilen —
  varsa `contract '...' tech '...'` ile bağla. **Yoksa kullanıcıya AÇIKÇA söyle:**
  *"Teknik analiz yapılmamış — sunumu yine kurarız ama 'bu işlem gerçekten çağrılabilir
  mi / sayfalı mı / hangi hataları üretir' denetimleri kapalı kalır; teknik analiz
  sonrası `tech` yolu eklenip yeniden doğrulanmalı."* (Kapalı kalan denetimlerin listesi:
  `references/validator.md`.)

Sonra sekiz fazı sırayla yürüt (elicit top-down: uygulama toplamı → ekran → bileşen →
davranış; emit en sonda).

---

## Faz 0 — Bağlam & çift-upstream

**Amaç:** Linked moda bağlan. `contract './<...>.operations.json'`
(+ varsa `tech './<...>manifest.json'`) bildir.
**Kapatır:** `checkContracts` (okunamadı/bozuk = error; v3 değil = error; tech bozuk =
error) + tüm fidelity check'lerinin önkoşulu.

---

## Faz 1 — Experience topolojisi (UYGULAMA DİLİMLERİ)

**Amaç:** Kullanıcı kitlelerini konuşlandırılabilir uygulama-dilimlerine ayırmak.
**Elicit et (düz dille):**
- "Bu sistemi **kimler**, kaç **ayrı uygulamadan** kullanacak?" → aktör kümeleri →
  her küme bir `experience` + `audience:` (operations.json `actors[]` adlarıyla).
  Müşteri uygulaması ile ofis portalı AYRI experience'tır — ekranlar karışamaz
  (DSL-garantili ayrıklık).
- "Hangisi **internetsiz de** çalışabilmeli?" → `delivery: offline-first | remote-only`.
- Platform/framework ADI SORULMAZ (web/mobil üretimde atanır; DSL'e girmez).
- Birden çok uygulamada ortaklaşan şeyler (Login ekranı, ortak tipler) → `shared {}`.

**⚠ Anti-pattern — Experience şişmesi:** tüm aktörleri tek uygulamaya tıkma. "Bu iki
kullanıcı grubu gerçekten **aynı uygulamayı mı** açıyor?" Ayrı audience → ayrı experience.
**Kapatır:** `checkAudience` (actors[] cross-check — bilinmeyen ad warning),
`checkExperienceNames` (dup ekran/uses/state); uncovered-op (union) zemini.

---

## Faz 2 — Op kapsama & uses-arayüzleri

**Amaç:** Contract'taki işlemleri uygulamalara dağıtmak; her birinin sunum-arayüzünü
açıkça yazdırmak.
**Elicit et:**
- "Her uygulama **hangi işlemleri** sunacak?" → her exposed op bir experience'a (M:N).
  Dağıtılmayan op'lar için: "kapsam-dışı mı (bilinçli erteleme), unutma mı?"
- Her op için: "Ekranda bu işlemin **hangi girdileri/çıktıları** görünür?" →
  `uses command|query Ad realizes <BizOpID> { in {…} out [list of] {…} results: … }`.
  - **Tekil mi liste mi** AÇIK işaretlenir: `out list of {…}` (liste) vs `out {…}` (tekil).
  - `results:` authored kümedir; tech-manifest'in üretebildiklerini (throws→taksonomi +
    validation→NotValid) kapsamalı — eksikse divergence warning gelir.
  - Yerel ad ≠ business ad ise `realizes` AÇIK yaz; ad aynıysa by-name kısayolu çalışır
    (info ile işaretlenir — emit öncesi tek satırla onaylat).

**⚠ Anti-pattern — Kapsam telaşı:** her op'u ille bir ekrana koyma; uncovered-op uyarısı
kapsam SORUSUDUR, doldurma emri değil.
**Kapatır:** `checkAnchor` (tanımsız-op info / kind-uyuşmazlığı error / çağrılamaz-op
warning / results-divergence warning), `checkUsesShape`, `checkUncoveredExposedOps`
(union — TÜM dosyalar birlikte doğrulanınca doğru çalışır).

---

## Faz 3 — Ekran haritası & yolculuklar

**Amaç:** Ekranları, giriş noktasını ve ekranlar-arası yolculukları kurmak.
**Elicit et:**
- "Kullanıcı uygulamayı açınca **ilk ne görür**?" → `entry <ekran>` (ZORUNLU sor —
  yazılmazsa warning; entry shared ekran OLAMAZ).
- "Hangi ekranlar var; **kim** görür?" → `screen Ad(param) "Görünen Ad" for Persona`.
  Ekran girdisi parametreyle açık geçer (`screen Detay(id)`); persona adları actors[]
  ile cross-check edilir. Shared ekranda `for` YASAK.
- "Nereden nereye gidilir?" → aksiyon-nav (`-> screen X(arg)`), açık `nav A -> B`,
  ve iş akışı yolculukları: `flow Ad realizes flow <BizFlowID> = [Ekran -> Ekran]`
  (yalnız TEK-AKTÖR business flow'una çıpalanır; çok-aktör süreç frontend'in işi değil).
- Gezinme iskeleti (menü/çubuk) AUTHORED kurulur: `region (role: navigation)` +
  client-only action'lar — üreteç chrome İCAT ETMEZ.

**⚠ Anti-pattern — Kopuk harita:** entry'den hiçbir kenarla ulaşılamayan ekran (warning);
kapsanmayan akış-adımı (warning) → "nav mı eksik, ekran mı fazla, adım mı kapsam-dışı?"
**Kapatır:** `checkEntry`, `checkReachability`, `checkScreen` (shared-persona error,
persona cross-check), `checkFlowCoverage`.

---

## Faz 4 — Ekran içeriği: bölgeler & bileşenler

**Amaç:** Her ekranda ne gösterildiğini/yapıldığını yapısal olarak kurmak.
**Elicit et:**
- "Bu ekranın **ana içeriği** ne; yan/destek alanı var mı?" → `region Ad (role:
  primary|focus|supplementary|navigation|statusbar)`; dar ekranda gizlenebilir mi →
  `collapse-when: compact`. Piksel/flex SORULMAZ (fiziksel yerleşim üretecin).
- "Burada **liste mi, tek kayıt mı, tek değer mi** görünüyor; **form mu** dolduruluyor;
  **düğme** mi var?" → `list | detail | value | form | action` (+ grafik gibi özel
  ihtiyaçlar → extension component `@ns.ad <Query>`).
  - Yapısal eşleme: `list` ↔ liste-out; `detail`/`value` ↔ tekil-out (uyumsuzluk error).
  - Query parametrelerinin kaynağı açık: ekran-param / `session.*` / `currentUser.*` /
    state / literal (`detail OrderInfo(id: orderId)`).
- "Listede/detayda **hangi alanlar** görünsün?" → `show a, b` — yazılmazsa default TÜM
  out-alanları (beyan sırasıyla); bunu bilinçli seçtirt ("hepsi mi, özet mi?").
- Aynı op'u bir ekranda ≥2 bileşen kullanıyorsa `as <ad>` zorunlu.

**⚠ Anti-pattern — `show`'suz veri dökümü:** liste ekranında tüm alanların dökülmesi
çoğu zaman istenmez; default'u sessizce bırakma, sor.
**Kapatır:** `checkDataComponent` (query-only, cardinality), component ad-çakışması
(`as`), `checkWhenBlock` hedef-çözümü zemini.

---

## Faz 5 — Veri mekaniği & offline

**Amaç:** Her veri bağının ağ/çevrimdışı davranışını ve tazelenmesini netleştirmek.
**Elicit et:**
- "Bu veri internetsizken **görülebilmeli mi**?" → `cache` (okuma). "Bu yazma
  **bekleyebilir mi** (sonra eşitlensin), yoksa **anında sunucu onayı** mı ister?" →
  `queue` vs `remote`. (Experience `delivery:` varsayılanıyla tutarlılığı gözet.)
- "Kullanıcı listeyi **elle tazeleyebilsin mi**?" → `refreshable` (jestin fiziği
  üretecin). "Ekrana her girişte tazelensin mi?" → `on enter { refresh X }`.
- "Yazma sonrası hangi listeler **bayatlar**?" → `invalidates: [X, Y]`.
- "Liste **büyük mü** — kaydırdıkça mı yüklensin, sayfa sayfa mı?" →
  `paginated infinite|pager` (yalnız list; niyet ZORUNLU — çıplak `paginated` yok).
  Tech sayfalıysa sunum beyansız bırakma (yalnız ilk sayfa görünür — warning).
- "Bağlantı kopunca / eşitleme sürerken / eşitleme başarısız olunca kullanıcı **ne
  görsün**?" → `when offline|syncing|SyncFailed|SyncConflict { banner|badge|hide|reveal }`
  (sync-kanalı experience-düzeyinde yaşar; ekran override edebilir).

**⚠ Anti-pattern — Mekanik tutarsızlığı:** `offline-first` deyip kritik listeyi `remote`
bırakmak; `queue`'lu yazma varken offline delta'sız ekran; tech-cursor'lı listeye `pager`
(cursor sayfa-atlamayı yapısal desteklemez — warning).
**Kapatır:** `checkPagination` (3-kurallı divergence), sync-kanalı kapsamı, queue
firing-point zemini (Faz 6'daki queue×out'un hazırlığı).

---

## Faz 6 — Form & hata deneyimi

**Amaç:** Yazma yüzeylerini ve başarısızlık deneyimini eksiksiz kurmak.
**Elicit et:**
- "Formda **hangi alanlar** var; hangileri zorunlu; sınır/desen var mı?" →
  `field x { required, min/max: N, pattern: "…" }`. Çok-adımlı mı → `step`. Çapraz-alan
  kuralı → `rule <ifade>`. Düzenleme formu mu → `loads query <TekilQuery>` (+ submit
  command'ı form bind'ı).
- "İşlem **başarısız olursa** kullanıcı ne yaşar?" — önce uygulama-geneli varsayılanlar
  (bir kez): `on NotAuthenticated -> screen Login` · `on ServerError toast "…" retry` ·
  `on NotValid inline-errors`; sonra yalnız İSTİSNALARI form/aksiyonda override et.
- Handler-tamlık: bileşene bağlı her op'un ürettiği her non-Success sonuç ya bir
  handler'la ya varsayılanla kapsanmalı — kapsanmayan warning'i kullanıcıya soru olarak
  taşı ("standart hata gibi mi işlensin, özel mesaj mı?").
- **`queue`'lu op'un `on Success`'i sunucu-çıktısına (out-alanına) REFERANS VEREMEZ**
  (enqueue-anında cevap yok — error). Yalnız client-side değer kullan; kullanıcı
  "kaydedince detayına gitsin" derse `queue`+out çelişkisini açıkla: ya `remote` yap
  ya listeye dön.

**⚠ Anti-pattern — validation'ı contract'tan "türetme":** form kuralları authored'dır;
tech'te validation varken formun boş olması offline'da yerel doğrulamayı boş bırakır
(divergence warning) — kasıtlıysa onaylat.
**Kapatır:** `checkForm` (form=command, loads=tekil-query, validation-divergence),
`checkResultHandler` (inline-errors yalnız form; nav-arg sayısı), `checkHandlerCompleteness`,
`checkQueueOut` (error).

---

## Faz 7 — Davranış determinizmi: istemci-durumu & UI-event'ler

**Amaç:** "100 developer'ın ≥90'ı aynı davranışı üretir" seviyesine getirmek.
**Elicit et:**
- "Ekran **kendi kendine** tazelensin mi?" → girişten N sonra BİR KEZ = `on timer(N)`;
  görünürken her N'de = `on interval(N)` (birimler ms/s/m/h).
- "Satıra dokununca/çift-yol etkileşimde ne olsun?" → `on activate(hedef)` (birincil) /
  `on secondary(hedef)` (ikincil — uzun-bas/sağ-tık). Bileşen-içi hedefsiz biçim = "bu
  bileşen". Öğe bağlamı tek iterator'la okunur: `row.*`.
- "Yıkıcı/telafisi-zor aksiyonlarda **onay soralım mı**; metni ne?" → `confirm "<metin>"`
  (yazılmazsa adaptör-standart metin — bunu da söyle).
- "Kime görünsün?" → `visible-when: <ifade>` (+ "güvenlik değil UX" hatırlatması).
- "İstemci-yerel durum var mı (filtre, seçim, taslak)? Cihazda **kalıcı** mı?" →
  `state` / `persisted state` / türetilmiş değer `derived ad = <ifade>`; mutasyon açık
  (`set x = …`). Kapsam lexical: experience-düzeyi = global, screen-düzeyi = yerel.
- İfade path-kökleri kapalı küme: `session.*` · `currentUser.*` · ekran-param ·
  state/derived adları · `row.*` (yalnız satır bağlamı) · literal. Başkası error.

**⚠ Anti-pattern — client-only action'a mekanik:** ağ çağrısı olmayan aksiyona
`cache/queue/remote` anlamsız (warning); action query'ye bağlanamaz (error).
**Kapatır:** `checkUiEvent` (hedef-çözümü), `checkAction`, `checkPathRootsIn`
(bilinmeyen kök error), timer/interval semantik pini.

---

## Emit + Doğrulama + experience.json (otomatik)

**Emit:** Linked `.fcdsl`. Basit modelde TEK dosya (shared + tüm experience'lar);
büyük modelde experience-başına dosya + `contract` her kök dosyada tekrarlanır. Union
denetimleri doğru çalışsın diye TÜM dosyaları doğrulayıcıya **tek çağrıda** ver.
Bütünlük self-check'i ve dosya kuralları: `references/consistency-and-emit.md`.

**Doğrula (zorunlu):** Gömülü doğrulayıcıyı çalıştır:
```
node ${CLAUDE_SKILL_DIR}/validator/fcdsl.mjs <dosya|dizin ...> --out <çıktı-dizini> --json
```
- **error** varsa → düzelt, tekrar çalıştır. **0 error olmadan döngüden çıkma.**
- **warning**'leri **kullanıcıya takip sorusu** olarak geri yansıt (uncovered-op →
  kapsam kararı; çağrılamaz-op → "teknik analiz mi eksik, ekran mı erken?";
  handler-tamlık → hata deneyimi; pagination divergence → sunum niyeti; erişilemeyen
  ekran → navigasyon). Doğrulayıcının warning'leri ikinci tur sorgulamandır.
- **info**'lar kayıt amaçlı; yalnız by-name çıpaları emit öncesi tek satırla onaylat.

**`<Ad>.experience.json` OTOMATİK üretilir:** araç **kendi içinde gate'ler** — severity-1
error varsa `.experience.json` YAZMAZ (exit 1, partial yok). "0-error → emit" garantisi
prose'a değil araca gömülüdür. 0-error'da `--out` verilen dizine dosya-başına üretir;
bu, frontend üretecinin tüketeceği **hedef-nötr deneyim modeli**dir (`operations.json`
+ `manifest.json` ile birlikte devir paketini tamamlar).

Konum çözümleme, bayatlık (grammar + src hash) uyarısı, tech'siz modda kapalı kalan
denetimlerin listesi: `references/validator.md`.

---

## İnsan-okur raporlar (otomatik)

`.experience.json`'lar 0-error'la üretildikten sonra rapor aracı **OTOMATİK** koşulur —
varsayılan davranıştır; kullanıcı istemezse tek cümleyle atlanır (opt-out):

```
node ${CLAUDE_SKILL_DIR}/validator/report-frontend.mjs <çıktı-dizini> --flows <operations.json> --reports <çıktı>/reports --title "<Proje>"
```

Girdi, `--out` ile üretilen `.experience.json`'ların dizinidir; `--flows` ile business
sözleşmesi bağlanır. Üretilenler (playground'un **kendi programatik üreteçleri** —
el yazımı görsel yok): `frontend/wireframes/<slug>.puml` (ekran başına Salt) ·
`flows/<slug>.puml` (experience storyboard) · `bizflows/<slug>.puml` (İş-Akışı:
business flow × ekranlar — yalnız `--flows` verilince). Ardından araç
`reports/index.md` + `index.html`'i **diski tarayarak YENİDEN üretir** (idempotent) —
üç aile skill'i (business/frontend/qa) aynı `reports/` kökünde birleşir; hepsinde
**aynı `--title`**'ı ver.

Exit sözleşmesi: **0** üretildi · **1** girdi hatalı (HİÇBİR rapor yazılmaz — zaten
0-error emit'ten geliyorsan görülmez) · **2** kullanım hatası.

Kapanışta kullanıcıya `reports/index.md`'yi işaret et; `.puml`'ler index'teki
plantuml.com "görüntüle" linkleriyle açılır — görüntüleme harici sunucuda render
edildiğinden, içerik hassassa linke tıklamama tercihi kullanıcınındır (bunu tek
cümleyle not düş). Sözleşme detayı: `references/validator.md`.

---

## Referans dosyaları (gerektiğinde oku)

- `references/frontend-dsl-reference.md` — FrontendDsl construct'larının tam
  sözdizimi/anlamı + keyword tuzakları.
- `references/upstream-to-frontend-translation.md` — operations.json + manifest.json →
  `uses`/`realizes` eşlemesi; hangi bilgi hangi upstream'den; 2-hop join; mekanik-seçim
  rehberi. **En kritik dosya** (Faz 2-6'da okunur).
- `references/interrogation-playbook.md` — her doğrulayıcı ekseni → düz-dil soruları +
  anti-pattern guard'ları + üretim-politikası (P1-P12) sınırları.
- `references/consistency-and-emit.md` — emit öncesi bütünlük self-check + dosya
  granülaritesi + workspace-pass kuralı + gate'in garantisi.
- `references/validator.md` — gömülü araç çağrımı + bayatlık + diagnostics→düzeltme +
  warning→takip-sorusu döngüsü + tech'siz mod + insan-okur rapor aracı
  (`report-frontend.mjs`) sözleşmesi.
- `references/examples/` — parser-doğrulanmış linked `.fcdsl` exemplar + GERÇEK
  upstream fixture'ları (operations.json + emit-manifest'ten üretilmiş manifest.json).
