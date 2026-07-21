# Fixture: `yeni-kapilar` — 2026-07-21 alan-raporu kapıları

**Ne kanıtlar:** downstream alan-raporunun dört kusuruna karşı eklenen kapıların
**yazılabilir** olduğunu — yani skill'in emrettiği kalıpların gerçek gramerde 0-error
parse ettiğini ve makine-devir sözleşmesine (`operations.json`) taşındığını.

**Kapsam sınırı (dürüstlük):** bu bir **construct-fixture**'ıdır, tam bir konuşma
transkripti DEĞİL (`branded-pin` o rolde). Deterministik assert yüzeyi (EVAL-DISCIPLINE.md):
validator 0-error + beklenen construct'ın emit-JSON'da bulunması. Elicitation davranışı
(sorunun sorulup sorulmadığı) burada değil, `evals.json` #5-#8 senaryolarında ölçülür.

## Yeniden koşma

```
node ../../../validator/validate.mjs .
node ../../../validator/emit-operations.mjs yeni-kapilar.cdsl yeni-kapilar.operations.json
```

## Assert'ler (2026-07-21 koşuldu — hepsi geçti)

| # | Assert | Sonuç |
|---|---|---|
| 1 | `validate.mjs` → **0 error, 0 warning, 0 info** | ✓ |
| 2 | **D4 kaskad** `perform` ile taşınır: `NotSil.effects` = `[{kind:'perform',target:'YorumlariSil'},{…'EkleriSil'}]` | ✓ |
| 3 | **Kaskad kapsam-niyeti** note'la taşınır: `NotSil.description` "YALNIZ o nota ait … kapsam predikatı tech'te" | ✓ |
| 4 | **Arka plan hata dalı** note'la taşınır: `RaporHazirla.description` "hazırlanamazsa … 'basarisiz'" | ✓ |
| 5 | **ADR-0042 rule**: `rules[0]` = `{id:'SirasiGelenBolum', body:null, reads:[], note:dolu}` | ✓ |

## Fixture'ın gösterdiği yapısal sınırlar (skill metnine yansıtıldı)

1. **`on success do` içinde `delete` eylemi YOK** (§3 kapalı liste: `calculate`/`send`/
   `create`/`perform`) → kaskadın taşıyıcısı `perform <BağımlıSilmeOp>`'tur.
2. **`perform` argüman/kapsam taşımaz** → "silinen ŞU kaydın bağımlıları" bağı business'ta
   ifade edilemez. Business kaskad **niyetini** taşır; kapsam predikatı tech'te realize
   edilir (ADR-0042 `rule` bölünmesinin aynı kalıbı).
3. **`on failure` bloğu YOK** → çalışma-anı başarısızlığının kanonik evi `note`'tur;
   yalnız **önlenebilir** koşullar guard'a iner. `on success do` içine başarısızlık dalı
   uydurulamaz.
