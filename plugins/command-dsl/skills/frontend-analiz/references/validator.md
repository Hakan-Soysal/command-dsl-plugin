# Gömülü doğrulayıcı + gate'li emitter (`fcdsl.mjs`)

## Çağrım

```
node ${CLAUDE_SKILL_DIR}/validator/fcdsl.mjs <dosya.fcdsl | dizin ...> [--out <dizin>] [--json] [--quiet]
node ${CLAUDE_SKILL_DIR}/validator/fcdsl.mjs --version
```

- `${CLAUDE_SKILL_DIR}` = bu skill'in kurulu dizini. CWD kullanıcının dizinidir —
  göreli yolla arama yapma.
- Self-contained bundle: Node 20+ yeter; CommandDSL deposu ve node_modules GEREKMEZ.
- Dizin verilirse recursive taranır (`node_modules` ve gizli dizinler atlanır).
- **TÜM model dosyalarını TEK çağrıda ver** (workspace-pass) — union-coverage ancak
  böyle doğru (bkz. consistency-and-emit.md §B).
- Linked `contract`/`tech` yolları her `.fcdsl`'in KENDİ konumuna göre çözülür —
  contract dosyalarının emit edilen `.fcdsl`'lerin yanında (veya doğru göreli yolda)
  olduğundan emin ol.

## Çıkış sözleşmesi

| Exit | Anlam |
|---|---|
| 0 | 0 error (warning/info olabilir) — `--out` verildiyse emit YAPILDI |
| 1 | ≥1 severity-1 error — `--out` verildiyse bile emit YAPILMADI (gate; partial yok) |
| 2 | Kullanım/girdi hatası (yol yok, hiç `.fcdsl` yok, argüman eksik) |

- `--json`: stdout = SAF diagnostics dizisi `[{severity, line, col, message, file}]`
  (severity 1=error 2=warning 3=info); meta banner stderr'de. Programatik döngü için bunu kullan.
- Varsayılan: insan-okur rapor. `--quiet`: info satırları bastırılır.

## Diagnostics → düzeltme döngüsü

1. Çalıştır (`--json` ile). **error** varsa: mesajlar Türkçe ve karar-numaralı —
   düzelt, TEKRAR çalıştır. **0 error olmadan döngüden çıkma.**
2. **warning**'leri kullanıcıya TAKİP SORUSU olarak taşı (soru kalıpları:
   `upstream-to-frontend-translation.md §F`). Cevaba göre ya modeli düzelt ya kararı
   belgele (dosyada `#` yorumu) — sonra yine çalıştır.
3. **info**'lar: by-name çıpalar (`'X' ad-eşleşmesiyle çıpalandı`) emit öncesi tek
   satırla onaylatılır; `contract'ta karşılıksız — standalone-arayüz` info'su ise o
   arayüzün kasıtlı-yerel (ör. Login) olduğunun teyididir.
4. 0-error'a gelince `--out <dizin>` ile son koşu → `.experience.json`'lar üretilir.

## Dört yeni tanı (frontend v4.0.0 — biri ERROR)

**Gramer DEĞİŞMEDİ; yasaklar yalnız doğrulayıcıdadır.** Her tanı için: *ne yakalar · ne zaman
SUSAR (fail-open) · şiddeti*. ⚠ Susma koşullarını yanlış anlatmak aktif olarak yanıltır — bu
liste `src/frontend/frontend-dsl-validation.ts`'ten birebir çıkarıldı.

**1) Ekranın personası uygulamanın `audience` kümesinde değil — ⛔ HATA**

- **Yakalar:** `experience` "bu uygulamayı şunlar kullanır" der, ekran `for <Persona>` ile başka
  birine ait olduğunu söyler → o ekrana **hiçbir kullanıcı ulaşamaz** (ölü ekran). Stil kusuru
  değil; bu yüzden uyarı değil hata.
