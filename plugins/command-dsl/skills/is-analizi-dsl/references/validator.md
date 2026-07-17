# Doğrulayıcı: Konum Çözümleme + Düzeltme Döngüsü

Üretilen `.cdsl`'i gerçek CommandDSL doğrulayıcısıyla parse-temiz kanıtlamak en
güçlü "hatasız" garantisidir. Doğrulayıcı **GÖMÜLÜdür** (`validator/validate.mjs`,
`${CLAUDE_SKILL_DIR}` ile CWD-bağımsız çağrılır) — **her zaman vardır**, "varsa"
değil. Doğrulama atlanabilir bir adım DEĞİLDİR: **0 error olmadan döngüden çıkma**
(SKILL.md "Doğrulama + operations.json" ile aynı disiplin). Valid-by-construction
+ tutarlılık self-check'i (bkz. `consistency-and-emit.md`) doğrulayıcının yerine
GEÇMEZ — onun önündeki emniyet katmanıdır; son söz doğrulayıcınındır.

> Not: Doğrulayıcı artefaktının paketlenmesi (standalone bundle / canlı projeye
> köprü / indirilebilir paket) bu skill'in dışında, ayrıca hallediliyor. Bu dosya
> skill'in onu **nasıl bulup çağıracağını** ve **çıktı sözleşmesini** tanımlar.

## 1. Konfigürasyon

Skill, kendi dizininde `validator.config.json` arar (yoksa varsayılan zincir).
Şablon: `assets/validator.config.example.json`. Alanlar:

```json
{
  "resolution": ["project", "bundled", "url"],
  "projectPath": "../../CommandDSL",
  "bundledPath": "${CLAUDE_SKILL_DIR}/validator/validate.mjs",
  "url": "",
  "cacheDir": "./.validator-cache",
  "runner": "auto",
  "grammarVersion": "v3.0"
}
```

- `resolution`: denenecek kaynakların **öncelik sırası**. Önerilen sıra
  `["project","bundled","url"]` — canlı proje **drift yemez**; bundle/url snapshot.
- `projectPath`: canlı CommandDSL deposunun yolu (içinde grammar + `src/language`
  + node_modules olan dizin).
- `bundledPath`: skill'in yanına konan tek dosyalık doğrulayıcı. `${CLAUDE_SKILL_DIR}` ile çağır →
  skill bash'inin CWD'si kullanıcının cwd'si olduğundan göreli yol (`./validator/...`) güvenilmez.
- `url`: indirilecek doğrulayıcı paketi (boşsa atlanır); `cacheDir`'e indirilir.
- `runner`: `node` | `tsx` | `auto` (auto: önce node, sonra npx tsx dener).

## 2. Çözümleme algoritması

`resolution` sırasını izle; ilk **çalışan** kaynağı kullan:
1. **project** — `projectPath` var ve içinde grammar/dil servisleri varsa, oradan
   doğrula (en güncel). Tek-dosya CLI yoksa `npx tsx` ile küçük bir runner gerekir;
   yoksa bu kaynağı atla.
2. **bundled** — `bundledPath` dosyası varsa onu çalıştır.
3. **url** — `url` doluysa indir → `cacheDir`'e koy → çalıştır.

Gömülü rejimde **bundled her zaman vardır** — zincirin tabanıdır; "hiçbir kaynak
çalışmıyor" normal bir durum DEĞİL, kurulum kusurudur. Böyle bir kusurda
doğrulamasız devam ETME ve çıktıyı "doğrulanmış" diye SUNMA: kullanıcıya durumu
bildir, doğrulayıcı çalışır hâle gelmeden emit'i tamamlanmış sayma — ÇİFT-SIFIR'ın
0-error yarısı kanıtsız kapanamaz.

## 3. Çağırma sözleşmesi

Doğrulayıcı şöyle çağrılabilmeli ve **makine-okur** çıktı vermeli:

```
<runner> <validator> <dosya.cdsl> [--json] [--single]
```

Beklenen davranış:
- **exit code:** 0 = error yok; ≠0 = en az bir error.
- **stdout (--json):** diagnostics dizisi; her biri:
  ```json
  { "severity": 1, "line": 12, "col": 5, "message": "...", "code": "P6" }
  ```
  severity: **1=error, 2=warning, 3=info** (CommandDSL test konvansiyonu).
- Birden çok import'lu dosyada giriş dosyasını ver; doğrulayıcı kapanışı yükler.
  (Paketlenmiş `validate.mjs` bunu **dizin yükleyerek** yapar: verdiğin dosyanın
  bulunduğu dizindeki tüm `.cdsl`'leri birlikte derler — import kapanışının bir
  üst-kümesidir. Skill'in modül-başına-dosya emit kalıbında ikisi aynıdır; tek
  dizinde alâkasız iki model varsa tek-global-isim-uzayı kontrolü tetiklenebilir.)
