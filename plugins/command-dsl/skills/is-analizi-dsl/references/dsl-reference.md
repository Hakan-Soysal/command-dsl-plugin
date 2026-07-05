# CommandDSL Sözdizimi Referansı

CommandDSL'in (`.cdsl`) tüm yapıları. Kaynak: `CommandDSL/command-dsl.langium`
(grammar) + `CommandDSL/docs/llm-guide.md` (anlam/yükümlülük) +
`CommandDSL/examples/real/*.cdsl` (gerçek kullanım). Bu skill yalnızca **iş
DSL'ini** (`.cdsl`) üretir; tech DSL (`.tcdsl`) bu skill'in konusu değildir.

> Tüm construct'ları tek yerde gösteren, **parser-doğrulanmış (0 error)** bir
> worked example için: `references/examples/` (`shop.cdsl`+`support.cdsl`+`README.md`).
> Bir yapının tam yazımından emin değilsen oradaki kalıbı örnek al.

## İçindekiler
- [§1 Temel bildirimler (foundation)](#1-temel-bildirimler-foundation)
- [§2 İşlem bildirimi (operation)](#2-işlem-bildirimi-operation)
- [§3 Kural cümlecikleri](#3-kural-cümlecikleri)
- [§4 Sorgular](#4-sorgular)
- [§5 Yetki devri (grant/revoke)](#5-yetki-devri-grantrevoke)
- [§6 Akışlar (flow)](#6-akışlar-flow)
- [§7 Süreçler (process)](#7-süreçler-process)
- [§8 Koşullar, ifadeler, tipler](#8-koşullar-ifadeler-tipler)
- [§9 Import & dosya organizasyonu](#9-import--dosya-organizasyonu)

---

## Yetenek Envanteri (sessiz-eksik risk yüzeyi — süpürme + tetikleyici haritası)

> **Snapshot:** grammar `b75a56181dad` (bundle `--version` ile çapraz-kontrol; uyuşmazsa envanter BAYAT → elle tazele). Elle bakımlı.

Yalnız **opsiyonel, sessizce atlanabilir** iş-kuralı/yapı construct'larını listeler (zorunlular — actor / operation 4'lü imza / entity — faz+validator'ca zorlanır; onların **yanlış-değer** riski SKILL "Emit öncesi" teşhir maddesindedir). Kullanım: (1) her fazda **"Gerçek-dünya sinyali"** kolonunu dinle → aday-soru kuyruğa (hibrit onay). (2) Emit'ten önce **★** satırlarını süpür (SKILL Pre-Emit Gate). Sinyal soruyu **TETİKLER, cevabı DOLDURMAZ** (büyü yok).

**★** = yüksek (sessiz + iş-kuralı/durum kaybı) · **○** = orta

| Construct | Gerçek-dünya sinyali (tetikleyici) | Faz | Risk |
|---|---|---|---|
| Guard ailesi: `where` / `only if` / `only when` / `only during` | "yalnız şu koşulda / şu durumdaysa / mesai saatinde / bakiye yeterse geçer / reddedilir" | 3 | ★ |
| `calculate <Entity>.status = '…'` (durum geçişi) | "onaylanınca durumu X olur / şu aşamaya geçer" (süreç durum-zinciri bundan türer; yoksa UNKNOWN) | 3 | ★ |
| `perform <İşlem>` (otomatik zincir) | "bu olunca şu da otomatik yapılır (arka planda, kullanıcı istemeden)" | 3 | ★ |
| `schedule: every …` (zamanlanmış komut) | "her gün/ay / gece otomatik çalışır / periyodik iş" | 3 | ★ |
| `<ilişki>'s` ownership + `relation` | "yalnız kendi ekibinin / bölgesinin / müşterisinin kaydı" | 0/3 | ★ |
| `either/or` (akış dallanması) | "ya şöyle ya böyle ilerler / duruma göre farklı yol" | 2 | ★ |
| `note """…"""` | formalize edilemeyen iş-kuralı / dikkat-noktası (süre, istisna, politika) | her faz | ★ |
| `grant/revoke` (çalışma-anı yetki devri) | "geçici erişim ver (24s sonra kalksın) / vekâlet" | 3 | ○ |
| `send <Mesaj> to` (bildirim) | "onaylanınca / olunca haber gitsin, bildirim" | 3 | ○ |
| `create … from` (türetilmiş kayıt) | "talepten sipariş / şundan bu üretilir" | 3 | ○ |
| `outside "…"` (sistem-dışı adım) | "kullanıcı sistem dışında bir şey yapar (fiziksel, 3.parti, bilişsel seçim)" | 2 | ○ |
| `abandon anytime` (akıştan çıkış) | "her noktada vazgeçebilir / yarıda bırakabilir" | 2 | ○ |
| `actor <A> extends <B>` (yetki kalıtımı) | "yönetici, çalışanın tüm yetkilerine + fazlasına sahip" | 0 | ○ |
| query `order by` / `limit to` | "en yeniden eskiye sırala / ilk N kayıt" | 3 | ○ |

---

## §1 Temel bildirimler (foundation)

```
domain <Ad>                         # bölüm işaretçisi (sonraki bildirimler bu domain'e ait)
actor <Ad>                          # rol
actor <Ad> extends <ÜstAktör>       # üst aktörün TÜM işlemlerini devralır (yetki kalıtımı, geçişli)
entity <Ad> { alan: Tip  alan2: Tip ... }
relation <ad> of <Aktör> with <Entity>   # adlandırılmış ilişki; ownership'te <ad>'s olarak kullanılır
calendar <etiket>                   # zaman penceresi (içeriği modelde tanımlı değil)
verb <ad>                           # fiil sözlüğünü genişletir (bildirilen fiil "bilinen" sayılır)
```

- **Entity tipleri:** `String, Decimal, Int, Boolean, Date, DateTime, Duration`
  ve koleksiyon: `list of <Entity>`. Örn: `items: list of InvoiceItem`.
- **Örtük owner:** her entity'nin bildirilmese de bir `owner` alanı vardır
  (sahiplik kontrolünün temeli). Kullanıcıya sorma; modelde var kabul et.
- **`relation` adı camelCase** bildirilir (kullanım biçimiyle uyumlu olsun):
  `relation managedTeam of DepartmentManager with Employee` → kullanım `managedTeam's`.
- **`calendar` tireli etiket** olabilir: `calendar business-hours`. (Tireli adlar
  yüzünden ifadelerde `-` operatörünün iki yanı boşluklu olmalı.)
- **`domain`** kod organizasyonudur, davranış doğurmaz; katalogları gruplamak için.

## §2 İşlem bildirimi (operation)

```
<İşlemAdı>: <Aktör> <fiil> <ownership> <Kaynak> [on <ownership> <Hedef>] [from <ownership> <Girdi>] [for <Alıcı>] [where <koşul>]
```

- **Her işlem ZORUNLU ID ile** bildirilir (`<Ad>:`). ID, dış katmanların
  bağlandığı evrensel tutamaçtır; akış/süreç adlarıyla **tek global isim
  uzayını** paylaşır (aynı ad iki kez kullanılamaz).
- **İşlem kimliği = aktör + fiil + ownership + kaynak** (4'lü imza). where/on/
  from/for kimliğe girmez; aynı dörtlü modelde yalnız bir kez bildirilir.
- **Tür fiilden türetilir:** `reads`/`lists` → sorgu; diğer her fiil → komut.
- **Ownership anahtarları:**
  | Anahtar | Anlam |
  |---|---|
  | `own` | aktörün kendi kaydı (`kayıt.owner == aktör`) |
  | `any` | herhangi bir tekil kayıt (sahiplik şartı yok) |
  | `all` | sistemdeki tüm kayıtlar (toplu; genelde System) |
  | `public` | açık erişim |
  | `<ilişki>'s` | ilişkiye dayalı (ör. `managedTeam's`) |
- **`on <X>`:** işlem var olan bir hedef kaydın ÜZERİNDE (`creates own Comment on friend's Photo`).
- **`from <X>`:** yeni kayıt kaynak kayıttan üretilir (`creates any PurchaseOrder from any PurchaseRequest`).
- **`for <Aktör>`:** oluşturulan kaydın sahibi/alıcısı komutu vereni değil belirtilen tarafı (`System creates any GiftCard for Customer`).
- **`where <koşul>`:** kaynağın durumuna ön-koşul; sağlanmayan kayıtta işlem reddedilir.
- **Fiiller alan dilidir:** `creates/reads/lists/updates/deletes` standart CRUD;
  `cancels/approves/submits/issues` gibi fiiller durum değiştiren özel işlemlerdir.
  Standart-dışı fiil kullanacaksan önce `verb <ad>` ile bildir.

Örnek:
```
ApproveRequest: DepartmentManager approves managedTeam's PurchaseRequest
only during business-hours
only if PurchaseRequest.amount <= 50000
on success do
    calculate PurchaseRequest.status = 'approved'
    send ApprovalNotice to PurchaseRequest.owner
```

## §3 Kural cümlecikleri

İşlem bildiriminin altına, girintisiz (clause) veya `on success do` altında
girintili (action) gelir:

```
only during <takvim>                      # K1 — zaman penceresi dışında reddet
only if <Varlık.alan> <op> <değer>        # K2 — ön-koşul (tek karşılaştırma)
only when <koşul>                         # K3 — komutta ön-koşul / sorguda sonuç filtresi
schedule: every <day|week|month|hour> [at <SS:DD>]   # K8 — yalnız System aktörlü komutta
on success do                             # K4 — başarı sonrası etkiler (girintili):
    calculate <Varlık.alan> = <ifade> [if|when <koşul>]   # K5 — türetilmiş alan / durum geçişi
    send <MesajTürü> to <alıcı>                            # K6 — bildirim
    create <Varlık> from <Varlık>                         # K7 — yeni kayıt
    perform <İşlemAdı>                                     # K9 — başka işlemi otomatik tetikle (geçişli)
```

- `calculate <Entity>.status = '<değer>'` bir **durum geçişi** bildirir; süreç
  anlatımındaki durum sütunu bu atamalardan türetilir.
- `perform` zinciri geçişlidir ve kullanıcı niyeti içermez (arka plan yan etki).
- `schedule:` taşıyan komut hiçbir akışta/süreçte geçmez; kullanıcıya açılmaz.

## §4 Sorgular

```
<İşlemAdı>: <Aktör> reads|lists <ownership> <Kaynak>
only when <koşul>            # sonuç filtresi (eler, reddetmez)
order by <Varlık.alan> ascending|descending
limit to <N>
```

Salt-okunur; sistemi değiştirmez. Ayrı bir `Query` kelimesi yoktur — tür fiilden
türetilir. `reads` = tekil/odaklı okuma, `lists` = toplu listeleme.

## §5 Yetki devri (grant/revoke)

```
<Aktör> grants <read|write|update|delete> <ownership> <Kaynak> to <Aktör> [for <süre>]
<Aktör> revokes <read|write|update|delete> <ownership> <Kaynak> from <Aktör>
```

Çalışma zamanı yetki devri (ör. `Customer grants read own Order to SupportAgent for 24h`).
Süre dolunca izin kendiliğinden geçersizleşir.

## §6 Akışlar (flow)

```
flow <Ad> for <Aktör>
    note """çok satırlı açıklama"""        # opsiyonel
    step <Ad>: <İşlemAdı> [optional] [repeat] [using <ÖncekiAdım>]
    include <AkışAdı> [optional] [repeat]   # alt-akışı yerinde genişlet
    either
        step ...
    or
        step ...
    outside "<metin>"                       # sistem dışı kullanıcı eylemi (adım değil)
    abandon anytime "<metin>"               # her noktada bırakabilir (akış başına en çok 1)
```

- **Referans-only (ADR-0001):** akış işlem TANIMLAMAZ; katalogdaki operation'lara
  YALNIZ ID ile bağlanır. Çözülmeyen ID linker hatasıdır.
- Bildirim sırası = zaman sırası. Tek aktör, tek oturum.
- `optional` = 0..1, `repeat` = 1..n, `optional repeat` = 0..n.
- `using <Adım>` = bu adım, aynı akıştaki önceki bir adımın sonuç kaydı üzerinde
  çalışır (id zincirleme ipucu). Önceki adıma referans olmalı (sıra denetimi U1).
  **Entity-eşleşmesi (kritik):** `using`'in işaret ettiği adımın sonuç kaydının
  TÜRÜ, bu adımın çalıştığı kaynakla aynı olmalı; aksi halde "yanlış kayıt taşır"
  uyarısı çıkar. **Eksen kayması** (kayıt türü değişiyor, ör. onaylı talepten
  sipariş üretiliyor: PurchaseRequest → PurchaseOrder) durumunda `using` KULLANMA.
  Doğru kalıp: önce listele/`outside "... seçer"` ile seçtir, yeni kaydı
  `creates … from <kaynak>` ile üret (using yok); SONRAKİ adımlar artık aynı
  türde kalıyorsa o üretim adımını `using` ile zincirle.
  ```
  step ListApproved: ListApprovedRequests
  outside "siparişe dönüştürülecek talebi seçer"
  step CreateOrder: CreatePurchaseOrder            # from PurchaseRequest — using YOK (tür değişiyor)
  step Issue: IssueOrder using CreateOrder         # aynı tür (PurchaseOrder) — using DOĞRU
  ```
- `include` aktörü dahil edenin aktörüyle (veya extends atasıyla) uyumlu olmalı;
  döngü olamaz.
- `either` en az iki dal ister; `outside`/`abandon` referans alamaz, sayılmaz.

## §7 Süreçler (process)

```
process <Ad> [of <Entity>]
    note """açıklama"""                     # opsiyonel
    stage <Ad>: flow <AkışAdı> by <Aktör>   # flow-etabı: by ZORUNLU
    stage <Ad>: <İşlemAdı>                   # işlem-etabı: doğrudan operation
    any order
        stage ...
    and
        stage ...
```

- **Referans-only (ADR-0003):** süreç hiçbir şey tanımlamaz; flow'lara veya
  katalogdaki operation'lara referans verir. Orchestrator/saga DEĞİLDİR.
- `of <Entity>` = sürecin merkez/correlation varlığı; her koşu bu varlığın tek
  örneğini izler. Eksen kayması (PR→PO→SI) katalogdaki from/on'dan türetilir.
- **`by <Aktör>` flow'un `for` aktörüyle TAM eşleşmek zorundadır (P6)** — el
  değiştirme (handoff) bu satırlarda görünür. Ata-aktör esnemesi yoktur.
- `any order` = sıra-bağımsız etaplar (eşzamanlılık vaadi değil).
- Etapların giriş/çıkış durumları yazılmaz; katalogdaki `where`+`calculate`'ten türetilir.
- Bir flow süreçte etap olmak zorunda değil (destek akışları P8 info verir — hata değil).

## §8 Koşullar, ifadeler, tipler

- **Karşılaştırma:** `=, !=, >, <, >=, <=`; bağlaç `and`/`or`, parantez `( )`.
  Sağ taraf: STRING (`'...'`), sayı, süre, ya da `Varlık.alan` yolu.
- **İfade (calculate sağı):** `+ - * /`, parantez, `sum of <koleksiyon.alan>`,
  `Varlık.alan`, sayı, STRING. String ataması yalnız durum geçişi içindir
  (aritmetiğe giremez, sayısal alana atanamaz).
- **FieldPath:** `Order.total`, `Invoice.items.price`, `PurchaseRequest.owner`.
  Yalın alan (`status`) komutun kaynağına göre çözülür.
- **Süre:** `24h` / `30m` / `7d` ya da `2 hours`, `3 days` vb.
- **Saat:** `03:00` (schedule `at` için).

## §9 Import & dosya organizasyonu

```
import './actors.cdsl'        # dosya başında; göreli veya mutlak path (tek tırnak STRING)
```

- Görünürlük **transitif değildir** (A→B→C'de A, C'yi görmez); bir dosya yalnız
  açıkça import ettiklerini görür.
- `import`, `using`, `verb`, `process`, `stage`, `schedule` yalın ID olarak
  kullanılamaz (keyword). İşlem/akış/süreç adı seçerken bunlardan kaçın.
- **Dosya bölme MODÜL bazlıdır** (bu skill'in tercihi): tek modül → tek
  `<modül>.cdsl`; çok modül → modül kadar dosya, aralarında `import`. Detay:
  `consistency-and-emit.md` §C. (Not: `examples/real` tipe-göre bölünmüştür —
  `actors/entities/.../flows/processes` — bu da geçerli bir CommandDSL dizilimidir,
  ama skill modül bazlı üretir.)
- Yorum: `# ...` (satır sonuna kadar).
