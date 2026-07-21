# Düz Cümle → İşlem (Operation) Çeviri Prosedürü

Bu, skill'in en hassas işidir: teknik olmayan kullanıcının düz cümlesini
geçerli bir CommandDSL işlem bildirimine çevirmek. **Faz 3'te her operation için
bu prosedürü sırayla uygula.** Acele etme; eksik bilgiyi kullanıcıya düz dille sor.

Hedef yapı:
```
<İşlemAdı>: <Aktör> <fiil> <ownership> <Kaynak> [on …] [from …] [for …] [where …]
[kural cümlecikleri]
[on success do: actions]
```

## Adım adım

### 1. Aktör (KİM yapıyor?)
Cümlenin öznesi. Faz 0'daki aktör listesinden biri olmalı. Yeni biri çıktıysa
Faz 0'a geri dön ve aktörü ekle (tutarlılık: tanımsız aktör linker hatasıdır).

### 2. Fiil (NE yapıyor?) → tür buradan türer
Kullanıcının eylem kelimesini al. **Tür kararı:**
- "görüntüle / listele / gör / bak / ara" → **sorgu**: `reads` (tekil) veya `lists` (çoklu).
- diğer her şey ("oluştur, gönder, onayla, reddet, iptal et, öde…") → **komut**.

Standart CRUD karşılıkları: oluştur→`creates`, güncelle→`updates`, sil→`deletes`,
oku→`reads`, listele→`lists`. Alan-özel fiiller (`approves`, `submits`, `cancels`,
`issues`, `pays`…) doğrudan kullanılır **ama önce `verb <ad>` ile bildirilmeli**
(yoksa yalnızca uyarı çıkar; yine de bildir — temiz model için).

**Yetki-devri dalı** — fiil sinyali "erişim ver / geçici izin / vekâlet / yetkiyi
devret" ise bu bir CRUD komutu DEĞİL, `grant`/`revoke`'tur (`references/dsl-reference.md`
§5). Üç alt-soru sor:
1. **Hangi izin** devrediliyor — okuma / yazma / güncelleme / silme
   (`read | write | update | delete`)?
2. **Kime** — hangi aktöre (`to <Aktör>`)?
3. **Süreli mi** — süre bitince kendiliğinden kalkar mı (`for <süre>`, ör.
   `for 24h`)? Süresizse geri-alma yolu var mı (`revokes … from <Aktör>`)?

### 3. Ownership (HANGİ kayıtlar üzerinde?) — jargonu kullanıcıya yansıtma
Kullanıcının kapsam ifadesini anahtara çevir:
| Kullanıcı der ki… | Ownership |
|---|---|
| "kendi …'sını" | `own` |
| "herhangi bir / tek tek herhangi" | `any` |
| "bütün / topluca hepsi" (genelde System) | `all` |
| "herkes, giriş yapmadan" | `public` |
| "sadece kendi ekibinin / yönettiği şubenin / arkadaşının" | `<relation>'s` |

İlişki bazlı kapsam çıkarsa (`managedTeam's`) ilgili `relation` Faz 0'da
bildirilmiş olmalı; değilse ekle.

### 4. Kaynak (HANGİ kayıt türü?)
İşlemin üzerinde çalıştığı entity. Faz 0'daki entity'lerden biri olmalı.

### 5. Ek öbekler (varsa)
- **`on <ownership> <Hedef>`** — "şunun ÜZERİNE / şuna bağlı" (yorum bir fotoğrafa,
  fatura bir siparişe). Hedef var olan bir kayıttır.
- **`from <ownership> <Girdi>`** — "şundan üret / şuna dayanarak" (sipariş, onaylı
  talepten). Yeni kayıt kaynaktan türer.
- **`for <Aktör>`** — "şu kişi adına / şu kişiye" (sahip komutu veren değil).
- **`where <koşul>`** — "şu durumdaysa" ön-koşulu (yalnız draft'ken güncellenebilir →
  `where status = 'draft'`). Sağlanmayan kayıtta işlem reddedilir.

