---
name: experience-context
description: >-
  2. grup (vibecoder) için **deterministik spec-bağlam üreteci** — spec-context'in FRONTEND kardeşi:
  Frontend Analiz `.experience.json`'undaki frontend yükümlülüklerini (ekranlar, form alanları + validation,
  action→op binding'leri, navigasyon, data show/pagination, op out/cardinality) **emireden dilde** bir
  `CLAUDE.md`'ye yazar; Claude Code bunu vibecoding sırasında okuyup üretilen frontend'i `.experience.json`'a
  tutarlı kılar. **Kod ÜRETMEZ, app ÇALIŞTIRMAZ** — saf `.experience.json`→metin dönüşümü (report-tech /
  spec-context kardeşi, deterministik + byte-stable). Emit ettiği yükümlülükler gelecek existence-checker'ın
  AYNI `.experience.json`'dan denetleyeceğiyle birebir örtüşür (söylenen == denetlenen). Şu durumda kullan:
  kullanıcı "experience-context / `.experience.json`'dan CLAUDE.md üret / frontend yükümlülüklerini vibecoding'e
  bağlam olarak bağla" dediğinde ve bir `.experience.json` mevcutken. SINIR: yalnız FRONTEND
  (`.experience.json`); backend `manifest.json` için DEĞİL (o `spec-context`). Frontend tasarımını üretmek için
  `frontend-analiz`'i kullan; bu skill onun `.experience.json` çıktısından başlar.
---

# experience-context — .experience.json → scoped CLAUDE.md (frontend yükümlülükleri)

Frontend Analiz'in `.experience.json`'undaki **frontend yükümlülüklerini**, vibecoder'ın frontend dizinine
konan bir `CLAUDE.md`'ye **emireden dilde** yazar. Claude Code nested `CLAUDE.md` dosyalarını o dizinde
çalışırken **otomatik** okur; böylece vibecoding sırasında üretilen frontend, spec'in dayattığı ekranlara /
form-validation'lara / action→op binding'lerine / navigasyona **baştan** tutarlı kalır. Sen kod
yazmaz/üretmezsin — bu araç saf bir `.experience.json → metin` dönüşümüdür. **spec-context'in birebir
frontend kardeşidir** (aynı değişmezler; farklı katman).

## Neyi neden böyle yapıyoruz (özü kavra)

- **Tek kaynak = `.experience.json`.** Yükümlülükler ELLE tekrarlanmaz; `.experience.json`'dan
  **deterministik** türetilir. Aynı girdi → aynı bayt (`byte-stable`): timestamp yok, rastgelelik yok.
- **Söylenen == denetlenen.** experience-context'in `CLAUDE.md`'ye YAZDIĞI yükümlülükler ile gelecek
  `existence-checker`'ın AYNI `.experience.json`'dan DENETLEYECEĞİ kurallar tek kaynaktan gelir. Vibecoder'a
  söylenen kural, sonradan checker'ın aradığı kuraldır.
- **Katman-scope = ko-lokasyon.** Çıktı, hedeflenen frontend dizinine konur; Claude Code'un nested
  `CLAUDE.md` otomatik-okuma davranışı yükümlülükleri tam o kodun yanında etkin kılar.
- **Yönlendirir, garanti etmez.** Bu dosya vibecoding'i doğru yöne çeker; "tutarlı" **sertifikası vermez**
  (o garanti existence-checker'da da yoktur — o "var ≠ çalışır" ayrımını korur). Ama experience-context'in
  kendi çıktısı deterministik + doğrudur.

## Kullanım

```
node experience-context.mjs <experience.json> --out <frontend-dizini>   # <dizin>/CLAUDE.md üretir
node experience-context.mjs --version                                   # tool damgası (experience-context/1)
node experience-context.mjs --selftest                                  # gerçek CLI kabul testleri
node lib.mjs --selftest                                                 # saf-fonksiyon testleri
node evals/run.mjs                                                      # byte-stable + snapshot + coverage evalleri
```

`--out` bir **DİZİN**dir (dosya-adı değil): araç o dizinin altına `CLAUDE.md` yazar. Vibecoder'ın
frontend/ dizinini hedefle. Girdi bozuk/şema-dışıysa araç **hiçbir şey yazmadan** exit 1 verir (gate).

## Emit edilen yükümlülükler (ve edilmeyen)

| Yükümlülük | Kaynak (`.experience.json`) | Emit? |
|---|---|---|
| Ekranlar | `experiences[].screens[]` (+ `shared.screens`) | ✅ "Şu ekranları oluştur: `<name>` (params)" |
| Form alanları + validation | `form.fields[].validation{required/min/max/pattern}` | ✅ alanlar + validation'ı **ZORLA** |
| Form / visibleWhen kuralları | `form.rules[].ast` · `action.visibleWhen` | ✅ (ast varsa) koşul ZORUNLU |
| Action → op binding | `action.command.op` · `form.submits.op` · `data.query.op` | ✅ "Şu action `<op>`'u çağırır" |
| Navigasyon | `action.navigation` · `uiEvents[].actions[do:navigate]` | ✅ "Şu geçişleri kur" |
| Data show / pagination | `data.show.fields` · `data.pagination` | ✅ "Şu alanları göster; pagination" |
| out / cardinality | `usesInterfaces[op].out` | ✅ (op üzerinden) beklenen veri şekli |
| salt-görsel / tema / layout estetiği | — | ❌ `report-frontend`'in **insan-raporu** işi; emit edilmez |

experience-context yalnız **davranışsal-yükümlülük** alanlarını emit eder; `.experience.json`'ı olduğu gibi
dökmez ve insan-okur mimari-özet üretmez. Yükümlülüğü olmayan boş ekran/region **atlanır**. Tanınmayan
component `kind`'ları sessizce düşürülmez — çıktıda "elle incele" uyarısı olarak işaretlenir.

## ⭐ pin / refresh disiplini (drift'i önle)

Çıktı bir **SNAPSHOT**'tır: provenance başlığında kaynak `.experience.json`'un `sha256`'sı gömülüdür ve
dosya `DO NOT EDIT` ile işaretlidir — elle DÜZENLEME. Spec değiştiğinde `.experience.json` değişir; o zaman
**experience-context'i VE (mevcut olduğunda) experience-gate/existence-checker'ı BİRLİKTE** yeniden çalıştır.
Aksi halde vibecoder'a verilen bağlam ile checker'ın denetlediği kurallar birbirinden **drift** eder. İkisi de
AYNI `.experience.json`'a pinlenir → "söylenen == denetlenen" korunur.

## Olgunluk

**Deterministik üretici.** experience-context keyfî kod ÇALIŞTIRMAZ, app SÜRMEZ, ağ/dosya-sistemi yan etkisi
yalnız `--out/CLAUDE.md` yazımıdır. Risk profili yayınlanmış bir **validator/emitter** ile aynıdır
(`spec-context` / `report-tech` kardeşi). Aynı girdi → aynı bayt; `lib.mjs --selftest` saf-fonksiyon
davranışını, `evals/run.mjs` ise byte-stability + snapshot + coverage + no-hallucination + provenance +
no-timestamp'i kanıtlar.

## ⭐ Değer-durumu (dürüst — ölçüldü, 2026-07-06)

**Emitter'ın kendisi doğru + deterministik** (yukarı). AMA "bu CLAUDE.md vibecoding-çıktısını GERÇEKTEN
iyileştiriyor mu" ayrı bir sorudur ve bir değer-probe'uyla (iki blinded vibecoder: CLAUDE.md'li vs'siz +
naming-robust existence-checker) ölçüldü. **1. probe bulgusu (n=1, kütüphane-ödünç UI, prose-TAM fixture): KOZMETİK** — capability-delta=0.
Her iki vibecoder da esasen aynı frontend'i (aynı form'lar, aynı validation bounds, aynı op-çağrıları)
YALNIZ düz-dil feature-tarifinden kurdu; CLAUDE.md'nin ölçülebilir tek etkisi vibecoder'ın **spec'in kanonik
adlarını** benimsemesiydi (naming-alignment), yapı/yetenek EKLEMEK değil.