- **Susar:** ekran persona taşımıyorsa (çelişecek beyan yok) · `experience` hiç `audience`
  yazmamışsa (karşılaştıracak küme yok) · ekran `shared` bloğundaysa (orada persona yazmak
  zaten AYRI bir error'dur, ikinci kez bildirilmez).
- **Şiddet: ERROR** — bu tanıyı üreten dosya `exit 1` alır. **Bu, sürümü MAJOR yapan tanıdır:
  daha önce 0-error geçen modeller artık geçmeyebilir.** Kapanış: ya personayı `audience`'a
  ekle ya ekranın personasını düzelt — **kullanıcıya sorarak** (hangisi doğru, sen bilemezsin).

**2) Personalar arası `nav` geçişi — uyarı**

- **Yakalar:** `nav A -> B` kenarının iki ucu farklı personalara aitse o kenarı hiçbir kullanıcı
  yürüyemez → navigasyon haritasında ölü kenar.
- **Susar:** kaynak ya da hedef çözülemiyorsa (yarım yazım; parse tarafı zaten uyarır) · iki
  ekrandan **biri** persona taşımıyorsa · **hedef** `shared` bloğundaysa (paylaşımlı ekran
  herkese açıktır) · personalar aynıysa.
- **Şiddet: uyarı.** Kapanış: hedefi paylaşımlı yap · personaları eşitle · geçişi kaldır.

**3) `currentUser.<alan>` teknik taraftaki kişi bildiriminde yok — uyarı**

- **Yakalar:** oturumdaki kullanıcıdan okunan alan adının uydurma/yazım hatası olmasını
  (`currentUser.rol` ↔ `role`). İzinli alan listesi **elle tutulmaz — TÜRETİLİR:** tech
  `manifest.json`'daki `principals[]`'tan (kimlik alanının adı + bağlandığı kaydın alan adı)
  + her zaman geçerli rol ekseni (`role`, `roles`).
- **Susar:** teknik taraf bağlı değilse (standalone `.fcdsl`) · manifest **hiç `principals`
  taşımıyorsa** — elde yazılmış ya da eski (`manifestVersion: 1`) bir manifest'te bu tanı
  **kalıcı olarak SESSİZDİR** · `session.*` kökü **bilinçle kapsam dışıdır** (şeması olmayan
  opak depo; yalnız `currentUser.*` denetlenir).
- ⚠ **Bunu 4'e genelleme.** `principals[]` YALNIZ bu tanının kaynağıdır; 4 numaralı tanı işlem
  başına `roles` alanına bakar — **bağımsız bir manifest alanı**. `roles` taşıyan ama
  `principals` taşımayan bir manifest'te **rol-kapısı uyarısı ateşlemeye DEVAM eder**.
- **Şiddet: uyarı.**

**4) Aksiyonun rol koşulu ile işlemin rol kısıtı sapıyor — uyarı**

- **Yakalar:** `visible-when: currentUser.role = X` gibi bir **rol kapısı**, bağlandığı işlemin
  tech tarafta bildirdiği `roles` kümesinde YOKSA → kullanıcı butonu görür, basınca yetkisizlik
  alır.
- **Susar (beş yer):** teknik taraf bağlı değilse · aksiyon bir işleme bağlanmıyorsa
  (client-only) / işlem çözülemiyorsa · işlem hiç `roles` bildirmiyorsa · koşul **rol
  karşılaştırmıyorsa**. Son madde dar: yalnız `currentUser.role`/`currentUser.roles` üzerinden
  **EŞİTLİK** (`=`) tanınır — `!=`, `>`, `in` ve rol-dışı karşılaştırmalar (`currentUser.id =
  row.ownerId`) kapsam DIŞIDIR (fail-open: asla tahmin etmez).
- **Şiddet: uyarı** — duruş `uxOnly`; yetki backend'de zorlanır, bu tanı sapmayı bildirir.

