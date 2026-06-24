# Handoff — executor'a devretme sözleşmesi

Bu skill **üretmez/derlemez**. Girdileri hazırlar (`manifest.json` + `gen.config.json` + hedef dizin)
ve çalıştırmayı eşleşen üretecin **executor skill**'ine devreder. techgen için executor = `techgen-sync`.

## Devretme paketi (ne teslim edilir)

| Artefakt | Kaynak | Not |
|----------|--------|-----|
| `manifest.json` (+`operations.json`) | upstream `teknik-analiz` / brownfield | domain DSL; dil-nötr, 4 dilde aynı. Yoksa devretme — `teknik-analiz`'e yönlendir. |
| `gen.config.json` | Faz 4 (profil → config map) | techgen 0.2.0: sadece `DbProvider`. Profil belirtmediyse dosya yok. |
| hedef dizin (`targetDir`) | kullanıcı | executor `gen/**`'i burada üretir/günceller. |

## Executor ne yapar (techgen-sync — bu skilllin DEĞİL, onun işi)

1. **Çalıştır:** `techgen <manifest.json> <targetDir>` (paketli `Vennyx.TechGen` 0.2.0) →
   `gen/**` güncellenir + orphan prune, `provenance.json` + `build-report.json` yazılır.
   Exit 0 ⟺ SilentDrop yok (INV-7); exit 1 → build-report'taki SilentDrop = kapsama açığı.
2. **Doğrula:** `dotnet build <targetDir>/App.csproj` exit 0 görmeden iş bitmez.
3. **Kırık seam uzlaştır:** signature değişimi `*Handler.Logic.cs`'i bozduysa insan gövdesini yeni
   imzaya uyarlar (mantığı koruyarak), build 0 olana kadar.
4. **Orphan Logic.cs:** silinen op'un HumanSeam'i için kullanıcıya sor (sil/taşı) — onaysız silme yok.

## Dosya sahipliği (executor uygular; ön-kapı sadece bilir)

- `gen/**` — üreteç-sahibi, her run ezilir + prune. **Elle düzenlenmez.**
- `Program.cs` / `App.csproj` — HumanShell, yoksa-üret, **asla ezilmez.**
- `src/{Module}/*Handler.Logic.cs` — HumanSeam (iş gövdesi, NotImplemented stub), **asla ezilmez.**

## Determinizm sözleşmesi

profil + `manifest.json`/`operations.json` + `gen.config.json` = **açık, kayıtlı artefaktlar** →
aynı girdi, aynı downstream çıktı. Devretme öncesi bu üçü diskte mevcut olmalı.

## Sınır (rol aşımı yok)

Ön-kapı `gen/**`'i düzenlemez, `techgen`/`dotnet build` çalıştırmaz, seam uzlaştırmaz, "sync tamam"
demez. Bunların hepsi `techgen-sync`'in. Ön-kapının işi: **doğru üretece, doğru girdiyle teslim.**
