# FrontendDsl referansı — sözdizimi + anlam

> Kaynak: `CommandDSL/frontend-dsl.langium` + tasarım spec'i v0.4 (karar #1-#48).
> Uzantı `.fcdsl`; yorum `#`. İfade dili = shared Expr (tech ile AYNI AST; karşılaştırma
> **tek `=`**, `!=` var, `not` YOK). Bu dosya yazım-anı başvurusudur; sorgulama soruları
> `interrogation-playbook.md`'de.

## Yetenek Envanteri (sessiz-eksik risk yüzeyi — süpürme + tetikleyici haritası)

> **Snapshot:** grammar `e5764dfe0cec` · src `a4f0d2a6d1fa` (bundle `--version` ile çapraz-kontrol; uyuşmazsa envanter BAYAT → elle tazele). Elle bakımlı.

Yalnız **opsiyonel/authored, sessizce atlanabilir** sunum yeteneklerini listeler (zorunlular — experience/screen/uses/region — faz+validator'ca zorlanır). Kullanım: (1) her fazda **"Gerçek-dünya sinyali"** kolonunu dinle → eşleşme aday-soru kuyruğuna girer (hibrit onay). (2) Emit'ten önce **★** satırlarını süpür (SKILL Pre-Emit Gate). Sinyal soruyu **TETİKLER, cevabı DOLDURMAZ** (büyü yok). `entry` ve result-handler-tamlığı zaten validator-warning'idir (sessiz değil) → burada yok; warning geldiğinde ikinci-tur soru olarak ele al.

**★** = yüksek (sessiz + davranış/veri kaybı) · **○** = orta

| Construct | Gerçek-dünya sinyali (tetikleyici) | Faz | Risk | Atlanırsa (adlandırılmış mod) |
|---|---|---|---|---|
| `cache`/`queue`/`remote` + `delivery` (offline mekaniği) | "internet yokken de çalışmalı / sahada çekmiyor / çevrimdışı kullanım" | 5 | ★ | **çevrimdışı-veri-kaybı** — bağlantı yokken yapılan eylem tutulmaz/kuyruğa alınmaz; kayıt kaybolur |
| `when offline\|syncing\|SyncFailed\|SyncConflict` (sync deltaları) | "çevrimdışıyken / eşitlenirken ne görünsün; bekleyen değişiklik; çakışma" | 5 | ★ | **görünmez-eşitleme-çakışması** — bekleyen/çakışan değişiklik kullanıcıya gösterilmez; sessizce ezilir/kaybolur |
| `refreshable` / `invalidates` / `on enter refresh` (tazeleme) | "veri bayatlamasın / yazınca liste güncellensin / elle yenile" | 5 | ★ | **bayat-veri** — yazımdan sonra liste tazelenmez; kullanıcı eski veriyi görür |
| `field { required\|min\|max\|pattern }` + form `rule` (validation) | "şu alan zorunlu / şu formatta / çapraz-alan kuralı (offline'da yerel doğrula)" | 6 | ★ | **doğrulanmamış-girdi** — geçersiz/eksik alan istemcide yakalanmaz; hatalı veri backend'e gider (offline'da hiç yakalanmaz) |
| `confirm ["metin"]` (yıkıcı aksiyon) | "silmeden/iptal etmeden önce sorsun / geri alınamaz eylem" | 6 | ★ | **kazara-yıkıcı-eylem** — geri-alınamaz eylem onaysız tetiklenir |
| `visible-when` (koşullu görünürlük) | "bu buton yalnız yöneticide / şu koşulda görünsün" (UX — güvenlik DEĞİL) | 4 | ★ | **koşulsuz-görünür-öğe** — yalnız belirli koşulda/rolde görünmesi gereken öğe herkese görünür (güvenlik açığı DEĞİL — yetki backend'de zorlanır; UX/karışıklık) |
| `paginated infinite\|pager` (list) | "liste çok uzun / sayfa sayfa / sonsuz kaydır" | 4 | ★ (warning-routed) | **sınırsız-liste-yükü** — uzun liste tek seferde çizilir; kayma/bellek çöküşü |
| `when empty` / `when loading` (query yaşamdöngüsü) | "yüklenirken / hiç kayıt yokken ekranda ne görünsün" | 4 | ○ | **boş/donuk-ekran** — yükleme veya kayıtsız durumda ekran boş kalır; kullanıcı takıldı sanır |
| UI-event: `on enter/leave` · `timer/interval` · `activate/secondary` | "ekrana girince / N sn sonra / periyodik / uzun-bas / sağ-tık" | 7 | ○ | **tetiklenmeyen-arayüz-olayı** — ekrana-giriş/zamanlayıcı/uzun-bas eylemi bağlanmaz; etkileşim gerçekleşmez |
| `persisted state` (kalıcı client-state) | "kapatıp açınca kaybolmasın (sepet, taslak)" | 5 | ○ | **kaybolan-taslak** — kapat-aç'ta client-state (sepet/taslak) sıfırlanır |
| `show a, b` (görüntü-şekli) | "listede/detayda yalnız şu alanlar görünsün" | 4 | ○ | **belirsiz-alan-izdüşümü** — hangi alanların görüneceği tanımsız; varsayılana/tümüne düşer |
| `step` (form wizard) | "adım adım form / sihirbaz" | 6 | ○ | **çökmüş-sihirbaz** — adımlı form tek sayfaya iner; uzun form bir arada gelir |

**Not:** field-decoration (`@ui.*` / backend-hassas→maske) bu bundle'da YOK (grammar `e5764dfe0cec` desteklemiyor — probe'lu doğrulandı) → envantere GİRMEZ; gerektiğinde `#` yorumla kaynak-içi anılır (SKILL Altın kural).

