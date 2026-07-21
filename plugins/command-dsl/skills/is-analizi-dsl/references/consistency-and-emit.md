# Emit Öncesi Tutarlılık Self-Check + Üretim

"Hatasız" gereksiniminin kalbi burası. Flow ve process **referans-only** olduğu
için asıl risk sözdizimi değil, katmanlar-arası kopukluktur. Üretmeden ÖNCE bu
listeyi geç; bir ihlal varsa **emit etme**, düzelt, tekrar denetle (0 ihlal veya
bilinçli/belgelenmiş istisna olana kadar).

> Bu liste **referans bütünlüğüne** bakar (ID'ler çözülüyor mu, foundation
> bildirilmiş mi). **Üretici-tüketici bütünlüğü** (tüketilen kaydı biri üretiyor
> mu) ayrı bir konudur ve buradan **önce**, Faz 3.5'te yürütülür:
> `references/dependency-closure.md`. **Herhangi bir anda eklenen ya da değiştirilen**
> construct — Faz 3.5'te eklenen üretici, düzeltme turunda türetilen işlem, emit'ten
> SONRA gelen revizyon — aşağıdaki tüm kurallardan **yeniden** geçmelidir
> (SKILL.md Değişmez-6: "değişiklik kapıyı yeniden açar"; "zaten geçmiştik" gerekçe değildir).

## A. Tutarlılık kontrol listesi

### İsim uzayı & referans çözümü
- [ ] **Tek global isim uzayı:** hiçbir operation/flow/process **aynı adı**
  paylaşmıyor. (CommandDSL bunları tek havuzda tutar.)
- [ ] **Domain adları global benzersiz:** aynı `domain <Ad>` iki dosyada/iki kez
  bildirilmiyor (yinelenen domain = ERROR). `actors.cdsl`/`entities.cdsl` genelde
  **hiç domain taşımaz**; her operation katalogu **kendine özgü** domain adları
  kullanır (ör. RequestManagement, RequestApproval, Ordering — hepsi farklı).
- [ ] **Her flow `step` → var olan bir operation ID'si.** Çözülmeyen ID = linker
  hatası. Faz 2'deki iskelet ID'lerin hepsi Faz 3'te gövde kazanmış olmalı.
- [ ] **Her process flow-`stage` → var olan bir flow;** her işlem-`stage` → var olan operation.
- [ ] **`include <flow>` ve `using <step>` hedefleri** çözülüyor; `using` kaynağı
  aynı akışta ve **önceki** bir adım (U1).
- [ ] **`using <step>` entity-eşleşmesi:** `using` ile bağlanan önceki adımın
  **sonuç kaydının türü**, bu adımın üzerinde çalıştığı entity ile **aynı** olmalı.
  Tür değişiyorsa (eksen kayması, ör. PurchaseRequest → PurchaseOrder) `using`
  KULLANMA — bunun yerine yeni kaydı `from <kaynak>` ile üret ve seçim için
  `outside "... seçer"` koy (bkz. `dsl-reference.md` §6). Yanlış `using` = WARN.
- [ ] **`perform <op>` hedefi** var olan bir operation ve **sorgu değil** (T4).

### Aktör & handoff
- [ ] **P6:** her flow-stage'de `by <Aktör>` == o flow'un `for <Aktör>`'u (TAM eşleşme).
- [ ] Tüm `extends` zincirleri **döngüsüz**; her referans verilen aktör Faz 0'da bildirilmiş.
- [ ] `include` edilen akışın aktörü, dahil eden akışın aktörü (veya extends atası) ile uyumlu.

### Foundation bütünlüğü
- [ ] Operation'larda geçen her **entity, relation, calendar** Faz 0'da bildirilmiş.
- [ ] `<relation>'s` ownership kullanılan her ilişki `relation … of … with …` ile tanımlı.
- [ ] Standart-dışı her fiil için `verb <ad>` bildirilmiş.

### Tip-uygunluk (T1-T4)
- [ ] **Sorgu** (reads/lists): `only during`/`only if`/`schedule`/`calculate`/
  `on success` YOK; `on/from/for/where` öbeği YOK. (Filtre için yalnız `only when`,
  `order by`, `limit to`.)
- [ ] **Komut:** `order by`/`limit to` YOK.
- [ ] `schedule:` taşıyan komutun aktörü **System**; bu komut hiçbir flow/process'te geçmiyor.

### Kimlik & durum
- [ ] **Benzersiz 4'lü imza (T5/D12):** hiçbir iki operation aynı
  aktör+fiil+ownership+kaynak'a sahip değil (ID farklı olsa da).
- [ ] `calculate <Entity>.status = '...'` durum atamaları tutarlı bir yaşam
  döngüsü oluşturuyor (ör. draft→submitted→approved); string yalnız status gibi
  alanlara, aritmetik sayısal alanlara.

### Bilinçli istisnalar
- Bir flow hiçbir process etabı değilse bu **hata değil** (destek akışı, P8 info).
  Ama bilinçli olduğundan emin ol ve dokümanda not düş.

## B. Emit sırası (dependency-order)

İnsana top-down anlattın; **her dosyanın içini tersten** yaz ki referanslar
çözülsün. Bir modül dosyasının içindeki kanonik sıra:

1. **Foundation:** `domain`/`actor`(+extends)/`calendar`/`relation`/`entity`/`verb`.
2. **Operation kataloğu:** tüm işlemler.
3. **Flow'lar:** operation'lara referans verir.
4. **Process'ler:** flow/operation'lara referans verir.

## C. Dosya bölme — MODÜL bazlı (tip bazlı DEĞİL)

