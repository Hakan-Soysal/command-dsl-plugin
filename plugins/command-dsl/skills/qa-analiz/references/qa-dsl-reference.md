# QA DSL referansı — sözdizimi + anlam (backend perspektifi)

> Kaynak: `CommandDSL/qa-dsl.langium` + tasarım spec'i v0.4 (karar #1-#25, S1-S20,
> İQ1-İQ12). Uzantı `.qa`; yorum `//`. İfade dili = shared Expr (tech ile AYNI AST;
> karşılaştırma **tek `=`**, `!=` var, `==` YOK; `not` Expr'e ait DEĞİLDİR — yalnız
> assert-yüzeyi keyword'ü: `not emitted` / `not called`). Bu dosya yazım-anı
> başvurusudur; sorgulama soruları `interrogation-playbook.md`'de, tech→dal eşlemesi
> `tech-to-qa-translation.md`'de.

## 1. Kök + uses ikilisi (§2, karar #2/#20)

```
qa "Proposals — backend testleri"                     // başlık opsiyonel

uses tech "./proposals.tcdsl"                         // 1..n — ZORUNLU (dal uzayının kaynağı)
uses flows "./proposals.operations.json"              // 0..1 DSL'de; SKILL-politikası: HER ZAMAN yaz
```

- `uses tech`: operation evreni = bağlanan tech dosyaları + import-kapanışındaki tüm
  `module` Operation'ları (`@internal` ve pureTech-rollüler DAHİL; `external`/`uncharted`
  BoundaryOp'lar HARİÇ — onlar stub hedefidir). Cross-file Langium linki (karar #2).
- `uses flows`: operations.json v3'ten **flow-id + process-id evreni** (op-üyelik
  listelerindeki `flows[]`/`processes[]` union'ı — karar #20). Bağlıysa senaryolar
  `realizes flow/process X` yazabilir ve presence-coverage açılır; bağlı değilse
  `realizes` error'dur. Tech'in kendi `contract`'ı farklı dosyaya işaret ediyorsa
  **info** (S12).
- Operation referansları: evrende tekilse çıplak ad (`SubmitProposal`), değilse
  nitelikli (`Proposals.SubmitProposal`); belirsizlik → error.
- Aynı tech kaynağına birden çok `.qa` bağlanabilir; coverage **workspace-union**.

## 2. Persona (§3.1, karar #15)

```
persona musteri: Customer            // tech rolemap'teki actor'a bağlanır
persona baskaMusteri: Customer       // ownership testleri için ikinci kimlik
persona zamanlayici: role Scheduler  // YALNIZ pureTech (~ ->) mapped roller için
```

- Karşılıksız actor → error. `role` bağı yalnız rolemap'te `~ ->` işaretli roller
  için; actor-mapped role'e `role` bağı → error ("actor üzerinden gidin").
- Persona-adı dosyada tekil; scope dosya-yereldir (İQ5 — qa dokümanları sembol export
  etmez). Adlar ASCII (S11).

## 3. Dataset (§3.2, karar #17 — v1 flat)

```
dataset gecerliTeklif for SubmitProposal {
  title: "Yeni teklif"
  amount: 100
}
```

- `for <Operation>`: alanlar op **param listesine** karşı tip-doğrulanır — bilinmeyen
  alan / eksik zorunlu alan / tip uyumsuzluğu → error.
- **Degrade kuralı (S18):** alanın tipi yapısal çözülemiyorsa (opak TypeRef) o alan
  için değer-doğrulaması YAPILMAZ ve iddia edilmez ("doğrulanamayanı doğruladım"
  deme). Aynı kural stub-`returns`, seed ve payload'da geçerli.
- **Literal-TİP denetimi v1'de enum'la sınırlıdır (denetim-F3):** enum-üyeliği +
  enum-alanına string-dışı literal → error; opak primitiflere (Text/Money/Id)
  literal-tip iddiası YOK.
- Değer türleri: literal (STRING / NUMBER — negatif işaretli olabilir, F6 / true /
  false) · **persona referansı** (kimlik-tipli alan; üreteç kimliğe çözer) ·
  **seed-binding referansı**. Step-binding path'i (`s1.result.id`) YALNIZ senaryo-içi
  inline kullanımda geçerlidir — kök-düzey dataset'te yazılamaz.
- Kompozisyon YOK (`extends` v1-dışı); kullanım yerinde **inline override**:
  `with gecerliTeklif { title: "" }`.
- `list of` tipli param zorunlu-eksik denetiminden MUAFTIR (İQ2 — liste literal'i
  yok; üreteç politikası doldurur).

## 4. Defaults (§3.6, karar #25)

```
defaults for SubmitProposal {
  as musteri
  stub Payments.ReserveFee returns { reservationId: "res-1" }
}
```

- Kök-düzey, op-başına opsiyonel; içerik: `as` ve/veya `stub` satırları. O op'u koşan
  **her test ve senaryo-adımı** için varsayılan; test/senaryo kendi `as` /
  `given stub`'ıyla override eder. Aynı op'a bir dosyada ikinci defaults → error.
- **Manifest'te defaults kavramı YOKTUR (S19):** testler ÇÖZÜLMÜŞ (etkin `actor` +
  etkin `stubs[]` inline) emit edilir. Stub-çözüm önceliği (İQ3): given-stub >
  yürütülen op'ların defaults'ları (yürütülme-beyan sırası; ilk sağlayan kazanır).

