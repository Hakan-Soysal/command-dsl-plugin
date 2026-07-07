# CommandDSL Ailesi — Konvansiyonlar

> Bu doküman, *"bağımsız değil aile"* sözünün uygulamadaki karşılığıdır. Her yeni skill/DSL
> bundan doğar. Kurallar **gerçek + doğrulanmış** pratiğe dayanır (roadmap varsayımlarına değil);
> Claude Code platform sınırları dahildir. Değişiklik önerisi → önce buradaki ilkeyle çeliş.
>
> İlgili: yol haritası `../DSL Business Analyses/DSL-AILESI-YOL-HARITASI.md` (planlama;
> bu doküman *yürürlükteki* kuralları taşır).

---

## 1. Topoloji (omurga)

> **Marketplace = aile · Plugin = bir DSL/dil · Skill = o dile yönelik bir görev.**

- **Marketplace** (`.claude-plugin/marketplace.json`) = aile kataloğu. Repo'nun kendisi marketplace.
- **Plugin** (`plugins/<plugin>/`) = bir dil/DSL. Aynı dile yeni görev → **aynı plugin'e yeni skill**.
  Yeni bir dil/DSL → **yeni plugin**. Tek marketplace hepsini bağlar.
- **Skill** = o dile yönelik bir görev. Bugünkü `command-dsl` plugin zinciri:
  `is-analizi → teknik-analiz → kod-uretimi` — her skill bir öncekinin **çıktısından** başlar
  (üretici-tüketici). Bir skill, başka skill'in işini tekrarlamaz; ona devreder/ondan devralır.

## 2. İsimlendirme

- Skill adı = **Türkçe görev adı**, `-dsl` eki YOK (plugin zaten dili ifade eder): `is-analizi`,
  `teknik-analiz`, `kod-uretimi`. Çağrı: `/command-dsl:<skill>`.
