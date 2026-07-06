# İki-Agent Q&A Transkripti (paydaş↔analist)



### TUR 1 — ANALİST (Faz 0 — Açılış + Bağlam & Aktör Haritası (KİM? NE?)):
Merhaba! Aklınızdaki uygulamayı birlikte adım adım netleştireceğiz. Hiç teknik terim sormayacağım — siz sadece işinizi bana anlatır gibi, günlük dille konuşun; gerisini ben arka planda toparlarım. Küçük parçalar hâlinde ilerleyeceğiz ve her adımda size "doğru anladım mı?" diye soracağım.

Başlamak için birkaç temel soru:

1) EN ÖNEMLİSİ — Tek cümleyle: Bu uygulama temelde ne işe yarayacak, kime hangi derdi çözecek? (Örnek cümle kalıbı: "Şunu yapan kişilerin, şu işi daha kolay yapmasını sağlayacak.")

2) KİMLER KULLANACAK? Bu işin içinde hangi insanlar / roller var? (Örneğin: sıradan kullanıcı, bir yönetici/onaylayan, bir destek görevlisi, sistem yöneticisi...) Aklınıza kim geliyorsa sayın — sonra ben derleyip size geri okuyacağım.
   - Bu rollerden biri, bir diğerinin yaptığı HER ŞEYİ yapıp üstüne fazladan yetkilere de sahip mi? (Örneğin "yönetici, normal kullanıcının yaptığı her şeyi yapar, ayrıca onaylar da.")
   - Sadece bakan/görüntüleyen ama hiçbir şeyi değiştiremeyen bir taraf var mı?

3) NELER SAKLANACAK? Sistemin hatırlaması / kayıt altında tutması gereken temel "şeyler" neler? (Örneğin: bir talep, bir sipariş, bir müşteri kartı, bir belge...) Her biri için, o kaydın içinde hangi bilgiler yazılı olur kabaca? (tarih, tutar, durum, açıklama gibi)

4) "SADECE KENDİNİNKİ" DURUMU: Bu rollerden biri, sistemdeki her kayda değil de yalnızca "kendine ait olan" bir gruba mı erişiyor? (Örneğin "yönetici yalnızca kendi ekibinin taleplerini görür", "temsilci yalnızca kendi bölgesinin müşterilerini yönetir" gibi bir sınır var mı?)

5) ZAMANA BAĞLI KISIT: "Yalnızca mesai saatinde yapılabilir", "hafta sonu kapalı" gibi bir zaman kuralı olan işler var mı?

Şimdilik bu kadar — cevaplarınıza göre büyük resmi (uçtan uca süreçler) bir sonraki turda çıkaracağız.

### TUR 1 — PAYDAŞ:
**1) Tek cümlelik özet:**
Markalı işletmelerin, Trumore mobil uygulaması ve Togg akıllı araç ekranındaki haritalarda reklam alanı (markalı pin, banner, kupon kampanyaları) satın alıp yönetmesini sağlıyoruz — şu an bunu ajans gibi elle yürütüyoruz, bunu kendi kendine işleyen bir platforma taşıyoruz.

**2) Kimler kullanacak:**
- **Aday/Başvuran** — henüz kayıtlı olmayan, başvuru yapan marka
- **Client Admin** — organizasyonun sahibi; faturalama, POI (mağaza konumu), kullanıcılar, kampanyalar, analitik — hepsini yönetir
- **Client Editor** — sadece kampanya oluşturur/düzenler
- **Client Viewer** — sadece görüntüler, hiçbir şeyi değiştiremez (kampanya, POI, analitik izler)
- **Ajans Kullanıcısı** — bir müşteri adına, o müşterinin verdiği yetki kadar (Admin/Editor/Viewer) kampanya yönetir
- **Moderatör** — başvuruları, POI'leri, kampanyaları inceleyip onaylar/reddeder
- **Account Manager (Kurumsal Müşteri Temsilcisi)** — kurumsal müşterileri yönetir, manuel faturalama yapar, onlar adına kampanya oluşturabilir
- **Internal Admin** — tüm sisteme tam erişim: paket fiyatları, taksonomi, uygun sektör listesi, ayarlar

Hiyerarşi: Evet — Client Admin, Editor'ın yaptığı her şeyi yapar, üstüne kullanıcı/fatura/POI yönetimi de ekler. Account Manager da kurumsal müşteri için benzer şekilde geniş yetkilidir (onboarding, faturalama, kampanya oluşturma). Internal Admin herkesin üstünde, sistem genelinde tam yetkili.

Sadece bakan taraf: **Client Viewer** var — hiçbir şeyi değiştiremez, sadece kampanya/POI/analitik görür. Ayrıca **End User** (Trumore/Togg kullanıcısı) var ama o bizim sistemimizde hesap sahibi değil, sadece haritada pinleri görür.

**3) Neler saklanacak:**
- **Organizasyon başvurusu**: ülke, sektör, yasal unvan, kayıtlı adres, kurumsal e-posta, vergi no, yüklenen belgeler (ülkeye göre değişir), durum (taslak → gönderildi → onaylandı/reddedildi → aktif)
- **Marka profili**: marka adı, logo, görseller
- **POI (mağaza konumu)**: koordinat, kategori, onay durumu
- **Kampanya**: banner/görsel, açıklama metni, link, kupon kodu, başlangıç/bitiş tarihi, durum (Taslak → İncelemede Bekliyor → İncelemede → Onaylandı → Aktif → Geçmiş, ayrıca Duraklatıldı ve Acil Kaldırıldı)
- **Kullanıcı hesapları**: rol (Admin/Editor/Viewer), şirket e-posta domaini
- **Abonelik/Paket**: paket kademesi, fiyat, koltuk (seat) sayısı, ödeme durumu
- **Fatura**: tutar, KDV, o günkü kilitli döviz kuru
- **Ajans yetkilendirmesi**: hangi müşteriye, hangi kapsamda erişim verildiği

**4) "Sadece kendine ait" durumu:**
Evet, kesin bir sınır var:
- Client Admin/Editor/Viewer sadece **kendi organizasyonlarının** verisini görür.
- Ajans Kullanıcısı sadece **kendisine devredilmiş (delegate edilmiş) müşteri organizasyonlarını** görür, sadece verilen yetki kapsamında (Admin/Editor/Viewer).
- Moderatörler sınırlı değil — kuyruktaki **tüm** başvuru/POI/kampanyaları görür, tek bir müşteriye kilitli değiller.
- Internal Admin ve Account Manager sistem genelinde/kurumsal müşteriler genelinde çalışır, tek bir organizasyona kilitli değil.

**5) Zamana bağlı kısıtlar:**
Mesai saati gibi bir kısıt yok, ama zamana bağlı şu kurallar var:
- **5 günlük ödeme toleransı (grace period)**: Ödeme yapılmazsa organizasyon hemen kapatılmaz, 5 gün beklenir, sonra deaktive edilir (hem self-serve hem kurumsal için geçerli).
- **60 günlük veri saklama**: Bir başvuru (organizasyon veya ajans) reddedilirse, başvuran 60 gün içinde düzeltip tekrar gönderebilir; 60 gün içinde gönderilmezse veri otomatik silinir.
- **Günlük döviz kuru çekme**: Sistem her gün otomatik olarak Avrupa Merkez Bankası'ndan EUR/TL kurunu çeker (cron job) ve o günkü kuru faturaya kilitler (geriye dönük değiştirilmez, sadece iç analitik dönüşümü için).
- **Kampanya tarihleri**: Kampanya başlangıç tarihi geldiğinde sistem otomatik Aktif yapar, bitiş tarihi geldiğinde otomatik Geçmiş'e düşürür — kullanıcı müdahalesi gerekmez.

Ek not (sorulmasa da moderasyon kritik bir kural içeriyor): **AI (Can.AI) hiçbir zaman otomatik onay veremez**, sadece net ihlalleri otomatik reddedebilir (kötü dil, sahte belge, malware link, tekrar eden kayıt vb.); her onay — başvuru, POI, kampanya fark etmez — mutlaka bir insan moderatörden geçer. Bu istisnasız bir kural.

### TUR 2 — ANALİST (Faz 0 kapanış (Kim/Ne teyidi) + Faz 1 açılış (Süreçler / büyük resim)):
Teşekkürler, çok net bir tablo çıktı. Önce anladığımı size geri okuyayım, sonra büyük resmi (uçtan uca iş zincirleri) çıkaralım.

═══════════════════════════════
BÖLÜM A — "Kimler & Neler" teyidi
═══════════════════════════════

Anladığım roller:
- Başvuran marka (henüz kayıtlı değil)
- Marka Yöneticisi — faturalama, konum, kullanıcılar, kampanya, analitik: hepsini yönetir
- Marka Editörü — sadece kampanya oluşturur/düzenler
- Marka İzleyici — sadece bakar, hiçbir şeyi değiştiremez
- Ajans Kullanıcısı — bir müşteri adına, o müşterinin verdiği yetki kadar çalışır
- Moderatör — başvuru/konum/kampanya inceleyip onaylar veya reddeder
- Kurumsal Temsilci — kurumsal müşterileri yönetir, elle fatura keser, onlar adına kampanya açabilir
- Sistem Yöneticisi — tüm sistemde tam yetki (fiyatlar, listeler, ayarlar)
- (Harita son kullanıcısı — sizin sisteminizde hesabı yok, sadece pinleri görür; onu kapsam dışı tutuyorum)

Anladığım kayıtlar: Başvuru · Marka profili · Mağaza konumu · Kampanya · Kullanıcı hesabı · Abonelik/Paket · Fatura · Ajans yetkisi.

A1) Bu liste eksiksiz mi, düzeltilecek/eklenecek bir rol veya kayıt var mı?

A2) Rol basamakları şöyle mi çalışıyor: İzleyici sadece görür → Editör onun gördüğü her şeyi görür + kampanya oluşturur/düzenler → Yönetici Editör'ün yaptığı her şeyi yapar + fatura/kullanıcı/konum yönetir? (Yani her üst rol, alt rolün TÜM işini de yapabiliyor mu?)

A3) Ajans Kullanıcısı için "verilen yetki kadar" derken; ajansa bir müşteri için "Yönetici gibi", başka bir müşteri için "sadece İzleyici gibi" ayrı ayrı seviye verilebiliyor mu — yoksa tek bir sabit ajans yetkisi mi var?

