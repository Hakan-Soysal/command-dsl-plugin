# Aile kapısı — Manifest-türevli completeness + K1/K2 yapısal sadakat denetimi (devret-sonrası)

> **Bu dosya iki kapı adımını tanımlar:** (a) COMPLETENESS denetimi (T3.1 — §0–§4) ve (b) K1/K2 YAPISAL SADAKAT
> denetimi (T3.2 — §K). Her ikisini de **aile kendi koşar; paketin `compliant:true` öz-beyanına güvenmez.**
> KAPSAM DIŞI olan tek şey **gap-çözme** (kayıtlı policy uygula / DUR-sor) — o M5'tir (T5.2). Bu kapı yalnız
> "düştü mü, kapsandı mı, sadık üretildi mi" sorularını yanıtlar; çözmez, yalnız RED verir.

## 0. Neden bu kapı var (amaç-odaklı)

Paket (community generator) hem üretilmiş kodu hem onun öz-raporunu (`build-report`) hem de — kötü tasarımda —
testlerini üretir. Bir construct'ı **sessizce düşüren** paket, onu ne `build-report`'a yazar ne de test eder →
kapı yalnız pakete bakarsa **yanlış-yeşil** olur (dairesel / self-certifying). Doubt-driven Bulgu #1.

Daireselliği kıran tek nokta: **enumerasyon ground-truth'u = aile-sahibi `manifest.json` / `operations.json`.**
teknik-analiz onu üretti → aile **her construct'ı zaten kendi contract'ından bilir**. Kapı envanteri paketten
SORMAZ; kendi manifest'inden çıkarır, sonra paketin çıktısını (build-report + conformance spec) bu envantere
**karşı** denetler.

> **KAYNAK MANIFEST, PAKET ÖZ-RAPORU DEĞİL.** (Kapının değişmez ilkesi: kaynak manifest, paket öz-raporu değil.)
> Completeness enumerasyonu **MANIFEST'ten** (`manifest.json` / `operations.json` = aile-sahibi ground-truth)
> yapılır; paketin `build-report`'undan DEĞİL. build-report yalnız **kontrol hedefidir** (her enumerate
> construct orada realized mı?), envanter kaynağı değil. Paket bir construct'ı build-report'ta gizlese bile
> manifest onu gösterir → kapı yakalar.

İSTİSNA (no-silent-loss sinyali): üreteç **exit≠0** veya `build-report.constructs[].status == "unsupported"`
okunabilir — bu bir **silent-drop sinyalidir**, sanctioned. Ama envanterin kendisi yine manifest'ten çıkar.
(`silentDrops` diye bir JSON ALANI YOKTUR — onu arama; exit-code ve `status` kullanılır.)

---

## 1. Step 5.1 — Construct envanterini MANIFEST'ten enumerate et

Kaynak: `manifest.json` (linked mode → `contract: ./operations.json`). Aşağıdaki küme **gerçek fixture**
(`CoreTemplate1/tests/fixtures/manifest.json`) yapısına göre, her construct'ın **gerçekte yaşadığı yere**
göre map'lenmiştir.

### 1.1 Top-level koleksiyonlar (manifest kökünden)

Her birinin her elemanı bir enumerate-edilebilir construct'tır:

| Koleksiyon | Manifest yolu | Fixture örneği |
|---|---|---|
| `operations` | `manifest.operations[]` | CreateInvoice, GetInvoice, ListInvoices, WriteAuditLog |
| `entities` | `manifest.entities[]` | Invoice, AuditLog |
| `types` | `manifest.types[]` | Money, InvoiceStatus, AuditMeta, AuditKind |
| `errors` | `manifest.errors[]` | DuplicateInvoice |
| `events` | `manifest.events[]` | InvoiceCreated |
| `subscriptions` | `manifest.subscriptions[]` | InvoiceCreated → Ops.WriteAuditLog |
| `externals` | `manifest.externals[]` | PaymentGateway (charge, refund) |
| `uncharted` | `manifest.uncharted[]` | LegacyLedger (op: post, entity: LedgerEntry, type: LedgerKind) |
| `callEdges` | `manifest.callEdges[]` | CreateInvoice→charge, WriteAuditLog→post |

