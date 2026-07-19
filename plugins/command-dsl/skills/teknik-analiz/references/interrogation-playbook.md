# Sorgulama Kitabı (Interrogation Playbook)

> Her doğrulayıcı ekseni için **düz-dil soruları** + yakaladığı **anti-pattern**. DSL-jargonu
> kullanma; somut cümleden construct'ı *sen* türet. Güvenlik-zayıflatan eksenlerde (ownership/
> roles/access) **varsayım yapma — sor**. AddyOsmani `architecture-reviewer`/`api-and-interface-
> design`'tan damıtılmış generic lens'ler ⟦köşeli⟧ içinde gömülü.

## A. Module / deployable sınırı (Faz 1)

- "Şu iki iş **aynı anda, ya hep ya hiç** mi olmalı, yoksa biri olup diğeri biraz sonra olabilir mi?"
  → "sonra olabilir" = sınır oradadır (ayrı module). ⟦blast radius: bir module çökerse hangi işler durur?⟧
- "Bu işi yapanla şu işi yapan **ayrı takımlar/ayrı hızlarda** mı evrilir?" → ayrı deployable adayı.
- **⚠ Module şişmesi:** her şeyi tek module'e tıkma. ⟦"Bu sınır tek bir nedenle mi değişir?" —
  tek-sorumluluk⟧. Transaction sınırı = module; emin değilsen "bunlar tek transaction mı?" diye sor.

## B. Entity & veri sınırı (Faz 2)

- "Bu kayıt **başka bir sınırdaki** kayda bağlanıyor mu?" → ID + sourceOfTruth (entity-tipi DEĞİL).
- "Bu kayıt için **istisnasız her zaman** doğru kalması gereken bir şey var mı?" → invariant.
- "Aynı kaydı iki kişi aynı anda değiştirirse, sonradan yazan öncekini ezmemeli mi?" → concurrency.
- "Bu alanlar arasında **kişisel/hassas veri** (kimlik, sağlık, iletişim) ya da **şifre/sır** var mı?"
  → alan-önü `@sensitivity.tag`/`@crypto.encrypted` (authored). ⟦data classification: hassas alan
  işaretsiz kalmasın; saklama/silme gerçeklemesi üreteç-politikasıdır — kalıcı kural gerekirse op-`note`.⟧
- "Bir alanın **izinli değer-uzayı** dar mı — sayısal **aralık** (yaş 13-120) ya da **kapalı küme/durum**
  (∈ {Taslak, Gönderildi})?" → alan-sonu `in <lo>..<hi>` (range, yalnız sayısal) / `in {A|B|C}` (union,
  String/enum). ⟦domain integrity: izinli aralık/küme dışı değer engellensin — NotValid payload'ı buradan.⟧
  ⚠ Tip **enum** ise union üyeleri o enum'un **alt-kümesi** olmalı (`union-not-in-enum` error); range
  sayısal, union String/enum. Değer-uzayını **sor, uydurma**; sınır belirlenince boundary-value'yu da sor.
- **⚠ Sınır-aşan navigasyon:** "şu kaydın içinden öteki module'ün kaydına gitmek" → yasak
  (error). ⟦data ownership: veri kimin? başka module'e yalnız `calls` ile sor.⟧

## C. Operation imzası & access (Faz 3)

- "Bu işlem teknik olarak **neyi girdi alır, ne döndürür**?" ⟦interface stability: bu imza
  client'lar tarafından mı tüketilecek? geriye-uyumlu evrilebilir mi?⟧
- "Bu işlem **tek bir kayıt** döndürüyor — o kaydı **ne belirliyor**?" ⟦determinism: kaydın kendi
  ID'si mi, yoksa onu var eden kaydın ID'si mi (sepet↔kullanıcı)? Belirleyici yoksa tüketici
  "ilk kaydı al"a düşer = prod'da yanlış kayıt.⟧ **İstisna:** net filtre belirteci (son/ilk/en
  büyük/en küçük) ya da ephemeral türev (şu anki hava/kullanım) — ikisinde de **ölçütü** `note`'a yaz.
