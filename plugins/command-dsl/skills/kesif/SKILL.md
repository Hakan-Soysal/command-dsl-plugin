---
name: kesif
description: >-
  Bir Teknik Analiz çıktısını (linked TechDsl'in `operations.json` / `manifest.json`'ı) kod
  üretimine **bağlayan seçici keşif + kapı**. Kendisi kod ÜRETMEZ / DERLEMEZ: (1) hedefin dil-/mimari-
  /altyapı-bağımsız bir **neutral profilini** keşfeder (brownfield → mevcut app'ten türetir,
  greenfield → sorarak elicit eder), (2) bunu her adayın **describe ile döndürdüğü** üreteç
  **capability**'siyle (self-describe çıktısı — yerel snapshot DEĞİL) eşleştirir (TAM / KISMİ / YOK), (3) eşleşen üretecin girdilerini hazırlar (`manifest.json` +
  `gen.config.json`) ve çalıştırmayı o üretecin executor skill'ine (techgen için **techgen-sync**)
  DEVREDER. Şu durumlarda MUTLAKA kullan: kullanıcı bir teknik tasarımdan/`.tcdsl`/`operations.json`'dan
  kod üretmek istediğinde — "kod üret", "kod üretimini başlat", "tech dsl'den kod", "hangi üreteç",
  "üretece bağla / route to generator", "generator seç / match", "üreteç keşfi", "hedefi üretece
  bağla", "discover target profile" dediğinde. Teknik tasarımın KENDİSİNİ çıkarmak için
  `teknik-analiz`'i kullan; bu skill onun ÇIKTISINDAN başlar. Üretme/derleme/seam-uzlaştırma
  executor'ın (techgen-sync) işidir — bu skill ona devreder.
---

# Tech DSL → Keşif (seçici + kapı)

Bir teknik tasarımı doğru üretece **bağla ve devret**. Sen kod üretmezsin/derlemezsin —
hedefi keşfeder, kayıtlı üreteç yeteneğiyle eşleştirir, girdileri hazırlar, executor'a
devredersin. Üretme/derleme/seam-uzlaştırma executor'ın (`techgen-sync`) işidir.

## Neyi neden böyle yapıyoruz (özü kavra)

Nihai çıktı **derlenebilir koddur** — ama o kod bir **üreteçten** çıkar, bu ön-kapıdan değil.
Bu skill üretimi **başlatan kapıdır**: ölçtüğü şey "hedef + niyet", devrettiği şey "çalıştırma".
Üç ilke tüm tasarımı dayatır:

1. **Profil ⟂ domain DSL (ortogonallik).** Domain DSL (`manifest.json` / `operations.json`)
   uygulamanın **NE** yaptığıdır (upstream `teknik-analiz`'ten gelir). Bu skilllin profili
   **NASIL / NE İLE**'dir: dil, mimari, altyapı, ince alt-detaylar (dbProvider…). TechDsl bunları
   **bilinçle modellemez** (dil-/mimari-nötr kalır) — dolayısıyla profil TechDsl'in tekrarı
   değildir, **üretecin girdi sözleşmesidir**. Eşleştirme için tam domain modeli gerekmez; profil yeter.
2. **Declared, çıkarsama değil.** Üreteç yeteneğini her adayın **self-describe (describe modu)**
   ile beyan ettiği `capability.json`'dan oku (Faz 1.5'in describe-ile-dönen çıktısı), asla üreteç
   kaynağından tahmin etme ve **yerel bir `capability/` snapshot'ı okuma**. Her capability tek bir
   çözümlenmiş üreteç-sürümüne çivilidir (One-Version Rule); sürüm değişince yeniden-doğrulanır. Neyin
   desteklendiği/desteklenmediği **açık bir sözleşmedir** (her gözlemlenen davranış bir taahhüttür — Hyrum's Law).
3. **Sessiz default YOK.** Profilde belirsiz bir alt-detay (dbProvider, transport…) varsa
   **uydurma — sor**. Bir boşluk (desteksiz alt-detay) çıkarsa **dispozisyonu kullanıcıya bıraktır**
   (şimdi-çöz vs raporla-ertele); otomatik kapama yok.

**Determinizm sözleşmesi:** profil + `manifest.json`/`operations.json` + `gen.config.json` **açık,
kayıtlı artefaktlardır** → aynı girdi, aynı downstream çıktı.

## Altın kurallar (her oturumda geçerli)

- **Dil/framework-agnostik ön-kapı.** `.NET`'i hardcode etme; `techgen` yalnız **kayıtlı bir örnek**
  üreteçtir. Karar daima profil → capability eşleşmesinden çıkar.
- **Capability'yi her adayın describe çıktısından oku.** Faz 1.5'te describe-ile-dönen
  `capability.json` descriptor'ı (self-describe) — yerel snapshot dosyalarından DEĞİL.
  Üreteç kodundan/varsayımdan yetenek çıkarsama YAPMA.
- **Üretme / derleme / generated düzenleme YOK.** Bunların hepsi executor'da (`techgen-sync`).
  Sen `manifest.json` + `gen.config.json`'ı hazırlar, devredersin.
- **Sessiz alt-detay varsayımı YOK.** Belirsiz değer → kullanıcı onayı. Boşluk → kullanıcı dispozisyonu.
- **İyileştirmeyi KAYDET, UYGULAMA.** Boşluğu kapatacak bir üreteç-iyileştirmesi tespit edersen
  ek-onay beklemeden backlog'a yaz (`capability/improvements.md`); asla otomatik uygulama.

## Başlamadan

Girdiyi netleştir:

- **Domain DSL var mı?** `operations.json` (linked TechDsl'in çıktısı) ve/veya `manifest.json`.
  Yoksa: **upstream `teknik-analiz`'i çalıştır** (o, iş analizinden linked `.tcdsl` + `operations.json`
  üretir). Bu skill domain DSL'i ÜRETMEZ — eksikliği bildirir ve `teknik-analiz`'e yönlendirir.
- **Mod ne?** Brownfield (mevcut bir hedef app var) / greenfield (yalnız niyet). Faz 0'da netleştir.

**⚓ Bootstrap kapısı (klon — keşfin EN BAŞINDA, profil çıkarmadan önce):** Çalışma dizininde
`.dsl/generators/<id>@<version>.json` **pin'i** var mı diye bak. Pin varsa repo bir üreteç paketini
bekliyor demektir. O `id`'nin **kurulu olup olmadığını** kontrol et (kurulu-skill listesinde
`[dsl-generator]` token'lı eşleşen aday var mı — Faz 1.5'in aday-tespiti). **Pin var ama paket kurulu
değilse:** pinlenmiş descriptor'ın **`descriptor.source.install`** komutunu **kullanıcıya SUN ve DUR**.
Sessizce kurma; "paket yok, geç" deme — kullanıcı kurmadan keşfe devam etme. Kurulumdan sonra paket
kurulu-skill listesinde görünür → keşif normal akar (Faz 1.5 token-tara yeniden işler). Mekanik:
`protocol/self-describe.md` §4 + Faz 1.5 madde 4 (tek kaynak; burada yalnız erken-kapı olarak hatırlatılır).

Sonra altı fazı sırayla yürüt.

---

## Faz 0 — Mod tespiti (+ brownfield'de emission-topology)

**Amaç:** Keşfin nasıl yapılacağını **ve üretilen kodun mevcut app'le ilişkisini** belirle.

**0a — Brownfield / greenfield:**
- **Brownfield** — mevcut bir hedef app var → keşif onu **inceler** (kod, paket/manifest, config).
- **Greenfield** — yalnız niyet/gereksinim → keşif **elicit/türetir**.
- Belirsizse **kullanıcıya sor.** İkisini de destekle.

**0b — Emission-topology (brownfield ise MUTLAKA sor — sessiz `./App` standalone YASAK):**
Mevcut app, üretilen kodun **HOST'u mu**, yoksa **yanında ayrı bir sistem mi**? Bu, "mevcut app var"dan
**ayrı bir eksendir** ve sorulmazsa executor sessizce standalone varsayar → tüm cross-system friction
(ayrı DB/host/Program.cs) bu varsayımın yan ürünü olur. "Sessiz default YOK" bunu da kapsar.
- **integrated-module:** mevcut app HOST; üreteç bir **library/modül** emit eder, host onu
  `AddGenerated()`/`MapGenerated()` ile bağlar; **host'un DI/DbContext/auth pipeline'ı paylaşılır.**
