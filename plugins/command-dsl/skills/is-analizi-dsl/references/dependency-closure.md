# Ön-Gereksinim Kapanışı (Bağımlılık Denetimi)

Bu adım modelin **nedensel olarak tam** olduğunu güvence altına alır: bir
operasyonun *tükettiği* (listelediği, okuduğu, güncellediği, üzerine iş yaptığı)
her şeyin, modelde onu **üreten** bir karşılığı olmalı. Aksi halde model,
fiilen çalışamayacak bir sistemi anlatır — "ürün listele" var ama ürünü hiçbir
şey *oluşturmuyor* → ölü sorgu.

Bu, `consistency-and-emit.md §A`'dan **farklı** bir kontroldür. Orası
**referans bütünlüğü**ne bakar (flow → var olan operation ID, foundation
bildirilmiş mi). Burası **üretici-tüketici bütünlüğü**ne bakar (tüketilen kaydı
*biri üretiyor mu*). CommandDSL'in kendi doğrulayıcısı `lists Product`'ı
üreticisi olmasa da kabul eder; bu yüzden bu kontrol **validator'a değil, skill
adımına** aittir.

## Ne zaman

Faz 3 bittikten **sonra** (tüm operation gövdeleri var; üretici/tüketici ancak o
zaman görülebilir), Tutarlılık self-check'inden (`§A`) **önce**. Bu adımda
eklenen her yeni operation, sonra §A'nın tüm kurallarından geçmek zorundadır
(özellikle benzersiz 4'lü imza, foundation bildirimi, tip kuralları).

> ⚠ **İki eksen vardır.** D1-D3 **üretim** eksenidir ("tüketilenin üreticisi var mı?").
> **D4 yıkım eksenidir** ("yok edilenin bağımlıları ne oluyor?") — kullanıcı tercihi
> DEĞİL, modelde bir `deletes`/terminal işlem varsa **zorunlu** koşar. Uzun süre yalnız
> üretim ekseni vardı; bunun bedeli **öksüz-kayıt** (gizlilik + depolama + keyfî
> geliştirici kararı) olarak ölçüldü.

## Kapsam kullanıcı tercihidir (D1 / D2 / D3 — D4 hariç)

Hangi "clause"ların ön-gereksinim sayılacağı **her kullanımda kullanıcıya
sorulur** — bazen yalnızca varlık var-oluşu yeter, bazen durum/ilişki de
istenir. Jargon gösterme; düz dille sun. Örnek:

> "Modeli tamamlamadan önce bir bütünlük kontrolü yapabilirim: *kullanılan/
> listelenen her şeyin önce bir yerde oluşturulduğundan* emin olmak. İstersen
> daha derine de bakarım — bir işlemin '*şu durumdayken*' koşulu için o duruma
> nasıl gelindiği; ya da '*kendi ekibinin*' gibi bağların nerede kurulduğu.
> Hangilerine bakayım: (1) sadece var-oluş, (2) + durum, (3) + ilişki?"

Varsayılan öneri **D1**'dir (en az gürültü, örnekteki "ürün listele → ürün
tanımlı" ihtiyacını birebir karşılar). Kullanıcı D2/D3'ü ekleyebilir. Her
seviye bir öncekini kapsar.

| Boyut | Ön-gereksinim | Tipik gürültü |
|---|---|---|
| **D1 — Varlık var-oluşu** | Tüketilen her entity'nin bir üreticisi var | Düşük |
| **D2 — Durum ulaşılabilirliği** | `where`/`only when` durum geçidinin üreticisi var | Orta |
| **D3 — İlişki popülasyonu** | `<relation>'s` ownership ilişkisi doldurulabiliyor | Yüksek (çoğu seed/kurulum) |
| **D4 — Yıkım kapanışı** (ZORUNLU) | Silinen/terminal-duruma giden kaydın bağımlılarının akıbeti authored | Düşük (yalnız `deletes`/terminal varsa) |

---

## D1 — Varlık var-oluşu

**Üretici (producer) kümesini topla.** Bir operation E'yi üretir, eğer:
- üst-seviye `creates <ownership> E` ise, **veya**
- gövdesinde `on success do: create E [from F]` taşıyorsa.

> ⚠ **Yanlış-pozitif tuzağı:** `on success do: create …` üreticileri sayman
> ŞART. Örn. `shop.cdsl`'de Refund kısmen `ShipOrder`'ın
> `on success do: create Refund from Order`'ı ile üretilir; bunu kaçırırsan
> Refund'u "üreticisiz" diye yanlış işaretlersin.

**Tüketici (consumer) kümesini topla.** Bir operation E'yi tüketir, eğer:
- Kaynağı (Resource) E ve fiil `creates` **değil** (reads/lists/updates/
  deletes/approves/ships/submits… hepsi), **veya**
- `on <ow> E` / `from <ow> E` hedefi E ise.

**Bul:** tüketilen ama üreticisi olmayan her entity → bulgu.

**Muafiyet — gömülü/değer entity'leri:** Yalnızca başka bir entity'nin alan
tipi olarak (`items: list of OrderItem`) geçen, hiçbir operation'ın Kaynağı /
on / from hedefi olmayan entity'ler bu kontrole girmez — onlar sahibiyle
birlikte üretilir. (Tüketici kümesine zaten girmedikleri için doğal olarak
elenir; yine de açıkça belgele.)

**Çalışılmış örnek (`shop.cdsl`):** `Store`, `BrowsePublic` (lists),
`ReindexStores` (updates), `DelegateEdit` (grants update) tarafından tüketilir
ama **hiçbir operation Store oluşturmaz** → bulgu. Doğru tepki "körü körüne
CreateStore ekle" değildir; aşağıdaki sınıflandırmadır (Store büyük olasılıkla
admin/seed verisidir).

