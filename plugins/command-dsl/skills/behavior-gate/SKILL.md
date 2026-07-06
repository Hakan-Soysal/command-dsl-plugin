---
name: behavior-gate
description: >-
  **DENEYSEL · ADVISORY · ORCHESTRATION-WIRED (discovery + runtime-input adımları Claude tarafından
  orkestre edilir; runtime secret'lar ve nihai kapsama YARGISI insan-in-loop — tam-otomatik "turnkey"
  DEĞİL).** 2. grup (vibecoder) için tier-1
  **davranışsal kapı**: Teknik Analiz `manifest.json`'undaki yapısal yükümlülükleri — payload-guard
  (validation/rule), authz (roles) ve entity-invariant — ÇALIŞAN keyfî app'e karşı KARA-KUTU sürerek
  ihlalleri yüzeye çıkarır. Kod ÜRETMEZ. Üç sonuç: **realized / proven-fail / DARK**; birincil eksen
  KAPSAMA, düşük kapsamada ASLA all-clear. *Sound-on-failure, incomplete-on-pass* — "tutarlı" sertifikası
  ASLA vermez. **Mekanize probe'lar: payload-guard · authz(roles) · scope · entity-invariant ·
  no-duplicate/existence(replay).** Sound kapsama tavanı **~18/22** (scope dahil) + existence guard'ları
  adapter-case ile koşullu +0..2 → 18–20/22 (projeksiyon, §12.M corpus'unda yeniden-ölçülmedi); abac ·
  compound · cross-entity · temporal · keyfi-fonksiyon-call-node DOĞRU şekilde DARK (name-heuristic UNSOUND).
  **Akış Claude tarafından orkestre edilir (§Akış):** discovery agent'ı izole spawn edilir,
  runtime-input boşlukları kullanıcıya form olarak sorulur; yalnız runtime secret değerleri ve nihai
  kapsama yargısı insana kalır. Şu durumda kullan: kullanıcı AÇIKÇA "behavior-gate / davranışsal
  kapı ile grup-2 vibecode çıktısını manifest'e karşı denetle" dediğinde ve bir `manifest.json` + çalıştırılabilir
  app mevcutken. Belirsiz/genel "doğrula/test et" istekleri için TETİKLEME. Teknik tasarımı üretmek için
  `teknik-analiz`'i kullan; bu skill onun `manifest.json` çıktısından + bir adaptörden başlar.
---

# behavior-gate — tier-1 davranışsal kapı (deneysel)

Vibecoder'ın ürettiği kodu, Teknik Analiz'in `manifest.json`'undaki yapısal yükümlülüklere karşı
**çalışan app'i sürerek** denetler. Sen kod yazmaz/üretmezsin — spec'ten test türetir, app'i tahrik
eder, ihlalleri **kanıtlar**, doğrulanamayanı **karanlık** işaretlersin.

## Neyi neden böyle yapıyoruz (özü kavra)

- **Nihai oracle = spec.** Determinizmin tek garantili kökü `manifest.json`'daki yapılı predicate'ler
  (validation/rule `ast`, entity `invariant` `ast`, op `roles`). Test girdileri YALNIZ spec'ten türer
  (oracle duvarı); "doğru cevap" ASLA implementasyondan okunmaz.
- **Kara-kutu, sound-on-failure.** Keyfî kodda yapısal/isim-eşleme kırılgandır; güvenilir olan tek şey
  **gözlemlenen davranış**: bir ihlal görülürse KANITTIR (proven-fail); görülmezse yalnız "test-edilen
  girdide bulunamadı" (incomplete). **"Failing-test yokluğu ≠ doğruluk."**
- **Üç sonuç, kapsama birincil.** `realized / proven-fail / DARK`. **DARK ≠ pass VE DARK ≠ fail.**
  Rapor önce NE TAHRİK EDİLEBİLDİĞİNİ söyler; düşük kapsamada asla all-clear.
- **⭐ DOER ≠ CHECKER.** Bu kapı, kodu YAZAN oturumdan BAĞIMSIZ çalışır (taze-bağlam). Adaptörü
  keşfeden agent de ayrı+bağımsızdır; ürettiği her iddia koşan app'e karşı pozitif+negatif kontrolle
  doğrulanır (adaptör = iddia, asla güvenilmez).

## Kapsanan yükümlülükler (mekanize) + karanlık kalan

| Yükümlülük | Kaynak (manifest) | Probe | Durum |
|---|---|---|---|
| payload-guard | `op.validation/rule` (cmp, tek-alan sayısal) | izole-violating → reject? | ✅ |
| authz | `op.roles[]` | authorized→accept ∧ under-priv→403 | ✅ |
| scope | `op.scopes[]` | with-scope→accept ∧ without-scope→403 | ✅ (T5; adapter `scopeAxis` scoped-cred gerektirir) |
| entity-invariant | `entity.invariants[]` (agg sum/count = cmp) | drive→read-state→check | ✅ |
| no-duplicate / existence | `op.idempotent.keys` VEYA prose-call existence guard | replay: first → aynı-key → accept? | ✅ (T5; **adapter-sağlanan** `replayCases[label]`; gate `name`-SINIFLANDIRMAZ, discovery+insan yargısı) |
| compound / abac / cross-entity / temporal / stateful-rule / **keyfi-fonksiyon call-node** (`ibanValid(x)` vb.) | — | — | ❌ → DARK (tier-2/insan; call-node `name` serbest identifier → name-heuristic UNSOUND, doğru-DARK) |

> **Turnkey-entegrasyon (T5+T6 + follow-on): BAĞLANDI + uçtan-uca kanıtlandı.** Taze discovery `scopeAxis` + `replayCases` + `satisfyHeaders`'ı GERÇEKTEN üretir (spec+evidence'tan; oracle-wall); `turnkey-scope-replay-demo/` — scope+idempotent'li farklı-domain app → discovery→resolve→gate zinciri **5/5 (scope realized + replay proven-fail seed'li no-duplicate bug'ında)**, elle-adapter YOK. İki soundness fix bu koşumda kanıtlandı: (a) **silent-drop kapatıldı** — manifest `idempotent.keys` var ama adapter case yoksa artık DARK (paydadan düşmez); (b) **stacked-guard izolasyonu** — `oa.satisfyHeaders` (op'un DİĞER header-guard'larını tatmin eden set; hedef eksen spread'le kazanır) sayesinde role+scope+payload stack'li op'ta her eksen izole prob edilir (öncesi: hepsi sahte-DARK). app.fetch driver-mode (opt-in `adapter.boot.driver`) da eklendi: spawn'suz in-process + fresh-instance izolasyon.
>
> **⚠️ OR/bypass caveat (satisfyHeaders):** app "yetkili-rol her guard'ı bypass'lar" (OR) semantiğindeyse, negatif-kontrol yanlış-atfı `realized`'ı şişirebilir; pozitif kontrol bunu yalnız AND semantiğinde tam doğrular. Bilinen sınıf (`satisfyBody`'de de var), yeni vektör değil.

