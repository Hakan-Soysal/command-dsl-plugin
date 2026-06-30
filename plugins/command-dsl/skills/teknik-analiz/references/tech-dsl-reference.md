# TechDsl (`.tcdsl`) — Construct Referansı

> Kaynak: `CommandDSL/tech-dsl.langium` + `shared.langium` + `docs/technical/CONTEXT.md`
> glossary. Her başlık: **sözdizimi · anlam · validator kısıtı**. Dosya bağımsız (`grammar
> TechDsl`); `import './shared'` ile birleşik `Expr` alt-grameri gelir.
>
> **Emit sırası (dependency-order):** `contract`/`standalone` → `rolemap` → `import` →
> `extension` → `deployable` → `module`/`external`/`uncharted`. Referans verilen önce gelir.

---

## 0. Model başlığı & mod

**`contract` (linked) ↔ `standalone` (karşılıklı dışlayıcı):**
```
contract './katalog.operations.json'      // LINKED: realizes hedeflerini bu JSON'dan çözer
standalone                                 // saf-tech: realizes/contract YASAK
```
- **Bu skill her zaman `contract` (linked) üretir** — fidelity check'leri ancak contract'la koşar.
- `contract` yolu `.tcdsl`'in konumuna göre çözülür. JSON `meta.schemaVersion` **2** olmalı
  (değilse `checkContractVersion` → error).

**`rolemap`** (workspace-kapsamlı, linked-only tablo): business aktörünü tech rol(ler)ine M:N eşler.
```
rolemap {
  Manager -> can_approve, can_view
  ~ -> svc_job              // ~ = saf-teknik rol (business karşılığı yok; divergence atlar)
}
```
Anahtar = `operations.json` `actors[]` aktörü. Bir op'taki `roles` burada yoksa → typo warning.

**`import`** (Faz-2.5): `import './pack.tcdsl'` — yalnız bir pack'in `extension` bildirimlerini
getirir (model içeriği değil; getirilirse warning). Path-tabanlı, transitif değil.

**`extension`** (kullanıcı-tanımlı annotation şeması):
```
extension acme.audit { on operation, entity  arg level: string = "info" }
```
`on <site>` ∈ {operation, param, return, entity, field, type, enum, module, deployable}.

---

## 1. Topoloji

**`deployable`** — bağımsız deploy birimi (Docker image / C4 Container); bir+ `module` barındırır.
```
deployable Api { Orders, Billing }        // module/uncharted ID listesi
```
Varsayılan tek görünmez monolit; **yalnız >1 olunca bildir**. Module-arası çağrının in-process
mü ağ mı olduğunu belirler — **tutarlılığı değil**.

**`module`** — hem tutarlılık hem deploy sınırı; `operation` + `entity` sahibi. **Transaction bu
sınırı AŞMAZ**: module-arası **write** async/eventual (saga/outbox-event), **read** ise **senkron**
olabilir — kardeş module'ün **query** op'unu `calls` ile çağırarak (sonuç consistency-garantisiz;
§7, ADR-0030). **Entity'ler private:** bir module başka module'ün entity'sine erişemez (cross-module
veri YALNIZ operasyon çağrısıyla; entity-alanı YASAK, §2). Üreteç bunun için kod ÜRETİR.
```
module Orders { /* operation, entity, type, enum, error, event */ }
```
`realizes`'sız **saf-teknik module** (yalnız `type`/`enum` + stateless utility) meşru; state/iş
mantığı koyulursa → **SharedUtils warning**.

---

## 2. Entity

```
entity Order realizes Order {           // realizes: kaba (0..N) business entity ID('leri)
  id: OrderId                            // alan: ad : TypeRef
  lines: list of LineItem                // list of → koleksiyon (to-many)
  total: Money
  customerId: CustomerId sourceOfTruth(CRM.Customer)   // cross-module bağ (aşağı bkz.)
  invariant total.amount >= 0            // entity-düzeyi "her zaman doğru" (saf-tech)
  concurrency optimistic                 // lost-update koruması (entity başına ≤1)
}
```
- **Nötr-tipli alanlar** (teknik-only dahil); alan-düzeyi business eşleme YOK (kaba realizes).
- **`invariant <Expr>`**: path'ler composite `type` ve **intra-module** entity-ref'leri gezer;
  **cross-module entity navigasyonu → error**; `sum of`'suz to-many skaler bağlamda → error.
