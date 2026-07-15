# Sorgulama playbook'u — eksen → düz-dil soruları + anti-pattern guard'ları

> Muhatap: test tasarımı kararı veren kişi (QA lead / geliştirici) — ama DSL'i bilmek
> zorunda değil. Kural: DSL-jargonu ("dal", "coverage", "guard", "stub", "waive",
> "persona", "seed", "taksonomi", "fail-fast") SORMA; düz cümle sor, teknik karşılığı
> SEN kur. Her eksen bir doğrulayıcı kuralını discharge eder (SKILL.md faz tablosu).
> Fark: frontend'te eksenler kullanıcı beyanından kurulurdu; burada envanter TECH'ten
> mekanik türetilir (translation.md §A) — kullanıcıya yalnız KARAR sorulur.

## Faz 0 — Bağlam & çift-girdi

- "Hangi teknik analiz(ler)in testlerini kuruyoruz?" → `uses tech` yolları.
- "İş analizi sözleşmesi bu dosya mı: <yol>?" → `uses flows` teyidi.
- S12 info gelirse: "Teknik analiz '<contract yolu>' sözleşmesine bağlı görünüyor ama
  biz '<flows yolu>'nu bağladık — hangisi doğru?"
- S17 error gelirse: "Teknik analizde '<op>' içinde '<id>' kural-adı iki kez
  kullanılmış — testleri hangi kurala bağlayacağımız belirsiz. Önce teknik analizi
  düzeltelim."

**⚠ Guard — Bayat sözleşme / tech-yaması:** S12'yi sessiz geçme; S17'yi qa tarafında
yamalamaya çalışma (translation.md §H) — düzeltme yeri TECH'tir.

## Faz 1 — Kimlikler

- "Testlerde kim olarak çağrı yapacağız — sistemi kimler kullanıyor?" (rolemap'ten
  önerini listele: "müşteri, yönetici görüyorum").
- "Zamanlayıcı/sistem tarafından tetiklenen işlem var mı — onun için ayrı kimlik
  gerekiyor mu?" → pureTech `role` bağı.
- "'Başkasının kaydına erişim' testleri olacak — **ikinci bir müşteri kimliği**
  ekleyelim mi?" (ownership testi iki persona ister.)

**⚠ Guard — Persona şişmesi/kırpması:** her rolemap aktörüne persona icat etme; yalnız
testlerin kullanacağı kimlikler. Ama yanlış-kimlik personasını da unutma.

## Faz 2 — Dal envanteri & kapsam

- Envanteri SUN (sorma!): "**<Op>** için test edilecek yollar şunlar: [düz-dil liste —
  translation.md §A sunum sütunu]. Her biri için: test mi yazalım, gerekçeyle mi
  geçelim?"
- Guard dalı için bağlamı ver: "'başlık boş olamaz' kuralı var — ihlalini test edelim
  mi?" (kuralın tech'teki ifadesini düz dile çevirerek).
- Çok-mekanizmalı yetki (karar #21 — MUTLAKA AYRI AYRI sor): "Bu işleme iki ayrı kapı
  var: yanlış rol ve başkasının kaydı. İkisini de mi test edelim, birini gerekçeyle mi
  geçelim?"
- Waive gerekçesi: "Bu yolu geçiyoruz — **neden**? (Bu gerekçe dosyaya yazılacak ve
  ekip görecek.)" Gerekçe zayıfsa ("vaktimiz yok"): "O zaman bir tarihe erteleyelim —
  ne zamana kadar?" → `until "YYYY-MM-DD"`.
- Anonim dallar (S5): "Teknik analizde adsız kurallar var; bunlar topluca TEK yol
  sayılıyor — tek testle mi kapatalım? (İleride ayrı izlemek istersen teknik analizde
  kurallara ad verilmeli — bunu öneri olarak not ediyorum.)"

**⚠ Guard — Waive kaçışı (iki yönlü):** gerekçesiz "geç" KABUL ETME; ama her dala
mekanik test de yazdırma — tek-rollü op'un NotAuthorized'ı P1 gerekçesiyle waive
edilebilir (spec §7 deseni).
**⚠ Guard — P-sınırı:** "girişsiz test", "sayfa boyutu testi", "temizlik testi"
istekleri → §P tablosu; yazma, açıkla.
**⚠ Guard — Test-edilemez tech kararı (DUR ve BİLDİR):** envanteri türetirken / test
kurarken bir tech kararı deterministik testi imkânsız kılıyorsa (translation.md §H2
tablosu — ör. tek kayıt dönen op'ta belirleyici girdi de istisna `note`'u da yok)
etrafından dolaşma, waive'e sarma, test uydurma. Kalıp: "Teknik analizde <Op> tek kayıt
döndürüyor ama imzada o kaydı belirleyen girdi yok — hangi kaydı doğrulayacağımız
tanımsız, bu haliyle test sahte-yeşil olur. Önce teknik analizi düzeltelim." Kapsam DAR:
yalnız testi bloke eden çelişki durdurur; üslup/tercih nitpick'i durdurmaz.

