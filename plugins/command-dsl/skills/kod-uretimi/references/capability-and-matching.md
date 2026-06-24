# Capability & Eşleştirme — snapshot okuma, TAM/KISMİ/YOK, config map'i

## Capability snapshot nasıl okunur

Üreteç yeteneği **kayıtlı snapshot**'tan okunur — asla üreteç kaynağından çıkarsanmaz:
- `capability/techgen.capability.json` — declared yetenek (diller, transport, mimari,
  `supportedSubDetails`, `boundaries`, `inputs`, `executorSkill`).
- `capability/SNAPSHOT.json` — provenance: hangi sürüme çivili (`pinnedVersion`), kaynak, tarih,
  bayatlama/tazeleme kuralı.

**One-Version Rule (lens: api-and-interface-design):** snapshot tek bir üreteç-sürümüne çivilidir
(techgen 0.2.0). Eşleştirme bu sürümün taahhüdüne göre yapılır; nupkg artınca snapshot tazelenir
(SNAPSHOT.json `staleness`). Birden çok sürümü aynı anda "destekliyormuş gibi" eşleştirme.

**Hyrum's Law (lens):** `boundaries`'te açıkça "desteklenmez" yazan şey **sözleşmedir** — "herhalde
çalışır" diye TAM sayma. Sadece `supportedSubDetails`'te listelenen değerler desteklidir.

## TAM / KISMİ / YOK — karar ve kanıt

Her eksende profil ↔ snapshot karşılaştır, **hangi snapshot satırından** çıktığını yaz:

| Eksen | Kaynak (snapshot) | Eşleşme şartı |
|-------|-------------------|---------------|
| dil | `languages` | profil.language ∈ languages (veya unconstrained) |
| transport | `transports` / `boundaries` | profil.transport ∈ transports; boundary'deyse **bloklar** |
| mimari | `architectures` / `boundaries` | profil.architecture uyumlu; çok-projeli Clean → boundary → bloklar |
| alt-detay | `supportedSubDetails` | her gerekli alt-detay **destekli değerle** karşılanıyor |

- **TAM** = dil ✓ ∧ transport ✓ ∧ mimari ✓ ∧ tüm gerekli alt-detaylar destekli.
- **KISMİ** = dil/transport/mimari ✓ **ama** ≥1 alt-detay desteksiz/uyumsuz → `Faz 3` (boşluk dispozisyonu).
- **YOK** = dil **veya** transport **veya** mimari kapsanmıyor/boundary → **bloklayan ekseni** raporla
  + en yakın aday (bugün tek aday techgen).

Birden çok TAM eşleşme (gelecekte ≥2 üreteç) → sırala, kullanıcı seçsin.

### techgen 0.2.0 hızlı tablo
- dil **.NET/C#** · transport **REST** · mimari **modular-monolith/VSA** · dbProvider ∈
  {postgres, sqlite, sqlserver, inmemory}.
- **Tipik YOK:** transport = gRPC/GraphQL/queue; mimari = çok-projeli Clean/hexagonal; dil ≠ .NET.
- **Tipik KISMİ:** dil/transport/mimari ✓ ama dbProvider snapshot dışı (ör. mysql) → Faz 3 boşluk.
  *Neden KISMİ önemli:* mysql yine de geçirilirse techgen **crash etmez** ama build-report'a
  `unsupported(dbProvider)` yazıp DbContext'i **seam** olarak bırakır (provider'ı insan Program.cs'te
  bağlar) — açık, belgeli degradasyon. Ön-kapı bunu önden KISMİ diye yüzeyler ki kullanıcı bilinçli
  karar versin (destekliye çek vs seam'i kabul edip ertele), sessiz un-wired provider'a düşmesin.

## Profil → `gen.config.json` map'i (config §)

Sadece snapshot `inputs.config.schema`'da tanımlı alanları yaz. techgen 0.2.0:

```jsonc
// gen.config.json  (manifest.json yanına)
{ "DbProvider": "postgres" }   // profil.persistence.dbProvider → DbProvider
```
- `DbProvider` ∈ {postgres, sqlite, sqlserver, inmemory}. Profil değeri bu kümede değilse →
  **Faz 3 boşluk** (sessizce en yakına çevirme).
- Profil belirtmemişse → dosyayı **yazma** (techgen: yok → provider yok, mevcut davranış).
- Profilin geri kalanı (mimari/transport/language) techgen-sabiti ya da boundary'dir → config'e GİRMEZ.

**Determinizm:** `(manifest.json + gen.config.json)` → byte-aynı çıktı. Şişirme determinizm yanılsamasıdır.
