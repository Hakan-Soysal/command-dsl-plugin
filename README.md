<div align="center">

# 🧭 command-dsl-tools

**Bir uygulama fikrini _konuşarak_ iş analizi → teknik tasarım → frontend tasarımı → test tasarımı → kod üretimi zincirine taşıyan Claude Code plugin ailesi.**

Teknik terim sormaz — işini anlatır gibi konuşturur, her adımda onay alır ve arka planda
DSL modellerini kurar. Her halka çıktısını **gömülü, self-contained doğrulayıcıyla**
gerçek parser'da **0 error** olarak kanıtlar; 0-error geçince makine-devir JSON'ları
(operations.json · manifest.json · experience.json · qa.json) **otomatik** üretilir.

![Claude Code](https://img.shields.io/badge/Claude_Code-Plugin-d97757)
![Skills](https://img.shields.io/badge/skills-5-4b8bbe)
![Node](https://img.shields.io/badge/Node-%E2%89%A518-339933?logo=node.js&logoColor=white)
![Validator](https://img.shields.io/badge/do%C4%9Frulay%C4%B1c%C4%B1-g%C3%B6m%C3%BCl%C3%BC-2ea44f)

</div>

---

## ⚡ Kurulum

Claude Code içinde iki komut:

```text
/plugin marketplace add Hakan-Soysal/command-dsl-plugin
/plugin install command-dsl@command-dsl-tools
```

| Adım | Komut | Ne alır |
| --- | --- | --- |
| Marketplace'i ekle | `/plugin marketplace add Hakan-Soysal/command-dsl-plugin` | **repo yolu** |
| Plugin'i kur | `/plugin install command-dsl@command-dsl-tools` | **plugin@marketplace-adı** |
| Güncelle | `/plugin marketplace update command-dsl-tools` | marketplace adı |

> **Not:** `marketplace add` repo'nun git yolunu, `install` ise marketplace.json'daki
> `name`'i (`command-dsl-tools`) kullanır — ikisi farklıdır.

<details>
<summary><b>Kurmadan, yerelde denemek ister misin?</b></summary>

GitHub'a hiç gitmeden, klonladığın klasörden uçtan uca test:

```text
/plugin marketplace add /yol/command-dsl-plugin
/plugin install command-dsl@command-dsl-tools
```

</details>

---

## 🧩 Ne sağlıyor — 5 skill'lik zincir

| Skill | Girdi → Çıktı | Çağırma |
| --- | --- | --- |
| **`is-analizi-dsl`** | fikir → `.cdsl` iş analizi + `operations.json` | `/command-dsl:is-analizi-dsl` |
| **`teknik-analiz`** | operations.json → linked `.tcdsl` teknik tasarım + `manifest.json` | `/command-dsl:teknik-analiz` |
| **`frontend-analiz`** | operations.json (+ opsiyonel manifest.json) → linked `.fcdsl` deneyim tasarımı + `<Ad>.experience.json` | `/command-dsl:frontend-analiz` |
| **`qa-analiz`** | `.tcdsl` + operations.json → linked `.qa` test tasarımı + test-manifest (`<ad>.qa.json` + merged `qa.json`) | `/command-dsl:qa-analiz` |
| **`kesif`** | operations.json + manifest.json → hedef-profili keşfi + üreteç kapısı (techgen'e devir) | `/command-dsl:kesif` |

- **Otomatik tetikleme:** "iş analizine dök", "teknik analiz çıkar", "ekranları tasarla /
  frontend DSL üret", "testleri tasarla / qa analiz", "kod üretimine geç" gibi ifadelerle ilgili
  halka kendiliğinden devreye girer.
- **Kim için:** Teknik olmayan kullanıcı dahil — jargon sormaz; her skill muhatabının
  diliyle konuşur (iş sahibi · mimar · ürün/UX sahibi · QA/test tasarımcısı).
- **Sözleşme sürümü:** zincir **operations.json v3** (`meta.schemaVersion: 3`) üzerinde
  çalışır; eski v2 sözleşmeler açık bir hata mesajıyla reddedilir (güncel üreticiyle
  yeniden üretin).

---

## 🔄 Nasıl çalışır

Üst-seviyeden detaya doğru **sorgular** (insana doğal gelen sıra), ama dosyayı geçerli
olsun diye **bağımlılık sırasında** üretir (foundation → operation → flow → process).

```text
  Kullanıcı  ──"şunu yapan bir uygulama istiyorum"──▶
        │
        ▼
  ┌──────────────────────────────────────────────────────────┐
  │  Faz 0 · Kim & Ne    →  actor · entity · relation · calendar │
  │  Faz 1 · Süreçler    →  çok-aktörlü büyük resim (sınır + of) │
  │  Faz 2 · Akışlar     →  tek aktör, adım adım yolculuk        │
  │  Faz 3 · Eylemler    →  4'lü imza + kurallar + durum geçişi  │
  └──────────────────────────────────────────────────────────┘
        │   her fazda: toplu öner  →  tek soruyla onay
        ▼
  Tutarlılık self-check   →   emit  (.cdsl, dependency-order)
        │
        ▼
  Gömülü doğrulayıcı (validate.mjs)   →   0 error ✓
```

Asıl risk sözdizimi değil, **katmanlar-arası bütünlüktür**: her akış adımı gerçek bir
eyleme, her süreç etabı gerçek bir akışa bağlanmalı; `by` aktörü akışın `for` aktörüyle
eşleşmeli; tip/kural uyumlu olmalı. Skill bunları emit'ten önce denetler.

---

## ✅ Gömülü doğrulayıcı

Üretilen `.cdsl`'i **gerçek CommandDSL dil servisleriyle** doğrulayan tek dosyalık,
self-contained bir bundle (`validate.mjs`) plugin'le birlikte gelir.

- **Bağımsız:** CommandDSL deposu veya `node_modules` **gerekmez** — yalnız Node.
- **Opsiyonel:** Yoksa skill valid-by-construction + self-check ile devam eder.
- **Makine-okur çıktı:** `--json` ile `{severity,line,col,message,code,file}` dizisi.

```bash
node validate.mjs <dosya.cdsl | dizin> [--json]
# exit 0 = error yok · 1 = ≥1 error · 2 = kullanım hatası
```

> ⚠️ Doğrulayıcı, grammar'ın bir **snapshot**'ıdır; CommandDSL grammar'ı değişince
> bayatlar. Yeniden derleme: `validator/build.mjs` (bkz. validator/README.md).

---

## 📂 Yapı

```text
command-dsl-plugin/
├── .claude-plugin/
│   └── marketplace.json              # marketplace kataloğu (bu repo kendi marketplace'i)
└── plugins/
    └── command-dsl/
        ├── .claude-plugin/
        │   └── plugin.json           # plugin manifesti
        └── skills/
            ├── is-analizi-dsl/       # fikir → .cdsl + operations.json (gömülü validate.mjs + emit)
            ├── teknik-analiz/        # → linked .tcdsl + manifest.json (validate-tech + emit-manifest)
            ├── frontend-analiz/      # → linked .fcdsl + experience.json (fcdsl.mjs: doğrula + gate'li emit)
            ├── qa-analiz/            # → linked .qa + test-manifest (qcdsl.mjs: strict doğrula + gate'li emit)
            └── kesif/                # → hedef-profili keşfi + üreteç kapısı
                # her skill: SKILL.md + references/(examples) + validator/(gömülü bundle + build)
```

---

## 🤔 Neden

| Geleneksel | Bu skill |
| --- | --- |
| Kullanıcıya "entity? ownership? stage?" diye jargon sorar | Düz cümleden **arka planda** türetir |
| Mutlu-yol akışını çizip biter | Her kavşakta "ya olmazsa?" diye **kenar durumları** zorlar |
| "Çalışıyor görünüyor" der | Gerçek parser'da **0 error** ile kanıtlar |
| Tek dev dosya üretir | **Modül bazlı**, bağımlılık sıralı, import'lu `.cdsl` üretir |

---

## 🔧 Bakım

```bash
# Doğrulayıcıları CommandDSL değişince tazele (canlı depo gerekir; her skill kendi validator/ dizininde):
cd plugins/command-dsl/skills/<skill>/validator
CMDDSL=<CommandDSL-yolu> node build.*.mjs
# ⚠ Bir skill'in bundle'larını hep AYNI repo durumundan BİRLİKTE build et — tek tarafı
#   tazelemek sürüm-kayması üretir (örn. operations.json v3 ↔ eski validator).

# Yeni sürümü yayınla:
git add -A && git commit -m "…" && git push
# Kullanıcılar: /plugin marketplace update command-dsl-tools
```

---

## 📄 Lisans

Henüz belirtilmedi. Dağıtımı netleştirmek için repo köküne bir `LICENSE` ekleyin.
