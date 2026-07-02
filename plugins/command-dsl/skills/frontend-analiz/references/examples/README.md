# Örnekler — linked exemplar + GERÇEK upstream fixture'ları

| Dosya | Ne |
|---|---|
| `catalog.operations.json` | Business upstream (**v3**) — canlı `CommandDSL/examples/catalog.cdsl`'den bu skill'in **gömülü `emit-operations.mjs`'iyle** üretildi (aile zinciri tek katalog üzerinden; teknik-analiz örneğiyle aynı katalog, güncel sürüm) |
| `orders.manifest.json` | Tech upstream — `teknik-analiz/references/examples/order-management.tcdsl`'den **gerçek `emit-manifest.mjs`** ile üretildi (el yazması değil) |
| `orders.fcdsl` | Linked exemplar (çift-upstream): shared Login + offline-first CustomerApp; list/detail/form/action, cache/queue/remote, pagination, confirm, invalidates, entry, flow-realizes, cascade handler'lar |

## Doğrulama kanıtı (gömülü araçla — build: grammar `e5764dfe0cec`, src `a4f0d2a6d1fa`)

```
node ../../validator/fcdsl.mjs orders.fcdsl
```

Beklenen: **0 error · 1 warning · 1 info** — İKİSİ DE BİLİNÇLİ/DİDAKTİK:

- `WARN Çağrılamaz-op: 'ReadOwnOrder' tech-manifest'te hiçbir op tarafından realize edilmiyor.`
  → business'ta var, teknik analiz kurmamış. Skill'in **warning → takip sorusu**
  döngüsünün canlı örneği: "ekran mı erken, teknik analiz mi eksik?" (Bu exemplar'da
  cevap: bilinçli — detay ekranı ürün kararı olarak önde gidiyor; teknik analiz
  ReadOwnOrder'ı realize edince warning kendiliğinden susar.)
- `INFO 'Login' contract'ta karşılıksız — standalone-arayüz olarak derlenir (karar #41).`
  → Login bir business-op değil, kasıtlı yerel arayüz.

0 error olduğundan `--out` ile emit ÇALIŞIR (gate geçer):

```
node ../../validator/fcdsl.mjs orders.fcdsl --out /tmp/deneme
# → orders.experience.json  (mode: linked; realizes-ref'ler authored)
```

## Ne öğretir (exemplar'da işaretli kararlar)

- Çift-upstream `contract '…' tech '…'` + doğru atıf: `CancelOrder.results`'taki
  `NotProcessable`, tech'in `throws OrderNotCancellable → NotProcessable` eşlemesinden.
- `paginated infinite` ↔ tech `cursor` uyumu (`pager` yazılsaydı divergence warning).
- `queue`'lu formda `on Success -> screen MyOrders` — `-> OrderDetail(orderId)` yazılsa
  **queue×out error** olurdu (out-alanı enqueue-anında yok).
- Satır-nav: `row ->` değil, bileşen-içi hedefsiz `on activate -> screen X(row.id)`.
- `flow Gezinme realizes flow BrowseOwnOrders` = tam kapsanan business-flow çıpası;
  `flow SiparisVer` = realizes'siz yerel yolculuk (ikisi de legal).