- **`concurrency optimistic`**: entity-başına ≤1 (2.→error); **uncharted entity'de → error**.
  `version` alanı YAZMA (mekanizma üreteçte).
- **`sourceOfTruth(Module.Entity)`**: cross-module bağın TEK yolu. İşaretli alan **skaler/ID**
  olmalı (entity/composite → error); hedef intra-module ise → warning (gereksiz).

**⚠ Cross-module entity-tipli alan YASAK** (`checkCrossModuleEntityField` → error): başka
module'ün entity'sine alan tutamazsın → **ID-skaler + sourceOfTruth** kullan. Intra-module
entity-tipli alan serbest.

---

## 3. Diğer module üyeleri (type / enum / error / event)

```
type Money { amount: Decimal  currency: String }    // value object / DTO (nötr tip)
enum OrderStatus { Pending  Cancelled  Completed }
error OrderNotCancellable : NotProcessable          // adlı hata + result-type (aşağı §6)
event OrderShipped { orderId: OrderId  shippedAt: Timestamp }   // yayın-olgusu (payload tipli)
```
- `type`/`enum` paylaşılanlar saf-teknik module'de (SharedUtils) yaşar.
- `event` payload alanları value/`type`/enum/`list of`/ID olmalı — **entity-tipli alan → error**
  (cross-module wire-DTO; ID taşı). Boş payload (`event Ping {}`) izinli.

---

## 4. Operation — imza & gövde

```
@rest(POST, "/orders/:id/cancel")               // serving (görünürlük) — §9
operation CancelOrder(id: OrderId): Unit realizes CancelPendingOrder {
  // … OpClause'lar (sıra serbest) …
}
@internal                                        // alternatif görünürlük işareti
operation Recalc(orderId: OrderId): Unit { … }
```
- **İmza açıktır** (iş'ten türetilemez): `(<param>: <TypeRef>, …): <TypeRef>`. `TypeRef` =
  `[list of] <ID>`.
- `realizes <BizOpID>` (0..1) — linked'de business işlemine bağ. Standalone'da yasak.
- **Komut/sorgu `access`'ten türer** (`deriveKind`): write-sınıfı access (creates/updates/
  deletes) veya yan-etkili `calls` → **komut**; yoksa **sorgu**.
- **Görünürlük zorunlu**: ≥1 serving (`@rest`…) **veya** `@internal` **veya** ≥1 `on` clause;
  hiçbiri yoksa → `checkVisibility` warning.

### OpClause'lar (hepsi op gövdesinde, §5–§7'de detay)
`roles · ownership · permit when · scope · access · validation · rule · throws · calls ·
idempotent by · emits · on · paginated by · consistency · note`

---

## 5. Yetki — üç dik eksen

```
roles Customer, Operator              // KİM (capability/RBAC); rolemap ile aktöre M:N; 401/403
ownership own                          // HANGİ satır: own|any|all|public|<relation>; 403
permit when actor.region = resource.owner.region    // ABAC öznitelik koşulu (op başına ≤1)
scope "hr:read", "hr:write"           // OAuth-stili opak kapsam (AND); manifest passthrough
```
- **`roles`** (`checkRoles`): rolemap'te yoksa typo warning; temsil ettiği aktör yetkili kümeyi
  aşarsa **güvenlik-zayıflatma warning**.
- **`ownership`** (`checkOwnershipDivergence`): genişlik kafesi `own<relation<any<all<public`.
  Business'tan **geniş** → weakening warning; `<relation>` business `relations[]`'te yoksa → warning.
- **`permit when`** (`checkAbac`): `resource` = op'un **tek write-hedefi** entity'si (0 veya ≥2 →
  error). `resource.*` path-scope denetlenir; `actor.*` **opak** (denetlenmez). Kök `actor.`/
  `resource.` olmalı.

---

## 6. Hata & sonuç taksonomisi

