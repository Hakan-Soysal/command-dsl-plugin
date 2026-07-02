# Tutarlılık self-check + emit kuralları

## A. Emit ÖNCESİ self-check (doğrulayıcıdan önce kendin tara)

Doğrulayıcı yakalar ama döngü israfıdır — emit'ten önce şunları kendin geç:

1. **Kök bildirimi:** her kök `.fcdsl` `contract './….operations.json'` ile başlıyor mu;
   manifest varsa `tech './…manifest.json'` eklendi mi? (standalone ÜRETME — skill kuralı.)
2. **Çıpalar:** her `uses`'ta ya açık `realizes <BizOpID>` var ya da yerel ad business
   adıyla birebir aynı (by-name — emit öncesi kullanıcıya tek satırla onaylatılmış olmalı).
3. **Kind eşleşmesi:** `uses command` ↔ business `command`, `uses query` ↔ `query`.
4. **Cardinality:** liste dönen her sorguda `out list of {…}`; `list` yalnız liste-out'a,
   `detail`/`value` yalnız tekil-out'a bağlı.
5. **Entry:** her experience'ta `entry <ekran>` var ve kendi ekranını gösteriyor (shared değil).
6. **Erişilebilirlik:** her ekrana entry'den bir yol var (aksiyon-nav / result-nav /
   uiEvent-nav / açık `nav` / flow-adımı / experience result-default hedefi).
7. **Handler-tamlık:** bileşene bağlı her op'un authored `results:`'ındaki her non-Success,
   ya bileşen handler'ıyla ya experience-default'la kapsanıyor (ya da kullanıcı belgeli-
   default'u onayladı).
8. **queue×out:** `queue`'lu op'ların `on Success` nav-arg'larında op out-alanı YOK.
9. **Ad hijyeni:** aynı ekranda aynı op'u kullanan ≥2 bileşende `as`; experience içinde
   dup ekran/uses/state adı yok.
10. **Rezerv çakışması:** alan/param adlarında `and or sum of true false` yok
    (varsa yeniden adlandırt — parse hatası verir).

## B. Dosya granülaritesi (karar #32 — C# modeli)

- **Basit model (≤2 experience):** TEK `.fcdsl` dosyası — shared + tüm experience'lar.
  Önerilen ad: `<sistem>.fcdsl`.
- **Büyük model:** experience-başına dosya (`CustomerApp.fcdsl`, `StaffPortal.fcdsl`) +
  ortaklar `shared.fcdsl`'de. Her KÖK dosya kendi `contract` (+`tech`) satırını taşır
  (contract dosya-başına çözülür; tekrarlanması normaldir).
- **Union kuralı (KRİTİK):** uncovered-op denetimi "bir op'u HERHANGİ bir experience
  sunuyorsa kapsanmıştır" der — bu ancak TÜM dosyalar doğrulayıcıya **tek çağrıda**
  verilirse doğru çalışır. Dosyaları tek tek doğrulama: tek başına verilen dosya, öteki
  dosyanın sunduğu op için sahte uncovered uyarısı üretir.
- Tech'in "manifest tek-kök" kısıtının benzeri YOKTUR — çok-dosya native desteklenir;
  `import` yalnız extension-pack içindir (domain içeriğini import'la bölme).

## C. Emit çıktısı + araç-gate'i

- Emit komutu (doğrulama + koşullu üretim TEK araçta):
  `node ${CLAUDE_SKILL_DIR}/validator/fcdsl.mjs <dosyalar|dizin> --out <çıktı-dizini> --json`
- **Gate garantisi:** herhangi bir dosyada severity-1 error varsa araç HİÇBİR
  `.experience.json` yazmaz (partial da yok; exit 1). "0-error'da üret" kuralı araca
  gömülüdür — senin görevin error'ları düzeltmek, emit kendiliğinden gelir.
- 0-error'da: kaynak dosya başına `<ad>.experience.json` (kaynak granülaritesi aynen
  yansır). Warning'ler emit'i ENGELLEMEZ — ama her warning ya kullanıcı-onaylı ya
  düzeltilmiş olmalı (SKILL.md doğrulama döngüsü).
- Çıktı **hedef-nötr sadık-aynadır**: authored gerçek + `realizes`-referansları; tek
  ucuz-türev `show` çözümü (yazılmamışsa tüm out-alanları çözülmüş yazılır). Upstream
  içerikleri İLERİ TAŞINMAZ — üreteç `experience.json ⋈ operations.json ⋈ manifest.json`
  join'ini kendisi yapar.
- **Devir paketi** = `*.experience.json` + `operations.json` + (varsa) `manifest.json` —
  üçü birlikte frontend üretecinin girdisidir; yalnız experience.json'u teslim etme.

## D. Emit sonrası

- `--out` çıktılarının `meta.hasErrors: false` olduğunu gör (gate zaten garantiler —
  yine de raporla).
- Kullanıcıya özeti ver: experience sayısı, ekran sayısı, kapsanan/kapsam-dışı op'lar
  (belgelenmiş kararlarla), kalan bilinçli warning'ler.
- Dosyaları kullanıcının çalışma dizinine yaz (skill dizinine DEĞİL).
