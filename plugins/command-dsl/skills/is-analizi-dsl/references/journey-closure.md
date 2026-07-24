# Deneyim-Borcu Kapanışı (Faz 3.6)

> ⚠ **Phrasing kilitli DEĞİL.** Bu dosyadaki tüm kullanıcı-cümleleri (tur soruları, J17
> dürtmeleri, aktivasyon satırı, waive-ağacı dili) **ilk-taslaktır** — gerçek-oturum
> eval'iyle kalibre edilecek. Yapı/karar kilitli, kelimeler değil. `moment` / `waive` /
> `tetik` gibi terimleri KULLANICIYA gösterme; onun düz cümlesinden *sen* türet.

Bu adım modelin **deneyim olarak tam** olduğunu güvence altına alır: sistemin ürettiği
her **tetik-noktasında** (boş liste, engellenen eylem, arka-plan bekleyişi, başarısızlık,
geri-alınamaz silme, akıştan ayrılma, başkasının ürettiği kayıt) kullanıcıya **ne
borçlu olduğumuza** ya authored bir `moment` ile karşılık verilir ya gerekçeli bir
`waive` ile — kayıtlı biçimde — kapatılır. Üçüncü hâl yoktur (kapsanmamış tetik = error).

Bu, Faz 3.5'ten (`dependency-closure.md`) **farklı** bir kapanıştır. Orası
**nedensel bütünlük** (tüketilenin üreticisi var mı, yok edilenin bağımlısı ne oluyor).
Burası **deneyim bütünlüğü** (her tetikte kullanıcıya bir karşılık borçlu muyuz). Faz 3.5
üretim/yıkım eksenidir; Faz 3.6 deneyim-borcu eksenidir.

## İki yük-taşıyan ayrım (asla bulanıklaştırma)

