# Sorgulama playbook'u — eksen → düz-dil soruları + anti-pattern guard'ları

> Muhatap: ürün sahibi / UX kararı veren (mimar veya developer OLMAYABİLİR).
> Kural: DSL-jargonu sorma; somut senaryo cümlesi sor, teknik karşılığı SEN kur.
> Her eksen bir doğrulayıcı kuralını discharge eder (SKILL.md faz tablosu).

## Faz 1 — Uygulama dilimleri

- "Bu sistemi kimler kullanacak — müşteri mi, ofis çalışanı mı, saha ekibi mi?
  Bunlar **aynı uygulamayı mı** açacak, ayrı uygulamalar mı?" → experience sınırları.
- "Hangisi internet yokken de iş görebilmeli?" → `delivery`. (Cevap "sahada çekmiyor"
  ise offline-first; "hep ofiste, masaüstünde" ise remote-only.)
- "Giriş ekranı / ortak parçalar her uygulamada aynı mı?" → `shared`.

**⚠ Guard — Experience şişmesi:** "hepsi tek uygulamada olsun" cevabında zorla:
"Müşterinin göreceği ekranla yöneticinin onay kuyruğu aynı uygulamada mı gerçekten?
Yanlışlıkla birbirinin ekranını görmesi mümkün olmasın diye ayırıyoruz."
**⚠ Guard — Platform sızması:** kullanıcı "mobil app olsun" derse: platform üretimde
atanır; buradaki karar "hangi kullanıcı kitlesi + offline gereksinimi". Kaydet, DSL'e yazma.

## Faz 2 — Op kapsama

- "İş analizinde şu işlemler var: [listele]. Bu uygulamada hangileri yer alacak?"
- Dağıtılmayan her exposed op için: "Bunu şimdilik dışarıda mı bırakıyoruz? İleride mi?"
  → kararı BELGELE (uncovered-op uyarısı çıkınca cevabın hazır olur).
- Op başına: "Ekranda bu işlemden hangi bilgiler görünecek?" → out-projeksiyon.
  "Tek kayıt mı dönüyor, liste mi?" → cardinality.
- Alan başına: "Bu alan **ne türde — sayı mı, tarih mi, para mı, metin mi**?" → alan tipi
  (`ad: Tip`). Tipsiz alan üreteçte string input default'una düşer (tarih alanı düz metin
  kutusu olur) — tipi bilineni açıkça yazdır (yanlış-girdi-türü).
- "Bu işlem hangi durumlarda 'olmaz' der?" → authored `results:` (tech taggable'larını
  kapsa — translation.md §C).

**⚠ Guard — Kapsam telaşı:** her op'a ekran uydurma. Uncovered-op = soru, doldurma emri değil.
**⚠ Guard — Ad kirliliği:** ekran dili ≠ iş dili olabilir; yerel ad serbest ama
`realizes`'i açık yaz (by-name info'suna yaslanma — sessiz eşleşme kırılgandır).

## Faz 3 — Ekran haritası

- "Uygulama açılınca kullanıcı **ilk saniyede** ne görüyor?" → `entry`. (Cevapsız geçme —
  yazılmazsa 100 developer farklı başlar.)
- "Ekranları sayalım: [önerini listele]. Kim hangisini görür?" → persona kapıları.
- Ekran başına: "**Ekranın başlığında** kullanıcı ne okusun?" → görünen ad (`"…"`).
  Yazılmazsa manifest `title: null` — üreteç başlık icat etmez, validator da uyarmaz
  (sessiz-eksik). Her ekrana authored başlık yazdır.
- "Bu ekrana **nereden** gelinir?" — her ekran için cevap olmalı (erişilebilirlik).
  Cevabı olmayan ekran: "nav mı eksik, ekran mı gereksiz?"
- "İş akışı [bizFlow adı] şu adımlarla yürüyor: … Bu yolculuk hangi ekranlardan geçsin?"
  → `flow … realizes flow`.
