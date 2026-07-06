# Eval-Fixture: BrandedPin (chain-e2e, 4-katman)

Kaynak: iki-izole-agent zinciri deneyi (`mining-reports/chain-e2e-evaluation.md`,
2026-07-06). Paydaş (yalnız MBSE) ↔ analist (yalnız katman-skill'i) soru-cevapla
4 katmanlı, uçtan-uca linked, bağımsız-valide bir DSL zinciri ördü. Bu, F1.7
skill-eval disiplininin **ilk gerçek transkript-kanıtı** (jargonsuz kullanıcı →
çift-sıfır'la biten DSL).

## Dosyalar
- `interview-transcript.md` — tam konuşma (jargonsuz kullanıcı ↔ analist).
- `interview-branded-pin.{cdsl,operations.json}` — business (is-analizi).
- `interview-branded-pin.{tcdsl,manifest.json}` — tech (teknik-analiz).
- `interview-branded-pin.{fcdsl,experience.json}` — frontend (frontend-analiz).
- `interview-branded-pin.{qa,qa.json}` — qa (qa-analiz).

## Ground-truth (bağımsız valide — chain-e2e raporu; validator BEN koştum)
| Katman | Kaynak | Validator sonucu |
|---|---|---|
| business | .cdsl 466 satır | **0 error · 0 warning** (28 info; F6 kapsama, bilgi-amaçlı) |
| tech | .tcdsl 797 satır | 0 error · 1 warning |
| frontend | .fcdsl 461 satır | 0 error · 5 warning (coverage) |
| qa | .qa 260 satır | 0 error · 4 warning (non-strict; 215 dal: 13 covered / 38 waived / 164 uncovered-warning) |

## Yeniden-koşu (re-runnable — F0.3 kabul-kriteri)
`node ../../../validator/validate.mjs interview-branded-pin.cdsl`
→ 2026-07-06 doğrulandı: **0 error, 0 warning, 28 info** (business ground-truth ile eşleşti).
Diğer katmanların validator'ları kendi skill'lerindedir (teknik/frontend/qa-analiz).

## Near-miss dersi (F1.7 için)
chain-e2e kusur-2 (ağır-emit kırılganlığı: frontend StructuredOutput-cap, qa
API-stall+strict-gate) → skill-eval disiplininin canlı gerekçesi. Ayrıca kusur-1
(decorator-sıra yanlış-teşhisi) `0ab0559` skill-fix'ine dönüştü.