═══════════════════════════════
BÖLÜM B — Büyük resim: uçtan uca iş zincirleri
═══════════════════════════════

Sizi dinlerken şu ana "iş yolculuklarını" gördüm. Her biri için sadece "bu ayrı bir zincir mi, sınırı nerede biter?" diye soruyorum — içlerini sonra dolduracağız:

1. Katılım / Başvuru: bir marka başvurur → belge yükler → moderatör onaylar/reddeder → hesap açılır ve aktifleşir.
2. Kampanya: kampanya hazırlanır → moderasyona gider → onaylanır → tarihi gelince yayına girer → süresi bitince geçmişe düşer (arada duraklatma / acil kaldırma da olabilir).
3. Mağaza konumu: konum eklenir → moderatör onaylar → haritada görünür hale gelir.
4. Abonelik & Faturalama: paket seçilir → ödeme yapılır → ödenmezse 5 gün beklenir → sonra hesap kapatılır.
5. Ajans yetkilendirme: müşteri, bir ajansa kendi adına çalışma yetkisi verir (gerekirse geri alır).

B1) Bu 5 zincir doğru ayrımlar mı? Bölünmesi ya da birleştirilmesi gereken var mı, tamamen atladığım bir zincir var mı?

B2) Her zincir "neyle başlayıp neyle biter?" — özellikle şunları netleştirir misiniz:
   - Başvuru zinciri kayıt açılıp aktifleşince mi biter, yoksa ilk kampanya/ödeme de bu zincire dahil mi?
   - Kampanya zinciri "geçmişe düşme" ile mi kapanır, yoksa raporlama/analitik de aynı zincirin sonu mu?

B3) KAPSAM DIŞI: Bu 5 zincirden AÇIKÇA dışarıda tutmak istediğiniz, "bu platformun işi değil" dediğiniz şeyler neler? (örn. reklamların haritada gösterilmesi, ödeme altyapısının kendisi, marka görsellerinin tasarlanması...)

═══════════════════════════════
BÖLÜM C — İki önemli ayrım (bunlar zincir sayısını belirliyor)
═══════════════════════════════

C1) Başvuru ikiye ayrılıyor gibi: "marka/organizasyon başvurusu" ve "ajans başvurusu". Bunlar aynı akışın iki türü mü (aynı adımlar, farklı belge), yoksa tamamen ayrı iki yolculuk mu?

C2) Kurumsal müşteri tarafı: Kurumsal Temsilci elle kayıt açıp elle fatura kesiyor. Bu, self-servis akışının aynısının "elle yürütülen" hali mi (aynı süreç, farklı yapan kişi), yoksa baştan sona ayrı bir süreç olarak mı düşünmeliyim?

C3) Ödeme: Para tahsilatı sizin platformun içinde mi gerçekleşiyor (siz mi ödeme alıyorsunuz), yoksa ödeme dışarıda olup size sadece "ödendi/ödenmedi" bilgisi mi geliyor?

Bu turda sadece büyük resmi ve sınırları netleştiriyoruz; her zincirin adım adım nasıl işlediğini ve "onaylanınca ne olur, kim neyi görebilir" gibi kuralları sonraki turlarda tek tek dolduracağız.

### TUR 2 — PAYDAŞ:
## BÖLÜM A — Kimler & Neler teyidi

**A1) Liste eksiksiz mi?**

Rol listesi doğru, ama bir tane daha var: **Ajans Adayı** (henüz kayıtlı olmayan, ajans olarak başvuran) — marka adayından ayrı, çünkü süreci biraz farklı (C1'de anlatıyorum).

Kayıt listesine eklenmesi gerekenler:
- **Taksonomi / uygun sektör listesi** — Sistem Yöneticisi'nin yönettiği sektör-küme yapısı
- **Paket tanımları** — fiyat, özellikler, POI limiti, tier başına (Local/Metro/Region/Ecosystem/Enterprise)
- **Kurumsal özel özellik seti** — her kurumsal müşteri için Kurumsal Temsilci'nin tanımladığı, standart paketlere sığmayan özel yetenekler
- **Premium Logo** — kurumsal müşteri için Togg araç ekranında kalıcı marka logosu, ayrı bir aktivasyon kaydı

**A2) Rol basamakları — düzeltme gerekiyor:**

Tam bir "üst rol alttakinin HER ŞEYİNİ yapar" hiyerarşisi değil:
- Analitik/raporlama: İzleyici → Editör → Yönetici hepsi görebiliyor, üst üste biniyor.
- **Konum (mağaza/POI) yönetimi SADECE Yönetici'nin (veya kurumsalda Kurumsal Temsilci'nin) işi** — Editör konum ekleyip düzenleyemez. Bu, "Editör her şeyi yapar + üstüne ekler" mantığına aykırı bir istisna.
- Kampanya oluşturma/düzenleme: Yönetici VE Editör ikisi de yapabiliyor (eşit yetki).
- Kullanıcı/fatura yönetimi: sadece Yönetici.

**A3) Ajans yetkisi seviyesi — evet, müşteriye göre değişebiliyor.**

Sabit tek bir ajans yetkisi yok. Her müşteri organizasyonu kendi Yöneticisi aracılığıyla ajansa kendi kapsamında bir rol atıyor (Admin/Editor/Viewer). Aynı ajans kullanıcısı A müşterisinde "Yönetici gibi", B müşterisinde "sadece İzleyici" olabilir. Müşteri bu yetkiyi istediği an anında geri alabiliyor.

## BÖLÜM B — Büyük resim

**B1) 5 zincir doğru mu?**

Kampanya, Mağaza konumu, Abonelik & Faturalama, Ajans yetkilendirme doğru. İki düzeltme:

1. **"Katılım / Başvuru" tek zincir değil, üç varyant**: (a) kendiliğinden marka başvurusu, (b) Kurumsal Temsilci'nin elle açtığı kurumsal başvuru, (c) ajans başvurusu — üçü de aynı onay havuzuna düşüyor ama giriş şekilleri farklı.
2. **Atlanan iki zincir**:
   - **Yayına çıkma / dağıtım**: onaylanmış kampanya ve konumların Trumore/Togg'a gerçekten gönderilmesi — sadece aktif+ödemesi yapılmış organizasyonların onaylı içeriği gösteriliyor, süresi geçen/durdurulan/ödemesi kesilen içerik sessizce kaldırılıyor.
   - **Analitik & Raporlama**: tıklama/gösterim/rota verisinin toplanıp panele/rapora dönüşmesi — dağıtımdan beslenen ayrı bir zincir.
   - Ayrıca Sistem Yöneticisi'nin taksonomi/paket fiyatları/sistem ayarları yönettiği "İç Yönetim" sürekli bir arka plan fonksiyonu, isterseniz ayrı da sayılabilir.

**B2) Zincirlerin başı-sonu:**

- **Başvuru zinciri** tam olarak "kayıt gönderildi, moderasyon kuyruğuna girdi" ile bitiyor — henüz onaylanmadı, ödeme yok. Moderasyon (onay/red) AYRI sonraki adım (bitişi: "Onaylandı, ödemeye hazır"). Ödeme/Aktivasyon da AYRI adım (bitişi: "organizasyon Aktif"). İlk kampanya bunlara dahil değil — ön koşul ama ayrı zincir.
- **Kampanya zinciri**, "Geçmiş'e düşme / duraklatma / acil kaldırma" ile biter. Dağıtım ve analitik bunun devamı değil, ondan beslenen AYRI zincirler.

**B3) Kapsam dışı (MBSE'de açıkça belirtilen):**

- Ödeme altyapısının kendisi: kredi kartı işlemi (3D Secure) dış bir ödeme sağlayıcısında, biz sadece webhook ile "ödendi/ödenmedi" bilgisi alıyoruz.
- Kimlik doğrulama altyapısı: girişler TruID üzerinden, kendi login sistemimiz yok.
- Kurumsal müşteri kaydı/faturalama motoru: SAP'de tutuluyor, biz tetikliyor ve senkronize ediyoruz.
- Döviz kuru verisi: Avrupa Merkez Bankası'ndan çekiliyor, kendi hesaplamamız yok.
- Vergi no doğrulama: Türkiye/AB'nin resmi dış servisleri doğruluyor; bu servisler kullanılamazsa moderatör elle kontrol ediyor.
- Haritanın/uygulamanın kendisi: Trumore ve Togg ayrı ürünler, biz sadece dağıtım API'si ile veri besliyoruz.
- Marka görsellerinin tasarımı: kurumsal müşteri kendi banner'ını yükler (biz sadece boyut kontrolü yaparız); standart pakette metin+logo hazır şablona otomatik yerleştirilir, tasarım işi bizim değil.

## BÖLÜM C

**C1) Marka başvurusu vs Ajans başvurusu:**

Aynı akışın türevi ama tam aynı değil. Ortak: şirket/hukuki bilgi formu, ülkeye-özel belge yükleme, aynı moderasyon süreci (Can.AI ön-kontrol + insan moderatör onayı). Farklı: ajans başvurusunda konum (POI) adımı ve marka profili adımı YOK (ajansın haritada görünürlüğü yok). Fiyatlandırma tamamen farklı: ajans sabit yıllık ücret (₺12.000/yıl, 5 koltuk dahil, ek koltuk ₺1.200/yıl), marka başvurusu paket kademesine göre değişken.

**C2) Kurumsal müşteri — elle yürütülen aynı süreç mi:**

Adım iskeleti aynı (organizasyon bilgisi → belge → marka profili → konum → moderasyona gönder) ama Kurumsal Temsilci müşteri adına her şeyi elle giriyor. Farklar: konum sayısında limit yok, kurumsala özel ek özellik seti tanımlanabiliyor, paket kademesi Ecosystem/Enterprise özel. Kurumsal Temsilci isterse müşteriyi kendiliğinden başvuru formunu doldurmaya da davet edebiliyor — iki yol da açık. Faturalamada da fark var: self-serve kredi kartıyla otomatik öder; kurumsalda Kurumsal Temsilci faturayı dışarıda (SAP üzerinden) kesip sisteme sadece "Ödendi" diye elle işaretliyor.

**C3) Ödeme kimin elinde:**