- "Alt menü / gezinme çubuğu olacak mı; hangi ekranlara atlanır?" → navigation region +
  client-only action'lar (chrome AUTHORED — üreteç icat etmez).

**⚠ Guard — Shared'a persona:** ortak ekrana `for` yazılmaz; "bu ekranı sadece X görsün"
deniyorsa o ekran shared DEĞİL, o experience'ın ekranıdır.

## Faz 4 — Ekran içeriği

- "Bu ekranın ana işi ne — bir şey **bulmak/izlemek** mi (liste), **tek kaydı incelemek**
  mi (detay), **tek göstergeyi görmek** mi (değer), **veri girmek** mi (form),
  **düğmeye basmak** mı (aksiyon)?"
- "Listede satır başına ne görünsün?" → `show` (default'u sessizce bırakma: "hepsi mi
  dökülsün, özet mi?").
- "Satıra dokununca ne olsun?" → `on activate -> screen X(row.id)`.
- "Grafik/harita/takvim gibi özel bir görsel mi gerekiyor?" → extension component
  (`@chart.…`); çekirdeğe widget adı girmez.

**⚠ Guard — Form/detay karışması:** "hem görsün hem düzenlesin" → detail + ayrı edit-form
(`loads query` deseni) veya tek form; ikisini tek bileşene sıkıştırma.

## Faz 5 — Veri mekaniği & offline

- Okuma başına: "İnternet yokken bu liste/detay görünmeli mi (en son haliyle)?" → cache.
- Yazma başına: "Çekmiyorken kaydetse, bağlanınca gönderilse olur mu — yoksa anında
  sunucu cevabı mı şart (ödeme gibi)?" → queue vs remote.
- "Kullanıcı elle tazeleyebilsin mi?" → refreshable. "Ekrana dönünce kendiliğinden
  tazelensin mi?" → `on enter refresh`.
- "Bu kayıt işlemi hangi listeleri eskitir?" → invalidates.
- "Liste kaç kayıt olur — onlarca mı, binlerce mi?" Binlerce → pagination sunumu:
  "kaydırdıkça yüklensin mi (sosyal-medya tarzı), sayfa numaraları mı?"
- "Çevrimdışıyken ekranda bir işaret olsun mu? Eşitleme başarısız olursa kullanıcı
  nasıl haberdar olur?" → when-deltaları (experience-düzeyi banner/badge + ekran override).

**⚠ Guard — P-sınırı (üreteç-politikaları):** şunları SORMA, üreteç-politikası zaten
pinli — kullanıcı sorarsa söyle: cache tazelik (P1: örtük revalidasyon yok), queue-retry
(P2: bağlantı gelince otomatik), çakışma çözümü (P3: server-wins), back-stack (P4),
offline'da remote-op (P5: ServerError kanalı), çift-submit kilidi (P8), loading/empty
default'u (P9: standart spinner/boş-durum), validasyon zamanlaması (P10: submit'te).
Bunlar DSL'e yazılmaz; kullanıcı FARKLI davranış isterse not düş — üreteç-politikası
değişikliği ayrı iştir, sunum beyanı değil.

## Faz 6 — Form & hata deneyimi

- "Formda hangi alanlar? Hangileri boş geçilemez? Uzunluk/format sınırı?" → field rules.
- "Her alan **ne türde — sayı mı, tarih mi, para mı, metin mi**?" → alan tipi (`uses`
  `in {ad: Tip}`). Tipsiz alan **düz metin kutusu** olarak gelir (numerik klavye /
  tarih-seçici / para-maskesi çıkmaz) — required/min/max sorulup tip atlanmasın.