- İstisna: `is-analizi-dsl` legacy ekini taşır (tek skill'ken ucuzdu; rename ertelendi). Yeni skill'ler temiz adla doğar.
- İngilizce/jenerik ad (örn. `tooling-match`, `techgen`) aileyi kırar → kullanma.

## 3. Skill iskeleti (yeni skill bundan doğar)

```
skills/<skill>/
  SKILL.md                     # zorunlu — anatomisi §3.1
  references/                  # talep üzerine okunan destek dokümanları
    examples/                  # validator/parser ile KANITLI (0 error) exemplar'lar
  evals/evals.json             # declarative senaryo eval'leri (§6)
  validator/                   # DSL DOĞRULAYAN skill ise — gömülü self-contained bundle (§4)
  capability/                  # DIŞ ARACA YÖNLENDİREN ön-kapı skill ise — gömülü snapshot (§5)
  assets/                      # opsiyonel: config şablonları vb.
```
> Doğrulayan skill `validator/`, ön-kapı/router skill `capability/` taşır — ikisi birden değil.

### 3.1 SKILL.md anatomisi
- **Frontmatter:** `name` + `description` (folded `>-`). Description ZENGİN olmalı: ne yaptığı +
  **TR+EN tetikleyiciler** + upstream/downstream ("X'in çıktısından başla", "Y'ye devret").
- **Gövde (sıra):**
  1. `# Başlık` + **"Neyi neden böyle yapıyoruz (özü kavra)"** — skill'in varlık amacı + tasarımı
     dayatan ilkeler.
  2. **"Altın kurallar"** — her oturumda geçerli değişmezler.
  3. **"Başlamadan"** — girdi netleştirme (upstream artefakt var mı?).
  4. **Fazlar** — `Faz N` her biri: **Amaç** · **Elicit/Yap** · **⚠ Anti-pattern** · (doğrulayan
     skill'de) **Kapatır** (hangi validator kuralını discharge eder). Faz ↔ kural **1:1**.
  5. **Emit/Doğrula** — dependency-order üret + doğrula (§4).
  6. **Referans dosyaları** listesi.

## 4. Validator deseni (doğrulayan skill'ler)

- **Gömülü + self-contained.** Her doğrulayan skill **kendi** validator bundle'ını taşır
  (esbuild tek-dosya `.mjs`; runtime'da node_modules/canlı grammar deposu GEREKMEZ). Validator'lar
  skill'ler arası **PAYLAŞILMAZ** (bkz. §9 — platform yasağı + zaten dedup yok: her DSL farklı doğrulanır).
- **Çağrı = CWD-bağımsız.** Skill bash'inin CWD'si **kullanıcının cwd'sidir** (skill dizini değil).
  Bundled script'i daima şöyle çağır:
  ```
  node ${CLAUDE_SKILL_DIR}/validator/<x>.mjs <hedef> [--json]
  ```
  Göreli yol (`./validator/...`) veya `<skill>` placeholder'ı kurulu plugin'de **kırılır**.
- **Doğrulama döngüsü:** **0 error** hedef — çıkmadan düzelt, tekrar koş. **warning → kullanıcıya
  takip sorusu** (ikinci tur sorgulama). Documented-exception dışında hata bırakma.
- **Snapshot disiplini (§3.4 yol haritası):** bundle bir **grammar + mantık snapshot**'ıdır.
  `build.<x>.mjs` canlı grammar deposundan (**read-only**) tazeler. Bayatlık = İKİ parmak izi:
  `grammarHash` (grammar) + `srcHash` (validation mantığı) — `--version` ikisini basar; biri
  kaynakla uyuşmazsa bundle bayattır → yeniden build.
- **Otomatik bayatlık-denetimi (meta-fix E, 2026-07-08):** `scripts/check-skill-staleness.mjs
  [<CommandDSL-yolu>]` — 4 skil'in bundle hash'ini (İKİ parmak izi), envanter-damgasını VE
  içerik-kapsamasını (gramerdeki keyword ref-doküman'da öğretiliyor mu) **CANLI gramere karşı**
  denetler. Eski manuel-karşılaştırma bundle'a çıpalıydı (bundle+damga birlikte kayınca yanlış
  "taze"); bu araç canlı CommandDSL'e çıpalar → aylarca-sessiz drift biter. **Tetik:** CommandDSL'in
  `.githooks/pre-push`'u (kardeş plugin'i denetler; `scripts/install-hooks.sh` ile kurulur) — gramer
  push'undan ÖNCE stale bundle push'u durdurur. Gramer/validator değişince DoD: aile-eşzamanlı
  rebuild + referans/envanter + `check-skill-staleness` yeşil.

## 5. Capability deseni (ön-kapı / router skill'ler)

Bir skill, çalıştırmayı **kendi okuyamadığı** dış bir araca devrediyorsa (ör. ayrı repodaki üreteç):
- Aracın yeteneğini, **sürüme-çivili gömülü bir snapshot**'tan oku (`capability/<tool>.capability.json`),
  asla araç kaynağından çıkarsama yapma (**declared, not inferred**).
- Yanına `capability/SNAPSHOT.json` (kaynak + sürüm + tarih + **bayatlama/tazeleme kuralı**) — validator
  snapshot disiplininin (§4) muadili. Araç sürümü artınca snapshot tazelenir.
- Eşleştirme verdict'i **kanıtla** (hangi snapshot satırı). Sessiz default yok; boşluk dispozisyonu kullanıcının.
- Ön-kapı **üretmez/derlemez** — girdiyi hazırlar, executor'a devreder.

## 6. Eval'ler

`evals/evals.json`: `{ skill_name, evals: [{ id, name, prompt, expected_output, files }] }`.
**Declarative senaryo** + beklenen davranış. Canlı koşturma (bağımsız subagent skill'i yükleyip
prompt'u işler, `expected_output` görmeden; sonra karşılaştır) ayrı bir doğrulama adımıdır.

## 7. Değişmez ilkeler ("neden")

- **Elicit top-down / emit dependency-order.** Büyük resim → detay sor; referans-verilen önce üret.
- **"Tutarlılık > sözdizimi."** Doğrulama yalnız parse-temizliği değil **aile-sadakatini** kanıtlar
  (linked-zorunlu olduğu yerde `contract` olmadan fidelity check'leri içi-boş geçer).
- **Sessiz default YOK.** Belirsizliği yüzeyle, sor. Güvenlik/yetki **zayıflatan** kararları açıkça onaylat.
- **Declared, çıkarsama değil.** Yetenek/grammar'ı kayıtlı snapshot'tan oku.
- **"In god we trust, others we validate."** Her değişiklik gerçek data ile koşulur; 0 error veya
  belgeli istisna. Bellek değil **repo** doğrular.
- **Rol aşma yok.** Ön-kapı üretmez; üretici derler; her skill kendi işini yapar, gerisini devreder.

## 8. Versiyonlama

- Marketplace = katalog. Her **plugin** kendi semver'i (diller bağımsız evrilir).
- Skill/validator/içerik değişince **plugin** sürümü artar. `plugin.json` **ve** `marketplace.json`
  sürümleri **senkron** tutulur. Yeni skill = minor; fix/hijyen = patch.

## 9. Platform sınırları (Claude Code — sert kurallar)

> Kaynak: resmi Plugins Reference + Skills dokümanı. Bunlar TASARIMI kısıtlar.

- **Skill kendi dizini DIŞINA referans VEREMEZ.** `../../shared/...` kurulumda kopyalanmaz →
  kırılır. Bu yüzden plugin-level paylaşımlı varlık (validator/reference) **YOK** → **self-contained per skill**.
- **`${CLAUDE_PLUGIN_ROOT}` skill içeriğinde YOK** (yalnız hooks/MCP/monitors). Skill'e açık tek
  konum mekanizması: **`${CLAUDE_SKILL_DIR}`** (bundled script çağrısı için; §4).
- **Kurulumda tüm skill alt-ağacı kopyalanır** (seçici değil) → skill'i self-contained ve junk'sız tut.

## 10. Tek-kaynak + hijyen

- **Tek kaynak:** her skill'in TEK kanonik kopyası = plugin içinde. Workspace dev-kopyası tutma
  (iki kaynak = drift). `kod-uretimi` baştan yalnız plugin'de; eski workspace kopyaları silindi.
- **Hijyen:** repo kökünde `.gitignore` (`.DS_Store`, `node_modules/`). Commit'e junk sokma; stage'i
  daima doğrula. Origin'e yalnız kullanıcı onayıyla push.

## 11. Yeni skill checklist

1. Aynı dil mi? → mevcut plugin'e skill ekle. Yeni dil mi? → yeni plugin.
2. Türkçe görev adı (`-dsl`'siz). `skills/<ad>/` iskeleti (§3).
3. SKILL.md anatomisi (§3.1): zengin description + TR/EN tetikleyici + faz↔kural 1:1.
4. Doğrulayan mı (`validator/`, §4) yoksa ön-kapı mı (`capability/`, §5)? Gömülü + self-contained + `${CLAUDE_SKILL_DIR}`.
5. `references/examples/` = validator-kanıtlı (0 error). `evals/evals.json` (§6).
6. Upstream/downstream zincirini description'da bildir (kimden devralır, kime devreder).
7. `plugin.json` + `marketplace.json` sürüm bump (§8). Local doğrula (gerçek data, 0 error).
8. Commit (junk yok) — push **yalnız kullanıcı onayıyla**.