> **Not (v4.0.0 çıktı ekseni):** `experience.json`'ın tip-uzayı DEĞİŞMEDİ — yeni alan/varyant/
> discriminator yok. Tek değer değişikliği `meta.dslVersion` `"3.0.2"` → `"4.0.0"`. Frontend
> manifest'ten artık `principals[]` + op-başına `roles` **okuyor**, ama bunlar çıktıya sızmaz.

## Tech'siz mod (yalnız business bağlıyken KAPALI kalan denetimler)

`contract` var ama `tech` yoksa şunlar SESSİZCE çalışmaz — kullanıcıya baştan söyle:

- **Çağrılamaz-op** (op tech'te realize edilmiyor / @internal) — hiç uyarı gelmez.
- **Results-divergence** (sunucunun üretebildiği hatalar authored kümede eksik).
- **Validation-divergence** (sunucu kuralı var, form boş).
- **Pagination divergence** (3 kural — backend sayfalı/sayfasız uyumsuzlukları).
- **Uncovered-op (union)** — "exposed" bilgisi tech'ten gelir; tech yoksa denetim yok.
- **`currentUser.<alan>` sözlüğü** (v4.0.0 tanı 3) — sözlük manifest `principals[]`'tan türer;
  tech yoksa **ya da manifest hiç `principals` taşımıyorsa** (elde yazılmış / `manifestVersion: 1`)
  kalıcı olarak SESSİZ.
- **Rol-kapısı sapması** (v4.0.0 tanı 4) — op başına `roles` tech'ten gelir. ⚠ Bu **`principals`'tan
  BAĞIMSIZ** bir alandır: `roles` var + `principals` yok olan bir manifest'te bu uyarı ATEŞLER.

Çalışmaya DEVAM edenler: anchor (tanımsız-op/kind), audience/persona cross-check,
**persona↔audience ERROR'u ve personalar-arası nav uyarısı (v4.0.0 tanı 1-2 — ikisi de saf
`.fcdsl` içi; tech gerekmez)**,
flow-kapsama, entry/erişilebilirlik, cardinality, queue×out, handler-tamlık, path-kökleri
ve tüm yapısal kurallar. Teknik analiz sonradan yapılınca: `contract` satırına
`tech './manifest.json'` ekle + yeniden doğrula (yeni warning'ler = yeni takip soruları).

## Bayatlık (staleness) kontrolü

`--version` gömülü BUILD_INFO'yu basar (`SNAPSHOT.json`'da da aynısı):

- `grammarHash` — `frontend-dsl.langium` + `shared.langium` parmak izi (GRAMMAR izi).
- `srcDirs` — bundle'a gerçekten giren `src/` dizinleri (bugün `src/frontend` + `src/shared`).
  Build'in Pass-1 esbuild-metafile'ından türetilir ve damgalanır — statik reçete DEĞİL
  (2026-07-17); yeni bir cross-dizin import otomatik kapsanır.
- `frontendSrcHash` — `srcDirs`'teki `**.ts/**.mts` ağacının parmak izi (VALIDATION+EMIT
  mantığı izi; grammar değişmeden yapılan davranış fix'lerini de yakalar).
- `commit` / `builtAt` — kaynak CommandDSL commit'i.

Kullanıcının elinde canlı CommandDSL varsa ve dil davranışı bundle'la çelişiyorsa
(örn. yeni keyword parse olmuyor) hash'leri karşılaştır; bayatsa bundle'ı tazele:

```
CMDDSL=<CommandDSL-yolu> node ${CLAUDE_SKILL_DIR}/validator/build.frontend.mjs
```

(Read-only build; CommandDSL'e hiçbir şey yazmaz. Depo yoksa bundle olduğu gibi
kullanılır — snapshot tarihini kullanıcıya söyle.)

## `.cdsl → operations.json` fallback aracı

Kullanıcı yalnız `.cdsl` getirdiyse (operations.json yok):

