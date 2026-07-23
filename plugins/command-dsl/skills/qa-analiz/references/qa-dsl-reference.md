# QA DSL referansı — sözdizimi + anlam (backend perspektifi)

> Kaynak: `CommandDSL/qa-dsl.langium` + tasarım spec'i v0.4 (karar #1-#25, S1-S20,
> İQ1-İQ12). Uzantı `.qa`; yorum `//`. İfade dili = shared Expr (tech ile AYNI AST;
> karşılaştırma **tek `=`**, `!=` var, `==` YOK; `not` Expr'e ait DEĞİLDİR — yalnız
> assert-yüzeyi keyword'ü: `not emitted` / `not called`). **ADR-0038:** shared Expr'e
> `in` üyelik operatörü geldi (`x in {a|b}` / to-many path; sağda skaler leaf → error) —
> ve (K12 kapaması) QA'nın **kendi** assert/cond operatörleri de `in`'i BİRİNCİ SINIF taşır:
> `CmpAssert` ve `Cond` shared `Cmp`'yi aynalar — `op='in'`, sağ operand YALNIZ küme-şekli
> (`SetLit | Path`; `in 5` → parser error). `result.status in { draft | active }` artık
> yazılabilir. Bu dosya yazım-anı başvurusudur; sorgulama soruları
> `interrogation-playbook.md`'de, tech→dal eşlemesi `tech-to-qa-translation.md`'de.

## Yetenek Envanteri (sessiz-eksik risk yüzeyi — "kapsandı ≠ doğrulandı")

> **Snapshot:** grammar `912002af9beb` · src `c4bac2a3f22e` · commit `704eb7f`+**qa v3.1.0 (`seed … @owner(persona)` sahiplik-pini — additive) + v4.0.0 (liste-literal `[…]` + eleman-tip denetimi + İQ2 muafiyet-kaldırma — KIRICI: çıktı `kind:'list'` + girdi) + v5.0.0 (`input.<param>` cond-RHS kökü — KIRICI: girdi ad-rezervasyonu + çıktı path-kök uzayı)** (grammarHash tech-gramerini embed eder → Kalem-0 tech `by <param> on <col>` grameriyle güncellendi; qa-authoring construct'ı DEĞİŞMEDİ. **v5.0.0'da grammarHash DEĞİŞMEDİ — yetenek gramersiz geldi (validator-only); srcHash değişti**) (bundle `--version` ile çapraz-kontrol; uyuşmazsa envanter BAYAT → elle tazele). Elle bakımlı.
>
> **⚠️ ADR-0040 · qa v2.0.0 — KIRICI (2026-07-16).** İki ayrı şey oldu, karıştırma:
> 1. **Yankı (yüzey DEĞİL):** tech'e `principal`/`axis` girdi → qa gramerini import ettiği için hash
>    kaydı. Tech'in 7 yeni keyword'ü QA'da **hâlâ identifier olarak kullanılabilir**
>    (`QaDslTokenBuilder` keywords-as-identifiers'ı varsayılan yapar; ampirik ölçüldü) → mevcut `.qa`
>    modelleri **bu yüzden** kırılmaz.
> 2. **GERÇEK yüzey değişikliği:** yeni dal arketipi **`covers Filtered [ownership|permit]`**
>    (bkz. `tech-to-qa-translation.md` §A2). **KOLEKSİYON dönen** (`list of X`) bir sorguda
>    `ownership`/`permit` **REDDETMEZ, satır KISAR** → `covers NotAuthorized ownership|permit` orada
>    artık **error**; `Filtered` + **üyelik ikilisi** (`result contains` + `result absent`) **zorunlu**.
>    Tekil-dönen op'lar ve `roles`/`scope` **etkilenmez**. Göç ölçüldü: **11 op**.
>    `qa.json` `branch` union'ı genişledi → kapalı `switch`'li tüketici düşer = **KIRICI**.
>
> **⚠️ qa v3.0.0 — KIRICI çıktı (2026-07-17).** `coverage.ts` `Branch` union'ına **`{kind:'refinementViolation', id:'<param>.range|union'}`** eklendi: tech imza-param'ı `in <Range>|{union}` taşıyorsa (ör. `amount: Money in 1..10000`) sınır-ihlali (NotValid) artık **dal-uzayında** — strict onu ya test (`covers guard "<param>.range"`) ya waive ister (eskiden **görünmezdi** → strict yapısal kör). Girdi additive (mevcut `.qa` parse eder; `covers guard "<param>.<kind>"` artık geçerli) ama refinement'lı op'ta yeni `uncovered` warning doğar. Çıktı `branch` union'ı genişledi → kapalı-`switch` tüketici düşer = **KIRICI**. Bkz. `docs/releases/qa-dsl.md` v3.0.0.
>
> **⚠️ qa v3.1.0 (additive) + v4.0.0 (KIRICI) — 2026-07-18.** İki ayrı yüzey:
> 1. **v3.1.0 — `seed … <Entity> @owner(<persona>) { … }` sahiplik-pini (§6).** Seed kaydının
>    SAHİBİNİ görünür bir persona'ya bağlar; üreteç `OwnerId = PersonaUserId(persona)` üretir.
>    Girdi additive (annotation — `owner` GLOBAL keyword DEĞİL, alan-anahtarı/bind/persona adı
>    olarak yaşamaya devam eder); çıktı additive (seed kaydına OPSİYONEL `owner?: string` alanı,
>    `kind` seti aynı). **Neden gerekli:** given-call arrange bu boşluğu KAPATAMAZ — create-op'lar
>    çoğunlukla `@internal roles svc_*` → persona çağıramaz; svc çağırırsa create semantiği
>    `OwnerId = çağıran(svc)` yapar. Kimlik-dikişli (OwnerId authored alan OLMAYAN) entity'de pin
>    ancak seed'in kendisinde beyan edilir.
> 2. **v4.0.0 — liste-literal `alan: [öğe, …]` (İQ2 kapanışı).** `list of` param/alan girdisinin
>    BİRİNCİ-SINIF yazımı (boş `[]` dahil; öğe = literal | persona/seed-ref | step-path |
>    obje-literal | iç-içe liste). **Girdi KIRICI (muafiyet-kaldırma):** (a) `list of` hedefe
>    skaler/seedRef/obje yazımı artık **error** ("liste literal'i kullan: [öğe, …]" — eskiden
>    sessizce geçip codegen'de patlıyordu), (b) koleksiyon alanlar **zorunlu-eksik denetimine
>    girdi** — boş bırakmak "Eksik zorunlu alan(lar)" error'ı, boş liste `[]` ile AÇIKÇA beyan
>    edilir. **Çıktı KIRICI:** `QaValueJson.kind` union'ına `'list'` varyantı (+ `items?:
>    QaValueJson[]` özyineli) → kapalı-`switch` tüketici düşer. Bkz. `docs/releases/qa-dsl.md`.
>
> **⚠️ qa v5.0.0 — KIRICI (2026-07-20) · `input.<param>` cond-RHS kökü (§8.1).** Assert/cond
> sağ tarafı koşulan çağrının girdisine referans verebilir: `state Order exists { total = input.amount }`.
> **Gramer DEĞİŞMEDİ** — yetenek validator-only geldi (ifade zaten `Path` olarak parse ediyordu),
> bu yüzden `grammarHash` sabit kaldı; **bayatlık dedektörü bu yeteneği yakalayamaz** (içerik-kapsaması
> keyword-tabanlı, `input` keyword değil düz ID) → envanter damgası ELLE tazelendi.
> 1. **Girdi KIRICI (dar, ölçülmüş):** `input` adı **rezerve** — `input` adlı persona/seed-bind/
>    step-bind artık error (beyan-yerinde; sessiz gölgeleme yok). Corpus'ta 0 dosya etkilendi.
>    Additive parçası: `input.<param>` eskiden *"Bilinmeyen ifade kökü"* error'ıydı.
> 2. **Çıktı KIRICI (İLKE-dayanaklı):** düğüm ŞEKLİ aynı (`{path:['input','amount']}` — yeni `kind`
>    YOK, union genişletilMEDİ), genişleyen **path-kök string uzayı**; kapalı kök-listeli tüketici
>    düşer. CommandDSL'de ölçülemez (tüketici downstream) → ilkeye dayalı sınıflandırma.
> 3. **Yazım disiplini (§8.1) — gate zorlamaz:** `input.<param>` yalnız **birebir-kopya** alanlar
>    için; hesaplanan alanlar **literal** ister. Envanter'de ★ satırı var, Pre-Emit Gate süpürür.

QA'da branch-coverage validator zorunlu **dal uzayını** zaten süpürür (kapsanmamış dal → warning). Buradaki sessiz risk farklıdır: bir dal **"covered" sayılır ama test onu gerçekten TETİKLEMEZ veya etkisini DOĞRULAMAZ** (karar #8 — validator kapsamı SAYAR, ihlali iddia ETMEZ). Bu tablo, sayılan-kapsamı gerçek-doğrulamaya çeviren **opsiyonel derinliği** listeler. Kullanım: "sinyal" kolonunu dinle; emit'ten önce **★** satırlarını süpür (SKILL Pre-Emit Gate).

**★★** = en yüksek (kapsam sayılır, ihlal doğrulanmaz) · **★** = yüksek · **○** = orta

| Derinlik | Ne zaman gerekli (sinyal) | Faz | Risk | Atlanırsa (adlandırılmış mod) |
|---|---|---|---|---|
| Negatif-testin dalı GERÇEKTEN tetiklemesi | `covers guard/error/NotAuthorized` yazdın — `when`/`given` girdisi o dalı gerçekten ihlal ediyor mu? (validator coverage sayar, ihlali doğrulamaz — karar #8). **Refinement dalı** (`covers guard "<param>.range\|union"`, v3.0.0) da bu sınıftadır: girdi gerçekten **sınır-dışı** mı (in-range değer boundary'yi tetiklemez)? | 4 | ★★ | **yalancı-kapsam (tetiklemeyen-negatif)** — dal "covered" sayılır ama ihlal hiç tetiklenmez; yetkisiz/hatalı yol (ya da sınır-içi kalıp boundary'yi ıskalayan refinement testi) sessizce geçebilir |
| **`Filtered` dalında üyelik İKİLİSİ** (`result contains` + `result absent`) | op `list of X` dönüyor VE `ownership`/`permit` taşıyor → dal `Filtered <via>` (ADR-0040). Filtre **bozukken de `Success` döner** → "çağrı geçti"/"N satır geldi" hiçbir şey kanıtlamaz | 4 | ★★ | **kanıtsız-filtre** — `contains` yoksa **aşırı-filtreleme** (hak edilen satır düşüyor), `absent` yoksa **SIZINTI** (kapsam-dışı satır dönüyor) görünmez. `result count` = **false-negative üreteci** (yanlış satırlar dönse de sayı tutar). *(Validator bu ikiliyi error'la zorlar — tablo tetikleyici olarak durur.)* |
| `then` etki-assert'leri (`state`/`emitted`/`called`) | komut/Success testi — dönüş DIŞINDA kalıcı etki (kayıt yazıldı mı, event çıktı mı, dış çağrı yapıldı mı) doğrulanmalı mı? assert'siz Success = sığ test | 4 | ★ | **doğrulanmamış-etki** — dönüş doğru ama kalıcı etki (kayıt/event/dış-çağrı) hiç assert'lenmez; sığ-yeşil test |
| **İçerik-oracle'ında kopya/hesaplanan ayrımı** (`input.<param>` vs literal — v5.0.0, §8.1) | create/update testinde bir alanın DEĞERİNİ assert'liyorsun. Alan başına **SOR** (tech söylemez — alan-atama gövdesi Generation-Gap HOLE'u): bu alan girdinin **birebir kopyası** mı (→ `input.<param>`), yoksa **hesaplanmış/türetilmiş** mi (→ **literal** beklenen değer)? | 4 | ★ | **anlaşmalı-oracle (false-green)** — hesaplanan alana `input.<param>` yazılırsa cond ile handler AYNI hatayı paylaşır (ikisi de vergiyi/dönüşümü atlar) → test yeşil, gereksinim ihlal; ters yön **oracle-drift**: kopya alana literal yazılırsa girdi değişince cond bayatlar (false-red). **Strict gate ikisini ayırt EDEMEZ** (ikisi de authored) — yalnız bu süpürme yakalar |
| `time` pini + `advance time` | op/guard zamana duyarlı mı ("gece 2'de", "48 saat içinde", "süre dolunca")? pin yoksa dal "covered" ama zaman-koşulu KOŞULMAZ | 4/5 | ★ | **koşulmayan-zaman-dalı** — zaman-koşullu dal "covered" ama zaman ilerletilmediğinden hiç koşmaz |
| `seed` / `given` yeterliliği | rule/ownership dalı ön-durum ister mi (var olan kayıt, başkasının kaydı, limit-aşımı)? seed yoksa dal gerçekten tetiklenmez | 3/4 | ★ | **kurulumsuz-dal** — ön-durum (mevcut kayıt/başkasının kaydı/limit-aşımı) kurulmadığından dal gerçekten tetiklenmez |
| `seed … @owner(persona)` sahiplik-pini (v3.1.0) | ownership/Filtered dalının seed'i "başkasının kaydı"nı mı kuruyor? Kaydın SAHİBİ görünür bir persona'ya pinli mi — özellikle **kimlik-dikişli** entity'de (OwnerId authored alan DEĞİL → seed gövdesinden yazılamaz, given-call arrange da kuramaz)? | 3/4 | ★ | **pinsiz-sahiplik** — OwnerId deterministik bir persona'ya bağlanmaz; ownership/Filtered testi yanlış kimlik-dikişi üstünde sahte-yeşil verir (dal "covered" ama sahiplik ilişkisi hiç kurulmamıştır) |
| `waive … until` (süreli) | dalı kapsamak yerine waive ediyorsan süre koydun mu? `until`'siz waive = **kalıcı sessiz boşluk** | 2 | ★ | **kalıcı-sessiz-boşluk (bayat-istisna)** — süresiz waive; kapsanmayan dal kalıcı olarak sessizce muaf kalır |
| senaryo `realizes flow/process` (yaşam döngüsü) | çok-adımlı / çok-aktör akış var mı? presence-coverage | 5 | ○ (warning-routed) | **kapsanmayan-yaşamdöngüsü** — çok-adım/çok-aktör akış senaryosu yok; uçtan-uca dizi doğrulanmaz |
| senaryo `satisfies <outcome>` (ürün-hedefi presence) | operations.json'da ölçülebilir `outcome`/SuccessCriteria var mı — özellikle yalnız-**op** kapsayan (o outcome yalnız `satisfies` ile bağlanabilir, `realizes` asla)? her hedef bir senaryoyla karşılanıyor mu? | 5 | ★ (warning-routed; **waive KAPATMAZ**) | **kapsanmayan-ürün-hedefi** — ölçülebilir bir başarı-ölçütü hiçbir senaryoyla `satisfies` edilmiyor; "davranış doğru ama ürün-hedefi test-kanıtsız" (kapatılabilir açık-hedef sessizce kalır) |
| `page` assert'leri (paginated) | sayfalı sorguda jenerik ötesi sayfa-özel veri doğrulaması gerekli mi? | 4 | ○ | **doğrulanmamış-sayfa** — sayfalı sorguda jenerik ötesi sayfa-özel veri assert'lenmez |
| stub `returns` gerçekçiliği | dış çağrı sonucu testin sonucunu etkiliyorsa `returns` içeriği gerçeği yansıtmalı | 3 | ○ | **gerçekdışı-stub** — dış-çağrı sonucu gerçeği yansıtmaz; test yanlış öncül üstünde yeşil verir |

## 1. Kök + uses ikilisi (§2, karar #2/#20)

```
qa "Proposals — backend testleri"                     // başlık opsiyonel

uses tech "./proposals.tcdsl"                         // 1..n — ZORUNLU (dal uzayının kaynağı)
uses flows "./proposals.operations.json"              // 0..1 DSL'de; SKILL-politikası: HER ZAMAN yaz
```

- `uses tech`: operation evreni = bağlanan tech dosyaları + import-kapanışındaki tüm
  `module` Operation'ları (`@internal` ve pureTech-rollüler DAHİL; `external`/`uncharted`
  BoundaryOp'lar HARİÇ — onlar stub hedefidir). Cross-file Langium linki (karar #2).
- `uses flows`: operations.json v3'ten **flow-id + process-id evreni** (op-üyelik
  listelerindeki `flows[]`/`processes[]` union'ı — karar #20). Bağlıysa senaryolar
  `realizes flow/process X` yazabilir ve presence-coverage açılır; bağlı değilse
  `realizes` error'dur. Tech'in kendi `contract`'ı farklı dosyaya işaret ediyorsa
  **info** (S12).
- Operation referansları: evrende tekilse çıplak ad (`SubmitProposal`), değilse
  nitelikli (`Proposals.SubmitProposal`); belirsizlik → error.
- Aynı tech kaynağına birden çok `.qa` bağlanabilir; coverage **workspace-union**.

## 2. Persona (§3.1, karar #15)

```
persona musteri: Customer            // tech rolemap'teki actor'a bağlanır
persona baskaMusteri: Customer       // ownership testleri için ikinci kimlik
persona zamanlayici: role Scheduler  // YALNIZ pureTech (~ ->) mapped roller için
```

- Karşılıksız actor → error. `role` bağı yalnız rolemap'te `~ ->` işaretli roller
  için; actor-mapped role'e `role` bağı → error ("actor üzerinden gidin").
- Persona-adı dosyada tekil; scope dosya-yereldir (İQ5 — qa dokümanları sembol export
  etmez). Adlar ASCII (S11).

## 3. Dataset (§3.2, karar #17 — v1 flat)

```
dataset gecerliTeklif for SubmitProposal {
  title: "Yeni teklif"
  amount: 100
}
```

- `for <Operation>`: alanlar op **param listesine** karşı tip-doğrulanır — bilinmeyen
  alan / eksik zorunlu alan / tip uyumsuzluğu → error.
- **Degrade kuralı (S18):** alanın tipi yapısal çözülemiyorsa (opak TypeRef) o alan
  için değer-doğrulaması YAPILMAZ ve iddia edilmez ("doğrulanamayanı doğruladım"
  deme). Aynı kural stub-`returns`, seed ve payload'da geçerli.
- **Literal-TİP denetimi v1'de enum'la sınırlıdır (denetim-F3):** enum-üyeliği +
  enum-alanına string-dışı literal → error; opak primitiflere (Text/Money/Id)
  literal-tip iddiası YOK.
- Değer türleri: literal (STRING / NUMBER — negatif işaretli olabilir, F6 / true /
  false) · **persona referansı** (kimlik-tipli alan; üreteç kimliğe çözer) ·
  **seed-binding referansı** · **obje-literal** (kompozit param/alan) · **liste-literal**
  `[öğe, …]` (v4.0.0 — aşağıda). Step-binding path'i (`s1.result.id`) YALNIZ senaryo-içi
  inline kullanımda geçerlidir — kök-düzey dataset'te yazılamaz.
- Kompozisyon YOK (`extends` v1-dışı); kullanım yerinde **inline override**:
  `with gecerliTeklif { title: "" }`.
- **Liste-literal (v4.0.0 — İQ2 muafiyeti KALKTI):** `list of` tipli param/alan girdisi
  `alan: [öğe, …]` ile yazılır — öğe = literal | persona/seed-ref | step-path (yalnız
  senaryo-içi) | obje-literal | iç-içe liste; boş liste `[]` GEÇERLİDİR ve "kasıtlı boş"
  beyanıdır. Üç kural:
  1. `list of` hedefe skaler/seedRef/obje yazımı → **error** ("liste literal'i kullan:
     [öğe, …]"); tek öğe de `[değer]` ile sarılır.
  2. Koleksiyon alanlar artık **zorunlu-eksik denetiminde** (requireAll bağlamları:
     dataset / inline-input / event-payload / obje-literal) — boş bırakmak "Eksik
     zorunlu alan(lar)" error'ı; boş koleksiyon `[]` ile AÇIKÇA beyan edilir.
  3. **Eleman-tip denetimi özyineli:** öğeler hedefin ELEMAN tipine doğrulanır —
     enum-üyelik, path-kök görünürlüğü, obje-literal alan doğrulaması, iç-içe
     liste→skaler eleman error'ı; liste→skaler hedef de error.

## 4. Defaults (§3.6, karar #25)

```
defaults for SubmitProposal {
  as musteri
  stub Payments.ReserveFee returns { reservationId: "res-1" }
}
```

- Kök-düzey, op-başına opsiyonel; içerik: `as` ve/veya `stub` satırları. O op'u koşan
  **her test ve senaryo-adımı** için varsayılan; test/senaryo kendi `as` /
  `given stub`'ıyla override eder. Aynı op'a bir dosyada ikinci defaults → error.
- **Manifest'te defaults kavramı YOKTUR (S19):** testler ÇÖZÜLMÜŞ (etkin `actor` +
  etkin `stubs[]` inline) emit edilir. Stub-çözüm önceliği (İQ3): given-stub >
  yürütülen op'ların defaults'ları (yürütülme-beyan sırası; ilk sağlayan kazanır).

## 5. Test (§3.3)

```
test "boş başlık reddedilir" of SubmitProposal covers guard "title-required" {
  as musteri
  when call with gecerliTeklif { title: "" }
}
```

- Başlık STRING'i **dosya içinde tekildir** (S1 — manifest anahtarı `dosya + başlık`).
- `covers <dal>`: testin kapsadığı **TEK** dal (S2). Biçimlerin TAM listesi:
  - `covers Success`
  - `covers guard "id"` (validation VEYA rule guard'ı — ayrım tech'ten türetilir)
  - `covers error <ErrorDecl>` (taksonomi-pinli named error)
  - `covers NotAuthorized [roles|ownership|permit|scope]` — **karar #21:**
    çok-mekanizmalı op'ta niteleyici ZORUNLU (yoksa error "mekanizma belirtin");
    tek-mekanizmalıda çıplak biçim yeterli (emit'te etkin mekanizmaya çözülür — İQ8)
  - `covers NotValid` (anonim dal — id'siz validation check'lerinin katlaması, S5)
  - `covers NotProcessable` (anonim dal — id'siz rule check'leri, S5)
  - `covers callFailure <External.Op>` (compensate'li stub'lanabilir calls)
- **Beklenen outcome AYRICA YAZILMAZ — covers'tan türetilir (S10, §7 tablosu).**
- `as <persona>`: çağıran kimlik (zorunlu; `defaults`'tan gelebilir).
- Gövde = `given?` + `when` + `then?`.

## 6. given — arrange (§5.1, karar #5/#10/#13/#22)

```
given {
  time "2026-07-02T10:00:00Z"
  seed p1 = Proposal @owner(yonetici) { title: "t1", status: "Draft", owner: yonetici }
  seed 10 Proposal { status: "Active", owner: musteri }
  call ApproveProposal as yonetici with { id: p1 }
  stub Payments.Charge returns { receiptId: "r1" }
  stub Notifications.Send fails
}
```

- **Yürütme sırası (P14):** beyan sırasıyla — `time`/`stub` konum-bağımsız etkindir;
  `seed`/`call` sıra-korumalıdır.
- `time STRING`: saat pini — **saat-dilimi offset'i ZORUNLU** (öneri `Z`; offset'siz
  ISO → error — QA-15); biçim + DEĞER sanity denetlenir (`T99:99` sınıfı → error, F7).
  Zamana duyarlı guard'lı op'larda şiddetle önerilir (P4).
- `seed [<bindId> =] [<N>] <Entity> [@owner(<persona>)] { alan: değer … }` (karar #22, K-C; @owner v3.1.0):
  - Doğrudan durum beyanı; alanlar Entity field'larına tip-doğrulanır (S18 degrade).
    İş kurallarını **bilerek** bypass eder (gerçekleme P5).
  - Çokluk `<N>`: N ≥ 1 (0 → error); çokluk-seed'i bind EDİLEMEZ (hangi kayıt? →
    error); kimlikler üreteçte deterministik (P11).
  - Binding: sonraki seed/call/when değerlerinde **seedRef** olarak kullanılır
    (kimlik-tipli alana çözülür); dangling seedRef → error. FK zincirini string-literal'e
    emanet etme.
  - **`@owner(<persona>)` — sahiplik-pini (v3.1.0):** seed kaydının SAHİBİNİ görünür bir
    persona'ya bağlar; üreteç `OwnerId = PersonaUserId(<persona>)` üretir. Persona AYNI
    dosyada tanımlı olmalı (değilse error: "@owner persona'sı bu dosyada tanımlı bir
    persona olmalı"). **Ne zaman TEK yol:** entity'nin sahiplik anahtarı **kimlik-dikişi**
    ise (OwnerId authored alan DEĞİL → seed gövdesinden yazılamaz — entity-dışı anahtar
    error'du); given-call arrange da kuramaz (create-op çoğunlukla `@internal roles svc_*`
    → persona çağıramaz; svc çağırırsa `OwnerId = çağıran(svc)` olur). Entity'de authored
    `owner` ALANI da varsa `@owner` onunla çakışmaz — alan ve pin ayrı yüzeylerdir,
    ownership testinde ikisini TUTARLI kur. Manifest: seed kaydına OPSİYONEL
    `owner: "<persona>"` alanı (yalnız beyan edilmişse; @owner'sız çıktı bit-özdeş).
- `call <Op> [as <persona>] with <girdi>`: API-driven kurulum; Success beklenir —
  dönmezse test **infra-fail** raporlanır (assert-fail değil — S7). Testte `as`
  yoksa testin etkin aktörü; **SENARYO given-call'ında `as` ZORUNLUDUR** (F8 —
  senaryonun given-anında etkin aktör yoktur).
- `stub <Ext.Op> returns { … } | fails`: **birleşim kuralı (QA-07)** — testin/senaryonun
  yürüttüğü TÜM op'ların (when-op + step-op'ları + given-call op'ları) doğrudan `calls`
  ettiği **stub'lanabilir hedeflerin** (external VE uncharted BoundaryOp) birleşimi
  için stub zorunlu (defaults'tan gelebilir); eksik → error; birleşim-dışı hedefe stub
  → error. `returns` gövdesi BoundaryOp dönüş tipine tip-doğrulanır (S18). İç-modül
  calls gerçek koşar, stub'lanamaz (karar #10). Hesap yöntemi:
  `tech-to-qa-translation.md` §D.
- **Kanonik yazım (Q3) — skaler/opak dönen stub da `returns { }` blok biçimini kullanır:**
  gramer yalnız `returns '{' … '}'` (blok) | `fails` tanır; **çıplak skaler dönüş biçimi
  YOKTUR**. Boundary op skaler/opak dönüyorsa (ör. `: Ack`) değer S18 ile degrade edilir
  (doğrulanmaz) — biçim yine blok'tur, gerekirse boş `{ }`:
  ```
  // YANLIŞ — çıplak skaler (gramerde yok → parse error)
  stub Payments.ReleaseFee returns "OK"
  // DOĞRU — blok biçim; `Ack` opak dönüşü S18 ile degrade (değer iddia edilmez)
  stub Payments.ReleaseFee returns { }
  ```
- Senaryoda `given` senaryo-başında bir kezdir; step-arası stub değişimi v1-dışı.

## 7. when — act (§5.2) ve S10 türetim tablosu (§5.3)

```
when call with gecerliTeklif { title: "" }                        // dataset + inline override
when call with { title: "X", amount: 5 }                          // tam inline
when call with { request: { amount: 250, tip: 5 } }               // kompozit param → object-literal değer
when call with { ids: [p1, p2], kanallar: [] }                    // `list of` param → liste-literal (v4.0.0; boş [] = kasıtlı boş)
when event Proposals.ProposalSubmitted with { proposalId: "p1" }  // consumer op'lar
```

> Parçacıklar sözdizimi vitrinidir (spec §5.2'den) — gerçek kullanımda payload,
> hedef event'in/op'un TÜM zorunlu alanlarını taşımalıdır (eksik alan → error).

- `call`: hedef testin `of` op'udur; girdi param'lara tip-doğrulanır. `@internal` /
  serving'siz op'lar da çağrılabilir (in-process gerçekleme — P15).
- `event`: yalnız `on` clause'lu op'larda (karar #11); event op'un `on`
  aboneliklerinden biri değilse → error; payload event field'larına tip-doğrulanır.
- **Kanonik yazım (Q5) — parametresiz op'ta dataset YOK → `when call with { }`:** gramer
  `when call` sonrası `with <girdi>`i ZORUNLU kılar (`with` atlanamaz) ve parametresiz op'un
  dataset'i olamaz (alan yok) → boş inline girdi `{ }` yazılır. (Ölçüldü: **17 op** etkilendi.)
  ```
  // YANLIŞ — `with` atlandı (parse error) / paramsız op'a olmayan dataset
  when call
  when call with hicbirDataset
  // DOĞRU — boş inline girdi
  when call with { }
  ```

**Beklenen outcome türetimi (S10 — normatif tablo, spec §5.3 BİREBİR):**

| covers / expect | türetilmiş beklenen outcome |
|---|---|
| `Success` | Success |
| `guard "x"` (tech'te validation-check) | NotValid, guard "x" |
| `guard "x"` (tech'te rule-check) | NotProcessable, guard "x" |
| `guard "<param>.range\|union"` (tech'te param-refinement — Model C) | NotValid, guard "<param>.<kind>" (= tech `violations[].ruleId` join anahtarı) |
| `NotValid` (anonim) | NotValid (guard'sız) |
| `NotProcessable` (anonim) | NotProcessable (guard'sız) |
| `error E` | E (taksonomi sınıfı = E'nin pini) |
| `NotAuthorized [mech]` | NotAuthorized |
| `callFailure T` | ServerError (P8 — external-failure sınıfı ServerError'dur) |

validation/rule ayrımı guard-id'nin tech'te hangi clause'da olduğundan türetilir
(S17 tekillik önkoşulu bunu belirsizliksiz kılar). Manifest'e türetilmiş
`expectedOutcome` yazılır — yazar-beyanı değildir, `covers` ile çelişemez.

## 8. then — ek assert'ler (§5.3, karar #4/#22)

`then` bloğu **opsiyoneldir**, outcome İÇERMEZ; yalnız EK kanıt:

```
then {
  result.title = "Yeni teklif"
  result count 3
  result contains { status = "Active" }
  state Proposal exists { title = "Yeni teklif", status = "Draft" }
  state AuditLine count 1
  emitted ProposalSubmitted with { title = "Yeni teklif" }
  not emitted ProposalRejected
  called Payments.ReserveFee with { amount = 100 }
  called Payments.Authorize with { request.amount = 250, request.tip = 5 }   // kompozit arg iç-alanı: noktalı yol
  compensated Payments.ReleaseFee
  page count 3
  page more
}
```

> Bu blok sözdizimi VİTRİNİDİR (spec §5.3'ten) — tüm assert türlerini tek yerde
> gösterir; TEK op üzerinde birlikte geçerli DEĞİLDİR (`result count`/`contains`
> yalnız `list of` dönüşte, `page` yalnız `paginated` query'de).

| Assert | Anlam | Yapısal doğrulama |
|---|---|---|
| `result.<path> <cmp> <expr>` | dönüş payload alanı | path, op `returns` tipinin field'larına karşı (S18 degrade) |
| `result count <NUMBER>` | dönen listenin öğe sayısı | yalnız `list of` dönüşlü op'ta (karar #22) |
| `result contains { koşullar }` / `result absent { koşullar }` | listede koşullu öğe var/yok (sırasız eşleme) | eleman-tipi field'larına karşı; yalnız `list of` dönüşte |
| `state <Entity> exists { koşullar }` | koşulları sağlayan en az bir kayıt var | Entity op'un `access`'inde değilse warning (S9) |
| `state <Entity> absent { koşullar }` | koşulları sağlayan kayıt yok | aynı |
| `state <Entity> count <NUMBER> [{ koşullar }]` | kayıt sayısı | aynı |
| `emitted <Event> [with { alan = değer … }]` | event yayınlandı (yayın-niyeti — P9) | Event, op'un `emits` listesinde olmalı (error) |
| `not emitted <Event>` | event yayınlanMAdı | aynı |
| `called <Ext.Op> [with { … }]` / `not called <Ext.Op>` | outbound çağrı [bu argümanlarla] yapıldı/yapılmadı | hedef, op'un `calls` hedefleri ∪ compensator'ları içinde olmalı (İQ11 — happy-path'te `not called <compensator>` meşru); gözlem P10. **Kompozit arg** iç-alanı **noktalı yol**la (`request.amount = …`) hedeflenir; yol, param'ın composite tipinin gerçek şekline karşı doğrulanır (leaf skalar/enum, çözülemeyen yol → error) |
| `compensated <Ext.Op>` | telafi çağrısı koştu | hedef, op'un `calls … compensate with` compensator'ı olmalı |
| `page count <NUMBER>` / `page more` / `page end` | dönen sayfa: öğe sayısı / devamı var / son sayfa | yalnız `paginated` query'de (S4) |

- Assert LHS = path, RHS = shared Expr (İQ1 — `result count` gibi keyword-önekli
  assert'lerle çakışmasın diye). `<cmp>` kümesi: `= != > < >= <=` **ve `in`** (ADR-0038
  K12 — `CmpAssert`/`Cond` shared `Cmp`'yi aynalar); `in`'in sağ operandı YALNIZ
  küme-şekli (`{a|b}` SetLit | path — gramer zorlar, `in 5` parse hatası):
  `result.status in { "Approved" | "Draft" }`.
- **`in`-kümesinde enum-üyelik (`=` ile PARİTE — ADR-0038 K9b'nin qa-eşi):** yalnız
  `Cond`'un **noktalı-path yaprağında** denetlenir (`{ request.status in { … } }` gibi) —
  yaprak enum-tipliyse SetLit'in her üyesi o enum'un üyesi olmalı, değilse error.
  `CmpAssert`'te ve noktasız cond'da denetim YOK — **bilinçli parite sınırı** (`=` de
  yalnız o yüzeyde denetler; ters asimetri yaratılmadı).
- Senaryo step-bloğu aynı yüzeyi kullanır; step-assert'lerde önceki **bağlanmış**
  step'lerin `sN.result.<path>`'i çözülür (QA-12).

### 8.1 `input.<param>` — girdi-referanslı oracle değeri (v5.0.0)

Bir assert/cond değeri, **koşulan çağrının girdisine** referans verebilir:

```
then {
  state Order exists { total = input.amount }            // basit param
  state Order exists { total = input.request.amount }    // kompozit param yolu
  result.total = input.amount                             // CmpAssert'te de geçerli
}
```

**İfade kökleri (§5 — tam liste):** `input` · persona · seed-bind · `<step-bind>.result.…` ·
`result`. `input` **step-lokaldir**: op-testte `when call`'un girdisi, senaryoda **o step'in**
girdisidir (bir önceki step'in değil). `given` bloğunda ve `when event` bağlamında girdi yüzeyi
YOKTUR → `input` kökü orada **error**.

Yapısal doğrulama: param var mı (yoksa mevcut paramlar listelenir) · kompozit yol
`resolveStructural` ile yürünür (koleksiyon-içine-inme / kompozit-olmayana-inme / kompozitte-bitme
→ error) · **tip uyumu** LHS yaprağına karşı denetlenir (sayısal↔metin, skaler↔koleksiyon).
`input` adı **rezervedir**: bir persona / seed-bind / step-bind bu adı alırsa **beyan yerinde
error** (sessiz gölgeleme yok).

**Ne İDDİA ettiğini bil — `input.<param>` bir "birebir-kopya" iddiasıdır.**
"Bu alan, girdinin değiştirilmemiş kopyasıdır." Alan başına doğru yazımı seç —
ve bu seçim **KULLANICIYA SORULUR, tech'ten TÜRETİLMEZ**: tech DSL op'un alan-atama
gövdesini modellemez (Generation-Gap HOLE'u; `access creates Order` hangi entity'yi der,
alanın nasıl dolduğunu DEMEZ). Tech'e bakıp "kopyadır" diye çıkarım yapmak uydurmadır.

| Alan nasıl doğuyor? | Yaz | Neden |
|---|---|---|
| Girdinin **birebir kopyası** (`Total = c.Amount`) | `total = input.amount` | Tek-kaynak: girdi değişince oracle kendiliğinden takip eder |
| **Hesaplanmış / türetilmiş / dönüştürülmüş** (`Total = c.Amount + vergi`, birleştirme, normalize) | **literal beklenen değer** (`total = 110`) | Oracle'ın bağımsız kalması için |

**Hesaplanan alanda `input.<param>` YAZMA — false-green üretir.** Gerekçe: gereksinim
"total = amount + vergi" iken hem cond (`total = input.amount`) hem handler (`Total = c.Amount`)
vergiyi unutmuşsa **ikisi anlaşır**, test yeşil yanar, gereksinim ihlal edilmiş kalır. Yazar
literal `110` yazsaydı bu yakalanırdı. Ters yön daha ucuzdur: kopya alanda literal yazmak
**drift borcu** doğurur (girdi 200'e çekilince cond 100'de kalır → false-red).

**Strict gate bu ikisini AYIRT EDEMEZ** (ikisi de authored değer) — bu **belgelenmiş
yazım disiplinidir**, zorlanan bir kural değil. Emit öncesi Envanter'in
**"içerik-oracle'ında kopya/hesaplanan ayrımı"** ★ satırını süpür.

> Güvenliğin kaynağı **opt-in** olmasıdır: `input.<param>` yazarın bilinçli
> "bu alan bir kopyadır" beyanıdır, üretecin tahmini değil.

## 9. Scenario (§3.4, karar #3/#12/#13/#14/#23)

```
scenario "teklif yaşam döngüsü" realizes flow ProposalFlow satisfies ProposalThroughput {
  time "2026-07-02T09:00:00Z"
  as musteri
  step s1 = SubmitProposal with gecerliTeklif expect Success
  advance time 2 days
  as yonetici
  step ApproveProposal with { id: s1.result.id } expect Success
  as musteri
  step GetProposal with { id: s1.result.id } expect Success {
    result.status = "Approved"
  }
}
```

> **Kanonik yazım (Q4) — senaryo clause sırası GRAMER'CE SABİTTİR:** önce `time`, sonra
> `given`, sonra `as`/`step`/`advance` **dizisi** (grammar `Scenario`: `time?` → `given?` →
> `ScenarioItem*`). `time`/`given` bu iki bloğun ÖNÜNE konur; onlardan SONRA `as` ve `step`
> serbestçe dizilir (`as→step→as→step` meşru). Sıra bozulursa **parse error**.
> ```
> // YANLIŞ — `as`/`step`, `given`'dan ÖNCE (sıra bozuk → parse error)
> scenario "…" {
>   as musteri
>   given { seed p1 = Proposal { … } }
>   step GetProposal with { id: p1 } expect Success
> }
> // DOĞRU — time · given ÖNCE; sonra as/step dizisi
> scenario "…" {
>   time "2026-07-02T09:00:00Z"
>   given { seed p1 = Proposal { … } }
>   as musteri
>   step GetProposal with { id: p1 } expect Success
> }
> ```
> Emsal: **business operation** clause'ları da sabit sıralıdır (aynı sınıf); tek gevşetme
> P1'dir (M3-01) ve **YALNIZ `note`**'u konumdan bağımsız yapar — diğer clause'lar
> (business'ta ve qa senaryosunda) sıralı KALIR.

- `realizes flow <id>` / `realizes process <id>`: uses-flows bağlıysa yazılabilir;
  presence-coverage'a sayılır (#23/#24). Çok-aktör orkestrasyon → `realizes process`.
- **`satisfies <outcome1>, <outcome2>` (F3.6, ADR-0037 üçüncü-dilim):** senaryonun bir
  business **ürün-hedefini** (`outcome` / SuccessCriteria) KARŞILADIĞINI bildirir. Düz-ID,
  `realizes flow` birebir emsali — evren `uses flows`'un `operations.json.successCriteria`
  id'leridir (cross-ref değil, sentetik). Grammar (qa-dsl.langium:102-113): `realizes`
  OPSIYONEL + `satisfies` OPSIYONEL, sırası sabit (önce `realizes`, sonra `satisfies`);
  ikisi de olmayan/yalnız-biri/ikisi-birlikte hepsi geçerli. Çoklu outcome virgülle
  (`satisfies A, B`; aynı senaryoda `A, A` dedup). Bilinmeyen outcome → **error** (uses-flows
  bağlı olmalı; `realizes`'ın karşılıksız-hedef kuralıyla aynı).
  - **Presence-coverage (kapatılabilir hedef):** `satisfies` senaryosu olan outcome
    **covered**, olmayan **uncovered** = *kapatılabilir yeni ürün-hedefi* (merged
    `coverage.outcomes[]`; qcdsl özeti "outcome (authored satisfies): N · … karşılanan /
    … açık-hedef"). Kapsanmayan outcome → tek konsolide **warning** `uses flows` satırında
    ("'satisfies' senaryosu olmayan outcome'lar … F3.6 — kapatılabilir hedef: …").
    Bu uyarı **warning-routed**'dur: strict'te de **error'a yükselmez** ve **waive ile
    KAPANMAZ** (realizes-flow presence emsali) — yalnız bir `satisfies` senaryosuyla ya da
    belgeli-açık bırakılarak kapanır.
  - **PIN — neden `satisfies` gerekli:** bir outcome yalnızca bir **op**'u `covers` ediyorsa
    (senaryo op'u ASLA realize edemez — yalnız flow/process), o outcome'un satisfaction-bağı
    için TEK yol `satisfies`'tir; `realizes flow` onu asla covered yapamaz (op-kapsayan outcome
    flows/processes coverage'ında yoktur).
- `as <persona>` satırı **akış boyunca etkin aktörü değiştirir**.
- `step [<id> =] <Op> with <girdi> [after <stepId>] expect <dal> [{ assert'ler }]`:
  - Binding: **yalnız `expect Success` step'leri bağlanabilir (S3)**; sonraki
    step'lerin girdi VE assert'lerinde `<id>.result.<path>` çözülür (QA-12).
  - `expect` biçimleri `covers` ile aynı, **`callFailure` HARİÇ (S15)** — stub'lar
    senaryo-başı sabittir; callFailure ancak op-testte tetiklenir.
  - `after <stepId>`: yalnız `paginated` query'lerde (S4); hedef **aynı operation'ı
    çağıran, bağlanmış** bir step olmalı (önceki sayfanın devam imlecinden sonraki
    sayfa — karar #16).
- `advance time <N> minutes|hours|days`: pinli saati ilerletir (karar #13); `time`
  pini olmayan senaryoda `advance` → error.
- Senaryo `expect`'leri coverage'a SAYILIR (karar #12).
- **Fail-fast (P7, karar #14):** ilk beklenmeyen outcome'da VEYA ilk step-assert
  başarısızlığında senaryo durur; kalan step'ler "skipped".

## 10. Waive (§3.5, karar #7)

```
waive SubmitProposal covers NotAuthorized
  until "2026-12-31"
  because "tek-rollü op; yanlış-rol yolu P1 jenerik-kimlik testleriyle kapsanıyor"
```

- Kök-düzey; tek biçim: `waive <Op> covers <dal> [until "<YYYY-MM-DD>"] because "…"`
  (covers biçimleri §5 ile birebir). `because` **ZORUNLU** (karar #7).
- `until` opsiyonel (QA-19): tarih geçince waive hükümsüzleşir, dal uncovered'a geri
  döner (değerlendirme yalnız validator'da — İQ6; manifest `until`'ı verbatim taşır).
- **Stale-waive (m6):** waive hedefi tech'te artık yoksa (guard silinmiş, error
  kalkmış) → error (karşılıksız-hedef kuralı covers/expect ile aynı).
- Waive edilen dala ayrıca test de varsa → warning (çelişki: ya test ya waive).

## 11. Dal uzayı tablosu (§4.1 BİREBİR — karar #6/#10/#21)

Bir Operation'ın zorunlu dalları tech kaynağından **türetilir**:

| Dal | Kaynak (tech) | covers biçimi |
|---|---|---|
| Success | her op | `covers Success` |
| guard-id'li validation check | `validation { … for guard "x" }` | `covers guard "x"` |
| guard-id'li rule check | `rule { … for guard "y" }` | `covers guard "y"` |
| refinement sınır-ihlali (NotValid sınıfı) | op imzasında GEÇERLİ param-refinement — `p: T in 1..N` \| `in {a \| b}` (param başına BİR dal; ruleId `<param>.range`/`<param>.union` = tech manifest `violations[].ruleId`; entity-FIELD refinement'ı dal doğurmaz) | `covers guard "<param>.range"` / `covers guard "<param>.union"` (MEVCUT guard yüzeyi — yeni sözdizimi yok) |
| named error | `throws E` (E: ErrorDecl, taksonomi-pinli) | `covers error E` |
| NotAuthorized·roles | op'ta `roles` varsa | `covers NotAuthorized roles` |
| NotAuthorized·ownership | op'ta `ownership` varsa (`public`, `any`, `all` hariç — any/all ihlal-edilemez, dal türetilmez; waive yazma → stale-error §3.5) | `covers NotAuthorized ownership` |
| NotAuthorized·permit | op'ta `permit when` varsa | `covers NotAuthorized permit` |
| NotAuthorized·scope | op'ta `scope` varsa | `covers NotAuthorized scope` |
| anonim NotValid | id'siz validation check'i varsa (tek dal) | `covers NotValid` |
| anonim NotProcessable | id'siz rule check'i varsa (tek dal) | `covers NotProcessable` |
| callFailure | **stub'lanabilir hedefli** (`external`\|`uncharted` BoundaryOp) `calls … compensate with …` olan her calls | `covers callFailure <Ext.Op>` |

- **Anonim katlama (S5):** id'siz validation check'leri TEK "anonim NotValid" dalına,
  id'siz rule check'leri TEK "anonim NotProcessable" dalına katlanır. Linked bağlamda
  id'siz check'li op'a info: "dal-düzeyi coverage için `for guard` önerilir" — bunu
  tech'e iyileştirme önerisi olarak taşı.
- **İç-modül compensate'li calls dal DOĞURMAZ (S14):** iç calls stub'lanamaz →
  failure'ı deterministik tetiklenemez; uses-tech node'una info ile listelenir.
- **NotAuthenticated-pinli `throws E` (m4):** taksonomi-SINIFI olarak NotAuthenticated
  dal uzayına girmez (P1); ama NotAuthenticated'a pinli **named error** yine
  `covers error E` dalıdır.
- **Guard-id tekilliği (S17):** op-içi `validation ∪ rule` birleşiminde guard-id'ler
  tekil olmalı; ihlal qa link-time **error** (referanssız da PROAKTİF) — düzeltme yeri
  TECH'tir.
- Dal uzayına GİRMEYENLER (NotAuthenticated, ServerError, sayfalama, consistency,
  invariant, idempotent/concurrency): `tech-to-qa-translation.md` §F.

## 12. Keyword tuzakları (yazım-anı)

- **Karşılaştırma tek `=`** (`==` parse HATASI); `!=`, `>`, `<`, `>=`, `<=` ve **`in`**
  (üyelik — ADR-0038 K12; sağ YALNIZ küme-şekli `{a|b}` | to-many path, `in 5` parse
  HATASI) var; Expr'de `not` YOK (`not` yalnız `not emitted` / `not called` assert biçimidir).
- **ID-biçimli qa keyword'leri path segmenti OLABİLİR** (`s1.result.id`, `result`,
  `count`, `state`, `page`, `time`… — TokenBuilder çözer, İ1). TEK İSTİSNA — alan/param
  adı OLAMAZ: **`and or sum of true false`** (EXPR_VOCABULARY — parse hatası verir).
  Çakışan alan adını yeniden adlandırt.
- **İQ4 — tech tarafı tuzağı:** `.tcdsl` dosyalarında tech-keyword'leri alan/param adı
  OLAMAZ (`note`, `size` fiilen çarpar). Bu qa'nın değil TECH'in sınırıdır — tech
  dosyasında çakışma görürsen `teknik-analiz` ile yeniden adlandırt (`remark`, `boy`).
- **S20 — `uses` anlam farkı:** frontend DSL'de `uses` bir op-arayüzü bildirir; qa'da
  **kaynak bağlar** (`uses tech/flows`). Cross-grammar keyword sızıntısı yoktur; anlam
  bağlamdan nettir — iki DSL arasında geçiş yaparken karıştırma.
- **`@owner` bir annotation'dır, `owner` GLOBAL keyword DEĞİLDİR (v3.1.0):** `owner`
  yalnız `@owner(` bağlamında keyword; alan-anahtarı (`owner: musteri`), bind adı ve
  persona adı olarak YAŞAMAYA DEVAM eder. `owned by` yazımı YOKTUR (bilinçli — iki
  bare-keyword'ü rezerve ederdi).
- **`[` / `]` NOKTALAMADIR (v4.0.0):** keyword eklemez, identifier'larla çakışamaz;
  liste-literal her QaValue konumunda geçerlidir (dataset / inline-input / seed /
  stub-returns / event-payload / obje-literal içi / iç-içe). `list of` hedefe skaler
  yazım error; boş koleksiyon `[]` ile beyan edilir (alansız bırakmak error).
- Saat pini offset ZORUNLU: `"2026-07-02T10:00:00Z"` (offset'siz ISO → error, QA-15).
- `advance time` birimleri: `minutes | hours | days` (başka birim yok).
- NotAuthenticated / ServerError **grammar keyword'ü DEĞİLDİR** — dal değiller; S10
  türetiminde ve üreteç-politikalarında (P1/P2/P8) yaşarlar. `covers ServerError`
  yazılamaz; dış-çöküş dalı `covers callFailure <Ext.Op>` ile yazılır.
