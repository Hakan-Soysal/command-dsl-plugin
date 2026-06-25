# Conformance SPEC — dil-nötr test spec üretici (aile-sahibi)

> **SPEC aileden, ADAPTER paketten.** (A3 değişmezi.) Aile, `manifest.json`/`operations.json`'dan
> **dil-nötr test SPEC'leri** türetir; paket yalnızca bu spec'leri koşan **generic execution ADAPTER**'ı
> (descriptor `conformance.adapter`) sağlar. Spec'in `assert` alanı **contract'tan** türer — paketin emit
> ettiği testten DEĞİL (self-certifying yasak). Assertion aile-sahibi olduğundan paket onu fudge edemez.

## Neden (amaç)

Doubt-driven Bulgu #1 + A3: conformance beklentisi paketten değil **contract'tan** türemeli. Paket hem
realized-construct kümesini hem de testi üretirse dairesel olur — bir construct'ı sessizce düşüren paket onu
ne build-report'a yazar ne test eder → kapı yanlış-yeşil. Bu yüzden aile **kendi `operations.json`'ına karşı**
her construct'ı enumerate eder ve her biri için bir spec emit eder. Beklenti paketten BAĞIMSIZ kalır.

**Determinizm:** Spec üretimi **mekanik**'tir — LLM'e "test yaz" DEDİRTİLMEZ (reward-hacking yok). Spec, contract
construct'larının manifest enumerate'i üzerinden şablon-uygulamadır; aynı contract → aynı spec kümesi.

## Görev bölümü (A.4 madde 6)

| Rol | Sahip | Sorumluluk |
|---|---|---|
| **SPEC** (ne beklenir) | **AİLE** | `manifest.json`/`operations.json`'dan dil-nötr `{construct, opId, arrange, act, assert}` türet; kapsamayı sahiplen (her construct'a spec var mı). |
| **ADAPTER** (nasıl koşulur) | **PAKET** | Descriptor `conformance.adapter` — "bir op çağır + Result incele" harness'ı (xUnit/test-host/DI bilgisi pakette). Per-test kod yazmaz; tek adapter, aile N spec'i besler. |
| **Koşum + doğrulama** | **AİLE** | Adapter'la spec'leri koşar, sonucu doğrular. Paket **assertion kuramaz** — assertion spec'te, aile-sahibi. |

## Step 5.1 — Construct → spec eşleme tablosu

Her construct türü → dil-nötr spec şablonu. `assert` her zaman contract kaynağına işaret eder (son sütun =
provenance: assertion hangi contract alanından türedi).