## 1. Model kökü

```
[standalone | contract './x.operations.json' ['tech' './manifest.json']]
[import './pack.fcdsl']*
[extension ns.ad { on <site> ... }]*
[shared { ... }]
[experience Ad { ... }]*
```

- **`contract`** business operations.json'a (ZORUNLU yol — skill her zaman linked üretir),
  **`tech`** tech manifest.json'a bağlar (varsa MUTLAKA ekle).
- `import` yalnız extension-pack içindir.
- Extension bildirimi tech-simetrik: `extension ns.ad { on experience|screen|region|component|action|field
  arg k: tip [= default] }`; kullanım `@ns.ad(k: v)` İSİMLİ arg.
- `@target(...)` = opt-in literal yerleşim kaçışı; opak passthrough, hedefte karşılığı
  yoksa no-op. Çekirdeğe platform adı GİRMEZ.

## 2. shared bloğu (karar #26)

```
shared {
  uses command Login { in {email, password} out {token} results: Success | NotAuthenticated | ServerError }
  type Money { amount: number, currency: string }
  screen Login "Giriş" { region main (role: focus) { form Login remote { field email { required } } } }
}
```

- Ortak `uses`-arayüzleri, `type`'lar ve **ortak ekranlar** (ör. Login) BİR KEZ tanımlanır;
  her experience nav edebilir.
- Shared ekranda `for <persona>` **YASAK** (error) — shared ekran her audience'a açıktır.
- Shared ekrana **result-default ile** gidiş = kesinti (interrupt): Success'te otomatik
  origin'e dönüş (karar #33 — yazar bir şey yazmaz). Açık nav ile gidilirse normal ekran.

## 3. experience (karar #5/#45)

```
experience CustomerApp {
  audience: Customer            # ≥1; operations.json actors[] ile cross-check (bilinmeyen → warning)
  delivery: offline-first       # veya remote-only
  entry MyOrders                # başlangıç ekranı; yazılmazsa warning; shared ekran OLAMAZ (error)
  <uses | type | on <Result> … | state/derived | screen | flow | nav | when …>*
}
```

- Audience-dilimi = konuşlandırılabilir birim; platform üretimde atanır.
- Experience-düzeyi `on <Result> <handler>` = cascade varsayılanı (bir kez yazılır;
  form/action yalnız istisnayı override eder).
- Experience-düzeyi `when offline|syncing|SyncFailed|SyncConflict { … }` = global
  sync-kanalı delta'ları (ekran override edebilir).

## 4. uses-arayüzü (karar #14/#24/#41)

```
uses query ListOrders realizes ListOwnOrders {
  in {filter}                        # opsiyonel
  out list of {id, total, status}    # 'list of' = LİSTE; yokluğu = TEKİL (cardinality AÇIK)
  results: Success | NotAuthenticated | ServerError
}
```

- `realizes <BizOpID>` → business-op kimliği. Yazılmazsa **by-name kısayolu**: yerel ad
  business-op adına eşleşirse otomatik çıpa (info); eşleşmezse standalone-arayüz (info).
