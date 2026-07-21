---
name: is-analizi-dsl
description: >-
  Bir kullanıcının düz dille anlattığı uygulama/yazılım fikrini, adım adım
  sorgulama ve her aşamada onay alarak tutarlı bir CommandDSL (.cdsl) iş
  analizine — Süreç (process), Akış (flow), Eylem (operation) — dönüştürür.
  Doğrulama 0-error geçince gömülü araçla makine-devir `operations.json` (v3)
  sözleşmesini OTOMATİK üretir (teknik-analiz/kesif girdisi).
  Kullanıcı teknik olmasa bile çalışır: jargon sormaz, işini anlatır gibi
  konuşturur. Şu durumlarda MUTLAKA kullan: kullanıcı bir uygulama/ürün fikri
  anlatıp "iş analizi", "süreç çıkar", "akış tasarla", "eylemleri detaylandır",
  "CommandDSL üret", ".cdsl yaz", "process/flow/operation çıkar", "fikrimi
  modelle", "uygulamamı analiz et" dediğinde — veya açıkça DSL demese bile bir
  uygulama fikrini yapılandırmak/çözümlemek istediğinde. CommandDSL dışındaki
  genel yazılım tasarımı/mimari sorularında KULLANMA.
---

# İş Analizi → CommandDSL

Bir uygulama fikrini, **tutarlı ve parse-temiz** bir CommandDSL iş analizine
çevir. Kullanıcı çoğunlukla teknik değildir; senin işin onu işini anlatır gibi
konuşturmak ve teknik karşılığını **arka planda** kurmaktır.

## Neyi neden böyle yapıyoruz (özü kavra)

CommandDSL dört katmandan oluşur ama ikisi **referans-only**'dir — kendileri
hiçbir şey tanımlamaz, başka katmanlara ID ile bağlanır:

- **Temel (foundation):** `actor`, `entity`, `relation`, `calendar`, `verb` — kim ve ne.
- **Eylem (operation):** atomik komut/sorgu — `Ad: Aktör Fiil Ownership Kaynak …`.
- **Akış (flow):** tek aktörün yolculuğu — `step`'lerle **operation'lara** bağlanır.
- **Süreç (process):** çok aktörlü iş — `stage`'lerle **flow/operation'lara** bağlanır.

Bu yapı iki ilkeyi dayatır ve skill'in tüm tasarımı bunlardan çıkar:

1. **Elicit top-down, emit dependency-order.** İnsana Süreç→Akış→Eylem sırası
   doğal gelir (büyük resimden detaya), ama dosya geçerli olsun diye DSL'i
   *tersten* yazarız: foundation → operation → flow → process. Çünkü flow bir
   operation'a, process bir flow'a referans verir; referans verilen şey önce
   var olmalıdır.
2. **"Hatasız" = tutarlılık.** Asıl risk sözdizimi değil, **katmanlar-arası
   bütünlük**: her flow adımı gerçek bir operation'a, her süreç etabı gerçek bir
   flow'a bağlanmalı; `by` aktörü flow'un `for` aktörüyle eşleşmeli; tip/kural
   uyumlu olmalı. Emit'ten önce bunu denetlersin (bkz. `references/consistency-and-emit.md`).

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
6. **Değişiklik kapıyı yeniden açar.** Kapılar "emit öncesi bir kez" DEĞİL, **her
   construct için** geçerlidir. Emit'ten SONRA bir construct eklenir/değişirse
   (validator warning'i giderme, dış denetim bulgusu, kullanıcı revizyonu, çözüm
   olarak türetilen yeni işlem) o construct Faz 3 çeviri prosedüründen + Faz 3.5
   kapanışından + emit-öncesi süpürmelerin TAMAMINDAN yeniden geçer ve deftere yeni
   sıra-no'lu girdi açar. **"Zaten geçmiştik" geçerli bir gerekçe değildir** — kapı
   modele değil, construct'a bakar. Oturum döngüseldir; fazlar bir kez akmaz.

## In-flight öz-denetim (bahane → çürütme · red-flags)

Bir değişmezi (★-süpürme, güvenlik-teşhiri, geri-okuma) atlamak için içten gelen
gerekçeye karşı — Gate ÇIKIŞTA kilitler, bu blok SÜREÇ-İÇİNDE, Gate'e varmadan düzeltir:

| Atlatma bahanesi | Çürütme |
|---|---|
| "Bu proje basit, Envanter'e gerek yok" | Basitlik ★-süpürmeyi kaldırmaz; ★ yine sorulur ya da örtük-kapandığı gösterilir. |
| "Kullanıcı acele ediyor" | ÇİFT-SIFIR hiçbir tempoda kısalmaz; hız = daha az laf, daha az soru DEĞİL. |
| "Cevabı tahmin edebiliyorum" | Tahmin = çıkarım; çıkarım cevap değil SORU üretir (Değişmez-1). |
| "Bunu sonra hallederiz" | Ertelenen ★ authored-kayıt olur (durum=beklemede), sessizce düşmez. |
| "Sadece küçük bir düzeltme / o kapıdan zaten geçtik" | Düzeltme de **authored bir construct** doğurur; kapılar o construct için yeniden koşar (Değişmez-6). |
| "Bu işlemi ben türettim, kullanıcı sormadı" | Yazarı skill olan construct daha da riskli: kullanıcı sinyali yok → dedektör tetiklenmez. Model-türevli kayıt eksenlerinden geçmesi ZORUNLU (bkz. ElicitationState iki-besleme). |

**Red flags (kendini yakala):** ★-soru atlandı · faz-sırası bozuldu · kullanıcıya
sorulmadan clause dolduruldu · warning sessiz kapatıldı · gate-geçti diye AskUser
atlandı. Biri olduysa DUR, adını koy, düzelt.

## Altın kurallar (her oturumda geçerli)

- **Kullanıcıya jargon gösterme.** "ownership", "4'lü imza", "calculate",
  "stage" gibi terimleri ASLA kullanıcıya sorma. Bunları onun düz cümlelerinden
  *sen* türet. Kullanıcı "yönetici sadece kendi ekibinin talebini onaylar" der;
  sen bunu `managedTeam's` ownership'e çevirirsin.
