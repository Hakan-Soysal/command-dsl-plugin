# CommandDSL ailesi — meta-router (task geldi → hangi skill / faz)

**Amaç:** Bir iş geldiğinde "hangi skill, hangi sırada" sorusunu tek bakışta çözmek. Yanlış-route
etmek route-etmemekten kötüdür; bu yüzden ayırt edici bilgi her skill'in **girdi artefaktı → çıktı
artefaktı** sözleşmesidir. Her skill upstream'in ÇIKTISINDAN başlar, kendi girdisini yeniden-türetmez.

## Zincir (bağımlılık sırası — üretim→tüketim)

```
                 is-analizi-dsl
                (fikir → operations.json)
                        │
                  teknik-analiz
        (.cdsl/operations.json → .tcdsl + manifest.json)
                        │
        ┌───────────────┴───────────────┐
   frontend-analiz                   qa-analiz
(operations.json[+manifest.json]   (.tcdsl + operations.json
   → .fcdsl + .experience.json)      → qa.json + *.qa.json)
                        │
     ┌──────────────────┴──────────────────┐
   GRUP 1 (üretici)                 GRUP 2 (vibecoder köprüsü)
   kesif → techgen-sync             spec-context + experience-context
   (manifest/operations             → CLAUDE.md → behavior-gate
    → kod üretimi devri)
```

**Sıra kuralı:** Elde **en erken eksik artefakttan** başla. Analiz skill'leri (is-analizi → teknik →
{frontend, qa}) sıralıdır; tüketim grupları (1/2) analiz bittikten sonra **paralel** seçeneklerdir —
biri diğerini gerektirmez. `frontend-analiz` ile `qa-analiz` birbirinden bağımsızdır (ikisi de teknik
çıktısını tüketir), sırası serbesttir.

## Task → skill (girdi → çıktı sözleşmesi)

| Niyet / task | Skill | Girdi (zorunlu) | Çıktı |
|---|---|---|---|
| Fikir/uygulama anlat, iş analizi, süreç/akış/eylem çıkar, `.cdsl` | **is-analizi-dsl** | düz-dil fikir | `operations.json` (v3) |
| Teknik tasarım, module/deployable, imza/yetki/consistency, `.tcdsl` | **teknik-analiz** | `.cdsl` ve/veya `operations.json` | `.tcdsl` + `manifest.json` |
| Ekran/deneyim/UX tasarımı, `.fcdsl`, experience | **frontend-analiz** | `operations.json` (+ `manifest.json` opsiyonel) | `.fcdsl` + `<Ad>.experience.json` |
| Test tasarımı, dal-coverage, test-manifest, `.qa` | **qa-analiz** | `.tcdsl` **VE** `operations.json` (ikisi de) | `qa.json` (+ per-file `*.qa.json`) |
| Kod üret / üretece bağla / hangi üreteç / route to generator | **kesif** | `manifest.json` (+ `operations.json`) | üretece devir (executor: **techgen-sync**) |
| Backend yükümlülüklerini vibecoding'e bağlam yap (manifest → CLAUDE.md) | **spec-context** | `manifest.json` | `CLAUDE.md` (backend, emireden dil) |
| Frontend yükümlülüklerini vibecoding'e bağlam yap (experience → CLAUDE.md) | **experience-context** | `<Ad>.experience.json` | `CLAUDE.md` (frontend, emireden dil) |
| Çalışan app'i manifest'e karşı kara-kutu davranışsal denetle | **behavior-gate** | `manifest.json` + **çalışan app** | realized / proven-fail / DARK |

## İki tüketim grubu (analiz sonrası — biri VEYA diğeri VEYA ikisi)

- **Grup 1 — deterministik üretici:** `kesif` teknik tasarımı bir hedef-profiline keşfeder, kayıtlı üreteç
  yeteneğiyle eşleştirir ve çalıştırmayı executor'a (**techgen-sync**) devreder. Kesif kod ÜRETMEZ; kapıdır.
- **Grup 2 — vibecoder köprüsü:** `spec-context` (backend, `manifest.json`'dan) ve `experience-context`
  (frontend, `.experience.json`'dan) yükümlülükleri emireden-dil `CLAUDE.md`'ye yazar → Claude Code o
  dizinde vibecode ederken okur → `behavior-gate` çalışan app'i AYNI `manifest.json`'a karşı denetler.
  **Sınır:** behavior-gate yalnız **backend**tir; frontend için karşılık (experience existence-checker)
  henüz yoktur — bu grupta frontend-tarafı denetim iddiası yapma.

## Notlar

- `is-analizi-dsl` dışındaki her skill upstream artefaktından başlar; artefakt yoksa üretmez, eksikliği
  bildirir ve doğru upstream skill'e yönlendirir (uydurma girdi YOK).
- `kesif`'in kendi öncül-sorgulama merceği (bkz. `kesif/SKILL.md`) üretim-öncesi kapsam-daraltma sorusunu
  sorar; router bu skill-içi mekanizmayı tekrar etmez.