- "Hangi kayıtları **okuyor**, hangilerini **yaratıyor/güncelliyor/siliyor**?" → CRUD access.
- "Bir **girdi-parametresinin** izinli aralığı/kümesi var mı (miktar 1-100, tür ∈ {A,B})?" → param-sonu
  `in <lo>..<hi>` / `in {A|B|C}`. ⟦input contract: sınır-dışı değer NotValid(400) dönmeli — makine-okunur
  `op.violations[]` (`ruleId=<param>.<kind>`) üreteç/tüketiciye taşınır.⟧ Param adları tekil (dup=error).
- "Bu işlemin çağrılması **denetim kaydı** ister mi (finansal, kişisel-veri erişimi)?" →
  `@audit.logged` (op-önü, authored). ⟦compliance: kim-neye-ne-zaman erişti izi gerekli mi?⟧
- **⚠ CQRS kayması:** iş'in "sorgu" dediği işleme yazma verme. **⚠ Access yükseltme:** iş'in
  salt-okunur saydığı kaydı tech'te yazıyorsan → **bu kasıtlı mı?** diye AÇIKÇA sor (güvenlik).

## D. Yetki — üç eksen (Faz 4)

- **roles (KİM):** "Bunu kim çağırabilir?" ⟦least privilege: gereğinden geniş yetki mi?⟧
- **ownership (HANGİ satır):** "Herkesinkini mi, sadece kendi/yönettiği kaydı mı?"
- **ownership sütun bağı (HANGİ sütun):** cevap `own`/`<relation>` ise devam sor — "kaydın
  sahibini hangi alan tutuyor (`customerId`? `orgId`?)" → `by <Entity>.<alan>, …`. ⟦bağsız
  `own`/`<relation>` = validator warning; üreteç filtre sütununu tahmin eder — sızıntı riski.⟧
