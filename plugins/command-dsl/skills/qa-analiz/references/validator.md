# Gömülü doğrulayıcı + gate'li emitter (`qcdsl.mjs`)

## Çağrım

```
node ${CLAUDE_SKILL_DIR}/validator/qcdsl.mjs <dosya.qa | dizin ...> --strict [--out <dizin>] [--merged <dosya>] [--json]
node ${CLAUDE_SKILL_DIR}/validator/qcdsl.mjs --version
```

- `${CLAUDE_SKILL_DIR}` = bu skill'in kurulu dizini. CWD kullanıcının dizinidir —
  göreli yolla arama yapma.
- Self-contained bundle: Node 20+ yeter; CommandDSL deposu ve node_modules GEREKMEZ.
  Bundle `.tcdsl` dosyalarını KENDİSİ parse eder (birleşik üretim tech grammar'ını
  içerir — spec §11) ve `uses flows` JSON'unu kendisi okur; ek araç gerekmez.
- Dizin verilirse recursive taranır.
- **TÜM `.qa` dosyalarını TEK çağrıda ver** (workspace-pass) — union-coverage ancak
  böyle doğru (bkz. consistency-and-emit.md §B).
- `uses tech`/`uses flows` yolları her `.qa`'nın KENDİ konumuna göre çözülür.

## Strict varsayılanı

- **`--strict` bundle'da VARSAYILANDIR** (kullanıcı kararı, tasarım §8/3):
  kapsanmamış-dal warning'i (kalıcı diagnostic-code `qa.uncovered-branches`) error'a
  yükselir. Kapatmak için `--no-strict` (skill akışında KULLANMA — strict ilkesi
  skill'in varlık sebebidir; yalnız teşhis amaçlı ara-koşularda meşru).
- Skill'in çağrısı yine açık `--strict` yazar (okunabilirlik).
- Flow/process presence-uyarıları strict'te de **warning** kalır (S6 yalnız
  dal-coverage vaadi) — takip-sorusudur, kapı değil.

## Çıkış sözleşmesi

| Exit | Anlam |
|---|---|
| 0 | 0 error (warning/info olabilir) — `--out`/`--merged` verildiyse emit YAPILDI |
| 1 | ≥1 severity-1 error (strict-yükseltilmişler DAHİL; bozuk/okunamayan `uses flows` JSON'u da bu sınıftır — diagnostik error üretir) — emit YAPILMADI (gate; partial yok) |
| 2 | Kullanım/girdi hatası (yol yok, hiç `.qa` yok, argüman eksik) |

- **Emit-gate ARAÇ-İÇİDİR:** error varsa hiçbir JSON yazılmaz — repo CLI'ının
  "error'da da işaretli emit" davranışından bilinçli delta (skill bundle'ı "0-error →
  otomatik emit" garantisini araca gömer; repo `qcdsl.ts`'e dokunulmamıştır, delta
  sarmalayıcıda yaşar).
- `--json`: stdout = SAF diagnostics dizisi
  `[{severity, line, col, message, file, code?, strictElevated?}]`
  (severity 1=error 2=warning 3=info; `code` = kalıcı diagnostic-code, örn.
  `qa.uncovered-branches`; `strictElevated: true` = strict'in error'a yükselttiği
  uyarı); meta banner stderr'de. Programatik döngü için bunu kullan (fcdsl
  sarmalayıcı şemasıyla paralel).
- `--out <dizin>`: 0-error'da kaynak dosya başına `<ad>.qa.json`.
- `--merged <dosya>`: 0-error'da birleşik `qa.json` — **coverage YALNIZ burada**
  (karar #18). Önerilen ad/konum: çıktı dizininde `qa.json`.

## Diagnostics → düzeltme döngüsü

1. Çalıştır (`--json` ile). **error** varsa: düzelt/sor, TEKRAR çalıştır.
   **0 error olmadan döngüden çıkma.**
2. **warning**'leri kullanıcıya TAKİP SORUSU olarak taşı (aşağıdaki tablo + soru
   kalıpları `interrogation-playbook.md`).
3. **info**'ları değerlendir: S12 ve S5 aktif taşınır (tablo).
4. 0-error'a gelince `--out` + `--merged` ile son koşu → JSON'lar üretilir.

### error → düzeltme tablosu

