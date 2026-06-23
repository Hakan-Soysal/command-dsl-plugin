# Examples — parser-doğrulanmış linked TechDsl exemplar'ları

Her örnek gerçek gömülü doğrulayıcıyla (`validate-tech.mjs`) **0 error** olarak kanıtlandı.
Bir construct'ı nasıl yazacağından emin değilsen buraya bak.

> **İzole doğrula:** Bu örnekler aynı isimleri (`module Shared`, `entity Order`) paylaşır →
> hepsini tek dizinde birlikte doğrulama (çift-tanım çakışır). Her birini kendi izole
> dizininde + `catalog.operations.json` ile çalıştır.

## Dosyalar

- **`catalog.operations.json`** — paylaşılan iş sözleşmesi (schemaVersion 2). `realizes`
  hedeflerinin (op + entity ID) ve `rolemap` aktörlerinin kaynağı. Linked örnekler buna `contract`'lar.
- **`slice.tcdsl`** — **minimal** vertical slice: tek komut (`CancelOrder realizes
  CancelPendingOrder`), write-set'i (Order, Refund) aynı module'de realize. En sade linked iskelet.
  Doğrulama: `0 error / 1 warn (kapsam) / 2 info` (kapsam-warning aşağıda açıklı).
- **`order-management.tcdsl`** — **zengin** exemplar. Gösterdiği construct'lar:
  - `contract` + `rolemap` (Customer → Customer)
  - `realizes` (op & entity), `access { creates/updates/reads }`, `roles`/`ownership`
  - `idempotent by <param>` (retry-safe), `error N: NotProcessable` + `throws`
  - `paginated by cursor <field> desc, <field> asc size N` (list-dönen sorguda)
  - entity `invariant` (composite path `total.amount`) + `concurrency optimistic`
  - serving görünürlük (`@rest(...)`), saf-teknik `Shared` module'ü (yalnız type+enum)
  - Doğrulama: `0 error / 1 warn (kapsam) / 2 info`.

## "kapsam" warning'i neden var? (beklenen — hata değil)

Her iki örnek de paylaşılan `catalog.operations.json`'un (≈27 op) yalnızca **birkaç** op'unu
realize eder → `checkUnrealizedBusinessOps` linked-mod kontrolü, realize-edilmeyen business-op'ları
**tek-toplu warning** olarak listeler ("…hiçbir teknik operation tarafından realize edilmiyor").
Bu **kasıtlı** (örnekler bilinçli olarak kataloğun bir dilimini gösterir) → gate değil, bir
**kapsam sinyali**. Gerçek bir skill koşusunda bu warning iki anlamdan birini taşır: ya tüm
business-op'lar realize edilmeli ya da kalan op'lar **bilinçli ertelendi** (kullanıcı onayıyla
belgele). Örneklerde ikincisi geçerli.

## "info" diagnostic'leri neden var?

İki örnek de `CancelPendingOrder`'ı realize eder; o iş işleminin guard'ları (`where:0`,
`if:0`) hiçbir tech `validation`/`rule` check'ine link'li değil → `checkExprDivergence`
**kapsama info'su** üretir (zararsız; "bu business guard'ı tech tarafında ele alınmadı"
hatırlatması). info ≠ error; doğrulama temiz sayılır.

## Cross-module / saga örnekleri

`order-management.tcdsl` tek-module (intra → strong consistency) tutuldu ki temiz kalsın.
Cross-module write + `consistency async|durable`, `calls Sys.Op compensate with Sys.Undo`
(saga) ve `emits`/`on` (event) sözdizimi için `../tech-dsl-reference.md`'ye bak — bu eksenler
ikinci bir module ve `consistency` mode'u gerektirir (aksi halde "mode bildirilmemiş" warning).
