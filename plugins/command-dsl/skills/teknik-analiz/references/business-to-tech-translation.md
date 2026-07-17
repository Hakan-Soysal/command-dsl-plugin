# Business → Tech Çeviri Prosedürü

> **En kritik dosya.** Faz 2–6'da her operation/entity'de oku. `operations.json` (iş sözleşmesi)
> → TechDsl eşlemesini ve `realizes` köprüsünü tanımlar. Kaynak: `CommandDSL/src/tech/contract.ts`
> (tüketilen şema) + gerçek `examples/tech/catalog.operations.json`.

## 0. operations.json şeması (v3 — tüketilen alanlar; v3 = v2 + ADR-0033 `rules[]` [named-rule predicates] + guard'larda `kind:"rule"` referansları — additif)

```jsonc
{
  "meta": { "schemaVersion": 3, "hasErrors": false, "errorCount": 0 },   // 3 değilse → error
  "actors":    [ { "id": "Admin", "extends": "Employee" }, … ],          // roles + yetkili-küme
  "relations": [ { "id": "managedBranch", "source": "BranchManager", "target": "Branch" }, … ],
  "entities":  [ { "id": "Order", "name": "Order", "fields": [ { "name":"status","type":"String","collection":false } ] }, … ],
  "operations":[ {
      "id": "CancelPendingOrder",
      "kind": "command",                                                  // command | query
      "signature": { "actor":"Customer", "verb":"cancels", "ownership":"own", "resource":"Order" },
      "access": { "writes": ["Order","Refund"], "reads": [] },            // KABA read/write
      "guards": [ { "id":"where:0", "kind":"where", "text":"status = 'pending'", "ast": {…} },
                  { "id":"during:0", "kind":"during", "calendar":"business-hours" },
                  { "id":"if:0", "kind":"if", "text":"…", "ast": {…} } ],
      "description":"…", "schedule":null, "delegation":null,
      "effects":[…], "flows":[…], "processes":[…], "domain":null
  }, … ]
}
```

## 1. `realizes` köprüsü (mapping'in kendisi)

- **Op:** tech `operation … realizes <BizOpID>` → `operations[].id`. (0..1; dangling → linker error.)
- **Entity:** tech `entity … realizes <BizEntityID>, …` → `entities[].id`. (Kaba, 0..N — bir iş
  entity'si birden çok tech entity'ye parçalanabilir; tersi de.)
- **Köprü iş gerçeğini KOPYALAMAZ** — yalnız bağ + teknik delta. Üreteç `operations.json` +
  tech manifest'i bu `realizes` ile join'ler.

## 2. Alan-alan eşleme (her authored; gizli miras YOK)