- **`--single` (opt-in):** yukarıdaki dizin-genişletme tuzağının çıkış yolu —
  yalnız verilen **DOSYA** girdi olur; alâkasız komşu `.cdsl`'ler HİÇ yüklenmez
  (komşu hataları çıktıya/exit-code'a karışmaz). `import` kapanışı yine TAM
  çözülür (CommandDSL'in kendi DocumentBuilder'ı kapanışı otomatik çeker).
  Kapanış dosyalarındaki tanılar **fail-loud**'dur: `(kapanış)` etiketiyle
  raporlanır VE sayılır (bozuk import hedefi = exit 1); `--json`'da bu tanılar
  `"closure": true` alanı taşır. `--single` bir **dizinle** çağrılırsa exit 2.
  ⚠ Ters-yön importer'lar (bu dosyayı import EDEN akış dosyaları) yüklenmediği
  için dizin moduna göre **F6 kapsama / P8 destek-akışı** INFO-WARN farkı
  görülebilir — hata değil, doğrulama-birimi farkıdır. Varsayılan davranış
  (bayraksız = dizin-birimi) DEĞİŞMEDİ.

## 4. Bayatlık (drift) uyarısı

bundled/url snapshot olduğu için grammar/validation değişince bayatlar. Mümkünse:
- Doğrulayıcı kendi `grammarVersion`'ını bassın; config'teki `grammarVersion` ile
  uyuşmuyorsa kullanıcıyı **uyar** ("Doğrulayıcı vX, model vY varsayıyor — sonuç
  güvenilmez olabilir"). Sessiz yanlış-yeşil en kötü senaryodur.
- Canlı proje erişilebilirken bundle/url'i tercih etme.
- Gömülü `__BUILD_INFO__` (`node validate.mjs --version`) aile iki-hash disiplinini taşır
  (2026-07-17'den beri):
  - `grammarHash` — `command-dsl.langium` + `shared.langium` parmak izi (GRAMMAR izi).
  - `srcDirs` — bundle'a gerçekten giren `src/` dizinleri (bugün `src/generated` +
    `src/language` + `src/shared`). Build'in (`build.mjs`) Pass-1 esbuild-metafile'ından
    türetilir ve damgalanır — statik reçete DEĞİL; yeni bir cross-dizin import otomatik kapsanır.
  - `businessSrcHash` — `srcDirs`'teki `**.ts/**.mts` ağacının parmak izi (VALIDATION mantığı
    izi; grammar değişmeden yapılan davranış fix'lerini de yakalar — eski tek-hash dönem
    bu sınıfa TAM KÖRDÜ).
  - `commit` / `builtAt` — kaynak CommandDSL commit'i.

## 5. Düzeltme döngüsü

1. Emit ettiğin `.cdsl`(ler)i doğrulayıcıya ver.
2. **severity 1 (error)** varsa: emit "başarısız" sayılır. Diagnostics'i oku,
   ilgili katmana dön (genelde tutarlılık self-check'inde kaçırdığın bir referans
   ya da tip-uyumu), düzelt, **yeniden doğrula**. 0 error olana kadar tekrarla.
3. **severity 2 (warning) = çözülmemiş soru (Değişmez-3):** skill warning'i KENDİ
   uydurduğu düzeltmeyle kapatamaz — kapanış AUTHORED'dır: (a) kullanıcıya sor →
   cevaba göre düzelt, (b) gerekçeli kabul (gerekçe `note`/çıktı özetine düşülür),
   ya da (c) yanlış-pozitif olduğunu göster. Sessiz auto-fix YASAK.
4. **severity 3 (info):** bilinçli olabilir (ör. P8 destek-akışı). Geçiyorsan
   **neden** geçtiğini dokümanda/çıktı özetinde belirt — sessizce normalize etme.
5. Sonuçta kullanıcıya kısa özet ver: "Doğrulandı: 0 error, N warning (şu nedenle
   bilinçli), doğrulayıcı kaynağı: project/bundled/url."

## 6. Düzeltme döngüsüne girilen tipik error'lar
- Çözülmeyen ID (flow step → olmayan operation / process stage → olmayan flow).
- P6: `by` ≠ flow `for`.
- T1-T4: sorguya komut cümleciği (veya tersi).
- T5: yinelenen 4'lü imza.
- Tanımsız entity/relation/calendar/actor.
Hepsi `consistency-and-emit.md` self-check'inde önlenebilir; doğrulayıcı son emniyet kemeridir.

## 7. İnsan-okur rapor aracı (`report-business.mjs`)

Doğrulama 0-error geçip makine-JSON'lar üretildikten sonra çalışan gömülü rapor
üreteci (varsayılan otomatik; opt-out kuralı SKILL.md'de):

```
node ${CLAUDE_SKILL_DIR}/validator/report-business.mjs <model.cdsl> --reports <dizin> [--title "<Proje>"] [--quiet]
```

- **exit:** 0 = üretildi · 1 = girdi hatalı (HİÇBİR rapor yazılmaz — gate) ·
  2 = kullanım hatası.
- **Üretilenler** (`reports/business/…`): `usecase.puml` · `flows/<slug>.puml` ·
  `processes/<slug>.puml` + `<slug>.blueprint.puml` · `docs/**` (process-doc +
  cockburn) · `COVERAGE.md` — hepsi playground'un kendi programatik üreteçlerinden.
- **Index regen kuralı:** her koşu sonunda `reports/index.md` + `index.html` **diski
  TARAYARAK yeniden üretilir** (idempotent — hangi aile aracı son koşarsa koşsun aynı
  index; business/tech/frontend/qa aynı `reports/` kökünde birleşir, aynı `--title`'ı ver).
  `.puml` girdileri göreli kaynak linki + plantuml.com/plantuml/svg/ görüntüleme
  linkiyle listelenir (render harici sunucuda — hassas içerikte tıklamamak
  kullanıcının tercihi).
- **Bayatlık:** `REPORT-SNAPSHOT.json` aile iki-hash disipliniyle aynı BUILD_INFO'yu
  taşır; rapor bundle'ı da **aile-eşzamanlı build** kuralına tabidir — tüm aile
  bundle'ları AYNI repo durumundan birlikte tazelenir, tek tarafı tazelemek
  sürüm-kayması üretir. **EK (Faz-2, 2026-07-17):** aile-eşzamanlılık artık sigortalıdır —
  CommandDSL-src taşıyan HER emit/report bundle'ı (`emit-operations.mjs` +
  `report-business.mjs` dahil) `check-skill-staleness` tarafından kendi
  `srcDirs`/`srcHash` damgasıyla AYRI denetlenir; kısmi rebuild sessiz kalamaz.