Tahsilat platformun içinde OLMUYOR, ikisinde de dışarıda: Self-serve'de kredi kartı işlemi dış Ödeme Gateway'inde (3D Secure), bize webhook ile "ödendi/başarısız" dönüyor. Kurumsalda fatura kesme ve tahsilat tamamen dışarıda (SAP + Kurumsal Temsilci'nin süreçleri), sisteme sadece "Ödendi/Ödenmedi" elle işaretleniyor. Bizim işimiz ödeme bilgisini alıp organizasyonu aktive etmek / yayını açmak — tahsilatın kendisi değil.</answers>


### TUR 3 — ANALİST (Faz 2 — Akışlar (tek kişi adım adım) açılışı + ★ sinyal kovalama: red-döngüsü (either/or), duraklat/devam et, yarıda bırakma (abandon), otomatik tetiklenen zincirler (perform), zamanlanmış işler (schedule), durum-geçişi tetikleyicileri (calculate status), handoff (moderatör devri)):
Büyük resmi (süreçler, sınırlar, üç başvuru varyantı, eklenen "yayın/dağıtım" ve "analitik" zincirleri, düzeltilmiş rol yetkileri) kilitledim. Şimdi en önemli yolculukların içine girip "adım adım tam olarak ne oluyor, ya ters giderse?" kısmını dolduralım. Her grup bir yolculuk:

═══════════════════════════════
GRUP A — Kampanya yolculuğu (en merkezî akış)
═══════════════════════════════
A1) Sıralama şöyle mi: Editör/Yönetici kampanyayı hazırlar (Taslak) → "gönder" der → önce otomatik ön-kontrol (Can.AI) → sonra moderatör bakar → onay/red. Doğru mu, arada kaçırdığım adım var mı?

A2) "İncelemede Bekliyor" ile "İncelemede" iki ayrı durum. Aradaki fark, bir moderatörün kuyruktan o kampanyayı "ben aldım / üstüne aldım" diye üstlenmesi mi — yani ayrı bir "işi al" adımı mı var, yoksa moderatör açar açmaz otomatik "İncelemede" mi oluyor?

A3) Moderatör REDDEDERSE ne olur: kampanya taslağa geri mi düşer, kullanıcı düzeltip yeniden mi gönderir? Yeniden göndermenin bir sınırı (kaç kez / süre) var mı? Bir de: Can.AI'nın "otomatik ret"i ile moderatörün "elle ret"i kullanıcı gözünde aynı sonuç mu, farklı mı yaşanıyor?

A4) Onaylandıktan SONRA tarih gelene kadar kullanıcı kampanyaya dokunabiliyor mu? Örneğin yayına girmeden onaylı kampanyayı iptal edebilir / geri çekebilir mi, yoksa onaydan sonra kilitleniyor mu?

A5) "Duraklat" ve "Acil Kaldır": bunları KİM yapabiliyor (kampanya sahibi mi, moderatör mü, ikisi de mi)? Duraklatılan kampanya sonra tekrar "devam ettirilip" yayına dönebiliyor mu, yoksa duraklat = fiilen bitti mi? "Acil Kaldır" kalıcı mı (bir daha yayına giremez mi)?

A6) Kullanıcı kampanyayı hazırlarken yarıda bırakıp sonra kaldığı yerden devam edebiliyor mu (taslak olarak durur), yoksa tek oturumda bitirmesi mi gerekiyor?

═══════════════════════════════
GRUP B — Başvuru & onay yolculuğu
═══════════════════════════════
B1) Adım sırası şöyle mi: form doldur → (ülkeye göre) belge yükle → gönder → otomatik ön-kontrol → moderatör onay/red. Marka başvurusunda ayrıca marka profili + konum adımları var, ajansta bu ikisi yok — doğru mu?

B2) Reddedilen başvuruda 60 gün düzeltme penceresi: başvuran AYNI başvuruyu mu düzeltip yeniden gönderiyor, yoksa sıfırdan yeni başvuru mu açıyor? 60 gün dolunca veriyi bir kişi mi siliyor, yoksa sistem kendiliğinden mi siliyor?

B3) Başvuran formu doldururken yarıda bırakıp sonra devam edebiliyor mu (taslak olarak saklanıyor mu)?

═══════════════════════════════
GRUP C — Arka planda kendiliğinden olan işler (kimse tıklamadan)
═══════════════════════════════
Şu işlerin hepsi "kullanıcı istemeden, sistem kendi kendine" mi oluyor — teyit eder misiniz, birini yanlış anladıysam düzeltin:
C1) "Ödendi" bilgisi gelince: organizasyon otomatik AKTİF olur + onaylı içerik otomatik yayına gönderilir — bu zincir tek başına, kimse elle onaylamadan mı akıyor?
C2) 5 günlük ödeme toleransı dolunca organizasyonu sistem kendiliğinden mi kapatıyor? Kapanınca yayındaki içerik de aynı anda otomatik iniyor mu?
C3) Kampanya başlangıç tarihi gelince otomatik "Aktif", bitiş gelince otomatik "Geçmiş" — bu iki geçiş tamamen sisteme mi bırakılmış?
C4) Günlük döviz kuru çekme ve faturaya kilitleme: bu tamamen arka plan, hiçbir kullanıcı tetiklemiyor — doğru mu?

═══════════════════════════════
GRUP D — Moderatör tarafı & Ajans yetkisi
═══════════════════════════════
D1) Moderatör tek bir ortak kuyruktan mı çalışıyor: başvuru, konum, kampanya — üçü de aynı "kuyruktan işi al → incele → onayla/reddet" kalıbında mı, yoksa her tür farklı mı işliyor? Bir moderatörün aldığı işi başka moderatöre devretmesi söz konusu mu?

D2) Ajans yetkisi: müşteri yöneticisi ajansa yetki verir, istediği an geri alır dediniz. Geri alındığı anda ajansın o müşteride yarım bıraktığı işler (taslak kampanya vb.) ne oluyor — siliniyor mu, duruyor mu? Bir de bu yetki kendi süresi dolunca otomatik mi kalkıyor (ör. "1 yıl sonra biter"), yoksa yalnızca elle mi geri alınıyor?

### TUR 3 — PAYDAŞ:
### TUR 3 — PAYDAŞ:

## GRUP A — Kampanya yolculuğu

**A1) Sıralama doğru mu:**
Evet, tam olarak öyle: Editör/Yönetici kampanyayı hazırlar (Taslak) → "İncelemeye Gönder" der → sistem kampanyayı dondurur → önce Can.AI ön-kontrolü (metin, link güvenliği, kupon kuralları, görsel/şablon uygunluğu) → sonra moderatör kuyruğuna düşer → moderatör bakar → onay/red. Kaçırdığınız bir adım yok.

**A2) "İncelemede Bekliyor" ile "İncelemede" farkı — sizin varsayımınız doğru değil, düzeltmem gerekiyor:**
Bu ikisi arasındaki fark bir moderatörün işi "üstlenmesi" değil. Fark AI aşamasında: **"İncelemede Bekliyor"** = kampanya donduruldu, şu anda Can.AI ön-kontrolden geçiyor. Can.AI'nin net bir ihlal bulmadığı andan itibaren kampanya **"İncelemede"** durumuna geçiyor ve moderatör kuyruğuna düşüyor.

Ama sorduğunuz "işi üstlenme" adımı da gerçekten var — sadece kampanyanın görünen durumuna yansımıyor. Moderasyon tarafında, iş kuyruğa düştükten sonra bir moderatör onu açıkça "ben aldım" diyerek üstleniyor (kuyrukta bekleyen ↔ aktif olarak inceleniyor ayrımı iç moderasyon mekanizmasında var). Ama müşteri ekranında bu ayrım görünmüyor — kuyrukta bekleyen de, o an bir moderatörün elinde olan da müşteriye aynı şekilde "İncelemede" olarak gösteriliyor.

**A3) Moderatör reddederse ne olur — düzeltme: bu 60 günlük kuralla karıştırılmamalı, o kural başvurulara ait:**
Kampanyada moderatör (ya da Can.AI) reddederse kampanya **doğrudan Taslak'a geri döner ve kilidi açılır** — kullanıcı düzenleyip istediği zaman yeniden gönderebilir. **Yeniden göndermenin ne sayı ne de süre sınırı var** — kampanyalar için 60 günlük bir pencere tanımlı değil (o kural sadece organizasyon/ajans başvurularına ait, kampanyaya uygulanmıyor).

Can.AI'nin otomatik reddi ile moderatörün elle reddi kullanıcı gözünde **aynı sonuç**: her ikisinde de yazılı bir red gerekçesi veriliyor, kampanya Taslak'a dönüyor ve kullanıcı panel + e-posta ile bilgilendiriliyor. Kullanıcı tarafında hangisinin AI hangisinin insan kararı olduğuna dair bir fark yansıtılmıyor.

**A4) Onaylandıktan sonra tarih gelene kadar dokunulabiliyor mu:**
Hayır. Onaylanan bir kampanya (henüz yayına girmemiş olsa bile) kullanıcı tarafından iptal edilemez veya geri çekilemez — bu durumda kilitli. Kaldırma yolu sadece "Acil Kaldır" ve bunu da kullanıcı değil, moderatör/admin tetikleyebiliyor.

**A5) Duraklat / Acil Kaldır — kim yapıyor, geri dönüş var mı:**
- **Duraklat**: Client Admin veya Kurumsal Temsilci yapabiliyor (moderatör değil). Duraklatılan kampanya, tarih aralığı içindeyse tekrar "Devam Ettir" ile Aktif'e dönebiliyor — duraklatma bitmiş anlamına gelmiyor. Duraklatılmışken bitiş tarihi geçerse doğrudan Geçmiş'e düşüyor.
- **Acil Kaldır**: Sadece Moderatör veya Sistem Yöneticisi yapabiliyor. Bu **kalıcı** — MBSE'de "Acil Kaldırıldı" durumundan başka bir yere geçiş tanımlı değil, yani bir daha yayına dönmüyor.

**A6) Kampanya hazırlarken yarıda bırakma:**
Evet, Taslak kalıcı bir durum — kullanıcı istediği zaman bırakıp devam edebilir. Kampanya taslakları için bir süre sınırı veya otomatik silinme kuralı tanımlanmamış (60 günlük silme kuralı yalnızca reddedilmiş BAŞVURULAR için geçerli, kampanya taslağına uygulanmıyor).

## GRUP B — Başvuru & onay yolculuğu

**B1) Adım sırası ve marka/ajans farkı doğru mu:**
Evet doğru: form doldur → (ülkeye göre) belge yükle → gönder → Can.AI ön-kontrol → moderatör onay/red. Marka başvurusunda ayrıca marka profili ve konum (POI) adımları var; ajans başvurusunda ikisi de yok — çünkü ajansın haritada bir varlığı olmuyor.