> **NOT (fixture gerçeği):** `operations` koleksiyonunun **var olduğu** doğrulanmıştır
> (`assert 'operations' in m` geçer). `externals` / `uncharted` kendi içlerinde **iç-içe** op/entity/type
> taşır (nested constructs) — bunlar da enumerate edilir, gizli kalamaz.

### 1.2 Op-seviyesi alanlar (her `operations[]` elemanından)

Bir operasyon, gövdesinde şu construct-taşıyan alanları barındırır — **yalnız bunlar op-level'dır**:

`validation`, `rule`, `throws`, `idempotent`, `pagination`, `roles`, `ownership`, `scopes`,
`consistency`, `emits`, `serving`, `visibility`, `ext`.

Fixture kanıtı (op `CreateInvoice`): `validation=[amount>0]`, `rule=[amount<=creditLimit]`,
`throws=["DuplicateInvoice"]`, `idempotent={keys:[customerId]}`, `emits=["InvoiceCreated"]`,
`roles=["Clerk"]`, `consistency={risk:strong}`, `serving=[rest POST, grpc]`, `visibility="exposed"`,
`ext=[audit.logged, metric.emit]`. (`GetInvoice`/`ListInvoices`/`WriteAuditLog` boş veya farklı dolu
alanlarla aynı şemayı taşır — ör. `ListInvoices.pagination={cursor}`, `WriteAuditLog.scopes=["audit:write"]`,
`WriteAuditLog.ownership="own"`.)

> **FIXTURE-FİDELİTE DÜZELTMESİ — task'ın düz listesindeki 3 alan op-level DEĞİL; gerçek yerlerinden enumerate et:**
> - **`invariant`** → op'ta değil, **entity'de** yaşar: `manifest.entities[].invariants[]`
>   (`Invoice.invariants=[amount>=0]`, `AuditLog.invariants=[seq>=0]`), ayrıca `uncharted[].entities[].invariants`.
> - **`compensate`** → op'ta değil, **callEdge'de** yaşar: `manifest.callEdges[].compensate`
>   (`CreateInvoice→charge` için `compensate = {system:PaymentGateway, op:refund}`; `WriteAuditLog→post` için `null`).
> - **`ext`** → **çok-seviyeli**: op (`operations[].ext`), entity-field (`entities[].fields[].ext`), type
>   (`types[].ext` ve `types[].fields[].ext`), event-payload (`events[].payload[].ext`), signature-param
>   (`operations[].signature.params[].ext`), deployable (`deployables[].ext`), module (`modules[].ext`),
>   uncharted-param. Yalnız op-level varsayma — tüm seviyelerdeki `ext` enumerate edilir.

### 1.3 `coverage` + `meta` blok kontrolü (manifest'ten okunan kapı sinyalleri)

Manifest iki ilgili blok taşır; **gerçek fixture'da konumları şöyledir:**

- **`manifest.coverage`** = `{ unrealizedBusinessOps: [], uncoveredEntities: [] }`
  - `unrealizedBusinessOps` **boş değilse** → bir iş-operasyonu Tech DSL'de gerçeklenmemiş → **kapı RED**.
  - `uncoveredEntities` **boş değilse** → bir entity hiçbir op tarafından kapsanmamış → **kapı RED**.
