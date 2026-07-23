# Tech → QA eşlemesi (.tcdsl + operations.json → .qa)

> **En kritik dosya.** Faz 2-5'te oku. Dal envanteri kullanıcıdan DEĞİL, buradaki
> mekanik türetimden çıkar — kullanıcıya yalnız KARAR sorulur (nasıl test / neden
> waive). İki girdinin NE verdiğini karıştırmak bu skill'in en büyük hata sınıfıdır:
> dal/veri/stub/assert **tech**'ten, akış/süreç evreni **operations.json**'dan gelir.

## A. `.tcdsl` clause → dal eşleme tablosu (spec §4.1 birebir + §4.5 event-tetikli satırı)

> **Envanteri VALIDATOR'DAN al — elle dal türetme YASAK (Q1-B).** Aşağıdaki tabloya bakıp
> op'un dallarını kafadan saymak sessizce eksik kalır — **ölçüldü:** `Filtered` dalları elle
> **0** sayıldı, gerçekte **12** vardı (`list of` dönen op'ların `ownership`/`permit` filtreleri
> gözden kaçmıştı). TAM ve AUTHORITATIVE envanter tek yerden gelir: **boş bir `.qa` yaz +
> `--strict --json` çalıştır → `qa.uncovered-branches` kaydının `.message`'ını AYRIŞTIR.**
> Kopyala-çalıştır dizisi:
>
> ```bash
> # 1) Boş sonda `.qa` — YALNIZ kökler; hiç test / senaryo / waive YOK.
> #    (`uses flows` 0..1: operations.json yoksa o satırı at.)
> cat > _envanter.qa <<'EOF'
> qa "dal envanteri sondasi"
> uses tech "./<AD>.tcdsl"
> uses flows "./<AD>.operations.json"
> EOF
>
> # 2) Strict + json ile koştur. Çıktı = saf diagnostics dizisi
> #    [{severity,line,col,message,file,code?}].
> node ${CLAUDE_SKILL_DIR}/validator/qcdsl.mjs _envanter.qa --strict --json
>
> # 3) DİKKAT — KAYIT SAYMA: qcdsl `uses tech` node'u başına TEK bir (aggregated)
> #    `qa.uncovered-branches` kaydı üretir; TÜM op'lar ve dalları o kaydın `.message`'ında
> #    BİRLEŞİKTİR. Kayıtları saymak eksik SAYAR (tekniğin önlediği hatanın ta kendisi).
> #    Envanteri `.message`'ı AYRIŞTIRARAK çıkar (sınırlayıcılar):
> #      ' · ' → op'ları ayırır  ·  ': ' → op ile dal-listesini ayırır  ·  ', ' → dalları ayırır
> #    Boş `.qa`'da HER dal kapsanmamıştır → ayrıştırılan liste = TAM envanter (elle türetim DEĞİL).
>
> # 4) (opsiyonel) aggregated `.message` metnini çek (kayıt DEĞİL — metni yukarıdaki gibi ayrıştır):
> #    … --strict --json | jq -r '.[] | select(.code=="qa.uncovered-branches") | .message'
>
> # 4) Sonda dosyasını temizle (throwaway).
> rm _envanter.qa
> ```
>
> **Dipnot — `list of` manifest kaybı AYRI iştir (Q1-C / plan 1.6):** bu teknik ondan
> BAĞIMSIZ çalışır — envanteri `.qa`+validator üretir, manifest'ten OKUMAZ. "returns-collection
> bilgisi manifest'te henüz yok" bir **mevcut-durum tespitidir**, taahhüt değil; teknik onun
> düzelmesini beklemez.

Op-başına, **validator'ın listelediği her dalı** bu tabloyla kullanıcıya düz dille sun
(tablonun rolü envanteri SAYMAK değil — validator sayar — çeviridir):