**B2) 60 günlük düzeltme penceresi:**
Başvuran **AYNI başvuruyu** düzeltip yeniden gönderiyor, sıfırdan yeni bir başvuru açmıyor. 60 gün dolduğunda veri **sistem tarafından kendiliğinden siliniyor** — bunun için bir insanın elle silme yapması gerekmiyor, otomatik bir zamanlayıcı işi.

**B3) Formu yarıda bırakma:**
Evet, başvuru Taslak durumunda kalıyor, kullanıcı devam edebilir. Bu aşamada (henüz gönderilmemiş taslak) herhangi bir süre sınırı yok — 60 günlük silme kuralı sadece REDDEDİLMİŞ başvurular için geçerli, henüz gönderilmemiş taslak için tanımlı değil.

## GRUP C — Arka planda kendiliğinden olan işler

Hepsi doğru anlaşılmış, teyit ediyorum:

**C1)** Evet — ödeme onayı gelince organizasyon otomatik Aktif olur ve bu olay otomatik olarak dağıtım sistemini tetikler (onaylı içerik yayına girer). Kimse elle ayrıca onaylamıyor, tek zincir halinde akıyor.

**C2)** Evet — 5 günlük tolerans dolunca sistem organizasyonu kendiliğinden kapatıyor (deaktive), bu olay da otomatik olarak dağıtım tarafını tetikleyip içeriği kaldırıyor. İkisi de olay-tetiklemeli otomatik zincir, insan müdahalesi yok.

**C3)** Evet — kampanya başlangıç/bitiş tarihleri tamamen sistem zamanlayıcısına bırakılmış: başlangıçta otomatik Aktif, bitişte otomatik Geçmiş.

**C4)** Evet — günlük döviz kuru çekme ve faturaya kilitleme tamamen zamanlanmış otomatik bir iş (cron), hiçbir kullanıcı tetiklemiyor.

## GRUP D — Moderatör tarafı & Ajans yetkisi

**D1) Ortak kuyruk mu, devir var mı:**
Evet — başvuru, konum, kampanya (ve marka profili güncellemesi) hepsi **aynı tek moderasyon motorundan** ve aynı kalıptan geçiyor: Can.AI işler → net ihlal yoksa kuyruğa düşer → bir moderatör işi üstlenir → karar verir. Dört tür de bu aynı mekanizmayı paylaşıyor, ayrı ayrı işlemiyorlar.

Bir moderatörün aldığı işi başka bir moderatöre devretmesi — böyle bir mekanizma **tasarlanmadı**, MBSE'de böyle bir kural yok.

**D2) Ajans yetkisi geri alındığında yarım işler + otomatik süre dolumu:**
Geri alma **anında etkili** oluyor — bu net. Ama geri alındığı anda ajansın o müşteride yarım bıraktığı işlerin (örn. taslak kampanya) ne olacağına dair bir kural **tanımlanmadı** — onu tasarlamadık, MBSE'de böyle bir kural yok.

Otomatik süre dolumu konusunda da: yetki sadece **elle geri alınıyor**, "1 yıl sonra otomatik biter" gibi bir zaman sınırı tanımlı değil. (Not: ajansın kendi yıllık aboneliği süresi dolup ajans organizasyonu pasifleşirse o ayrı bir konu — ama bu, müşteriye verdiği spesifik delegasyon yetkisinin kendi süresi değil, öyle bir otomatik süre kuralı yok.)

### TUR 4 — ANALİST (Faz 2/3 — dağıtım+analitik zincirlerinin içi, üreticisiz kayıtlar, ön-koşul kuralları):
Kampanya, başvuru ve moderatör tarafını netleştirdim. Şimdi Tur 2'de sizin eklediğiniz ama içini henüz açmadığımız iki zincire (yayın/dağıtım ve analitik) girip, bir de "sistemde duruyor ama nasıl oluştuğunu hiç konuşmadığımız" birkaç kaydı ve "şu şart sağlanmazsa olmaz" kurallarını dolduralım.

═══════════════════════════════
GRUP E — Yayına çıkma / dağıtım (Trumore & Togg'a gönderme)
═══════════════════════════════
E1) Bir kampanya (veya konum) tam olarak hangi AN dışarıya (Trumore/Togg) gönderiliyor? Şu üç şartın hepsi mi aranıyor: kampanya "Aktif" + organizasyon "Aktif" + ödeme yapılmış? Bunlardan biri eksikse (örn. ödeme kesildi ama kampanya tarihi hâlâ sürüyor) içerik gösterilmiyor, doğru mu?

E2) İçerik geri çekilirken: Bir kampanya bitiş tarihine geldiğinde / duraklatıldığında / organizasyon ödeme yüzünden kapandığında — dışarıdaki gösterim ne kadar sürede iniyor? Anında mı, yoksa "en fazla şu kadar gecikmeyle" gibi bir tolerans var mı?

E3) Dışarıya gönderilen şey tam olarak ne? (Sadece onaylı görsel + metin + link + kupon + konum koordinatı mı — yoksa fiyat/paket bilgisi gibi başka şeyler de gidiyor mu?) Togg araç ekranına giden ile Trumore uygulamasına giden içerik farklı mı?

E4) Bir kez gönderilmiş içerik daha sonra düzeltilirse (örn. moderatör bir kampanyayı acil kaldırdı) — bu değişiklik dışarıya "güncelleme" olarak mı gidiyor, yoksa her seferinde komple liste mi yenileniyor? (Teknik değil; iş açısından "tek tek mi haber veriliyor, toptan mı" diye soruyorum.)

═══════════════════════════════
GRUP F — Analitik & raporlama
═══════════════════════════════
F1) Hangi ölçümler toplanıyor ve panele/rapora dönüşüyor? (Tıklama, gösterim, harita üzerinde rota/yol tarifi sayısı, kupon kullanımı... — listeyi siz tamamlayın, ben eksik saymayayım.)

F2) Kim neyi görüyor? Marka İzleyici/Editör/Yönetici üçü de aynı analitiği mi görüyor, yoksa bazı sayılar (örn. maliyet/harcama) sadece Yönetici'ye mi? Ajans kullanıcısı, yönettiği müşterinin analitiğini görebiliyor mu? Moderatör/Sistem Yöneticisi tüm markaların toplamını gören ayrı bir görünüme sahip mi?

F3) Bu bir "canlı ekranda bak" mı, yoksa "rapor oluştur/indir" gibi bir çıktı da var mı? Liste görünürken bir sıralama tercihi var mı (örn. en çok tıklanan kampanya üstte, ya da en yeni tarih üstte)? "Son 30 gün" gibi hazır dönem filtreleri var mı?

F4) Bir kullanıcı yalnızca KENDİ organizasyonunun rakamlarını mı görüyor (başka markanın verisini asla göremiyor) — bunu teyit edeyim.

═══════════════════════════════
GRUP G — "Sistemde duruyor ama nasıl oluştuğunu hiç konuşmadık" kayıtlar
═══════════════════════════════
G1) FATURA kaydı ne zaman ve neyden doğuyor? Ödeme onayı gelince mi bir fatura kaydı oluşuyor, yoksa abonelik başlarken mi? İçindeki tutar/KDV/kilitli kur hangi bilgiden hesaplanıyor (paket fiyatı + o günkü kur)?

G2) PREMIUM LOGO (Togg ekranında kalıcı marka logosu): Bu ayrı bir kayıt demiştiniz. Kim başlatıyor (kurumsal müşteri mi, Kurumsal Temsilci mi)? Yayına girmeden önce o da moderatörden geçiyor mu, yoksa kurumsal olduğu için doğrudan mı açılıyor? Süreli mi (abonelik boyunca), yoksa kalıcı mı?

G3) KURUMSAL ÖZEL ÖZELLİK SETİ: Kurumsal Temsilci'nin tanımladığı, standart pakete sığmayan yetenekler. Bunu tam olarak kim oluşturup kime bağlıyor? Bir onaydan geçiyor mu, yoksa Temsilci tanımlayınca hemen geçerli mi oluyor?

G4) SİSTEM YÖNETİCİSİ'nin sürekli yönettiği şeyler (paket tanımları/fiyatları, uygun sektör listesi/taksonomi, sistem ayarları): Bunları oluşturup güncelleyen tek taraf Sistem Yöneticisi mi? Bir paketin fiyatı değişince, o pakete zaten abone olmuş mevcut müşterilerin faturası etkileniyor mu, yoksa yalnız yeni abonelikler mi yeni fiyattan geçiyor?

═══════════════════════════════
GRUP H — "Şu şart sağlanmazsa yapılamaz" kuralları (ön-koşullar)
═══════════════════════════════
H1) KONUM (POI) LİMİTİ: Paket kademesine göre konum sayısı sınırlı (kurumsalda limitsiz demiştiniz). Standart bir müşteri limitini doldurmuşken yeni konum eklemeye çalışırsa ne oluyor — engelleniyor mu, yoksa "üst pakete geç" mi deniyor?

H2) KOLTUK (kullanıcı) LİMİTİ: Ajansta 5 koltuk dahil, fazlası ₺1.200/yıl dediniz. Marka tarafında da benzer bir koltuk limiti var mı? Limit dolmuşken yeni kullanıcı eklenmek istenirse — engelleniyor mu, yoksa otomatik "ek koltuk ücreti" mi doğuyor?

H3) EN KRİTİK: Bir organizasyon ödeme sorunundan dolayı 5 günlük tolerans süresindeyken VEYA kapatılmışken (deaktive), o organizasyonun kullanıcıları hâlâ yeni kampanya oluşturup incelemeye gönderebiliyor mu — yoksa bu durumda kampanya oluşturma/gönderme kapanıyor mu? (Yani "aktif olmayan organizasyon kampanya işlemi yapamaz" gibi bir kural var mı?)

H4) Kampanyanın kupon kodu, tarih aralığı gibi alanlarında "olmazsa gönderilemez" kuralları var mı? (Örn. bitiş tarihi başlangıçtan önce olamaz; kupon kodu benzersiz olmalı; banner belirli bir boyutu aşamaz — bunları siz sıralayın, ben uydurmayayım.)

