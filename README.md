<div align="center">

# 🧭 command-dsl-tools

**Bir uygulama fikrini _konuşarak_ tutarlı, parse-temiz CommandDSL iş analizine çeviren Claude Code plugin'i.**

Teknik terim sormaz — işini anlatır gibi konuşturur, her adımda onay alır ve arka planda
**Süreç → Akış → Eylem** modelini kurar. Sonunda gömülü doğrulayıcıyla `.cdsl`'in
gerçek CommandDSL parser'ında **hatasız** olduğunu kanıtlar.

![Claude Code](https://img.shields.io/badge/Claude_Code-Plugin-d97757)
![Skill](https://img.shields.io/badge/skill-is--analizi--dsl-4b8bbe)
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

## 🧩 Ne sağlıyor

Plugin tek bir skill içerir: **`is-analizi-dsl`**.

- **Çağırma:** `/command-dsl:is-analizi-dsl`
- **Otomatik tetikleme:** Bir uygulama/ürün fikrini "iş analizine dök", "süreç çıkar",
  "akış tasarla", "eylemleri detaylandır", ".cdsl üret" gibi ifadelerle anlattığında
  kendiliğinden devreye girer.
- **Kim için:** Teknik olmayan kullanıcı dahil — jargon sormaz, işini anlatır gibi konuşturur.

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
            └── is-analizi-dsl/
                ├── SKILL.md          # skill girişi (4 faz prosedürü)
                ├── references/       # dsl-reference · operation-translation · …
                │   └── examples/     # parser-doğrulanmış known-good model
                ├── assets/           # validator.config örneği
                └── validator/        # validate.mjs (gömülü) + build.mjs + kaynak
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
# Doğrulayıcıyı CommandDSL grammar'ı değişince tazele (canlı depo gerekir):
cd plugins/command-dsl/skills/is-analizi-dsl/validator
node build.mjs <CommandDSL-yolu>

# Yeni sürümü yayınla:
git add -A && git commit -m "…" && git push
# Kullanıcılar: /plugin marketplace update command-dsl-tools
```

---

## 📄 Lisans

Henüz belirtilmedi. Dağıtımı netleştirmek için repo köküne bir `LICENSE` ekleyin.
