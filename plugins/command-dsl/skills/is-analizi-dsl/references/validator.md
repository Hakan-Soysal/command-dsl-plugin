# Doğrulayıcı: Konum Çözümleme + Düzeltme Döngüsü

Üretilen `.cdsl`'i gerçek CommandDSL doğrulayıcısıyla parse-temiz kanıtlamak en
güçlü "hatasız" garantisidir. Doğrulayıcı **opsiyoneldir**: bulunursa kullan,
bulunmazsa valid-by-construction + tutarlılık self-check'iyle (bkz.
`consistency-and-emit.md`) devam et.

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

Hiçbiri yoksa: kullanıcıya bir satır bilgi ver ("Doğrulayıcı bulunamadı;
valid-by-construction + self-check ile ürettim") ve devam et — emit'i engelleme.

## 3. Çağırma sözleşmesi

Doğrulayıcı şöyle çağrılabilmeli ve **makine-okur** çıktı vermeli:

```
<runner> <validator> <dosya.cdsl> [--json]
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

## 4. Bayatlık (drift) uyarısı

bundled/url snapshot olduğu için grammar değişince bayatlar. Mümkünse:
- Doğrulayıcı kendi `grammarVersion`'ını bassın; config'teki `grammarVersion` ile
  uyuşmuyorsa kullanıcıyı **uyar** ("Doğrulayıcı vX, model vY varsayıyor — sonuç
  güvenilmez olabilir"). Sessiz yanlış-yeşil en kötü senaryodur.
- Canlı proje erişilebilirken bundle/url'i tercih etme.

## 5. Düzeltme döngüsü

1. Emit ettiğin `.cdsl`(ler)i doğrulayıcıya ver.
2. **severity 1 (error)** varsa: emit "başarısız" sayılır. Diagnostics'i oku,
   ilgili katmana dön (genelde tutarlılık self-check'inde kaçırdığın bir referans
   ya da tip-uyumu), düzelt, **yeniden doğrula**. 0 error olana kadar tekrarla.
3. **severity 2 (warning):** değerlendir; çoğu gerçek sorun işaretidir, düzelt.
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
  sürüm-kayması üretir.