## Altın kurallar (her oturumda)

- **DENEYSEL + ADVISORY varsayılan.** Ailenin keyfî-kod/keyfî-runtime çalıştıran İLK skill'i. Asla
  "tutarlı sertifikalı" deme — yalnız "test-edilen girdide ihlal bulunamadı (kapsama X)".
- **Adaptör = iddia.** Her invocation/auth/state-read eşlemesi koşan app'e karşı KONTROLLE doğrulanır;
  geçmezse DARK. Provenance: `auto-discovered | control-validated | user-provided | absent`.
- **Oracle duvarı.** Keşif "NASIL invoke edilir"i okur, "DOĞRU cevap ne"yi ASLA.
- **Sessiz sahte-güvence YOK.** Bir guard tahrik edilemezse yeşil verme — DARK + gerekçe.

## Akış (Claude bunu YÜRÜTÜR — turnkey orchestration)

Girdi: bir `manifest.json` (tech) + çalıştırılabilir vibecoded app dizini. Claude sırayla:

### Step 1 — Discovery (BAĞIMSIZ taze-bağlam agent spawn et)
- `Agent` tool ile bir `general-purpose` agent spawn et. Prompt = `discovery.md` kontratının TAMAMI +
  YALNIZ `{repo path, manifest path}` (başka hiçbir girdi yok).
- ⭐ İZOLASYON (DOER ≠ CHECKER): discovery'ye kodun NASIL yazıldığına dair OTURUM-BAĞLAMI VERME — yalnız
  iki path. behavior-gate'i tetikleyen oturum = doer; discovery bağımsız kalmalı (yoksa adapter
  bağımsız-iddia olmaktan çıkar, dairesellik doğar).
- Verdiğin tam prompt'u kaydet (audit) ve içinde kod-yazım sızıntısı olmadığını doğrula (leak-audit):
  girdi kümesi daima `{repo, manifest}`-only.