- **axis — delege-küme denotasyonu (ADR-0040):** cevap `<relation>` ise (own DEĞİL — "kendi kaydı
  değil, yetkilendirildiği/delege edildiği kayıtlar") **zorunlu devam-bloku**: "Bu delege küme
  **hangi tabloda** tutuluyor? O satırın **hangi sütunu** çağıranla eşleşiyor — çağıranın **hangi
  alanıyla** (`scoped by <sütun> = caller.<alan>`)? **Hangi sütun erişilen hedefi gösteriyor** —
  delege edilen müşteri/marka hangi kolonda (projeksiyon → `yields`)? Sette olmak için satır **hangi
  koşulu** sağlamalı — iptal/pasif satırlar girmesin (→ `when`)?" → top-level `axis` + op'ta
  `ownership <ad> by <Entity>.<alan>`. ⟦sormazsan `ownership <ad>` yalnız bir İSİM kalır — hangi
  satırların sete girdiği sözleşmede hiç yazmaz; tüketici seti TAHMİN eder (delege-olmayan kayıt sızar).⟧
- **principal — özne şeması (ADR-0040):** cevapta `actor.*` doğuran bir koşul geçiyorsa (çağıranın
  bölgesi/organizasyonu/departmanı) **devam-bloku**: "Çağıranın kimliği (token/oturum claim'i)
  **hangi adla** geliyor (`identity`)? Bu öznitelik **hangi tabloda, hangi alanda** duruyor
  (`binds <Module>.<Entity> by <alan>`)? Bu özne **hangi tech rolleriyle** çağırır (`roles` —
  authored; op'un roles'undan ÇIKARIM yapma)?" → top-level `principal`. ⟦bildirilmezse `actor.*`
  OPAK kalır; yazar runtime karşılığı OLMAYAN bir attribute uydurur — çağıran-bağımsız denetim.⟧
- **permit (öznitelik):** "Rol ve sahiplik dışında bir koşul mu var (ör. sadece kendi bölgesi)?"
  Sorguda da yazılabilir (ADR-0040: sorguda tek read-hedefi = `resource`; manifest `effect:'filter'`
  → üreteç `.Where` emit eder).
- **⚠ Yetki gevşetme:** ownership'i iş'ten geniş yapıyorsan (`own`→`any`) ya da rol yetkili
  aktör kümesini aşıyorsa → **weakening**. Bunu asla sessiz geçme; "iş analizi daha dar diyor,
  genişletme bilinçli mi?" diye sor.

## E. Hata & sonuç (Faz 5)

- "Bu işlem **hangi ayırt-edilebilir** şekillerde başarısız olur?" → adlı `error` + `throws`.
  ⟦failure modes: happy-path dışında ne kırılır?⟧
- "Bu kontrol **isteğin kendisiyle** mi ilgili (yanlış format) yoksa **sistem durumuyla** mı
  (yetersiz bakiye)?" → validation (400) vs rule (422).
- **⚠ validation/rule karışması:** "retry edilse, veri değişmeden, hep mi başarısız?" → evet =
  validation; "veri değişirse başarılı olabilir" = rule.
- **rule-realize — adlı iş-kuralı (ADR-0042):** sözleşme op'a `requires <Ad>` bağlıyorsa (guards
  `kind:"rule"`) **zorunlu devam-bloku**: "Sözleşme bu işleme '<Ad>' kuralını bağlıyor; note'u
  şöyle diyor: '…' — doğru mu? Bu kural **bir kaydın var/yok olmasına** mı bakıyor, **bir sayının
  eşiği aşmasına** mı, yoksa **isteğin kendi verisiyle eşleşen kayıt aramaya** mı? Kuralın taradığı
  **koleksiyon hangi tabloda** — ön-daraltma var mı (yalnız bu org'un satırları → `by <key>`)?
  İki tablo bağlanıyorsa **hangi kolon hangi kolona** eşleniyor (FK)? Eşik sabit bir **sayı** mı,
  yoksa bir **alandan** mı geliyor (tier limiti)?" → `access { reads <E> as <alias> [by <key>] }`
  + `realizes rule <Ad> { [not] exists <alias> where … / count <alias> [where …] <cmp> <sayı|alan> }`.
  ⟦sormazsan kural ya seam'e düşer ya hiç enforce edilmez — `rules[].body` artık `null` olabilir;
  yapısal kaynak TECH'tir.⟧ Aynı kural op'a göre **farklı** realize edilebilir (org-fazı vs app-fazı
  sayımı) — her realize-eden op'ta ayrı sor. Gövdesiz işaret (`realizes rule <Ad>` / çoklu-ad) =
  bilinçli devir → "hangi mekanizma kapsıyor?" diye sorup belgele.

## F. Etkileşim & tutarlılık (Faz 6)

- "Bu işlem **dış bir sistemi/başka bir module'ü** çağırıyor mu?" → `calls`. "Çağrı yapıldıktan
  sonra **bizim taraf** başarısız olursa, o dış işi **geri almak** gerekir mi?" → compensate (saga).
- "Cross-module yazma **anında görünmeli** mi yoksa **arka planda dayanıklı** mı yeterli?" →
  consistency async/durable. ⟦failure modes: yarıda kalırsa sistem tutarlı kalır mı?⟧
- "Aynı çağrı **ağ hatası yüzünden iki kez** gelirse ne olmalı?" → idempotent by.
  ⟦retry-safety: at-least-once teslimat varsayımı.⟧
- "Bu işlem bir **olay yayıyor** mu (başkaları haber almalı)? Yoksa bir olayı **dinliyor** mu?" →
  emits / on.
- "Liste dönüşü **çok büyüyebilir** mi (sayfalama)?" → paginated by. ⟦performance: sınırsız liste
  riski.⟧
- "Bu işlem **nasıl başlatılıyor** — kullanıcı mı, zamanlanmış mı, kuyruk mu?" → @rest/@internal/
  @trigger; görünürlüğü açıkça yazdır.

## G. External / Uncharted (Faz 7)

- "Bu **bizim yazdığımız** bir sistem mi, **3.partinin** mi (Stripe), yoksa **şirkette var ama
  dökümante edilmemiş** mi (mainframe)?" → module vs external vs uncharted.
- "O sistemin **hangi uçlarını** çağırıyoruz, çağırırken **bildiğimiz input kuralları** neler?" →
  boundary op + serving + validation (caller-side fail-fast).

## H. Guarantee — çapraz-kesen güvence (Faz 8, opsiyonel)

- "Bu tasarımda **birden çok işlemi kesen**, tek bir kayıt/kuralla sınırlı olmayan bir güvence var
  mı (ör. 'bir hesabın bakiyesi asla negatif olamaz')?" → `guarantee <Ad> "<insan-metni>"` + onu
  ZATEN tutan yükümlülükleri `by invariant/guard/throws/operation` ile eşle. ⟦traceability: bir
  yükümlülük silinir/yeniden-adlanırsa validator drift'i derleme-zamanı yakalar.⟧ **Yoksa atla** —
  bu faz yeni mantık üretmez, yalnız yazılmış yükümlülükleri haritalar.
- "Üst-akışta bir gereksinim/hedef ID'si var mı (REQ-…)?" → `traces "REQ-…"`. Yapısal yükümlülük
  yoksa salt-proza güvenceyi op-`note`'a düşür (REQ-ID'yi not metnine yaz) — izlenebilirliği
  sessizce düşürme.
