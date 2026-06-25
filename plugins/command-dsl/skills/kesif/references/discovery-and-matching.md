# Keşif & Eşleştirme — self-describe akışı, TAM/KISMİ/YOK, sürüm-pin/drift

> Bu doküman keşfin **iki çekirdek mekaniğini** birleştirir: (1) generator paketlerinin
> **self-describe** ile bulunması (Faz 1.5) ve (2) describe-ile-dönen capability'nin profile karşı
> **TAM/KISMİ/YOK** eşleştirilmesi (Faz 2). Eski `capability-and-matching.md`'nin "kayıtlı yerel
> snapshot okuma" modelini **supersede eder** — capability artık yerel `capability/` dosyalarından
> değil, her adayın **describe çıktısından** gelir (A1 çözümü, §A.1 madde 2).
>
> Protokol kaynağı: `protocol/self-describe.md`. Profil → `gen.config.json` map'i **hâlâ**
> `capability-and-matching.md` §config'tedir (capability kaynağından bağımsız, geçerli).

---

## 1. Keşif = SELF-DESCRIBE, cache-scan DEĞİL (A1 değişmezi)

Generator paketleri **kendi beyanlarından** keşfedilir. Belgesiz bir filesystem yolunu **taramak yok**.

**Neden cache-scan DEĞİL:** `~/.claude/plugins/cache/**` dokümante-edilmemiş, çok-sürümlü,
`.in_use`-belirsiz bir platform iç-detayıdır. Onu enumerate etmek (glob'lamak) kırılgan ve yanlıştır
(A1 ihlali). Keşfin adayı bulmasının **tek meşru yolu** aşağıdaki token + describe akışıdır;
**cache dizini taranmaz, plugin dizinleri glob'lanmaz.**

### 1.1 Aday tespiti — konvansiyon token'ı

- Keşfi koşan model kurulu skill'leri zaten **bağlamında görür** (native skill mekanizması).
- Generator paketleri filler-skill'inin `description`'ına sabit bir konvansiyon token'ı koyar: **`[dsl-generator]`**.
- Keşif kurulu-skill listesini tarar; `description`'ında bu token'ı taşıyan filler-skill'leri **aday** sayar.
- Token taşımayan skill aday **değildir**. (Filesystem glob'u DEĞİL — bağlamdaki kurulu-skill listesi.)

### 1.2 Descriptor alımı — `describe` modu

- Her adayın filler-skill'i **`describe` argümanıyla** `Skill` tool üzerinden çağrılır.
- Skill **yalnızca** kendi `${CLAUDE_SKILL_DIR}/capability.json` dosyasını döndürür — kendi dizinini
  okur (sanctioned; cross-plugin yol erişimi GEREKMEZ). `describe` üretim **yapmaz** (statik üretim /
  seam-doldurma / build YOK).
- Dönen içerik descriptor şekline (`schema/descriptor.schema.json`) uyar: `id`, `version`,
  `capability.{languages,architectures,persistence,transports,constructsCovered}`, `emissionContract`,
  `gapProtocol.compliant`, `source` vb.

> **Self-describe vs yerel-snapshot — açık ayrım.** Capability'nin kaynağı **describe çıktısıdır**,
> kesif dizinindeki bir `capability/*.json` snapshot'ı **değildir**. Eski model (yerel snapshot okuma)
> supersede edildi; bkz. `capability-and-matching.md` supersede notu.

### 1.3 Aday yoksa

Hiç `[dsl-generator]` token'lı aday yoksa → **üretme; eksik capability'yi raporla** (kullanıcı uygun
bir generator paketi kurabilir). Sessiz default YOK.

---

## 2. Sürüm — çözümlenmiş baseline, pin ve drift (One-Version)

Keşif sürüm **seçmez**. Platform tek **çözümlenmiş** sürüm sunar; cache çok-sürüm/`.in_use`
belirsizliği platform tarafından çözülür → keşif yalnız çözümlenmiş skill'in beyan ettiği `version`'ı
görür.

- **Drift baseline'ı (Faz 1.5):** çözümlenmiş skill'in `version`'ı drift baseline'ı olarak kaydedilir.
  Mevcut `.dsl/generators/<id>@<version>.json` pin'i ≠ kurulu-çözümlenmiş sürüm → **drift uyarısı** +
  yeniden-doğrula (One-Version Rule). Sessiz devam yok.
- **Pin yazımı (Faz 5):** lockfile pin'i devretmede, **seçilen (onaylı)** descriptor için yazılır —
  tek kanonik pin-yazımı budur. Pin = descriptor **METADATA'sı** (seam kodu/binary DEĞİL); `source`
  alanı "nereden kurulur"u taşır. (Detay: `protocol/self-describe.md` §3 + `handoff.md`.)

**One-Version disiplini:** bir descriptor tek çözümlenmiş paket-sürümüne çividir; sürüm artınca
yeniden-doğrulanır. "Birden çok sürümü aynı anda destekliyormuş gibi" eşleştirme YOK.

---

## 3. Bootstrap (klon senaryosu)

`.dsl/` pin'i var **ama** paket kurulu değilse (token'lı aday yok) → pinlenmiş descriptor'ın
**`source.install`** komutunu **kullanıcıya sun ve DUR**. Sessizce kurma; "paket yok, geç" deme.
Kurulumdan sonra paket kurulu-skill listesinde görünür → keşif normal akar (token-tarama yeniden işler).
Kanonik mekanik: `protocol/self-describe.md` §4 + `handoff.md` (bootstrap).

---

## 4. TAM / KISMİ / YOK — eşleştirme ve kanıt

Profil eksenlerini + contract construct kümesini her adayın **describe-ile beyan ettiği** capability
alanlarıyla karşılaştır; **hangi descriptor alanından/değerinden** çıktığını yaz (declared, kanıtla).
Kaynak = describe çıktısı; üreteç kaynağından çıkarsama YOK, yerel snapshot okuma YOK.

| Eksen | Kaynak (describe descriptor) | Eşleşme şartı |
|-------|------------------------------|---------------|
| dil | `capability.languages` | profil.language ∈ languages (veya unconstrained) |
| transport | `capability.transports` | profil.transport ∈ transports; değilse **bloklar** |
| mimari | `capability.architectures` | profil.architecture uyumlu; uyumsuz → **bloklar** |
| persistence | `capability.persistence` | gerekli dbProvider destekli değerle karşılanıyor |
| construct'lar | `capability.constructsCovered` | contract'ın her construct'ı `constructsCovered`'da |

- **TAM** = dil ✓ ∧ transport ✓ ∧ mimari ✓ ∧ tüm gerekli alt-detaylar destekli ∧ contract
  construct'larının hepsi `constructsCovered`'da.
- **KISMİ** = dil/transport/mimari ✓ **ama** ≥1 alt-detay/construct desteksiz/uyumsuz → **Faz 3**
  (boşluk dispozisyonu — otomatik çözme YOK).
- **YOK** = dil **veya** transport **veya** mimari kapsanmıyor (ör. transport=gRPC ama
  `transports:[rest]`) → **bloklayan ekseni** raporla + en yakın aday. Sessiz default YOK.

Birden çok TAM eşleşme (≥2 generator) → sırala; seçim Faz 4.5'te öner+onay ile (otomatik seçim yok).

**Hyrum's Law (lens):** descriptor'da açıkça **listelenmeyen** değer desteklenmez sayılır — "herhalde
çalışır" diye TAM sayma. Yalnız `capability.*` içinde **beyan edilen** değerler destekli.

### techgen-dotnet@0.2.0 hızlı tablo (describe çıktısı örneği — yerel snapshot DEĞİL)
- dil **.NET/C#** · transport **REST** · mimari **modular-monolith/VSA** · dbProvider ∈
  {postgres, sqlite, sqlserver, inmemory}.
- **Tipik YOK:** transport = gRPC/GraphQL/queue; mimari = çok-projeli Clean/hexagonal; dil ≠ .NET.
- **Tipik KISMİ:** dil/transport/mimari ✓ ama dbProvider beyan dışı (ör. mysql) → Faz 3 boşluk.
  *Neden KISMİ önemli:* mysql yine de geçirilirse techgen **crash etmez** ama build-report'a
  `unsupported(dbProvider)` yazıp DbContext'i **seam** olarak bırakır — açık, belgeli degradasyon.
  Keşif bunu önden KISMİ diye yüzeyler ki kullanıcı bilinçli karar versin (destekliye çek vs seam'i
  kabul edip ertele), sessiz un-wired provider'a düşmesin.

---

## 5. Config map'i nerede

Profil → `gen.config.json` map'i (yalnız descriptor `inputs.config` şemasındaki alanlar; techgen için
bugün tek alan `DbProvider`) **bu dokümanda değil**, `capability-and-matching.md` §config'tedir.
O bölüm capability'nin **kaynağından bağımsızdır** (config-şema map'i self-describe ile aynı kalır) →
supersede edilmedi, korunuyor. SKILL.md Faz 4 oraya link verir.