- **Hibrit onay.** Her fazda önce **toplu bir öneri** sun (kısa liste), sonra
  "şunu değiştireyim mi / eksik var mı?" diye **tek soruyla** onay al. Kullanıcı
  bir öğeye takılırsa o öğede tek tek derinleş. Onay almadan bir alt faza inme —
  boşa iş yapmamak ve yanlış anlamayı erken yakalamak için.
- **Anti-pattern guard'ları aktif tut.** Her katmanın tipik hatası var; aşağıda
  her fazda işaretli. Bunları sessizce yakala ve kullanıcıya nazikçe sor.
- **Birinci-sınıf olmayan iş-kuralını `note` ile yakala** (Değişmez-4'ün uygulaması).
  DSL'in formalize edemediği ama işe-ait bir kural/kısıt/dikkat-noktası (ör. "onay 48
  saat içinde yapılmalı", karmaşık bir istisna) gelirse **kaybetme** — ilgili
  operation/flow/process'e `note """…"""` ile yaz (`#` yorumu derlemede atılır; `note`
  makinece taşınır → alt katmanlara/geliştiriciye ulaşır). **AYRAÇ (ADR-0042):
  çapraz-varlık ya da çok-op'lu ÖN-KOŞUL çıplak note'a DÜŞMEZ** — o bir adlandırılmış
  `rule`'dur (isim + `note`-brief) ve ilgili op'lara `requires <Ad>` ile bağlanır
  (yapısal predikatı tech realize eder; bkz. Faz 3 + `references/dsl-reference.md` §10).
  Çıplak `note`, TEK op'a yapışık serbest-proza (süre-politikası, istisna, dikkat-noktası)
  için kalır. Ayrım: gerçek **iş-kuralı → note/rule**; saf proje-yönetimi
  (paydaş-siyaseti, fizibilite, maliyet, milestone) `.cdsl`'e GİRMEZ — bunlar aile-üstüdür.
- **Üretim en sondadır.** Doküman/DSL üretimi en son adımdır; onay eksikse emit yok —
  bu ÇİFT-SIFIR'ın (Değişmez-2) sonucudur, ayrı bir kural değil.

### Karar-triyaj & sınırlar (hibrit-onay rafinmanı)

Hibrit onay içinde her açık kararı **triyajla** — ama KRİTİK sınır: triyaj yalnız
**mekanik/çeviri** kararları içindir. **Authored iş-içeriği** (kural, ownership, durum,
yapı) geri-alınabilir olsa BİLE asla "kendin çöz" sınıfına girmez — büyü-yok mutlaktır,
geri-alınabilirlik onu gevşetmez (Değişmez-1).
- **Mekanik + geri-alınabilir + düşük-etki** (jargon→düz dil, iskelet-ID, isimlendirme,
  deterministik emit/rapor) → kendin çöz, kararı deftere teşhir et (sonra
  geçersiz-kılınabilir); onay için durma, boşuna soru sorma.
- **Authored iş-içeriği VEYA güvenlik-etkili** (kural/ownership/durum/yan-etki;
  ownership genişliği, hassasiyet/yetki, veri-maruziyeti) → **SOR / ESKALE et**, asla
  kendin çözme (Değişmez-1 + "Ne sormadım?" sweep-2). Geri-alınabilirlik bunu değiştirmez.

**Üç-kademeli sınır (Boundaries):**
- **Always** (sormadan yap): jargonu düz dile çevir, iskelet-ID üret, deterministik
  emit/rapor koştur.
- **Ask-First** (önce sor): ownership seçimi, durum-geçişi, otomatik yan-etki (`perform`/
  `send`), sınır-devri (handoff).
- **Never** (asla yapma): cevabı uydur, warning'i sessiz kapat, onaysız emit et, gate'i
  kendin feragat et.

**Netleştirme döngü-kesici:** aynı noktada **3 başarısız netleştirme** olduysa DUR —
döngüye devam etme; **blocker'ı adlandır** ("Şu karar olmadan ilerleyemiyorum, çünkü…")
ve kullanıcıya net bir seçenek kümesi sun.

## Bu skill neyi KAPSAMAZ (bilinçli sınır — "atlandı" değil)

CommandDSL bir **davranış modelidir**: kim, hangi kayıt üzerinde, hangi koşulda ne yapar.
Aşağıdakiler bilinçli olarak kapsam dışıdır — modelde yoklukları **eksiklik değil sınırdır**;
ama sessiz bırakılırsa paketi devralan ekip onları "atlanmış" sanar. Bu yüzden kapanışta
**açıkça söylenir** ve doküman §7'ye sabit alt-başlık olarak yazılır:

- **Problem tanımı / iş gerekçesi** (neden bu ürün) — `outcome` yalnız ölçülebilir başarıyı taşır.
- **Paydaş analizi** — sistemi kullanmayan ama etkilenen taraflar. Modelde yalnız `actor` (sistemi
  kullanan rol) vardır.
- **NFR** — performans, gizlilik/KVKK, maliyet, erişilebilirlik, saklama süresi. Gramerde karşılığı yok.
- **Risk kaydı (RAID'in R'si)** ve proje-yönetimi (milestone, fizibilite) — aile-üstüdür, `.cdsl`'e girmez.
- **Kimlik/hesap yaşam döngüsü** — kayıt olma, giriş, şifre, hesap kapatma; `actor` bir roldür,
  hesap değil. Uygulamanın gerçek bir gereksinimiyse **ayrı bir modül olarak modellenmelidir**.
- **Eşzamanlılık** — iki aktörün aynı kayda aynı anda dokunması, kilit/yarış. `where` guard'ı
  ön-koşuldur, atomiklik garantisi değil; bu tech katmanının konusudur.

⚠ Bu liste bir **muafiyet değil devir**dir: kullanıcı bunlardan birini iş-kuralı olarak dile
getirirse (ör. "kayıtlar 6 ay sonra silinmeli") **kaybetme** — `note` ile taşı (Altın kurallar).

## Başlamadan

Kullanıcıdan **tek cümlelik amaç** al: "Bu uygulama temelde ne işe yarayacak?"
Ton: sıcak, sade, yönlendirici. Örnek açılış:

> "Aklındaki uygulamayı birlikte netleştireceğiz. Teknik terim sormayacağım,
> sadece işini anlatır gibi konuş. Başlayalım: bu uygulama temelde ne işe
> yarayacak, bir cümleyle?"

Sonra dört fazı sırayla yürüt; Faz 3'ten sonra emit'ten önce ön-gereksinim
kapanışını (Faz 3.5) çalıştır.

**Sessiz-eksik disiplini → ElicitationState (her faz + emit).** Faz'lar zorunlu ekseni
(aktör/işlem/akış) kapatır; ama **opsiyonel** iş-kuralları (guard'lar, `calculate` durum-geçişi,
`perform` zinciri, `schedule`, ilişki-ownership, akış dallanması…) sorulmazsa sessizce yok sayılır —
doğrulayıcı bunu YAKALAMAZ. Bu yüzden her opsiyonel sinyal hafızada değil, **açık bir durum-kaydında**
yaşar:

- **ElicitationState kaydı:** `{kaynak: elicitation | model; sinyal; hedefConstruct; risk (★/○);
  durum: cevaplandı | atlandı | beklemede}`. **★-süpürme ezberden Envanter gezme değil, MEKANİK
  sorgudur:** "durum=beklemede ∧ risk=★ kaydı var mı?" — varsa emit geçemez (Değişmez-2, ÇİFT-SIFIR).