### 6. Kurallar (kullanıcının attığı koşullar)
Faz 1-2'de kullanıcının söylediği kısıtları buraya yerleştir:
- "sadece mesai saatinde" → `only during business-hours` (takvim Faz 0'da olmalı).
- "tutar 50000'i geçmiyorsa" → `only if <Entity>.amount <= 50000`.
- "sadece onaylı olanları" (sorguda filtre) → `only when <Entity>.status = 'approved'`.
- Zamanlanmış iş ("her gece çalışsın") → `schedule: every day at 03:00` (yalnız System).
- **Sorgu çeviriyorsan iki mikro-soru:** "sonuç nasıl **sıralı** dönsün?" →
  `order by <Varlık.alan> ascending|descending` · "sonuç **sınırlı** mı — ilk N?" →
  `limit to <N>`. Sorulmazsa kayıtlar rasgele sırayla/sınırsız döner
  (Envanter ○ `order by` / `limit to` satırı).

### 7. Başarı sonrası (`on success do`)
"… olunca ne olur?" sorusuyla yakala:
- **Durum değişir** → `calculate <Entity>.status = '<yeni durum>'`. Durum yaşam
  döngüsünü bu atamalardan türetiyoruz; sormayı atlama.
- **Bildirim gider** → `send <MesajTürü> to <Entity>.owner` (veya ilgili alıcı).
- **Yeni kayıt doğar** → `create <Entity> from <Entity>`.
- **Başka işlem otomatik tetiklenir** → `perform <DiğerİşlemAdı>` (arka plan; kullanıcı
  niyeti yok — örn. ödeme kaydı faturayı otomatik kapatır).
- **Alan türetilmiş/hesaplanan mı?** ("…toplamıdır / …dan hesaplanır / otomatik
  hesaplanır") → `calculate <Entity>.<alan> = <formül>` — formülü kullanıcıdan AL
  (aritmetik `+ - * /`, `sum of <koleksiyon.alan>`; `references/dsl-reference.md` §8).
  Durum-geçişi `calculate`'i bunun yerine GEÇMEZ; formülsüz bırakmak =
  **kaybolan-formül** (Envanter ★). Hesaplama komutlarında (`System calculates own
  Invoice`) `calculate` satırı `on success do` dışında, clause olarak da yazılabilir (D4).

### 8. İsim ver (İşlemAdı)
Anlamlı, benzersiz PascalCase ID: `SubmitRequest`, `ApproveRequest`,
`CreatePurchaseOrder`. Akış/süreç adlarıyla **çakışmamalı** (tek isim uzayı).
Keyword olmayan ad seç (`schedule`, `process` vb. yasak).

## Dinleme dedektörü — belirsizlik yakala, EARS'la sor
Çeviriden önce **dinle**: düz cümle çoğu zaman aktörü, koşulu veya hata-dalını
*söylemez*. Aşağıdaki dedektör **soruyu TETİKLER; cevabı ASLA doldurmaz** (büyü
yok — ilke-1). Skorlama yok, LLM-benzerlik yok; yalnız KAPALI kip-listesine bakılır.

**4 kapalı dedektör kategorisi:**

| # | Kategori | Kapalı kip-listesi (TR + EN) | Ne kaçırılıyor → sor |
|---|---|---|---|
| 1 | Öznesiz-edilgen | "…gider · …oluşturulur · …onaylanır · …gönderilir" · *is sent / is created / gets approved* | Aktör yok → "bunu HANGİ aktör yapıyor?" (Adım 1) |
| 2 | Belirsiz niceleyici | "genelde · bazen · çoğunlukla · duruma göre · gerekirse" · *usually / sometimes / as needed* | Dallanma gizli → "hangi koşulda böyle, hangisinde değil?" (Adım 6 / either-or) |
| 3 | Örtük gereksinim | "…olmalı · …lazım · …gerekir · sağlanmalı" · *should / must / needs to* | Kural var, biçimi yok → **yalnız SORU üretir, cevabı asla türetme** (ilke-1); teyitle Adım 6 guard'ına |
| 4 | Kapsam-boşluğu | "kaydı · talebi · siparişi" (kimin? belirsiz) · *the record / the request* | Ownership yok → "kimin kaydı — kendi / ilişki / herhangi?" (Adım 3) |

Bir dedektör soru ürettiyse → hibrit-onay kuyruğuna. Cevaplanmayan kategori = sessiz-eksik.

**GEÇİCİ EARS 5-kalıbı (çerçeve — SAKLANMAZ):** her operation için şu 5 aday-soruyu
tara. Bunlar yalnız *eksik-bilgiyi açığa çıkaran geçici çerçevedir*; teyitli cevap
ANINDA construct'a düşer ve **EARS cümlesi hiçbir yere yazılmaz** — "EARS = saklanan
artefakt" reddedildi (structural-first, ilke-2; saklanırsa ikinci bir hakikat-kaynağı
doğar, DSL ile drift eder).

1. **"X olduğunda?"** → tetikleyici / başarı-yolu → Adım 7 `on success do`
2. **"X hatalıysa / sağlanmazsa?"** → hata-dalı → Adım 6 guard (`where` / `only if`) — aşağıdaki taksonomi-mercekine
3. **"Y durumu açıkken farklı mı?"** → duruma-bağlı dal → `only when` / either-or
4. **"Sürekli mi geçerli?"** → değişmez ön-koşul → `only if` / calendar
5. **"İstenmeyen ne?"** → yasak / negatif-yol → note veya guard'ın ret-tarafı

**IF-kalıbı → 6'lı result-taksonomi merceği (sınıflandırma, construct DEĞİL):**
2. kalıbın ("hatalıysa?") cevabını, kullanıcının default KAPALI 6'lı sonuç-taksonomisinin
bir *koluna* yerleştir — yalnız hangi hata-dalının **cevapsız** kaldığını görmek için.
Yapısal ev yine `where` / `only if` guard'ı ya da note'tur; bu mercek gramer EKLEMEZ
(ilke-4). Business-elicitation'da anlamlı kollar:

- **Yetki yok** ("izni olmayan denerse?") → *Not Authorized* → ownership / `<ilişki>'s` kapsamı (Adım 3)
- **Girdi geçersiz** ("eksik/yanlış alanla gelirse?") → *Not Valid* → note / aday-alan sorusu
- **İş-kuralı engeli** ("bakiye yetmezse / durum uygun değilse?") → *Not Processable* → `where` / `only if` guard

**Cevapsız kol = ★-eksik** (Pre-Emit süpürmesinde teşhir). Taksonominin tam tanımı
ve wire-kod eşlemesi tech-katmanının konusudur; burada yalnız *hangi kolun
sorulmadığını* işaretler.

### ⚠ Arka plan / `System` / üretim işlemleri MUAF DEĞİLDİR (ölçülmüş kör nokta)

Bu mercek **her operation için** koşar — `System` aktörlü işler, `schedule:`'lı işler,
`perform` zincirinin ara halkaları ve "paket/özet/taslak üretir" sınıfı işlemler dahil.
SKILL.md Faz 3'teki *"arka plan işlemleri kullanıcıya endpoint gibi gösterilmez"* kuralı
**sunum** hakkındadır, **soru-muafiyeti değildir**; ikisi karıştırılırsa arka plan
işlemlerinin hata dalı sistematik olarak sorulmadan kalır (ölçüldü: altı `System`
işleminden yalnız birinin hata dalı vardı — o da tesadüfen).

İkinci kör nokta yapısaldır: arka plan işlemi **kullanıcı cümlesinden doğmaz** →
yukarıdaki dinleme dedektörlerinin hiçbirini tetiklemez → kayıt açılmaz → süpürme
temiz görünür (**sahte-sıfır**). Bu yüzden kapanışları dinlemeye değil, **model-türevli
ElicitationState kayıtlarına** bağlıdır (SKILL.md "İKİ BESLEME KANALI"): modeldeki her
operation için hata-dalı satırı otomatik açılır ve `cevaplandı` ∨ `atlandı` olmadan emit
geçmez.

Soruyu kullanıcıya **mekanik değil sonuç diliyle** sor:
> *"X üretilemezse (çökerse, boş dönerse) kullanıcı ne görsün, kayıt ne olsun?"*

⚠ **Yapısal sınır — `on failure` YOKTUR.** CommandDSL yalnız `on success do` dalını
tanır (§3 kapalı eylem listesi). Bu yüzden hata dalının evi:
- **önlenebilir** koşul ("bakiye yetmezse / durum uygun değilse") → guard (`where` /
  `only if` / `requires`) — işlem hiç başlamaz;
- **çalışma-anı başarısızlığı** ("üretici servis çöktü, paket oluşmadı") → **kanonik ev
  `note`** (makinece tech + QA'ya taşınır). İş gerçekten bir "başarısız" durumu tutuyorsa
  o durumu üreten **ayrı authored bir işlem** modellenir — ama `on success do` içine
  başarısızlık dalı UYDURMA.

Cevapsız bırakılırsa: zincir yarıda kalır, kayıtlar tutarsız kalır, QA o yolu test edemez,
geliştirici davranışı uydurur.

**Türkçe normal-form geri-okuma:** teyitli her cevabı DSL'i göstermeden düz cümleyle
geri oku — kalıp: *"… olduğunda sistem … yapacak; … ise reddedecek. Doğru mu?"*
(çalışan örnek: bu dosyanın sonundaki **Tam örnek** geri-okuması). Geri-okuma yalnız
teyit içindir, saklanmaz.

## Ölçülebilir başarı-ölçütü aday-sorusu
Operation'ın *davranışının doğru* olması ile *ürünün başarılı* olması ayrı şeylerdir:
çeviri birincisini garanti eder, ikincisini etmez. Elicitation'da bir kez şunu sor —
**"bunun işe yaradığını nasıl ÖLÇECEĞİZ?"** (technology-agnostik, ölçülebilir-sonuç
aday-sorusu).

- Yalnız **ölçülebilir** cevap yapısallaşır. Örn: "onay süresi 2 günden aza insin",
  "reddedilen talep oranı < %5". Ölçülebilir cevap artık birinci-sınıf bir
  **`outcome`**'a iner (aşağı bak) — note-yedeği yalnızca eşik/pencere çıkmayan
  yarı-ölçülebilir ifadeler içindir.
- **Ölçülemeyen SC KOYULMAZ** (correctness-over-completeness — ilke-3): "kullanıcı
  memnun olsun" ölçüte dönüşmez → ya somutlaştır ("memnuniyet ≥ 4/5"), ya da hiç yazma.
  Yarım / temenni-SC = yanlış-alan.
- **`outcome` artık shipped birinci-sınıf construct'tır** (ADR-0037; `SuccessCriteria`
  gramer-kuyruğu iddiası GÜNCEL DEĞİL). Ölçülebilir cevap `outcome <Ad> { measure
  '<metrik>' <op> <sayı> [unit …] [within …] }` olur; `covers` ile **bu op'a**
  (ve/veya ilgili flow/process'e) bağlanır. `outcome` **top-level**'dır — op'un içine
  gömülü bir clause DEĞİL. Tam sözdizimi: `references/dsl-reference.md` §11.

## Tür-uygunluk denetimi (kendi kontrolün — T1-T4)
Çevirdikten sonra doğrula:
- **Sorguda** `only during` / `only if` / `schedule` / `calculate` / `on success`
  **olamaz**; sorgu cümlesi `on/from/for/where` öbeği **almaz**.
- **Komutta** `order by` / `limit to` **olamaz**.
- `perform` hedefi **sorgu olamaz**.
- Aynı **4'lü imza (aktör+fiil+ownership+kaynak)** modelde yalnız bir kez (ID
  farklı olsa bile). Çakışma varsa kullanıcıyla netleştir — gerçekten iki ayrı iş mi?

## Yumurta-tavuk hatırlatması
Faz 2'de bu operation'ın **iskelet ID'si** kataloğa eklenmişti (gövdesiz). Şimdi
o ID'nin gövdesini bu prosedürle dolduruyorsun. ID'yi **değiştirme** — akış adımı
o ID'ye bağlı. İsim değişmesi gerekiyorsa akıştaki step referansını da güncelle.

## Tam örnek
Kullanıcı: *"Yönetici sadece kendi ekibinin izin talebini onaylayabilsin, mesai
saatinde; onaylanınca durumu onaylandı olsun ve çalışana haber gitsin."*

Çeviri:
1. Aktör = DepartmentManager · 2. Fiil = approves (komut; `verb approves`) ·
3. Ownership = `managedTeam's` ("kendi ekibinin") · 4. Kaynak = LeaveRequest ·
6. Kural = `only during business-hours` · 7. Başarı = durum + bildirim.

```
verb approves
ApproveLeave: DepartmentManager approves managedTeam's LeaveRequest
only during business-hours
on success do
    calculate LeaveRequest.status = 'approved'
    send ApprovalNotice to LeaveRequest.owner
```
Kullanıcıya geri okuma (DSL'i DEĞİL): *"Yönetici, kendi ekibinin izin talebini
mesai saatinde onaylar; onaylanınca durum 'onaylandı' olur ve çalışana haber gider.
Doğru mu?"*
