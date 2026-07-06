---
name: spec-context
description: >-
  2. grup (vibecoder) için **deterministik spec-bağlam üreteci**: Teknik Analiz `manifest.json`'undaki
  backend yükümlülüklerini (payload guard'ları, roller/scope/ownership/abac, entity invariant'ları, throws)
  **emireden dilde** bir `CLAUDE.md`'ye yazar; Claude Code bunu vibecoding sırasında okuyup üretilen kodu
  manifest'e tutarlı kılar. **Kod ÜRETMEZ, app ÇALIŞTIRMAZ** — saf manifest→metin dönüşümü (report-tech
  kardeşi, deterministik + byte-stable). Emit ettiği yükümlülükler behavior-gate'in AYNI manifest'ten
  denetlediğiyle birebir örtüşür (söylenen == denetlenen). Şu durumda kullan: kullanıcı "spec-context /
  manifest'ten CLAUDE.md üret / DSL yükümlülüklerini vibecoding'e bağlam olarak bağla" dediğinde ve bir tech
  `manifest.json` mevcutken. SINIR: yalnız BACKEND (tech manifest); frontend `.experience.json` için DEĞİL
  (o ayrı skill). Teknik tasarımı üretmek için `teknik-analiz`'i kullan; bu skill onun `manifest.json`
  çıktısından başlar.
---

# spec-context — manifest → scoped CLAUDE.md (backend yükümlülükleri)

Teknik Analiz'in `manifest.json`'undaki **backend yükümlülüklerini**, vibecoder'ın backend dizinine
konan bir `CLAUDE.md`'ye **emireden dilde** yazar. Claude Code nested `CLAUDE.md` dosyalarını o dizinde
çalışırken **otomatik** okur; böylece vibecoding sırasında üretilen kod, spec'in dayattığı guard'lara /
yetki eksenlerine / invariant'lara **baştan** tutarlı kalır. Sen kod yazmaz/üretmezsin — bu araç saf bir
`manifest.json → metin` dönüşümüdür.

## Neyi neden böyle yapıyoruz (özü kavra)

- **Tek kaynak = manifest.** Yükümlülükler ELLE tekrarlanmaz; `manifest.json`'dan **deterministik**
  türetilir. Aynı manifest → aynı bayt (`byte-stable`): timestamp yok, rastgelelik yok.
- **Söylenen == denetlenen.** spec-context'in `CLAUDE.md`'ye YAZDIĞI yükümlülükler ile `behavior-gate`'in
  AYNI manifest'ten DENETLEDİĞİ kurallar tek kaynaktan gelir. Vibecoder'a söylenen kural, sonradan kapının
  aradığı kuraldır.
- **Katman-scope = ko-lokasyon.** Çıktı, hedeflenen backend dizinine konur; Claude Code'un nested
  `CLAUDE.md` otomatik-okuma davranışı yükümlülükleri tam o kodun yanında etkin kılar.
- **Yönlendirir, garanti etmez.** Bu dosya vibecoding'i doğru yöne çeker; "tutarlı" **sertifikası vermez**
  (o garanti behavior-gate'te de yoktur). Ama spec-context'in kendi çıktısı deterministik + doğrudur.

## Kullanım

```
node spec-context.mjs <manifest.json> --out <backend-dizini>   # <dizin>/CLAUDE.md üretir
node spec-context.mjs --version                                # tool damgası (spec-context/1)
node lib.mjs --selftest                                        # saf-fonksiyon testleri
```

`--out` bir **DİZİN**dir (dosya-adı değil): araç o dizinin altına `CLAUDE.md` yazar. Vibecoder'ın
backend/ dizinini hedefle. Girdi bozuk/şema-dışıysa araç **hiçbir şey yazmadan** exit 1 verir (gate).

## Emit edilen yükümlülükler (ve edilmeyen)

| Yükümlülük | Kaynak (manifest) | Emit? |
|---|---|---|
| Yetki: roller / scope / ownership / abac | `op.roles / scopes / ownership / abac` | ✅ ZORUNLU zorla |
| Girdi guard'ları | `op.validation / rule` (guard `text`) | ✅ ihlal → ZORUNLU reddet |
| Entity invariant'ları | `entity.invariants[].text` | ✅ app state'i daima sağlamalı |
| Fırlatılabilir hatalar | `op.throws[]` | ✅ hata taksonomisi |
| serving / access / pagination / consistency / topoloji | — | ❌ report-tech'in **insan-raporu** işi; manifest DÖKÜLMEZ |

spec-context yalnız **davranışsal-yükümlülük** alanlarını emit eder; manifest'i olduğu gibi dökmez ve
insan-okur mimari-özet üretmez (o `report-tech.mjs`'in işidir). Yükümlülüğü olmayan operasyon atlanır.

## ⭐ pin / refresh disiplini (drift'i önle)

Çıktı bir **SNAPSHOT**'tır: provenance başlığında kaynak `manifest.json`'un `sha256`'sı gömülüdür ve
dosya `DO NOT EDIT` ile işaretlidir — elle DÜZENLEME. Spec değiştiğinde `manifest.json` değişir; o zaman
**spec-context'i VE behavior-gate'i BİRLİKTE** yeniden çalıştır. Aksi halde vibecoder'a verilen bağlam ile
kapının denetlediği kurallar birbirinden **drift** eder. İkisi de AYNI manifest'e pinlenir → "söylenen ==
denetlenen" korunur.

## Olgunluk

**Deterministik üretici.** spec-context keyfî kod ÇALIŞTIRMAZ, app SÜRMEZ, ağ/dosya-sistemi yan etkisi
yalnız `--out/CLAUDE.md` yazımıdır. Risk profili yayınlanmış bir **validator/emitter** ile aynıdır
(`report-tech` kardeşi). Aynı manifest → aynı bayt; selftest ile saf-fonksiyon davranışı kanıtlıdır.

## Kaynak / tasarım

Tam tasarım: `DSL Business Analyses/GRUP2-VIBECODE-TASARIM.md` (§4 spec-context tanımı · pin/refresh ·
katman-scope · §9 embed sırası · §3 drift / ko-lokasyon). Kardeş skill: `behavior-gate` — AYNI
`manifest.json`'u ÇALIŞAN app'e karşı denetler (bu skill onu YAZAR, gate onu DOĞRULAR). Teknik tasarımı
üretmek için: `teknik-analiz`.