| operations.json | TechDsl karşılığı | Nasıl sor / kural |
|---|---|---|
| `kind` | `access`'ten **türetilir** (yazma) | Doğrudan yazılmaz; CRUD'dan çıkar. Sorgu iş-op + write → CQRS warning. |
| `signature.actor` | `roles <R>` + `rolemap { actor -> R }` | "Kim çağırabilir?" Rol = capability; rolemap ile aktöre bağla. Yetkili küme = actor ∪ `extends` descendants. |
| `signature.ownership` | `ownership own\|any\|all\|public\|<relation>` | "Kimin kaydı üzerinde?" Business'tan **geniş yazma** → weakening warning. `<relation>` → `relations[]`. |
| (sahip sütunu, business'ta YOK — saf-tech) | `ownership … by <Entity>.<alan>, …` | Cevap `own`/`<relation>` ise **devam sor**: "sahiplik filtresi **hangi sütunda** kurulur — sahibi hangi alan tutuyor?" Bağsız = warning (üreteç sütunu tahmin eder). Entity op'un `access`'inde, alan skaler/enum (ADR-0038). |
| `access.writes` (kaba) | `access { creates/updates/deletes <Entity> }` | "Yaratıyor mu / güncelliyor mu / siliyor mu?" Kaba write'ı **CRUD'a inceltirsin**. |
| `access.reads` (kaba) | `access { reads <Entity> }` | "Hangi kayıtları okuyor?" |
| `guards[].ast` (`where`/`if`/`when`) | `validation { … }` (400) / `rule { … }` (422) + `for guard "<id>"` | "Kontrol **request payload**'ında mı (→ validation, input-only) yoksa **stored state**'te mi (→ rule)?" **ARTIK YAPISAL ENFORCE (ADR-0031):** validation path kökü yalnız `op.params`; rule state-kökü `access` (entity/`as`-alias) veya `calls`-alias ile **bildirilmeli** — çıplak/bildirilmemiş kök → error. guard-id link (dik eksen) → ifade-divergence. ⚠ **İSTİSNA — `role="result-filter"` guard'ı (sorgu `only when`) EŞLENMEZ (ADR-0039):** o guard fail-check DEĞİL, dönen kümeyi satır-başına daraltan **filtredir**; validation/rule'a eşlersen "kümeyi daralt" sessizce 400/422 "hata ver"e döner → `role-mismatch` warning. Tech'e filtre clause'u da YAZMA — filtre `operations.json`'da `ast`+`role` ile zaten yapısal durur, **üreteç `.Where(ast)`'i oradan uygular** (manifest = realizes-mapping, süperset değil). `role=precondition` ve role'süz guard'lar normal eşlenir. |
| `guards[].kind = "rule"` (`ref` → top-level `rules[]`, ADR-0033) | tech clause'a **EŞLENMEZ** (bu turda `for rule` realize mekanizması YOK) | Adlı-kural referansı: `rules[]` gövdesi tech için **OPAK**tır (AST-kıyas YOK, Karar 7) — codegen downstream tüketir; iş gerçeğini tech'e KOPYALAMA. Realized op'un requires ettiği rule → `checkRequiredRuleCoverage` **warning** (kapsam sinyali, gate değil) — kullanıcıya "bilinçli mi (codegen'e kalıyor)?" diye yansıt-belgele. |
| (state-ihtiyacı, business'ta implicit) | `access { reads <E> as <alias> by <param> }` → `rule { alias.field … }` | "Bu kural **hangi kaydın** state'ine bakıyor, **hangi input** o kaydı seçiyor?" Aynı tipten ≥2 instance → her birine ayrı `as`/`by`. |
| (başka module'ün verisi gerekli) | `calls <Module>.<Query> as <alias>` → `rule { alias.field … }` | "Bu op başka bir context'in verisini **senkron okumalı** mı? Hedef **query** olmalı (write → event/saga); sonuç consistency-garantisiz (ADR-0030)." |
| `guards[].kind = during` | (calendar) — `@trigger.*`/policy | `during` AST taşımaz; ifade-divergence'a girmez. |
| `signature.resource` | `permit when resource.*` bağlamı | ABAC `resource` = op'un tek write-hedefi entity'si. |

## 3. Entity-kapsama kuralı (ZORUNLU — error riski)

`checkEntityCoverage`: realized bir op'un business `access.writes` entity'lerinin **her biri**,
**aynı module'de** o iş entity'sini `realizes` eden bir tech entity'yle karşılanmalı.
- Karşılık yok → error. Başka module'de + write → error (cross-unit write).
- `reads` entity'leri muaf. `external`/`uncharted` içindeki realizes muaf.

> **Pratik:** Bir op'u bir module'e koyduğunda, `access.writes`'indaki HER entity için o module'de
> `entity … realizes <E>` olduğundan emin ol. Örnek: `CancelPendingOrder` writes [Order, Refund]
> → module'de hem `entity Order realizes Order` hem `entity Refund realizes Refund`.

**Op-kapsama (warning — entity-kapsamadan AYRI):** `checkUnrealizedBusinessOps` linked'de,
`operations.json`'daki **hiçbir tech operation tarafından `realizes` edilmeyen** business-op'ları
tek-toplu **warning** olarak listeler (gate değil). Yani her business-op ya bir tech op'a bağlanmalı
ya da kapsam-dışılığı **bilinçli** olmalı. (external/uncharted boundary-op'ları sayıma girmez.)

## 4. İş tarafında KALAN (operations.json tek-kaynak — tech taşımaz)

`schedule`, `effects`, `calculate`, `delegation`, **yapısal guard** (ownership signature'ı,
calendar) iş sözleşmesinde **tek-kaynak** kalır; tech manifest'i ileri-taşımaz/kopyalamaz. Üreteç
çift girdiyi (`operations.json` + manifest) `realizes` ile join'ler. Tech yalnız **authored
delta**yı (teknik sapma + saf-tech eklentiler: invariant/concurrency/idempotent/pagination/
consistency/throws/emits/on/sourceOfTruth) taşır.

## 5. Saf-teknik (business karşılığı olmayan) eklentiler

Bunlar `operations.json`'da YOK; mimar **ekler** ve divergence'a girmezler (standalone'da da
çalışır): `invariant`, `concurrency`, `idempotent by`, `paginated by`, `consistency mode`,
`throws`/`error`, `emits`/`on`, `sourceOfTruth`, `permit`/`scope`. Bunları kullanıcının teknik
ihtiyacından türet (bkz. `interrogation-playbook.md`).