| Diagnostik | Düzeltme |
|---|---|
| uses kaynağı okunamadı / bozuk tech | yolu düzelt; tech parse hatalıysa `teknik-analiz` ile düzelttir |
| guard-id çakışması (S17) | TECH'i düzelttir — qa tarafında yamalama yok (translation.md §H) |
| karşılıksız covers/expect/waive hedefi (olmayan guard/error; mekanizmasız op'a NotAuthorized; iç/compensate'siz calls'a callFailure; stale waive — m6) | dal adını §4.1 türetimine göre düzelt; tech değiştiyse waive/testi güncelle |
| çıplak NotAuthorized, çok-mekanizmalı op (karar #21) | kullanıcıya mekanizma-başına karar sor, niteleyici yaz |
| eksik stub / birleşim-dışı stub (QA-07) | birleşimi yeniden hesapla (translation.md §D); eksiği kullanıcıya "dış servis ne cevap versin?" diye sor, fazlayı kaldır |
| dataset/seed/returns/payload alan hatası (bilinmeyen/eksik/uyumsuz) | tech tipine eşitle (S18 degrade: opak tipe iddia yok; enum sınırı F3) |
| karşılıksız persona actor'ı / actor-mapped role'e `role` bağı | rolemap'e göre düzelt |
| `time` offset'siz / değer-sanity (QA-15/F7) | offset'li geçerli ISO yaz (`…Z`) |
| S1 başlık tekrarı / S3 binding ihlali / S4 after-page ihlali / S15 senaryo-callFailure / pinsiz `advance` / F8 senaryo given-call'da `as` yok / dangling seedRef / çokluk-seed bind | ilgili kuralı uygula (qa-dsl-reference.md §6/§9) |
| `when event` op'un `on` aboneliği değil | event'i op'un aboneliğine eşitle |
| `qa.uncovered-branches` (strict yükseltmesi) | Faz 6 sorusu: her dal için "test mi, waive mi?" — normalize ETME |

### warning → takip-sorusu tablosu (tasarım §4)

| Warning | Kullanıcıya soru |
|---|---|
| Flow/process presence (#23/#24) | "İş analizindeki '<akış>' akışını hiçbir senaryo koşmuyor — senaryo mu ekleyelim, bilinçli kapsam-dışı mı? (waive akışa UYGULANMAZ — ya senaryo ya belgeli-açık)" |
| Waive+test çelişkisi | "Bu dal hem test edilmiş hem waive'li — hangisi kalsın?" |
| S9 access-dışı state-assert | "Bu test, işlemin dokunmadığı bir tabloyu kontrol ediyor — kasıtlı mı (yan-etki avı), yanlış tablo mu?" |
| Kapsanmamış dal (yalnız `--no-strict` teşhis koşusunda görünür) | strict'te error olur — aynı Faz 6 sorusu |

### info → aktif taşınanlar

| Info | Aksiyonun |
|---|---|
| S12 — tech farklı sözleşmeye realizes | "Teknik analiz başka operations.json'a bağlı; doğru dosyayı mı bağladık?" — Faz 0'da çöz |
| S5 — id'siz check ("for guard önerilir") | tech'e İYİLEŞTİRME ÖNERİSİ olarak raporla ("kurallara ad verilirse ayrı izlenir"); qa'da bekletme |
| S14 — iç-modül compensate'li calls listesi | kullanıcıya bilgi: "bu telafi yolları hedef op'un kendi dallarıyla dolaylı test edilir" |

## Süresi geçmiş `until` davranışı (İQ6)

- `until` değerlendirmesi YALNIZ validator'dadır: bugünün tarihi geçmişse waive
  hükümsüzleşir, dal uncovered'a geri düşer → strict'te **error** → döngü kullanıcıya
  döner: "'<dal>' için erteleme süresi doldu — test mi yazalım, süreyi mi uzatalım?"
- Merged manifest `until`'ı verbatim taşır (manifest zaman-bağımsız — S13); yani
  bugün 0-error geçen bir workspace, until dolunca YARIN error verebilir — bunu
  kullanıcıya söyle (waive'lerin son-kullanma tarihi vardır).

## Bayatlık (staleness) kontrolü — İKİ hash + aile-eşzamanlı-build

`--version` gömülü BUILD_INFO'yu basar (`SNAPSHOT.json`'da da aynısı):

- `grammarHash` — `qa-dsl.langium` + `tech-dsl.langium` + `shared.langium` parmak izi
  (qa birleşik üretimi ÜÇÜNÜ de tüketir — bundle tech'i kendisi parse eder).
- `qaSrcHash` — `src/qa/**` + `src/shared/**` parmak izi (validation + coverage +
  emit mantığı; grammar değişmeden yapılan davranış fix'lerini de yakalar).
- `commit` / `builtAt` — kaynak CommandDSL commit'i.

Kullanıcının elinde canlı CommandDSL varsa ve dil davranışı bundle'la çelişiyorsa
hash'leri karşılaştır; bayatsa tazele:

```
CMDDSL=<CommandDSL-yolu> node ${CLAUDE_SKILL_DIR}/validator/build.qa.mjs
```

(Read-only build; CommandDSL'e hiçbir şey yazmaz. Depo yoksa bundle olduğu gibi
kullanılır — snapshot tarihini kullanıcıya söyle.)

> **Kalıcı aile kuralı (frontend turunun schemaVersion-kayması dersi):** bir skill
> bundle'ı tazelenirken TÜM aile bundle'ları **AYNI repo durumundan birlikte** build
> edilir — tek tarafı tazelemek sürüm-kayması üretir (frontend validator'ı bir dönem
> v2 sözleşmede kalmış, iki bundle + fixture birlikte tazelenerek çözülmüştü). Bu
> kural qa'da İKİ KAT kritiktir: qa bundle'ı tech grammar'ını gömer →
> **teknik-analiz bundle'ı ile qa bundle'ının tech-grammar hash'i EŞİT olmalı**
> (gensync-testinin skill-düzeyi muadili). Uyuşmazlık görürsen ikisini birlikte
> yeniden build ettir.

## `.cdsl → operations.json` fallback aracı

Kullanıcı yalnız `.cdsl` getirdiyse (operations.json yok):

```
node ${CLAUDE_SKILL_DIR}/validator/emit-operations.mjs <girdi.cdsl> <çıktı.operations.json>
```

Parse hatalı `.cdsl`'de emit etmez (exit 1) — önce iş tarafını `is-analizi-dsl` ile
düzelttir. (Kanonik üretici is-analizi skill'indedir; buradaki self-contained
kopyadır.) Üretilen sözleşme **v3**'tür (`meta.schemaVersion: 3`) — qa'nın `uses
flows`'u da v3 bekler.

## İnsan-okur rapor aracı (`report-qa.mjs`)

0-error emit'ten (`--merged` → `qa.json`) sonra çalışan gömülü rapor üreteci
(varsayılan otomatik; opt-out kuralı SKILL.md'de):

```
node ${CLAUDE_SKILL_DIR}/validator/report-qa.mjs <qa.json> --reports <dizin> [--title "<Proje>"] [--quiet]
```

- Girdi **merged manifest**'tir (coverage yalnız orada — karar #18); per-file
  `<ad>.qa.json` verilmez.
- **exit:** 0 = üretildi · 1 = girdi hatalı (HİÇBİR rapor yazılmaz — gate) ·
  2 = kullanım hatası.
- **Üretilen** (`reports/qa/…`): `kapsama.html` — playground "Kapsama" sekmesinin
  statik eşdeğeri (op×dal chip'li tablo + flow/process presence + meta).
  `hasErrors: true` taşıyan bir girdi (skill akışının dışından gelen manifest)
  raporda belirgin uyarı bandıyla işaretlenir.
- **Index regen kuralı:** her koşu sonunda `reports/index.md` + `index.html` **diski
  TARAYARAK yeniden üretilir** (idempotent — hangi aile aracı son koşarsa koşsun aynı
  index; business/frontend/qa aynı `reports/` kökünde birleşir, aynı `--title`'ı ver).
  `.puml` girdileri göreli kaynak linki + plantuml.com/plantuml/svg/ görüntüleme
  linkiyle listelenir (render harici sunucuda — hassas içerikte tıklamamak
  kullanıcının tercihi).
- **Bayatlık:** `REPORT-SNAPSHOT.json` aile iki-hash disipliniyle aynı BUILD_INFO'yu
  taşır; rapor bundle'ı da yukarıdaki **aile-eşzamanlı build** kuralına tabidir —
  tüm aile bundle'ları AYNI repo durumundan birlikte tazelenir.