## Faz 3 — Veri & varsayılanlar

- "Geçerli bir <Op> çağrısının örnek girdisi ne olsun? (alanlar: <param listesi>)"
  → dataset. Değerleri sen öner, toplu onaylat.
- Stub-birleşimini hesapladıktan sonra (translation.md §D): "Bu testler <dış servis>
  servisine dokunuyor — normalde ne cevap versin?" → `defaults … stub … returns`.
- "Bu işlemi testlerde genelde kim çağırıyor?" → `defaults … as`.
- Kimlik-tipli alan görürsen: "sahibi kim olsun?" → persona referansı (string-literal
  kimlik yazma).

**⚠ Guard — Stub körlüğü:** birleşimi hesaplamadan stub sorma; iç-modül çağrıya stub
İSTEME (karar #10). Eksik-stub error'ını ihtiyaç cümlesiyle taşı ("araç kızdı" değil).
**⚠ Guard — Opak tip iddiası (S18):** tipi çözülemeyen alan için "doğruladım" deme;
değeri kullanıcı beyanıyla yaz, doğrulama iddiasında bulunma.

## Faz 4 — Op-testleri

- Kural-ihlali: "Bu kuralı ihlal etmek için girdide ne bozulsun — boş başlık mı,
  sıfır tutar mı?" → inline override.
- Ön-durum: "Testten önce sistemde ne olsun — kaç kayıt, hangi durumda?" → seed
  (çokluk/binding'i sen kur). "Bu hazırlık gerçek iş akışından mı geçsin?" → given-call.
- Başarı kanıtı: "Başarıda ayrıca neyi kanıtlayalım — kayıt oluştu mu, bildirim
  yayınlandı mı, dış servise doğru tutarla mı gidildi?" → state/emitted/called.
- Çöküş dalı: "Dış servis çökünce nelerin OLMAMASI gerekiyor (kayıt kalmasın, bildirim
  çıkmasın) ve telafi çağrısı koşmalı mı?" → compensated + not emitted + state absent.
- Zamana duyarlı guard: "Bu kural tarihe/saate bakıyor — testi sabit bir ana
  pinleyelim mi?" → `given time` (offset'li).
- Liste dönen op'ta: "dönen listede kaç öğe beklenir / hangi öğe mutlaka olmalı?"
  → `result count / contains / absent`.

**⚠ Guard — Outcome sorusu:** "bu test ne dönmeli?" SORULMAZ — S10 türetir; sen
SÖYLERSİN ("bu test 'başlık gerekli' reddini doğrulayacak").
**⚠ Guard — Mekanik then:** her teste then doldurma; then yalnız EK kanıt.
**⚠ Guard — S9:** kullanıcı op'un dokunmadığı tabloyu kontrol ettirmek isterse:
"bu işlem o tabloya dokunmuyor — yan-etki avı mı (bilinçli), yanlış tablo mu?"

## Faz 5 — Senaryolar

- Presence tablosunu SUN: "İş analizi şu akışları/süreçleri tanımlıyor: […]. Hangileri
  için uçtan-uca senaryo yazalım?" Kapsanmayan her biri için: "bilinçli kapsam-dışı mı?
  (Not: bu boşluk raporda uyarı olarak kalır — akış uyarısı 'geç' kaydıyla kapanmaz.)"
- **Ürün-hedefi (outcome) presence — flow/process presence'in KARDEŞİ (F3.6):** iş analizi
  ölçülebilir başarı-ölçütü (`operations.json.successCriteria`) tanımladıysa, evreni SUN:
  "İş analizi şu ölçülebilir ürün-hedeflerini tanımlıyor: […]. **Bu senaryo hangi
  ürün-hedefini karşılıyor?**" Yazdığın her yaşam-döngüsü senaryosu için sor: "bu akış şu
  hedefi kanıtlıyor mu?" → `satisfies <outcome>` (varsa `realizes flow/process` ile birlikte
  aynı senaryoda). Karşılanmayan her hedef için: "senaryo mu ekleyelim, kapatılabilir
  açık-hedef mi bırakalım?" (Not: uyarı warning-routed — **waive KAPATMAZ**; ancak senaryo
  ya da belgeli-açık.)
  - **★ süpürme (yalnız-op kapsayan hedef):** bir outcome yalnız bir op'u kapsıyorsa
    `realizes flow` onu ASLA covered yapamaz → `satisfies` TEK yoldur; bu hedefi es geçme.
- Akış başına: "Adımlar hangi sırayla? Her adımı **kim** yapıyor?" → as/step dizisi.
- "Bir adımın çıktısı sonrakinin girdisi mi (oluşan kaydın numarasıyla mı devam
  ediliyor)?" → step-binding (`s1.result.id`).