- "Bu alan formda **salt-okunur** mu, **gizli** mi, yoksa **vurgulu** mu görünmeli?"
  → `@ui.readonly` / `@ui.hidden` (field) · `@ui.emphasis` (field VEYA ekran). Frontend-yazarı
  sunum-ipucu (backend-hassas maske DEĞİL — o `@sensitivity`→tech-driven). **Sorulmazsa**
  bu niyet en iyi ihtimalle `#` yorumda kalır = **makinece-taşınmaz** (manifest'e girmez,
  üreteç düz-alan üretir). Author edilince manifest `decorations: [...]` taşır.
- "Uzun form mu — adımlara bölünsün mü?" → `step`.
- Uygulama-geneli (BİR KEZ sor): "Oturum düşmüşse ne olsun?" (→ Login'e nav) ·
  "Beklenmedik hata?" (→ toast+retry standardı) · "Alan hataları?" (→ formda yerinde).
- Sonra yalnız İSTİSNALAR: "Bu işlemin kendine özgü bir 'olmaz' durumu var mı; o zaman
  ne görünsün?" (ör. NotProcessable → özel toast).
- Handler-tamlık uyarısı gelince: "'X' hatası karşılıksız — standart hata gibi mi
  işlensin (varsayılan), özel mesaj mı?"

**⚠ Guard — queue×out:** "kaydedince numarası ekranda çıksın / detayına gitsin" + queue
= çelişki. Açıkla: kuyruklu kayıtta sunucu cevabı sonra gelir; ya anında-onaylı (remote)
yap ya listeye dön. (Temp-id ileri faz — vaat etme.)

## Faz 7 — Davranış determinizmi

- "Bu ekran kendi kendine yenilensin mi? Girişten şu kadar sonra mı (bir kez), sürekli
  belli aralıkla mı?" → timer vs interval (arka-plan duraklaması adaptörün — P11).
- "Silme/iptal gibi geri-alınamaz işlemlerde onay penceresi? Metni ne olsun?" → confirm
  (metinsiz = adaptör-standart — P12; bunu söyle).
- "Bu düğme herkese mi görünsün?" → visible-when + **her seferinde**: "bu görünürlük
  kuralı kolaylıktır, güvenlik değil — asıl engel sunucuda."
- "Bu eylem **kaydın durumuna** bağlı mı? (İptal yalnız 'pending'ken, Duraklat yalnız
  'çalışıyor'ken)" → EVET ise: (a) eylemi kaydı yükleyen **list/detail gövdesine** koy →
  `visible-when: row.<alan> = '<değer>'` (Fork A, tercih — manifest temiz nest'ler); ya da
  (b) ayrı region/ekran-seviyesindeyse ekrandaki detail/value kaydına ADIYLA →
  `visible-when: <detailAdı>.<alan> = '<değer>'` (Fork B; `list` hariç). SKILL Faz 7.
- "Kullanıcının cihazında hatırlanacak bir şey var mı (filtre seçimi, taslak, sepet)?"
  → persisted state; oturumluk mu → state; hesaplanan mı → derived.

**⚠ Guard — Canlı-güncelleme vaadi:** "başkası değiştirince anında görsün" → v1'de yok;
karşılığı enter-refresh + interval + invalidates. Açıkça sınırla, sonra kur.

## Genel lens'ler (her fazda akılda)

- **İlk-saniye testi:** her experience için "kullanıcı açar açmaz ne yaşar?" cevaplanmış
  mı (entry + entry ekranının loading/empty halleri)?
- **Boş-durum testi:** ilk kullanım / hiç kayıt yokken her liste ne gösterir? (P9 default
  var; ama önemli ekranlarda authored `when empty` öner.)
- **Kesinti testi:** akışın ortasında oturum düşerse? (Login'e cascade + interrupt/resume
  otomatik — kullanıcıya güvence ver, DSL'e ekstra bir şey yazma.)
- **Yetim-op / yetim-ekran testi:** contract'ta sunulmayan op, haritada girilemeyen ekran
  kalmasın (uncovered/reachability zaten yakalar — sen daha erken yakala).
