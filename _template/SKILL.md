---
name: <skill-adı>            # Türkçe görev adı, -dsl'siz (CONVENTIONS §2)
description: >-
  <Ne yaptığı — bir cümle: hangi girdiyi (upstream skill çıktısı) alıp ne ürettiği.>
  Şu durumlarda MUTLAKA kullan: <somut TR tetikleyiciler> — "<örnek 1>", "<örnek 2>" — veya
  <EN tetikleyiciler: "...", "...">. <Upstream: X'in ÇIKTISINDAN başla.> <Downstream/devir: Y'ye devret.>
  <Sınır: neyi YAPMAZ.>
---

# <Başlık — Girdi → Çıktı>

<Bir-iki cümle: skill ne yapar, karşısındaki kim, işin özü.>

## Neyi neden böyle yapıyoruz (özü kavra)

<Skill'in varlık amacı + tasarımı dayatan İLKELER. "Nihai çıktı nedir, bu skill onun neresinde?">
<2-3 numaralı ilke — her biri bir tasarım kararını zorunlu kılar (örn. linked-zorunlu, declared-not-inferred,
sessiz-default-yok). CONVENTIONS §7 değişmez ilkelerinden türet.>

## Altın kurallar (her oturumda geçerli)

- <Değişmez 1 — örn. jargon gösterme / somut sorudan türet.>
- <Değişmez 2 — hibrit onay: toplu öneri → tek soruyla onay; onaysız alt-faza inme.>
- <Değişmez 3 — güvenlik/yetki zayıflatan eksende MUTLAKA sor.>
- <Değişmez 4 — onaylanmamış hiçbir şeyi emit etme; üretim en sonda.>

## Başlamadan

<Girdiyi netleştir: upstream artefakt (ör. operations.json / önceki skill çıktısı) var mı? Yoksa
ilgili upstream skill'e yönlendir — bu skill onu ÜRETMEZ.>
<Doğrulayan skill'sen: gömülü aracı `node ${CLAUDE_SKILL_DIR}/validator/<x>.mjs` ile çağır (CWD-bağımsız).>

---

## Faz 0 — <ad>

**Amaç:** <ne çıkaracak>
**Elicit/Yap:** <düz-dille sorular veya yapılacak iş>
**⚠ Anti-pattern:** <bu fazın tipik hatası — sessizce yakala, nazikçe sor>
**Kapatır:** <(doğrulayan skill'de) hangi validator kuralını discharge eder — faz↔kural 1:1>

## Faz 1 — <ad>
**Amaç:** … **Elicit/Yap:** … **⚠ Anti-pattern:** … **Kapatır:** …

<… gerektiği kadar faz. Elicit top-down (büyük resim → detay).>

---

## Emit (dependency-order) + Doğrula

**Emit:** <çıktıyı dependency sırasında üret (referans-verilen önce). Dosya bölme kuralı.>
**Doğrula (zorunlu):**
```
node ${CLAUDE_SKILL_DIR}/validator/<x>.mjs <hedef> --json     # doğrulayan skill ise
```
- **error → düzelt, tekrar koş. 0 error olmadan döngüden çıkma.**
- **warning → kullanıcıya takip sorusu** (ikinci tur sorgulama).
<Ön-kapı skill'sen: üretme/derleme YOK — girdiyi hazırla, capability eşleştir, executor'a devret (CONVENTIONS §5).>

## Referans dosyaları (gerektiğinde oku)

- `references/<...>.md` — <ne içerir>
- `references/examples/` — validator/parser-kanıtlı (0 error) exemplar'lar