- **İKİ BESLEME KANALI (kritik — tek kanal sahte-sıfır üretir).** Kayıtlar iki bağımsız kaynaktan doğar:
  1. **`kaynak: elicitation` — kullanıcı sinyalinden.** Dinlerken `references/dsl-reference.md`
     **Yetenek Envanteri**nin "sinyal" kolonunu tara (kullanıcı "gece otomatik çalışır" der,
     `schedule`'ı *sen* bilirsin) ve eşleşen her sinyali kuyruğa al.
  2. **`kaynak: model` — modelin KENDİSİNDEN (yazarı kim olursa olsun).** Kanal-1 yalnız kullanıcının
     söylediğine bakar; **skill'in kendi ürettiği yapı hiçbir sinyal doğurmaz** — `System` işlemleri,
     `perform` zincirindeki ara işlemler, Faz 3.5'te eklenen üreticiler, düzeltme turunda türetilen
     işlemler. Kayıt yok → beklemede-★ yok → süpürme temiz görünür = **sahte-sıfır**. Bu yüzden
     modeldeki **her operation için**, kim yazdıysa yazsın, şu **beş eksende** birer kayıt otomatik
     açılır (risk ★):

     | Eksen | Kapanış sorusu (düz dille) | Yapısal ev |
     |---|---|---|
     | guard / ön-koşul | "Bu işlemin bir ön-koşulu var mı — hangi durumda reddedilir?" | `where` · `only if` · `only when` · `requires` |
     | ownership genişliği | "Bu işlemi kim yapabiliyor — herkes mi, kendi kaydı mı, ilişkiye bağlı mı?" | ownership anahtarı (`own`/`any`/`all`/`public`/`<ilişki>'s`) |
     | hata dalı | "Bu iş yapılamazsa/başarısız olursa kullanıcı ne görsün, kayıt ne olsun?" | **önlenebilir** ise guard (`where`/`only if`/`requires`); **çalışma-anı başarısızlığı** için `on failure` YOKTUR → kanonik ev `note` (+ istenirse başarısız-durumu üreten ayrı authored işlem) |
     | durum etkisi | "Bu olunca kaydın durumu değişiyor mu?" | `on success do: calculate <E>.status = '…'` |
     | bağımlı-kayıt etkisi | "Bu kayıt gidince/kapanınca ona bağlı kayıtlara ne olacak?" | `perform <SilmeOp>` (niyet; kapsam tech'te) · engelleme guard'ı · `note` — yıkım kapanışı D4, `references/dependency-closure.md` |

- **Model-türevli kayıtlar İKİNCİ BİR SORGULAMA DEĞİLDİR.** Faz 3 çeviri prosedürünü izleyen her
  operation bu eksenleri **yan ürün olarak** kapatır (Adım 3 ownership · Adım 6 guard · Adım 7 durum ·
  EARS kalıp-2 hata dalı) — o op'un satırları anında `cevaplandı` işaretlenir. Süpürme bir
  **defter-sorgusudur**, tekrar soru sormak değil: amaç, Faz 3'ten HİÇ geçmemiş op'ları (arka plan,
  `perform` hedefi, düzeltme-turu ürünü) görünür kılmaktır. Kapanmamış eksen ya cevaplanır ya
  `/atla` ile authored-atlanır; üçüncü hâl yok. Ölçüt: **N operation × 5 eksen** satırın tamamı
  `cevaplandı` ∨ `atlandı`.
- **İki-modlu soru (tek-soru-tek-cevap):** cevabı **önerebiliyorsan** → toplu öner + tek onay (hibrit
  onay). Öneremiyorsan (gerçek bilinmeyen) → **tek soru sor, cevabı bekle** — birden çok bilinmeyeni tek
  mesaja yığma.
- **Kapalı komut paleti** (yalnız bunlar; palet-dışı komut uydurma yok): `/durum` açık kayıtları
  dökümler · `/geri` son onayı geri alır · `/neden` bir kaydın gerekçesini gösterir · `/atla` bir sinyali
  **authored-atlama** olarak kapatır (durum=atlandı; kim/neden yazılır). Declared-skip (`/atla`) ≠
  sessiz-eksik: atlanan kayıt ★-süpürmede yine teşhir edilir, sessizce düşmez.

**Oturum karar-defteri (disk = otorite).** ElicitationState ve her hibrit-onay, çalışma-dizinindeki
**oturum karar-defterine** yazılır — uzun oturumda LLM-hafızası aşınır, dosya otoritedir. **Kadans:** her
faz-geçişinde ve emit'ten önce defteri **DİSKTEN yeniden oku** (hafızadan değil); cevaplanmış soru tekrar
sorulmaz (yalnız "geçen sefer X demiştiniz, hâlâ geçerli mi?" teyidi). Ertelenen/atlanan sorular
kategori-tablosunda (Resolved / Deferred / Clear / Outstanding) **kalıcı iz** bırakır → ★-süpürme ve kör
kabul-gözlemcisi bu tabloyu okur. Defterin DEĞİŞMEZ sınırları, girdi-şeması ve deferred-tablo formatı:
**`references/session-ledger.md`** (anayasa + format orada; yalnız süreç-durumu, domain-gerçeği DEĞİL;
content-hash damgası — wall-clock timestamp YASAK).

---

## Faz 0 — Bağlam & Aktör Haritası (KİM? NE?)

**Amaç:** Süreçlere girmeden önce oyuncuları ve kayıtları netleştirmek. Her şey
buna referans vereceği için temel buradadır.

**Elicit et (düz dille):**
- **Aktörler/roller:** "Bu işte kimler var?" Tahminini sunup düzelttir. Biri
  başkasının yaptığı her şeyi + fazlasını yapıyorsa bu bir `extends`'tir
  (ör. Yönetici, Çalışan'ı extends eder).
- **Kayıtlar (entity):** "Sistemde neleri saklıyoruz?" Her kayıt için hangi
  bilgiler tutuluyor (alanlar). Her kaydın **örtük bir sahibi** olduğunu
  unutma — kullanıcıya sormana gerek yok, ama modelde vardır.
- **İlişkiler:** Sahiplik "kendi ekibi / yönettiği şube" gibi bir bağ
  içeriyorsa bu bir `relation`'dır.
- **Kapsama / birlikte-yaşama (yıkım ekseni):** "Bu kayıtlardan biri silinirse ona
  bağlı olanlar (mesajlar, bölümler, özetler…) ne olsun — onlar da gitsin mi, kalsın
  mı, yoksa silme hiç mümkün olmasın mı?" Bu soru **`relation` ile karşılanmaz** —
  `relation` aktör↔kayıt eksenidir, kayıt↔kayıt kapsaması DEĞİL (`references/dsl-reference.md` §1).
  Cevap, ilgili silme/arşivleme işleminin yıkım kapanışına girer (Faz 3.5 · D4).
  Sormazsan **öksüz-kayıt** doğar: geliştirici keyfî karar verir, gizlilik/depolama
  sorunu modelde görünmez.
- **Takvimler:** "Sadece mesai saatinde" gibi zaman pencereleri varsa `calendar`.
  Sinyal gelince TANIMINI da sor: "**Mesai saatleri tam olarak ne** — hangi
  günler/saatler, tatiller dahil mi?" — `calendar` yalnız bir etikettir, içeriği
  modelde tanımlı DEĞİLDİR (`references/dsl-reference.md` §1); cevabı, takvimi
  kullanan operation'a/dokümana `note """…"""` ile düşür ki tanım kaybolmasın.

**Toplu öner + onayla.** Örnek kapanış:
> "✅ *Kimler & Neler:* Çalışan, Yönetici (Çalışan'ın yaptıklarını da yapar),
> İK (salt görüntü) · Kayıt: İzin Talebi (tarihler, sebep, durum). Eksik/fazla var mı?"

DSL karşılıkları ve alan tipleri için: `references/dsl-reference.md` (§1).

---

## Faz 1 — Süreçler (BÜYÜK RESİM)

**Amaç:** Çok aktörlü, uçtan uca iş zincirlerini isim + sınır olarak çıkarmak.

**Her süreç için elicit et:**
- İsim + tek cümle açıklama.
- **Tetikleyici → Sonuç** ("Neyle başlar, neyle biter?"). Cevap **öksüz kalmasın** —
  nereye indiğini bağla: tetikleyici tipik olarak sürecin İLK etabının (ilk akışın
  ilk adımının) gerçekleştirdiği iştir, sonuç son etabın durum-geçişi/çıktısıdır;
  yapısal karşılık kurulamıyorsa (dış olay, sistem-dışı tetik) process'e
  `note """…"""` ile düşür.
- **Etap sırası:** "Bu etapların **sırası önemli mi**, yoksa sırasız/aynı anda mı
  olabilir?" — sırasız/eşzamanlı olabilenler `any order` bloğuna girer. Sormazsan
  "bildirim sırası = zaman sırası" kanunu sırasız etaplara **sahte-sıralama-kısıtı**
  dayatır (eksik = YANLIŞ model).
- **Merkez varlık** (`of <Entity>`): sürecin yaşam döngüsünü taşıyan kayıt
  (ör. araç satışında Sipariş). "Bu süreç hangi kaydın etrafında dönüyor?"
- **Hangi aktörler** dahil.
- **Kapsam DIŞI ne var?** — en kritik soru.

**⚠ Anti-pattern — Süreç şişmesi:** Kullanıcı "araç satışı" deyince garanti,
servis, iade gibi 5 ayrı süreci tek çatıya toplama eğilimi olur. Sınırı sor:
> "Garanti/iade de bu sürece dahil mi, yoksa ayrı süreçler mi?"

**Toplu öner + onayla.** Süreç referans-only'dir; burada sadece isim/sınır/aktör
netleşir, içi sonraki fazlarda dolar. Detay: `references/dsl-reference.md` (§4).

**Başarı ölçütü (`outcome`) — büyük-resimle aynı anda sor.** Davranışın **doğru**
olması ("onaylanınca durum değişir") ile ürünün **başarılı** olması ("onay süresi 2
günden 2 saate iner") ayrı şeylerdir. Süreç sınırları netleşince bir de bunu sor:
> "Bu işi başardığımızı NASIL ölçeceğiz — hangi somut, ölçülebilir sonuç?"

Ölçülebilir bir cevap gelince **tek soruyla bırakma — `outcome` alanlarına dekompoze et**
(jargon gösterme, düz dille sor). Cevabı şu dört parçaya oturt:
- **metrik + eşik** ("hangi rakama iniyor/çıkıyor? eşik ne?") → `measure '<metrik>' <op> <sayı>`
- **birim** ("bu ne cinsinden — gün, saat, yüzde?") → `unit '<birim>'`
- **zaman penceresi** ("hangi süre içinde ölçülüyor — 30 günde mi?") → `within <süre>` (opsiyonel)
- **kapsam** ("bu hangi akışı / süreci / işlemi ölçüyor?") → `covers <flow|process|op>`

Teyitli, **ölçülebilir** cevap birinci-sınıf bir **`outcome`**'a iner (top-level construct,
op'un içine gömülü değil; `covers` ile ilgili process/flow/op'a bağlanır — sözdizimi
`references/dsl-reference.md` §11). **ÖLÇÜLEMEYEN başarı ifadesi ("kullanıcılar mutlu olur")
yapısallaşmaz** — ya ölçülebilir biçime indir ("haftalık aktif kullanıcı ≥ X"), ya `note`
olarak bırak (eşik/pencere çıkmayan yarı-ölçülebilir hâl), ya hiç yazma
(correctness-over-completeness; ölçülemeyeni uydurma). Op-düzeyi ölçüt-yakalama:
`references/operation-translation.md`.

---

## Faz 2 — Akışlar (TEK KİŞİ ADIM ADIM)

**Amaç:** Her süreç için, tek bir aktörün o işi adım adım nasıl yaptığını
çıkarmak. Akış da referans-only'dir.

**Her akış için elicit et:**
- Hangi aktör, hangi hedef ("Çalışan, talebi nasıl gönderir?").
- Adımların **zaman sırası** (bildirim sırası = zaman sırası).
- **Seçim** ("burada iki yol mu var?") → `either/or`. **Tekrar** ("birden çok
  kez?") → `repeat`. **İsteğe bağlı** → `optional`. **Vazgeçme** ("yarıda
  bırakabilir mi?") → `abandon anytime`. **Sistem dışı eylem** ("kullanıcı
  ekranda olmayan bir şey yapıyor", ör. "ürünü fiziksel seçer") → `outside`.

**🔑 Yumurta-tavuk çözümü (kritik):** Akış adımları operation'lara ID ile
bağlanır, ama operation'lar henüz yok. Bir adım anıldığında **işlem
kataloğuna tek satırlık bir iskelet ID'si** ekle (ör. `SubmitRequest` — henüz
gövdesiz). İçini Faz 3'te dolduracaksın. Böylece referanslar çözülür.

**⚠ Anti-pattern — Mutlu yol tuzağı:** Sadece "her şey yolundaysa" akışını
çizme. Her kavşakta sor: "Peki ya olmazsa / vazgeçerse / hata olursa?"

**Toplu öner + onayla.** Kullanıcının attığı kuralları ("sadece henüz
bakılmadıysa geri çekebilsin") not al — bunlar Faz 3'te ilgili operation'ın
koşuluna gidecek. Detay: `references/dsl-reference.md` (§6).

---

## Faz 3 — Eylemler (KURALLARI DOLDUR)

**Amaç:** Faz 2'de iskelet olarak biriken her operation'ı, kullanıcının düz
cümlesinden **tam tanıma** çevirmek. Burası valid-by-construction'ın gerçekten
kırıldığı yerdir — dikkatli ol.

Her operation için, kullanıcının cümlesini şu yapıya çevir:
`Ad: Aktör Fiil Ownership Kaynak [on/from/for] [where koşul]` + kurallar +
`on success do`. **Tür fiilden türetilir** (reads/lists → sorgu, diğerleri → komut).

Bu çeviri en hassas iş olduğu için **adım adım prosedürü ayrı dosyada**:
`references/operation-translation.md` — her operation'da onu izle. Özetle:
- Eksik kuralları **kullanıcıya düz dille** sor: "Yönetici herkesin mi, sadece
  kendi ekibinin mi talebini onaylar?" "Onayın bir sınırı var mı (mesai/tutar)?"
- **Tekrar eden / gezinen ön-koşulu `rule`'a yükselt.** Bir ön-koşul `only if`'in
  **tek karşılaştırma** sınırını aşıyorsa — aynı kural birden çok işlemde geçiyor,
  bir ilişki gezmesi gerekiyor ("yöneticinin şubesindeki …"), ya da "böyle bir kayıt
  VAR mı / YOK mu" sorusu içeriyorsa — bunu adlandırılmış bir `rule`'a çıkar ve
  ilgili işlemlere `requires <RuleAdı>` ile bağla. **Çıktının biçimi (ADR-0042
  K1/K2):** business'a YALNIZ isim + insan-brief yazılır —
  `rule <Ad> { note """insan-brief: kural ne demek + tech ipucu (hangi kayıtlar /
  hangi koşul sınıfı: var-mı, sayım, karşılaştırma)""" }` + op'ta `requires <Ad>`.
  **Yapısal predikat business'a YAZILMAZ** — kuralın checkable gövdesi tech'in
  `realizes rule <Ad> { <predicate> }`'una devredilir; bağ isimledir
  (`requires <Ad>` ↔ `realizes rule <Ad>`). Tetik-soruları düz dille:
  "Bu aynı koşul başka işlemlerde de geçerli mi?" · "Bu kural başka bir kaydın
  var/yok olmasına mı bakıyor?" (Kullanıcıya `rule`/`realizes` deme; düz cümlesinden
  *sen* türet.) Sözdizimi ve legacy-`satisfies` durumu: `references/dsl-reference.md` §10.
- **Durum geçişlerini** burada yakala: "onaylanınca durumu ne olur?" →
  `on success do: calculate <Entity>.status = 'onaylandı'`. Durum yaşam döngüsü
  ayrı bir Faz-0 ürünü değildir; bu atamalardan **türetilir**.
- **Otomatik yan etkiler** (`perform`, `send`, `create`) ve **sistem işleri**
  (`System` aktörü, `schedule:`) kullanıcıya **endpoint olarak** gösterilmez — arka
  plan etkisidir. ⚠ **Bu bir soru-muafiyeti DEĞİLDİR:** arka plan işleminin de
  **hata dalı ve durum etkisi yine sorulur** — ama kullanıcıya mekanik diliyle değil
  **sonuç diliyle**: *"X üretilemezse kullanıcı ne görsün, kayıt ne olsun?"* ⚠ CommandDSL'de
  **`on failure` bloğu YOKTUR** (`on success do` tek dal; §3 kapalı liste) — cevap **önlenebilir**
  bir koşulsa guard'a iner, **çalışma-anı başarısızlığı** ise kanonik ev `note`'tur (istenirse
  başarısız-durumu üreten ayrı bir authored işlem). Uydurma dal yazma.
  Bu işlemler kullanıcı cümlesinden doğmadığı için hiçbir dinleme-dedektörünü
  tetiklemez; kapanışları **model-türevli ElicitationState kayıtlarıyla** zorlanır
  (bkz. "İKİ BESLEME KANALI"). Sorulmazsa: zincir yarıda kalır, kayıtlar tutarsız
  kalır, QA o yolu test edemez.

**⚠ Anti-pattern — Sihirli adım:** "Sistem ödemeyi işler" gibi belirsiz
tanımlar. Her eylemin kim/ne/hangi kayıt/hangi koşul'u net olmalı.

**Toplu öner + onayla.** Her operation'ı kullanıcıya **düz cümle** olarak geri
oku ("Yönetici, kendi ekibinin talebini onaylar; onaylanınca durum 'onaylandı'
olur ve çalışana haber gider."), DSL'i değil.

---

## Faz 3.5 — Ön-Gereksinim Kapanışı (Bağımlılık Denetimi)

**Amaç:** Modelin **nedensel olarak tam** olduğunu güvence altına almak: bir
operasyonun *tükettiği* her şeyin (listelediği, üzerine iş yaptığı kayıt; bir
durum koşulu; bir ilişki) modelde onu **üreten** bir karşılığı olmalı. "Ürün
listele" var ama ürünü hiçbir şey *oluşturmuyorsa* model çalışamayan bir sistemi
anlatır. Bu, §A'daki referans-bütünlüğünden **farklıdır** (orası ID çözümü;
burası üretici-tüketici bütünlüğü). CommandDSL doğrulayıcısı bunu yakalamaz —
bu yüzden **skill adımıdır, validator kuralı değil**.

**Konum:** Faz 3'ten sonra (üretici/tüketici ancak tüm operation gövdeleri
varken görülür), Tutarlılık self-check'inden önce. Burada eklenen her yeni
operation sonra §A'nın tüm kurallarından geçmelidir.

**Kapsam = kullanıcı tercihi (D1-D3); D4 ZORUNLU.** Hangi clause'ların ön-gereksinim sayılacağını
**her kullanımda** kullanıcıya düz dille sor; varsayılan en az gürültülü
seviyedir, kullanıcı derinleştirebilir:
- **D1 — Varlık var-oluşu** (varsayılan): tüketilen her entity'nin bir üreticisi
  (`creates`, ya da `on success do: create`) olmalı. Örnekteki "ürün listele →
  ürün tanımlı" ihtiyacını birebir karşılar.
- **D2 — Durum ulaşılabilirliği:** `where`/`only when` durum geçidinin üreticisi
  (`calculate …status='X'` veya oluşturma-anı başlangıç durumu) olmalı.
- **D3 — İlişki popülasyonu:** `<relation>'s` ownership ilişkisi bir yerde
  doldurulabilmeli (çoğu zaman seed/kurulum → en gürültülü; sadece istenirse).
- **D4 — Yıkım kapanışı (ZORUNLU, kullanıcı tercihi DEĞİL):** D1-D3 üretim eksenlidir
  ("tüketilenin üreticisi var mı?"); aynası yoktu. Modelde bir `deletes` (ve durum-terminali
  olan `archives`/`cancels` sınıfı) işlem varsa, silinen entity'ye **ayrı yaşam döngüsüyle
  bağlı** her entity için "birlikte silinir / öksüz kalır (bilinçli) / silme engellenir"
  kararı **authored** alınır. Yapısal ev `perform <SilmeOp>`'tur (`on success do`'da `delete`
  eylemi YOKTUR — uydurma); engelleme ise guard/`requires`. ⚠ `perform` **kapsam taşımaz**
  (argümansız): business kaskad **niyetini** taşır, "şu kaydın bağımlıları" predikatı tech'te
  realize edilir → niyeti `note` ile açıkça yaz. Hiçbir karar yoksa emit engellenir.

**Her bulguyu KÖRÜ KÖRÜNE eklemeden sınıflandır:** (1) iç boşluk → `Create<E>`
operation öner; (2) dış kaynak/seed (ERP'den ürün, SSO'dan kullanıcı, admin'in
kurduğu mağaza) → operation ekleme, doküman §7 "bilinçli istisnalar"a not düş;
(3) gömülü/değer entity (`list of` alanı) → muaf. Eklenen üretici yeni
ön-gereksinim doğurursa **kapanışı** sabit-noktaya kadar yürüt (döngü korumalı).

**⚠ Yanlış-pozitif tuzakları:** `on success do: create` üreticilerini ve
oluşturma-anı başlangıç durumunu **sayman şart** — yoksa üretilen şeyi
"üreticisiz" sanırsın.

**Toplu öner + onayla.** Tüm boyutlardaki bulguları **tek listede** sun
(eklenecekler / dışarıda kabul edilip belgelenecekler), tek soruyla onayla —
kapanış genişledikçe iteratif sorma. Tam prosedür, üretici/tüketici tespiti,
muafiyetler ve çalışılmış örnekler: **`references/dependency-closure.md`**.

---

## Emit öncesi — Tutarlılık self-check (= "hatasız")

Onaylar bittikten sonra, üretmeden ÖNCE katmanlar-arası bütünlüğü denetle. Tam
kontrol listesi ve emit sırası: **`references/consistency-and-emit.md`**. Özetle:
her flow step → var olan operation; her process stage → var olan flow/operation;
`by` == flow'un `for`'u; tek global isim uzayı; tip/kural uyumu (sorguda
`only if`/`on success` yok, komutta `order by` yok); benzersiz 4'lü imza;
ownership ilişkileri ve takvimler bildirilmiş. Bir ihlal varsa **emit etme** —
düzelt, tekrar denetle.

**"Ne sormadım?" geçidi — ÇİFT-SIFIR (0-tutarsızlık VE 0-sessiz-eksik).** Tutarlılık tek başına
YETMEZ: denetim YANLIŞ bağı yakalar, EKSİK iş-kuralını değil (bir opsiyonel guard / `calculate` /
`perform` / `schedule` hiç sorulmadıysa sessizce yok sayılır). Beş süpürme:
1. **Sessiz-eksik (★ süpürmesi) — İKİ KAYNAK BİRDEN:** ElicitationState/defter üzerinde **MEKANİK
   sorgu** çalıştır — "durum=beklemede ∧ risk=★ kaydı var mı?" (Yetenek Envanteri'ni ezberden gezme;
   kayıt-tablosunu sorgula). Sorgu **`kaynak: elicitation` VE `kaynak: model` kayıtlarının ikisini de**
   kapsar; yalnız elicitation-türevlileri sorgulamak sahte-sıfırdır (skill'in kendi ürettiği yapı hiç
   sinyal doğurmaz). Ek mekanik ölçüt: **modeldeki her operation için beş eksenin (guard · ownership
   genişliği · hata dalı · durum etkisi · bağımlı-kayıt etkisi) satırı `cevaplandı` ∨ `atlandı` mı?**
   Kalan her ★ için ya örtük kapandığını göster, ya tek doğrulama sorusu sor. Hiçbir ★'ı sessizce atlama.
2. **Sessiz-yanlış (teşhir):** zorunlu **ownership** yanlış-değerle de tutarlı görünür — `any` /
   `public` genişliği güvenlik-kritiktir. Seçtiğin ownership'i sessiz emit etme: "Bu işlemi herkes
   (any) yapabiliyor — kendi kaydıyla (own) sınırlı olmalı mı?" diye açıkça onaylat.
3. **Sınır-devri (köprü süpürmesi):** bir işlemin çıktısını/etkisini **başka bir aktör ya da akış**
   tüketiyor mu? El-değiştirme (handoff) açık mı — process `stage … by <aktör>` / `perform` / sonraki
   flow adımı — yoksa "öteki taraf halleder" diye sessiz mi varsayılıyor? Çok-aktör süreçte el
   değiştiren her aktörün payı modellenmelidir.
4. **Kör kabul-gözlemcisi (defter ↔ DSL):** oturum karar-defterinden (bkz. `references/session-ledger.md`)
   kullanıcının **onayladığı** kuralların listesini **DSL'e BAKMADAN, DOSYADAN** çıkar; emit edilecek
   `.cdsl` ile karşılaştır; her fark = warning = çözülmemiş-soru → hibrit-onaya taşı. Gözlemci **ASLA
   "geçti" damgası VERMEZ** — soru-üreticidir, hakem değil (pass-otoritesi deterministik validator +
   kullanıcı; aksi Değişmez-5 ihlali — gate≠niyet, niyet-otoritesi kullanıcıdır). Defter diske düzenli yazılmadıysa gözlemci boş-kümeyle "fark yok"
   der = sahte-sıfır; bu yüzden defter-kadansı (bkz. "Oturum karar-defteri") bu süpürmenin ön-koşuludur.
5. **İddia-sınaması (note ↔ model) — karşı-olgusal gerekçeler:** `note`/`rule`-brief makinece aşağı
   katmanlara taşınır (tech + QA onu okur), ama içeriğini hiçbir validator sınamaz — business `rule`
   ADR-0042'den beri **isim + insan-brief**tir, denetlenemeyen prozadır. Bu yüzden emit'ten önce
   **KAPALI kip-listesiyle** tara (skorlama/benzerlik yok): *"… olmadan · aksi halde · yoksa …
   olurdu · bu sayede … engellenir · bu olmasa … yapabilirdi"*. Eşleşen her **karşı-olgusal iddia**
   için tek soru: *"Bu iddia, modeldeki diğer işlemler ve `perform` zincirleri göz önüne alındığında
   hâlâ doğru mu?"* Üç meşru kapanış: (a) iddia modelde ayakta → bırak, (b) yanlış → **davranış-diline
   indir** ("ne engeller" yerine "ne yapar"), (c) iddia doğru olmalıydı ama model onu tutmuyor →
   kuralı/guard'ı güçlendir. **Sınanmamış karşı-olgusal iddia emit'i engeller.** ⚠ Bu tarama iddiayı
   **yüzeye çıkarır, KANITLAMAZ** — kanıt modele bakan muhakemedir; doğrulanamıyorsa (b)'ye in
   (Değişmez-1: doğruluğu gösterilemeyen nedensel iddia = uydurma). Yazım kuralı: `dsl-reference.md` §10.

**Kalan warning = çözülmemiş soru (üçüncü hâl — tutarsızlık değil, sessiz-eksik değil).** Warning'i
skill KENDİ uydurduğu düzeltmeyle kapatamaz — çözüm **authored**'dır (büyü yok). Meşru kapanış üç:
(a) sor → cevaba göre düzelt, (b) gerekçeli kabul, (c) yanlış-pozitif olduğunu göster. Sessiz auto-fix
/ sessiz geçiştirme YASAK. Kabul gerekçesi düşülebilir bilgidir → `note """…"""` ile makinece taşı.

## Üretim (doküman + DSL)

**İnsan çıktısının** modunu **kullanıcı seçer**: (a) önce okunur doküman → sonra DSL,
(b) doğrudan DSL, (c) ikisi birden, ya da sadece biri. En sonda sor:
> "Şimdi (a) önce okunur dokümanı mı, (b) doğrudan DSL'i mi, yoksa (c) ikisini
> birden mi üreteyim?"

⚠ Bu seçim yalnız **insana sunulan** çıktıyı belirler. `.cdsl` (tek doğru kaynak) ve
ondan türetilen `operations.json` (makine-devir sözleşmesi) **her zaman** yazılır —
doküman/DSL seçiminden bağımsız (bkz. "Doğrulama + operations.json"). Kullanıcı "sadece
doküman" dese bile `.cdsl` arka planda materyalize edilir, çünkü operations.json onsuz türetilemez.

DSL'i **modül bazlı** dosyalara böl (tip bazlı değil): tek modüllük analiz →
tek `<modül>.cdsl` dosyası (içinde dependency sırasında: foundation → operation →
flow → process); çok modüllük analiz → modül kadar dosya, aralarında `import`.
`actors.cdsl`/`entities.cdsl` gibi tipe göre dosya AÇMA. Detay ve paylaşılan
foundation kuralı için `references/consistency-and-emit.md` (§C).

Doküman üretirken **sabit markdown şablonunu** kullan (zorunlu bölümler, sıra ve
başlıklar): `references/consistency-and-emit.md` (§D). Doküman, DSL kadar
deterministik olmalı — yapıyı doğaçlama, şablonu uygula.

## Doğrulama + operations.json (gömülü araçlar — otomatik)

Doğrulayıcı ve operations.json üreteci artık **skill içinde gömülü** (`validator/`),
`${CLAUDE_SKILL_DIR}` ile CWD-bağımsız çağrılır — yani her zaman vardır, "varsa" değil.
Akış **iki zorunlu adım**, sırayla:

**1. Doğrula (0 error olmadan ilerleme).**
```
node ${CLAUDE_SKILL_DIR}/validator/validate.mjs <emit-dizini> --json
```
`error` varsa düzelt, tekrar çalıştır — **0 error olmadan döngüden çıkma**. `info` bilgilendiricidir
(ör. F6 kapsama). **`warning` = ikinci-tur soru** — bilgilendirici DEĞİL; çoğu gerçek bir eksik/
tutarsızlık işaretidir → kullanıcıya takip sorusu olarak yansıt, ya gider ya gerekçeyle belgele
(teknik/frontend/qa kardeşleriyle aynı disiplin). Konum çözümleme, bayatlık (grammar+src hash) uyarısı
ve diagnostics→düzeltme döngüsü: **`references/validator.md`**.

**2. operations.json'ı OTOMATİK üret (doğrulama 0-error geçince).** Bu makine-devir
sözleşmesidir — `teknik-analiz` ve `kesif` onu tüketir. İnsana sunulan doküman/DSL seçiminden
**bağımsız, koşulsuz** üretilir:
```
node ${CLAUDE_SKILL_DIR}/validator/emit-operations.mjs <model.cdsl> <model.operations.json>
```
Araç **kendi içinde de doğrular**: `.cdsl`'de severity-1 error varsa emit ETMEZ (exit 1) →
"doğrulama tamamlanınca üret" garantisi araçla zorlanır, prose'a bırakılmaz. Çıktı v3'tür
(`meta.schemaVersion: 3`); `teknik-analiz` bunu `contract` olarak bağlar.

⚠ **Araç per-dosyadır — import kapanışını birleştirmez.** `emit-operations.mjs` yalnız
**verilen `.cdsl` dosyasının** operation'larını yazar; o dosya başka bir `.cdsl`'i `import`
etse bile import edilen modülün operation'ları çıktıya **girmez** (doğrulandı: `support.cdsl`
`shop.cdsl`'i import eder ama emit yalnız support'un op'larını verir). Sonuç: bir tech root'unun
bağlayacağı tüm business op'ları **tek bir `.cdsl` dosyasında** olmalı (manifest'in tek-kök
kuralının business karşılığı). Çok-modüllü bir sistemi tek `operations.json`'da istiyorsan
modülleri tek dosyada topla; ayrı dosyalar ayrı (kısmi) sözleşmeler üretir.