Not: Bildirimlerin (kime, ne zaman e-posta/panel uyarısı gider), listelerdeki sıralama tercihlerinin ve konum düzenleme/silme gibi ince detayların üstünden bir sonraki turda geçeceğiz — bu turda önce iki büyük zinciri ve temel kuralları oturtalım.

### TUR 4 — PAYDAŞ:
### TUR 4 — PAYDAŞ:

### GRUP E — Yayına çıkma / dağıtım

**E1) Üç şart hep birlikte mi aranıyor:**
Evet, tam olarak üçü de aranıyor: kampanya "Aktif" durumda + organizasyon "Aktif" (bu zaten ödemesi yapılmış anlamına geliyor, ayrı bir "ödeme" şartı yok çünkü ödeme organizasyonu Aktif yapan şey) + ilgili konum "Onaylı" durumda. Üçünden biri eksikse o içerik dışarı gösterilmiyor — sistem sadece bu üç şartı birden karşılayanı filtreleyip dışarı veriyor.

**E2) Geri çekme ne kadar sürede oluyor:**
Olay tetiklemeli çalışıyor: kampanya bittiğinde / duraklatıldığında / acil kaldırıldığında / organizasyon kapandığında sistem hemen bir "kaldır" sinyali üretiyor ve dağıtım tarafı bunu işleyip günceller. Ama "en geç şu kadar dakika/saat içinde iner" diye somut bir gecikme taahhüdü yazılı değil — sadece "sessizce kaldırılır" deniyor, kesin bir süre sınırı tanımlanmadı.

**E3) Dışarı giden içerik aynı mı:**
Hayır, ikisi aynı değil:
- **Trumore (mobil)**'e giden: kampanyalar, konumlar, banner görselleri.
- **Togg (araç)**'a giden: kampanyalar, konumlar, ve varsa kalıcı marka logoları (premium logo) — Togg tarafında ayrı bir "banner listesi" alanı tanımlı değil, muhtemelen kampanya verisinin içine gömülü gidiyor.
Hiçbir surface'e fiyat/paket bilgisi gitmiyor — sadece görsel + metin + link + kupon + konum koordinatı (+ araç tarafında premium logo).

**E4) Tek tek mi, toptan mı:**
Tek tek/olay bazlı: her kampanya/konum/organizasyon durum değişikliği ("aktifleşti", "bitti", "kaldırıldı" vb.) ayrı bir güncelleme sinyali olarak dışarı gidiyor; sistem önbellekli bir "güncel içerik" servisi tutuyor. Toptan komple liste yenilemesi değil.

### GRUP F — Analitik & raporlama

**F1) Hangi ölçümler:**
Kesin yazılı olanlar: gösterim (impression), tıklama (click), harita üzerinde rota/yön tarifi alma. Ayrıca "bunlarla sınırlı değil, mobil ve araç için ayrı ayrı ek ölçüm setleri tanımlanabilir" diye belirtiliyor ama tam liste dokümanlarda verilmemiş. Kupon kullanımının ayrı bir ölçüm olarak sayılıp sayılmadığı açıkça yazılı değil — onu netleştirmedik.

**F2) Kim neyi görüyor:**
Marka Yönetici, Editör ve İzleyici üçü de AYNI organizasyon-seviyesi analitik ekranına erişiyor — "maliyet/harcama sadece Yönetici'ye" gibi bir ayrım MBSE'de yok. Ajans Kullanıcısı, müşterinin kendisine verdiği yetki kapsamı analitiği içeriyorsa (yetki tanımlanırken "kampanyalar, analitik vb." diye kapsam belirleniyor) o müşterinin analitiğini görebiliyor. Sistem Yöneticisi VE Kurumsal Temsilci, tüm sistemi kapsayan ayrı bir görünüme sahip: gelir, moderasyon hacmi, kampanya hacmi gibi sistem-geneli rakamlar. Moderatör için ayrı bir sistem-geneli analitik ekranı tanımlanmadı — onu tasarlamadık.

**F3) Canlı mı, rapor mu:**
İkisi de var: canlı ekranda bakılabilen bir panel VAR, ayrıca "rapor export/indirme" özelliği de var. Ama sıralama tercihi (en çok tıklanan üstte vb.) veya "son 30 gün" gibi hazır dönem filtreleri MBSE'de detaylandırılmadı — o seviyeye inmedik.

**F4) Sadece kendi organizasyonu mu:**
Evet, teyit ederim — bir kullanıcı yalnızca kendi organizasyonunun rakamlarını görüyor, başka markanın verisine erişimi yok.

### GRUP G — Nasıl oluştuğu konuşulmamış kayıtlar

**G1) Fatura ne zaman doğuyor:**
Fatura, ödeme onaylandığı anda oluşuyor — self-serve'de kredi kartı ödemesi başarılı olduğunda, kurumsalda Kurumsal Temsilci "Ödendi" işaretlediğinde. Ayrıca ödemeden ÖNCE de indirebilen bir "proforma fatura" (ön/taslak fatura) var — paket fiyatı + konum bazlı ücretlendirme + KDV (%20) toplamından hesaplanıyor, bu bilgilendirme amaçlı. Kesin fatura tutarı paket fiyatı + KDV'den geliyor; kura kilitleme ise ayrı bir amaç için: o günkü (günlük otomatik çekilen) Avrupa Merkez Bankası kuru faturaya kilitleniyor — bu, satış fiyatını etkilemiyor (fiyatlar zaten TL bazlı), sadece bizim iç gelir takibimizi EUR'a çevirmek için, geriye dönük değiştirilmeden sabitleniyor.

**G2) Premium Logo:**
Kurumsal Temsilci başlatıyor, Trumore'un bize sağladığı özel bir API üzerinden doğrudan. Bir moderasyon adımından GEÇMİYOR — moderatör onayı gerekmiyor, Kurumsal Temsilci'nin aç/kapa şeklinde çalıştırdığı bir yetki. Süreli mi kalıcı mı sorusuna gelince: MBSE'de bunun için ayrı bir süre veya "abonelik bitince otomatik kapanır" kuralı yazılı değil — sadece etkinleştir/devre dışı bırak iki durumu var, Kurumsal Temsilci istediği an kapatabiliyor.

**G3) Kurumsal özel özellik seti:**
Kurumsal Temsilci internal panelden tanımlayıp ilgili kurumsal müşteri organizasyonuna bağlıyor. Ayrı bir onay sürecinden geçtiğine dair bir kural yok — Temsilci tanımladığı an geçerli oluyor gibi görünüyor; bu konuda ayrı bir moderasyon/onay adımı MBSE'de tarif edilmemiş.

**G4) Sistem Yöneticisi'nin yönettikleri:**
Evet, paket tanımları/fiyatları, uygun sektör listesi/taksonomi ve sistem ayarlarını yöneten TEK taraf Sistem Yöneticisi — başka hiçbir rol bunlara dokunamıyor. Ama bir paketin fiyatı değiştiğinde zaten abone olmuş mevcut müşterileri nasıl etkilediği (yeni fiyat sadece yeni aboneliklere mi uygulanıyor, mevcut müşteriyi de mi etkiliyor) MBSE'de hiç ele alınmamış — onu tasarlamadık, net bir kural yok.

### GRUP H — Ön-koşul kuralları

**H1) Konum limiti dolunca:**
Sistem yeni konum eklemeyi ENGELLİYOR ve bir "paket karşılaştırma / yükselt" ekranı gösteriyor — kullanıcı ya üst pakete geçiyor ya da fazlalık konumları siliyor. Otomatik ek ücretlendirme yok. (Kurumsal'da zaten limit yok.)

**H2) Koltuk limiti — marka tarafında da var:**
Evet: standart paketlerde 2 koltuk (1'i mutlaka Yönetici olmak zorunda), Kurumsal'da sınırsız. Limit dolduğunda yeni kullanıcı davet etmek ENGELLENİYOR ve sistem ek koltuk satın alma talebi gösteriyor — otomatik ücretlendirme değil, kullanıcı önce ek koltuk ödemesini onaylıyor, ödeme onaylanınca engel kalkıyor.

**H3) En kritik soru — grace period sırasında kampanya işlemi:**
Burada size dürüst olmam gerekiyor: dokümanlarımda bu net, ayrı bir kural olarak yazılı değil. Ama elimde iki kesin gerçek var ve bunlardan mantıksal bir sonuç çıkarıyorum:
- Kampanya oluşturma/gönderme her zaman "organizasyon Aktif olmalı" ön koşuluna bağlı.
- Ödeme aksadığı anda organizasyonun durumu hemen "Aktif"ten "Duraklatıldı"ya düşüyor — 5 günlük tolerans süresi bu "Duraklatıldı" durumu içinde geçiyor; organizasyon ancak tolerans süresi de dolup tamamen kapandığında yayından iniyor (yayın kesintisi grace period'un BAŞINDA değil SONUNDA oluyor).
Bu iki gerçekten çıkardığım sonuç: 5 günlük tolerans süresi boyunca organizasyon teknik olarak "Aktif" değil, dolayısıyla yeni kampanya oluşturma/gönderme de muhtemelen bu süre boyunca kapalı olmalı. Ama bunu "kesinlikle böyle tasarlandı" diye size sunamam — bu benim çıkarımım, ayrı yazılı bir kural değil. Karar vermemiz gerekiyorsa bunu netleştirmeliyiz.

**H4) Kampanya alan kuralları:**
Yazılı olan somut kurallar:
- "İncelemeye Gönder"e basmadan önce tüm zorunlu alanlar dolu olmalı (yoksa buton kapalı, eksik liste gösteriliyor).
- Link/URL güvenlik ve itibar kontrolünden geçmeli.
- Kupon kuralları AI tarafından doğrulanıyor (ama "kod sistemde tekil olmalı" gibi somut bir alt-kural yazılı değil).
- Görsel/banner, standart pakette önceden tanımlı şablonun kısıtlarına, kurumsalda ise belirtilen özel boyut gereksinimlerine uymalı.
- Marka logosu en az 500x500px olmalı (SVG/PNG).
"Bitiş tarihi başlangıçtan önce olamaz" veya "kupon kodu tekil olmalı" gibi kurallar bende yazılı değil — onları tasarlamadık, uydurmuyorum.</answers>


### TUR 5 — ANALİST (Faz 2/3 — açık kalan zincirler: bildirimler, durum yaşam döngüleri + ödeme-toparlama, konum (POI) yolculuğu, iki açık kararın netleştirilmesi):
Kampanya, başvuru, dağıtım, analitik ve kuralların çoğunu oturttuk. Bu turda birkaç açık ucu ve benim kendi çıkarımımdan doğan bir çelişkiyi netleştirelim — sonraki (son) turda da eksik kalan üretici-tüketici bağlarını süpürüp kapatacağız.

