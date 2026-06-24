---
name: kod-uretimi
description: >-
  Bir Teknik Analiz çıktısını (linked TechDsl'in `operations.json` / `manifest.json`'ı) kod
  üretimine **bağlayan nötr ön-kapı**. Kendisi kod ÜRETMEZ / DERLEMEZ: (1) hedefin dil-/mimari-
  /altyapı-bağımsız bir **neutral profilini** keşfeder (brownfield → mevcut app'ten türetir,
  greenfield → sorarak elicit eder), (2) bunu kayıtlı üreteç **capability snapshot**'ıyla
  eşleştirir (TAM / KISMİ / YOK), (3) eşleşen üretecin girdilerini hazırlar (`manifest.json` +
  `gen.config.json`) ve çalıştırmayı o üretecin executor skill'ine (techgen için **techgen-sync**)
  DEVREDER. Şu durumlarda MUTLAKA kullan: kullanıcı bir teknik tasarımdan/`.tcdsl`/`operations.json`'dan
  kod üretmek istediğinde — "kod üret", "kod üretimini başlat", "tech dsl'den kod", "hangi üreteç",
  "üretece bağla / route to generator", "generator seç / match", "üreteç keşfi", "hedefi üretece
  bağla", "discover target profile" dediğinde. Teknik tasarımın KENDİSİNİ çıkarmak için
  `teknik-analiz`'i kullan; bu skill onun ÇIKTISINDAN başlar. Üretme/derleme/seam-uzlaştırma
  executor'ın (techgen-sync) işidir — bu skill ona devreder.
---

# Tech DSL → Kod Üretimi (nötr ön-kapı)

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
2. **Declared, çıkarsama değil.** Üreteç yeteneğini **kayıtlı capability snapshot**'tan oku
   (`capability/`), asla üreteç kaynağından tahmin etme. Snapshot tek bir üreteç-sürümüne çivilidir
   (One-Version Rule); sürüm değişince tazelenir. Neyin desteklendiği/desteklenmediği **açık bir
   sözleşmedir** (her gözlemlenen davranış bir taahhüttür — Hyrum's Law).
3. **Sessiz default YOK.** Profilde belirsiz bir alt-detay (dbProvider, transport…) varsa
   **uydurma — sor**. Bir boşluk (desteksiz alt-detay) çıkarsa **dispozisyonu kullanıcıya bıraktır**
   (şimdi-çöz vs raporla-ertele); otomatik kapama yok.

**Determinizm sözleşmesi:** profil + `manifest.json`/`operations.json` + `gen.config.json` **açık,
kayıtlı artefaktlardır** → aynı girdi, aynı downstream çıktı.

## Altın kurallar (her oturumda geçerli)

- **Dil/framework-agnostik ön-kapı.** `.NET`'i hardcode etme; `techgen` yalnız **kayıtlı bir örnek**
  üreteçtir. Karar daima profil → capability eşleşmesinden çıkar.
- **Capability'yi DECLARED snapshot'tan oku.** `capability/techgen.capability.json` + `SNAPSHOT.json`.
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

Sonra altı fazı sırayla yürüt.

---

## Faz 0 — Mod tespiti

**Amaç:** Keşfin nasıl yapılacağını belirle.
**Yap:**
- **Brownfield** — mevcut bir hedef app var → keşif onu **inceler** (kod, paket/manifest, config).
- **Greenfield** — yalnız niyet/gereksinim → keşif **elicit/türetir**.
- Belirsizse **kullanıcıya sor.** İkisini de destekle.

**⚠ Anti-pattern — mod varsayımı:** "kod üret" denince greenfield sanıp mevcut app'i yok sayma
(ya da tersi). Hedef app'in olup olmadığını açıkça teyit et.

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

## Faz 2 — Capability eşleştirme (TAM / KISMİ / YOK)

**Amaç:** Profili kayıtlı üreteç yetenekleriyle eşleştirmek — **declared**, kanıtla.
**Yap:**
- Kayıtlı üreteçleri capability snapshot'larını **OKUYARAK** enumerate et (`capability/*.capability.json`).
  Bugün tek kayıt: `techgen` (.NET). Üreteç kaynağından çıkarsama YOK.
- Her eksen için profil ↔ snapshot karşılaştır ve **kanıtla** (hangi snapshot satırı):
  - **TAM** = dil ✓ ∧ transport ✓ ∧ mimari ✓ ∧ gerekli tüm alt-detaylar **destekli değerle** karşılanıyor.
  - **KISMİ** = dil/transport/mimari ✓ **ama** bir+ alt-detay desteksiz/uyumsuz → Faz 3.
  - **YOK** = dil/transport/mimari kapsanmıyor → **hangi eksenin blokladığını** raporla + en yakın aday.
- Birden çok TAM eşleşme → sırala, **kullanıcı seçsin**.

**⚠ Anti-pattern — boundary'yi yok sayma:** snapshot `boundaries` (ör. gRPC/GraphQL/queue, çok-projeli
Clean) açıkça desteklenmez der; profil bunu istiyorsa **YOK/KISMİ**'dir, "herhalde olur" deme.
Detay + eşleşme tablosu: `references/capability-and-matching.md`.

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

## Faz 5 — Devret + özet

**Amaç:** Çalıştırmayı executor'a devret; sen üretme/derleme yapma.
**Yap:**
- Eşleşen üretecin executor skill'ine devret. techgen için: **`techgen-sync`** — paketli `techgen`
  CLI'yı (`Vennyx.TechGen` 0.2.0) çalıştırır, `dotnet build` ile doğrular, kırık-seam/orphan muhakemesi yapar.
  Bu skill bu adımları **yapmaz**, executor'a teslim eder (girdi: hazırlanan `manifest.json` + `gen.config.json` + hedef dizin).
- **Özet ver:** mod · profil · adaylar+verdict · seçilen üreteç · `gen.config.json` · boşluklar+dispozisyon ·
  otomatik kaydedilen iyileştirmeler · devredilen executor.

**⚠ Anti-pattern — rol aşımı:** `gen/**`'i düzenleme, `dotnet build` çalıştırıp "sync tamam" deme —
o executor'ın işi. Sen kapıyı açar, doğru üretece teslim edersin.

---

## Referans dosyaları (gerektiğinde oku)

- `references/profile-discovery.md` — neutral profil şeması + brownfield/greenfield keşif lensleri
  (agent-skills: architecture-reviewer / api-and-interface-design).
- `references/capability-and-matching.md` — capability snapshot nasıl okunur, TAM/KISMİ/YOK kuralları,
  profil → `gen.config.json` map'i, interface-design lensleri (One-Version Rule / Hyrum's Law).
- `references/handoff.md` — `techgen-sync`'e devretme sözleşmesi + determinizm + dosya-sahipliği özeti.
- `capability/techgen.capability.json` — techgen 0.2.0 declared yeteneği (kayıtlı).
- `capability/SNAPSHOT.json` — capability provenance (kaynak + sürüm + tarih + tazeleme).
- `capability/improvements.md` — boşluk-kapatan üreteç iyileştirmeleri backlog'u (kaydet, uygulama).
- `references/examples/` — doldurulmuş `profile.json` + `gen.config.json` exemplar'ları.