**Bölme birimi modüldür, katman değil.** Bir modül = tutarlı bir iş alanı
(tipik olarak bir süreç + onun akışları + işlemleri + sahip olduğu aktör/varlıklar).
`actors.cdsl` / `entities.cdsl` / `flows.cdsl` gibi **tipe göre** dosyalar AÇMA.

- **Tek modüllük analiz → TEK dosya:** `<modül>.cdsl` (ör. `procurement.cdsl`)
  her şeyi içerir (aktör, varlık, operation, flow, process), §B sırasında.
- **Çok modüllük analiz → modül kadar dosya:** her modül kendi `<modül>.cdsl`
  dosyasında, kendi içinde §B sırasında. Modüller arası referanslar `import` ile.

Modül dosyası içinde, kataloğu okunabilirlik için `domain` alt-başlıklarıyla
gruplayabilirsin (ör. RequestManagement, Ordering) — ama **her domain adı global
benzersiz** olmalı; aynı domain'i iki dosyada açma.

### Paylaşılan foundation (çok modülde)
Bir aktör/varlık birden çok modülde kullanılıyorsa tek yerde bildirilmeli (tek
isim uzayı). Sırasıyla tercih et:
1. Onu **sahiplenen modülün** dosyasında bildir; diğer modüller o dosyayı `import` etsin.
2. Gerçekten birçok modülde ortak kullanılan çekirdek varlıklar varsa, bilinçli
   bir istisna olarak tek `shared.cdsl` aç ve dokümanda neden olduğunu belirt.

### Import kuralları
- `import` satırları **dosya başında**, göreli path + tek tırnak: `import './procurement.cdsl'`.
- Görünürlük transitif değil — bir dosya neyi kullanıyorsa onu **doğrudan** import etmeli.
- Her dosyaya kısa `#` başlık yorumu koy (hangi modül + içerdiği).
- Yinelenen/gereksiz `domain` ERROR/karışıklık üretir — her domain adını bir kez kullan.

## D. Doküman çıktısı — SABİT ŞABLON (istenirse)

DSL'in insan-okur ikizi. Doküman da DSL kadar **deterministik** olmalı: aşağıdaki
bölümleri **bu sırayla ve bu başlıklarla** kullan. Bir bölümün karşılığı modelde
yoksa (ör. süreç yoksa) o bölümü "—" ile geç, ama başlığı **atlama** —
çalıştırmalar arası format savrulmasını bu sabit iskelet önler. İçerik miktarı
modelin boyutuna göre değişir; **yapı değişmez.**

Durum sütununu/yaşam döngüsünü katalogdaki `where` + `calculate <Entity>.status`
atamalarından **türet** (DSL'de açıkça yazılmaz). Kullanıcı moda göre dokümanı
DSL'den önce, sonra veya yalnız başına isteyebilir (SKILL.md "Üretim").

```markdown
# <Uygulama/Model Adı> — İş Analizi

## 1. Genel Bakış
- **Amaç:** <tek cümle>
- **Modüller:** <modül listesi>
- **Kapsam dışı:** <bilinçli olarak dahil edilmeyenler>

## 2. Aktörler
| Aktör | Açıklama | Devraldığı (extends) |
|---|---|---|
| <Ad> | <ne yapar> | <üst aktör / —> |

İlişkiler: <relation listesi, ör. managedTeam = yöneticinin ekibi> · Takvimler: <calendar listesi / —>

## 3. Varlıklar (Kayıtlar)
| Varlık | Alanlar | Durum yaşam döngüsü |
|---|---|---|
| <Ad> | <alan: tip, …> | <draft → submitted → … / —> |

## 4. Süreçler
<her process için tekrarla; süreç yoksa "—">
### <Süreç Adı> (of <Merkez Varlık>)
- **Tetikleyici → Sonuç:** <…> → <…>
- **Etaplar:**

  | # | Etap | Aktör | Akış/İşlem | Giriş durumu | Çıkış durumu |
  |---|---|---|---|---|---|
  | 1 | <Etap> | <Aktör> | <flow/op> | <durum> | <durum> |
- **El değiştirmeler:** <Aktör A → Aktör B → …>

## 5. Akışlar
<her flow için tekrarla>
### <Flow Adı> (Aktör: <X>)
- **Amaç:** <…>
- **Ana senaryo:**
  1. <adım: işlem — ne yapar>
  2. …
- **Uzantılar / alternatifler:** <either-or dalları, optional, repeat, abandon, outside; yoksa "—">

## 6. İşlemler (kural özeti)
| İşlem | Aktör | Tür | Kaynak | Kapsam (ownership) | Koşullar | Başarı sonrası |
|---|---|---|---|---|---|---|
| <Ad> | <Aktör> | komut/sorgu | <Entity> | own/any/… | only if/where/… | calculate/send/perform/— |

## 7. Açık varsayımlar & bilinçli istisnalar
- <otonom modda yapılan varsayım / P8 destek akışı / schedule muafiyeti vb.>
- <dış kaynak/seed olarak kapsam dışı bırakılan üreticiler (Faz 3.5 · D1-D3)>
- <yıkım kararları: bilinçli öksüz bırakılan bağımlı kayıtlar (D4)>

### 7.1 Bu analizin kapsamadıkları (sabit alt-başlık — ATLAMA)
Bu paket bir **davranış modelidir**. Aşağıdakiler bilinçli olarak kapsam dışıdır ve
**ayrı ele alınmalıdır** — yoklukları "atlanmış" değil **sınır**dır (SKILL.md
"Bu skill neyi KAPSAMAZ"): problem tanımı/iş gerekçesi · paydaş analizi (sistemi
kullanmayan taraflar) · NFR (performans, gizlilik/KVKK, maliyet, erişilebilirlik,
saklama) · risk kaydı (RAID) · kimlik/hesap yaşam döngüsü · eşzamanlılık (kilit/yarış).
```