═══════════════════════════════
GRUP I — Bildirimler (kime, ne zaman, hangi kanaldan)
═══════════════════════════════
Şimdiye dek net olan tek bildirim: kampanya reddedilince kullanıcıya panel + e-posta gidiyor. Sistemin "haber verdiği" tüm anları bir arada netleştirelim — ben eksik uydurmayayım, siz onaylayın/tamamlayın:

I1) Şu olaylarda kime bir bildirim (e-posta/panel) gidiyor mu, gidiyorsa kime?
   - Başvuru onaylandı / reddedildi
   - Kampanya onaylandı (red zaten var — onayda da haber var mı?)
   - Ödeme alındı → organizasyon aktifleşti
   - Konum (POI) onaylandı / reddedildi
   - Bir kullanıcı bir organizasyona/ajansa davet edildi

I2) EN ÖNEMLİSİ — süreye bağlı uyarılar: Ödeme aksadığında, 5 günlük süre dolup organizasyon kapanmadan ÖNCE müşteriye "ödemen gecikti, X gün içinde ödemezsen kapanacak" gibi bir uyarı gidiyor mu? Benzer şekilde reddedilen başvuruda 60 gün dolup veri silinmeden önce "düzeltmezsen silinecek" hatırlatması var mı?

I3) Bu bildirimler sistemin kendiliğinden gönderdiği şeyler mi (kimse elle tetiklemiyor) — teyit edeyim.

═══════════════════════════════
GRUP J — Organizasyonun durumları + ödeme toparlanınca ne oluyor
═══════════════════════════════
Burada size dürüst olacağım: geçen tur H3'te ben bir çıkarım yaptım ve o çıkarım elimdeki başka bir gerçekle çelişiyor. Onu sizin kararınızla çözmem lazım.

J1) Çelişki şu: Bir yandan "içerik dışarıda gösterilsin diye organizasyon 'Aktif' olmalı" dediniz. Öte yandan ben "ödeme aksayınca organizasyon hemen Aktif'ten çıkar ama içerik ancak 5 gün sonunda iner" diye tahmin ettim. Bu ikisi bir arada olamaz. Hangisi doğru:
   - (a) 5 günlük süre boyunca organizasyon HÂLÂ canlı sayılıyor: içerik yayında kalıyor, kullanıcılar çalışmaya devam ediyor, kapanma yalnızca 5. günün sonunda oluyor; VEYA
   - (b) Ödeme aksadığı an organizasyon donuyor: içerik hemen iniyor ve kampanya işlemleri hemen kapanıyor, 5. gün ise kalıcı silme/kapatma günü.

J2) Bununla bağlantılı: Organizasyonun geçebileceği tüm durumları kendi kelimelerinizle sıralar mısınız? (Örneğin: ödeme bekliyor / aktif / ödeme gecikmiş / kapatılmış / reddedilmiş gibi — hangileri gerçekten var?) Bunu netleştirince yayın kuralını doğru bağlayabilirim.

J3) TOPARLANMA (bunu hiç konuşmadık): Ödeme geciktiği süre içinde müşteri sonunda öderse ne oluyor — organizasyon otomatik tekrar "Aktif"e mi dönüyor ve inen/inmemiş içerik yeniden yayına mı giriyor? Bu geri dönüş kendiliğinden mi işliyor, yoksa birinin elle onaylaması mı gerekiyor?

J4) H3'ün asıl sorusu hâlâ açık ve J1'in cevabına bağlı: Ödeme gecikmiş durumdayken kullanıcılar YENİ kampanya oluşturup incelemeye gönderebiliyor mu, yoksa bu dönemde kampanya işlemleri kapalı mı?

═══════════════════════════════
GRUP K — Konum (mağaza / POI) yolculuğu
═══════════════════════════════
Konumu bir zincir olarak saymıştık ama içini hiç açmadık. Kısaca dolduralım:

K1) Konumu kim ekliyor — yalnız Yönetici (ve kurumsalda Kurumsal Temsilci) mi? Eklendikten sonra kampanya gibi moderasyondan mı geçiyor (Can.AI + moderatör), yoksa farklı mı işliyor?

K2) Onaylanmış bir konum sonradan DÜZENLENİRSE (adres/kategori/koordinat değişti) ne oluyor — değişiklik tekrar moderasyona mı düşüyor, yoksa onaylı kalıp doğrudan güncelleniyor mu?

K3) Bir konum SİLİNİRSE, o konumu kullanan yayındaki kampanyalara ne oluyor? (Kampanya da mı iniyor, engelleniyor mu, yoksa serbestçe silinebiliyor mu?) Konumun kendi durumları neler (örn. eklendi → incelemede → onaylı → reddedildi)?

═══════════════════════════════
GRUP L — İki açık kararı netleştirelim (geçen tur "tanımlanmadı" dediklerimiz)
═══════════════════════════════
L1) Ajans yetkisi geri alındığı anda, ajansın o müşteride yarıda bıraktığı taslak kampanyalara ne olsun? Üç seçenek: (a) oldukları gibi dursun (müşterinin kendi ekibi devam etsin), (b) silinsin, (c) dondurulup kimse dokunamasın. Hangisi işinize uygun? (Geçen tur "tasarlamadık" demiştiniz — şimdi bir yön belirleyelim ki modelde boşluk kalmasın.)

L2) Kurumsal özel özellik seti ve Premium Logo, moderasyondan geçmeden Kurumsal Temsilci tanımlayınca hemen geçerli oluyor demiştiniz. Teyit: bu ikisi gerçekten HİÇBİR onay/inceleme adımı içermiyor, değil mi? Bir de: Premium Logo, organizasyon kapandığında/ödeme kesildiğinde araç ekranından otomatik iniyor mu, yoksa yalnız Kurumsal Temsilci elle kapatana kadar mı kalıyor?

═══════════════════════════════
GRUP M — Küçük bir boşluk (ödeme/fatura tarafı)
═══════════════════════════════
M1) "Proforma (ön) fatura"yı kim, ne zaman görüyor/indiriyor — müşteri paket seçtiği an mı otomatik oluşuyor, yoksa bir talep üzerine mi? Bu, ödeme sonrası oluşan kesin faturadan tamamen ayrı bir kayıt mı?

M2) Ajans tarafı: Ajansın kendi yıllık aboneliği de (₺12.000/yıl) ödeme onayı gelince mi aktifleşiyor, marka tarafındaki gibi 5 gün ödeme toleransı ve kapanma kuralı ajansa da aynen uygulanıyor mu?

Not: Analitik verisinin (tıklama/gösterim/rota) sisteme nasıl GİRDİĞİ (dışarıdan mı besleniyor, kim üretiyor) ve birkaç üretici-tüketici bağını son turda kapatacağız — bu turda önce yukarıdaki açık uçları ve durum çelişkisini oturtalım.

### TUR 5 — PAYDAŞ:
### GRUP I — Bildirimler

**I1) Olay bazında bildirim tablosu:**
- **Başvuru onaylandı / reddedildi**: Evet, ikisi de var — panel + e-posta ile başvurana gidiyor. Bu net yazılı.
- **Kampanya onaylandı**: Evet, red gibi onayda da bildirim var — panel + e-posta, kampanya sahibine (Client Admin/Editor) gidiyor.
- **Ödeme alındı → organizasyon aktifleşti**: Burada dürüst olmalıyım — dokümanlarımda buna özel ayrı bir "bildirim" olayı yazılı değil. Akış sadece "ödeme onaylanır → organizasyon aktifleşir → POI'ler yayına girer → kampanya oluşturma açılır" diyor; panelde durum değişikliği görünür ama ayrı bir e-posta/bildirim olayı tanımlanmamış.
- **Konum (POI) onaylandı / reddedildi**: Reddedilirse "gerekçe müşteriye iletiliyor" deniyor ama bu, başvuru ve kampanyadaki gibi resmî bir "panel + e-posta" kanalıyla ayrıca belgelenmemiş — sadece "client'a gönderilir" ifadesi var, kanalı netleşmemiş. Onaylanmasında ayrı bir bildirim olayı da yazılı değil.
- **Kullanıcı davet edildi**: Client Admin kullanıcıyı e-posta ile davet ediyor, sistem daveti "gönderiyor" — davetin kendisi zaten e-posta yoluyla iletiliyor (ayrı bir "bildirim" katmanı değil, davetin kendisi e-posta).

**I2) Süreye bağlı uyarılar:**
- Ödeme tarafında **"aboneliğin süresi dolmak üzere" hatırlatması VAR** — yenileme öncesi "renewal reminder" gönderiliyor. Ama bu, 5 günlük tolerans SÜRESİ İÇİNDEYKEN ("X gün kaldı, ödemezsen kapanacak") gönderilen ayrı bir uyarı değil — sadece yenileme tarihi yaklaşırken önceden gönderilen bir hatırlatma. Tolerans süresi başladıktan sonra ek bir gün-sayaçlı uyarı dokümanlarımda yok.
- **60 günlük silme öncesi hatırlatma**: Böyle bir kural da yazılı değil — dokümanlarda sadece "60 gün içinde düzeltip yeniden göndermezse veri silinir" deniyor, "silinmeden önce hatırlatma gider" diye bir adım tanımlanmamış.

**I3) Kendiliğinden mi gönderiliyor:**
Evet, teyit ederim — yazılı olan bildirimlerin (başvuru/kampanya onay-red, yenileme hatırlatması) hepsi sistemin kendiliğinden tetiklediği olaylar, kimse elle "bildirim gönder" demiyor.

### GRUP J — Organizasyon durumları ve toparlanma

**J1) Çelişkinin çözümü — (a) doğru:**
Net kaynağım şunu gösteriyor: Ödeme aksadığında organizasyon önce "Duraklatıldı/Grace Period" durumuna düşüyor (bu geçişte içeriği yayından indiren bir olay tetiklenmiyor). Yayından indirme olayı ("Organizasyon Deaktive Edildi" → dağıtım tarafına "içeriği kaldır" sinyali) SADECE 5 günlük süre tamamen dolup organizasyon "Süresi Doldu/Expired" durumuna geçtiğinde tetikleniyor. Yani **(a) doğru**: 5 gün boyunca içerik yayında kalıyor, kapanma ve yayından inme yalnızca 5. günün SONUNDA, birlikte oluyor.

