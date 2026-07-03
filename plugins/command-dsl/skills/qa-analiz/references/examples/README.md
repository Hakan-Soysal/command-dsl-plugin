# Örnekler — kanonik üçlü + gömülü araçla üretilmiş manifest'ler

| Dosya | Ne |
|---|---|
| `proposals.qa` | Kanonik QA exemplar'ı (spec §7) — dal-coverage **TAM**: 13 dalın tamamı ya test/senaryo-adımı ya gerekçeli waive |
| `proposals.tcdsl` | Tech kapanışı — `.qa`'nın `uses tech "./proposals.tcdsl"` göreli yoluyla bağladığı gerçek-gramerli tech exemplar'ı |
| `proposals.operations.json` | Business kapanışı (**v3**) — `uses flows "./proposals.operations.json"` ile bağlı; 3 op + `ProposalFlow` + 2 actor |
| `proposals.qa.json` | Per-file manifest — **gömülü `qcdsl.mjs`'in kendisiyle** üretildi (el yazması değil) |
| `qa.json` | Merged workspace manifest — aynı koşuda `--merged qa.json` ile üretildi; **coverage yalnız burada** |

Üçlü, repo kanonik örneğinden tohumlandı: `CommandDSL/examples/qa/` @ commit `ddaa1b8`
(qcdsl tooling turu). `.qa` içindeki `uses` yolları göreli (`./proposals.tcdsl`,
`./proposals.operations.json`) olduğundan kopya bu dizinde **aynen** çalışır.

## Doğrulama kanıtı (gömülü araçla — build: grammar `c7bab5da7065`, src `b0333be6e3b3`)

Bu dizinin İÇİNDEN (cwd = bu dizin; `meta.source` yolları temiz kalsın):

```
node ../../validator/qcdsl.mjs proposals.qa --out . --merged qa.json
```

Beklenen (strict VARSAYILAN, exit **0**):

```
◦ proposals.qa — 0 hata, 0 uyarı, 0 bilgi
◦ proposals.tcdsl (kapanış) — 0 hata, 4 uyarı, 3 bilgi
→ proposals.qa.json
→ qa.json (birleşik: 4 op · dal 10 covered / 3 waived / 0 uncovered)
ÖZET: 1 dosya · 0 hata · 4 uyarı · 3 bilgi · strict
```

`.qa` dosyasının kendisi **0/0/0**; tüm uyarı/bilgi kapanıştaki `proposals.tcdsl`'den
gelir ve **bilinçli/didaktiktir** — tech exemplar'ı bu tanıları göstermek için böyle
yazılmıştır. Error olmadığından strict gate emit'e izin verir (gate error'da JSON
yazmaz, exit 1).

### Belgeli uyarı/bilgi envanteri (satır satır — NEDEN kabul edilebilir?)

- `BİLGİ tcdsl:15:27` ×3 — `'SubmitProposal': '<guard>' guard'ı için karşılaştırılabilir
  business AST yok` (`title-required`, `amount-positive`, `proposal-limit`).
  → operations.json'daki `SubmitProposal.guards` boş: guard'lar tech tarafının
  eklemesi. Bilgi bir işaretçidir, kusur değil — business tarafı guard yazmadıysa
  crosscheck sadece "karşılaştıracak bir şey yok" der. Gerçek bir koşuda skill bunu
  "guard'lar iş kuralı mı, teknik ekleme mi?" takip sorusuna çevirir.
- `UYARI tcdsl:28:15` — `ApproveProposal` için görünürlük belirsiz (@rest/@internal/on yok).
  → Didaktik: görünürlük-uyarısının canlı örneği. Gerçek koşuda "bu op dışarı mı
  açılıyor, iç mi?" sorusuna dönüşür; exemplar'da bilinçli açık bırakıldı.
