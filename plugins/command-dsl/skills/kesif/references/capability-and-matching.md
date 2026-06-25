# Capability & Eşleştirme — config map'i (matching SUPERSEDED)

> **⚠ SUPERSEDE NOTU (self-describe modeli, A1 — §A.1 madde 2):**
> Bu dosyanın **"capability snapshot nasıl okunur" + "TAM/KISMİ/YOK eşleştirme tablosu"** içeriği
> **`references/discovery-and-matching.md`** ile değiştirildi. Capability artık **kayıtlı yerel
> `capability/*.json` snapshot'ından okunmaz**; her adayın **describe çıktısından** (self-describe,
> cache-scan DEĞİL) gelir. Eşleştirme mantığı + sürüm-pin/drift için **`discovery-and-matching.md`'ye bak.**
>
> Bu dosyada **yalnız** hâlâ-geçerli bölüm korunuyor: **Profil → `gen.config.json` map'i** (aşağıda
> §config). Config-şema map'i capability'nin kaynağından bağımsızdır → self-describe modelinde aynı
> kalır. SKILL.md Faz 4 buraya (`§config`) link verir; o link bilinçle korunmuştur.

> **`capability/*.json` HAKKINDA (re-wiring uyarısı):** `capability/techgen.capability.json` +
> `capability/SNAPSHOT.json` artık **kesif'in capability KAYNAĞI DEĞİLDİR.** Bunlar techgen'in **kendi
> eski (legacy) yerel snapshot'ıdır**; self-describe modeli (describe çıktısı = tek capability kaynağı)
> onları devre dışı bıraktı. **Kesif'i bu dosyaları capability kaynağı olarak okuyacak şekilde YENİDEN
> BAĞLAMA (re-wire ETME).** Silinmediler (tarihsel/iş-kalemi referansı), ama kesif onları okumaz.

---

## Profil → `gen.config.json` map'i (config §) — KORUNDU

Sadece descriptor `inputs.config.schema`'da tanımlı alanları yaz. techgen-dotnet 0.2.0:

```jsonc
// gen.config.json  (manifest.json yanına)
{ "DbProvider": "postgres" }   // profil.persistence.dbProvider → DbProvider
```
- `DbProvider` ∈ {postgres, sqlite, sqlserver, inmemory}. Profil değeri bu kümede değilse →
  **Faz 3 boşluk** (sessizce en yakına çevirme).
- Profil belirtmemişse → dosyayı **yazma** (techgen: yok → provider yok, mevcut davranış).
- Profilin geri kalanı (mimari/transport/language) techgen-sabiti ya da boundary'dir → config'e GİRMEZ.

**Determinizm:** `(manifest.json + gen.config.json)` → byte-aynı statik çıktı. Şişirme determinizm
yanılsamasıdır. (Eşleştirme + TAM/KISMİ/YOK kararı: `discovery-and-matching.md`.)
