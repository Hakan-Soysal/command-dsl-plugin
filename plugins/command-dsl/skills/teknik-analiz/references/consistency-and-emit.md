# Tutarlılık Self-Check + Emit

> Üretimden ÖNCE oku. Doğrulayıcıyı çalıştırmadan önce katmanlar-arası bütünlüğü elle denetle
> (ucuz hataları erken yakala), sonra dependency-order emit et.

## A. Emit öncesi self-check (= "hatasız")

Doğrulayıcı bunların çoğunu yakalar; ama emit'ten önce gözden geçir — düzeltmesi ucuz:

**Linked bütünlük (ZORUNLU):**
- [ ] Model başında `contract './<...>.operations.json'` var; JSON `meta.schemaVersion == 2`.
- [ ] Her `operation` bir `realizes <BizOpID>` taşıyor (saf-teknik op'lar hariç — onlar bilinçli).
- [ ] Her business write-set entity'si, op'unun **module'ünde** `realizes` ile karşılanmış
      (entity-kapsama; en sık error kaynağı).

**Referans bütünlüğü:**
- [ ] Her `access` entity'si, her `throws` error'u, her `emits`/`on` event'i, her `calls`
      `System.Op`'u tanımlı bir hedefe çözülüyor (dangling → linker error).
- [ ] `idempotent by <k>` / `paginated by <field>` anahtarları gerçek param/alana çözülüyor.
- [ ] Cross-module bağlar **ID + sourceOfTruth** (entity-tipli cross-module alan YOK).

**Eksen tutarlılığı:**
- [ ] Görünürlük: her op'ta serving **veya** `@internal` **veya** `on`.
- [ ] Cross-module write içeren op'ta `consistency async|durable` bildirildi.
- [ ] ownership/roles iş'ten **geniş** değil (geniştiyse kullanıcı onayı belgeli).
- [ ] `permit when` op'unda **tam bir** write-hedefi var (resource çözülebilir).
- [ ] pagination yalnız `list of` dönen **sorgu**da; `concurrency` yalnız sahip-olunan entity'de.

Bir ihlal varsa **emit etme** — düzelt, tekrar denetle.

## B. Dependency-order emit

İnsana büyük-resim→detay doğal gelir; ama dosya geçerli olsun diye **referans verilen önce**
yazılır:
```
contract / standalone → rolemap → import → extension → deployable → module/external/uncharted
```
Module içinde: `error`/`event`/`type`/`enum` (op'ların referansı) → `entity` → `operation`.

## C. Module-bazlı dosya bölme (tip bazlı DEĞİL)

- **Tek-module analiz** → tek `<module>.tcdsl` (içinde dependency sırası).
- **Çok-module analiz** → module kadar dosya (ör. `orders.tcdsl`, `billing.tcdsl`) + paylaşılan
  saf-teknik tipler için `shared.tcdsl`. `contract` her dosyada bildirilir (linked çözüm doc-başına).
- `operations.tcdsl` / `entities.tcdsl` gibi **tipe göre dosya AÇMA.**
- Aynı isim uzayında çakışma olmasın: farklı module'lerde aynı `type`/`enum`/`entity` adını
  tekrar tanımlama (cross-document çift-tanım çakışır — `examples/` her dosyayı izole tutar).

## D. Üretim çıktısı

Çıktı modunu kullanıcı seçer ama **DSL her zaman linked** ve module-bazlıdır. İstenirse yanında
okunur bir özet doküman üretilebilir; ama tek **doğrulanan** çıktı `.tcdsl`'dir. Üretimden hemen
sonra **doğrulayıcıyı çalıştır** (`validator.md`).