## İnsan-okur raporlar (otomatik)

Makine-JSON'lar 0-error'la üretildikten sonra rapor aracı **OTOMATİK** koşulur —
varsayılan davranıştır; kullanıcı istemezse tek cümleyle atlanır (opt-out):

```
node ${CLAUDE_SKILL_DIR}/validator/report-business.mjs <model.cdsl> --reports <çıktı>/reports --title "<Proje>"
```

Girdi, emit ettiğin `.cdsl`'dir (import kapanışıyla). Üretilenler — hepsi CommandDSL
playground'unun **kendi programatik üreteçlerinden**, el yazımı görsel yok:
`business/usecase.puml` · `flows/<slug>.puml` · `processes/<slug>.puml` +
`<slug>.blueprint.puml` · `docs/**` (process-doc + cockburn) · `COVERAGE.md`. Ardından
araç `reports/index.md` + `index.html`'i **diski tarayarak YENİDEN üretir**
(idempotent) — dört aile skill'i (business/tech/frontend/qa) aynı `reports/` kökünde
birleşir; hepsinde **aynı `--title`**'ı ver.

Exit sözleşmesi: **0** üretildi · **1** girdi hatalı (HİÇBİR rapor yazılmaz — zaten
0-error emit'ten geliyorsan görülmez) · **2** kullanım hatası.

Kapanışta kullanıcıya `reports/index.md`'yi işaret et; `.puml`'ler index'teki
plantuml.com "görüntüle" linkleriyle açılır — görüntüleme harici sunucuda render
edildiğinden, içerik hassassa linke tıklamama tercihi kullanıcınındır (bunu tek
cümleyle not düş). Sözleşme detayı: `references/validator.md` (§7).

---

## Referans dosyaları (gerektiğinde oku)

- `references/dsl-reference.md` — CommandDSL yapılarının tam sözdizimi/anlamı
  (foundation, operation+kurallar, flow, process). Faz sırasında ilgili §'a bak.
- `references/operation-translation.md` — düz cümle → 4'lü imza çeviri prosedürü.
  **Faz 3'te her operation'da oku.** En kritik dosya.
- `references/dependency-closure.md` — ön-gereksinim kapanışı: üretici-tüketici
  tespiti, D1/D2/D3 kapsam seçimi + **D4 yıkım kapanışı (zorunlu)**, seed/embedded
  muafiyetleri, sabit-nokta kapanış. **Faz 3.5'te oku.**
- `references/consistency-and-emit.md` — emit öncesi tutarlılık self-check'i +
  dependency-order emit + dosya bölme. **Emit'ten önce oku.**
- `references/validator.md` — doğrulayıcı konum zinciri + diagnostics + düzeltme
  döngüsü + insan-okur rapor aracı (`report-business.mjs`) sözleşmesi. Üretimden
  sonra doğrulama/raporlama yaparken oku.
- `references/examples/` — **parser-doğrulanmış (0 error) known-good exemplar**:
  dilin tüm construct'larını gösteren çok-modüllü model (`shop.cdsl`+`support.cdsl`)
  + `README.md` (nerede ne var). Bir yapıyı nasıl yazacağından emin değilsen buraya bak.
