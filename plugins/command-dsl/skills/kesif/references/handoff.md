# Handoff — filler-skill'e devretme sözleşmesi (RUN modu)

Bu skill **üretmez/derlemez**. Devretme paketini hazırlar ve çalıştırmayı eşleşen üretecin
**filler-skill'ine** `Skill` tool üzerinden **RUN (çalıştırma) modunda** devreder — Faz 1.5'teki
`describe` çağrısının zıttı (describe yalnız capability döndürür; **RUN** üretimi tetikler).
techgen için bu filler/executor = **techgen-sync** (K5: standalone `techgen-sync` referans-paketin
filler-skill'ine fold edildi; binary paketin `bin/`'inde veya `dotnet tool` ile sağlanır).

## Devretme paketi — DÖRT artefakt (§A.3)

| Artefakt | Kaynak | Not |
|----------|--------|-----|
| `manifest.json` (+`operations.json`) | upstream `teknik-analiz` / brownfield | domain DSL; dil-nötr, linked contract. Yoksa devretme — `teknik-analiz`'e yönlendir. |
| `gen.config.json` (profil/config) | keşif Faz 4 (profil → config map) | paket-spesifik alt-detay; techgen 0.2.0: sadece `DbProvider`. Profil belirtmediyse dosya yok. |
| hedef dizin (`targetDir`) | kullanıcı | filler `gen/**`'i burada üretir/günceller. |
| **descriptor referansı** | Faz 1.5 describe-çıktısı (§A.2) | paketin **kendi sözleşmesi** (emissionContract, build, conformance). Pin: `.dsl/generators/<id>@<version>.json`. |

Dört artefaktın hepsi hazır+kayıtlı olmadan devretme YOK.

## Emission-topology — integrated-module ise host kompozisyon hedefi (5. taşıma)

Profilin `integrationMode`'u (Faz 0b / profile-discovery) handoff'a taşınır:
- **standalone:** üreteç kendi `Program.cs`+`csproj`+host'unu emit eder (HumanShell "yoksa-üret").
- **integrated-module:** mevcut app HOST. Dört artefakta ek olarak `profile.hostComposition`'ı taşı —
  hangi host dosyası (`Program.cs`/`Startup`) `AddGenerated()`/`MapGenerated()` çağıracak, hangi
  DbContext/connection paylaşılacak, auth/JWT host'tan mı gelecek. **techgen `Program.cs`/`csproj`'u
  "yoksa-üret"** → host varsa **ÜRETME, host'a bağlan**.
  - **Gerçekçilik sınırı (techgen 0.2.x):** techgen kendi `App.AppDbContext`'ini üretip `AddGenerated()`
    içinde kaydeder (`UseNpgsql(...GetConnectionString("Default"))`). Yani host "shared DbContext"i
    **techgen'inkini benimseyerek** (+ `"Default"` connection string sağlayarak) yapar; techgen host'un
    mevcut DbContext'ine bağlanmaz. Namespace `App`. Auth pipeline host-owned (gerçek paylaşım).
    Bu sınır handoff'ta açıkça yazılır; host-binding'i executor + devret-sonrası kapı doğrular.

## Bootstrap (klon — paket kurulu değilse, §A.6)

`.dsl/generators/<id>@<version>.json` pin'i var **ama** paket kurulu değilse (token'lı aday yok) →
keşif = **bootstrapper**: pinlenmiş descriptor'ın **`descriptor.source.install`** komutunu
**kullanıcıya sun ve DUR**. Sessizce kurma; "paket yok, geç" deme. Kurulum sonrası paket kurulu-skill
listesinde görünür → keşif normal akar. (Kanonik mekanik: `protocol/self-describe.md` §4 +
`discovery-and-matching.md` §3; burada yalnız devretme bağlamında hatırlatılır.)

## Filler ne yapar (techgen-sync RUN — bu skilllin DEĞİL, onun işi)

1. **Çalıştır:** paketli `techgen` CLI'yı (`Vennyx.TechGen` 0.2.0) `${CLAUDE_SKILL_DIR}` ile çağır →
   `gen/**` güncellenir + orphan prune, `provenance.json` + `build-report.json` yazılır.
   Exit 0 ⟺ SilentDrop yok (INV-7); exit 1 → build-report'taki SilentDrop = kapsama açığı.
2. **Doğrula:** `dotnet build <targetDir>/App.csproj` exit 0 görmeden iş bitmez.
3. **Kırık seam uzlaştır:** signature değişimi `*Handler.Logic.cs`'i bozduysa insan gövdesini yeni
   imzaya uyarlar (mantığı koruyarak), build 0 olana kadar.
4. **Orphan Logic.cs:** silinen op'un HumanSeam'i için kullanıcıya sor (sil/taşı) — onaysız silme yok.

## Dosya sahipliği (filler uygular; keşif sadece bilir)

- `gen/**` — üreteç-sahibi, her run ezilir + prune. **Elle düzenlenmez.** (`AddGenerated`/`MapGenerated`
  bu ağaçtadır — `gen/Bootstrap.g.cs`; host bunları çağırarak entegre olur.)
- `Program.cs` / `App.csproj` — HumanShell, **yoksa-üret, asla ezilmez.** **integrated-module'de host
  bunları zaten sağlar → techgen üretmez; host `AddGenerated()`/`MapGenerated()` çağırır.**
- `src/{Module}/*Handler.Logic.cs` — HumanSeam (iş gövdesi, NotImplemented stub), **asla ezilmez.**

## Determinizm sözleşmesi

profil + `manifest.json`/`operations.json` + `gen.config.json` = **açık, kayıtlı artefaktlar** →
aynı girdi, aynı **statik** (`gen/**`) çıktı. Devretme öncesi bu üçü diskte mevcut olmalı.
(Seam katmanı `*.Logic.cs` deterministik değildir; bir-kez-üretilip-commit ile donar — §1.5.)

## Sınır (rol aşımı yok)

Keşif `gen/**`'i düzenlemez, `techgen`/`dotnet build` çalıştırmaz, seam uzlaştırmaz, "sync tamam"
demez. Bunların hepsi filler-skill'in (techgen-sync RUN). Keşfin işi: **doğru üretece, doğru girdiyle
(dört artefakt) RUN modunda teslim.**