- "Adımlar arasında zaman geçiyor mu (onay 2 gün sonra gibi)?" → time + advance.
- Fail-fast bilgisi (SOR değil SÖYLE — P7): "Bir adım beklenmedik sonuç verirse
  senaryo orada durur, kalanı 'atlandı' raporlanır."

**⚠ Guard — Senaryo-op-testi karışması:** hata-dalı avı senaryoya taşınmaz (özellikle
dış-çöküş: S15 — senaryoda callFailure YOK); yaşam döngüsü senaryoda, hata-dalları
op-testinde. Bağlanmamış adımın sonucuna path yazdırma (S3 — yalnız başarılı adım
bağlanır).

## Faz 6 — Kapanış

- Kalan her strict-error dalı için TEK TEK: "şu yol hâlâ açık: <düz-dil> — test mi,
  gerekçeli geçiş mi?"
- Waive+test çelişkisi: "Bu yol hem test edilmiş hem 'geçildi' işaretli — hangisi
  kalsın?"
- Süresi geçmiş until (İQ6): "'<dal>' için erteleme <tarih>'te dolmuş — test mi
  yazalım, süreyi mi uzatalım?"

**⚠ Guard — Normalizasyon:** "kalan hatalar beklenen" YOK; strict error ya testle ya
waive'le kapanır.

## §P — Üretim-politikaları tablosu (P1–P15): üreteç neye karar verir / yazar neye karar verir

Kullanıcı bu eksenlerde test/davranış isterse: **yazmıyoruz — üreteç politikası** +
tek cümle gerekçe. Yazarın (senin+kullanıcının) alanı yalnız sağ sütundur.

| # | Üreteç neye karar verir (SORULMAZ, YAZILMAZ) | Yazar neye karar verir (skill'in işi) |
|---|---|---|
| P1 | Kimlik isteyen her op için jenerik kimliksiz-çağrı (NotAuthenticated) testi | Yetkili/yanlış-kimlikli çağrı testleri (NotAuthorized dalları) ve waive gerekçeleri |
| P2 | ServerError zarfının altyapı-testi | — (callFailure dalı yazılır; outcome'u S10 türetir) |
| P3 | Jenerik sayfalama testleri (sıralama, size, imleç) | Veri-özel sayfa doğrulaması (`page count/more/end`, `after`) |
| P4 | Saat enjeksiyonu; pin yoksa gerçek saat | `time` pini + `advance time` (zamana duyarlı guard'da pinle) |
| P5 | Seed'in persistence'a doğrudan yazılması | Seed İÇERİĞİ; iş kuralından geçmesi gerekiyorsa `given call` seçimi |
| P6 | Test izolasyonu (temiz state) | — |
| P7 | Fail-fast yürütme + "skipped" raporu | Senaryo adım sırası ve expect'leri |
| P8 | Stub gerçekleme; `fails` → ServerError sınıfı | Stub davranışı (`returns { … }` içeriği / `fails`) |
| P9 | Event tesliminin senkron-eşdeğerliği; emit edilen event consumer'ı TETİKLEMEZ | `emitted/not emitted` assert'leri; consumer'ın izole `when event` testi |
| P10 | Outbound gözlem noktası (çağrı kaydı/outbox) | `called/not called/compensated` assert'leri |
| P11 | Deterministik kimlik üretimi (çokluk-seed dahil) | Seed binding adları ve alan değerleri |
| P12 | `consistency async` efektlerinin senkron-eşdeğer kabulü (polling yasak) | — |
| P13 | Entity `invariant`'larının test-sonu örtük assert'i | — (ayrıca yazdırma) |
| P14 | given yürütme sırası (time/stub konum-bağımsız; seed/call sıralı) | given girdilerinin beyan SIRASI (seed→call bağımlılıkları) |
| P15 | Serving'siz/@internal op'ların in-process çağrısı | Bu op'lara da test yazılabileceği bilgisi |

Ek: rol-matrisi jenerik NotAuthorized üretimi (QA-18) **üreteç-tavsiyesi** statüsündedir
— normatif değil; kullanıcıya vaat etme, yalnız "üreteç-politikası adayı" olarak an.

## Genel lens'ler (her fazda akılda)

- **Envanter-tamlık testi:** sunduğun dal tablosu §4.1 türetiminin TAMAMI mı? (Eksik
  sunulan dal, strict'te sürpriz error olur — döngü israfı.)
- **Güvenlik testi:** her NotAuthorized alt-dalının kararı AÇIK mı (test/waive)?
  Waive'lerde gerekçe güvenlik-zayıflatmayı örtmüyor mu?
- **Kanıt testi:** kritik yan-etkili op'larda (para, bildirim, dış çağrı) Success
  testi çıplak mı kaldı? Ek kanıt öner (state/emitted/called).
- **Akış-yetimliği testi:** operations.json'daki her flow/process için karar var mı
  (senaryo ya da belgeli-açık)?
