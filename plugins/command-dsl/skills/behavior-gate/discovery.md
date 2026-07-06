# Discovery agent kontratı — repo → adapter draft

Bu doküman, `behavior-gate` skill akışının Claude tarafından **spawn edilen** taze-bağlam
discovery agent'ına verilecek **kontrattır**. Çalıştırılabilir bir script DEĞİLDİR; agent'ın
uyacağı talimatlar bütünüdür (prose). Agent bunu okur, aşağıdaki çıktı-şekillerini üretir.

---

## 1. Rol ve izolasyon (DOER ≠ CHECKER)

- **Sen bağımsız bir taze-bağlam agent'sın.** Kodu YAZAN oturum DEĞİLSİN. Uygulamanın nasıl
  inşa edildiğine dair hiçbir **oturum-bağlamı** almazsın (DOER ≠ CHECKER). Adapter'ın bağımsız
  bir *iddia* olması için bunu koruman zorunludur: eğer kodu yazan bağlamı görürsen adapter
  bağımsız-iddia olmaktan çıkar ve dairesellik doğar.
- **Yalnız iki girdin var:** `{ repo path, manifest path }`. Başka hiçbir bağlam yok.
- Ürettiğin her şeyi **yalnız bu iki girdiden** okuduğun kanıta dayandır.

### Ne üretirsin
1. `adapter.json` — **base = invocation surface** (uygulama NASIL sürülür / çağrılır),
   `gate.mjs` sözleşmesine birebir uyan.
2. `gaps.json` — `requiredRuntimeInputs[]`; discovery'nin repo'dan statik olarak
   **çözemediği** ve runtime-input UX'inin (resolve.mjs) dolduracağı boşluklar.
3. `unmappable[]` — manifest'te olup uygulamada **eşleştirilemeyen** yükümlülükler (dürüst boşluk).

### ⭐ Oracle duvarı (ihlal = dairesellik)
- Repo'dan **"NASIL invoke edilir"i** okursun: endpoint yolu, HTTP metodu, auth header adı,
  boot komutu, state-read endpoint'i, hata alanı adı. Bunlar mekanizmadır.
- **"DOĞRU cevap ne"yi ASLA repo'dan/implementasyondan okumazsın.** Beklenen değerler
  (bir op'un geçmesi/reddedilmesi gereken input, bir invariant'ın tutması gereken sonuç)
  yalnız **spec + seed**'den gelir ve bunları **gate hesaplar** — senin işin değil.
- Uygulamanın kendi kabul/ret davranışını "doğru cevap" olarak kopyalarsan, kontrolü
  test edilen sistemin kendisine yaptırmış olursun (tautology). Bunu YAPMA.

### VERDICT VERMEZSİN
- Discovery bir **kurulum üretir** (adapter + gaps), **verdict VERMEZ**. PASS/FAIL/realized/
  proven-fail kararını yalnız `gate.mjs` verir. Sen "geçti/kaldı" demezsin; yalnız
  "şöyle sürülür + şu boşluklar var" dersin.

---

## 2. Çıktı şekli: `adapter.json` (gate.mjs sözleşmesi — evidence + provenance ZORUNLU)

`gate.mjs`'in **gerçekten okuduğu** alanlar aşağıdadır. Yalnız bunları üret; gate'in okumadığı
alan **uydurma**. Her yaprak-alan için `evidence` + `provenance` + `confidence` ekle.

### `boot` — uygulamayı başlatma
```
"boot": {
  "cmd": "node",              // yorumlayıcı/çalıştırıcı — package.json "scripts"/README'den
  "arg": "server.mjs",        // giriş dosyası (gate <appDir>/<arg> olarak sürer)
  "port": 9100,               // uygulamanın dinlediği port (gate per-probe kendi PORT'unu dayatır; yine de sağla)
  "readyTimeoutMs": 3000,     // hazır olana kadar beklenecek süre
  "env": { }                  // boot için gereken ortam değişkenleri (ör. API_TOKEN) — .env.example/koddan
}
```
- `env` içindeki her **secret** (ör. `API_TOKEN`) repo'da `.env.example` veya boot kodunda
  presence-check olarak görünüyorsa → değerini **uydurma**, bir **gap** (`kind: boot-secret`)
  olarak flag'le. Evidence: boot dosyasındaki throw/guard satırı.