- **Kapsama ≠ Bilinçlilik.** *Kapsama* = her tetik `moment | waive` — **HARD validator
  kapısı** garanti eder (emit'te J2/J3/J13 = 0, emit-kilidi K6). *Bilinçlilik* = seçilen
  moment içi-boş değil / fiil-sınıfı dürüst / düşen tetik bir modelleme boşluğu değil —
  **★-süpürme** bloklamayan INFO olarak (J17/J21/J22) yüzeye çıkarır. İki ayrı garanti,
  iki ayrı mekanizma. Hiçbir cümle "her tetik kapandı"yı süpürmeye atfetmez.
- **Borç ≠ Muamele.** Journey borcun OWED (ödenmesi-gerekli) olup olmadığını çıkarır.
  NASIL sunulduğu (metin/widget/yerleşim) `.fcdsl`'de yaşar (frontend). Her soru
  **borç-owed ekseninde** kalır; kopya/UI sorusu ASLA sorulmaz.

## Ne zaman

Faz 3.5 sabit-noktaya erdikten **sonra** ve Tutarlılık self-check'inden **sonra**,
emit-öncesi süpürmelerden (5 süpürme, "Ne sormadım?" geçidi) **önce**. Sıra
**zorunludur, ergonomi için değil**: Faz 3.5 / D4 yıkım-kapanışı yeni `perform
<SilmeOp>` kaskad operasyonları EKLEYEBİLİR; her yeni silme-op'u yeni `irreversible`
(+`failure`) tetiği doğurur (golden: 3 kaskad-op → +6 tetik). Daha erken koşmak **bayat
op-kümesi** üzerinden hesaplar.

## BATCHED — cebir zorluyor, ergonomi seçmiyor

Tetik kümesi `T` tüm-model hesabıdır: `System`/`perform`-hedefli `failure`/`waiting`/
`mutation` tetikleri ve deneyimleyen kümeleri, ters-perform indeksi ve tüketici kümeleri
TÜM birim üzerinde kurulana kadar **hesaplanamaz** (Op #3, Op #10'un onu `perform`
edeceğini bilemez). Bu yüzden `T` **tek seferde** hesaplanıp devredilir; 39 golden tetiği
tek tek sormak kullanıcıyı sıkıştırır ve skill'in tempo-kuralını ihlal eder (bu, tam da
kaçınılan anti-pattern'dir).

## Adım A — Envanteri yüzeye çıkar (HER ZAMAN; tarama opsiyonel değil)

Tetik hesabını koştur ve çalışıp çalışmayacağını sormadan ÖNCE ne bulunduğunu göster.
**Mekanizma — `journey-scan.mjs` (GEREKLİ araç, scratch-scan DEĞİL):**

```
node ${CLAUDE_SKILL_DIR}/validator/journey-scan.mjs <model.cdsl> [--today YYYY-MM-DD]
```

Araç `hesaplaTetikler`'i doğrudan sarmalar ve tam envanteri JSON basar:
`{ journeyActive, total, byKind, byStatus, triggers[ {kind, anchor, experiencers[],
status, by?, reason?} ], droppedJ22[], unclassified[] }`.

> ⚠ **Neden scratch `journey __scan__ {}` DEĞİL:** validator'ın J2 diagnostiği yalnız
> `(kind, anchorName)` taşır — **DENEYİMLEYEN yok**. Oysa `mutation`/`failure` durum
> şablonları "kim" ile kurulur ("Arka plan, **[Analist]**'in kayıtlarını değiştirir")
> ve J22 boş-deneyimleyen düşmesi durable ★-kaydına dönüşür (aşağıda). `journey-scan.mjs`
> deneyimleyeni + `droppedJ22`'yi + `unclassified`'ı verir; scratch yolu veremez. Araç
> ayrıca dead `journey __scan__ {}` (J14 / emit-kirliliği) riskini tümüyle kaldırır.
> Araç YALNIZ lexer/parser hatasında durur; validation severity-1'de DURMAZ — açıktaki
> tetikleri (uncovered) yüzeye çıkarmak işin ta kendisidir.

**0-tetik çıkışı (maliyet ≈ 0).** `total = 0` ise (saf CRUD) bunu bildir ve **hiçbir şey
yazma** → kapı kapalı kalır → emit bugünkiyle bit-özdeş.

**Tetik-varsa yüzeye çıkar + çözmeye opt-in.** `total ≠ 0` ise şekli göster (ör. "39
böyle an: 3 boş liste · 9 engellenen eylem · 4 bekleyiş · 11 başarısızlık · 3 arka-plan
değişimi · 4 kalıcı silme · 1 yarıda-bırakma · 4 köken") ve **TEK, atlanabilir,
suçlamasız satırla** geçişe onay iste. Bu satır agenda dayatmaz — düz iş analizini
isteyene "deneyim tasarımı" itelemesi gibi HİSSETTİRME:

> *(ilk-taslak, kalibre edilecek)* "Modelin bu anları var; istersen her biri için 'burada
> kullanıcıya bir karşılık borçlu muyuz' sorusunu birlikte kapatırız — istemezsen
> atlarız, model yine geçerli."

**Decline (atla).** İki iz birden: (1) authored defter girdisi (`kaynak: model; sinyal:
journey-layer; durum: atlandı; neden: <gerekçe>`) — **declared-skip, sessiz-drop DEĞİL**;
(2) tetik SAYISI doküman §7 "bilinçli istisnalar"a yazılır ("KAPSAMAZ = devir, açıkça
söylenir" ethos'u). Journey bloğu YAZILMAZ; kapı kapalı; emit bit-özdeş.

## Adım B / Ön-tur — `unclassified` (J16) temizle (foundation, journey DEĞİL)

`journey-scan.mjs` çıktısındaki `unclassified` her özel-fiil için düz-dilli, kapalı-seçim
sınıflandırması sor:

> *"`<fiil>` yeni bir şey mi **oluşturuyor**, var olanı mı **değiştiriyor**, yoksa
> **siliyor** mu? (hiçbiri — sadece bir bayrak/durum mu çeviriyor?)"*
> → foundation katmanına `verb <ad> like creates|updates|deletes` yazar.

`unclassified = ∅` olmadan tam envanter güvenilmez değildir (journey AKTİFKEN sınıfsız
özel komut-fiili J16 error verir ve o op tetik-cebirine GİRMEZ = kısmi sayım). Bu, dürüstçe
**4. soru-şeklidir** (§7 drift-gate): {tetik-onayı | yükümlülük-seç | waive-seç}'e
İNMEZ. Bilinçle **Faz-3.6-öncesi foundation top-up** tutulur — 3-şekilli kapıyı saf
bırakır. Kullanıcıya `verb`/`like` deme; düz cümlesinden *sen* türet.

## Adım C — Taslak-sonra-düzenle (kilitli etkileşim şekli; P0-A)

**Grup-turu-diff sorusu DEĞİL** ("bu 9'dan hangisi varsayılandan sapıyor?" — teknik-olmayan
kullanıcının altitude'da yapamayacağı bir diff işlemi → refleks "hepsi tamam" → J17 içi-boş
dürtmeyi de defeat eder). Yerine:

1. **Skill TÜM kapanışı TASLAKLAR** — her tetik önceden-kararlı: ya `moment` + çekirdek
   (§Çekirdek tablo) ya `waive` + gerekçe (§waive-ağacı), **her biri görünür gerekçeyle +
   satır-içi J17 dürtmesiyle**. Gruplama **tür bazlı (by-kind)**.
2. **Kullanıcı GÖZDEN GEÇİRİR ve YALNIZ istisnaları düzenler** (~≤6 etkileşim).
3. **ZORUNLU açık-dokunuş — YALNIZ `irreversible` + `failure`:** bu iki yüksek-riskli tür
   için toplu-taslak-onayı içi-boş momenti GİZLEYEMEZ → her `irreversible`/`failure`
   kararı **tek tek açık dokunuş** ister (kullanıcı görüp onaylar). Gerisi batch'lenir
   (`provenance` dahil — o da batch akışında).

Deterministik taslak/tur sırası (düşük-gürültü/yüksek-varsayılan → yüksek-gürültü/bespoke;
D1→D4 varsayılan-önce aynası): `blocked · failure · waiting · empty · mutation ·
irreversible · provenance · departure`.

**Situation-first geri-okuma** (kind token'ı ASLA yüzeye çıkmaz; deneyimleyen adlandırılır —
`journey-scan.mjs` verir). EARS event-driven okuma (`WHEN <tetik>, sistem SHALL <karşılık>`)
YALNIZ **geçici düşünsel iskele** — asla yazılmaz (structural-first):

| kind | Düz-dil durumu (ilk-taslak) |
|---|---|
| `empty` | "[Aktör] açar ve liste boştur." |
| `blocked` | "[Aktör] [eylemi] dener ama izin verilmez." |
| `waiting` | "[İş] arka planda çalışır ve hissedilir zaman alır." |
| `failure` | "[İş] başarısız olursa." |
| `mutation` | "Arka plan, [Aktör]'ın kayıtlarını o dokunmadan değiştirir." |
| `irreversible` | "[İş] [Aktör]'ın [verisini] kalıcı olarak yok eder." |
| `departure` | "[Aktör] [akışı] yarıda bırakabilir." |
| `provenance` | "[Aktör]'ın alanında başkasının ürettiği bir kayıt belirir." |

Nötr kapanış (asla yönlendirici): **"Bu an var mı — varsa bir karşılık borçluyuz; yoksa
nedenini birlikte işaretleyelim."** Bir "yok" cevabı **typed waive'e** yönlenir (§waive-ağacı),
ASLA tetik-silmeye — "bu tetiği düşür" çıkışı YOKTUR (İ4/İ5).

## Adım D — Çekirdek auto-fill + per-kind J17 içi-boş dürtmesi (füzyon; surfaced-not-blocked)

Kullanıcı "borçluyuz" dediğinde skill **türün sabit çekirdeğini otomatik doldurur** (sabit
dağarcığa türetme — İ1-güvenli transkripsiyon, icat değil; kullanıcı `warns loss` yazmaz).
Aynı nefeste, moment YALNIZ tek-fiil çekirdeği taşıyorsa (`derivedDischarge` predikatı
ateşler) dürter — türün **özgül izinli kümesini** çekerek, jenerik "daha fazla?" değil.
Üç meşru kapanış: (a) izinli-ekle zenginleştir; (b) authored ince-kabul (`/atla`); (c)
waive olarak yeniden düşün.

**Sert değişmez:** her tür için RICH = `{çekirdek} ∪ {izinli ekler}` ile SINIRLI. Satır
dışı her şey validator ERROR'dur, zenginleştirme değil → DSL-uzantı backlog'u. Dış UX
literatürü daha cömert olsa bile **tablo kazanır.** (Kaynak: `JOURNEY_KIND_OBLIGATIONS`,
journey-triggers.ts — doğrulanmış.)

| kind | çekirdek (zorunlu) | izinli ek(ler) | J17 dürtmesi |
|---|---|---|---|
| `empty` | offers path `<ID>` | explains cause | **dürtme YOK — yapısal muaf** (`derivedDischarge` ateşlemez; parametreli çekirdek). J11 yine *kapsamayı* korur |
| `blocked` | explains cause | offers path | ateşler — "moment eksik koşulu **adlandırıyor** ve onu **nasıl sağlayacağına** işaret ediyor mu (`offers path`)? Yolu olmayan bir sebep hâlâ çıkmaz sokak." |
| `waiting` | shows progress **veya** signals completion | ikisi | **dürtme YOK — yapısal muaf** (disjonktif çekirdek) |
| `failure` | explains cause | preserves input · allows retry · offers path | ateşler — **EN YÜKSEK öncelik** (J18 retry-kökü): "Hepsi bu mu — yoksa **yazdığını da saklayalım** (`preserves input`) ve **tekrar denemesine izin verelim** (`allows retry`) mi? Girdiyi kaybetmek en keskin, en önlenebilir acı." |
| `mutation` | signals completion | explains cause | ateşler (düşük-öncelik): "Değişimin etkisi belirgin değilse, moment **ne anlama geldiğini** de söylüyor mu (`explains cause`)? Hafif tut." |
| `irreversible` | warns loss | explains cause · offers path | ateşler — "moment **neyin kaybolacağını** ve **başkalarına etkisini** söylüyor mu (`explains cause`), **daha güvenli bir yol** sunuyor mu (`offers path`)? Genel bir 'emin misiniz?' otomatik tıklanıp geçilir." |
| `departure` | preserves progress | offers path | ateşler ⚠ tuzak: "ilerlemesi saklanıyor ve **geri dönüp devam edebiliyor** mu (`offers path`)? Amaç *koruma*." — **`warns loss`'a ASLA dürtme** (ait değil → ERROR). |
| `provenance` | discloses origin | — (yok) | ateşler ama **yalnız-içerik** ⚠ tuzak: yapısal ek YOKTUR; `explains cause` eklemek ERROR. |

**J17 uygunluğu YAPISAL bir karardır (`derivedDischarge`'a çıpalı):** blocked / failure /
mutation / irreversible / departure / provenance için ateşler; **empty ve waiting HER
ZAMAN muaf.** A3'ün daha zengin empty/waiting UX içeriği yalnız *emit-edilmeyen referans*
olarak frontend `.fcdsl` muamelesine akar — journey dürtmesi ASLA. (`empty`/`waiting`
**strict-defer-to-predicate**: validator'ın arkalamadığı hiçbir dürtme emit etme.)

Her dürtme açık "borcumuz bu kadar mı, yoksa X'i de mi?" olarak sorulur; asgari-onay
`/atla` her zaman **birinci-sınıf, cezasız** cevaptır (törensel-doldurma'ya karşı guard).

## Adım E — waive karar ağacı (düz dil; kod asla söylenmez)

Ağacı yürü; **ilk yakalanan eksen kazanır**, gerisi `because` içinde ikincil bağlam kalır:

1. **"Bu durum bu üründe gerçek bir kullanıcıya hiç oluşabilir mi?"** Hayır →
   **`unreachable`** (validator doğrulayamaz; `because` = denetim izi).
2. **"Borç var mı, yoksa an/eylem kendisi bunu zaten ödüyor mu?"** Kendini karşılıyor →
   **`inherent`** (ör. kullanıcının kendi eyleminin 1:1 türevi bir kopya). `accepted`
   DEĞİL: inherent = risk yok; accepted = risk alındı.
3. **"Bunu başka bir katmanın genel politikası mı ödüyor?"** Evet → **`generic-policy`** —
   o politikayı `because`'ta ADLANDIR (o katmana yönlenen iş-kalemi olur, K4); journey'nin
   KENDİ momentine işaret EDEMEZ.
4. **"Bilinçli üstlenmiyoruz — kalıcı mı, süreli mi?"** Kalıcı → **`accepted`** (`until`
   yok). Süreli → **`deferred` + `until "YYYY-AA-GG"` ZORUNLU** (J10; süre geçerse J9
   tetiği error olarak yeniden açar, emit kilitlenir).
5. **Hiçbiri ateşlemez → borçluyuz → `moment`** (skill çekirdek auto-fill + J17 kontrol).

**`blocked` inceliği (düz):** "Bu engel kullanıcıya bir **yol** öğretiyor mu (ör.
iki-aşamalı silmede 'önce arşivle')? Öyleyse borçluyuz → moment (`explains cause`,
opsiyonel `offers path`). Yoksa arayüzün zaten gizlediği bir yarış-artığı mı →
`generic-policy` waive."

**Anti-bahane guard (J20).** `because` boilerplate ("vaktimiz yok", "sonra bakarız",
"gerek yok") + asgari-altı içerik için taranır → warning, çözülmemiş soru gibi ele alınır
(yeniden sorulur, sessizce kabul edilmez). Her waive'de tek gerekçe-kodu (tek eksen).

## Adım F — `offers path` = VAR OLAN üreticiyi seç (destinasyon tarif etme)

`offers path <ID>`'nin hedefi **var olan bir `OperationDecl` ya da `FlowDef`**'tir
(gramer serbest tarifi yasaklar; `PathTarget = OperationDecl | FlowDef` — doğrulanmış;
`ProcessDef` bilinçle dışarıda). `empty` için hedef, listelenen entity'nin bir
**üreticisi** olmalıdır (J11). Böyle üretici YOKSA → Faz 3.5'e geri yönlen (üretici op'u
YARAT) — asla "bir ekran yaz." Bu, adding-op olduğu için sabit-noktayı yeniden tetikler
(§Sabit-nokta).

## Adım G — Toplu-`deferred` dürüst pas-arası çıkış (P1-C)

Opt-in sonrası emit-kilidi K6 + sabit-nokta döngüsü kullanıcıyı **tuzağa** düşürebilir:
en hızlı yasal çıkış **sahte waive** olur. Buna karşı **dürüst çıkış**: kalan tetikleri
ortak `until` ile toplu **`deferred`** waive'e al — yasal emit olur, defter borcu
*owed-later* olarak kaydeder (sahte değil). Skill YAZMADAN ÖNCE **sayı + ortak `until`
ÖNERİR:**

> "Kalan N tetiği <tarih>'e erteliyorum — o gün emit o tetikleri yeniden kilitler. Onaylıyor
> musun, yoksa bazısını şimdi mi kapatalım?"

⚠ `until` geçince J9 O GÜN TÜM emit'i kilitler; sessiz 1→N genişleme büyük eşzamanlı
riski gizler → **açık öneri** onu yüzeye çıkarır (hibrit-onay).

## Sabit-nokta döngüsü (Değişmez-6)

Her batch'ten sonra `journey-scan.mjs`'i (ya da validate'i) yeniden koştur. **`byStatus`:
uncovered = 0 ∧ step-partial = 0** olana kadar döngüle (validator: J2 = 0 ∧ J13 = 0 ∧
J3 = 0 ∧ J9 = 0). Op EKLEYEN bir karar (ör. `offers path` hedefi için üretici) o op'u
Faz 3 + 3.5 + 3.6'dan yeniden geçirir ve `T`'yi yeniden hesaplar — faz "emit'ten önce bir
kez" DEĞİLDİR.

> **Döngü koruması:** Faz 3.5'in loop-guard'ından miras (her düğüm bir kez); burada
> yeniden-kanıtlanmaz, devralınır.

## ★-süpürme bağlantısı — per-diagnostic HİBRİT (Fix-1; bulanıklaştırma)

B-vs-C çatalı sahte-ikilikti; **her diagnostik AYRI çözülür:**

- **J17 (içi-boş)** → çekirdek auto-fill anında **satır-içi füzyon** (Adım D; ayrı süpürme
  kaydı DEĞİL — moment-yazım anında yakınsak).
- **J22 (deneyimleyensiz düşme)** → **durable `beklemede-★` kaydı** olarak defter'e bağlanır;
  ★-süpürme onu yeniden-enumere eder (**ZORUNLU** — aksi hâlde silent-hole aşağıda).
  Kapanış: *confirm* ("hiçbir insan-tüketici yok — doğru") ya da *fix* (tüketici ekle / bu
  bir D1-tersi modelleme boşluğu → Faz 3.5'e yönlen). Tasarım-niyetiyle hizalı: J22 tam da
  "**görünür** düşme (sessiz değil)" olarak emit edilir.
- **J21 (`like updates` yığılması)** → elicitation ★ **probe**'u ("bu 'like updates'
  eylemler gerçekten içerik üretmiyor / yok etmiyor mu?"), zorunlu kayıt DEĞİL — skill
  disiplini.

> ⚠ **J22 neden ZORUNLU durable kayıt (silent-hole).** Deneyimleyensiz tetik-adayları
> `T`'ye GİRMEDEN düşer (`hesaplaTetikler` totallik süzgeci → `droppedJ22`); kapsama kapısı
> `T` üzerinde koşar → onları HİÇ görmez (J2 yok, emit-kilidi yok). Deneyimleyeni yalnız
> `any`/`all`/`public`-görünürlükle düşen bir 6.-eksen op'u zaten-`cevaplandı` açılır → ★
> süpürmesi onu asla enumere etmez. Bu **sistematik bir sınıftır** (admin/dashboard
> okumaları), köşe-vaka değil. Saf-kapsama-güdümlü elicitation bunları SESSİZCE atlar.
> Bu yüzden `journey-scan.mjs`'in `droppedJ22`'si her biri için durable ★-kaydı doğurur;
> validator'ın *info*'su tek başına yetmez — kapanış confirm-or-fix ile ÇİFT-SIFIR'ın
> bilinçlilik yarısındadır (bkz. SKILL.md Değişmez).

## Proza yüzeyi — sweep-5'e katılır

`moment … note """…"""` ve `waive … because """…"""` denetimsiz-proza yüzeyleridir
(ADR-0042 sınıfı). Emit-öncesi sweep-5 (iddia-sınaması) kapalı keyword-tarama'sını
(`… olmadan · aksi halde · yoksa … olurdu · bu sayede … engellenir`) `moment.note` +
`waive.because` üzerine de genişletir. Kaydedilmiş bir borç, icat değil.

## Her bulguyu sınıflandır (körü körüne kapatma)

- **moment** = borç var, karşılık authored (çekirdek + izinli ek).
- **waive** = borç yok / başka yerde ödeniyor / bilinçle üstlenilmedi — 5 gerekçeden biri
  + `because`.
- **droppedJ22** = deneyimleyensiz düşme → durable ★ → confirm ("tüketicisiz doğru") ya
  fix (Faz 3.5'e tüketici ekle).
- **unclassified (J16)** = foundation top-up (`verb … like …`), journey kararı DEĞİL.

## Anti-pattern'ler

- **Grup-turu diff-sorusu** ("hangisi varsayılandan sapıyor?") — refleks "hepsi tamam" +
  J17 defeat. Yerine taslak-sonra-düzenle (Adım C).
- **`irreversible`/`failure`'ı batch'e gizleme** — bu ikisi ZORUNLU açık-dokunuş ister.
- **Tetiği silme / "düşür" çıkışı sunma** — "yok" cevabı typed waive'e gider, silmeye ASLA.
- **`empty`/`waiting`'e J17 dürtmesi** — yapısal muaf; validator arkalamayan dürtme yasak.
- **`departure`'a `warns loss`, `provenance`'a `explains cause` dürtmesi** — tabloda yok →
  ERROR (izinli-küme tuzakları).
- **`offers path` için ekran tarif etme** — var olan üreticiyi seç; yoksa Faz 3.5.
- **J22'yi sadece info sayıp geçme** — durable ★ kaydı ZORUNLU (silent-hole).
- **Sahte waive ile emit-kilidinden kaçma** — dürüst toplu-`deferred` çıkışını öner (Adım G).
- **Kopya/widget/yerleşim sorma** — borç-owed ekseni; muamele frontend'in.
- **Faz 3.5'ten ÖNCE koşma** — D4 kaskad-op'ları yeni tetik doğurur; bayat `T`.
- **Phrasing'i taşa yazma** — bu dosyanın kullanıcı-cümleleri ilk-taslak, eval'le kalibre.
