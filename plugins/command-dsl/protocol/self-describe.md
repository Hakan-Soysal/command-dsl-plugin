# Self-Describe Protokolü

> **Sözleşme.** Bir generator+filler paketinin kendini keşfe nasıl tanıttığını tanımlar:
> konvansiyon-işareti + `describe` modu + sürüm-pin semantiği + bootstrap. Hem keşif (T2.2) hem
> paketler (T5.1) bu sözleşmeye uyar. Bu yalnız **protokol** spec'idir; eşleştirme/describe-kodu
> burada **implement edilmez**.
>
> **Kaynak:** `SEAM-DOLDURMA-SKILL-TASARIM.md` §A.1 madde 2 + §A.6. **Descriptor şekli:** T1.1
> (`schema/descriptor.schema.json`) — buraya **referans**; yeniden tanımlanmaz.

---

## A1 değişmezi — neden self-describe, cache-scan DEĞİL

Keşif, filesystem'deki **belgesiz** `~/.claude/plugins/cache/` yolunu **TARAMAZ**. Bu yol
dokümante edilmemiş, çok-sürümlü ve `.in_use` belirsizliği taşıyan bir platform iç-detayıdır;
ona dayanmak platform-kırılgandır (A1 ihlali). Bunun yerine keşif **native skill mekanizmasıyla**
self-describe kullanır: aday paketler kendilerini bir konvansiyon-işaretiyle ilan eder ve descriptor'ını
`describe` modunda **kendisi** döndürür.

**Açıkça yasak:** belgesiz cache-yolu **taraması** = `cache-scan DEĞİL`. Keşif hiçbir koşulda
`~/.claude/plugins/cache/**` glob'una dayanmaz; `cache` dizinini enumerate etmez. Aday tespitinin tek
meşru yolu aşağıdaki 1. bölümdür.

---

## 1. Aday işareti — keşif kurulu paketi nasıl bulur

Generator paketinin **filler-skill'i**, kendi `SKILL.md` dosyasının `description` alanına sabit bir
konvansiyon token'ı koyar:

```
[dsl-generator]
```

Keşfi koşan model, kurulu skill'leri zaten **bağlamında görür** (platform kurulu skill'leri sunar).
Keşif, bu kurulu-skill listesini tarayıp `description`'ında `[dsl-generator]` token'ını taşıyan
skill'leri **aday** sayar. Token taşımayan skill aday değildir.

- **İşaretin evi:** paketin filler-skill `description`'ı (kurulu-skill listesinden görünür alan).
- **Cache-scan YOK:** aday enumerate'i token'dan yapılır; belgesiz cache-yolu taranmaz (A1).
- **Üreteç-nötr:** token konvansiyondur; herhangi bir community generator paketi onu koyarak aday olur.

> **6.2/(1) cevabı:** *Kurulu paketi nasıl bulurum?* → kurulu-skill listesinde `[dsl-generator]`
> token'ını taşıyan filler-skill'leri enumerate et.

---

## 2. `describe` modu — keşif descriptor'ı nasıl alır

Keşif, her adayın filler-skill'ini **`describe` argümanıyla** `Skill` tool üzerinden çağırır. Bu modda
skill **YALNIZCA** kendi `${CLAUDE_SKILL_DIR}/capability.json` dosyasını döndürür — başka **hiçbir şey
üretmez** (statik üretim yok, seam doldurma yok, build yok).

- **`describe` = SADECE capability beyanı:** üretim modunun yan-kapısı **değildir**; describe çağrısı
  asla kod/dosya üretmez. (Üretim, ayrı bir devretme tetiklemesidir; protokol kapsamı dışı.)
- **Sanctioned yol erişimi:** skill yalnız **kendi** `${CLAUDE_SKILL_DIR}` dizinini okur; bu izinli
  alandır. Cross-plugin yol erişimi **GEREKMEZ** — keşif başka paketin dosyasına asla elle uzanmaz.
- **Dönen içerik = descriptor:** `capability.json`'ın şekli T1.1 capability descriptor şemasına
  (`schema/descriptor.schema.json`) **uyar**. Alanları burada yeniden tanımlamayız; keşif onu o şemaya
  göre okur (`id`, `version`, `capability.constructsCovered`, `emissionContract`, `gapProtocol`,
  `source` vb.).