| Construct türü | Tespit (contract kaynağı) | arrange | act | assert | assert provenance (contract alanı) |
|---|---|---|---|---|---|
| **throws[E]** | op `throws: [E]` | E'yi tetikleyecek durumu kur (ör. duplicate) | op'u çağır | `result.type == E.resultType`, `result.code == E.id` | `errors[id==E].resultType` (paketten DEĞİL) |
| **validation** | op `validation: [{text}]` | sınır-dışı girdi üret (predicate'i ihlal eden) | op'u çağır | `result.type == NotValid` (HTTP 400) | op `validation[].ast` (predicate → sınır-dışı örnek) |
| **rule** | op `rule: [{text}]` | rule'u ihlal eden iş-koşulu kur | op'u çağır | `result.type == NotProcessable` (HTTP 422) | op `rule[].ast` (predicate → ihlal örneği) |
| **invariant** | entity `invariants: [{text}]` | rastgele/property girdi üret | op'u çağır → entity persist et | persist edilen entity invariant'ı ihlal ETMEZ (property test) | entity `invariants[].ast` |
| **idempotent** | op `idempotent: {keys}` | aynı idempotency key ile 2 istek hazırla | op'u aynı key ile 2× çağır | 2. çağrı dedup → tek etki (tek entity, tek emit) | op `idempotent.keys` |
| **saga** | `callEdges[from==op].compensate != null` | downstream çağrısının fail edeceği durumu kur | op'u çağır | downstream-fail → `compensate` op'u çağrıldı (ters-sıra) | `callEdges[].compensate` (downstream `{system, op}`) |
| **pagination** | op `pagination: {strategy, keys, size}` | size'dan fazla kayıt seed et | op'u çağır | sonuç `Page<T>` zarfı + `cursor` + `size == pagination.size` | op `pagination.{strategy,keys,size}` |
| **roles** | op `roles: [R]` | gerekli rolü TAŞIMAYAN actor kur | op'u çağır | `result.type == NotAuthorized` (HTTP 403) | op `roles[]` (eksik-rol negatifi) |

**Ek construct'lar (aynı mekanik):** `ownership` (sahip-değil → 403), `scopes` (scope-eksik → 403),
`emits` (op başarısı → event yayıldı), `subscriptions` (event → consumer op tetiklendi), `consistency`
(strong/durable → senkron commit gözlemlenir). Hepsi manifest enumerate'inden türer.

> **Result taksonomisi (contract-türevli):** `Success | NotAuthenticated | NotAuthorized | NotValid |
> NotProcessable | ServerError`. Her named error'ın `resultType`'ı bu taksonomiden gelir ve
> `errors[].resultType` (contract) belirler — adapter bu enum'u dile çevirir, ama enum DEĞERİ spec'tedir.

## Step 5.2 — Spec çıktı formatı

Spec = dil-nötr JSON. Üretim: **manifest enumerate** (T3.1 ile aynı kaynak) → her construct için bir spec emit.

```jsonc
{
  "construct": "throws|validation|rule|invariant|idempotent|saga|pagination|roles|ownership|scopes|...",
  "opId": "CreateInvoice",          // manifest operations[].id
  "arrange": { /* dil-nötr kurulum talimatı (ör. {kind:"duplicate", key:[...]}) */ },
  "act": { "call": "CreateInvoice", "with": { /* dil-nötr girdi */ } },
  "assert": {
    "resultType": "NotProcessable",  // ← contract'tan: errors[].resultType / taksonomi
    "code": "DuplicateInvoice",      // ← contract'tan: throws[] / errors[].id
    "source": "manifest.json#errors[DuplicateInvoice].resultType"  // provenance: assert nereden türedi
  }
}
```

`assert.source` zorunlu provenance alanıdır: her spec, assertion'ın **hangi contract konumundan** türediğini
taşır. Bu, "assert paketten geldi mi?" sorusunu mekanik denetlenebilir kılar (6.3). Adapter (T4.4) bu JSON'u
tüketir; `act.call` + `assert` dil-özgül çağrıya/incelemeye çevrilir — ama spec dil-nötr kalır.

> **Kaynak-dosya bölümü (provenance disiplini):** `errors[]` / `validation` / `rule` / `idempotent` / `roles`
> alanları **`manifest.json`**'da yaşar (op id = `CreateInvoice`); `operations.json` ise iş-katmanı op'larını
> (op id = `biz.CreateInvoice`) taşır ve bu alanları içermez. Bu yüzden bu construct'ların `assert.source`'u
> **DAİMA `manifest.json#...`** gösterir — gelecekteki contract'lar doğru dosyayı deterministik olarak alıntılar.

## Step 6.2 — CreateInvoice örnek spec'leri (contract-türevli, somut)

Aşağıdaki spec'ler `manifest.json`'daki gerçek `CreateInvoice` op'undan + `errors[DuplicateInvoice]`'den türer.
Her `assert.source` ilgili contract alanını gösterir.

### Spec 1 — throws(DuplicateInvoice) → NotProcessable

```json
{
  "construct": "throws",
  "opId": "CreateInvoice",
  "arrange": { "kind": "duplicate", "on": "CreateInvoice", "key": ["customerId"] },
  "act": { "call": "CreateInvoice", "with": { "customerId": "c-1", "amount": 100 } },
  "assert": {
    "resultType": "NotProcessable",
    "code": "DuplicateInvoice",
    "source": "manifest.json#errors[id=DuplicateInvoice].resultType=NotProcessable + operation[CreateInvoice].throws[0]"
  }
}
```

> `resultType=NotProcessable` paketten DEĞİL, `errors[].resultType` alanından okundu. `code=DuplicateInvoice`,
> op'un `throws: ["DuplicateInvoice"]` listesinden geldi.

### Spec 2 — validation(amount > 0) → NotValid

```json
{
  "construct": "validation",
  "opId": "CreateInvoice",
  "arrange": {},
  "act": { "call": "CreateInvoice", "with": { "customerId": "c-1", "amount": 0 } },
  "assert": {
    "resultType": "NotValid",
    "violated": "amount > 0",
    "source": "manifest.json#operation[CreateInvoice].validation[0].ast (cmp > amount 0) → sınır-dışı örnek amount=0"
  }
}
```

> `amount=0` girdisi, `validation[0].ast`'taki `amount > 0` predicate'inin mekanik sınır-dışı örneğidir.
> `NotValid` taksonomi-türevli (validation ihlali = HTTP 400).

### Spec 3 — rule(amount <= creditLimit) → NotProcessable

```json
{
  "construct": "rule",
  "opId": "CreateInvoice",
  "arrange": { "kind": "businessCondition", "set": { "resource.creditLimit": 50 } },
  "act": { "call": "CreateInvoice", "with": { "customerId": "c-1", "amount": 100 } },
  "assert": {
    "resultType": "NotProcessable",
    "violated": "amount <= creditLimit",
    "source": "manifest.json#operation[CreateInvoice].rule[0].ast (cmp <= amount resource.creditLimit) → ihlal örneği amount>creditLimit"
  }
}
```

> `amount=100 > creditLimit=50` ihlali, `rule[0].ast`'ın mekanik ihlal örneğidir. Rule ihlali =
> `NotProcessable` (HTTP 422), validation'dan (400) ayrı.

### Ek CreateInvoice spec'leri (aynı op'tan türer)

- **idempotent** — `idempotent.keys=["customerId"]`: aynı `customerId` ile 2× → 2. dedup, tek Invoice + tek
  `InvoiceCreated` emit. `assert.source = manifest.json#operation[CreateInvoice].idempotent.keys`.
- **invariant** — Invoice `invariants=["amount >= 0"]`: persist edilen Invoice `amount >= 0`'ı ihlal etmez
  (property). `assert.source = manifest.json#entities[Invoice].invariants[0].ast`.
- **roles** — `roles=["Clerk"]`: Clerk-olmayan actor → `NotAuthorized` (403).
  `assert.source = manifest.json#operation[CreateInvoice].roles`.

## saga — assertion-stub + belgeli kapsam (v1, §8 / B.6)

`CreateInvoice` için `callEdges[from=CreateInvoice]` → `PaymentGateway.charge` çağrısı + `compensate:
PaymentGateway.refund` taşır → bu bir **saga** construct'ıdır. Saga conformance'ı **setup-ağır**dır
(downstream failure-injection + compensate gözlemi gerektirir). §8 anti-pattern uyarınca **ATLANMAZ**;
v1'de **assertion-stub** olarak emit edilir ve kapsamı belgelenir:

```json
{
  "construct": "saga",
  "opId": "CreateInvoice",
  "arrange": { "kind": "downstreamFail", "system": "PaymentGateway", "op": "charge" },
  "act": { "call": "CreateInvoice", "with": { "customerId": "c-1", "amount": 100 } },
  "assert": {
    "stub": true,
    "expected": "PaymentGateway.refund (compensate) çağrıldı",
    "source": "manifest.json#callEdges[from=CreateInvoice].compensate={system:PaymentGateway, op:refund}",
    "coverage": "v1=stub (failure-injection setup-ağır); v2'de tam koşulur — açıkça ertelenmiş, sessiz değil"
  }
}
```

> Stub spec hâlâ contract-türevli: `compensate` hedefi `callEdges[].compensate`'ten okunur. v1'de assertion
> koşulmaz ama **kapsam delik bırakmaz** — saga construct'ı enumerate'te görünür ve `coverage` alanı ertelemeyi
> belgeler. Trigger/Subscription/Boundary seam'leri benzer şekilde techgen temiz human-seam emit edene kadar
> kapsam-dışı işaretlenir (B.6).

## Üretim algoritması (mekanik, dil-nötr)

```
for op in manifest.operations:
  if op.throws:        for E in op.throws:        emit throws-spec(op, E, lookup errors[E].resultType)
  for v in op.validation:                          emit validation-spec(op, v.ast)   # NotValid
  for r in op.rule:                                emit rule-spec(op, r.ast)          # NotProcessable
  if op.idempotent:                                emit idempotent-spec(op, op.idempotent.keys)
  if op.roles:                                     emit roles-spec(op, op.roles)      # NotAuthorized
  if op.ownership:                                 emit ownership-spec(op)            # NotAuthorized
  if op.scopes:                                    emit scopes-spec(op, op.scopes)
  if op.pagination:                                emit pagination-spec(op, op.pagination)
  for e in callEdges[from==op.id] if e.compensate: emit saga-stub-spec(op, e.compensate)   # v1 stub
for ent in manifest.entities:
  for inv in ent.invariants:                       emit invariant-spec(ent, inv.ast)  # property
```

Her `emit*` çıktısı `{construct, opId, arrange, act, assert}` JSON'ıdır; her `assert` bir `source`
(operations.json/manifest.json konumu) taşır. **Hiçbir assert paket çıktısından okunmaz.** Bu, A.4 kapısının
tarafsızlığını sağlar: paket assertion kuramaz, yalnızca adapter'la çağırır.