### `errorField` — hata gövdesindeki alan adı
- Uygulamanın hata JSON'unda hata mesajını taşıyan alanın adı (ör. `error` veya `result`).
  Gate reddi bu alandan okur. Kaynak: hata döndüren kod satırı.
- `evidence: "app/server.mjs:31"` + `provenance: auto-discovered`.

### `operations[opId]` — op başına çağrı yüzeyi
opId, **manifest'teki op id'siyle** birebir aynı olmalı.
```
"operations": {
  "PlaceOrder": {
    "endpoint": { "method": "POST", "path": "/orders" },  // route tanımından
    "authHeader": "x-user-role",                            // auth okuyan satırdan (header adı)
    "principals": {
      "authorized":     "<rol değeri>",     // op'u yapmaya YETKİLİ principal — çoğu zaman RUNTIME gap
      "underPrivileged":"<rol değeri>"      // yetkisiz ama authenticated principal — NEGATİF kontrol; çoğu RUNTIME gap
    },
    "satisfyBody": { "amount": 100 },        // op'u geçiren GEÇERLİ örnek gövde — spec'ten türet
    "field": "amount",                        // payload-guard'ın hedef alanı (validation/rule)
    "seed": { }                               // predikat RHS'i path ise çözmek için seed değerleri — spec'ten
  }
}
```
- `endpoint` + `authHeader`: **repo'dan** (mekanizma — oracle duvarının güvenli tarafı).
- `principals.authorized` / `principals.underPrivileged`: rol **değerleri** çoğunlukla
  runtime'a aittir → bunları **gap** olarak flag'le (`kind: principal`), uydurma.
- `satisfyBody` / `field` / `seed`: **spec + op body şeklinden** türet; "doğru cevabı"
  koddan kopyalama (oracle duvarı).

### `operations[opId].satisfyHeaders` — STACKED guard izolasyonu (tüm probe'lar TÜKETİR)
Bir op **BİRDEN ÇOK header-tabanlı guard** stack'lerse (ör. `roles` VE `scopes` aynı op'ta — gerçekçi
authz'de scope hep role'ün üstüne biner), her probe kendi ekseninin header'ını varyasyonlarken **DİĞER
guard'ları tatmin eden** header'ları da göndermelidir; yoksa app diğer guard yüzünden reddeder → pozitif
kontrol accept alamaz → o eksen sahte-DARK ("apparatus broken"). Bunu önlemek için: op'un tüm
header-tabanlı guard'larını tatmin eden header seti. Şekil:
```json
"satisfyHeaders": { "x-role": "Admin", "x-scope": "access:grant" }
```
- Header ADLARI **repo'dan** (auth/scope okuyan satırlar — mekanizma, oracle duvarının güvenli tarafı).
- Satisfy DEĞERLERİ **spec'ten**: role-header değeri = `op.roles[0]`; scope-header değeri = `op.scopes[0]`'ı
  tatmin eden geçerli bir scope string'i. Değeri koddan (accept/reject davranışından) türetme — spec+seed.
- Gate spread-merge eder ve **hedef eksenin header'ı DAİMA kazanır** → izolasyon bozulamaz; bu yüzden
  satisfyHeaders'ın hedef ekseninin header'ını da içermesi zararsız (probe override eder).
- Değer belirsiz/dış-otorite ise **gap** (`kind: satisfy-header`, must-ask) → yoksa o op'un stacked
  eksenleri DARK (graceful degradation). Tekil-guard op'ta satisfyHeaders GEREKMEZ (atla).
