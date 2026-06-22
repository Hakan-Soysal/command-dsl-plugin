# Keyword-Coverage Örneği (known-good exemplar)

İki dosyalık çok-modüllü bir CommandDSL modeli: `shop.cdsl` + `support.cdsl`.
**Amaç dilin TÜM keyword/construct'larını tek yerde göstermek** — iş anlamı
ikincildir. Bir construct'ı nasıl yazacağından emin değilsen buraya bak: burada
geçen biçim **gerçek CommandDSL parser'ında doğrulanmıştır**.

> Doğrulama durumu: **0 error, 0 warning, 5 info**. Beş info yalnızca F6'dır
> (kapsanmayan komutlar — bilinçli; örnek tüm operation'ları bir flow'a bağlamayı
> hedeflemez). Bu örnek bir KALIP kaynağıdır; üreteceğin gerçek modelde her
> operation tipik olarak bir flow/process'e bağlanır.

## Nerede ne gösteriliyor

`shop.cdsl` (Modül 1):
- **Foundation:** `domain`, `actor`(+`extends`), `calendar` (kebab), `relation … of … with`,
  `entity` (String/Decimal/Boolean/Int/Date/DateTime/Duration + `list of`), `verb`.
- **Sorgu:** `reads`/`lists`, `only when`, `order by … descending`, `limit to`.
- **Komut:** 4'lü imza; ownership `own`/`any`/`all`/`public`/`<relation>'s`;
  `on`/`from`/`for`/`where`; `note`; `only if`; `only during`; `only when` (and/or/parens).
- **on success do:** `calculate` (`sum of`, aritmetik `+ - * /` + parantez, `if`, `when`,
  durum geçişi `= '...'`), `send … to`, `create … from`, `perform`.
- **schedule (System):** `every day at 03:00` / `every hour` / `every week` / `every month at 23:00`.
- **grant/revoke:** `grants … to … for 24h`, `revokes write/delete … from …`.
- **Flow:** `flow … for`, `note`, `step`, `optional`, `repeat`, `optional repeat`,
  `using`, `include` (+`optional repeat`), `either/or`, `outside`, `abandon anytime`.
- **Process:** `process … of`, `note`, flow-`stage … by`, operation-`stage`, `any order … and`.

`support.cdsl` (Modül 2):
- **`import`** (çapraz modül: Customer/Admin/Store shop'tan gelir).
- Unit duration (`for 3 days`, `for 2 hours`), 2. `process`, operation-`stage`.

## Operatörler
`=`, `!=`, `>`, `<`, `>=`, `<=` ve `and`/`or`/`( )` — `UpdateOrder` ve
`ApproveBigOrder` koşullarında; aritmetik `RecalcInvoice`/`IssueRefund`'da.

## Önemli
Bu örnek **kapsama** içindir; gerçek bir modelde:
- Her operation'ı bir flow'a/process'e bağla (F6 info'larını azalt).
- Domain adlarını anlamlı ve benzersiz tut.
- `using`'i yalnız aynı-entity zincirlerinde kullan (eksen kayması varsa `from`+`outside`).