**J2) Organizasyonun tüm durumları:**
Taslak → Gönderildi → İncelemede → Onaylandı (ödeme bekliyor) → Aktif → Duraklatıldı (Paused) → Süresi Doldu/Deaktif (Expired) — ayrıca red kolu: Reddedildi → (60 gün içinde) Veri Silindi. Şunu da eklemem lazım, siz sormadınız ama dokümanımda var: "Duraklatıldı" durumu sadece ödeme gecikmesi (grace period) için değil, **gönüllü duraklatma** için de kullanılıyor — yani bir organizasyon istemli olarak da bu duruma girebiliyor gibi görünüyor, ama bunun kim tarafından/nasıl tetiklendiği ayrıca detaylandırılmamış.

**J3) Toparlanma:**
Evet — 5 gün içinde ödeme yapılırsa organizasyon otomatik olarak Aktif'e geri dönüyor, kimsenin elle onaylaması gerekmiyor (ödeme onayı tek başına yeterli tetikleyici). İçerik zaten hiç inmemişti (J1'e göre), o yüzden "yeniden yayına girme" diye ayrı bir adım da yok — hâlihazırda yayındaydı, kesintisiz devam ediyor.

**J4) Grace period sırasında kampanya işlemi — netleşti, artık çıkarım değil:**
Kampanya oluşturma/gönderme kurallarımda açık bir ön koşul var: "Organizasyon **Aktif** olmalı." Duraklatıldı (grace period) durumu, Aktif durumundan AYRI bir durum. Yani her ne kadar içerik 5 gün boyunca yayında kalsa da (J1), **yeni kampanya oluşturma/gönderme bu süre boyunca kapalı** — çünkü ön koşul kesin olarak "Aktif" istiyor, "Duraklatıldı" bunu karşılamıyor. Bu artık benim çıkarımım değil, yazılı ön koşuldan geliyor.

### GRUP K — Konum (POI) yolculuğu

**K1) Kim ekliyor, moderasyon:**
Client Admin veya Account Manager (kurumsal için) ekliyor — Editör ekleyemiyor, bu net. Ekleme sonrası aynı moderasyon motorundan geçiyor: önce Can.AI ön-kontrol (koordinat sınır kontrolü, 500 metre yarıçapında tekrar/duplicate kontrolü, taksonomiden kategori, format kontrolü) → net sorun yoksa moderatör kuyruğu → onay/red. Kampanyayla aynı kalıp.

**K2) Onaylı konum düzenlenirse:**
Evet, tekrar moderasyona düşüyor — bu net yazılı: "Onaylanmış bir POI değiştirilirse, otomatik olarak yeniden moderasyona (AI ön-kontrol + moderatör) girer." Doğrudan güncellenmiyor, onaylı kalmıyor.

**K3) Konum silinirse / durumlar:**
Konumun durumları şunlar: Taslak → Gönderildi (AI ön-kontrolde) → İncelemede (moderatör kuyruğunda) → Onaylı (canlı, kampanyalarda kullanılabilir) → Reddedildi. **"Silindi" diye ayrı bir durum tanımlanmamış** — silme/düzenleme aynı işlem başlığı altında (tek bir "Düzenle/Kaldır" işlemi var) ama silinen bir POI'yi kullanan yayındaki kampanyalara ne olacağı (kampanya da mı düşer, engellenir mi, yoksa POI serbestçe mi silinir) dokümanlarımda hiç ele alınmamış — bunu tasarlamadık, uydurmuyorum.

### GRUP L — İki açık kararı netleştirme

**L1) Ajans yetkisi geri alındığında yarım işler — bu bir MBSE gerçeği değil, şimdi karar veriyorum:**
Geçen tur da söylediğim gibi bu dokümanlarımda tanımlı değildi. Şimdi sormanız üzerine bir yön belirtmem gerekiyorsa: **(a) oldukları gibi dursun** — ajansın yarım bıraktığı taslak kampanyalar silinmesin, müşterinin kendi ekibi (Client Admin/Editor) isterse devam etsin. Gerekçem: taslak zaten kilitli bir kaynak değil, veri kaybı riskini almanın bir anlamı yok. Ama bunu net olarak vurgulamak isterim — bu artık benim şu an verdiğim bir iş kararı, MBSE'den gelen bir gerçek değil.

**L2) Kurumsal özellik seti ve Premium Logo — onay adımı var mı, otomatik iniyor mu:**
Onay/inceleme adımı sorusunda teyit ederim — ikisi de moderasyondan geçmiyor, bu net. Ama Premium Logo'nun otomatik inme kısmında bir düzeltme yapmam gerekiyor: dokümanlarımda "organizasyon deaktive olunca **POI'ler ve kampanyalar** sessizce kaldırılır" diye açık bir kural var, ama bu kural Premium Logo'yu KAPSAMIYOR — Premium Logo'nun inmesi ayrı ve bağımsız bir "deaktive et" eylemiyle tetikleniyor (Kurumsal Temsilci/Account Manager elle kapatıyor). Yani organizasyon ödemesi kesilip kapandığında Premium Logo'nun OTOMATİK olarak inmesini sağlayan bir kural yazılı değil — sadece POI ve kampanyalar için bu otomatiklik var. Bu bir boşluk, MBSE'de tasarlanmamış.

### GRUP M — Ödeme/fatura tarafı

**M1) Proforma fatura:**
Client Admin, başvuru onaylanıp "ödeme bekliyor" ekranına (abonelik kartı: paket, fiyat, konum ücretlendirmesi, KDV, toplam) geldiği anda bu ekrandan **isteğe bağlı olarak indirebiliyor** — otomatik olarak e-postayla gönderilmiyor, bir "indir" butonu var. Bu, ödeme sonrası oluşan kesin faturadan tamamen ayrı bir kayıt/belge — sadece bilgilendirme amaçlı, ödeme öncesi.

**M2) Ajans aboneliği aynı kurallara mı tabi:**
Evet — ajans onboarding akışı da tam olarak aynı abonelik/faturalama mekanizmasını kullanıyor: başvuru onaylanınca ₺12.000/yıl için ödeme talebi gidiyor, kredi kartı ödemesi onaylanınca organizasyon (ajans tipi) aktifleşiyor. Dokümanlarımda ajans için AYRI bir grace period/kapanma kuralı tanımlanmamış — abonelik ve faturalama tarafı organizasyon tipinden bağımsız TEK bir ortak mekanizma olduğu için, aynı 5 günlük tolerans kuralının ajansa da uygulandığını varsayıyorum. Ama şunu da eklemeliyim: bunu doğrulayan ajansa özel, ayrı yazılmış bir cümle yok — ortak mekanizmadan çıkardığım mantıklı bir sonuç, ayrı yazılı bir kural değil.
</answers>


### TUR 6 — ANALİST (Faz 3.5 — Ön-gereksinim kapanışı (üretici-tüketici) + kalan ★ sinyal süpürmesi ve açık tasarım kararları):
Son turdayız — birkaç açık ucu kapatınca modeli kurmaya hazır olacağız. Çoğu "evet/hayır" ya da "şu yön" diyebileceğiniz kısa kararlar. Uydurmuyorum; boşlukları sizinle netleştiriyorum.

═══════════════════════════════
GRUP N — Analitik rakamları sisteme NEREDEN giriyor?
═══════════════════════════════
Panelde gösterim/tıklama/rota sayılarını gösteriyoruz ama bu sayıların sisteme nasıl GİRDİĞİNİ hiç konuşmadık. Bir şeyi "gösteriyorsak" onu bir yerden "almamız" gerekir.
N1) Bu ham sayıları (bir kampanya kaç kez görüldü/tıklandı, bir konuma kaç kez rota alındı) KİM üretip bize gönderiyor? Trumore ve Togg tarafları mı dışarıdan bize besliyor (yani bizim işimiz sadece gelen sayıyı toplayıp panele/rapora dökmek), yoksa bu ölçümü bizim sistemimiz mi kendi içinde üretiyor?
N2) Bu veri bize ne sıklıkta geliyor — anlık mı (olay oldukça), yoksa toplu/günlük bir aktarım mı? (Bunu netleştirmezsem "panelde sayı var ama onu doğuran hiçbir şey yok" gibi eksik bir tablo kalır.)

═══════════════════════════════
GRUP O — Kampanya hangi konumda görünüyor + konum silinince ne olur
═══════════════════════════════
Daha önce "bir kampanyanın dışarı çıkması için ilgili konum onaylı olmalı" dediniz — demek ki kampanya belirli konumlara bağlı.
O1) Bir kampanya hazırlanırken, o kampanyanın haritada HANGİ konum(lar)da görüneceği nasıl belirleniyor? Kullanıcı organizasyonun onaylı konumlarından tek tek seçiyor mu, yoksa kampanya otomatik olarak organizasyonun TÜM onaylı konumlarında mı görünüyor?
O2) (K3'te açık kalmıştı, şimdi karar verelim) Bir konum silinmek istendiğinde, o konumu KULLANAN yayındaki bir kampanya varsa ne olsun? Üç yön: (a) silme engellensin ("önce bu konumu kullanan kampanyaları kaldırın" densin), (b) konum silinsin ama o kampanya da yayından insin, (c) serbestçe silinsin, kampanya kendi başının çaresine baksın. Hangisi işinize uygun?

═══════════════════════════════
GRUP P — Organizasyonu "gönüllü" duraklatma
═══════════════════════════════
Geçen tur şunu eklediniz: "Duraklatıldı" durumu sadece ödeme gecikmesi için değil, gönüllü duraklatma için de kullanılıyor — ama kimin/nasıl tetiklediği belirsiz kalmıştı.
P1) Bir organizasyonu ödeme sorunu olmadan, isteyerek "duraklatmak" mümkün mü? Mümkünse bunu KİM yapıyor (Marka Yöneticisi mi, Kurumsal Temsilci mi, Sistem Yöneticisi mi)?
P2) Gönüllü duraklatıldığında yayındaki içerik iniyor mu (ödeme-gecikmesi duraklatmasında inmiyordu — burada da aynı mı, farklı mı)? Ve tekrar "Aktif"e dönüş nasıl oluyor — aynı kişi elle mi geri açıyor?