> **6.2/(2) cevabı:** *Descriptor'ı nasıl alırım?* → adayın filler-skill'ini `describe` modunda çağır;
> skill kendi `capability.json`'ını (T1.1 descriptor şekli) döndürür.

---

## 3. Sürüm semantiği — keşif sürümü nasıl pin'ler

Claude Code modele her zaman **tek bir çözümlenmiş sürüm** sunar. Cache'in çok-sürüm / `.in_use`
belirsizliği **platform tarafından** çözülür; keşfin sürüm **seçmesi gerekmez**.

- **Pin:** keşif, çözümlenmiş skill'in `describe` ile beyan ettiği `version` değerini
  `.dsl/generators/<id>@<version>.json`'a **pin'ler** (deterministik lockfile kaydı, §A.6).
- **Sürüm seçimi keşfe ait DEĞİL:** platform çözer, keşif yalnız **pin'ler**. Keşif sürüm karşılaştırması
  yapıp "şu sürümü kullan" demez.
- **Drift uyarısı:** pinlenmiş sürüm ≠ kurulu-çözümlenmiş sürüm ise keşif **drift uyarısı** verir →
  yeniden-doğrula (One-Version disiplini). Sessiz devam yok.

> **6.2/(3) cevabı:** *Sürümü nasıl pin'lerim?* → platformun çözdüğü tek sürümün beyan ettiği `version`'ı
> `.dsl/generators/<id>@<version>.json`'a yaz; pin ≠ kurulu ise drift uyarısı + yeniden-doğrula.

---

## 4. Bootstrap (klon) — pin var, skill kurulu değil

Bir repoyu klonlayan kullanıcıda `.dsl/generators/<id>@<version>.json` **pin'i bulunabilir** ama
paket **kurulu olmayabilir** (kurulu-skill listesinde `[dsl-generator]` token'lı eşleşme yok).

- Bu durumda keşif, pinlenmiş descriptor'ın **`source.install`** komutunu (T1.1 `source.install`,
  ör. `/plugin install ...`) **kullanıcıya sunar** — paketi sessizce kurmaz; komutu önerir.
- Kurulum sonrası paket kurulu-skill listesinde görünür → 1. bölüm (token-tara) yeniden işler → tam
  boru hattı geri gelir. (§A.6: "Klon → keşif → 'şunu kur' → boru hattı".)

> **6.2/(4) cevabı:** *Paket eksikse ne olur?* → `.dsl` pin'i descriptor'ı bilir; keşif
> `descriptor.source.install` komutunu sunar (bootstrap).

---

## 5. Yükümlülük tablosu — paket SAĞLAR vs keşif YAPAR

| Paket SAĞLAR | Keşif YAPAR |
|---|---|
| `[dsl-generator]` token'ını filler-skill `description`'ına koyar | Kurulu-skill listesinde `[dsl-generator]` token'ını **tarar** → aday enumerate (cache-scan DEĞİL) |
| `describe` modu (yalnız capability döndürür, üretim yapmaz) | Her adayı `describe` modunda **çağırır** |
| `${CLAUDE_SKILL_DIR}/capability.json` (T1.1 descriptor şekli) | Dönen descriptor'ı profil+construct kümesiyle **eşleştirir** (TAM/KISMİ/YOK — mantık T2.2) |
| `version` beyanı (descriptor içinde) | Çözümlenmiş sürümü `.dsl/generators/<id>@<version>.json`'a **pin'ler** |
| `source.install` (descriptor'da, klon bootstrap için) | Pin ≠ kurulu → **drift-kontrol** + uyarı; pin var/kurulu yok → `source.install` ile **bootstrap** |

> İki sütun = iki rol. Paket **kendini beyan eder** (işaret + describe + capability.json); keşif
> **bulur, çağırır, eşleştirir, pin'ler, drift-kontrol eder, bootstrap eder**. Hiçbir adımda keşif
> belgesiz cache-yolunu taramaz.

---

## Kapsam dışı (bu spec yapmaz)

- Descriptor şemasını **yeniden tanımlamaz** → T1.1 (`schema/descriptor.schema.json`); buraya referans.
- Keşfin **eşleştirme mantığını** implement etmez → T2.2.
- Filler skill'in **describe-modu kodunu** yazmaz → T5.1 (bu protokolü tüketir).