**6'lı result-type** (protokol-agnostik): Success · NotAuthenticated · NotAuthorized ·
NotValid · NotProcessable · ServerError. Wire-kod (400/422…) **üreteç tercihi**.

```
error InsufficientBalance : NotProcessable        // module üyesi; 4 taggable failure-tipinden biri
operation Transfer(from: Iban, to: Iban, amount: Money): Unit {
  throws InsufficientBalance, AccountFrozen          // salt-bildirim (tetikleyici/Expr YOK)
  access { reads Account as src by from  updates Account }   // src = kaynak Account (from anahtarı)
  validation { amount > 0 for guard "where:0" }      // INPUT-only → 400 (amount = param)
  rule { amount <= src.balance }                      // STATE → 422 (src = access-alias kökü)
}
```
**Provenance — ayraç verinin KÖKENİDİR, tipi değil (ADR-0031, ARTIK YAPISAL ENFORCE):**
- **`validation`** = **yalnız request datası** (input). Her path kökü `op.params` olmalı; **state'e
  referans → error** (`checkValidationInputScope`: "input-only; 'X' input parametresi değil →
  rule kullan"). Deterministik-fail (input değişmeden hep aynı sonuç). `@http.payload` ile gelen
  composite param'ın alanları da input'tur (`sum of order.lines.amount = order.total` gibi cross-field
  serbest). BoundaryOp (external/uncharted) `validation`'ı da input-only.
- **`rule`** = **data-bağımlı** (state); kökleri YALNIZ **bildirilen** üç kanaldan:
  (a) `op.params` (input — rule'da da serbest, ama state işareti DEĞİL),
  (b) **`access reads/updates/deletes`** entity'si — çıplak entity-adı (tek-instance) veya **`as <alias>`**
      (`src.balance`); `creates` HARİÇ (henüz state yok),
  (c) **read-only call sonucu** — `calls … as <alias>` (`cap.score`; §7).
  Bildirilmemiş kök → **"gizli veri bağımlılığı" error**. Aynı tipten ≥2 read'i çıplak adla gezmek →
  **B3 belirsizlik error** ("`as <alias> by <param>` ile ayır"). TÜM kökleri param olan rule →
  **misclassification warning** ("`validation` daha doğru"). state-in-validation = error / pure-input-rule
  = warning (asimetrik).
- **Instance-binding** (Model 1, §7 access): `reads Account as src by from` — `as` = isim, `by` =
  instance'ı seçen **input key'i** (`from` param'ı). Tek-belirsizsiz instance → çıplak ad yeter.
- `for guard "<id>"` → business guard'ına link (dik eksen; provenance'tan bağımsız); ifade business'tan
  saparsa `checkExprDivergence` → **"differs" warning**. Link'siz tech check → info.
- `throws` hedefi module-level `error`'a çözülür (dangling → linker error). ResultType ∈
  {NotAuthenticated, NotAuthorized, NotValid, NotProcessable}.

---

## 7. Erişim, etkileşim & tutarlılık

**`access`** — CRUD-net entity erişim kümesi (+ rule için instance-binding):
```
access { reads Cart  creates Order  updates Order  deletes TempFile }
access { reads Account as src by from }        // instance-binding: alias + input-key (rule kökü)
```
`creates`/`updates`/`deletes` = write-sınıfı. Entity ref'leri **tech** entity'lere çözülür.
`checkEntityCoverage`: realized op'un business write-set entity'sinin her biri **aynı module'de**
realizes edilmeli (yoksa error). `checkAccessDivergence`: business salt-okunur + tech write →
güvenlik-zayıflatma warning.
**Instance-binding (`as <alias> by <param>`, ADDİTİF — `entities` listesi değişmez):** bir reads
effect'ine isim (`as src`) + onu seçen input-key (`by from`, op param'ına çözülür) verir; `rule`
o alias'ı state-kökü olarak gezer (`src.balance`). Aynı tipten ≥2 instance gerekiyorsa her birini
ayrı `reads … as … by …` ile bildir (transfer: `reads Account as src by from`, `reads Account as
dst by to`). Tek-instance'ta çıplak entity-adı yeter. (Bkz. §6 provenance.)

**`calls`** — cross-boundary etkileşim (saga adımı VE/VEYA cross-module senkron read):
```
calls Stripe.Charge compensate with Stripe.Refund     // external/uncharted yan-etkili çağrı (saga)
calls Billing.GetLimit as cap                          // CROSS-MODULE QUERY (ADR-0030): senkron read
```
Hedef nitelikli `System.Op` — **external/uncharted** boundary-op'u VEYA **kardeş `module`'ün
`operation`'ı** (ADR-0030, `CallableSystem += Module`). **`calls` ARGÜMANSIZDIR** (`calls X.Y(arg)`
parse hatası; arg-geçişi gövde-seam, üreteç wire'lar). Opsiyonel **`as <alias>`** → sonucu adlandırır
(`rule { amount <= cap }`). İki kullanım:
- **Cross-module (kardeş module hedefi) — yalnız QUERY** (ADR-0030 K2): hedef op **query** olmalı
  (write-sınıfı access → command → error: "cross-module write transaction'ı aşmaz; event/saga
  kullan"); hedef **`@internal` olmamalı** (module-private → error). Senkron read AMA
  **consistency-garantisiz** → manifest `callEdges[].{crossModule:true, consistency:'eventual',
  kind:'module'}` (TÜREV; `riskOf`/op-`{risk,mode}` DOKUNULMAZ). Cross-module **write** yine async
  (event/saga; `calls` ile değil).
- **External/uncharted** — yan-etkili (Stripe.Charge) veya read-only. Kompanzatör (`compensate with`)
  **aynı sistemin** op'u olmalı (farklı → error; self → warning).
- **Rule-gateability (ADR-0030 K4):** bir call sonucu `rule`'da gate-edilebilir **⟺ hedef query**.
  Module hedefinde query `access`'ten türev (K2 garantisi); **boundary-op**'ta `readonly` marker'la
  bildirilir (§8) — işaretsiz boundary-op sonucu gate edilirse → error.

**`consistency`** (cross-module write tutarlılığı):
```
consistency async        // ya da: consistency durable
```
`risk` TÜREV (cross-module write varsa eventual). `mode` **authored**; cross-write var ama mode
yoksa → `checkConsistencyMode` warning. Read/intra → mode anlamsız.

**`idempotent by`** (retry-safe):
```
idempotent by orderId, lineNo     // key(ler) op'un INPUT param'larına çözülür
```
`by` zorunlu (bare `idempotent` YOK). Param değilse → linker error. Op başına ≤1.

**`emits` / `on`** (pub/sub):
```
emits OrderShipped, InventoryReserved              // producer ucu (module event'ine ref)
emits OrderShipped -> Billing.OnShipped            // (alternatif) publisher-side routing (-> ile)
on Sales.OrderPlaced, Sales.OrderCancelled         // consumer ucu (op'un kendisi handler)
```
`on` cross-module event'lere abone olunur (nitelikli `Module.Event`). Same-module `on` → warning.
`on` bir görünürlük kaynağıdır (`@internal` gerekmez).

**`paginated by`** (yalnız list-dönen sorgu):
```
paginated by cursor createdAt desc, id asc size 50     // ya da: paginated by offset name asc
```
`direction` her anahtarda zorunlu; `field` dönülen `list of X`'in X'inin alanına çözülür.
**Komutta veya list-dönmeyende → error.** Op başına ≤1.

**`note`** — serbest metin; doğrulanmaz, AST'ye/manifest'e taşınır.

---

## 8. External / Uncharted (üretilmeyen sınırlar)

```
external Stripe {                               // 3.parti (sahibi sen değilsin)
  @rest(POST, "/v1/charges")
  operation Charge(amount: Money): ChargeId { validation { amount > 0 } }   // yan-etkili (compensate-eligible)
  readonly operation Score(ref: String): Risk   // read-only marker → sonucu rule'da gate-edilebilir
}
uncharted MainframeBilling {                    // şirkete ait ama dökümante edilmemiş
  operation Post(entry: Entry): Unit            // module-gibi: operation/entity/type taşıyabilir (kısmi)
}
```
**`readonly` marker (ADR-0030 K4) — yalnız boundary-op'ta** (external/uncharted; **module
op'unda DEĞİL** — orada query'lik `access`'ten türer). Boundary-op'un `access` clause'u yoktur,
bu yüzden read-only'liği `readonly` ile açıkça bildirilir → sonucu `rule`'da gate-edilebilir
(query). İşaretsiz boundary-op = yan-etkili varsayılır (compensate-eligible, rule-gate-edilemez).
`readonly` sıra: `(serving'ler)* readonly operation …` (operation keyword'ünden önce).
Üreteç bu sistemlerin KENDİSİNİ üretmez (manifest `generated:false`) ama **çağrı adapter'ını**
bizim module'de üretir ve bilinen `validation`'ı öne çeker (caller-side fail-fast). Teknik op
bunlara `calls System.Op` ile bağlanır. Fark tek eksende: **sahiplik** (external=3.parti,
uncharted=şirkete-ait → deployable'a girebilir).

---

## 9. Serving & blessed prelude'lar (decorator)

> **İKİ AYRI arg sözdizimi (grammar):**
> - **Serving** (`@rest`/`@grpc`/`@queue` — tek-ID protokol, NOKTASIZ) → **POZİSYONEL** arg
>   (`ServingArg: keyword | string`): `@rest(POST, "/x")`.
> - **Annotation/prelude** (`@ns.name` — NOKTALI: `@trigger.*`/`@http.*`/`@audit.*`/`@metric.*`/
>   `@sensitivity.*`/`@crypto.*`) → **İSİMLİ** arg ZORUNLU (`AnnotationArg: name ':' value`):
>   `@trigger.cron(schedule: "…")`. Pozisyonel (`@trigger.cron("…")`) **parse HATASI**.

Op'un ÜZERİNE decorator olarak; ≥1 yayın protokolü → op **exposed**:
```
@rest(POST, "/x")  @grpc(...)  @queue(...)      // Serving — POZİSYONEL (exposed)
@internal                                        // açıkça yayınlanmadı
```
**Blessed std-prelude'lar** (araçla gelir, `import` gerekmez; isimli arg, değer düz `string`):
- **`@trigger.*`** (`on operation` — ne tetikliyor): zorunlu arg parantezde isimli:
  ```
  @trigger.cron(schedule: "0 2 * * *", timezone: "UTC")
  @trigger.queue(source: "orders.placed", group: "billing")
  @trigger.webhook(source: "stripe", eventType: "payment.succeeded")
  @trigger.file(path: "/in/drop", pattern: "*.csv")
  @trigger.stream(source: "events", from: "latest")
  ```
- **`@http.*`** (`on param`): `@http.path` · `@http.query(name: "q")` · `@http.header(name: "X-Id")` ·
  `@http.payload` · `@http.statusCode` (`on field`). Param'a önek: `operation F(@http.payload body: String): …`.
- **`@audit.logged(category: "financial", retention: "7y")`** · **`@metric.emit(name: "ledger.post", kind: "counter")`**
  (`on operation`) · **`@crypto.encrypted(description: "…", algorithm: "AES-256")`** ·
  **`@sensitivity.tag(level: "pii")`** (`on field`).
Bilinmeyen protokol/zorunlu-arg eksikse → usage diagnostic'i (örn. `@trigger.cron` `schedule`'sız → error).

---

## 10. `Expr` alt-grameri (shared)

`invariant`, `validation`, `rule`, `permit when` ifadeleri:
```
or / and / = != > < >= <= / + - * /            // boolean + karşılaştırma + aritmetik
sum of <path>                                   // aggregate (to-many gezme)
fn(arg, …)                                       // çağrı
a.b.c                                            // path (segment'ler)
"str" | 123 | true | false                       // literal
```
**Path kökü = provenance (ADR-0031, bağlam-duyarlı):** `validation` path kökü yalnız `op.params`;
`rule` kökü param/`access`-entity-veya-alias/`calls`-alias; `invariant`/`permit when` kökü entity
alanları/`resource.*` (cross-module entity navigasyonu → error). Bildirilmemiş/yanlış-eksen kök →
error (bkz. §6).
