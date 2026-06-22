# command-dsl-tools

Claude Code marketplace + plugin: **`command-dsl`** — bir uygulama/ürün fikrini
adım adım sorgulayarak tutarlı, parse-temiz **CommandDSL (`.cdsl`)** iş analizine
(process / flow / operation) çeviren `is-analizi-dsl` skill'i + gömülü standalone
doğrulayıcı.

## Kullanıcılar nasıl kurar

Bu repo'yu GitHub'a (veya başka bir git host'una) push ettikten sonra,
kullananlar Claude Code içinde:

```
/plugin marketplace add Hakan-Soysal/command-dsl-plugin
/plugin install command-dsl@command-dsl-tools
```

- `marketplace add` **repo yolunu** alır (`Hakan-Soysal/command-dsl-plugin`),
  `install` ise **plugin@marketplace-adı** alır (`command-dsl@command-dsl-tools`).
- `command-dsl` = plugin adı, `command-dsl-tools` = marketplace adı (marketplace.json'daki `name`).
- Kurulumdan sonra skill `/command-dsl:is-analizi-dsl` olarak çağrılır; ayrıca
  kullanıcı bir uygulama fikrini "iş analizine dök / süreç çıkar / .cdsl üret"
  dediğinde otomatik tetiklenir (SKILL.md description'a göre).
- Güncelleme: yeni sürümü push et → kullanıcılar `/plugin marketplace update command-dsl-tools`.

> Not: relative `source` yolları yalnız marketplace **git ile** eklendiğinde
> çözülür (GitHub/GitLab/git URL). Doğrudan `marketplace.json` URL'i ile ekleme
> bu repo için desteklenmez.

## Gereksinimler

- **Node.js** — skill'in gömülü doğrulayıcısı (`validate.mjs`) `node` ile çalışır.
  Doğrulayıcı **opsiyoneldir**; yoksa skill valid-by-construction + self-check ile
  devam eder. CommandDSL deposu veya `node_modules` GEREKMEZ — doğrulayıcı tek
  dosyalık self-contained bundle'dır, plugin ile birlikte gelir.

## Yapı

```
.claude-plugin/marketplace.json        # marketplace kataloğu (bu repo kendi marketplace'i)
plugins/command-dsl/
  .claude-plugin/plugin.json           # plugin manifesti
  skills/is-analizi-dsl/               # skill (SKILL.md + references + assets + validator)
```

## Doğrulayıcının güncellenmesi (bakım)

Gömülü `validate.mjs`, CommandDSL grammar'ının bir **snapshot**'ıdır; grammar
değişince bayatlar. Yeniden derlemek için (canlı CommandDSL deposu gerekir):

```
cd plugins/command-dsl/skills/is-analizi-dsl/validator
node build.mjs <CommandDSL-yolu>
```

Detay: `plugins/command-dsl/skills/is-analizi-dsl/validator/README.md`.
