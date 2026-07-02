# Upstream → Frontend eşlemesi (operations.json + manifest.json → .fcdsl)

> **En kritik dosya.** Faz 2-6'da oku. İki upstream'in NE verdiğini karıştırmak bu
> skill'in en büyük hata sınıfıdır — cross-check uyarısını yanlış tarafa atfedersen
> kullanıcıya yanlış soru sorarsın.

## A. Hangi bilgi hangi upstream'den (atıf tablosu)

| Soru | Kaynak | Alan |
|---|---|---|
| Bu op **var mı**, kimliği ne? | business `operations.json` | `operations[].id` — `realizes` hedefi |
| Komut mu sorgu mu? | business | `operations[].kind` (uses `command/query` bununla eşleşmeli — uyuşmazlık **error**) |
| Hangi iş akışının parçası? | business | `operations[].flows` (tek-aktör) — `flow … realizes flow` kapsaması buradan |
| Aktörler kimler? | business | `actors[]` (+`extends`) — `audience:` / `for <persona>` / ifadelerdeki rol-adları cross-check |
| **Çağrılabilir mi?** | tech `manifest.json` | `operations[].visibility` (`exposed` değilse / hiç realize edilmemişse → çağrılamaz-op warning) |
| Hangi hataları üretebilir? | tech | `errors[]` (module error → resultType) + op `throws` → authored `results:` bunları kapsamalı |
| Sunucu-validation'ı var mı? | tech | `operations[].validation` (varsa NotValid üretilebilir + form-divergence cross-check) |
| Sayfalı mı, stratejisi ne? | tech | `operations[].pagination {strategy, keys, size}` — `paginated infinite|pager` cross-check |
| Endpoint/DTO/serving? | tech | `serving` — **frontend'in İŞİ DEĞİL** (üreteç-join'e kalır; .fcdsl'e yazılmaz) |

**Business'ta OLMAYANLAR:** validation, result-type'lar, pagination, endpoint. Bunları
business'tan "türetmeye" kalkma — tech-manifest'e bak; tech yoksa kullanıcıya authored
beyan ettir ve tech'siz-mod sınırını hatırlat.

## B. Join 2-hop'tur (tek ortak anahtar YOK)

```
frontend uses X --realizes--> business-op-ID <--realizes-- tech op (1..N, reverse)
```

- Frontend `realizes` HER ZAMAN **business-op-ID**'sine işaret eder (tech op-ID'sine değil).
- Tech tarafına geçiş: manifest'te `operations[].realizes == <BizOpID>` olan op'lar
  (reverse-realizes; 1..N — aynı business-op'u birden çok tech-op realize edebilir).
- Tech op'un KENDİ adı farklı olabilir (`PlaceMyOrder` realizes `PlaceOrderFromCart`) —
  frontend bunu umursamaz; kimlik business'tır.

## C. `uses`-arayüzü kurma reçetesi (op başına)

1. **Ad + realizes:** yerel ad ekran diline uygun seçilir (`ListOrders`); business adıyla
   AYNI değilse `realizes <BizOpID>` AÇIK yazılır. Ad aynıysa by-name kısayolu çalışır —
   info çıkar; emit öncesi tek satırla onaylat ("ad-eşleşmesiyle bağladım, doğru mu?").
2. **kind:** business `kind` ile aynı olmalı (`command`/`query`) — aksi error.
3. **in/out şekli:** ekranın İHTİYACI kadar (projeksiyon serbest — business imzasını
   kopyalama zorunluluğu yok). **Cardinality AÇIK:** liste dönen sorguya `out list of {…}`.
   Aynı business-op'a experience-başına FARKLI projeksiyon legaldir (Customer'ın
   GetProposal'ı ile Staff'ınki farklı alanlar taşıyabilir).
4. **results:** authored küme. Alt sınır = tech'in üretebildikleri:
   `taggable = { throws→resultType eşlemeleri } ∪ { validation varsa NotValid }`.
   Eksik bırakılan taggable → results-divergence warning (ikinci tur soru). Üst sınır
   yok (ServerError/NotAuthenticated gibi altyapı sonuçlarını her zaman eklemek doğaldır).
   `results:` HİÇ yazılmazsa taksonomi-TAM varsayılır — handler-tamlık 6'lıya karşı işler.

