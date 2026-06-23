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

## Kapsam kullanıcı tercihidir (D1 / D2 / D3)

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