- **`manifest.meta`** = `{ hasErrors: false, errorCount: 0 }`
  - **`meta.hasErrors == true` ⇒ kapı RED.** (Manifest'in kendisi hatalı/eksik üretilmiş — güvenilemez.)

> **TASK-METNİ DÜZELTMESİ (fixture ground-truth):** Task §5.1 `hasErrors`'u `coverage` bloğunda konumlandırır;
> **gerçek fixture'da `hasErrors` `meta` bloğundadır** (`coverage` yalnız iki listeyi taşır). Niyet korunur
> (hasErrors=true ⇒ RED), konum gerçek yapıya göre `meta.hasErrors` olarak yazılmıştır. Implementasyon
> `meta.hasErrors`'u okumalı; `coverage` içinde aramamalı.

---

## 2. Step 5.2 — Realized + tested çapraz-kontrol

**Kaynak = manifest (aile); kontrol hedefi = build-report + conformance spec.** §1'de enumerate edilen
HER construct için iki koşul birlikte aranır:

### 2.1 Realized mı? (build-report'ta)

`build-report` şeması = `emissionContract.buildReportSchema.constructs = "[{construct, id, status}]"`
(descriptor T1.1; her elemanda `construct`, `id`, `status`). Bir enumerate construct için:

- build-report'ta eşleşen `{construct, id}` kaydının **`status == "realized"`** olması GEREKİR, **VEYA**
- `status == "unsupported"` ise → **gap-protokolüyle dispozisyonlu** olmalı (registry'de/raporda karşılığı var).
  Dispozisyonsuz `unsupported` → **kapı RED** (sessiz geçilemez).
- Eşleşen kayıt **yoksa** (build-report o construct'tan hiç söz etmiyor) → paket onu **sessizce düşürmüş** →
  **kapı RED**. (Kaynak manifest olduğu için "build-report yazmamış" bir mazeret değil, bir RED sinyalidir.)
- Üreteç **exit≠0** ise → bütün etkilenen construct'lar dispozisyonlu olmak zorunda; değilse **kapı RED**.

### 2.2 Tested mi? (conformance spec'i var mı)

Her enumerate construct'ın, T3.3 conformance spec kümesinde **bir spec'i** olmalı (ör. `throws=DuplicateInvoice`
için "duplicate kur → CreateInvoice çağır → Result NotProcessable, code=DuplicateInvoice"). Bu kapı **yalnız
"spec VAR MI" kontrolü** yapar — spec ÜRETMEZ (üretim = T3.3). Spec eksik → **kapı RED**.

> **DİKKAT — kaynak yine manifest.** "Hangi construct'lar test edilmeli?" sorusunun cevabı manifest'ten gelir,
> paketin "ben şunları test ettim" listesinden değil. Paket bir construct'a hiç spec yazmadıysa, manifest o
> construct'ı gösterdiği için kapı eksikliği görür.

---

## 3. Step 6 — Kapı senaryoları (kabul davranışı, açık)

Aşağıdaki üç senaryo kapının davranışını bağlayıcı biçimde tanımlar:

### 3.1 (6.1) Pozitif — gerçek fixture PASS
Gerçek fixture `manifest.json` + gerçek techgen `build-report`: §1'de enumerate edilen her construct
build-report'ta `realized` (veya dispozisyonlu) **VE** bir conformance spec'i var; `meta.hasErrors=false`;
`coverage` listeleri boş → **kapı PASS**.

### 3.2 (6.2) Negatif — construct-düşüren sahte paket RED
Sahte bir `build-report` üretilir: manifest'te `CreateInvoice.throws = ["DuplicateInvoice"]` **VARDIR**, ama
sahte build-report'ta `DuplicateInvoice` construct'ı `realized` değildir + spec'i yoktur. Enumerasyon
**manifest'ten** yapıldığı için kapı DuplicateInvoice'u **görür** (paket onu build-report'ta gizleyebilir, ama
manifest'ten saklayamaz) → §2.1 "eşleşen realized kayıt yok" + §2.2 "spec yok" → **kapı RED**.
Bu, daireselliğin kırıldığı kanıt-noktasıdır: paket öz-raporuyla kapıyı kandıramaz.

### 3.3 (6.3) Negatif — hasErrors RED
`manifest.meta.hasErrors == true` olan bir fixture → §1.3 gereği **kapı RED** (manifest'in kendisi güvenilmez;
hiçbir construct denetimi anlamlı değildir).

---

## §K. K1/K2 — Yapısal sadakat denetimi (T3.2 — AİLE koşar, paket öz-beyanı değil)

> **Bu adımın değişmez ilkesi (verbatim):** **aile kendi koşar, compliant öz-beyanı yetmez.** Paket descriptor'da
> `gapProtocol.compliant=true` yazabilir; bu **tek başına öz-beyandır, yetmez** (Doubt-driven Bulgu #2). Gerçek
> zorlama burada: aile K1/K2'yi **contract vs üretilmiş-yüzey** yapısal kıyasıyla **kendisi** koşar — paket-içi
> runtime'a girmeden, yalnız **post-gen artefaktlardan** (contract = `operations.json`/`manifest.json`; üretilmiş
> yüzey = handler partial aileleri `{op}.Guards.g.cs`/`{op}.Throws.g.cs` vb.). İmprovise eden paket `compliant:true`
> yazsa bile kapıdan **geçemez**. Bu kapı yalnız **RED** verir; gap'i ÇÖZMEZ (çözüm = M5 / T5.2).

Kaynak rehber: descriptor `emissionContract.handlerSurfaceMap` (üye-adı haritası — hangi `.g.cs` üyesi hangi
construct'ı taşır). Aile bu haritayla contract construct'larını üretilmiş yüzey üyeleriyle hizalar, sonra iki
yapısal koşulu denetler.

### K.1 — Predicate-input bağlanabilirliği denetimi

**Kapsam:** Her predicate construct'ı — `validation` (Validation_N), `rule` (Rule_N) ve entity'deki `invariant`
(Invariant_N) — bir **input-record** taşır (predicate'in okuduğu alanlar). Bu input-record'un **her alanı**, aşağıdaki
**dört kaynaktan TAM BİRİNE** bağlanabilir olmalı (`handlerSurfaceMap` rehberliğinde):

1. **request-param** — op'un request/signature param'ı (`operations[].signature.params[]`).
2. **entity-field** — op'un dokunduğu entity'nin alanı (`entities[].fields[]`).
3. **boundary-dönüş** — bir dış-çağrının (`I{External}` saga client) dönüş değeri (`callEdges[]` / `externals[]`).
4. **`build-report.policy`** — üreteç-policy'sinin sağladığı parametrik bağlam (`build-report.policies`).

**Karar:**
- Alanın bu dört kaynaktan **birine** bağlanabildiği kanıtlanırsa → o alan **bağlı**.
- Hiçbirine bağlanamayan alan → **GAP → kapı RED.** (Alan "havada" — predicate sadık üretilemez.)
- **YASAK:** bağlanamayan alanı "decimal varsay" / tip-uydur diye GEÇME — bu improvisation'dır, GAP→RED.

**PoC GAP #1 (yakalanır):** `ResourceCreditLimit` predicate-input'u — ne request-param, ne entity-field, ne
boundary-dönüş, ne de bir build-report.policy ona karşılık gelir → **hiçbir kaynağa bağlanamaz** → **K1 RED.**
(PoC'de bu sessizce "decimal varsayıldı" = improvisation; kapı bunu RED'ler.)

### K.2 — Failable → named-error eşlemesi denetimi

**Kapsam:** Başarısız olabilen (failable) **her** `validation`/`rule`, ihlal edildiğinde bir hata fırlatır. Bu
hata, op'un `operations.json` **throws kataloğunda** (`operations[].throws[]` → adlı `errors[]`) bir **adlı-hataya**
eşlenmiş olmalı (üretilmiş yüzeyde `{op}.Throws.g.cs` adlı-hata fabrikası).

**Karar:**
- Failable predicate'in ihlali, throws kataloğunda bir adlı-hataya eşleniyorsa → **eşlenmiş**.
- Eşlenmeyen (adsız fırlatan / katalogda karşılığı olmayan) failable → **GAP → kapı RED.** (Hata tipi belirsiz —
  Result yüzeyi sadık üretilemez.)

**PoC GAP #2 (yakalanır):** `Rule_0` failable rule'u — ihlal edildiğinde **adsız** bir hata üretir; `operations.json`
throws kataloğunda buna karşılık gelen adlı-hata **yoktur** → **K2 RED.**

> **NOT — denetim post-gen artefakttan, paket beyanından değil.** "Hangi alan bağlanmalı / hangi failable adlanmalı?"
> sorularının cevabı **contract'tan** (operations.json/manifest.json = aile-sahibi) çıkar; paketin "ben bağladım /
> ben adladım" beyanından değil. Paket bir alanı sessizce uydursa bile contract o alanın kaynağını göstermez →
> kapı bağlanamazlığı görür. Aynı K1/K2 paket-içinde fill-öncesi erken-DUR için de koşar (B.4.1); aile **kapıda
> bağımsız** doğrular — "uyum = öz-beyan" zaafı böyle kapanır.

### K.3 — Kapı senaryoları (K1/K2 kabul davranışı, açık ve bağlayıcı)

Aşağıdaki üç senaryo K1/K2 davranışını bağlayıcı biçimde tanımlar (yapısal kabul — belgelenmiş mantık):

#### (K-6.1) Pozitif — sağlam contract PASS
Tüm predicate input-record alanları dört kaynaktan birine bağlanan **VE** tüm failable validation/rule'ları throws
kataloğunda adlı-hataya eşlenen bir contract → **K1 PASS ∧ K2 PASS** → bu adım kapıyı geçirir.

#### (K-6.2) Negatif — K1 RED (PoC GAP #1)
`ResourceCreditLimit` predicate-input'u dört kaynağın hiçbirine bağlanamayan contract → K.1 "bağlanamayan alan →
GAP" → **K1 RED.** (improvisation/"decimal varsay" engellendi.)

#### (K-6.3) Negatif — K2 RED (PoC GAP #2)
Failable `Rule_0` rule'unun throws kataloğunda adlı-hata karşılığı olmayan contract → K.2 "eşlenmeyen failable →
GAP" → **K2 RED.**

Üç senaryonun hepsinde karar **aile-koşar contract-vs-yüzey kıyasından** çıkar; paketin `compliant:true`
öz-beyanından DEĞİL. (Tekrar: **aile kendi koşar, compliant öz-beyanı yetmez.**)

---

## §G. Kapı orkestrasyonu — altı denetimin sıralı koşumu (A.4 — 6 madde)

> **Bu bölüm denetimleri YENİDEN TANIMLAMAZ.** Yukarıda zaten tanımlı completeness (§0–§4, T3.1) ve
> K1/K2 (§K, T3.2) adımlarını **sıraya dizer** + iki yeni adımı (provenance, conformance) ekler. Kapı
> **üretmez/çözmez**; herhangi bir adım **RED** → kullanıcıya raporla, **"sync tamam" deme** (gap-çözme = M5).

Paket Faz 5'te RUN modunda tetiklendikten **sonra** aile şu **altı denetimi sırayla** koşar:

### G.1 — Build (madde 1)
`descriptor.build.command` çalıştırılır → **exit 0** beklenir. exit≠0 → **RED**. (Bu, üreteç-nötr bir
descriptor alanıdır; .NET varsayılmaz. Üretim değil **doğrulama** — sanctioned "others we validate".)

### G.2 — No-silent-loss (madde 2)
Silent-drop sinyali iki yoldan okunur:
- üreteç **exit≠0**, **VEYA**
- `build-report.constructs[].status ∈ { unsupported, silentDrop }`.

Bu sinyalle işaretlenen construct'ların **hepsi gap-protokolüyle dispozisyonlu** olmalı; dispozisyonsuz biri
varsa → **RED**. İki status'ün anlamı ayrıdır: **`silentDrop`** = gerçek-düşüş sinyali (dispozisyon
GEREKTİRİR), **`unsupported`** = bildirilen/bilinen boşluk (registry/raporda dispozisyonlu). Üreteç exit≠0
ise etkilenen tüm construct'lar dispozisyonlu olmak zorundadır (§2.1).

> **`silentDrops` JSON alanı DEĞİL — sinyal exit-code/status.** Build-report'ta `silentDrops` diye bir alan
> YOKTUR; onu arama. No-silent-loss kararı üreteç **exit-code**'undan ve `constructs[].status` okumasından
> çıkar. (Bu, completeness envanterinin manifest-türevli olması ilkesine **istisnadır**: build-report
> exit-code/`status` okuması — yalnız no-silent-loss için — sanctioned'dır; A.4 madde 2.)

### G.3 — Completeness (madde 3, T3.1 — §0–§4)
§1'de tanımlı gibi envanter **`manifest.json`/`operations.json`'dan** (aile-sahibi ground-truth) enumerate
edilir; paketin "neyi realized saydığı"ndan **DEĞİL**. §2'deki çapraz-kontrolle her construct realized
(veya dispozisyonlu) + conformance-spec'li mi denetlenir; ayrıca `meta.hasErrors=true` ⇒ RED. Eksik → **RED**.
(Tek sanctioned istisna: no-silent-loss'un build-report exit-code/`status` okuması — G.2.)

### G.4 — K1/K2 yapısal sadakat (madde 4, T3.2 — §K)
§K'da tanımlı gibi aile **kendi koşar** (`compliant:true` öz-beyanı yetmez): K1 = predicate-input dört
kaynaktan birine bağlanabilmeli (§K.1), K2 = failable→named-error eşlemesi (§K.2). Geçmeyen → **RED**.

### G.5 — Owned-tree dokunulmazlığı / provenance (madde 5)
`provenance` (sha/owned-tree kaydı) ile **`gen/**` elle düzenlenmemiş** olduğu doğrulanır. Üretilen
owned-tree'nin sha'ları provenance kaydıyla eşleşmiyorsa (insan `gen/**`'e dokunmuş) → **RED**. (Human-seam
`*.Logic.cs`/`Program.cs` bu kapsamın dışıdır — yalnız `gen/**` denetlenir.)

### G.6 — Conformance (madde 6, T3.3 spec'leri + T4.4 adapter)
Aile-sahibi dil-nötr **SPEC'ler** (T3.3 çıktısı), paketin sağladığı dil-özgül **execution ADAPTER**'ıyla
(T4.4) koşulur — descriptor alanı **`descriptor.conformance.run`** (üreteç-nötr; aile bu komutu çağırır).
Aile N spec'i + üretilmiş app yolunu adapter'a besler; adapter her spec'i koşar, herhangi biri `IsFail` ise
**RED**. **A3:** assertion SPEC'tedir (`assert.resultType`/`assert.code`, contract-türevli, aile-sahibi);
paket assertion'ı **kuramaz** — yalnız "bir op çağır + Result incele" harness'ını sağlar. (techgen örneğinde
`conformance.run` = `CONFORMANCE_APP=<built App.dll> CONFORMANCE_SPECS=<spec dir> dotnet test …`; bu yalnız
**örnektir** — kapı literal `dotnet test` değil descriptor'ın `conformance.run`'ını çağırır.)

> **Karar kuralı (altı adım):** sıra **G.1→G.6**; herhangi bir adım RED → kapı RED → kullanıcıya **raporla**,
> **"sync tamam" deme**. Hepsi PASS → sync tamam. Kapı yalnız RED verir; **gap'i çözmez** (M5 / T5.2).

---

## 4. Anti-patterns (yapma)

- **Envanteri build-report'tan ALMA** → daireselliği kırma noktası tam burası. Envanter **manifest'ten**.
- **`silentDrops` JSON alanı ARAMA** → yok. Silent-drop sinyali = üreteç **exit-code** / `status=="unsupported"`.
- **`unsupported`'ı SESSİZ GEÇME** → gap-dispozisyonu şarttır; dispozisyonsuz unsupported = RED.
- **K1/K2 yapısal denetimini paketin `compliant:true` beyanına DEVRETME** → aile kendi koşar (§K). Completeness §0–§4'te değil, ayrı §K adımında.
- **Conformance spec ÜRETME** → T3.3'ün işi; bu kapı yalnız "spec var mı" diye bakar.
- **build-report ŞEMASINI değiştirme** → techgen / M4'ün işi.
- **(K1/K2) `compliant:true` öz-beyanına GÜVENME** → aile K1/K2'yi contract-vs-yüzey kıyasıyla kendi koşar (§K).
- **(K1/K2) PAKET-İÇİ RUNTIME'a GİRME** → post-gen artefakt (contract + üretilmiş `.g.cs` yüzeyi) yeter.
- **(K1/K2) bağlanamayan alanı "decimal/tip varsay" diye GEÇME** → improvisation = GAP→RED; çözüm M5.

## 5. Out of scope (bu dosya)

- Conformance spec ÜRETİMİ → **T3.3** (burada yalnız varlık-kontrolü).
- `build-report` şema değişikliği → **techgen (M4)**.
- Gap çözümü / kayıtlı policy uygulama → **M5** (kapı yalnız RED verir; çözmez).

> **NOT (T3.2 reconciliation):** K1 (predicate-input bağlanabilirliği) + K2 (failable→named-error) yapısal sadakat
> denetimi artık **bu dosyanın §K bölümündedir** (eskiden T3.2'ye dış-atıf vardı). Completeness (§0–§4) ile aynı
> kapının iki adımıdır; ikisi de aile-koşar. Yalnız gap-çözme (M5) hâlâ kapsam dışı.
