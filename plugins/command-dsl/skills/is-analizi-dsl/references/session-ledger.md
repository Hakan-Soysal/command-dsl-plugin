# Oturum Karar-Defteri — Kapsam Anayasası

Bu dosya, elicitation oturumunun **süreç-durumunu** tutan tek defterin
DEĞİŞMEZ sınırlarını tanımlar. Operasyonel biçim (girdi şeması, yazma/okuma
kadansı, deferred-tablo) buna DAYANARAK ayrıca tanımlanır — sınırlar önce gelir,
biçim sonra. Amaç: uzun/çok-fazlı oturumda kararların ve açık-soruların
sessizce kaybolmasını MEKANİK olarak engellemek; ama bunu yaparken tek-hakikat
kaynağını (DSL) ve deterministik-üretimi bozmamak.

## Neden defter var (özü kavra)

Skill'in fazlı akışı ve hibrit-onayı doğru çalışsa bile, **uzun oturumda
LLM-hafızası aşınır**: cevaplanmış bir soru yeniden sorulur, ertelenmiş bir ★
kaybolur, faz-2 faz-1'in kararını unutur. Defter bu aşınmaya karşı **diskteki
kanıttır** — hafıza değil, dosya otoritedir. Kör kabul-gözlemcisi (pre-emit) ve
★-süpürme bu defteri okur; okunacak kayıt yoksa bu mekanizmalar boş-kümeyle
"eksik yok" der = sahte-sıfır. Bu yüzden defterin sınırları güvenlik-kritiktir.

## SERT SINIRLAR (ihlal = mekanizma çöker)

1. **Yalnız SÜREÇ-DURUMU tutulur.** İzin verilen: soru · kullanıcı-cevabı
   (harfiyen, PRESERVE-EXACT) · tarih-yerine-sıra · faz · açık-★ · seçilen +
   reddedilen + tek-cümle gerekçe. **Domain-gerçeği ASLA** (entity alanı, kural
   ifadesi, op parametresi…) — onların tek-kaynağı DSL dosyalarıdır. Defter
   domain tutarsa iki-hakikat-kaynağı doğar ve linked-mode fidelity kırılır.

2. **İçerik hiçbir makine-devir JSON'una (operations/manifest/experience/qa)
   KOPYALANMAZ.** Defter süreç-hafızasıdır, sözleşme değil. "manifest = mapping,
   süperset değil" kuralının ayna-kuralı: aşağı-akış üreteç defteri hiç görmez.