═══════════════════════════════
GRUP Q — Üç açık tasarım kararı (geçen turlarda "boşluk" dediklerimiz)
═══════════════════════════════
Bunlar dokümanlarınızda yazılı değildi; modelde boşluk kalmasın diye bir yön belirleyelim (siz "şöyle olsun" derseniz onu yazarım, "kapsam dışı bırakalım" derseniz onu belgelerim):
Q1) PREMIUM LOGO otomatik inme: Organizasyon ödeme yüzünden kapandığında konumlar/kampanyalar otomatik iniyordu ama Premium Logo kapsanmıyordu. Karar: organizasyon kapanınca Premium Logo da otomatik insin mi, yoksa sadece Kurumsal Temsilci elle kapatana kadar araç ekranında kalsın mı?
Q2) PAKET FİYATI DEĞİŞİNCE: Sistem Yöneticisi bir paketin fiyatını değiştirdiğinde, o pakete ZATEN abone olmuş mevcut müşteriler etkilensin mi? İki yön: (a) yeni fiyat yalnız yeni aboneliklere/yenilemelere uygulansın, mevcut müşteri dönem sonuna kadar eski fiyatta kalsın; (b) değişiklik herkese hemen yansısın. Hangisi?
Q3) KUPON & TARİH kuralları: "Kupon kodu sistemde tekil olmalı" ve "bitiş tarihi başlangıçtan önce olamaz" gibi kurallar bende yazılı değildi. Bunları birer kesin kural olarak koyalım mı (kupon kodu benzersiz + bitiş ≥ başlangıç), yoksa bunlar gerçekten kapsam dışı mı?

═══════════════════════════════
GRUP R — İki küçük teyit
═══════════════════════════════
R1) KUPON KULLANIMI bir ölçüm mü? Gösterim/tıklama/rota'yı sayıyoruz demiştiniz; bir kuponun kaç kez kullanıldığı da analitikte gösterilen bir sayı mı, yoksa o bizim ölçmediğimiz (kupon indirimi dış tarafta gerçekleştiği için görmediğimiz) bir şey mi?
R2) SÜREYE BAĞLI UYARILAR: "5 gün içinde ödemezsen kapanacak" ve "60 gün içinde düzeltmezsen verin silinecek" hatırlatmalarının OLMADIĞINI teyit etmiştiniz. Bunu bilinçli bir tercih olarak (kapsam dışı) sabitliyorum — yoksa bu iki hatırlatmanın eklenmesini ister misiniz? (Karar sizin; "eklenmesin" derseniz bunu gerekçesiyle not olarak modele işlerim.)

### TUR 6 — PAYDAŞ:
### GRUP N — Analitik rakamları nereden geliyor

**N1) Kim üretiyor:**
Biz üretmiyoruz — dışarıdan geliyor. Sistem, Trumore mobil uygulaması ve Togg araç ekranına gömülü **Countly SDK**'dan (üçüncü taraf analitik toplama aracı) ham olay verisini alıyor (impression, click, routing — "bunlarla sınırlı değil" deniyor, mobil ve araç için ayrı öznitelik setleri biz tanımlıyoruz ama veriyi ÜRETEN Countly + uygulamaların kendisi). Bizim işimiz, Countly'den gelen bu olayları kampanya/POI/zaman dilimi bazında toplayıp (aggregate) panele ve rapora dökmek — ölçümü biz üretmiyoruz, dışarıdan besleniyoruz.

**N2) Sıklık — dürüst olmalıyım, bu netleşmemiş:**
Dokümanlarımda "sistem Countly SDK'dan olay verisini alır (ingest eder)" deniyor ama bunun anlık mı yoksa toplu/günlük mü olduğuna dair somut bir cümle yok. Döviz kuru gibi (günde bir kez, cron) net bir sıklık burada yazılı değil. Bunu "tasarlanmadı" olarak işaretlemenizi öneririm — uydurup bir sayı vermeyeceğim.

### GRUP O — Kampanya-konum ilişkisi

**O1) Konum seçimi paket tipine göre FARKLI işliyor — bunu ayırmam lazım:**
- **Self-serve (standart paket) kampanyalarında** kullanıcı hiçbir konum seçmiyor: kampanya otomatik olarak organizasyonun TÜM onaylı konumlarında görünüyor ("self-serve = global only" — sabit, seçenek yok).
- **Enterprise/Custom (kurumsal) kampanyalarında** ise kullanıcı gerçekten seçim yapıyor: "tüm konumlar", "birden fazla seçilmiş konum" veya "tek tek belirli konumlar" arasından birini seçebiliyor.
Yani standart müşteri için otomatik-global, kurumsal müşteri için seçmeli — ikisi de gerçek, MBSE'de yazılı.

**O2) Konum silinince kullanan kampanyaya ne olur — bu genuinely tasarlanmamış, şimdi karar veriyorum:**
Dokümanlarımda konumun "Silindi" diye ayrı bir durumu bile yok (tek bir "Düzenle/Kaldır" işlemi var), silinen konumu kullanan yayındaki kampanyaya etkisi hiç ele alınmamış. Şimdi bir yön belirtiyorum — bu benim iş kararım, MBSE gerçeği değil: **(a) silme engellensin.** Sistem zaten aynı mantığı POI limit aşımında kullanıyor (önce düzelt, sonra devam et) — tutarlılık için: bir konum, en az bir Aktif/canlı kampanya tarafından kullanılıyorsa silinemesin, "bu konumu kullanan kampanyaları önce kaldırın/değiştirin" mesajı gösterilsin. Sebebim: sessizce bir kampanyanın yarısını (veya tamamını, kurumsal tek-konum senaryosunda) kaybetmesine izin vermek istemiyorum.

### GRUP P — Organizasyonun "gönüllü" duraklatılması

**P1) Dürüst olmam gerekiyor — bu bir modelleme kalıntısı, gerçek bir akış değil:**
Durum tablosunda "Paused" durumunun açıklaması "Grace period or voluntary pause" diye iki ihtimali anıyor, ama geçiş tablosuna baktığımda bu duruma girmenin TEK bir tetikleyicisi var: "Payment Failed" (ödeme başarısız). Organizasyonu ödeme sorunu olmadan, isteyerek duraklatan ayrı bir olay/yetki/aktör hiçbir yerde tanımlı değil. Yani şu an sistemde böyle bir buton/yetki YOK — açıklama metninde geçen "voluntary pause" ifadesi, akışa hiç bağlanmamış.

Şimdi karar veriyorum (MBSE gerçeği değil, benim iş kararım): **Bunu kapsam dışı bırakalım.** Zaten kampanya bazında istemli duraklatma var (Client Admin/Kurumsal Temsilci tek tek kampanyaları duraklatabiliyor); organizasyonun TAMAMINI gönüllü olarak duraklatmaya ihtiyaç görmüyorum — bir müşteri her şeyi durdurmak isterse zaten aboneliğini iptal eder. State diyagramındaki o ifadeyi doküman kalıntısı olarak işaretleyin, gerçek bir gereksinim değil.

**P2) Yukarıdaki karara bağlı olarak bu soru düşüyor** — gönüllü duraklatma olmayacağı için "içerik iner mi, kim geri açar" sorusu geçersiz kalıyor.

### GRUP Q — Üç açık tasarım kararı

**Q1) Premium Logo otomatik inme:**
Karar: **evet, otomatik insin.** Organizasyon ödeme yüzünden kapandığında (Expired/Deactivated), Premium Logo da diğer içerikle (POI, kampanya) birlikte otomatik olarak araç ekranından kalksın. Gerekçem: parası kesilmiş bir müşterinin logosunun ekranda kalıcı görünmeye devam etmesinin hiçbir mantığı yok — bu bugüne kadar gözden kaçmış bir tutarsızlık, şimdi kapatıyoruz. (Not: bu benim şimdi verdiğim karar; MBSE'de "Premium Logo Deactivated" diye ayrı, sadece elle tetiklenen bir olay var — organizasyon deaktivasyonuna bağlı otomatik bir tetikleyici EKLENMESİ gerekiyor.)

**Q2) Paket fiyatı değişince mevcut müşteriler:**
Karar: **(a) yeni fiyat yalnız yeni aboneliklere/yenilemelere uygulansın.** Mevcut müşteri, o anki dönemi (yıllık/aylık) bitene kadar eski fiyatta kalsın, yenilemede yeni fiyata geçsin. Gerekçem: fiyat değişikliğinin mevcut sözleşmeyi ortasından kesip değiştirmesi hem müşteri güveni hem de fatura tutarlılığı açısından sorunlu olur.

**Q3) Kupon & tarih kuralları:**
Karar: **ikisini de kesin kural olarak koyalım.**
- Kupon kodu organizasyon içinde (veya sistem genelinde — bunu siz teknik olarak neyin pratik olduğuna göre belirleyin, iş tarafında önemli olan aynı organizasyonun iki kampanyasının aynı kodu kullanmaması) tekil olmalı.
- Bitiş tarihi, başlangıç tarihinden önce olamaz (bitiş ≥ başlangıç).
Bunlar MBSE'de yazılı değildi ama gerçek dünyada bunlar olmadan sistem saçma sonuçlar üretir — bu iki kuralı şimdi ekliyoruz, kapsam dışı bırakmıyoruz.

### GRUP R — İki küçük teyit

**R1) Kupon kullanımı bir ölçüm mü:**
Hayır, biz ölçmüyoruz. Countly bize sadece uygulama/ekran içi olayları (impression, click, routing) veriyor. Kuponun fiilen kullanılması (mağazada ibraz edilmesi / kasada okutulması) bizim sistemimizin ve Countly'nin görüş alanının tamamen dışında, dış tarafta (mağazada) gerçekleşiyor. Dokümanlarımda kupon kullanım oranı diye bir metrik hiç geçmiyor — bunu tasarlamadık, ölçmüyoruz.

**R2) Süreye bağlı uyarılar — evet, bilinçli olarak kapsam dışı bırakıyorum:**
Onaylıyorum: "5 gün içinde ödemezsen kapanacak" ve "60 gün içinde düzeltmezsen silinecek" hatırlatmaları EKLENMEYECEK. Gerekçem: Zaten "ödeme süresi doldu" ve "başvuru reddedildi" anında bildirim gidiyor (kullanıcı zamanlayıcının başladığını biliyor); ek bir ara-hatırlatma sistemi şimdilik gereksiz karmaşıklık katar. İsterseniz bunu ileride bir "nice-to-have" olarak not düşebiliriz ama v1 kapsamına almıyorum.