## D2 — Durum ulaşılabilirliği

**Gereken durumlar:** her `where … status = 'X'` ve `only when … status = 'X'`
geçidindeki `'X'`. (İsteğe bağlı genişletme: `calculate … if status = 'X'`
koşulları — bunlar bloke etmez, ölü dal üretir; daha yumuşak bulgu.)

**Üretilen durumlar:** her `calculate E.status = 'X'` ataması, **artı oluşturma-
anı başlangıç durumu** — `creates E` operation'ının `on success`'inde durum
atanıyorsa o; atanmıyorsa kaydın oluşturulmuş olması zaten örtük bir başlangıç
durumudur.

> ⚠ **Yanlış-pozitif tuzağı:** Oluşturma-anı başlangıç durumunu hesaba kat;
> yoksa her `where status = 'draft'` "ulaşılamaz" görünür.

**Bul:** gereken ama hiçbir yerde üretilmeyen her durum → bulgu. (`shop.cdsl`'de
`where`/`only when` durumları — placed/approved/submitted/open — hepsi
ulaşılabilir; yalnızca `IssueRefund`'daki `calculate … if Order.status =
'returned'` durumu hiç üretilmez → genişletme açıksa bulgu.)

## D3 — İlişki popülasyonu

`<relation>'s` ownership kullanan her operation için (ör. `managedTeam's`), o
ilişkiyi **dolduran/atayan** bir mekanizma modelde var mı? Çoğu zaman yoktur ve
**bilinçli seed/kurulum** verisidir (yöneticinin ekibi İK tarafından dışarıda
atanır). Bu yüzden D3 en gürültülü boyuttur — varsayılan olarak kapalıdır,
yalnızca kullanıcı isterse koş.

## D4 — Yıkım kapanışı (ZORUNLU — D1-D3'ün aynası)

> Adlandırma uyarısı: buradaki `D1-D4` **kapanış boyutlarıdır**; validator kural-kodu
> `D4` (clause-düzeyi `calculate`, `dsl-reference.md` §3) ile ilgisi yoktur.

D1-D3 "tüketilenin üreticisi var mı?" diye sorar. D4 tersini sorar: **"yok edilenin
bağımlıları ne oluyor?"** Cevapsız kalırsa model **öksüz kayıt** üretir — gizlilik
(silinmiş analizin sohbet mesajları duruyor), depolama, ve en kötüsü: geliştirici
keyfî karar verir, QA test edecek bir davranış bulamaz.

**Terminal işlem kümesini topla.** Bir operation terminaldir, eğer:
- fiili `deletes` ise, **veya**
- `on success do`'da kaydı **terminal duruma** taşıyan bir durum-geçişi varsa
  (`calculate E.status = 'iptal' | 'arşiv' | 'kapandı'` — o durumdan çıkaran başka
  bir `calculate` YOKSA terminaldir; D2'nin durum grafiğinden okunur).

**Bağımlı (dependent) kümesini MEKANİK topla** — LLM sezgisi değil, kapalı ölçüt.
Terminal işlemin kaynağı E ise, E'ye bağlı entity kümesi = **ayrı yaşam döngüsü olan**
şu entity'ler:
- **`on` hedefi E olan her operation'ın KAYNAĞI** (Resource) — o kayıt E'nin ÜZERİNE
  kurulur. Ör. `creates own Comment on any Photo` → bağımlı **Comment**'tir (E = Photo);
  bağımlı, `on`'un hedefi değil operation'ın kaynağıdır. **Ve**
- **`from` girdisi E olan her operation'ın KAYNAĞI** — o kayıt E'den türer
  (`creates any PurchaseOrder from any PurchaseRequest` → E = PurchaseRequest için
  bağımlı **PurchaseOrder**).

**Muafiyet:** `list of E` alanı olarak gömülü entity'ler D4'e girmez — sahibiyle
birlikte doğar ve **birlikte gider** (D1 muafiyetinin aynası). Öksüz riski
gömülülerde değil, **ayrı yaşam döngüsü olan referans-verenlerdedir.**

> ⚠ `relation` bu tespitte KULLANILMAZ: `relation <ad> of <Aktör> with <Entity>`
> aktör↔kayıt eksenidir; kayıt↔kayıt kapsamasını taşımaz (`dsl-reference.md` §1).

**Her bağımlı için üç authored karar** (kullanıcıya düz dille sor — jargon yok:
*"Analiz silinince ona bağlı sohbet mesajları da gitsin mi, kalsın mı, yoksa silme
hiç mümkün olmasın mı?"*):

| Karar | Yapısal ev | Not |
|---|---|---|
| **Birlikte silinir (kaskad)** | terminal op'un `on success do`'suna `perform <BağımlıSilmeOp>` + o silme operation'ını modele ekle (ör. `SohbetleriSil: System deletes all SohbetMesaji on any Analiz` — doğrulandı, 0 error) | ⚠ **`on success do` içinde `delete` EYLEMİ YOKTUR** (§3 kapalı liste: `calculate`/`send`/`create`/`perform`); `delete` yazmak parse hatasıdır. ⚠⚠ **`perform` KAPSAM TAŞIMAZ** — argüman almaz, "silinen ŞU kaydın bağımlıları" bağı business'ta ifade EDİLEMEZ. Business kaskad **niyetini** taşır (hangi bağımlı, hangi karar); kapsam predikatı **tech'te realize edilir** — ADR-0042'deki `rule` bölünmesinin aynısı. Niyeti `note` ile açıkça yaz: `note """Analiz silinince YALNIZ o analizin sohbet mesajları silinir (kapsam tech'te)."""` |
| **Öksüz kalır (bilinçli)** | terminal op'a `note """…"""` | Bilinçli ise bilinçli yazılır; sessiz bırakılamaz. |
| **Silme engellenir** | terminal op'a guard: `where` / `only if` / `requires <Ad>` ("bağlı kayıt varken silinemez" → çapraz-varlık var-mı sınıfı → `rule` + `requires`, §10) | Predikatı tech realize eder. |

**Kapanış:** (1) ile eklenen her `<BağımlıSilmeOp>` yeni bir terminal işlemdir →
**kendi D4'ünü doğurur** (mesajın da bağımlısı olabilir). Sabit-noktaya kadar yürüt,
döngü korumasıyla (her entity bir kez).

---

## Her bulguyu sınıflandır (körü körüne EKLEME)

Bir bulgu üç şekilde çözülür; hangisi olduğunu **kullanıcıya düz dille sor**:

1. **İç boşluk → operation ekle.** Üretici gerçekten modelin parçası olmalı.
   İyi-biçimli bir öneri kur: `Create<E>: <Aktör> creates <ownership> <E>` (+
   gerekiyorsa oluşturma-anı durumu `on success do: calculate <E>.status =
   '<başlangıç>'`). Aktör belirsizse sor ("Ürünleri kim ekliyor?").
2. **Dış kaynak / seed / kurulum → kapsam dışı olarak belgele.** Kayıt sistemin
   dışında doğuyor (ERP'den içe aktarılan ürün, SSO'dan gelen kullanıcı, admin'in
   kurduğu mağaza). Operation EKLEME; bunu doküman §7'deki "bilinçli istisnalar"a
   yaz (`consistency-and-emit.md §D`).
3. **Gömülü / türev → işlem yok.** D1 muafiyeti; sadece doğrula ve geç.

## Kapanış (sabit-nokta)

(1) ile eklenen her yeni operation, Faz 3 çeviri prosedüründen (aktör/ownership/
kaynak) geçer **ve yeniden taranır** — kendi Kaynağı / on / from hedefleri /
durumları yeni ön-gereksinimler doğurabilir (ör. CreateProduct, `from Category`
taşıyorsa Category'nin de üreticisi gerekir). Yeni bulgu çıkmayana kadar tekrarla.

> **Döngü koruması:** İşlenmiş entity/durumları izle. Karşılıklı üretim
> (A, B'den üretilir; B'nin başlangıcı bağımsız) bir hata değildir — sonsuz
> döngüye girme; her düğümü bir kez işle.

## Tek toplu öneri (iteratif sorma)

Tüm seçili boyutlardaki bulguları **tek listede** topla; kapanış genişledikçe
kullanıcıyı tekrar tekrar sıkıştırma. Bir kez, gruplanmış olarak sun ve tek
soruyla onay al:

> "Bütünlük kontrolü şunları buldu:
> **Eklenecek (üretici yok, sistem içi):** CreateProduct (Admin ürün ekler) ·
> CreateCategory (Admin kategori ekler).
> **Dışarıda kabul edip not düşeceğim (seed/kurulum):** Store (admin kurar) ·
> managedTeam bağı (İK atar).
> Böyle ekleyip belgeleyeyim mi, yoksa biri değişsin mi?"

Onay gelince operation'ları ekle (kapanış tamamlanmış haliyle), istisnaları
doküman taslağına not düş, sonra Tutarlılık self-check'ine (`§A`) geç.

## Anti-pattern'ler

- **Körü körüne CreateX ekleme.** Açıkça dış/seed olan entity için üretici
  uydurmak modeli yanlış zenginleştirir — sınıflandır, sorma yerine belgele.
- **Gömülü entity'leri üreticisiz sanma** (`list of` alanları → muaf).
- **on-success üreticilerini atlama** (yanlış-pozitif kaynağı #1).
- **Oluşturma-anı başlangıç durumunu atlama** (yanlış-pozitif kaynağı #2).
- **Çakışan 4'lü imzalı üretici kurma.** Eklenen CreateX, §A'nın benzersiz
  4'lü imza kuralını ihlal etmemeli; etmesi gerekiyorsa gerçekten ayrı bir iş
  mi diye netleştir.
- **İteratif sorgulama.** Kapanışı tamamla, sonra tek toplu öneri sun.
- **Yalnız üretim eksenini koşma.** D1-D3 temiz çıkması modeli "kapalı" yapmaz;
  `deletes`/terminal işlem varsa D4 zorunludur (öksüz-kayıt kör noktası).
- **`on success do: delete …` yazma.** Böyle bir eylem YOK (§3); kaskad `perform`'la kurulur.
- **Gömülü (`list of`) entity için kaskad kararı sorma** — sahibiyle birlikte gider (muaf).