- **standalone:** üreteç kendi `Program.cs`+`csproj`+host'uyla **ayrı app** emit eder.
- Seçimi profile **`integrationMode`** olarak kaydet (kaynak+gerekçe) → `references/profile-discovery.md`.
  Brownfield+integrated ise host'un **kompozisyon noktalarını** (entry, DI, DbContext, auth, csproj türü)
  keşfet ve kaydet (handoff'ta paylaşım sözleşmesi olur).

> **Kapsam notu (item-3 ertelendi):** emission-mode bu sürümde **elicit + onay + handoff** edilir ama
> **capability-gate EDİLMEZ** — techgen descriptor'ı henüz `emissionModes` eksenini *declare* etmiyor;
> declare etmeden gate = çıkarsama (A1 ihlali). techgen 0.2.x integrated-module'ü **dikişle** destekler
> (`AddGenerated`/`MapGenerated` + Program.cs/csproj "yoksa-üret") ama **sınırlıdır**: kendi
> `App.AppDbContext`'ini üretip kaydeder (host onu *benimser* + `"Default"` connection verir — host'un
> mevcut DbContext'ine bağlanmaz), namespace `App`'tir (rootNamespace knob'u yok), build/conformance
> `App.csproj` varsayar. Bu sınır host-binding'de doğrulanır (executor + devret-sonrası kapı). Tam
> capability-gate, descriptor `emissionModes` eksenini kazanınca eklenir (`capability/improvements.md`'ye yaz).

**⚠ Anti-pattern — mod varsayımı:** "kod üret" denince greenfield sanıp mevcut app'i yok sayma
(ya da tersi). Hedef app'in olup olmadığını açıkça teyit et.
**⚠ Anti-pattern — emission-topology varsayımı:** mevcut app'i "yanında ayrı app" sanıp standalone
üretmek (ya da tersi). Mevcut app'in ROLÜ (host-to-extend vs adjacent) açıkça teyit edilmeli — tek
mode mümkün görünse bile (bkz. Faz 4.5).

---

## Faz 1 — Profil keşfi (neutral, dil-agnostik)

**Amaç:** Hiçbir dili varsaymadan kalıcı bir profil üret (şema: `references/profile-discovery.md`).
**Yap (her alan için kaynağı belirt — declared fact, tahmin değil):**
- `intent` — domain/niyet özeti.
- `language` — `{constraint | "unconstrained"}` + gerekçe.
- `architecture` — hexagonal / DDD / VSA / 3-tier / actor … (constraint/preference).
- `transport` — REST / gRPC / GraphQL / queue.
- `persistence.dbProvider` — DB engine.
- `subDetails` — üreteçleri ayıran ince param'lar.
- **Brownfield** → her alanı app'ten TÜRET, **nereden bulduğunu yaz** (`source`).
  **Greenfield** → kullanıcıdan elicit et; bilinmeyeni **sor**, uydurma.

**Lensler (agent-skills "taş ocağı"):** brownfield okuma için `architecture-reviewer` (Faz 0
"understand the system": transport, data-consistency, deploy sınırı); profil→config sözleşmesi için
`api-and-interface-design` (Contract First, error-semantics). Detay: `references/profile-discovery.md`.

**⚠ Anti-pattern — sessiz profil:** belirsiz `dbProvider`/`transport`'u doldurmadan geçme; ya
kaynaktan türet ya sor. Profili gereğinden şişirme — alanların çoğu üreteç-sabiti/unsupported'a düşebilir.
**Çıktı:** kayıtlı `profile.json` artefaktı.

---

## Faz 1.5 — Üreteç keşfi (SELF-DESCRIBE — cache-scan DEĞİL)

**Amaç:** Kurulu generator paketlerini **kendi beyanlarından** keşfet; capability'lerini topla.
Protokol: `protocol/self-describe.md` (A1 değişmezi — §A.1 madde 2).
Keşif mekaniği + version-pin/drift detayı: `references/discovery-and-matching.md`.

**KRİTİK — keşif self-describe'tır, cache-scan DEĞİL:**
- Belgesiz filesystem yolunu **TARAMA**. `~/.claude/plugins/cache/**` glob'una **asla** dayanma;
  `cache` dizinini enumerate **etme**. Bu dokümante-edilmemiş, çok-sürümlü, `.in_use`-belirsiz bir
  platform iç-detayıdır (A1 ihlali). Aday tespitinin tek meşru yolu aşağıdaki **token + describe**.

**Yap:**
1. **Aday tespiti (token):** Keşfi koşan model kurulu skill'leri zaten **bağlamında görür**. Bu
   listeyi tara; `description`'ında `[dsl-generator]` konvansiyon token'ını taşıyan filler-skill'leri
   **aday** say. Token taşımayan skill aday değildir. (Filesystem glob'u DEĞİL — kurulu-skill listesi.)
2. **Descriptor alımı (describe modu):** Her adayın filler-skill'ini **`describe` argümanıyla** `Skill`
   tool üzerinden çağır. Skill **yalnızca** kendi `${CLAUDE_SKILL_DIR}/capability.json` dosyasını
   döndürür (statik üretim/seam-doldurma/build YOK — describe üretim yapmaz). Dönen içerik T1.1
   descriptor şekline (`schema/descriptor.schema.json`) uyar: `id`, `version`,
   `capability.{languages,architectures,persistence,transports,constructsCovered}`, `emissionContract`,
   `gapProtocol.compliant`, `source` vb.
3. **Sürüm baseline'ı (pin yazımı DEĞİL):** Platform tek **çözümlenmiş** sürüm sunar; keşif sürüm SEÇMEZ.
   Çözümlenmiş skill'in beyan ettiği `version`'ı **drift baseline'ı olarak kaydet**. Mevcut
   `.dsl/generators/<id>@<version>.json` pin'i ≠ kurulu-çözümlenmiş sürüm → **drift uyarısı** +
   yeniden-doğrula (One-Version). Sessiz devam yok. **Lockfile pin'inin yazımı Faz 5 devretmede** —
   *seçilen* (onaylı) descriptor için — yapılır (§5.2 anchor: devretmeden sonra; tek kanonik pin-yazımı).
4. **Bootstrap (klon):** `.dsl/` pin'i var ama paket kurulu değilse (token'lı aday yok) → pinlenmiş
   descriptor'ın `source.install` komutunu **kullanıcıya sun** (sessizce kurma).

**Aday yoksa (§A.1):** Hiç `[dsl-generator]` token'lı aday yoksa → **üretme; eksik capability'yi raporla**
(kullanıcı uygun bir generator paketi kurabilir). Sessiz default YOK.

**⚠ Anti-pattern — cache-scan / glob keşfi:** adayı filesystem'den (`cache/**`, plugin dizinleri)
glob'layarak bulma — A1 ihlali. Yalnız token + describe.
**Çıktı:** her adayın describe-ile-dönen `capability.json` descriptor'ı (Faz 2 girdisi).

---

## Faz 2 — Capability eşleştirme (TAM / KISMİ / YOK)

**Amaç:** Profili adayların **describe-ile beyan ettiği** yetenekle eşleştirmek — **declared**, kanıtla.
**Yap:**
- Adayları Faz 1.5'in **describe ile döndürdüğü** `capability.json` descriptor'larından enumerate et
  (token'lı her aday için bir descriptor). Üreteç kaynağından çıkarsama YOK; **kayıtlı yerel snapshot
  okuma YOK** — capability kaynağı self-describe çıktısıdır (A1).
- Profil eksenlerini (dil/mimari/persistence/transport) + contract construct kümesini her adayın
  `capability.{languages,architectures,persistence,transports,constructsCovered}` alanlarıyla
  karşılaştır ve **kanıtla** (hangi descriptor alanı/değeri):
  - **TAM** = dil ✓ ∧ transport ✓ ∧ mimari ✓ ∧ gerekli tüm alt-detaylar **destekli değerle** karşılanıyor
    ∧ contract construct'larının hepsi `constructsCovered`'da.
  - **KISMİ** = dil/transport/mimari ✓ **ama** bir+ alt-detay/construct desteksiz/uyumsuz → Faz 3.
  - **YOK** = dil/transport/mimari kapsanmıyor (ör. transport=gRPC ama `transports:[rest]`) → **hangi
    eksenin blokladığını** raporla + en yakın aday. Sessiz default YOK.
- Birden çok TAM eşleşme → sırala (seçim Faz 4.5'te öner+onay ile).

**⚠ Anti-pattern — boundary'yi yok sayma:** snapshot `boundaries` (ör. gRPC/GraphQL/queue, çok-projeli
Clean) açıkça desteklenmez der; profil bunu istiyorsa **YOK/KISMİ**'dir, "herhalde olur" deme.
Detay + eşleşme tablosu: `references/discovery-and-matching.md`.

---

## Faz 3 — KISMİ eşleşme davranışı

**Amaç:** Karşılanabileni doldur, boşluğu dürüst yüzeyle.
**Yap:**
- Kısmi-eşleşen üreteci seç; **karşılayabildiği** alt-detaylarla config'ini doldur.
- Kalan her boşluk (desteksiz/uyumsuz alt-detay) için **dispozisyonu KULLANICIYA bıraktır:**
  - **"şimdi sor & çöz"** (profili/hedefi destekli bir değere çek), **veya**
  - **"raporla & ertele"** (boşluğu açıkça belgele, devam et). **Otomatik çözme YOK.**
- Boşluğu kapatacak somut bir **üreteç-iyileştirmesi** (yeni param, yeni seam, gevşetilmiş boundary)
  tespit edersen: **ek-onay beklemeden** `capability/improvements.md`'ye kalıcı kaydet. **Uygulama — yalnız kaydet.**

**⚠ Anti-pattern — sessiz daraltma:** desteksiz değeri sessizce en yakın destekliye çevirme; bu
kullanıcı kararıdır.

---

## Faz 4 — Girdileri hazırla

**Amaç:** Eşleşen üretecin girdilerini deterministik, kayıtlı biçimde hazırla.
**Yap:**
- **Domain DSL teyidi:** `manifest.json` (+ `operations.json`) hazır mı? Hazır olmalı (upstream
  `teknik-analiz`/brownfield). Yoksa **eksikliği bildir**, `teknik-analiz`'e yönlendir — uydurma.
- **`gen.config.json` üret:** profilin üreteç-özel alt-detaylarını snapshot `inputs.config` şemasına
  map et. techgen 0.2.0 için bu **bugün tek alan: `DbProvider`** (`{ "DbProvider": "postgres" }`);
  profilin geri kalanı üreteç-sabiti ya da boundary'dir (Faz 2/3'te zaten ele alındı).
- Artefaktları kaydet. Map kuralları: `references/capability-and-matching.md` §config.

**⚠ Anti-pattern — şişirilmiş config:** snapshot şemasında olmayan alanı `gen.config.json`'a yazma;
üreteç onları okumaz, determinizm yanılsaması yaratır.

---

## Faz 4.5 — Öner + onay (sessiz devretme YOK)

**Amaç:** En iyi adayı **gerekçesiyle** öner; kullanıcı onaylamadan devretme.
**Yap:**
- En iyi TAM adayı **gerekçesiyle** sun: hangi profil eksenleri + hangi construct'lar adayın
  `capability` beyanıyla **kanıtlı** karşılanıyor (describe-ile-dönen descriptor'a referansla).
- **Emission-mode'u AÇIKÇA söyle (targetDir önerisiyle birlikte).** Profilin `integrationMode`'unu
  öneriye dök: ya **"standalone (kendi `Program.cs`/`csproj`)"** ya da **"host-integrated library
  (mevcut app referans eder; `AddGenerated`/`MapGenerated`; paylaşılan DbContext=App.AppDbContext + auth
  pipeline; host kompozisyon hedefi `hostComposition`'dan)"**. integrated ise gerçekçilik sınırını da
  belirt (techgen kendi App.AppDbContext'ini üretir; host `"Default"` connection sağlar).
- **Kullanıcı onayı ZORUNLU.** Onay gelmeden bir sonraki faza (devretme) **geçme**.
- **Tek aday/tek mode bile olsa otomatik seçme YOK.** Bir tek TAM aday veya tek mümkün emission-mode olsa
  dahi hem **adayı** hem **emission-mode'u** öner + onay bekle; onaysız hiçbir devretme tetiklenmez.
- TAM yoksa: KISMİ → Faz 3 dispozisyonu; hepsi YOK / aday yok → Faz 1.5/2 gereği **üretme, raporla**
  (uydurma seçim YOK).

**⚠ Anti-pattern — sessiz seçim:** "tek aday var, devral" deme. Tek aday da öner+onay yolundan geçer;
silent handoff yasak.
**Çıktı:** kullanıcı-onaylı seçilen aday (Faz 5 devretme girdisi).

---

## Faz 5 — Devret (handoff paketi + pin) + özet

**Amaç:** Onaylı adaya **devretme paketini** hazırla, descriptor'ı pin'le, paketin **filler-skill'ini
çalıştırma (RUN) modunda** tetikle; sen üretme/derleme yapma.

**Yap — (a) Devretme paketini hazırla (§A.3 dört artefaktı):**

| Artefakt | Kaynak | Not |
|---|---|---|
| `manifest.json` (+`operations.json`) | upstream `teknik-analiz` | domain DSL; dil-nötr, linked contract |
| `gen.config.json` (profil/config) | keşif Faz 4 | paket-spesifik alt-detay (dbProvider…) |
| `targetDir` | kullanıcı | paket buraya üretir |
| descriptor referansı | Faz 1.5 describe-çıktısı (A.2) | paketin kendi sözleşmesi |

Dört artefaktın hepsi hazır+kayıtlı olmadan devretme YOK.

**Yap — (b) Seçilen descriptor'ı pin'le (`.dsl` lockfile, §A.6):**
- Faz 4.5'te **onaylanan** adayın describe-ile-dönen descriptor'ını
  `.dsl/generators/<id>@<version>.json`'a **pin'le** (Faz 1.5 çözümlenmiş sürümü kaydetti; burada
  *seçilen* descriptor pinlenir — tek kanonik pin-yazımı budur). Pin = **descriptor METADATA'sı**
  (seam kodu/binary DEĞİL); `source` alanı "nereden kurulur"u taşır.
- **Drift:** mevcut pin ≠ kurulu-çözümlenmiş sürüm → **drift uyarısı** + yeniden-doğrula (One-Version).
  Sessiz geçme yok. (Detay: `protocol/self-describe.md` §3.)

**Yap — (c) Filler-skill'i ÇALIŞTIR (RUN) modunda çağır:**
- Seçilen paketin filler-skill'ini **`Skill` tool** üzerinden **çalıştırma (RUN) modunda** çağır —
  Faz 1.5'teki **`describe`** çağrısının zıttı: describe yalnız capability döndürür, **RUN** ise
  hazırlanan paketle (manifest + config + targetDir + descriptor) **üretimi tetikler**.
- techgen için bu executor: **`techgen-sync`** — paketli `techgen` CLI'yı (`Vennyx.TechGen` 0.2.0)
  çalıştırır, `dotnet build` ile doğrular, kırık-seam/orphan muhakemesi yapar. Bu skill bu adımları
  **yapmaz**, executor'a teslim eder.

**Yap — (d) Özet ver:** mod · profil · adaylar+verdict · seçilen üreteç · `gen.config.json` ·
pinlenen descriptor (`.dsl/generators/<id>@<version>.json`) + drift durumu · boşluklar+dispozisyon ·
otomatik kaydedilen iyileştirmeler · çağrılan filler/executor (RUN).

**Eject (taşınabilirlik, §A.6):** Pin yalnız boru-hattı metadata'sıdır; **ürün** ondan bağımsızdır —
projeyi klonlayan biri **hiçbir plugin/pin olmadan** `gen/**` + `Program.cs` + `*.Logic.cs`'i
`dotnet build`/`run` eder. Pin seam koduna sızmaz.

**⚠ Anti-pattern — rol aşımı:** `gen/**`'i düzenleme, `dotnet build` çalıştırıp "sync tamam" deme —
o executor'ın işi. Sen kapıyı açar, paketi hazırlar, doğru filler'a **RUN** modunda teslim edersin.
**⚠ Anti-pattern — pin'i seam koduyla karıştırma:** pin descriptor metadata'sıdır; üretilen ürüne
gömme — eject bozulur.

---

## Devret-sonrası kapı (aile-sahibi son doğrulama — "others we validate")

**Amaç:** Faz 5 paketi RUN modunda tetikleyip üretim bittikten **sonra**, aile çıktıyı **kendi
contract'ına** (`manifest.json`/`operations.json`) karşı doğrular — paketin öz-raporuna **değil**
(dairesellik kırma). Bu faz **üretmez/düzeltmez**; yalnız **denetler** ve herhangi bir denetim **RED**
verirse kullanıcıya raporlar. Mekanik + senaryolar: `references/family-gate.md`.

> **Rol netliği — bu "derleme YOK" altın kuralını İHLAL ETMEZ.** Altın kural ve Faz 5, **üretim/derleme
> ile sync-uzlaştırmayı** executor'a (`techgen-sync`) bırakır. Kapının (1) build denetimi ise **üretmez,
> doğrular**: `descriptor.build.command`'in exit 0 verdiğini teyit eden sanctioned "others we validate"
> adımıdır — executor'ın üretim-derlemesinden ayrı, bağımsız bir kanıt-okumasıdır.

**Sırayla altı denetim (herhangi biri RED → kullanıcıya raporla, "sync tamam" DEME):**

1. **Build** — `descriptor.build.command` → **exit 0**. (Değilse RED.)
2. **No-silent-loss** — üreteç **exit≠0** VEYA `build-report.constructs[].status ∈ {unsupported, silentDrop}`
   olan construct'lar **gap-dispozisyonlu** mu? Dispozisyonsuz → RED. (`silentDrops` JSON alanı DEĞİL —
   sinyal exit-code/status; bkz. family-gate.md.)
3. **Completeness (T3.1)** — envanter **`manifest.json`/`operations.json`'dan** (aile ground-truth)
   enumerate edilir, paketin "neyi realized saydığı"ndan DEĞİL; her construct realized + conformance-spec'li
   mi? (İstisna: no-silent-loss için build-report exit-code/`status` okuması sanctioned.) Eksik → RED.
4. **K1/K2 yapısal sadakat (T3.2)** — aile **kendi koşar** (`compliant:true` öz-beyanı yetmez): K1 =
   predicate-input bağlanabilirliği, K2 = failable→named-error eşlemesi. Geçmeyen → RED.
5. **Owned-tree dokunulmazlığı** — `provenance` ile `gen/**` elle düzenlenmemiş (sha/owned-tree). Dokunulmuş → RED.
6. **Conformance (T3.3 spec'leri, T4.4 adapter ile)** — aile-sahibi dil-nötr SPEC'ler, paketin
   `descriptor.conformance.run` adapter'ıyla koşulur; assertion SPEC'te (aile-sahibi, A3). Fail → RED.

Hepsi PASS ise sync tamamdır; aksi halde RED denetim(ler)i **kullanıcıya raporla**, "sync tamam" deme.

---

## Referans dosyaları (gerektiğinde oku)

- `references/profile-discovery.md` — neutral profil şeması + brownfield/greenfield keşif lensleri
  (agent-skills: architecture-reviewer / api-and-interface-design).
- `references/discovery-and-matching.md` — self-describe ile üreteç keşfi (cache-scan DEĞİL),
  TAM/KISMİ/YOK eşleştirme kuralları, version-pin/drift (One-Version Rule / Hyrum's Law).
  **Matching/snapshot okuma için kanonik referans budur.**
- `references/capability-and-matching.md` — **yalnız §config**: profil → `gen.config.json` map'i.
  (Matching/snapshot kuralları için superseded → `references/discovery-and-matching.md`.)
- `references/handoff.md` — `techgen-sync`'e devretme sözleşmesi + determinizm + dosya-sahipliği özeti.
- `references/family-gate.md` — **devret-sonrası kapı fazı**: aile-sahibi completeness denetimi (§0–§4) **+ K1/K2
  yapısal sadakat denetimi (§K)**. Paket bittikten sonra her construct'ı **`manifest.json`'dan** (paket öz-raporundan
  DEĞİL — kaynak manifest) enumerate edip realized + conformance-spec'li mi diye doğrular; `meta.hasErrors=true` ⇒
  kapı RED. **K1/K2 (§K) — aile kendi koşar, `compliant:true` öz-beyanı yetmez:** K1 = predicate-input dört kaynaktan
  (request-param / entity-field / boundary-dönüş / `build-report.policy`) birine bağlanabilmeli, bağlanamayan →
  RED (PoC: `ResourceCreditLimit`); K2 = her failable validation/rule `operations.json` throws kataloğunda
  adlı-hataya eşlenmeli, eşlenmeyen → RED (PoC: adsız `Rule_0`). Kapı yalnız RED verir; **gap-çözme bu dosyada
  KAPSAM DIŞI (M5)**.
- `capability/techgen.capability.json` — techgen 0.2.0 declared yeteneği (kayıtlı).
- `capability/SNAPSHOT.json` — capability provenance (kaynak + sürüm + tarih + tazeleme).
- `capability/improvements.md` — boşluk-kapatan üreteç iyileştirmeleri backlog'u (kaydet, uygulama).
- `references/examples/` — doldurulmuş `profile.json` + `gen.config.json` exemplar'ları.