- `results:` kapalı 6'lı taksonomiden authored küme: `Success · NotAuthenticated ·
  NotAuthorized · NotValid · NotProcessable · ServerError`. Yazılmazsa taksonomi-TAM
  varsayılır (manifest `results: null`).
- Alan tipleri opsiyonel: `name` veya `name: Tip` (tipsiz alan → üreteçte string input).

## 5. screen & region (karar #6/#15/#37/#44)

```
screen OrderDetail(orderId) "Sipariş Detayı" for Customer {
  region main (role: focus, collapse-when: compact) { <içerik> }
  on enter { refresh OrderInfo }
  when loading { … }               # yalnız list/detail gövdesinde DEĞİL — bkz. §9 not
  state secim = 0
}
```

- Parametreli ekran: nav parametreyi AÇIK geçer (`-> screen OrderDetail(row.id)`);
  ambient route okuma yok. Görünen ad opsiyonel STRING (manifest `title`).
- `region` iç-içe olabilir; `role` kapalı enum: `primary | focus | supplementary |
  navigation | statusbar` (boş bırakılabilir → yerleşim üretecin). Tek responsive-niyet:
  `collapse-when: compact`. Piksel/flex YOK.

## 6. Bileşenler (karar #7)

Kapalı çekirdek + extension. Mekanik: `cache | queue | remote` (op-bazında ağ davranışı).

```
list   ListOrders cache refreshable paginated infinite { show total, status  <üyeler> }
detail OrderInfo(id: orderId) cache { <üyeler> }
value  CartCount(cartId: session.cartId) remote
form   PlaceOrder queue { loads query GetDraft(id: draftId)  field cartId { required }  <üyeler> }
action CancelOrder remote { confirm "İptal edilsin mi?"  invalidates: [ListOrders]  on NotProcessable toast "…" }
action New -> screen NewOrder                 # client-only (ad hiçbir uses-command'a çözülmüyor)
@chart.timeseries GetMetrics                  # extension component
```

- **list/detail/value yalnız QUERY'ye** bağlanır; `list`↔liste-out, `detail`/`value`↔tekil-out
  (uyumsuzluk error). Arg kaynakları: ekran-param, `session.*`, `currentUser.*`, state,
  literal; list-satır bağlamında `row.*`.
- **`as <ad>`**: aynı op'u bir ekranda ≥2 bileşen kullanınca ZORUNLU (ad-çakışması error).
- **`show a, b`** (list/detail): görüntü-şekli; yazılmazsa default = TÜM out-alanları
  beyan sırasıyla (üreteç tahmin etmez — belgeli default).
- **`paginated infinite|pager`** yalnız list; niyet ZORUNLU (çıplak `paginated` yok).
- **form** yalnız COMMAND'a bağlanır (submit); düzenleme deseni `loads query <TekilQuery>`.
  `field <ad> { required | min: N | max: N | pattern: "…" }`; çok-adım `step Ad { field… }`;
  çapraz-alan `rule <ifade>` (ifade yalnız form input-alanlarına + izinli köklere bakar).
- **action**: adı bir `uses command`'a çözülürse command-bağlı; çözülmezse **client-only**
  (nav/set için; mekanik anlamsız → warning; query'ye bağlanamaz → error). Üyeler:
  `visible-when: <ifade>` · `confirm ["<metin>"]` · `invalidates: [Q1, Q2]` ·
  `set <state> = <ifade>` · `on <Result> <handler>`. Satır-aksiyonu = list gövdesine yazılan action.

## 7. Result-handler'lar (karar #11/#36)

```
on Success -> screen MyOrders            # nav (parametre sayısı hedef ekranla eşleşmeli)
on ServerError toast "Bir hata oluştu" retry
on NotAuthorized banner "Yetkiniz yok"
on NotValid inline-errors                # YALNIZ form bağlamında
on ServerError retry
```

- Cascade: experience-düzeyi varsayılan + form/action override (yalnız özelini ezer).
- **Firing-point:** `remote` → sunucu-onayında (senkron). `queue` → `on Success`
  **enqueue-anında** (optimistic); sunucu reddi sync sonrası `when SyncFailed/SyncConflict`
  kanalına düşer.
- **queue×out KURALI (error):** `queue`'lu op'un `on Success` handler'ı op'un
  out-alanlarına referans veremez (cevap henüz yok) — yalnız client-side değerler.
- Handler-tamlık: efektif result-kümesi − (kendi handler ∪ experience-default) →
  kapsanmayan non-Success = warning; çalışma zamanında ServerError-handler'ı gibi işlenir
  (belgeli default).

## 8. UI-event'ler (karar #22/#38/#46 — backend'den BAĞIMSIZ)

```
on enter { refresh ListOrders }             # ekran lifecycle (enter/leave)
on activate(ListOrders) -> screen Detay(row.id)   # birincil aktivasyon (tap/click/Enter)
on secondary(ListOrders) -> screen Menu           # ikincil (longpress/sağ-tık)
on timer(30 s) -> refresh ListOrders        # girişten 30sn sonra BİR KEZ
on interval(5 m) -> refresh Ozet            # görünürken HER 5dk'da (tekrarlı)
```

- Eylemler: `refresh Q1, Q2` · `screen X(arg)` · `set s = <ifade>` · `invalidates: [Q]` ·
  `action <ad>`; tek eylem `->`, çoklu `{ … }`.
- Etkileşim hedefi = AYNI ekranda bildirilmiş bileşen (ad = op-adı / `as` alias);
  **hedefsiz** activate/secondary yalnız bileşen GÖVDESİNDE yazılır = "bu bileşen"
  (satır-nav: `on activate -> screen X(row.id)`).
- Birimler: `ms | s | m | h` (`timer(30s)` bitişik de yazılır).
- Backend-event çıpası YOK; canlı-push v1-dışı.

## 9. when-deltaları (karar #13/#30)

```
when offline { banner "Çevrimdışı" }        # experience- veya screen-düzeyinde
when empty   { banner "Henüz kayıt yok" }   # YALNIZ list/detail gövdesinde (query-yaşamdöngüsü)
when loading { … }                          # YALNIZ list/detail gövdesinde
```

- Delta fiilleri: `banner "…"` · `badge "…"` · `hide <hedef>` · `reveal <hedef>`
  (hedef = aynı ekranda bileşen/region adı).
- `offline|syncing|SyncFailed|SyncConflict` = bağlantı/sync ekseni (experience/screen);
  `empty|loading` = query-yaşamdöngüsü (yalnız list/detail gövdesi — aksi error).

## 10. Client-state (karar #17/#31)

```
state filtre: string = "all"          # ephemeral
persisted state sepet                 # cihazda kalıcı
derived toplam = sum of items.price   # saf ifade; oto-recompute; girdi yüklenmemişse loading
```

- Kapsam lexical: experience-düzeyi = global, screen-düzeyi = yerel. Mutasyon açık
  (`set` — sessiz two-way binding yok). Aggregate sözdizimi `sum of x.y` (fonksiyon
  çağrısı `sum(...)` DEĞİL).

## 11. Navigasyon & flow (karar #8/#21)

```
nav MyOrders -> Ayarlar                              # açık kenar
flow Gezinme realizes flow BrowseOwnOrders = [MyOrders]
flow SiparisVer = [MyOrders -> NewOrder -> MyOrders] # realizes'siz de legal
```

- `flow` davranış TANIMLAMAZ — ekran-sırasına işaret eden bildirimsel yolculuk katmanı.
- `realizes flow <BizFlowID>` yalnız business TEK-AKTÖR flow'una; kapsama denetlenir
  (flow'un tüm op'ları adım-ekranlarında sunulmalı — eksik warning).

## 12. Keyword tuzakları (yazım-anı — İ1-İ4 + rezervler)

- **`row` keyword DEĞİLDİR** — expression path kökü (`row.id`). Satır-nav: `row -> …`
  YOK; bileşen-içi hedefsiz `on activate -> screen X(row.id)`.
- Region rolü **`statusbar`** (`status` DEĞİL — `status` alan adı olarak serbest kalmalı).
- when-delta "göster" fiili **`reveal`** (`show` görüntü-şekli keyword'üdür).
- Timer: `timer(30 s)` = NUMBER + birim; `30s` bitişik de parse olur.
- ID-biçimli keyword'ler alan/param/region adı olarak SERBESTTİR (`value`, `role`,
  `state`, `list`, `show`, `min`, `status`… — TokenBuilder çözer; gömülü validator'la
  deneysel doğrulandı). TEK İSTİSNA — alan/param adı OLAMAZ: **`and or sum of true false`**
  (expression kelime hazinesi — parse hatası verir). Çakışan alan adını yeniden adlandırt.
- Karşılaştırma **tek `=`** (`==` parse HATASI); `!=` var; `not` YOK.
