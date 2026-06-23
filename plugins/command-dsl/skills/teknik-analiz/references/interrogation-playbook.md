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
- **⚠ Sınır-aşan navigasyon:** "şu kaydın içinden öteki module'ün kaydına gitmek" → yasak
  (error). ⟦data ownership: veri kimin? başka module'e yalnız `calls` ile sor.⟧

## C. Operation imzası & access (Faz 3)

- "Bu işlem teknik olarak **neyi girdi alır, ne döndürür**?" ⟦interface stability: bu imza
  client'lar tarafından mı tüketilecek? geriye-uyumlu evrilebilir mi?⟧
- "Hangi kayıtları **okuyor**, hangilerini **yaratıyor/güncelliyor/siliyor**?" → CRUD access.
- **⚠ CQRS kayması:** iş'in "sorgu" dediği işleme yazma verme. **⚠ Access yükseltme:** iş'in
  salt-okunur saydığı kaydı tech'te yazıyorsan → **bu kasıtlı mı?** diye AÇIKÇA sor (güvenlik).

## D. Yetki — üç eksen (Faz 4)

- **roles (KİM):** "Bunu kim çağırabilir?" ⟦least privilege: gereğinden geniş yetki mi?⟧
- **ownership (HANGİ satır):** "Herkesinkini mi, sadece kendi/yönettiği kaydı mı?"
- **permit (öznitelik):** "Rol ve sahiplik dışında bir koşul mu var (ör. sadece kendi bölgesi)?"
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

## Kapanış — warning'ler ikinci tur sorgudur

Doğrulayıcı warning verdiğinde (ownership-sapma, access-sapma, mode-eksik, görünürlük-belirsiz,
**kapsam-eksik**), bunu **kullanıcıya geri sor** — warning'ler senin discharge etmediğin
belirsizlikleri işaret eder. 0 error'a indir; warning'leri ya gider ya da "bilinçli, kabul
ediyorum" onayıyla belgele.

**Kapsam (op-düzeyi fidelity):** Linked doğrulayıcı, sözleşmedeki (operations.json) **hiçbir
tech operation'a bağlanmamış** business-op'ları tek-toplu warning olarak listeler. Bu, iş'in tam
karşılanıp karşılanmadığının ölçüsüdür: *"Bu business-op'ları bu tasarım kapsamıyor — kapsam-dışı
mı (bilinçli erteleme), yoksa atladık mı?"* Atladıysan ekle; ertelediyse kullanıcı onayıyla belgele.