## D. Ekran/bileşen seçim rehberi (business sinyallerinden)

| Upstream sinyali | Frontend karşılığı |
|---|---|
| query + tech `pagination` | `list … paginated infinite\|pager` (cursor→`infinite`; `pager` cursor'la uyumsuz — warning) |
| query, tekil-out | `detail` (parametreli ekranda) veya `value` (tek değer/rozet) |
| command, kullanıcı-girdili | `form` (alan listesi authored; edit deseni `loads query` + submit) |
| command, tek-tık | `action` (satır-aksiyonu = list gövdesinde; yıkıcıysa `confirm "…"`) |
| business flow (tek-aktör) | `flow … realizes flow <ID> = [ekranlar]` — flow'un TÜM op'ları adım-ekranlarında sunulmalı |
| business process (çok-aktör) | Frontend DOĞRUDAN map'lemez — constituent flow'ları ayrı experience'larda kapsanır |
| actor `extends` hiyerarşisi | audience/persona cross-check'te tanınır; DSL-içi persona bildirimi YOK (adlar serbest ID) |

## E. Mekanik seçimi (cache / queue / remote) — soru → karar

| Kullanıcı cümlesi | Mekanik | Not |
|---|---|---|
| "internetsizken de görsün" | `cache` (query) | tazelik P1: örtük revalidasyon YOK — tazeleme 3 authored kaynak |
| "kaydetsin, bağlanınca gönderilsin" | `queue` (command) | **queue×out**: `on Success` out-alanı OKUYAMAZ (error); geç red `SyncFailed/Conflict` kanalına düşer |
| "anında sunucu onayı gerekiyor" | `remote` | handler'lar senkron ateşlenir; offline'da tetiklenirse ServerError kanalı (P5) |
| "kaydedince detay sayfasına gitsin" (queue'lu op) | ÇELİŞKİ — kullanıcıya seçtir | ya `remote` yap (senkron id gelir) ya listeye dön (temp-id ileri faz) |

`delivery: offline-first` beyan edilmişse kritik okuma yüzeylerinin `cache`, yazmaların
`queue` olmamasını SORGULA (tutarsızlık diagnostik değil — senin guard'ın).

## F. Cross-check uyarısı → kullanıcı sorusu çevirisi

| Diagnostik | Kullanıcıya soru |
|---|---|
| Uncovered-op (union) | "Şu işlemleri hiçbir uygulama sunmuyor: … — bilinçli kapsam-dışı mı, unutuldu mu?" (bilinçliyse belgele) |
| Çağrılamaz-op | "Bu işlem iş analizinde var ama teknik analiz onu kurmamış/dışa açmamış — ekran mı erken, teknik analiz mi eksik?" |
| Results-divergence | "Sunucu bu işlemde '…' hatası üretebiliyor ama sunum karşılamıyor — kullanıcı o durumda ne görsün?" |
| Validation-divergence (form boş) | "Sunucu şu kuralları koyuyor: … — formda da yerel doğrulansın mı? (offline'da tek doğrulama budur)" |
| Pagination divergence | "Backend sayfalı ama sunum beyanı yok → yalnız ilk sayfa görünür. Kaydırdıkça mı, sayfa sayfa mı?" |
| Kind-uyuşmazlığı (error) | Soru değil DÜZELTME: uses kind'ını business kind'ına eşitle (sorgu formda 'submit' edilmez). |
| Audience/persona bilinmiyor | "'X' iş analizinin aktörleri arasında yok — yazım mı, yeni rol mü? Yeni rolse önce iş analizine ekletilmeli." |

## G. Neyi YAZMAYACAKSIN (sınır disiplini)

- **Endpoint/DTO/HTTP** — üreteç-join'in işi (tech `serving` + experience.json).
- **Platform/framework adı** — üretim-config'i; DSL'e girmez (`@target` kaçışı hariç).
- **Piksel/flex/widget adı** — region rolü + component kind yeter; fiziksel eşleme üretecin.
- **Backend-event aboneliği** — v1-dışı; tazeleme lifecycle/refreshable/invalidates ile.
- **Yetki zorlaması** — `visible-when` yalnız UX; kural/rol zorlaması tech tarafında.
- **Business gerçeğinin kopyası** — `uses` projeksiyon taşır, iş kuralı taşımaz; kural
  sorgulaması teknik-analiz'in işiydi.
