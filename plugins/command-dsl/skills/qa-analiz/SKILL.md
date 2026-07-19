---
name: qa-analiz
description: >-
  Teknik Analiz çıktısını (`.tcdsl`) ve İş Analizi sözleşmesini (`operations.json`) —
  İKİSİ DE ZORUNLU girdi — alıp, bir test tasarımcısı / QA lead gibi her operasyonun
  davranış-dal envanterini tech'ten türeterek ve her dal için test-niyeti kararını
  ("bu yol nasıl test edilecek — yoksa gerekçeyle mi kapsam-dışı?") amansızca
  sorgulayarak geçerli bir QA DSL (`.qa`) üretir; üretileni gömülü doğrulayıcıyla
  (`qcdsl --strict`) 0 error'a kadar kanıtlar. Strict ilkesi: **her dal ya test edilir
  ya gerekçeli waive edilir** — üçüncü durum yok. 0-error geçince test-üreteci
  girdileri `<ad>.qa.json` (per-file) + `qa.json` (merged, coverage'lı) OTOMATİK
  üretilir. Şu durumlarda MUTLAKA kullan: "qa analiz", "test analizi", "test tasarla",
  ".qa yaz", "test manifest üret", "dal coverage", "tech analizden test çıkar",
  "test senaryosu çıkar", "test planı çıkar", "qa analysis", "test design",
  "branch coverage", "write .qa", "generate test manifest", "derive tests from tech
  analysis" dendiğinde — veya kullanıcı açıkça DSL demese bile bir teknik analizin
  testlerini/test kapsamını kurmak istediğinde. Bu skill `teknik-analiz`'in
  ÇIKTISINDAN başlar ve test-üretecine devreder; iş analizinin kendisi için
  `is-analizi-dsl`, sunucu tarafı teknik tasarım için `teknik-analiz` kullanılır.
---

# Teknik + İş Analizi → QA Analizi (QA DSL, backend perspektifi)

Onaylanmış analizleri, **dal-coverage'ı tam ve doğrulayıcı-temiz** bir QA Analizi'ne
çevir. Karşındaki kişi test tasarımı kararı veren biridir (QA lead / geliştirici);
senin işin DSL-jargonu ("dal", "coverage", "stub", "waive", "persona", "seed")
sormadan, **türetilmiş envanteri düz dille sunup** kararı çıkarmak ve teknik
karşılığını **arka planda** kurmaktır. Kapsam beyanı: bu skill QA DSL'in **backend
perspektifini** üretir (frontend perspektifi aynı DSL'e ilerde ayrı yüzey — spec
karar #9).

## Neyi neden böyle yapıyoruz (özü kavra)

QA DSL, davranışı **yeniden bildirmez** — tech'in beyan ettiği her davranış dalının
**test niyetini** modeller. Dört ilke skill'in tüm tasarımını dayatır:

1. **Dal-envanteri TÜRETİLİR, karar SORULUR.** Tech gramerinde bir operasyonun
   davranış dalları kapalı ve sayılabilirdir (guard'lı check'ler, taksonomi-pinli
   error'lar, yetki mekanizmaları, compensate'li dış çağrılar — spec §4.1). Skill her
   op için dal uzayını **kendisi çıkarır** ve kullanıcıya boş sayfa değil düz-dil
   **envanter tablosu** sunar; kullanıcıdan yalnız karar ister: *nasıl test / neden
   waive*. "Hangi dallar var?" diye kullanıcıya SORULMAZ — o bilgi tech'te.
   Eşleme: `references/tech-to-qa-translation.md` (en kritik dosya).
2. **Beklenen sonuç SORULMAZ — türetilir (S10).** `then outcome` diye bir şey yok;
   testin `covers`'ı (senaryoda `expect`'i) beklenen sonucu normatif tabloyla belirler
   (spec §5.3). Kullanıcıya "bu test şunu doğrulayacak" diye SÖYLERSİN, sormazsın.
   `then` bloğu yalnız EK kanıt içindir (kayıt oluştu mu, bildirim yayınlandı mı,
   dış çağrı yapıldı mı).
3. **Strict ilkesi — "her dal ya test ya gerekçeli waive" (spec §1).** Kapsanmamış dal
   sessizce var olamaz; gömülü araç `--strict` varsayılanıyla bunu **araca gömer**
   (kapsanmamış dal = error, döngü 0 error olmadan bitmez). Waive bir sus düğmesi
   değildir: `because` gerekçesi zorunlu ve anlamlı olmalıdır.
4. **Üreteç-politikası sınırı geniştir (P1–P15).** Kimliksiz-çağrı testi, ServerError
   zarfı, sayfalama mekaniği, izolasyon/temizlik, invariant örtük-assert'i, saat
   enjeksiyonu — bunlar İSTENMEZ ve YAZILMAZ; test-üreteci politika olarak üretir.
   Kullanıcı isterse sınırı açıkla ("onu yazmıyoruz; üreteç her kimlik-isteyen op için
   kimliksiz-çağrı testini kendisi üretir" — P-tablosu playbook'ta).

**Doğrulayıcı = sorgulama checklist'in.** Her elicitation fazı bir/birkaç doğrulayıcı
karar-eksenini kapatır (faz başlıklarındaki "kapatır" satırı). Sorduğun her soru bir
bütünlük kuralını discharge eder.

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

- **DSL-jargonu gösterme.** "dal/branch", "coverage", "guard", "stub", "waive",
  "persona", "seed", "taksonomi" terimlerini ASLA kullanıcıya sorma; düz cümleden
  *sen* türet: "dış servis çökerse ne olacağını da test edelim mi?" →
  `covers callFailure Payments.ReserveFee` · "testten önce veritabanında 10 aktif
  teklif olsun" → `seed 10 Proposal { status: "Active" }` · "bu yolu şimdilik geçelim
  ama nedenini yazalım" → `waive … because "…"` · "bu testi kim olarak koşalım —
  müşteri mi, yönetici mi?" → `persona` + `as` · "ödeme servisi bu testte ne cevap
  versin?" → `stub … returns { … }`.
- **Envanteri sen sun, kararı o versin.** Faz 2'nin kalbi budur: op-başına türetilmiş
  dal tablosunu düz dille listele, her satır için "test mi, gerekçeli geçiş mi?" sor.
- **Beklenen sonucu SORMA, SÖYLE (S10).** "Bu test ne dönmeli?" sorusu yasak — covers
  onu belirler; sen yalnız ek kanıt sorusu sorarsın.
- **Hibrit onay.** Her fazda önce **toplu öneri** (dal-planı, persona listesi, dataset
  taslağı), sonra tek soruyla onay; takılınan öğede derinleş. Onay almadan alt faza
  inme. Üretim en sondadır.
- **Güvenlik-kritik eksende MUTLAKA sor:** yetki dalları (NotAuthorized alt-yolları —
  hangi mekanizma test ediliyor, hangisi neden waive; karar #21), waive gerekçeleri,
  dış-servis çöküş telafileri (compensate kanıtı `compensated` assert'iyle). Saf-mekanik
  seçimlerde (dataset alan değerleri, test başlığı, binding adı) makul öneri + toplu
  onay yeterli.
- **Doğru atıf.** Dal/veri/stub/assert sorusu **tech**'e bakar; akış/süreç (senaryo
  çıpası) sorusu **operations.json**'a bakar. Uyarı taşırken kaynağı doğru söyle
  ("iş analizi bu akışı tanımlamış; hiçbir senaryo onu koşmuyor").
- **Tech'i DEĞERLENDİR, kutsal metin gibi tüketme.** Dal envanterinin kaynağı tech'tir
  ama tech'in bir kararı testi **imkânsız/anlamsız** kılıyorsa (deterministik assert
  kurulamıyor → test ancak sahte-yeşil olur) etrafından SESSİZCE dolaşma: **DUR**,
  kullanıcıya **neyin neden test edilemez** olduğunu somut söyle, düzeltmeyi
  `teknik-analiz`'e yönlendir (S17 protokolüyle aynı — `references/tech-to-qa-translation.md`
  §H2). Workaround üretme, test uydurma, tech'i kendin düzeltme. **Kapsam DAR:** yalnız
  testi bloke eden / sahte-yeşile zorlayan gerçek çelişki durdurur; üslup/tercih nitpick'i
  durdurmaz — qa her tech kusurunda durursa kullanılamaz hâle gelir.
- **Yerel adlar ASCII (S11).** persona/dataset/step-binding adları ASCII identifier'dır
  (`musteri` olur, `müşteri` olmaz); görünen metin STRING'lerde (başlık, gerekçe) Türkçe
  serbesttir.
- **Anti-pattern guard'larını aktif tut.** Her fazın tipik hatası işaretli
  (`references/interrogation-playbook.md`); sessizce yakala, nazikçe sor.
- **Onaylanmamış hiçbir şeyi emit etme.** Üretim en sondadır; strict-gate araç içindedir.

## Başlamadan

Girdiyi netleştir — **İKİSİ DE ZORUNLU** (skill politikası, tasarım kararı §8/2):

- **`.tcdsl` (teknik analiz çıktısı, ≥1 dosya) var mı?** Dal uzayının TEK kaynağı.
  Yoksa skill **BAŞLAMAZ** → kullanıcıyı `teknik-analiz` skill'ine yönlendir: *"Test
  edilecek davranış beyanı henüz yok; önce teknik analiz yapılmalı."*
- **`operations.json` (v3, `meta.schemaVersion: 3`) var mı?** `uses flows` her zaman
  yazılır; flow/process presence-coverage her zaman açık. Yoksa:
  - Sadece `.cdsl` varsa gömülü araçla üret:
    `node ${CLAUDE_SKILL_DIR}/validator/emit-operations.mjs <girdi.cdsl> <çıktı.operations.json>`
    (parse hatalıysa araç emit etmez — önce iş tarafını `is-analizi-dsl` ile düzelttir).
  - Hiçbiri yoksa skill **BAŞLAMAZ** → `is-analizi-dsl`'e yönlendir.
  - *Dürüstlük notu:* DSL'in kendisi `uses flows`'u opsiyonel tutar; skill-politikası
    bilinçli olarak DAHA SIKIDIR — aile zincirinde operations.json zaten hep vardır ve
    flows'suz `.qa`'da senaryolar akışlara çıpalanamaz. Evreni boş operations.json
    bağlamak zararsızdır (presence uyarısı doğmaz).
- **Tutarlılık ön-kontrolü (S12):** bağlanan tech dosyasının kendi `contract` path'i
  farklı bir operations.json'a işaret ediyorsa doğrulayıcı **info** üretir — bunu
  kullanıcıya taşı: *"Teknik analiz başka sözleşmeye realizes ediyor; doğru dosyayı mı
  bağladık?"*

Sonra yedi fazı sırayla yürüt (elicit top-down: kimlikler → dal-envanteri kararları →
veri → test gövdeleri → senaryolar → kapanış; emit en sonda).

**Sessiz-eksik disiplini — "kapsandı ≠ doğrulandı".** Branch-coverage validator dal uzayını
süpürür; ama bir dal **sayıca "covered" olup test onu gerçekten tetiklemeyebilir / etkisini
doğrulamayabilir** (karar #8). Test gövdesi yazarken `references/qa-dsl-reference.md` **Yetenek
Envanteri**nin "sinyal" kolonunu tara (negatif-girdi dalı gerçekten ihlal ediyor mu? etki-assert'i
var mı? zaman/seed gerekli mi?). Emit'ten önce **★** satırlarını süpür → aşağıda "Emit" (Pre-Emit Gate).

---

## Faz 0 — Bağlam & çift-girdi

**Amaç:** Op evrenini kurmak; her iki kaynağı bağlamak.
**Elicit et (düz dille):**
- "Hangi teknik analiz(ler) test edilecek?" → `.tcdsl` yolları → `uses tech "…"` (≥1).
- "İş analizi sözleşmesi bu mu?" → operations.json v3 teyidi → `uses flows "…"`.
- Tech'in kendi `contract`'ı bağlanan flows'tan farklıysa (S12 info) sessiz geçme —
  kullanıcıya sor, gerekirse dosyayı değiştir.
- Op evrenini kur: bağlanan tech dosyaları + import-kapanışındaki tüm `module`
  Operation'ları (`@internal` ve pureTech-rollüler DAHİL; `external`/`uncharted`
  BoundaryOp'lar HARİÇ — onlar stub hedefidir).

**⚠ Anti-pattern — Bayat sözleşme & tech-yaması:** S12 info'yu soruya çevirmeden
ilerleme. Guard-id çakışması (S17) tech'in hatasıdır — qa tarafında yamalamaya
çalışma, **tech'i `teknik-analiz` ile düzelttir**.
**Kapatır:** uses-çözümü (okunamayan kaynak error), S12 contract-farkı info,
**S17 guard-id tekilliği** (proaktif error — tech'i düzelttir), S14 iç-compensate
info'ları, op-evreni kurulumu.

---

## Faz 1 — Kimlikler (persona)

**Amaç:** Testlerin çağrı kimliklerini kurmak.
**Elicit et:**
- "Testlerde **kim olarak** çağrı yapılacak — müşteri mi, yönetici mi?" → tech
  `rolemap` aktörlerinden persona listesi öner: `persona musteri: Customer`.
- "Zamanlayıcı / sistem kimliği gereken test var mı?" → yalnız pureTech (`~ ->`)
  mapped roller için `persona zamanlayici: role Scheduler` (actor-mapped bir role
  `role` ile bağlanmak error'dur — "actor üzerinden gidin").
- Yetki testleri için **yanlış kimlik** gerekir mi? Ownership testi ikinci kimlik
  ister: "başkasının kaydını görmeye çalışan biri lazım — ikinci bir müşteri kimliği
  ekleyelim mi?" → `persona baskaMusteri: Customer`.

**⚠ Anti-pattern — Persona şişmesi/kırpması:** her rolemap aktörü için persona İCAT
ETME — yalnız testlerin gerçekten kullanacağı kimlikler; ama yetki-testleri için
"yanlış kimlik" personasını ekletmeyi de unutma.
**Kapatır:** persona→rolemap diagnostiği (karşılıksız actor error; actor-mapped role'e
`role` bağı error), ASCII-ad kuralı (S11).

---

## Faz 2 — Dal envanteri & kapsam kararları

**Amaç:** Her op'un türetilmiş dal uzayını karara bağlamak — skill'in kalbi.
**Elicit et:**
- Op-başına türetilmiş dal tablosunu **düz dille SUN** (türetim:
  `references/tech-to-qa-translation.md` §A): *"SubmitProposal'ın şu yolları var:
  (1) başarılı gönderim, (2) boş-başlık kuralı, (3) tutar-pozitif kuralı, (4) bütçe
  limiti kuralı, (5) mükerrer teklif hatası, (6) yetkisiz çağrı, (7) ödeme servisi
  çöküşü (telafisiyle). **Her birini test mi edelim, gerekçeyle mi geçelim?**"*
- Çok-mekanizmalı yetkide (roles + ownership gibi) hangi yol(lar)ın test edileceğini
  **AÇIK sor** (karar #21): *"Bu işleme iki ayrı kapı var — yanlış roldeki kullanıcı
  ve başkasının kaydına erişen kullanıcı. İkisini de mi test edelim?"* Niteleyicisiz
  `covers NotAuthorized` çok-mekanizmalı op'ta error'dur.
- **⚠️ `list of X` DÖNEN op'ta `ownership`/`permit` bir RED DEĞİL — FİLTREdir** (ADR-0040;
  türetim `tech-to-qa-translation.md` §A2). Dal `Filtered <via>`; "başkasının kaydına erişince
  403 alır" o op'ta **ASLA gerçekleşmez** (yalan test). Dal tablosunu bu op'larda **doğru dille
  SUN:** *"Bu bir liste — yetkisiz kullanıcı hata almaz, o kayıtları sadece GÖRMEZ."*
  **İKİ örnek kayıt iste** (arketip ikisini de error'la zorunlu kılar):
  *"(a) Bu kullanıcının GÖRMESİ gereken bir kayıt, (b) GÖRMEMESİ gereken bir kayıt — ikisini de
  tarif eder misin?"* → (a) `result contains {…}` (aşırı-filtreleme), (b) `result absent {…}`
  (**sızıntı**). `ownership <axis>` ise axis'in **kaynak satırını da** seed'let ("delegasyon var"
  + "yok"). Sahiplik kimlik-dikişindense (OwnerId alan değil) kapsam-içi/dışı seed'leri
  `@owner(<persona>)` ile pinle (v3.1.0 — Faz 4 + reference §6).
  **"Kaç kayıt döner?" SORMA** — sayı **kanıt değildir**: filtre bozukken de sonuç `Success`tir ve
  yanlış satırlar dönse bile sayı tutabilir (`result count` → validator error).
  **Tekil** dönen op'ta (`GetX(id): X`) durum DEĞİŞMEZ → `NotAuthorized` (orada gerçekten reddedilir).
- Geçilecek dallar için gerekçe iste ve yapılandır:
  `waive <Op> covers <dal> [until "YYYY-MM-DD"] because "…"`.
- Kullanıcı "girişsiz deneyince ne olur testi" / "sayfa boyutu testi" isterse sınırı
  açıkla: **yazmıyoruz — üreteç politikası** (P1/P3; tek cümle gerekçeyle).
- **Guarantee-farkındalığı (çapraz-kesen):** bir guard/throws dalı bir tech `guarantee`'sinin
  yükümlülüğüyse, onu kapsamak/waive'lemek o garantinin rollup'ını da ilerletir. Ayrı bir karar
  DEĞİL — aynı dal kararının çapraz-kesen görünümü; merged `qa.json` `partial`/`uncovered` kalan
  garantileri işaretler, kapanışta (Faz 6) takip sorusuna dönüşür (bkz. Emit + qa.json bölümü).

**⚠ Anti-pattern — Waive kaçışı (iki yönlü):** waive bir sus düğmesi değildir; gerekçe
ZORUNLU ve anlamlı olmalı ("vaktimiz yok" kabul edilmez → `until` ile erteleme yaz).
**`because` gerekçesini LLM DOLDURAMAZ — authored'dır**: skill gerekçeyi kullanıcıdan alır, kendi uydurmaz (büyü yok). **Doğrulayıcı (bundle'da) erteleme-bahanesi taşıyan gerekçeyi yakalar (F2.3):** kapalı bir bahane-listesine (ör. "vaktimiz yok") uyan `because` → warning ("somut risk-argümanı yaz ya da `until` ile koşullu ertele"). Tüm waive'ler merged manifest'te konsolide taşınır; skill'in `qcdsl.mjs` CLI'ı `--merged` özetinde süre-durumu sınıflamasını basar (`waiver'lar: N · aktif / süresi-yakın / dolmuş / süresiz` — F2.2, `today` CANLI/display-only, merged'e yazılmaz). Statik HTML rapor (`report-qa.mjs`) şimdilik her waive'i `reason` + `until` ile satır-içi gösterir (konsolide "Waiver'lar" bölümü canlı playground'da; report-qa portu henüz kapsamıyor).
Tersi de tuzak: her dala mekanik test yazdırma — tek-rollü op'un NotAuthorized'ı P1
jenerik-kimlik kapsamında waive edilebilir (spec §7 exemplar deseni).
**⚠ Anti-pattern — test-edilemezi waive'e sarma:** dal, tech'in bir kararı yüzünden test
EDİLEMEZ ise (belirsiz tekil dönüş gibi — `references/tech-to-qa-translation.md` §H2) waive
sahte-kapamadır (waive = "test edilebilir ama etmiyorum, gerekçem bu"; burada test edilebilirlik
yok) → DUR, neyin neden test edilemez olduğunu söyle, tech'i `teknik-analiz` ile düzelttir.
**Kapatır:** coverage/strict (S6 + `--strict` yükseltmesi), karşılıksız-hedef
error'ları, #21 NotAuthorized niteleyici zorunluluğu, S5 anonim-dal katlaması
(+ "for guard önerilir" info'sunu tech'e iyileştirme önerisi olarak taşı), waive
kuralları (because zorunlu, stale-waive error, waive+test çelişki warning).

---

## Faz 3 — Veri & varsayılanlar

**Amaç:** Test girdilerini ve op-başına varsayılan kimlik/dış-servis cevaplarını kurmak.
**Elicit et:**
- "Geçerli bir çağrının **örnek girdisi** ne olsun?" → `dataset gecerliTeklif for
  SubmitProposal { title: "Yeni teklif"  amount: 100 }` (alanlar op param'larına karşı
  tip-doğrulanır; ihlal senaryoları Faz 4'te inline override ile kurulur —
  `with gecerliTeklif { title: "" }`).
- **Koleksiyon param (`list of X`) varsa AÇIK sor (v4.0.0):** *"Bu alana hangi öğeler
  girecek — yoksa bilerek boş mu?"* → liste-literal `alan: [öğe, …]` (öğe = literal |
  persona/seed-ref | obje-literal; senaryo-içinde `[s1.result.id, s2.result.id]` gibi
  step-path de olur); "boş" cevabı da AÇIK beyandır → `alan: []`. Koleksiyon alanı
  **boş bırakılamaz** ("Eksik zorunlu alan" error) ve **skaler yazılamaz** (tek öğe de
  `[değer]` ile sarılır — validator error yol gösterir). Eleman tip-denetimi özyinelidir
  (enum-üyelik dahil).
- "Bu op'ların dokunduğu **dış servisler** test sırasında ne cevap versin?" — önce
  stub-birleşimini KENDİN hesapla (QA-07; hesap: translation.md §D): testin yürüttüğü
  TÜM op'ların doğrudan `calls` ettiği external/uncharted hedeflerin birleşimi.
  Sonra düz dille sor: *"Bu testler ödeme servisine dokunuyor; normalde ne dönsün?"*
  → op-başına `defaults for <Op> { as <persona>  stub <Ext.Op> returns { … } }`.
- Etkin kimliği de defaults'a bağla: "Bu işlemi genelde kim çağırıyor testlerde?"

**⚠ Anti-pattern — Stub körlüğü:** birleşimi hesaplamadan stub sorma; eksik-stub
error'ını "araç kızdı" diye değil *"bu test şu dış servise dokunuyor; cevabı ne
olsun?"* diye taşı. **İç-modül çağrıya stub İSTEME** (karar #10 — gerçek koşar).
**Kapatır:** dataset tip-doğrulaması (bilinmeyen/eksik/uyumsuz alan error; S18
opak-tip degrade), **QA-07 stub-zorunluluğu birleşimi** (eksik stub error / fazla stub
error), defaults tekilliği (aynı op'a bir dosyada tek defaults), İQ3 stub-çözüm
önceliği.

---

## Faz 4 — Op-testleri (given / when / then)

**Amaç:** Faz 2 dal-kararlarını test gövdelerine çevirmek.
**Elicit et:**
- Kural-ihlali dalı için: "Bu kural ihlalini tetiklemek için **girdide ne bozulsun**?"
  → `when call with gecerliTeklif { title: "" }`.
- "Testten önce hangi **hazır veri** gereksin?" → `given { seed … }` — çokluk
  (`seed 10 Proposal { … }`) ve binding (`seed p1 = Proposal { … }`; sonraki değerlerde
  `p1` kimlik olarak çözülür — K-C). Kayıt-hazırlığı iş kuralından geçmeli mi?
  "Gerçek akıştan mı kurulsun?" → `given { call ApproveProposal as yonetici with … }`.
- **Sahiplik-dalının (ownership/Filtered) seed'inde SAHİBİ persona'ya PİNLE (v3.1.0):**
  *"Bu kayıt kimin olsun — bizim kullanıcının mı, başkasının mı?"* →
  `seed p1 = Proposal @owner(baskaMusteri) { … }`. Özellikle **kimlik-dikişli**
  entity'lerde (OwnerId authored alan DEĞİL) TEK yol budur: seed gövdesinden yazılamaz,
  given-call arrange da kuramaz (create-op çoğunlukla `@internal`/svc-rollü → persona
  çağıramaz; svc çağırırsa OwnerId=çağıran olur). Persona aynı dosyada tanımlı olmalı
  (değilse error). Entity'de authored `owner` alanı da varsa pin+alanı TUTARLI kur.
- Başarı dalı için: "Başarıda ayrıca **neyi kanıtlayalım** — kayıt oluştu mu, bildirim
  yayınlandı mı, dış çağrı doğru argümanla yapıldı mı?" → `then { state … exists { … }
  emitted … with { … }  called … with { … } }`. **Ama `access { creates|updates|deletes … }`
  taşıyan op'ta bu white-box kanıt TEK BAŞINA yetmez** — mutasyon ayrıca **kamu okuma
  yüzeyinden** de gözlenmeli (business-seviyesi readback; senaryo işi → Faz 5 + Emit
  bölümü "Kapsandı ≠ doğrulandı" geçidi md.4).
- Çöküş dalı için: telafi kanıtını öner: `given { stub Payments.ReserveFee fails }` +
  `then { compensated Payments.ReleaseFee  not emitted … }`.
- Zamana duyarlı guard'da saat pinini öner: "Bu kural tarihe bakıyor — testi sabit bir
  saate mi pinleyelim?" → `given { time "2026-07-02T10:00:00Z" }` (offset ZORUNLU —
  QA-15).
- Event-tetikli (consumer) op'larda act biçimi: `when event Module.Event with { … }`.

**⚠ Anti-pattern — Outcome sorusu & mekanik then:** "bu test ne dönmeli?" SORULMAZ
(S10 türetir). `then` yalnız EK kanıt içindir; her teste mekanik `then` doldurma.
Kimlik-tipli alanlara string-literal FK yazma — seed-binding kullan (K-C).
**Kapatır:** başlık/covers tekilliği (S1/S2), given kuralları (seed tip-doğrulama +
çokluk/binding; senaryo-dışı stepPath yasağı; QA-15 offset'li time + F7 değer-sanity;
S7 given-call infra-fail semantiği), when-event `on`-aboneliği, then assert yapısal
doğrulamaları (result/state/emitted/called/compensated/page tabloları — spec §5.3;
S4 page yalnız paginated; S9 access-dışı entity warning; İQ11 called hedef kümesi).

---

## Faz 5 — Senaryolar (akış kanıtı)

**Amaç:** İş akışlarının uçtan uca yaşam döngüsünü senaryolarla kanıtlamak.
**Elicit et:**
- operations.json'daki flow/process evreninden **presence tablosu sun**: *"İş analizi
  şu akışları tanımlıyor: … Hangilerine uçtan-uca senaryo yazalım?"* Kapsanmayanları
  tek tek sor: "senaryo mu ekleyelim, bilinçli kapsam-dışı mı?" (waive flow'a
  UYGULANMAZ — presence uyarısı ancak senaryoyla kapanır ya da belgeli-açık kalır).
- **Ürün-hedefi (outcome) presence — flow/process'in KARDEŞİ (F3.6, ADR-0037):** operations.json
  ölçülebilir `outcome`/SuccessCriteria taşıyorsa evreni de SUN: *"İş analizi şu ölçülebilir
  ürün-hedeflerini tanımlıyor: … **Bu senaryo hangi ürün-hedefini karşılıyor?**"* → senaryoya
  `satisfies <outcome>` (varsa `realizes flow/process` ile aynı satırda). Karşılanmayan hedefi
  tek tek sor: "senaryo mu, kapatılabilir açık-hedef mi?" — uyarı **warning-routed** (waive
  KAPATMAZ; strict'te de error değil). **★ süpürme:** yalnız-**op** kapsayan outcome yalnız
  `satisfies` ile bağlanabilir (`realizes flow` onu asla covered yapmaz) — es geçme.
  Kaynak/mekanik: `references/tech-to-qa-translation.md` §G2.
- **Business-seviyesi readback — durum-değiştiren op'un mutasyonunu KAMU OKUMA
  YÜZEYİNDEN gözle (analist disiplini, validator kapısı DEĞİL):** tech'te
  `access { creates|updates|deletes … }` taşıyan bir op'u, mutasyonu YALNIZ white-box
  (`state`/mutating op'un kendi `result.*` cevabı) doğrulayan bir op-testiyle bırakma.
  Aynı entity'yi acting persona'ya açan **okuma op'unu** (`access { reads … }`) — **SEN
  seç**, üretecin tahminine bırakma (birden çok aday okuma olabilir; determinizm) — ve
  mutasyondan sonra senaryoda bir okuma adımı olarak koşturup mutasyonun o yolda
  GÖRÜNDÜĞÜNÜ + doğru scope'landığını kanıtla:
    - liste dönen okuma: `step ListMyX with { } expect Success { result contains { id: s1.result.id } }` (delete → `result absent { id: s1.result.id }`);
    - tekil dönen okuma (`GetX(id): X`): `as musteri` (ayrı satır) + `step GetX with { id: s1.result.id } expect Success { result.<alan> = <beklenen> }`
      (`result contains`/`absent` YALNIZ liste-dönüşte — tekilde alan-eşitliğiyle assert et).
  `as <persona>` okuma adımını acting persona'ya çevirir → aynı anda **scope'u** da
  kanıtlar (owner görür / yabancı görmez; liste okumada ADR-0040 `contains`+`absent`
  ikilisi zorunlu). Uygun okuma yüzeyi GERÇEKTEN yoksa: **QA DSL'de bunu makinece taşıyan
  yapı YOK** (readback'e bağlanacak dal da `note` da yok; `waive <Op> covers <dal>` tüm
  Success testini waive'ler — readback'i değil) → **kullanıcıya söyle ve gerekçeyi prose
  kararı olarak kaydet**; op-testi white-box'ta kalır, sessizce atlama.
- Seçilen akış için: "**Hangi adımlar, hangi sırayla? Kim** hangi adımda?" →
  `scenario "…" realizes flow X { as musteri  step s1 = SubmitProposal with … expect
  Success  as yonetici  step ApproveProposal with { id: s1.result.id } expect Success }`
  (`as` satırı akış boyunca etkin aktörü değiştirir; sonraki adımlar bağlanmış adımın
  sonucunu `s1.result.<path>` ile okur — yalnız `expect Success` adımları bağlanabilir,
  S3).
- "Adımlar arası **zaman geçiyor mu**?" → `time "…"` pini + `advance time 2 days`
  (pin olmadan `advance` error'dur).
- Çok-aktör süreçler `realizes process X` ile çıpalanır (karar #23/#24).
- Fail-fast'i kullanıcıya bilgi olarak söyle (P7): ilk beklenmeyen sonuçta/assert
  başarısızlığında senaryo durur, kalan adımlar "skipped" raporlanır.

**⚠ Anti-pattern — Senaryo-op-testi karışması:** senaryo dal-avı yeri değildir;
hata-dalları op-testinde, yaşam döngüsü senaryoda yaşar. Senaryo `expect`'i coverage'a
sayılır ama `callFailure` senaryoda YOKTUR (S15 — stub'lar senaryo-başı sabittir).
Bağlanmamış step sonucuna path yazdırma (S3).
**Kapatır:** flow/process presence-coverage (#23/#24 — strict'te de warning kalır),
**outcome `satisfies` presence-coverage (F3.6 — kapatılabilir ürün-hedefi; warning-routed,
waive kapatmaz; bilinmeyen outcome → error)**,
step kuralları (S3 yalnız-Success binding, S15 senaryo-expect'te callFailure yok,
S4 `after` yalnız paginated + aynı-op + bağlı hedef, QA-12 stepPath çözümü,
senaryo-given-call'da `as` zorunlu — F8), fail-fast semantiği (P7 — kullanıcıya bilgi).

---

## Faz 6 — Kapanış & tutarlılık self-check

**Amaç:** Strict-döngüsünün son turu — sıfır açık uç.
**Elicit et:**
- Kalan kapsanmamış dallar (strict error'ları) **tek tek**: "test mi ekleyelim,
  gerekçeyle mi geçelim?"
- Waive+test çelişkileri: "Bu yol hem test edilmiş hem 'geçildi' işaretli — hangisi
  kalsın?"
- Süresi geçen `until`'lar (İQ6): "Bu erteleme dolmuş — test mi yazalım, süreyi mi
  uzatalım?"
- Presence boşlukları son kez (Faz 5 kararlarının teyidi).
- Emit-öncesi bütünlük self-check'ini geç: `references/consistency-and-emit.md` §A.

**⚠ Anti-pattern — "Kalan hatalar beklenen" normalizasyonu:** strict error'ı ya testle
ya waive'le kapanır; "sonra bakarız" yok (yarım-bırakmama — skill'in varlık sebebi).
**Kapatır:** strict-döngüsünün son turu, İQ6 until-değerlendirmesi, emit-öncesi
bütünlük self-check.

---

## Emit + Doğrulama + qa.json (otomatik)

**Emit:** `.qa` dosya(ları) — başında `uses tech "…"` (≥1) + `uses flows "…"`; gövdesi
persona / dataset / defaults / test / scenario / waive. Tavsiye edilen granülarite:
tech-dosyası-başına bir `.qa` (küçük modelde tek dosya); coverage **workspace-union**
olduğundan bölme serbesttir — TÜM dosyaları doğrulayıcıya **tek çağrıda** ver
(union ancak böyle doğru). Dosya kuralları: `references/consistency-and-emit.md`.

**Emit-öncesi "Kapsandı ≠ doğrulandı" geçidi — ÇİFT-SIFIR (0-error VE 0-sessiz-eksik).**
Branch-coverage tam olsa bile YETMEZ: bir dal SAYILDI diye gerçekten test edildiği anlamına gelmez.
`references/qa-dsl-reference.md` **Yetenek Envanteri**nin **★** satırlarını gez:
1. Her negatif dal (`covers guard/error/NotAuthorized`) için — `when`/`given` girdisi o dalı
   GERÇEKTEN tetikliyor mu, yoksa yanlış girdiyle sessizce Success mi dönüyor? (karar #8)
2. Her komut/Success testinde kalıcı etki (`state`/`emitted`/`called`) doğrulandı mı, yoksa
   assert'siz sığ mı? Zamana-duyarlı op'ta `time` pini, state-rule'da `seed` var mı? `until`'siz
   waive kaldı mı? Sorulmamış her ★'ı göster ya da tek soruyla kapat.
3. **Sınır-devri (köprü süpürmesi):** çok-aktör bir süreç ya da event-zinciri (üretici `emits` →
   tüketici `on`) var mı? Tek-op testi sınırı geçmez — bir `scenario realizes process` gerekli mi?
   (NOT: uçtan-uca üretici→tüketici gözlemi qa v1'de YOK — playbook §P/P9: emit edilen event consumer'ı TETİKLEMEZ; consumer'ın izole testi `when event` (reference §7). Sınırı **bildir**, niyeti
   senaryoyla yakala, kapsayamadığın parçayı gerekçeyle waive'le.)
4. **Business-seviyesi readback (durum-değiştiren op → kamu okuma yüzeyi):** `access {
   creates|updates|deletes … }` taşıyan HER op için — mutasyon YALNIZ white-box'la mı
   (`state`/mutating op'un kendi `result.*`'ı) doğrulanmış, yoksa acting persona'ya açık
   bir **okuma op'uyla** (analistin AÇIKÇA seçtiği; liste → `result contains`/`absent`,
   tekil → `result.<alan> = …`) senaryoda geri-okundu ve scope'landı mı? Readback'siz her
   mutasyon testi = eksik analiz. Uygun okuma yüzeyi yoksa gerekçesi **prose kararı olarak
   kullanıcıya bildirilmeli** (sessiz atlama YOK). *(Analist disiplini — branch-coverage
   "kapsandı" der ama araç readback'i zorlayamaz; QA DSL'de readback-`waive`/`note` yok →
   teeth bu süpürmede.)*

**Kalan warning = çözülmemiş soru (üçüncü hâl — error değil, sessiz-eksik değil).** Warning'i skill
KENDİ uydurduğu düzeltmeyle kapatamaz — çözüm **authored**'dır (büyü yok). Meşru kapanış üç: (a) sor →
test ekle, (b) `waive … because` (gerekçe ZORUNLU — makinece taşınır), (c) yanlış-pozitif olduğunu
göster. Sessiz swallow / gerekçesiz waive YASAK.

**Doğrula (zorunlu):** Gömülü doğrulayıcıyı çalıştır:
```
node ${CLAUDE_SKILL_DIR}/validator/qcdsl.mjs <dosya|dizin ...> --strict --out <çıktı-dizini> --merged <çıktı-dizini>/qa.json --json
```
- **error** varsa → düzelt/sor, tekrar çalıştır. **0 error olmadan döngüden çıkma.**
  Strict'te kapsanmamış-dal da error'dur (`qa.uncovered-branches`) → her biri Faz 6
  sorusudur: "test mi, waive mi?"
- **warning**'leri **kullanıcıya takip sorusu** olarak geri yansıt (flow/process
  presence → senaryo kararı; waive+test çelişkisi → hangisi kalsın; S9 access-dışı
  state-assert → kasıtlı yan-etki avı mı, yanlış entity mi). Soru kalıpları:
  `references/validator.md` + `references/interrogation-playbook.md`.
- **info**'lar kayıt amaçlı; ikisini aktif taşı: S12 (tech farklı sözleşmeye realizes)
  ve S5 ("id'siz kural — dal-düzeyi izleme için tech'e `for guard` eklettir" — tech'e
  iyileştirme önerisi olarak raporla, qa tarafında bekletme).

**`<ad>.qa.json` + `qa.json` OTOMATİK üretilir:** araç **kendi içinde gate'ler** —
severity-1 error varsa (strict-yükseltilmişler DAHİL) hiçbir JSON YAZMAZ (exit 1,
partial yok). "0-error → otomatik emit" garantisi prose'a değil **araca** gömülüdür.
0-error'da `--out` dizinine dosya-başına `<ad>.qa.json` + `--merged` ile birleşik
`qa.json` üretilir (**coverage YALNIZ merged'de** — karar #18). Merged, "her dal
kapalı" iddiasının makine-okur kanıtıdır; test-üreteci onu tech `manifest.json` ile
**çift girdi** alır (devir paketi: `references/consistency-and-emit.md` §E).

**guarantee-coverage sinerjisi (additif, merged'de).** Bağlı tech dosyalarında
`guarantee` (çapraz-kesen izlenebilirlik; tech DSL §11) varsa, merged `qa.json`'a
`coverage.guarantees[]` eklenir: her garantinin **testable** yükümlülükleri (`by guard`
/ `by throws`) op-dal kapsamasına join edilir (durum: covered/waived/uncovered),
`by invariant`/`by operation` **structural**'dır (dal değil, rollup dışı). Garanti
rollup'ı: `covered` (tüm testable kapsanmış) / `partial` / `uncovered` / `structural`.
CLI de merged özetinin altında `garantiler: N · … covered / … partial / …` satırını,
ve `partial`/`uncovered` garantilerin kapsanmayan yükümlülüklerini `⚠` ile basar. **QA
garanti YAZMAZ** (guarantee tech'te authored); QA yalnız test-kapsamasını **raporlar** —
`partial`/`uncovered` bir garanti = çapraz-kesen bir güvencenin testi eksik → kullanıcıya
takip sorusu ("bu garantinin şu guard'ı test edilmemiş — test mi, waive mı?").

Konum çözümleme, strict varsayılanı, bayatlık (iki-hash) uyarısı,
aile-eşzamanlı-build kuralı: `references/validator.md`.

---

## İnsan-okur raporlar (otomatik)

Merged `qa.json` 0-error'la üretildikten sonra rapor aracı **OTOMATİK** koşulur —
varsayılan davranıştır; kullanıcı istemezse tek cümleyle atlanır (opt-out):

```
node ${CLAUDE_SKILL_DIR}/validator/report-qa.mjs <çıktı>/qa.json --reports <çıktı>/reports --title "<Proje>"
```

Girdi, `--merged` ile üretilen birleşik manifest'tir (coverage yalnız orada — karar
#18). Üretilen (playground'un **kendi programatik üreteci** — el yazımı görsel yok):
`qa/kapsama.html` — playground "Kapsama" sekmesinin statik eşdeğeri (op×dal chip'li
tablo + flow/process presence + meta). Ardından araç `reports/index.md` +
`index.html`'i **diski tarayarak YENİDEN üretir** (idempotent) — dört aile skill'i
(business/tech/frontend/qa) aynı `reports/` kökünde birleşir; hepsinde **aynı `--title`**'ı ver.

Exit sözleşmesi: **0** üretildi · **1** girdi hatalı (HİÇBİR rapor yazılmaz — zaten
0-error emit'ten geliyorsan görülmez) · **2** kullanım hatası.

Kapanışta kullanıcıya `reports/index.md`'yi işaret et; index'teki `.puml`'ler (diğer
aile skill'lerinin raporları) plantuml.com "görüntüle" linkleriyle açılır —
görüntüleme harici sunucuda render edildiğinden, içerik hassassa linke tıklamama
tercihi kullanıcınındır (bunu tek cümleyle not düş). Sözleşme detayı:
`references/validator.md`.

---

## Referans dosyaları (gerektiğinde oku)

- `references/qa-dsl-reference.md` — QA DSL construct'larının tam sözdizimi/anlamı:
  uses/persona/dataset/defaults/test/scenario/given/when/then/waive, S10 türetim
  tablosu, dal-uzayı tablosu, keyword tuzakları.
- `references/tech-to-qa-translation.md` — `.tcdsl` clause'ları → dal uzayı eşlemesi;
  NotAuthorized mekanizma rehberi; stub-birleşimi hesabı; dal-uzayına girmeyenler
  (üreteç-politikası sınırı); operations.json → flow/process evreni.
  **En kritik dosya** (Faz 2-5'te okunur).
- `references/interrogation-playbook.md` — her doğrulayıcı ekseni → düz-dil soruları +
  anti-pattern guard'ları + P1–P15 üretim-politikaları tablosu ("üreteç neye karar
  verir / yazar neye karar verir").
- `references/consistency-and-emit.md` — emit öncesi bütünlük self-check + dosya
  granülaritesi + workspace-pass kuralı + strict-gate'in garantisi + per-file/merged
  anlamı + test-üreteci devir paketi.
- `references/validator.md` — gömülü araç çağrımı + strict varsayılanı + bayatlık
  (iki-hash + aile-eşzamanlı-build) + diagnostics→düzeltme + warning→takip-sorusu
  döngüsü + insan-okur rapor aracı (`report-qa.mjs`) sözleşmesi.
- `references/examples/` — parser-doğrulanmış (strict 0 error) exemplar:
  `proposals.qa` + `proposals.tcdsl` + `proposals.operations.json` üçlüsü + gömülü
  araçla üretilmiş `proposals.qa.json` + `qa.json`.
