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
- [§10 Kurallar (rule) & requires](#10-kurallar-rule--requires)
- [§11 Başarı ölçütü (outcome)](#11-başarı-ölçütü-outcome)

---

## Yetenek Envanteri (sessiz-eksik risk yüzeyi — süpürme + tetikleyici haritası)

> **Snapshot:** grammar `94397168f2a1` · commit `1ca2337`+ADR-0038 (bundle `--version` ile çapraz-kontrol; uyuşmazsa envanter BAYAT → elle tazele). Elle bakımlı. NOT: hash reçetesi aile gereği `shared.langium`'u da kapsar — bu turdaki değişim ADR-0038'in shared-Expr'idir (business grameri shared'ı import ETMEZ; business yazım-yüzeyi DEĞİŞMEDİ).

Yalnız **opsiyonel, sessizce atlanabilir** iş-kuralı/yapı construct'larını listeler (zorunlular — actor / operation 4'lü imza / entity — faz+validator'ca zorlanır; onların **yanlış-değer** riski SKILL "Emit öncesi" teşhir maddesindedir). Kullanım: (1) her fazda **"Gerçek-dünya sinyali"** kolonunu dinle → aday-soru kuyruğa (hibrit onay). (2) Emit'ten önce **★** satırlarını süpür (SKILL Pre-Emit Gate) — riski soyut değil **"Atlanırsa"** kolonundaki adıyla teşhir et. Sinyal soruyu **TETİKLER, cevabı DOLDURMAZ** (büyü yok).

**★** = yüksek (sessiz + iş-kuralı/durum kaybı) · **○** = orta

| Construct | Gerçek-dünya sinyali (tetikleyici) | Faz | Risk | Atlanırsa (adlandırılmış mod) |
|---|---|---|---|---|
| Guard ailesi: `where` / `only if` / `only when` / `only during` | "yalnız şu koşulda / şu durumdaysa / mesai saatinde / bakiye yeterse geçer / reddedilir" | 3 | ★ | **koşulsuz-geçiş** — ön-koşul kaybolur; reddedilmesi gereken kayıt işlemi geçer |
| `rule <Ad> { … }` + op'ta `requires` (yeniden-kullanılabilir predikat) | "aynı ön-koşul birden çok işlemde geçerli / ilişki-gezinmeli kural / 'şöyle bir kayıt VAR mı' kontrolü (`exists`)" | 3 | ★ | **note'a-düşen-yapısal-kural** — çok-op'lu / `exists`'li iş-kuralı `rule` yerine proza `note`'a düşer; makinece zorlanamaz, yeniden kullanılamaz |
| `calculate <Entity>.status = '…'` (durum geçişi) | "onaylanınca durumu X olur / şu aşamaya geçer" (süreç durum-zinciri bundan türer; yoksa UNKNOWN) | 3 | ★ | **UNKNOWN-durum-zinciri** — durum geçişi kaybolur; süreç durum-sütunu türetilemez |
| `perform <İşlem>` (otomatik zincir) | "bu olunca şu da otomatik yapılır (arka planda, kullanıcı istemeden)" | 3 | ★ | **kopuk-otomasyon** — arka-plan zinciri kopar; downstream işlem hiç tetiklenmez |
| `schedule: every …` (zamanlanmış komut) | "her gün/ay / gece otomatik çalışır / periyodik iş" | 3 | ★ | **tetiklenmeyen-periyodik-iş** — zamanlanmış komut hiç koşmaz |
| `<ilişki>'s` ownership + `relation` | "yalnız kendi ekibinin / bölgesinin / müşterisinin kaydı" | 0/3 | ★ | **yatay-yetki-aşımı** — kapsam `any`/`own`a düşer; aktör başkasının kaydına erişir |
| `either/or` (akış dallanması) | "ya şöyle ya böyle ilerler / duruma göre farklı yol" | 2 | ★ | **kayıp-alternatif-dal** — dallanma tek-yola iner; diğer iş-senaryosu görünmez |
| `note """…"""` | formalize edilemeyen iş-kuralı / dikkat-noktası (süre, istisna, politika) | her faz | ★ | **kaybolan-iş-kuralı** — formalize edilemeyen kural makinece hiçbir yere taşınmaz |
| `outcome <Ad> { measure … }` (ürün başarı ölçütü) | "başarıyı NASIL ölçeceğiz — onay süresi 2 güne insin / dönüşüm ≥ %95 / P95 < 200ms / reddedilen oranı < %5" | 1 | ★ | **kaybolan-başarı-ölçütü** — ölçülebilir ürün-hedefi yapısallaşmaz; başarı ölçütü (measure/eşik/pencere) modelden düşer |
| `grant/revoke` (çalışma-anı yetki devri) | "geçici erişim ver (24s sonra kalksın) / vekâlet" | 3 | ○ | **kalıcı-veya-eksik-yetki** — geçici devir modellenmez; erişim ya süresiz ya hiç yok |
| `send <Mesaj> to` (bildirim) | "onaylanınca / olunca haber gitsin, bildirim" | 3 | ○ | **sessiz-bildirim-kaybı** — haber gitmez; alıcı olaydan habersiz |
| `create … from` (türetilmiş kayıt) | "talepten sipariş / şundan bu üretilir" | 3 | ○ | **üretilmeyen-türev-kayıt** — kaynaktan doğması gereken kayıt oluşmaz |
| `outside "…"` (sistem-dışı adım) | "kullanıcı sistem dışında bir şey yapar (fiziksel, 3.parti, bilişsel seçim)" | 2 | ○ | **görünmez-manuel-adım** — sistem-dışı adım akışta yer almaz; süreç eksiksiz sanılır |
| `abandon anytime` (akıştan çıkış) | "her noktada vazgeçebilir / yarıda bırakabilir" | 2 | ○ | **modellenmemiş-çıkış** — yarıda bırakma yolu yok; akış tek-yönlü sanılır |
| `actor <A> extends <B>` (yetki kalıtımı) | "yönetici, çalışanın tüm yetkilerine + fazlasına sahip" | 0 | ○ | **kopyalanan-veya-eksik-yetki** — kalıtım yok; yetkiler elle tekrar → drift |
| query `order by` / `limit to` | "en yeniden eskiye sırala / ilk N kayıt" | 3 | ○ | **sırasız-sınırsız-sonuç** — kayıtlar rasgele sırayla / sınırsız döner |

**Jeneratif dinleme-sinyalleri** (yukarıdaki tablo construct→sinyal; bu blok tersi:
düz-cümle *sinyalini* dinle → aday-soru). `operation-translation.md` "Dinleme
dedektörü" katmanının envanter-yüzü; sinyal soruyu **TETİKLER, cevabı DOLDURMAZ**:

- `(öznesiz-edilgen: "mail gider / kayıt oluşturulur") => sor: "bunu HANGİ aktör yapıyor?" [★, actor + 4'lü imza]`
- `(belirsiz niceleyici: "genelde / bazen / duruma göre") => sor: "hangi koşulda bu yol, hangisinde diğeri?" [★, either-or / Guard]`
- `(örtük gereksinim: "…olmalı / gerekir") => sor: "bu kural hangi koşulda uygulanır?" (SORU üretir, cevap asla) [★, Guard]`
- `(kapsam-boşluğu: "kaydı / talebi" — kimin? belirsiz) => sor: "kimin kaydı — kendi / ilişki / herhangi?" [★, ownership / relation]`
- `(durum-sıfatı: "onaylı / kapalı / askıdaki kayıt") => sor: "bu duruma hangi işlem taşıyor?" [★, calculate status]`

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
requires <RuleAdı> [, <RuleAdı> …]        # K2-kardeşi — adlandırılmış rule'a bağla (bkz. §10)
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
- `requires <RuleAdı>, …` işlemi bir veya çok **adlandırılmış rule**'a bağlar (§10).
  `only if`'in tek-karşılaştırma sınırını aşan — çok işlemde tekrar eden, ilişki
  gezinen ya da "böyle bir kayıt VAR mı" (`exists`) soran — ön-koşulu buraya taşı.
  Rule gövdesi requires eden op'un kaynağını/aktörünü/reads-alias'larını görür.

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
- **`exists` niceleyicisi (yalnız `rule` gövdesinde — §10):** `[not] exists <alias>
  where <koşul>` — "şu koşulu sağlayan bir kayıt VAR mı / YOK mu". `<alias>` bir
  `reads` girdisinin adıdır; iç `where` yalnız o kaydın alanlarını görür (bağıntısız).
  `exists` guard'a (`only if`/`where`) **giremez**; ayrı ağaçtır, sadece rule'da.
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

## §10 Kurallar (rule) & requires

```
rule <Ad> {
    reads <girdi> [, <girdi> …]           # opsiyonel — çağrı yerinde bağlanan kökler
    satisfies <BoolExpr>                  # ZORUNLU — kuralın gövdesi (tek predikat)
    note """…"""                          # opsiyonel
}
```

Top-level, **yeniden-kullanılabilir, op-bağlamlı yapısal predikat** (ADR-0033).
İşlem bildiriminde `requires <RuleAdı>, …` clause'u ile kullanılır (§3). Aynı
ön-koşul birden çok işlemde geçerliyse, ilişki-gezinen ya da `exists`'li bir kural
gerekiyorsa `only if`'in tek-karşılaştırma sınırını burada aş.

- **Bağlam (örtük kökler):** rule gövdesi, kendisini `requires` eden **op'un
  kaynağını** (örtük), **aktörünü** ve **`reads` alias'larını** görür; kökler
  **çağrı yerinde** bağlanır (yani rule tek yerde yazılır, her `requires` edende
  yeniden çözülür). Bir op bir rule'u `requires` ederken op'un kaynağı, rule'un
  gövdesinde andığı ana entity ile uyumlu olmalıdır.
- **`reads` girdisi** iki biçim: (a) çıplak entity — `Invoice` ya da `Invoice as inv`
  (serbest kök, çağrı yerinde bağlanır); (b) köklü ilişki-zinciri —
  `managedTeam's` ya da `managedTeam's Employee as emp` (bir-veya-çok hop; leaf
  entity opsiyonel, son relation'ın target'ından türer). Aynı tipe ≥2 yol / ara
  dallanma varsa `as <alias>` ile ayrıştır.
- **`satisfies <BoolExpr>`:** gövde dili = Koşul (skaler karşılaştırma + `and`/`or`
  + parantez, §8) **üstüne** `[not] exists <alias> where <koşul>` niceleyicisi.
  `exists`'in `<alias>`'ı bir `reads` girdisinin adıdır; iç `where` yalnız o
  kaydın alanlarını görür (bağıntısız). `exists` guard'lara sızmaz (§8).
- Gövde **tek satır**dır (INDENT-duyarlı içerik yok); brace-blok `entity` emsali.
- `rule` yalın ID olamaz (keyword; `verb`/`import`/`outcome` emsali) — işlem/akış/
  süreç adı seçerken bundan kaçın.

```
# çok işlemde tekrar eden + exists'li ön-koşul → tek rule
verb submits                              # 'submits' özel fiil (D13); bildirilmezse "bilinmeyen fiil" uyarısı
rule OrderSubmittable {
    reads Invoice as inv
    satisfies Order.total > 0 and not exists inv where Invoice.status = 'open'
}

SubmitOrder: Customer submits own Order where status = 'placed'
requires OrderSubmittable                 # Order = op'un kaynağı; inv = reads-alias
on success do
    calculate Order.status = 'submitted'
```

## §11 Başarı ölçütü (outcome)

```
outcome <Ad> {
    measure '<metrik>' <op> <sayı> [unit '<birim>'] [within <süre>]   # ≥1 ZORUNLU
    [measure … ]                          # çok-metrikli olabilir
    covers <flow|op|process> [, … ]       # opsiyonel — hangi büyük-resmi ölçtüğü
    note """…"""                          # opsiyonel
}
```

**Ürün-başarı ölçütü** (ADR-0037/F3.6): davranışın *doğru* olması ile ürünün
*başarılı* olması ayrı şeylerdir; `outcome` ikincisini yapısal olarak yakalar.
**Top-level construct** — bir op'un içine gömülü clause DEĞİL; `covers` ile
büyük-resim öğelerine referans verir.

- **`measure '<metrik>' <op> <sayı>`:** metriğin **kimliği prozadır** (STRING
  etiket — `'signup completion rate'`, `'P95 latency'`) çünkü ürün-KPI'ı
  model-türetilemez dış niceliktir; ama **eşiğin şekli yapısaldır**: `<op>` kapalı
  karşılaştırma-setidir (`=` `!=` `>` `<` `>=` `<=`, §8 ile aynı kaynak), `<sayı>`
  sayısal eşik. **≥1 `measure` ZORUNLU.**
- **`unit '<birim>'`** ve **`within <süre>`** her `measure`'a özgüdür (çoklu-metrik
  outcome'da metrik başına ayrı birim/pencere): `measure 'order approval time' <= 2
  unit 'hours' within 30 days`.
- **`covers <hedef>, …`:** hedef **business-içi** — kullanıcı-hedefi `flow`,
  `process` ya da `operation` (aynı gramerdeki ID'ler). Cross-DSL atıf DEĞİL
  (QA-tarafı `satisfies` bağı ayrıdır, QA'da yaşar).
- **Ölçülemez başarı yapısallaşamaz** (correctness): "kullanıcılar mutlu olur"
  ölçüte inmiyorsa ya ölçülebilir biçime indir ("haftalık aktif kullanıcı ≥ X"),
  ya `note` olarak bırak, ya hiç yazma — uydurma yasak.
- `outcome` yalın ID olamaz (keyword; `rule`/`verb`/`import` emsali).

```
outcome FastFulfilment {
    measure 'order approval time' <= 2 unit 'hours' within 30 days
    measure 'rejected order rate' < 5 unit 'percent'
    covers Fulfil, SalesProcess, ApproveBigOrder   # flow / process / operation
    note """Ölçülemeyen başarı ("müşteri memnun") note'a düşer."""
}
```

Emit: `outcome` → `operations.json` `successCriteria[]` (measures + covers + note);
`rule` → `rules[]`; op'taki `requires` → op'un `guards[]`'ında `{kind:'rule', ref}`.