- Çıktı: `adapter.json` (base invocation surface — endpoint/authHeader/boot/errorField/stateRead,
  her alan `evidence: dosya:satır` + provenance) + `gaps.json` (`requiredRuntimeInputs[]`) + `unmappable[]`.
  Bu bir İDDİA — güvenme.

### Step 2 — Runtime-input (form → cevap → merge)
- `gaps.json`'ı kullanıcıya BATCHED FORM olarak sun: her boşluk için `why` + `evidence` + `proposable`
  (varsa güvenli test-değeri) + `skipConsequence`. `proposable = null` → must-ASK; değilse öneri + onay.
- Cevapları `answers.json`'a topla (skip = `null`). Sonra çalıştır:
  `node resolve.mjs --base=adapter.json --gaps=gaps.json --answers=answers.json --out=resolved-adapter.json`.
- Graceful degradation: skip → absent → o obligation DARK (ASLA sessiz pass). Provenance:
  `user-provided | auto-proposed | absent`.

### Step 3 — Gate (sür + kapsama raporu)
- Çalıştır: `node gate.mjs --spec=<manifest.json> --adapter=resolved-adapter.json <app-dir>`.
- ⭐ Adapter = İDDİA; gate her eşlemeyi pozitif + negatif kontrolle DOĞRULAR (yanlış eşleme → DARK,
  false-green DEĞİL). "Akışta artık olması" adapter'ı GÜVENİLİR yapmaz; gate PORT gibi iç-sözleşmelerine
  defansif sahip çıkar (discovery bunları bilmez — §6.2 dersi).
- Çıktı: kapsama raporu (`realized / proven-fail / DARK`). Nihai KAPSAMA YARGISI insana kalır
  (dark ≠ pass, düşük kapsamada asla all-clear).

**Parçalar:** `discovery.md` (Step-1 kontratı) · `resolve.mjs` (Step-2 merge) · `gate.mjs`
(Step-3 runner, DEĞİŞMEZ).

## Durum (DÜRÜST)

- **Discovery + runtime-input SKILL akışına GÖMÜLÜ** (Claude orkestre eder): discovery izole-spawn +
  gaps → form → `resolve.mjs` → `gate.mjs` (bkz. §Akış). Operatör-agent demonstration (yalnız SKILL.md +
  app → verdict) + 1 canlı insan denemesiyle valide. Kanıt harness'ları: `grup2-poc/e2e/` (discovery→adapter→gate
  3/3 realized, invocation-surface auto-üretildi) + `grup2-poc/runtime-input/` (form + merge + graceful-degradation:
  skip → absent → DARK, asla false-green). Discovery viability ayrıca gerçek Hono/CF-Workers app'te
  (`.tmp-e2e-run`) doğrulandı.
- **Kalan insan-in-loop:** runtime secret DEĞERLERİ (auth-cred, boot-secret) + nihai kapsama YARGISI —
  bu ikisi bilinçli olarak insana bırakılır (label ≤ executability); Claude form'u sunar, insan cevaplar.
- Tek-stack/tek-app ölçeğinde valide (Node HTTP + Hono in-process). Heterojen ölçek/ucuz-model sınanmadı.
- Frontend davranışı bu skill'de DEĞİL — o ayrı `experience-gate` (tier-2, `.experience.json`).

## Kullanım

```
node gate.mjs <app-dir>                              # default spec/manifest.json + adapter.json'ı okur
node gate.mjs --spec=<manifest.json> --adapter=<adapter.json> <app-dir>   # path-arg (turnkey akışta kullanılan)
node gate.mjs --selftest                             # saf-fonksiyon deriver/evaluator/classify testleri
```

`spec/manifest.json` + `adapter.json` = girdi sözleşmesi; `evals/app-correct` (3/3 realized) +
`evals/app-faulted-authz` (karma: authz proven-fail, diğerleri realized) = kapı davranışının kanıtı.
Adapter alanları (probe-başına): `operations[op].{endpoint,authHeader,principals,satisfyBody,satisfyHeaders,
field,seed,scopeAxis,replayCases}` · `entities[ent].{stateRead,driveOp,trajectory}` · `boot.{cmd,arg,env,port,driver}`
(`driver: 'http-spawn'`(default) | `'app-fetch'`).

## Kaynak / tasarım

Tam tasarım + kanıtlar: `DSL Business Analyses/GRUP2-VIBECODE-TASARIM.md` (§5 tier ayrımı · §6 adaptör
sözleşmesi · §11 pattern'ler · §12 gerçek-manifest bağlama + valide increment'ler). PoC harness'ları:
`DSL Business Analyses/grup2-poc/` (tier1-manifest · state-oracle · auth-matrix · behavior-gate).
