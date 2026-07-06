# Skill-Eval Disiplini (F1.7)

**Kör nokta:** DSL'ler kendi doğrulayıcılarıyla 0-error'a KANITLI değişir; ama
skill'lerin KENDİSİ kanıtsız değişir. Bu dosya, skill-katmanının "doğrulamadıysak
yapılmamıştır" ilkesine tabi olmasını sağlar. Tam eval-harness / precision-metriği
**ALINMAZ** (metrik-tiyatrosu; snapshot-bundle ekonomisini bozar) — disiplin hafiftir,
deterministiktir, gerçek-transkript-temellidir.

## DoD kuralı (kabul-ölçütü)

Bir skill değişikliği (SKILL.md ya da references/*) **≥1 gerçek konuşma-transkripti**
kanıtı olmadan **done DEĞİLDİR**: jargonsuz kullanıcı → çift-sıfır'la biten DSL +
validator çıktısı. Transkript `evals/transcripts/` altında arşivlenir ve
**yeniden-koşulabilir** olmalı (validator gerçek dosyada tekrar çalışıp aynı sayıyı
vermeli).

## Deterministik assert yüzeyi (pass/fail YALNIZ buradan)

- **validator 0-error** (skill'in gömülü `validate.mjs`'i gerçek fixture'da).
- **beklenen construct emit-JSON'da** (ör. `@sensitivity` manifest'te, ★-sinyali
  operations.json'da).
- **sorulması-gereken soru transkriptte** (ör. ownership `any`→`own` teşhiri soruldu).
- **LLM-judge yalnız ADVISORY** — jargon-sızıntısı gibi yumuşak sinyaller için; ASLA
  pass/fail kanıtı değil (Değişmez-3: kanıtlanmamışı iddia etme).

## Near-miss negatif-tetik senaryoları

- **Faz-sıçraması:** tech-fazında kullanıcı frontend'den bahsetti → skill sıçramamalı
  (kendi katmanında kalır, köprü-notu düşer).
- **Ağır-emit kırılganlığı** (chain-e2e kusur-2): frontend StructuredOutput-cap, qa
  API-stall+strict-gate → şema-serbest + erken-yaz + kapsam-kısıtlama ile aşılır; bu
  senaryo bu disiplinin canlı gerekçesidir.
- **Sessiz-atlama:** bir ★-sinyali kasten cevapsız → Gate onu "beklemede" yakalamalı
  (F1.2 ElicitationState + F1.6 kör-gözlemci).

## Kill-rule

Ölçülebilir fark yaratmayan skill-bölümü **silinir**. "Belki faydalıdır" tutulmaz;
eval'de davranışı değiştirmiyorsa yük'tür.

## Skill-sözleşmesi & kabul-ölçütü [gap#13]

- **`description` = trigger-sözleşmesi:** tetik-hassasiyeti test-edilebilir olmalı
  (hangi ifadelerde açılır/açılmaz — near-miss senaryolarıyla). Kural: skill'i/işi
  **ÖZETLEME** — ajan özetten çalışır; sözleşme metni harfiyen taşınır.
- **Skill ekleme/değiştirme kabul-ölçütü:** yeni skill **boşluk-gerekçesi** ister
  (hangi ihtiyaç mevcut skill'lerce karşılanmıyor); mevcutla **örtüşen** → yeni-skill
  DEĞİL, mevcut olanı **EXTEND**. (bkz. memory `skill-change-elicitation-lens`.)

## Standing fixture'lar (yeniden-koşulabilir)

- `is-analizi-dsl/evals/transcripts/branded-pin/` — chain-e2e 4-katman zinciri; **ilk
  gerçek transkript-kanıtı** (2026-07-06 yeniden-koşuldu: business 0-error/0-warning).
  Diğer katmanlar (tech/frontend/qa) kendi skill-validator'larıyla koşulur.