- `UYARI tcdsl:33:15` — `GetProposal` için aynı görünürlük uyarısı. → Aynı gerekçe.
- `UYARI tcdsl:33:15` — `Rol 'Yonetici' (→ {Admin}) op'un yetkili kümesi {Customer}
  dışında — güvenlik-zayıflatma`. → Business imzasında aktör `Customer (own)`; tech
  `Yonetici` rolünü genişletmiş. Güvenlik-genişletme tanısının canlı örneği; gerçek
  koşuda kullanıcıya onaylatılır, exemplar'da tanıyı göstermek için bilinçli.
- `UYARI tcdsl:40:12` — `OnProposalSubmitted`: same-module abonelik (ADR-0027 K4;
  intra-module zaten sync, doğrudan çağır). → Event-consumer test desenini (aşağıda)
  gösterebilmek için abonelik aynı modülde tutuldu; tanı mimari tavsiyedir, hata değil.

## Üretilen manifest'ler (dal sayımları)

`qa.json` (merged) coverage envanteri — **13 dal = 10 covered + 3 waived + 0 uncovered**:

| Op | Dal | Durum |
|---|---|---|
| `Proposals.SubmitProposal` | Success · guard `title-required` · guard `amount-positive` · rule-guard `proposal-limit` · error `DuplicateProposal` · callFailure `Payments.ReserveFee` | 6 covered |
| `Proposals.SubmitProposal` | NotAuthorized (roles) | waived (until 2026-12-31) |
| `Proposals.ApproveProposal` | Success (senaryo adımı 2) | covered |
| `Proposals.ApproveProposal` | NotAuthorized (roles) | waived (until 2026-12-31) |
| `Proposals.GetProposal` | Success (senaryo adımı 3) · NotAuthorized (**ownership**, test) | 2 covered |
| `Proposals.GetProposal` | NotAuthorized (roles) | waived (until 2026-12-31) |
| `Proposals.OnProposalSubmitted` | Success (event-consumer testi) | covered |

Per-file `proposals.qa.json`'da coverage YOK (uses/personas/datasets/tests/scenarios/
waives var) — coverage yalnız merged'de hesaplanır; `meta.source: "proposals.qa"`
(göreli, temiz).

## Ne öğretir (exemplar'da işaretli kararlar)

- **Dal-coverage TAM deseni**: her dal ya test, ya senaryo-adımı (`expect Success`
  step'leri Success dalını sayar), ya `because`'lu waive — `0 uncovered` hedefi.
- **Success + 3 guard + named error**: `covers Success` / `covers guard "…"` /
  `covers error DuplicateProposal` biçimleri; guard testlerinde `then` opsiyonel
  (S10 türetim).
- **NotAuthorized niteleyicisi (karar #21)**: `GetProposal` roles+ownership = İKİ
  mekanizma → `covers NotAuthorized ownership` niteleyicisi ZORUNLU; tek-mekanizmalı
  op'larda niteleyicisiz yazılabilir.
- **callFailure + compensate**: `given { stub Payments.ReserveFee fails }` →
  `compensated Payments.ReleaseFee` + `not emitted` + `state … absent` üçlü doğrulama.
- **Event-consumer testi**: `when event Proposals.ProposalSubmitted with {…}` +
  `state AuditLine count 1`; `persona zamanlayici: role Scheduler` (rolemap `~ ->`).
- **Step-binding'li senaryo**: `step s1 = SubmitProposal …` → sonraki adımlar
  `s1.result.id`; `advance time 2 days` + adım-arası `as` değişimi; senaryo
  `realizes flow ProposalFlow` ile business akışına çıpalı.
- **3 gerekçeli waive**: `until` + `because` zorunlu — gerekçesiz "geç" yok; roles
  yolu P1 jenerik-kimlik kapsamına devredilmiş, `GetProposal`'da yalnız roles
  waive'lenip ownership testle kapatılmış (niteleyicili waive).
- **defaults + dataset + override**: `defaults for SubmitProposal { as … stub … }` +
  `with gecerliTeklif { title: "" }` satır-içi override deseni.

## Yeniden üretme

```
cd <bu dizin>
node ../../validator/qcdsl.mjs proposals.qa --out . --merged qa.json
```