- **⚠ Garantiyi mantık zannetme / gereksiz sarma:** guarantee'ye kural YAZMA (mantık
  invariant/rule/throws'ta kalır); **tek-op yerel** kuralı guarantee'ye sarma. Yükümlülüksüz
  salt-proza garanti → warning (`note` kullan); yinelenen ad → error.

## Kapanış — warning'ler ikinci tur sorgudur

Doğrulayıcı warning verdiğinde (ownership-sapma, access-sapma, mode-eksik, görünürlük-belirsiz,
**kapsam-eksik**, **`role-mismatch`** [result-filter guard'ı fail-semantiğine eşlenmiş — eşlemeyi
KALDIR, üreteç filtreyi operations.json'dan uygular, ADR-0039], **koşulsuz-axis** [`when`-siz axis:
kapsamdaki HER satır sete girer — yaşam-döngüsü durumu varsa `when` ekletin], **opak-actor**
[principal'sız `actor.*` — principal bildirimini sor, §D]), bunu **kullanıcıya geri sor** —
warning'ler senin discharge etmediğin belirsizlikleri işaret eder. 0 error'a indir; warning'leri
ya gider ya da "bilinçli, kabul ediyorum" onayıyla belgele.

**T4 realize-predikat ERROR'ları da ikinci tur sorgudur** (error olsa da düzeltmesi çoğu kez
**authored bilgi** ister — uydurup kapatma, sor):
- **alias-çözümü** (`'X' op'un 'access … as' alias'ı değil`) → "kural hangi tabloyu tarıyor,
  ön-daraltması var mı?" diye sorup `access { reads <E> as <alias> [by <key>] }` bildirt.
- **kök-çözümü** (`'X' kökü çözülemedi`) → o değer nereden geliyor: op param'ı mı, okunan bir
  kayıt mı (`access…as`), başka module'ün sorgusu mu (`calls…as`)? — kullanıcıdan al.
- **kartezyen-barı** (`iç 'exists' FK-eşitliğiyle bağlanmamış`) → "bu iki tablo **hangi kolonla**
  birbirine bağlanıyor?" diye FK çiftini SOR (ad-benzerliğinden çıkarma).
- **count-sağ-skaler** → "eşik sabit sayı mı, hangi alandan geliyor?" (sayılan alias'ın kendisi
  sağda olamaz).
- **`realizes rule <Ad>` ad-çözümü error'u** (sözleşmede yok) → typo mu, sözleşme mi bayat?
  Sözleşmeyi yeniden ürettir ya da adı düzelt.
- **coverage warning'i** (`requires edilen şu rule'lar … realize edilmemiş`) → her ad için:
  gövdeyle mi realize edilecek, gövdesiz devir mi (mekanizmasını belgele), bilinçli erteleme mi?

**Kapsam (op-düzeyi fidelity):** Linked doğrulayıcı, sözleşmedeki (operations.json) **hiçbir
tech operation'a bağlanmamış** business-op'ları tek-toplu warning olarak listeler. Bu, iş'in tam
karşılanıp karşılanmadığının ölçüsüdür: *"Bu business-op'ları bu tasarım kapsamıyor — kapsam-dışı
mı (bilinçli erteleme), yoksa atladık mı?"* Atladıysan ekle; ertelediyse kullanıcı onayıyla belgele.