| Tech clause | Doğurduğu dal | covers biçimi | Kullanıcıya düz-dil sunumu |
|---|---|---|---|
| her operation | Success | `covers Success` | "başarılı çağrı" |
| `validation { … for guard "x" }` | guard-dalı (NotValid sınıfı) | `covers guard "x"` | "girdi kuralı: <kuralın anlamı>" |
| `rule { … for guard "y" }` | guard-dalı (NotProcessable sınıfı) | `covers guard "y"` | "iş kuralı: <kuralın anlamı>" |
| op imzasında param refinement'ı — `p: T in 1..N` \| `p: T in {a \| b}` (yalnız GEÇERLİ refinement; param başına BİR dal) | **refinement sınır-ihlali dalı** (NotValid sınıfı); ruleId `<param>.range` \| `<param>.union` — tech manifest `violations[].ruleId` ile AYNI id (üreteç join anahtarı) | `covers guard "<param>.range"` / `covers guard "<param>.union"` (MEVCUT guard yüzeyi — YENİ sözdizimi YOK) | "sınır-dışı girdi: <param> (ör. 1..10000 dışında tutar / izinli listede olmayan değer)" |
| `throws E` | named-error dalı | `covers error E` | "<E'nin anlamı> hatası" |
| `roles …` | NotAuthorized·roles | `covers NotAuthorized roles` | "yanlış roldeki kullanıcı" |
| `ownership …` — op **KOLEKSİYON dönmüyorsa** (`public`/`any`/`all` hariç — dal türetmez, waive de yazma) | NotAuthorized·ownership | `covers NotAuthorized ownership` | "başkasının kaydına erişim" |
| `ownership …` — op **`list of X` DÖNÜYORSA** (ADR-0040) | **Filtered·ownership** | `covers Filtered ownership` | "başkasının kayıtları listede GÖRÜNMEMELİ" |
| `permit when …` — op **KOLEKSİYON dönmüyorsa** | NotAuthorized·permit | `covers NotAuthorized permit` | "koşullu izin dışı çağrı" |
| `permit when …` — op **`list of X` DÖNÜYORSA** (ADR-0040) | **Filtered·permit** | `covers Filtered permit` | "koşulu sağlamayan kayıtlar listede GÖRÜNMEMELİ" |
| `scope …` | NotAuthorized·scope | `covers NotAuthorized scope` | "kapsam dışı çağrı" |
| id'siz validation check(ler)i | TEK anonim NotValid dalı (S5) | `covers NotValid` | "adsız girdi kuralları (topluca)" |
| id'siz rule check(ler)i | TEK anonim NotProcessable dalı (S5) | `covers NotProcessable` | "adsız iş kuralları (topluca)" |
| `calls <Ext.Op> compensate with <Ext.Op2>` — hedef `external`\|`uncharted` | callFailure dalı | `covers callFailure <Ext.Op>` | "dış servis çökerse (telafisiyle)" |
| `on Module.Event` (consumer op) | dal uzayı AYNI kurallarla; tek fark act biçimi | test `when event … with { … }` yazar (karar #11) | "olay gelince ne yapıyor" |

- **Refinement dalının sınırları:** yalnız **op imzasındaki param**'ların refinement'ları dal
  doğurur — entity **FIELD** refinement'ı dal DOĞURMAZ (girdi yüzeyi değil; ihlali zaten kurulamaz).
  Geçersiz refinement (tech-side error: inverted range, boş union vb.) da dal doğurmaz. Türetilmiş
  outcome Model-C'dir: `NotValid` + `guard = <param>.<kind>`. Dal `waive <Op> covers guard
  "<param>.<kind>" because "…"` ile de kapatılabilir (strict: test ya da waive — üçüncü yol yok).
  İhlal girdisini ELLE kur (§I negatif-veri kuralı): range için sınır-dışı sayı, union için
  liste-dışı değer — validator girdinin gerçekten ihlal ettiğini İDDİA ETMEZ.
- Karşılıksız hedef (olmayan guard-id, olmayan error, mekanizmasız op'a NotAuthorized,
  olmayan mekanizma-niteleyicisi, compensate'siz/iç calls'a callFailure) → **error**
  (covers/expect/waive üçünde de aynı kural — spec §4.3/m6).
- Aynı dalı birden çok test kapsayabilir (redundans serbest; merged `coveredBy[]`
  hepsini listeler). Senaryo `expect`'leri de coverage'a sayılır (karar #12).

## A1a. Tech `guarantee` → coverage rollup (guarantee-coverage sinerjisi)

Tech DSL'de bir `guarantee` (çapraz-kesen izlenebilirlik; tech-dsl §11) **yeni dal
DOĞURMAZ** — zaten §A'da türettiğin guard/throws dallarına bir **eşleme** koyar. QA
tarafı guarantee YAZMAZ; merged `qa.json`'a garantinin **rollup**'ını ekler. Yükümlülük
türü → durum kaynağı:

| Guarantee yükümlülüğü | testable? | coverage durumu nereden |
|---|---|---|
| `by guard <Op> : "id"` | **evet** | o op'un `guard "id"` dalının QA durumu (covered/waived/uncovered) — §A |
| `by throws <Op> : E` | **evet** | o op'un `error E` dalının QA durumu — §A |
| `by invariant <Ent> : "etiket"` | hayır | **structural** (dal değil; `coveredBy: []`, rollup dışı) |
| `by operation <Op>` | hayır | **structural** (belirli dal yok) |

- **Garanti rollup'ı:** `covered` (tüm testable yükümlülük covered/waived) · `partial`
  (bazısı) · `uncovered` (hiçbiri) · `structural` (hiç testable yok — yalnız invariant/operation).
- **Türetim mekaniği:** guarantee'nin `by guard`/`by throws` işaret ettiği op-dalı zaten
  §A envanterindedir; onu test/waive ederek garantiyi de ilerletirsin. Ekstra bir `covers`
  biçimi YOK — guarantee'ye doğrudan test yazılmaz, yükümlülük-dalları test edilir.
- **Sorgulama sinyali:** `partial`/`uncovered` bir garanti = çapraz-kesen bir güvencenin
  test-kapsaması eksik. CLI `garantiler:` özeti + `⚠` ile kapsanmayan yükümlülükleri listeler;
  kapanışta (Faz 6) "bu garantinin şu guard'ı test edilmemiş — test mi, waive mı?" sorusuna çevir.

## A2. `Filtered` arketipi — satır-kapsaması REDDETMEZ, KISAR (ADR-0040 · qa v2.0.0)

**Ayıraç (tech'ten gelir, qa türetmez):** op **koleksiyon** mu dönüyor (`list of X`)?
- **EVET** → `ownership`/`permit` orada **filtreler**: sonuç **`Success` + ALT-KÜME**, red YOK →
  dal **`Filtered <via>`**.
- **HAYIR** (tekil dönüş / komut) → satır yüklenir, ön-koşul denetlenir, sağlamazsa **reddedilir** →
  dal **`NotAuthorized <via>`** (değişmedi).
- `roles`/`scope` **hiç etkilenmez** — çağrının TAMAMINI reddederler, satır kısmazlar.

> **Neden ayrı arketip:** `list of` dönen bir op'ta "başkasının kaydına erişim → 403" dalı **ASLA
> gerçekleşmez**. O dalı yazdırmak yazarı ya **yalan teste** ya **zorunlu-boş waiver'a** iter.
> Validator bunu error'la durdurur ve doğrusunu söyler.

**⚠️ ARKETİPİN KALBİ — üyelik İKİLİSİ ZORUNLU (error):** filtre **bozukken de sonuç `Success`tir**.
Bu yüzden "çağrı geçti" ya da "N satır geldi" **hiçbir şey kanıtlamaz**. Kanıt yalnız **üyelik**le olur:

| Assert | Neyi yakalar | Yoksa |
|---|---|---|
| `result contains { … }` | kapsam-**İÇİ** satır DÖNDÜ mü | **aşırı-filtreleme** (hak edilen satırlar düşüyor) görünmez |
| `result absent { … }` | kapsam-**DIŞI** satır DÖNMEDİ mi | **SIZINTI** görünmez ← güvenlik ekseni |

**`result count N` KANIT DEĞİLDİR** — yanlış satırlar dönse de sayı tutar → **false-negative üreteci**.
Validator `count`-only testi error'lar ve bu tuzağı açıkça söyler.

**Test verisi:** en az İKİ seed gerekir — biri kapsam içi, biri kapsam dışı (`ownership <axis>` ise
axis'in kaynak satırı da seed'lenmeli: "delegasyon var" + "delegasyon yok" durumları). Sahiplik
anahtarı **kimlik-dikişi** ise (OwnerId authored alan değil) kapsam-üyeliği seed gövdesinden
YAZILAMAZ — pin `seed … @owner(<persona>)` ile beyan edilir (qa v3.1.0; reference §6).

**⚠ persona ↔ principal değer bağı (DUR-BİLDİR):** qa `persona`'nın **öznitelik-değer yüzeyi
YOKTUR** (yalnız `persona <ad>: [role] <hedef>` — attribute yazılamaz). Çağıranın kapsam-alanı
değeri (`caller.<alan>`, ör. `caller.organizationId`) bu yüzden ancak **principal-binding
satırını persona-ref'li seed'leyerek** kurulur: kimlik alanına persona adını yaz
(`userId: ajans`), kapsam alanına axis-seed'iyle EŞLEŞEN değeri yaz. Bu bağ kurulamıyorsa
(binding entity'si seed'lenemiyor / kimlik alanı imzada yok) test deterministik değildir —
UYDURMA; DUR ve kullanıcıya bildir (§H2 protokolü), düzeltme yeri tech/gramer tartışmasıdır.

```
test "ajans yalnız delege edilmiş kampanyaları görür"
     of ListAgencyCampaigns covers Filtered ownership {
  as ajans
  given {
    // principal-binding satırı: çağıran `ajans`'ın organizationId'si BURADAN gelir
    // (persona'da attribute yüzeyi yok — değer bağı bu seed'le kurulur; axis-seed'iyle eşleşmeli)
    seed u1 = AgencyUserProfile { userId: ajans, organizationId: "A" }
    seed d1 = AgencyDelegation { agencyOrgId: "A", clientOrgId: "C1", status: "active" }
    seed c1 = Campaign { organizationId: "C1", id: "k1" }   // kapsam İÇİ  → görünmeli
    seed c2 = Campaign { organizationId: "C9", id: "k2" }   // kapsam DIŞI → görünmemeli
  }
  when call with { }
  then {
    result contains { organizationId = "C1" }
    result absent   { organizationId = "C9" }
  }
}
```

**Sorgulama kalıbı:** *"Bu liste yetkiye göre daralıyor — (a) kullanıcının GÖRMESİ GEREKEN bir kayıt
listede çıkmalı, (b) GÖRMEMESİ GEREKEN bir kayıt çıkmamalı. İkisi için de birer örnek kayıt tarif
eder misin?"* → (a) `result contains`, (b) `result absent`.

## B. NotAuthorized mekanizma-seçim rehberi (karar #21 + İQ8)

- Op'ta **TEK** yetki mekanizması varsa: çıplak `covers NotAuthorized` yeterlidir —
  emit'te etkin mekanizmaya çözülür (İQ8: per-file manifest'te bile `via:'roles'` vb.
  yazılır; `via:null` manifest'te görünmez). Yine de okunabilirlik için niteleyiciyi
  yazmak serbesttir.
- **BİRDEN ÇOK** mekanizma varsa (ör. `roles` + `ownership`): niteleyici **ZORUNLU**
  (niteleyicisiz → error "mekanizma belirtin"). Gerekçe güvenlik-kritiktir: yanlış-rol
  testi ownership yolunu sessizce örtmemeli.
- Sorgulama kalıbı (mekanizma-başına AYRI karar al): "Bu işleme iki ayrı kapı var —
  (a) yanlış roldeki kullanıcı, (b) doğru rolde ama **başkasının kaydına** erişen
  kullanıcı. Hangilerini test edelim, hangisini neden geçelim?" Tipik desen (spec §7
  exemplar): ownership yolu elle test edilir (`as musteri` + `seed p1 = … @owner(baskaMusteri)
  { … owner: baskaMusteri }` + `when call with { id: p1 }` — sahiplik-pini `@owner` ile;
  entity'de authored `owner` alanı da varsa ikisini TUTARLI kur), roles yolu P1
  jenerik-kimlik gerekçesiyle waive edilir.
- Test verisi ipucu: ownership testi İKİ persona ister (çağıran + kaydın sahibi) —
  Faz 1'de `baskaMusteri` benzeri ikinci kimliği ekletmiş ol.
- **Axis-tabanlı ownership'te (`ownership <axis> by …`) TEKİL-dönüşlü op'un
  NotAuthorized·ownership testi axis'in KAYNAK-SATIRLARINI da seed'lemeli:** ihlal
  "kaydın sahibi başka" değil, "çağıranın kapsam-alanı o kaydı İÇERMİYOR"dur. Çağıranın
  kapsam-alanı iki satır-katmanından kurulur: (1) **principal-binding satırı**
  (`binds <Entity> by <alan>` — çağıranın öznitelikleri buradan gelir; kimlik alanına
  persona-ref yaz: `seed u1 = AgencyUserProfile { userId: ajans, organizationId: "A" }`),
  (2) **axis-kaynak satırı** (`entity <Entity>` — kapsamı sayan tablo, ör. delegasyon).
  İhlal testi: hedef kaydı çağıranın axis-üyeliği OLMADAN seed'le (kaynak satırı YOK ya
  da başka org'a bağlı); Success/kontrol testinde üyelik satırı VAR. Kaynak satırları
  seed'lenmeden dal deterministik tetiklenmez (üreteç varsayılan-boş kapsamla sahte-yeşil
  ya da tanımsız davranışa düşer).

## C. Anonim dal katlaması (S5)

Tech'te `for guard` opsiyoneldir; id'siz check'ler tek tek adreslenemez
(indeks-tabanlı adresleme kırılgan). Kural:

- Op'un id'siz **validation** check'leri (0'dan çoksa) → TEK "anonim NotValid" dalı;
  `covers NotValid` hepsini birden kapsar.
- Id'siz **rule** check'leri → TEK "anonim NotProcessable" dalı.
- Doğrulayıcı info üretir: "dal-düzeyi coverage için `for guard` önerilir" — bunu
  **tech'e iyileştirme önerisi** olarak raporla ("teknik analizde şu kurallara ad
  verilirse her biri ayrı izlenebilir"); qa tarafında bekletme, katlanmış dalı
  tek testle/waive'le kapat.

## D. Stub-birleşimi HESABI (QA-07) — emit'ten önce KENDİN hesapla

Bir test/senaryo için zorunlu stub kümesi:

```
yürütülen op'lar  = { when-op }                    (testte)
                  ∪ { tüm step-op'ları }           (senaryoda)
                  ∪ { tüm given-call op'ları }     (ikisinde de)

zorunlu stub'lar  = bu op'ların DOĞRUDAN `calls` hedeflerinden
                    external | uncharted BoundaryOp olanların BİRLEŞİMİ
```

- **Eksik stub → error; birleşim-dışı hedefe stub → error.** Stub `defaults for <Op>`
  bloğundan gelebilir (İQ3 öncelik: given-stub > defaults; ilk sağlayan kazanır).
- **İç-modül `calls` stub'LANMAZ (karar #10)** — gerçek koşar; birleşime girmez.
- **S14:** iç-modül compensate'li calls **callFailure dalı da doğurmaz** (stub'lanamaz
  → deterministik tetiklenemez); doğrulayıcı bunları uses-tech node'una info ile
  listeler — kullanıcıya açıkla: "bu telafi yolu, hedef op'un kendi dallarıyla dolaylı
  test edilir".
- Compensate'siz external calls: stub beyanı yine ZORUNLU (birleşim kuralı), ama
  failure dalı zorunlu coverage DEĞİL.
- Kullanıcıya taşıma biçimi: error'ı değil İHTİYACI söyle — "bu test şu dış servise
  dokunuyor; test sırasında ne cevap versin?" (`returns { … }` — dönüş tipine
  tip-doğrulanır, S18 degrade) veya "çökmüş gibi mi davransın?" (`fails`).

## E. callFailure → ServerError türetimi (P8)

`covers callFailure <Ext.Op>` dalının türetilmiş beklenen outcome'u **ServerError**'dır
(S10 tablosu; P8: stub `fails` davranışının sonuç sınıfı normatif olarak ServerError).
Dal anahtarı yine `callFailure{target}` kalır — manifest'te ikisi ayrı alandır.
Kullanıcıya: "dış servis çökünce kullanıcıya sistem-hatası döner; biz burada ayrıca
**telafinin koştuğunu** kanıtlarız" → `then { compensated <compensator>  not emitted …
state <Entity> absent { … } }`.

## F. Dal uzayına GİRMEYENLER — "sorma, üreteç yapar" tablosu

Bunlar için test İSTENMEZ ve YAZILMAZ; kullanıcı isterse tek cümle gerekçeyle sınırı
açıkla (politika detayları: `interrogation-playbook.md` §P):

| Kullanıcı isteği / tech sinyali | Neden dal DEĞİL | Karşılığı |
|---|---|---|
| "girişsiz/kimliksiz deneyince ne olur testi" (NotAuthenticated) | global politika (karar #6) | P1: üreteç, kimlik isteyen (roles\|ownership\|permit\|scope taşıyan) her op için jenerik kimliksiz-çağrı testi üretir |
| "sunucu hatası testi" (ServerError) | altyapı davranışı | P2: üreteç isterse taksonomi-uyumlu hata zarfını tek altyapı testiyle doğrular (callFailure dalının outcome'u ServerError'dur ama dal anahtarı callFailure kalır — §E) |
| "sayfa boyutu / imleç testi" (`paginated by`) | mekanik | P3: jenerik sıralama-tutarlılığı + size-üst-sınırı + imleç-devamlılığı testleri üretilir; yazar isterse `page`/`after` yüzeyiyle VERİ-ÖZEL doğrulama ekler (karar #16) |
| `consistency async` | politika | P12: async efektler test yürütmesinde senkron-eşdeğer tamamlanmış kabul edilir; polling YASAK |
| `consistency durable` | politika (async'in P12 emsali) | dayanıklı-teslim (kalıcı kuyruk/retry/crash-sonrası devam) altyapı güvencesidir, davranış dalı değil; test yürütmesinde efektler yine senkron-eşdeğer tamamlanmış kabul edilir — ayrı dal/test yazılmaz, dayanıklılık kanıtı üreteç/altyapı işi |
| entity `invariant` | politika | P13/S16: dokunulan entity'lerin invariant'ları her test/step sonunda ÖRTÜK assert edilir — ayrıca yazdırma |
| "her testten sonra temizlik" | politika | P6: her test/senaryo temiz state ile başlar |
| `idempotent by` / `concurrency optimistic` | v1.1 dal-adayı (spec §9) | bugün istenirse senaryo + `state count 1` ile elle modellenebilir; zorunlu coverage değil |
| "yük/performans/kaos testi" | kapsam dışı (spec §9) | bu DSL davranış-doğrulama modelidir; başka araç işi |

Kullanıcı bu politikalardan FARKLI davranış isterse not düş — üreteç-politikası
değişikliği ayrı iştir, test-niyeti beyanı değil.

## G. operations.json → flow/process evreni (+ S12)

- Evren = operations.json v3'teki op-üyelik listelerinin **union'ı**: her op'un
  `flows[]` ve `processes[]` alanlarındaki id'lerin birleşimi (karar #20). Ayrı bir
  flow kataloğu aranmaz.
- `uses flows` bağlıyken her flow-id ve process-id için workspace'te en az bir
  `realizes flow/process` senaryosu yoksa → **warning** (#23/#24; strict'te de warning
  kalır — S6 yalnız dal-coverage vaadi). Presence uyarısı waive ile KAPANMAZ — ya
  senaryo yazılır ya belgeli-açık kalır.
- **Sınır beyanı (karar #24):** flow-coverage presence-DÜZEYİDİR; business flow'un
  iç-dallanmaları (either/optional/repeat) v1'de dal-düzeyi coverage'a girmez.
  Business OnSuccess aksiyonları test-dünyasında kapsam dışıdır.
- **S12:** bağlanan tech dosyasının kendi `contract` path'i, `uses flows`'a verilen
  dosyadan FARKLIYSA info — kullanıcıya sor: "teknik analiz başka sözleşmeye realizes
  ediyor; doğru operations.json'u mu bağladık?" Cevaba göre ya flows yolunu düzelt ya
  tech'i güncellet.

## G2. operations.json → outcome (ürün-hedefi) evreni (F3.6 `satisfies`, ADR-0037)

Flow/process evreninin YANINDA operations.json ölçülebilir bir **ürün-hedefi** evreni de
taşır: `successCriteria[]` (business `outcome { measure … }` construct'ının emit'i). Bu,
"davranış doğru" (dal-coverage) ile **"ürün başarılı"** (ölçülebilir sonuç) ayrımının
QA-tarafı kancasıdır — bir senaryo `satisfies <outcome>` yazarak o hedefin test-kanıtı
olduğunu bildirir.

- **Evren = `operations.json.successCriteria[].id`** (flows.ts bu id'leri okur; measure/
  covers/note QA-tarafını ETKİLEMEZ — yalnız `id` satisfaction-hedefidir). Ayrı bir hedef
  kataloğu aranmaz.
- **Presence-coverage (kapatılabilir hedef):** her outcome-id için workspace'te en az bir
  `satisfies` senaryosu yoksa → **warning** (`uses flows` satırında konsolide;
  warning-routed — strict'te de warning, **waive ile KAPANMAZ**; flow/process presence
  emsali). CLI: `outcome (authored satisfies): N · … karşılanan / … açık-hedef` + `⚠
  karşılanmayan outcome (senaryo yaz): …`.
- **Bilinmeyen outcome `satisfies` → error** (`realizes`'ın karşılıksız-hedef kuralıyla aynı).
- **PIN — `covers` bir OP olan outcome:** business `outcome … covers <op>` yalnız bir op'u
  kapsıyorsa, senaryo o op'u ASLA realize edemez (senaryo yalnız flow/process realize eder)
  → o hedefin satisfaction-bağı için **TEK yol `satisfies`**'tir. Bu, `analyze --outcomes`
  türetilmiş op-kapsama raporundan AYRIDIR: o mevcut op-dal kapsamasını TOPLAR (rapor);
  `satisfies` outcome-düzeyinde YENİ kapatılabilir HEDEF yaratır (authored niyet).

**"Hangi senaryo hangi outcome'u satisfies eder" (elicitation-sunumu için):**

| operations.json `successCriteria.id` | QA-tarafı bağı | durum |
|---|---|---|
| ölçülebilir ürün-hedefi (ör. `ProposalThroughput`) | `scenario "…" [realizes flow/process X] satisfies ProposalThroughput { … }` | covered (satisfies senaryosu var) |
| `satisfies` senaryosu YAZILMAMIŞ hedef | — | uncovered = **kapatılabilir açık-hedef** (warning; senaryo yaz ya da belgeli-açık bırak) |

- **Sınır:** `satisfies` presence-DÜZEYİDİR — outcome'un `measure` eşiğinin GERÇEKTEN
  tutulup tutulmadığını ölçmez (metrik prozadır, ADR-0037 #1); senaryo yalnız o hedefi
  **kanıtlama-niyetini** bildirir. Eşiğin sağlanması çalışma-zamanı/analitik işidir, QA
  DSL kapsamı değil.

## H. Guard-id tekilliği (S17) — düzeltme yeri TECH

- Op-içi `validation ∪ rule` birleşiminde guard-id'ler tekil olmalı; ihlal qa
  link-time **error**'dur ve guard'a referans yazılmasa bile PROAKTİF raporlanır
  (uses-tech özetinde). Tech bugün bunu kendisi denetlemiyor — ilk yakalayan qa'dır.
- **Qa tarafında yamalamaya çalışma** (farklı guard'a covers yazmak, dalı waive'lemek
  çözüm değildir): kullanıcıya "teknik analizde aynı kural-adı iki kez kullanılmış;
  önce orayı düzeltelim" de, `teknik-analiz` skill'ine yönlendir, tech düzelince
  doğrulamayı tekrarla.

## H2. Tech kararı testi BLOKE ediyorsa — DUR ve BİLDİR (§H ailesinin validator-suz üyesi)

§H'de yakalayan doğrulayıcıdır (S17 error); burada yakalayan **SENSİN**: tech 0-error geçer
ama bir kararı deterministik test kurmayı imkânsız/anlamsız kılar. Böyle bir çelişkide test
UYDURMA (sahte-yeşil üretir), sessiz workaround KURMA, tech'i kendi kafana göre DÜZELTME —
**DUR**, kullanıcıya neyin neden test edilemez olduğunu somut söyle, düzeltmeyi
`teknik-analiz`'e yönlendir, tech düzelince türetim/doğrulamayı tekrarla (§H protokolüyle aynı).

**Kapsam DAR — "tutarsızlık" = testi bloke eden / sahte-yeşile zorlayan GERÇEK çelişki:**

| Tech kararı | Neden test edilemez |
|---|---|
| **Belirsiz tekil dönüş:** op tek kayıt döner (`: Order`, `list of` değil) ama imzada onu belirleyen girdi yok VE istisna ölçütü (`note`: son/ilk/en büyük · ephemeral) de yok | "Hangi kaydı assert edeceğim?" — seed 2 kayıt koyunca beklenen sonuç TANIMSIZ; test ancak üretecin keyfî seçimine ("ilk kaydı al") çıpalanır = sahte-yeşil |
| **Dal envanteri business ile çelişiyor:** tech'in beyan ettiği dallar operations.json'un outcome/akış beyanıyla bağdaşmıyor | Senaryo/`satisfies` çıpası kurulamaz — test hangi beyana yazılırsa yanlış olanı yeşile boyama riski; hangisinin doğru olduğuna qa karar VEREMEZ |
| **Sütun bağsız ownership:** `ownership own/<relation>` var ama `by <Entity>.<alan>` bağı yok | NotAuthorized·ownership dalının satır-filtresi testi deterministik kurulamaz — üreteç filtre sütununu TAHMİN eder; test tahmini doğrular, güvenceyi değil |

**Durdurmayan (nitpick — qa her tech kusurunda durursa kullanılamaz hâle gelir):**
adlandırma/üslup tercihi; id'siz guard'lar (S5 — katlanmış dalla İLERLE, tech'e yalnız
öneri raporla); tech oturumunda kullanıcıyla ONAYLANMIŞ divergence'lar. Şüphedeysen ölçüt
tek soru: **"bu kararla deterministik bir test yazabiliyor muyum?"** Evet → ilerle
(gerekirse öneri not düş); hayır → DUR.

**Waive ile karıştırma:** waive = *"bu dal test edilebilir ama etmiyorum, gerekçem bu"*
(authored kapsam kararı). Buradaki durum = *"bu dal BU tech'le test EDİLEMEZ"* — waive'e
sarmak sahte-kapamadır; çözüm tech'tedir.

## I. Neyi YAZMAYACAKSIN (sınır disiplini)

- **Beklenen outcome** — S10 türetir; `then outcome` diye bir yüzey yok.
- **Üreteç-politikası testleri** — §F tablosu; DSL yüzeye çıkarmaz (S8: manifest'e de
  yazılmaz).
- **Test kodu / framework adı** (xUnit/Jest/K6) — üreteç kapsamı (karar #1); qa'nın
  işi test-manifest sözleşmesinin doğru ve tam olması.
- **Negatif veri türetimi** — v1'de negatif veri ELLE yazılır (karar #8): validator
  dalın kapsandığını sayar, girdinin gerçekten ihlal ettiğini İDDİA ETMEZ; bu yüzden
  ihlal-girdisini kullanıcıyla birlikte bilinçli kur.
- **Business gerçeğinin kopyası** — kural sorgulaması `teknik-analiz`'in işiydi; qa
  kuralları yeniden bildirmez, test niyetini bildirir.
