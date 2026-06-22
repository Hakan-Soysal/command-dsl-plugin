---
name: is-analizi-dsl
description: >-
  Bir kullanıcının düz dille anlattığı uygulama/yazılım fikrini, adım adım
  sorgulama ve her aşamada onay alarak tutarlı bir CommandDSL (.cdsl) iş
  analizine — Süreç (process), Akış (flow), Eylem (operation) — dönüştürür.
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
- **Onaylanmamış hiçbir şeyi emit etme.** Doküman/DSL üretimi en sondadır.

## Başlamadan

Kullanıcıdan **tek cümlelik amaç** al: "Bu uygulama temelde ne işe yarayacak?"
Ton: sıcak, sade, yönlendirici. Örnek açılış:

> "Aklındaki uygulamayı birlikte netleştireceğiz. Teknik terim sormayacağım,
> sadece işini anlatır gibi konuş. Başlayalım: bu uygulama temelde ne işe
> yarayacak, bir cümleyle?"

Sonra dört fazı sırayla yürüt.

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
- **Takvimler:** "Sadece mesai saatinde" gibi zaman pencereleri varsa `calendar`.

**Toplu öner + onayla.** Örnek kapanış:
> "✅ *Kimler & Neler:* Çalışan, Yönetici (Çalışan'ın yaptıklarını da yapar),
> İK (salt görüntü) · Kayıt: İzin Talebi (tarihler, sebep, durum). Eksik/fazla var mı?"

DSL karşılıkları ve alan tipleri için: `references/dsl-reference.md` (§1).

---

## Faz 1 — Süreçler (BÜYÜK RESİM)

**Amaç:** Çok aktörlü, uçtan uca iş zincirlerini isim + sınır olarak çıkarmak.

**Her süreç için elicit et:**
- İsim + tek cümle açıklama.
- **Tetikleyici → Sonuç** ("Neyle başlar, neyle biter?").
- **Merkez varlık** (`of <Entity>`): sürecin yaşam döngüsünü taşıyan kayıt
  (ör. araç satışında Sipariş). "Bu süreç hangi kaydın etrafında dönüyor?"
- **Hangi aktörler** dahil.
- **Kapsam DIŞI ne var?** — en kritik soru.

**⚠ Anti-pattern — Süreç şişmesi:** Kullanıcı "araç satışı" deyince garanti,
servis, iade gibi 5 ayrı süreci tek çatıya toplama eğilimi olur. Sınırı sor:
> "Garanti/iade de bu sürece dahil mi, yoksa ayrı süreçler mi?"

**Toplu öner + onayla.** Süreç referans-only'dir; burada sadece isim/sınır/aktör
netleşir, içi sonraki fazlarda dolar. Detay: `references/dsl-reference.md` (§4).

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
- **Durum geçişlerini** burada yakala: "onaylanınca durumu ne olur?" →
  `on success do: calculate <Entity>.status = 'onaylandı'`. Durum yaşam döngüsü
  ayrı bir Faz-0 ürünü değildir; bu atamalardan **türetilir**.
- **Otomatik yan etkiler** (`perform`, `send`, `create`) ve **sistem işleri**
  (`System` aktörü, `schedule:`) kullanıcıya endpoint gibi gösterilmez — arka
  plan etkisidir.

**⚠ Anti-pattern — Sihirli adım:** "Sistem ödemeyi işler" gibi belirsiz
tanımlar. Her eylemin kim/ne/hangi kayıt/hangi koşul'u net olmalı.

**Toplu öner + onayla.** Her operation'ı kullanıcıya **düz cümle** olarak geri
oku ("Yönetici, kendi ekibinin talebini onaylar; onaylanınca durum 'onaylandı'
olur ve çalışana haber gider."), DSL'i değil.

---

## Emit öncesi — Tutarlılık self-check (= "hatasız")

Onaylar bittikten sonra, üretmeden ÖNCE katmanlar-arası bütünlüğü denetle. Tam
kontrol listesi ve emit sırası: **`references/consistency-and-emit.md`**. Özetle:
her flow step → var olan operation; her process stage → var olan flow/operation;
`by` == flow'un `for`'u; tek global isim uzayı; tip/kural uyumu (sorguda
`only if`/`on success` yok, komutta `order by` yok); benzersiz 4'lü imza;
ownership ilişkileri ve takvimler bildirilmiş. Bir ihlal varsa **emit etme** —
düzelt, tekrar denetle.

## Üretim (doküman + DSL)

Çıktı modunu **kullanıcı seçer**: (a) önce okunur doküman → sonra DSL,
(b) doğrudan DSL, (c) ikisi birden, ya da sadece biri. En sonda sor:
> "Şimdi (a) önce okunur dokümanı mı, (b) doğrudan DSL'i mi, yoksa (c) ikisini
> birden mi üreteyim?"

DSL'i **modül bazlı** dosyalara böl (tip bazlı değil): tek modüllük analiz →
tek `<modül>.cdsl` dosyası (içinde dependency sırasında: foundation → operation →
flow → process); çok modüllük analiz → modül kadar dosya, aralarında `import`.
`actors.cdsl`/`entities.cdsl` gibi tipe göre dosya AÇMA. Detay ve paylaşılan
foundation kuralı için `references/consistency-and-emit.md` (§C).

Doküman üretirken **sabit markdown şablonunu** kullan (zorunlu bölümler, sıra ve
başlıklar): `references/consistency-and-emit.md` (§D). Doküman, DSL kadar
deterministik olmalı — yapıyı doğaçlama, şablonu uygula.

## Doğrulama (varsa)

Üretilen `.cdsl`'i gerçek CommandDSL doğrulayıcısıyla parse-temiz olduğunu
kanıtlamak en güçlü "hatasız" garantisidir. Doğrulayıcı **opsiyoneldir**:
konum çözümleme zinciri, bayatlık uyarısı ve diagnostics→düzeltme döngüsü
**`references/validator.md`** dosyasında. Doğrulayıcı yoksa valid-by-construction
+ self-check ile devam et; ama varsa MUTLAKA çalıştır ve error varsa düzeltme
döngüsüne gir.

---

## Referans dosyaları (gerektiğinde oku)

- `references/dsl-reference.md` — CommandDSL yapılarının tam sözdizimi/anlamı
  (foundation, operation+kurallar, flow, process). Faz sırasında ilgili §'a bak.
- `references/operation-translation.md` — düz cümle → 4'lü imza çeviri prosedürü.
  **Faz 3'te her operation'da oku.** En kritik dosya.
- `references/consistency-and-emit.md` — emit öncesi tutarlılık self-check'i +
  dependency-order emit + dosya bölme. **Emit'ten önce oku.**
- `references/validator.md` — doğrulayıcı konum zinciri + diagnostics + düzeltme
  döngüsü. Üretimden sonra doğrulama yaparken oku.
- `references/examples/` — **parser-doğrulanmış (0 error) known-good exemplar**:
  dilin tüm construct'larını gösteren çok-modüllü model (`shop.cdsl`+`support.cdsl`)
  + `README.md` (nerede ne var). Bir yapıyı nasıl yazacağından emin değilsen buraya bak.