## 5. Test (§3.3)

```
test "boş başlık reddedilir" of SubmitProposal covers guard "title-required" {
  as musteri
  when call with gecerliTeklif { title: "" }
}
```

- Başlık STRING'i **dosya içinde tekildir** (S1 — manifest anahtarı `dosya + başlık`).
- `covers <dal>`: testin kapsadığı **TEK** dal (S2). Biçimlerin TAM listesi:
  - `covers Success`
  - `covers guard "id"` (validation VEYA rule guard'ı — ayrım tech'ten türetilir)
  - `covers error <ErrorDecl>` (taksonomi-pinli named error)
  - `covers NotAuthorized [roles|ownership|permit|scope]` — **karar #21:**
    çok-mekanizmalı op'ta niteleyici ZORUNLU (yoksa error "mekanizma belirtin");
    tek-mekanizmalıda çıplak biçim yeterli (emit'te etkin mekanizmaya çözülür — İQ8)
  - `covers NotValid` (anonim dal — id'siz validation check'lerinin katlaması, S5)
  - `covers NotProcessable` (anonim dal — id'siz rule check'leri, S5)
  - `covers callFailure <External.Op>` (compensate'li stub'lanabilir calls)
- **Beklenen outcome AYRICA YAZILMAZ — covers'tan türetilir (S10, §7 tablosu).**
- `as <persona>`: çağıran kimlik (zorunlu; `defaults`'tan gelebilir).
- Gövde = `given?` + `when` + `then?`.

## 6. given — arrange (§5.1, karar #5/#10/#13/#22)

```
given {
  time "2026-07-02T10:00:00Z"
  seed p1 = Proposal { title: "t1", status: "Draft", owner: yonetici }
  seed 10 Proposal { status: "Active", owner: musteri }
  call ApproveProposal as yonetici with { id: p1 }
  stub Payments.Charge returns { receiptId: "r1" }
  stub Notifications.Send fails
}
```

- **Yürütme sırası (P14):** beyan sırasıyla — `time`/`stub` konum-bağımsız etkindir;
  `seed`/`call` sıra-korumalıdır.
- `time STRING`: saat pini — **saat-dilimi offset'i ZORUNLU** (öneri `Z`; offset'siz
  ISO → error — QA-15); biçim + DEĞER sanity denetlenir (`T99:99` sınıfı → error, F7).
  Zamana duyarlı guard'lı op'larda şiddetle önerilir (P4).
- `seed [<bindId> =] [<N>] <Entity> { alan: değer … }` (karar #22, K-C):
  - Doğrudan durum beyanı; alanlar Entity field'larına tip-doğrulanır (S18 degrade).
    İş kurallarını **bilerek** bypass eder (gerçekleme P5).
  - Çokluk `<N>`: N ≥ 1 (0 → error); çokluk-seed'i bind EDİLEMEZ (hangi kayıt? →
    error); kimlikler üreteçte deterministik (P11).
  - Binding: sonraki seed/call/when değerlerinde **seedRef** olarak kullanılır
    (kimlik-tipli alana çözülür); dangling seedRef → error. FK zincirini string-literal'e
    emanet etme.
- `call <Op> [as <persona>] with <girdi>`: API-driven kurulum; Success beklenir —
  dönmezse test **infra-fail** raporlanır (assert-fail değil — S7). Testte `as`
  yoksa testin etkin aktörü; **SENARYO given-call'ında `as` ZORUNLUDUR** (F8 —
  senaryonun given-anında etkin aktör yoktur).
