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

### 7. Başarı sonrası (`on success do`)
"… olunca ne olur?" sorusuyla yakala:
- **Durum değişir** → `calculate <Entity>.status = '<yeni durum>'`. Durum yaşam
  döngüsünü bu atamalardan türetiyoruz; sormayı atlama.
- **Bildirim gider** → `send <MesajTürü> to <Entity>.owner` (veya ilgili alıcı).
- **Yeni kayıt doğar** → `create <Entity> from <Entity>`.
- **Başka işlem otomatik tetiklenir** → `perform <DiğerİşlemAdı>` (arka plan; kullanıcı
  niyeti yok — örn. ödeme kaydı faturayı otomatik kapatır).

### 8. İsim ver (İşlemAdı)
Anlamlı, benzersiz PascalCase ID: `SubmitRequest`, `ApproveRequest`,
`CreatePurchaseOrder`. Akış/süreç adlarıyla **çakışmamalı** (tek isim uzayı).
Keyword olmayan ad seç (`schedule`, `process` vb. yasak).

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
