# Tutarlılık self-check + emit kuralları

## A. Emit ÖNCESİ self-check (doğrulayıcıdan önce kendin tara)

Doğrulayıcı yakalar ama döngü israfıdır — emit'ten önce şunları kendin geç:

1. **Kaynak bildirimi:** her `.qa` `uses tech "…"` (≥1) + `uses flows "…"` ile
   başlıyor mu? (flows'suz üretme — skill politikası, tasarım kararı §8/2.)
2. **Dal-tamlık (strict'in ön-provası):** her op'un §4.1 dal uzayındaki her dal için
   ya bir `covers`/`expect` ya bir `waive` var mı? (translation.md §A tablosuyla
   op-op tara.)
3. **NotAuthorized niteleyicileri:** çok-mekanizmalı op'larda çıplak `NotAuthorized`
   kalmadı mı (karar #21)?
4. **Stub-birleşimi:** her test/senaryo için QA-07 hesabı yapıldı mı — eksik/fazla
   stub yok mu? İç-modül çağrıya stub yazılmadı mı (karar #10)?
5. **Waive hijyeni:** her waive'de anlamlı `because` var mı; waive'li dala ayrıca test
   yazılmadı mı; `until` tarihleri geçmiş değil mi (İQ6)?
6. **Senaryo kuralları:** yalnız `expect Success` adımları bağlı mı (S3); senaryo
   expect'lerinde `callFailure` yok mu (S15); senaryo given-call'larında `as` var mı
   (F8); `advance` varsa `time` pini var mı; `after` yalnız paginated + aynı-op +
   bağlı hedefte mi (S4)?
7. **Başlık/ad hijyeni:** test/senaryo başlıkları dosya içinde tekil mi (S1); persona/
   dataset adları ASCII mi (S11); aynı op'a bir dosyada tek `defaults` mı?
8. **Değer hijyeni:** kimlik-tipli alanlarda string-literal FK yerine persona/seed
   referansı mı (K-C); kök-düzey dataset'te stepPath yok mu; `time` değerleri
   offset'li mi (QA-15)?
9. **Rezerv çakışması:** alan adlarında `and or sum of true false` yok (İ1 — parse
   hatası); tech tarafında `note`/`size` sınıfı çakışma fark edersen tech'i düzelttir
   (İQ4).
10. **Assert yapısallığı:** `result count/contains/absent` yalnız `list of` dönüşlü
    op'ta; `page …` yalnız paginated'de (S4); `emitted` op'un `emits` listesinde;
    `called` hedefi calls ∪ compensator kümesinde (İQ11).

## B. Dosya granülaritesi + workspace-pass TEK-çağrı kuralı

- **Tavsiye:** tech-dosyası-başına bir `.qa` (küçük modelde tek dosya). Coverage
  **workspace-union** olduğundan bölme serbesttir (spec §2 — aynı tech kaynağına
  birden çok `.qa` bağlanabilir; fcdsl union emsali).
- **Union kuralı (KRİTİK):** dal-coverage "workspace'te HERHANGİ bir test/expect/waive
  dalı kapsıyorsa kapalıdır" der — bu ancak TÜM `.qa` dosyaları doğrulayıcıya **tek
  çağrıda** verilirse doğru çalışır. Dosyaları tek tek doğrulama: tek başına verilen
  dosya, öteki dosyanın kapattığı dal için sahte uncovered error'ı (strict'te) üretir.
- `uses tech`/`uses flows` yolları her `.qa`'nın KENDİ konumuna göre çözülür —
  kaynak dosyaların doğru göreli yolda olduğundan emin ol.

## C. Strict-gate'in garantisi

- Emit komutu (doğrulama + koşullu üretim TEK araçta):
  `node ${CLAUDE_SKILL_DIR}/validator/qcdsl.mjs <dosyalar|dizin> --strict --out <dizin> --merged <dizin>/qa.json --json`
- **`--strict` bundle'da VARSAYILANDIR** (kullanıcı kararı §8/3) — kapsanmamış dal
  (`qa.uncovered-branches`) error'a yükselir; skill çağrısı okunabilirlik için yine
  açık `--strict` yazar. Flow/process presence-uyarıları strict'te de **warning**
  kalır (S6 yalnız dal-coverage vaadi) — onlar takip-sorusudur, kapı değil.
- **Gate garantisi:** herhangi bir dosyada severity-1 error varsa
  (strict-yükseltilmişler DAHİL) araç HİÇBİR JSON yazmaz (partial da yok; exit 1).
  "Her dal ya test ya waive → sonra emit" ilkesi prose'a değil ARACA gömülüdür —
  senin görevin error'ları kapatmak, emit kendiliğinden gelir.
- Warning'ler emit'i ENGELLEMEZ — ama her warning ya kullanıcı-onaylı ya düzeltilmiş
  olmalı (SKILL.md doğrulama döngüsü).

## D. Per-file vs merged — ikisinin anlamı

- **`<ad>.qa.json` (per-file, `--out`):** kaynak dosyanın çözülmüş gövdesi — personas,
  datasets, testler (**defaults-ÇÖZÜLMÜŞ**: etkin `actor` + etkin `stubs[]` inline —
  S19; üreteç defaults'ı hiç görmez), senaryolar, waive'ler, türetilmiş
  `expectedOutcome` alanları (S10). **Coverage per-file'da YOKTUR** — tek dosya
  union'ı göremez (correctness-over-completeness).
- **`qa.json` (merged, `--merged`):** workspace birleşimi + **coverage YALNIZ burada**
  (karar #18): op-başına `branches[]` (covered/waived/uncovered + `coveredBy[]`),
  flows/processes presence durumu. "Her dal kapalı" iddiasının makine-okur KANITI
  budur — bu yüzden merged üretimi ertelenemez (frontend'ten bilinçli fark).
- **Determinizm (S13):** branch türetim-sırası sabit (Success → refinement sınır-ihlali
  dalları param kaynak-sırası → validation-guard'lar kaynak-sırası → rule-guard'lar →
  throws → NotAuthorized alt-dalları roles,ownership,permit,scope → anonimler →
  callFailure'lar calls-sırası);
  tests/scenarios kaynak-sırası; yollar repo-köküne göre normalize (basename değil);
  step-indeksi advanceTime satırları DAHİL sayılır; `until` verbatim taşınır (İQ6).
  Aynı girdi → bayt-aynı çıktı; diff'lenebilir.
- Gate sayesinde skill akışında üretilen merged her zaman `meta.hasErrors: false`
  taşır — yine de raporla.

## E. Test-üreteci devir paketi (çift girdi)

- Devir paketi = **tech `manifest.json` + merged `qa.json`** (spec §0 — test-üreteci
  İKİSİNİ birlikte alır) + per-file `<ad>.qa.json`'lar + kaynak `.qa`/`.tcdsl`/
  `operations.json` üçlüsü referans için. Yalnız qa.json'u teslim etme — üreteç
  serving/tip detayını tech manifest'ten okur.
- Test-kod-üreteci ayrı bir turdur (karar #1) — zincir bugün manifest'te biter; bunu
  kullanıcıya açıkça söyle ("çıktı test-üreteci sözleşmesidir, çalışan test kodu
  değil").

## F. Manifest'e GİRMEYENLER

- **Üretim-politikaları (S8):** P1–P15 manifest'e YAZILMAZ — üreteç-normatiftir,
  veri değildir.
- **Defaults (S19):** kavram olarak manifest'te yok; testler çözülmüş emit edilir
  (tek-doğruluk-kaynağı).
- **Beklenen-outcome yazar-beyanı:** yok — `expectedOutcome` türetilmiş alandır (S10),
  `covers` ile çelişemez.
- **Serbest metin** yalnız `reason` (waive gerekçesi) ve başlıklarda; tüm değerler
  ayrımlıdır: `literal` / `personaRef` / `seedRef` / `stepPath`.

## G. Emit sonrası

- Kullanıcıya özeti ver: op sayısı, dal sayısı (covered/waived dağılımı — merged
  coverage'dan), senaryo sayısı + kapsanan flow/process'ler, belgeli-açık presence
  boşlukları, waive listesi (gerekçeleriyle).
- Dosyaları kullanıcının çalışma dizinine yaz (skill dizinine DEĞİL).
- İsteğe bağlı tek satır: CommandDSL reposu olan kullanıcı kapsama matrisini
  playground'da görsel inceleyebilir (`qa.html`) — bağımlılık değil, işaret.