```
node ${CLAUDE_SKILL_DIR}/validator/emit-operations.mjs <girdi.cdsl> <çıktı.operations.json>
```

Parse hatalı `.cdsl`'de emit etmez (exit 1) — önce iş tarafını `is-analizi-dsl` ile
düzelttir. (Kanonik üretici is-analizi skill'indedir; buradaki self-contained kopyadır.)

> **Sürüm politikası (2026-07-02'de ÇÖZÜLDÜ):** sözleşme **v3**'tür (`meta.schemaVersion: 3`,
> ADR-0033) — bu emit kopyası v3 üretir, `fcdsl.mjs` de v3 zorunlu kılar (v2 sözleşme →
> "Frontend DSL v3 bekler" error; tech ile aynı katı politika). Tarihçe: frontend
> validator'ı bir dönem `===2`'de kalmıştı; CommandDSL'de uyum fix'i uygulandı (kullanıcı
> onayıyla, local) ve iki bundle + `catalog.operations.json` fixture'ı birlikte tazelendi.
> Kural kalıcıdır: **iki bundle'ı hep AYNI repo durumundan birlikte build et**
> (`build.emit.mjs` + `build.frontend.mjs`) — tek tarafı tazelemek sürüm-kayması üretir.

## İnsan-okur rapor aracı (`report-frontend.mjs`)

0-error emit'ten (`--out` → `.experience.json`'lar) sonra çalışan gömülü rapor
üreteci (varsayılan otomatik; opt-out kuralı SKILL.md'de):

```
node ${CLAUDE_SKILL_DIR}/validator/report-frontend.mjs <experience-dizini> [--flows <operations.json>] --reports <dizin> [--title "<Proje>"] [--quiet]
```

- **exit:** 0 = üretildi · 1 = girdi hatalı (HİÇBİR rapor yazılmaz — gate) ·
  2 = kullanım hatası.
- **Üretilenler** (`reports/frontend/…`): `wireframes/<slug>.puml` (ekran başına Salt) ·
  `flows/<slug>.puml` (experience storyboard) · `bizflows/<slug>.puml` (İş-Akışı:
  business flow × ekranlar — yalnız `--flows` verilince) — hepsi playground'un kendi
  programatik üreteçlerinden (`frontend-salt` + `frontend-flow`).
- **Index regen kuralı:** her koşu sonunda `reports/index.md` + `index.html` **diski
  TARAYARAK yeniden üretilir** (idempotent — hangi aile aracı son koşarsa koşsun aynı
  index; business/tech/frontend/qa aynı `reports/` kökünde birleşir, aynı `--title`'ı ver).
  `.puml` girdileri göreli kaynak linki + plantuml.com/plantuml/svg/ görüntüleme
  linkiyle listelenir (render harici sunucuda — hassas içerikte tıklamamak
  kullanıcının tercihi).
- **Bayatlık:** `REPORT-SNAPSHOT.json` aile iki-hash disipliniyle aynı BUILD_INFO'yu
  taşır; rapor bundle'ı da yukarıdaki **aile-eşzamanlı build** kuralına tabidir —
  tüm aile bundle'ları AYNI repo durumundan birlikte tazelenir. **EK (Faz-2,
  2026-07-17):** aile-eşzamanlılık artık sigortalıdır — CommandDSL-src taşıyan HER
  emit/report bundle'ı (`fcdsl.mjs` + `emit-operations.mjs` + `report-frontend.mjs`)
  `check-skill-staleness` tarafından kendi `srcDirs`/`srcHash` damgasıyla AYRI
  denetlenir; kısmi rebuild sessiz kalamaz. report-frontend'in `srcDirs`'ü Pass-1
  metafile + `EXTRA_SRC_DIRS` birleşimidir (bugün `src/frontend` + `src/playground`):
  `experience.ts` import'ları type-only olduğundan metafile'da görünmez ama
  experience.json girdi-ŞEMASI orada yaşar → `src/frontend` elle damgaya eklenir.