3. **TEK artefakt.** Niyet-dokümanı (Amaç / Amaç-Dışı) ve karar girdileri AYNI
   dosyanın bölümleridir — ayrı dosya değil. İki defter = senkron-drift riski.
   (Karar #2, 2026-07-06.)

4. **Tazelik/çürüme content-hash ile işaretlenir, wall-clock timestamp ile
   DEĞİL.** Duvar-saati damgası deterministik-regeneration'ı bozar. Sıra-no veya
   içerik-hash'i kullan; "ne zaman" değil "hangi içeriğe karşı" sorusunu yanıtla.

5. **Silinen `decision-ledger.ts` ile İLİŞKİSİZ.** O, tech-validator'ın bir
   diagnostic-code sabitiydi (kaldırıldı); bu, is-analizi skill'inin konuşma-katmanı
   markdown-defteridir. Aynı adı taşımaları tarihsel; hiçbir kod bağı yoktur.

## Kapsam-dışı (defterin TUTMADIĞI)

- Domain verisi / DSL içeriği (yukarıda #1).
- Serbest-proza gerekçe romanı — gerekçe TEK cümle, authored (LLM-özet değil).
- Otomatik çözülen çelişki: yeni istek kayıtlı kararla çelişirse defter sessiz
  uzlaştırmaz → tek çelişki-sorusu kullanıcıya (skill çözmez, sorar).

## İz

Bu anayasaya dayanarak **F1.5** defterin girdi-şemasını, faz-sınırı + pre-emit
reload kadansını ve kategori-bazlı deferred-kapatma tablosunu (Resolved /
Deferred / Clear / Outstanding) tanımlar; **F1.6** kör kabul-gözlemcisi defteri
"kullanıcının onayladığı" listesinin diskteki kaynağı olarak okur.

---

# Operasyonel Biçim (İz'de F1.5'e havale edilen)

Yukarıdaki SERT SINIRLAR **ne tutulur**u sabitler; bu bölüm **nasıl yazılır**ı
tanımlar: defterin düzeni, bir girdinin yazılış kalıbı, yazma/okuma kadansı ve
kategori-bazlı kapatma tablosu. Her kural bir sınıra DAYANIR ve onu GENİŞLETMEZ —
çakışırsa sınır kazanır.

## Defterin düzeni — neden Amaç önce gelir

Bir oturum-defteri TEK dosyadır (sınır #3) ve şu sırayla açılır:

1. **Amaç / Amaç-Dışı** — defterin **başında**. Elicitation'la kurulur, kullanıcı
   **authored** eder (LLM türetmez — Değişmez #1). Amaç-Dışı, oturumun kapsamadığının
   kalıcı SHALL-NOT listesidir; sonraki fazlar yeni bir istek gelince önce buraya bakar.
   (Karar #2: niyet-dokümanı ve karar girdileri ayrı dosya değil — aynı defterin
   bölümleri; ayrı tutmak senkron-drift üretir.)
2. **Karar girdileri** — sıra-no artışıyla (aşağıdaki kalıp).
3. **Kapatma tablosu** — kategori-bazlı, defterin sonunda.

## Bir karar girdisinin yazılışı — alanlar sınır #1'de, burada yalnız kalıp

İzin verilen alanlar sınır #1'de sabittir (burada yeniden sayılmaz). Bir hibrit-onay
diske şu somut kalıpla yazılır — anahtar **sıra-no**dur, tarih **değil** (sınır #4;
wall-clock deterministik-regeneration'ı bozar):

```
### [n] Faz-<k> — <sorunun özü>
Soru: <sorulan soru>
Cevap (PRESERVE-EXACT): "<kullanıcının cevabı, harfiyen>"
Seçilen: <…>   ·   Reddedilen: <…>
Gerekçe (tek cümle, authored): <AskUser cevabından, LLM-özeti değil>
```

`Cevap` alanı harfiyen alıntıdır; sadeleştirme/normalize etmek büyüdür (Değişmez #1,
linked-fidelity). `Gerekçe` tek cümledir ve kullanıcının cevabından gelir — serbest-proza
gerekçe romanı değil (bkz. "Kapsam-dışı"). Girdi domain-gerçeği taşımaz: `Cevap` bir
entity-alanı ya da kural-ifadesi ise onun tek-kaynağı DSL'dir, defter yalnız "bu soruldu
ve şu seçildi"yi tutar (sınır #1).

## Yazma / okuma kadansı — neden diskten reload

- **Yaz:** her hibrit-onaydan **hemen sonra** bir girdi. Onay anı = yazma anı; "sonra
  toplu yazarım" tam da "Neden defter var"daki hafıza-aşınmasına kapı açar.
- **Oku (reload):** **faz-geçişinde ve pre-emit'te** defter **diskten** yeniden okunur —
  LLM-hafızasından değil (dosya otoritedir, hafıza değil — "Neden defter var"). Cevaplanmış
  soru yeniden sorulmaz; meşru olan tek şey "geçen sefer X demiştiniz, hâlâ geçerli mi?"
  teyididir.
- Bir girdiyi uygularken teşhir zorunlu: "defterden alındı: [n] …" — ve kullanıcı bunu
  geçersiz kılabilir. Geçersiz-kılma eskiyi **silmez**: yeni onay = yeni sıra-no'lu girdi,
  önceki iz korunur.

## Kategori-bazlı kapatma tablosu — deferred kalıcı iz bırakır  [gap#6]

Her yetenek/soru-kategorisi için bir kapatma-durumu tutulur; böylece "0-sessiz-eksik"
iddiası göz-kararı değil, **tabloyla denetlenebilir** olur. Dört durum:

| Durum | Anlamı |
|---|---|
| **Resolved** | Soruldu, cevaplandı; ilgili karar girdisi mevcut. |
| **Deferred** | Bilinçle ertelendi — **kalıcı iz**; kaybolmaz, sonraki fazda yeniden yüzer. |
| **Clear** | Örtük kapandı; sormaya gerek yok (gerekçe girdide). |
| **Outstanding** | Henüz sorulmadı — açık-★; emit'ten önce çözülmeli. |

`Deferred` satırı **silinmez**: erteleme bir karardır, unutuş değil — bu ayrımı yitirirsek
sessiz-eksik geri döner. Bu tablo, sınır #1'deki **açık-★**'ların diskteki tek kaynağıdır;
★-süpürme onu okur. Boş tablo "eksik yok" demek değildir, "henüz doldurulmadı" demektir —
sahte-sıfıra karşı korunak (bkz. "Neden defter var").