**GÜNCELLEME (2026-07-06 — 2. probe, YENİDEN-AÇILDI ve DEĞERLİ çıktı):** 1. probe'un KOZMETİK bulgusu
**senaryo-sınırlıydı** — fixture prose-tamdı (feature-tarifi tüm yapıları ima ediyordu, doldurulacak boşluk
yoktu). Skill'in kendi yeniden-açılma koşulu (`.experience.json`'un düz-prose'un ATLADIĞı capability-taşıyan
yükümlülük içerdiği bir feature), obligation-zengin **branded-pin** senaryosuyla karşılandı (23 ekran / 5 form /
39 action; rol-görünürlük gating, pager/infinite pagination, dual-gated op'lar, kurumsal-monetizasyon
write-akışı). **2×2 blinded vibecoder (sonnet) + adversarial yargıç → DEĞERLİ, capability-delta ~44 puan**
(düz-brief kolu ort. %46 vs CLAUDE.md kolu %90 yükümlülük-yakalama). Somut: düz-brief kolu kurumsal ekranı
SALT-OKUNUR halüsine etti (MarkEnterprisePaid/ActivatePremiumLogo/CreateEnterpriseFeatureSet write'ları YOK) +
ajans-başvuru formuna yanlış zorunlu-alanlar dayattı; CLAUDE.md kolu gerçek yükümlülükleri kurdu.
**Değer GERÇEK ama KOŞULLU:** (a) rol-görünürlük gibi 'bariz' yükümlülüğü düz-brief de çıkarır — delta orada
DEĞİL; (b) yargıcın bazı ekranda B'yi düz-brief'ten zayıf bulduğu yer (Pause paused-kampanyada görünür kalır;
Tanimlar list'siz) **EMİTTER-BUG DEĞİL** — ölçüldü: emitter `.experience.json`'daki `visibleWhen`'i SADIK emit
eder (9 role-koşulu var), ama state-geçiş butonlarına (Pause/Resume/Submit/Delete/MarkEnterprisePaid…)
state-koşulu KAYNAKTA hiç authored EDİLMEMİŞTİR (emitter olmayanı emit etmez — büyü-yok). Gerçek gap UPSTREAM:
**frontend-analiz elicitation** — "state-geçiş butonu ne zaman görünsün?" + oluşturulanın görüntüleme/liste
yüzeyi (CRUD-tamlık) → frontend Yetenek-Envanteri/★-süpürmeye aday (visible-when'i STATE için de kullan).
Karşıt kalır: `spec-context` (backend) authz/invariant taşır → o da değerli.
Kanıt: bu turun `exp-value-probe` workflow'u + component-düzeyi visibleWhen ölçümü + `frontend-wedge-plan/`.

## Kaynak / tasarım

Tam tasarım: `DSL Business Analyses/frontend-wedge-plan/DESIGN.md` (§3 experience-context emit tablosu ·
pin/refresh · katman-scope · §2 `.experience.json` gerçek şekli). **Kardeş skill'ler:** `spec-context` — AYNI
disiplinin BACKEND'i (`manifest.json` → backend CLAUDE.md); `experience-gate` / **existence-checker** — AYNI
`.experience.json`'u vibecoded frontend'e karşı denetleyen GELECEK checker (bu skill onu YAZAR, checker onu
DOĞRULAR). Frontend tasarımını üretmek için: `frontend-analiz`.