- `stub <Ext.Op> returns { … } | fails`: **birleşim kuralı (QA-07)** — testin/senaryonun
  yürüttüğü TÜM op'ların (when-op + step-op'ları + given-call op'ları) doğrudan `calls`
  ettiği **stub'lanabilir hedeflerin** (external VE uncharted BoundaryOp) birleşimi
  için stub zorunlu (defaults'tan gelebilir); eksik → error; birleşim-dışı hedefe stub
  → error. `returns` gövdesi BoundaryOp dönüş tipine tip-doğrulanır (S18). İç-modül
  calls gerçek koşar, stub'lanamaz (karar #10). Hesap yöntemi:
  `tech-to-qa-translation.md` §D.
- Senaryoda `given` senaryo-başında bir kezdir; step-arası stub değişimi v1-dışı.

## 7. when — act (§5.2) ve S10 türetim tablosu (§5.3)

```
when call with gecerliTeklif { title: "" }                        // dataset + inline override
when call with { title: "X", amount: 5 }                          // tam inline
when event Proposals.ProposalSubmitted with { proposalId: "p1" }  // consumer op'lar
```

> Parçacıklar sözdizimi vitrinidir (spec §5.2'den) — gerçek kullanımda payload,
> hedef event'in/op'un TÜM zorunlu alanlarını taşımalıdır (eksik alan → error).

- `call`: hedef testin `of` op'udur; girdi param'lara tip-doğrulanır. `@internal` /
  serving'siz op'lar da çağrılabilir (in-process gerçekleme — P15).
- `event`: yalnız `on` clause'lu op'larda (karar #11); event op'un `on`
  aboneliklerinden biri değilse → error; payload event field'larına tip-doğrulanır.

**Beklenen outcome türetimi (S10 — normatif tablo, spec §5.3 BİREBİR):**

| covers / expect | türetilmiş beklenen outcome |
|---|---|
| `Success` | Success |
| `guard "x"` (tech'te validation-check) | NotValid, guard "x" |
| `guard "x"` (tech'te rule-check) | NotProcessable, guard "x" |
| `NotValid` (anonim) | NotValid (guard'sız) |
| `NotProcessable` (anonim) | NotProcessable (guard'sız) |
| `error E` | E (taksonomi sınıfı = E'nin pini) |
| `NotAuthorized [mech]` | NotAuthorized |
| `callFailure T` | ServerError (P8 — external-failure sınıfı ServerError'dur) |

validation/rule ayrımı guard-id'nin tech'te hangi clause'da olduğundan türetilir
(S17 tekillik önkoşulu bunu belirsizliksiz kılar). Manifest'e türetilmiş
`expectedOutcome` yazılır — yazar-beyanı değildir, `covers` ile çelişemez.

## 8. then — ek assert'ler (§5.3, karar #4/#22)

`then` bloğu **opsiyoneldir**, outcome İÇERMEZ; yalnız EK kanıt:

```
then {
  result.title = "Yeni teklif"
  result count 3
  result contains { status = "Active" }
  state Proposal exists { title = "Yeni teklif", status = "Draft" }
  state AuditLine count 1
  emitted ProposalSubmitted with { title = "Yeni teklif" }
  not emitted ProposalRejected
  called Payments.ReserveFee with { amount = 100 }
  compensated Payments.ReleaseFee
  page count 3
  page more
}
```

> Bu blok sözdizimi VİTRİNİDİR (spec §5.3'ten) — tüm assert türlerini tek yerde
> gösterir; TEK op üzerinde birlikte geçerli DEĞİLDİR (`result count`/`contains`
> yalnız `list of` dönüşte, `page` yalnız `paginated` query'de).

| Assert | Anlam | Yapısal doğrulama |
|---|---|---|
| `result.<path> <cmp> <expr>` | dönüş payload alanı | path, op `returns` tipinin field'larına karşı (S18 degrade) |
| `result count <NUMBER>` | dönen listenin öğe sayısı | yalnız `list of` dönüşlü op'ta (karar #22) |
| `result contains { koşullar }` / `result absent { koşullar }` | listede koşullu öğe var/yok (sırasız eşleme) | eleman-tipi field'larına karşı; yalnız `list of` dönüşte |
| `state <Entity> exists { koşullar }` | koşulları sağlayan en az bir kayıt var | Entity op'un `access`'inde değilse warning (S9) |
| `state <Entity> absent { koşullar }` | koşulları sağlayan kayıt yok | aynı |
| `state <Entity> count <NUMBER> [{ koşullar }]` | kayıt sayısı | aynı |
| `emitted <Event> [with { alan = değer … }]` | event yayınlandı (yayın-niyeti — P9) | Event, op'un `emits` listesinde olmalı (error) |
| `not emitted <Event>` | event yayınlanMAdı | aynı |
| `called <Ext.Op> [with { … }]` / `not called <Ext.Op>` | outbound çağrı [bu argümanlarla] yapıldı/yapılmadı | hedef, op'un `calls` hedefleri ∪ compensator'ları içinde olmalı (İQ11 — happy-path'te `not called <compensator>` meşru); gözlem P10 |
| `compensated <Ext.Op>` | telafi çağrısı koştu | hedef, op'un `calls … compensate with` compensator'ı olmalı |
| `page count <NUMBER>` / `page more` / `page end` | dönen sayfa: öğe sayısı / devamı var / son sayfa | yalnız `paginated` query'de (S4) |

- Assert LHS = path, RHS = shared Expr (İQ1 — `result count` gibi keyword-önekli
  assert'lerle çakışmasın diye).
- Senaryo step-bloğu aynı yüzeyi kullanır; step-assert'lerde önceki **bağlanmış**
  step'lerin `sN.result.<path>`'i çözülür (QA-12).

## 9. Scenario (§3.4, karar #3/#12/#13/#14/#23)

```
scenario "teklif yaşam döngüsü" realizes flow ProposalFlow {
  time "2026-07-02T09:00:00Z"
  as musteri
  step s1 = SubmitProposal with gecerliTeklif expect Success
  advance time 2 days
  as yonetici
  step ApproveProposal with { id: s1.result.id } expect Success
  as musteri
  step GetProposal with { id: s1.result.id } expect Success {
    result.status = "Approved"
  }
}
```

- `realizes flow <id>` / `realizes process <id>`: uses-flows bağlıysa yazılabilir;
  presence-coverage'a sayılır (#23/#24). Çok-aktör orkestrasyon → `realizes process`.
- `as <persona>` satırı **akış boyunca etkin aktörü değiştirir**.
- `step [<id> =] <Op> with <girdi> [after <stepId>] expect <dal> [{ assert'ler }]`:
  - Binding: **yalnız `expect Success` step'leri bağlanabilir (S3)**; sonraki
    step'lerin girdi VE assert'lerinde `<id>.result.<path>` çözülür (QA-12).
  - `expect` biçimleri `covers` ile aynı, **`callFailure` HARİÇ (S15)** — stub'lar
    senaryo-başı sabittir; callFailure ancak op-testte tetiklenir.
  - `after <stepId>`: yalnız `paginated` query'lerde (S4); hedef **aynı operation'ı
    çağıran, bağlanmış** bir step olmalı (önceki sayfanın devam imlecinden sonraki
    sayfa — karar #16).
- `advance time <N> minutes|hours|days`: pinli saati ilerletir (karar #13); `time`
  pini olmayan senaryoda `advance` → error.
- Senaryo `expect`'leri coverage'a SAYILIR (karar #12).
- **Fail-fast (P7, karar #14):** ilk beklenmeyen outcome'da VEYA ilk step-assert
  başarısızlığında senaryo durur; kalan step'ler "skipped".

## 10. Waive (§3.5, karar #7)

```
waive SubmitProposal covers NotAuthorized
  until "2026-12-31"
  because "tek-rollü op; yanlış-rol yolu P1 jenerik-kimlik testleriyle kapsanıyor"
```

- Kök-düzey; tek biçim: `waive <Op> covers <dal> [until "<YYYY-MM-DD>"] because "…"`
  (covers biçimleri §5 ile birebir). `because` **ZORUNLU** (karar #7).
- `until` opsiyonel (QA-19): tarih geçince waive hükümsüzleşir, dal uncovered'a geri
  döner (değerlendirme yalnız validator'da — İQ6; manifest `until`'ı verbatim taşır).
- **Stale-waive (m6):** waive hedefi tech'te artık yoksa (guard silinmiş, error
  kalkmış) → error (karşılıksız-hedef kuralı covers/expect ile aynı).
- Waive edilen dala ayrıca test de varsa → warning (çelişki: ya test ya waive).

## 11. Dal uzayı tablosu (§4.1 BİREBİR — karar #6/#10/#21)

Bir Operation'ın zorunlu dalları tech kaynağından **türetilir**:

| Dal | Kaynak (tech) | covers biçimi |
|---|---|---|
| Success | her op | `covers Success` |
| guard-id'li validation check | `validation { … for guard "x" }` | `covers guard "x"` |
| guard-id'li rule check | `rule { … for guard "y" }` | `covers guard "y"` |
| named error | `throws E` (E: ErrorDecl, taksonomi-pinli) | `covers error E` |
| NotAuthorized·roles | op'ta `roles` varsa | `covers NotAuthorized roles` |
| NotAuthorized·ownership | op'ta `ownership` varsa (`public` hariç) | `covers NotAuthorized ownership` |
| NotAuthorized·permit | op'ta `permit when` varsa | `covers NotAuthorized permit` |
| NotAuthorized·scope | op'ta `scope` varsa | `covers NotAuthorized scope` |
| anonim NotValid | id'siz validation check'i varsa (tek dal) | `covers NotValid` |
| anonim NotProcessable | id'siz rule check'i varsa (tek dal) | `covers NotProcessable` |
| callFailure | **stub'lanabilir hedefli** (`external`\|`uncharted` BoundaryOp) `calls … compensate with …` olan her calls | `covers callFailure <Ext.Op>` |

- **Anonim katlama (S5):** id'siz validation check'leri TEK "anonim NotValid" dalına,
  id'siz rule check'leri TEK "anonim NotProcessable" dalına katlanır. Linked bağlamda
  id'siz check'li op'a info: "dal-düzeyi coverage için `for guard` önerilir" — bunu
  tech'e iyileştirme önerisi olarak taşı.
- **İç-modül compensate'li calls dal DOĞURMAZ (S14):** iç calls stub'lanamaz →
  failure'ı deterministik tetiklenemez; uses-tech node'una info ile listelenir.
- **NotAuthenticated-pinli `throws E` (m4):** taksonomi-SINIFI olarak NotAuthenticated
  dal uzayına girmez (P1); ama NotAuthenticated'a pinli **named error** yine
  `covers error E` dalıdır.
- **Guard-id tekilliği (S17):** op-içi `validation ∪ rule` birleşiminde guard-id'ler
  tekil olmalı; ihlal qa link-time **error** (referanssız da PROAKTİF) — düzeltme yeri
  TECH'tir.
- Dal uzayına GİRMEYENLER (NotAuthenticated, ServerError, sayfalama, consistency,
  invariant, idempotent/concurrency): `tech-to-qa-translation.md` §F.

## 12. Keyword tuzakları (yazım-anı)

- **Karşılaştırma tek `=`** (`==` parse HATASI); `!=`, `>`, `<`, `>=`, `<=` var;
  Expr'de `not` YOK (`not` yalnız `not emitted` / `not called` assert biçimidir).
- **ID-biçimli qa keyword'leri path segmenti OLABİLİR** (`s1.result.id`, `result`,
  `count`, `state`, `page`, `time`… — TokenBuilder çözer, İ1). TEK İSTİSNA — alan/param
  adı OLAMAZ: **`and or sum of true false`** (EXPR_VOCABULARY — parse hatası verir).
  Çakışan alan adını yeniden adlandırt.
- **İQ4 — tech tarafı tuzağı:** `.tcdsl` dosyalarında tech-keyword'leri alan/param adı
  OLAMAZ (`note`, `size` fiilen çarpar). Bu qa'nın değil TECH'in sınırıdır — tech
  dosyasında çakışma görürsen `teknik-analiz` ile yeniden adlandırt (`remark`, `boy`).
- **S20 — `uses` anlam farkı:** frontend DSL'de `uses` bir op-arayüzü bildirir; qa'da
  **kaynak bağlar** (`uses tech/flows`). Cross-grammar keyword sızıntısı yoktur; anlam
  bağlamdan nettir — iki DSL arasında geçiş yaparken karıştırma.
- Saat pini offset ZORUNLU: `"2026-07-02T10:00:00Z"` (offset'siz ISO → error, QA-15).
- `advance time` birimleri: `minutes | hours | days` (başka birim yok).
- NotAuthenticated / ServerError **grammar keyword'ü DEĞİLDİR** — dal değiller; S10
  türetiminde ve üreteç-politikalarında (P1/P2/P8) yaşarlar. `covers ServerError`
  yazılamaz; dış-çöküş dalı `covers callFailure <Ext.Op>` ile yazılır.