- ⚠️ **OR/bypass caveat:** app "Admin her guard'ı bypass'lar" (OR) semantiğindeyse, negatif kontrol
  yanlış-atfı realized'ı şişirebilir; pozitif kontrol bunu yalnız AND semantiğinde tam doğrular. Bilinen
  sınıf (satisfyBody'de de var), yeni vektör değil.

### `operations[opId].scopeAxis` — scope-obligation ekseni (scope-probe TÜKETİR)
`op.scopes` **non-empty** ise op'un bir scope yükümlülüğü vardır; scope-probe (`gate.mjs`'in
`oa.scopeAxis`'i) bunu tüketir. Şekil:
```
"scopeAxis": {
  "authHeader": "x-user-role",   // opsiyonel; verilmezse op-level authHeader kullanılır
  "withScope":  "<scope'u OLAN principal/token>",                  // POZİTİF: kabul edilmeli
  "withoutScope": "<authenticated ama scope'u OLMAYAN principal>"  // NEGATİF: reddedilmeli
}
```
- `withScope` / `withoutScope` **credential değerleridir** → genellikle RUNTIME gap
  (spec'ten türetilemez; dış-otorite hesabı). `withoutScope` = authenticated-but-unscoped
  (yetkilendirilmiş ama bu scope'a sahip olmayan principal), NEGATİF kontrolün tarafıdır.
  Her alan `evidence` + `provenance` + `confidence` taşır.
- **Oracle duvarı:** with-scope / without-scope kimlikleri **spec + seed / runtime-input**'tan
  gelir; "hangi scope kabul edilir"i implementasyondan KOPYALAMA — kabul/ret kararını gate verir.

### `operations[opId].replayCases` — no-duplicate/existence replay çiftleri (replay-probe TÜKETİR)
Bir op bir **no-duplicate / existence guard** taşıyorsa — structured `op.idempotent.keys` VAR
**VEYA** bir validation/rule guard'ının prose predicate'i `exists(...)` / `unique(...)` /
"already exists" semantiği taşıyor (bu bir **İNSAN/DISCOVERY YARGISIDIR**, gate name-sınıflandırması
DEĞİL) — o guard için bir replay çifti üret. replay-probe (`gate.mjs`'in `oa.replayCases`'i)
bunu tüketir. Şekil (guard-label başına bir giriş):
```
"replayCases": {
  "<guardRef/label>": {
    "authHeader": "x-user-role",   // opsiyonel; verilmezse op-level authHeader
    "first":  { ...geçerli kayıt (belirli bir idempotency-key ile)... },
    "replay": { ...AYNI idempotency-key'li duplicate... }
  }
}
```
- `<label>` = guard'ın **guardRef/label**'ıdır (gate verdict'i `replay:<label>` olarak raporlar).
- `first` = geçerli bir kayıt yaratan gövde; `replay` = **aynı key**'li duplicate. İkinci çağrının
  reddedilmesi (veya çift-etki oluşmaması) beklenir — bunu **gate gözlemler**, discovery değil.
- **Oracle duvarı:** çiftler **spec + seed**'den gelir (key değeri = seed/örnek), impl'den DEĞİL.
  Gate `name`'e BAKMAZ; bu case'in **VARLIĞI** (discovery + insan yargısı) probe'u tetikler.
  Case yoksa o guard **DARK** (sessiz-yeşil değil). Emsal:
  `grup2-poc/tier1-real/adapter.complete.json` → `cases.NoDuplicate.{first,replay}` (aynı `k-dup` key).

### `entities[entId]` — entity başına state-oracle
entId, **manifest'teki entity id'siyle** birebir aynı olmalı.
```
"entities": {
  "OrderBook": {
    "stateRead": { "method": "GET", "path": "/orders/summary" },  // invariant'ı GÖZLEMLEYEN read endpoint
    "driveOp": "PlaceOrder",                                       // state'i süren op id (operations[] içinden)
    "trajectory": [10, 20, 30]                                     // driveOp'a gönderilecek geçerli girdi dizisi
  }
}
```
- `stateRead` uygulamada **read-endpoint** olarak varsa repo'dan al; **yoksa** bir
  **gap** (`kind: state-read`) veya `unmappable` olarak işaretle — invariant aksi halde DARK olur.
- `driveOp`: `operations[]` içindeki bir op id. `trajectory`: geçerli sürüş girdileri (spec'ten).

### Provenance sözleşmesi
- Her yaprak-alan: `evidence: "dosya:satır"` (o değeri doğuran kanıt) + `provenance` +
  `confidence` (0-1).
- **`provenance` başlangıç değeri daima `auto-discovered`'dır.** Gate bunu pozitif+negatif
  **control** ile doğrulayınca `control-validated`'e; runtime-input insan doldurunca
  `user-provided`'a; hiç doldurulamazsa `absent`'e döner.
  (Değerler: `auto-discovered | control-validated | user-provided | absent`.)

---

## 3. Çıktı şekli: `gaps.json` (resolve.mjs sözleşmesi)

`gaps.json` bir dizidir; her elemanı **tam olarak** resolve.mjs'in tükettiği şekle uymalı.
`adapterPath`, resolve.mjs'in `setPath`'inin beklediği **nokta-ayrılı** yoldur (base-adapter
içine bu yolla yazılır).

```json
{
  "id": "<benzersiz>",
  "kind": "auth-cred|boot-secret|seed|state-read|event-tap|principal",
  "adapterPath": "operations.PlaceOrder.principals.underPrivileged",
  "why": "<neden gerekli — non-expert için düz anlatım>",
  "evidence": "dosya:satır (bu boşluğu doğuran kanıt)",
  "proposable": "<güvenli test-değeri VEYA null>",
  "skipConsequence": "<atlanırsa hangi obligation DARK>"
}
```

- **`kind` = advisory etiket.** resolve.mjs `kind`'e göre **dallanmaz**; yalnız gösterimde
  kullanır. `principal` = auth-matrix credential gap'i (authorized/underPrivileged rol değeri).
- **`adapterPath`** = resolve.mjs `setPath` hedefi. Nokta-ayrılı olmalı; ör.
  `boot.env.API_TOKEN`, `operations.PlaceOrder.principals.underPrivileged`,
  `entities.OrderBook.stateRead`. Bu yol §2'deki adapter alanlarından birine denk gelmeli.
- **`proposable = null` → must-ask** (resolve.mjs bunu `ASK` olarak işaretler, insan
  cevaplamazsa `absent`). `proposable != null` → **auto-proposed** (güvenli test-değeri).

### Test-değer bias (§11.3) — `proposable` ne zaman null?
- Uygulama secret'ı **yalnız iç-tutarlılık** için kontrol ediyorsa (ör. `env == header`,
  presence-check) → `proposable` = **throwaway** bir test değeri öner (ör. `"test-token-poc"`).
  Dış bir otoriteye doğrulanmadığı için uydurma-değer güvenlidir.
- Uygulama **dış-otoriteye** doğruluyorsa (gerçek OAuth, gerçek düşük-yetki hesabı) →
  `proposable = null` (**must-ask**); uydurma değer yanlış-yeşile yol açar, bunu yapma.
- Keyfî-rol (herhangi authenticated non-authorized rol yeterliyse) → örnek bir rol
  değeri **proposable** edilebilir; gerçek bir hesap gerekiyorsa `null`.

### Yeni gap tetikleyicileri: `scope-cred` + `replay-case`
Bu iki gap, §2'nin yeni adapter alanlarını (`scopeAxis` / `replayCases`) doldurur. `kind` yine
**advisory** (resolve.mjs `kind`'e göre dallanmaz), sadece gösterimde kullanılır.

- **`op.scopes` non-empty** → `kind: 'scope-cred'` gap.
  - `adapterPath: operations.<op>.scopeAxis` (with-scope / without-scope credential'lar buraya yazılır).
  - `proposable`: with-scope test-değeri **önerilebilir** (arbitrary scoped token yalnız iç-tutarlılık
    için kontrol ediliyorsa); ama **without-scope authenticated principal genelde `null`/must-ask** —
    dış-otorite hesabıdır, uydurma değer yanlış-yeşile yol açar.
  - `skipConsequence`: "scope obligation DARK — scope-axis kontrolü koşturulamaz".

- **No-duplicate/existence guard** (structured `op.idempotent.keys` VAR **VEYA** bir validation/rule
  guard'ının prose predicate'i `exists(...)` / `unique(...)` / "already exists" semantiği taşıyor —
  bu bir **İNSAN/DISCOVERY YARGISI**, gate name-sınıflandırması DEĞİL) → guard-label başına
  `kind: 'replay-case'` gap.
  - `adapterPath: operations.<op>.replayCases.<label>`.
  - `proposable`: `first`/`replay` çifti **seed'den türetilebiliyorsa öner** (aynı key); yoksa
    must-ask (`null`).
  - `skipConsequence`: "o no-duplicate/existence obligation DARK".
  - Discovery HANGİ guard'ların replay-case adayı olduğunu **prose + evidence** ile işaretler ve
    gerekçe verir (name-whitelist ile DEĞİL — §4 call-node honesty notu).

---

## 4. İzolasyon, evidence-audit ve dürüst bulgu-flag'leri

### Kaydedilen-prompt + leak-audit
- Discovery'ye verilen **tam prompt kaydedilir**. Bu prompt içinde uygulamanın **nasıl
  yazıldığına dair sızıntı (leak) OLMAMALIDIR** — kodu yazan oturumun kararları, "şu guard'ı
  koydum", "burada validation eksik" gibi ipuçları sızarsa DOER ≠ CHECKER izolasyonu bozulur.
- Bu **leak-audit** SKILL.md akışının denetlediği bir sözleşmedir (T2.1). Girdi kümesi
  daima **{repo, manifest}-only** olmalı; başka bağlam eklenmez.

### Evidence-audit (her iddia kanıtlı)
- Adapter'daki her yaprak-alan ve her gap, `evidence: "dosya:satır"` taşımalı. Kanıtsız
  hiçbir alan üretme — kanıtlanamıyorsa o alan bir **gap** ya da `unmappable`'dır.

### Adapter = İDDİA (güvenilmez draft)
- Ürettiğin adapter **güvenilmez bir draft = iddiadır**. Doğruluğunu sen kanıtlamazsın.
- `gate.mjs` her alanı **pozitif + negatif control** ile doğrular: yetkili→kabul VE
  yetkisiz→ret ikisi birden tutmazsa aparat DARK sayılır. Yanlış bir endpoint yolu bile
  pozitif kontrolden geçemez → o obligation **DARK** olur (yanlış-yeşil değil). Yani senin
  hatanın maliyeti "sessiz yeşil" değil, "açık DARK"tır — ama yine de doğruya en yakın
  iddiayı üret.

### Dürüst flag'ler (§12.H — gizleme, açıkça işaretle)
Discovery spike'ının çıkardığı üç tipik durum; bunları **gap** veya `unmappable` olarak
AÇIKÇA işaretle, asla sessizce geçiştirme:
- **stub-validator:** body-validator bir stub ise (schema-reject yok, her gövdeyi kabul
  ediyor) → payload-guard **false-proven-fail** riski. Bunu flag'le (adapter'ı "guard var"
  gibi sunma).
- **header-only-auth:** auth yalnız header okuyorsa (secret/imza doğrulaması yok) →
  under-privileged principal "bedava" elde edilir; auth-cred gap'ini ve bu zayıflığı belirt.
- **state-read-yok:** invariant'ı gözlemleyecek read-endpoint statik olarak bulunamıyorsa →
  `stateRead` bir **gap** (`kind: state-read`, `proposable: null`) veya `unmappable`; invariant
  aksi halde **DARK** (gözlemlenemez) olur.

### Call-node / no-duplicate: name-heuristic UNSOUND → adapter-case SOUND
- Gate call-node `name`'ini **SINIFLANDIRMAZ**: `name` serbest bir identifier'dır — `unique` /
  `exists` semantiği taşıyan bir guard, `ibanValid` gibi sıradan bir alan-guard'ından **ayırt
  edilemez** → bir isim-whitelist ile "bu call no-duplicate'tir" demek **name-heuristic UNSOUND**'dur
  (yanlış-pozitif/negatif üretir). Bu yüzden gate isimden kapsama çıkarmaz.
- Bunun yerine no-duplicate/existence guard'ları **adapter-sağlanan replay-case** ile **SOUND**
  kapsanır. HANGİ guard'ın case aldığına **discovery + insan** prose+evidence ile karar verir
  (scoped-credential / stateRead gibi bir **runtime-input yargısı**); verdict accept/reject
  **gözleminden** gelir, isimden değil.
- Case sağlanmazsa o guard **DARK** (doğru — sessiz-yeşil değil). Yani existence-kapsamasının
  SOUND yolu adapter-case'tir; name-heuristic ise yasaktır. `abac` obligation'ları tier-2.

---

## 5. Özet akış (agent adımları)
1. `{repo, manifest}` dışında hiçbir bağlam kullanma (leak-audit).
2. Repo'yu tara → boot komutu, endpoint'ler, authHeader, errorField, state-read'i **kanıtla**.
3. Manifest op/entity id'lerini adapter anahtarlarıyla **birebir** eşle.
4. Koddan çözülebilen mekanizmayı `adapter.json`'a yaz (her alan evidence + `auto-discovered`).
5. Çözülemeyen değerleri (secret, principal rolleri, eksik state-read) `gaps.json`'a şekle
   uygun (`adapterPath`/`proposable`/`skipConsequence`) yaz; test-değer bias'ını uygula.
6. Eşleştirilemeyen yükümlülükleri `unmappable[]`'a düşür.
7. **Verdict verme.** Çıktıyı gate'e ve runtime-input UX'ine devret.
