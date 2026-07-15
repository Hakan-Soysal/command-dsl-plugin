# Tutarlılık Self-Check + Emit

> Üretimden ÖNCE oku. Doğrulayıcıyı çalıştırmadan önce katmanlar-arası bütünlüğü elle denetle
> (ucuz hataları erken yakala), sonra dependency-order emit et.

## A. Emit öncesi self-check (= "hatasız")

Doğrulayıcı bunların çoğunu yakalar; ama emit'ten önce gözden geçir — düzeltmesi ucuz:

**Linked bütünlük (ZORUNLU):**
- [ ] Model başında `contract './<...>.operations.json'` var; JSON `meta.schemaVersion == 3`.
- [ ] Her `operation` bir `realizes <BizOpID>` taşıyor (saf-teknik op'lar hariç — onlar bilinçli).
- [ ] Her business write-set entity'si, op'unun **module'ünde** `realizes` ile karşılanmış
      (entity-kapsama; en sık error kaynağı).

**Referans bütünlüğü:**
- [ ] Her `access` entity'si, her `throws` error'u, her `emits`/`on` event'i, her `calls`
      `System.Op`'u tanımlı bir hedefe çözülüyor (dangling → linker error). `calls` hedefi
      external/uncharted boundary-op'u **veya** kardeş `module`'ün `operation`'ı olabilir.
- [ ] `idempotent by <k>` / `paginated by <field>` / `access … by <param>` anahtarları gerçek
      param/alana çözülüyor.
- [ ] Cross-module bağlar **ID + sourceOfTruth** (entity-tipli cross-module alan YOK).
- [ ] `rule`'un her state-kökü **bildirilmiş** (`access` entity/`as`-alias veya `calls … as`-alias);
      `validation` yalnız `op.params`'a bakıyor (state ref yok). (ADR-0031; aksi → error.)

**Eksen tutarlılığı:**
- [ ] Görünürlük: her op'ta serving **veya** `@internal` **veya** `on`.
- [ ] Cross-module **write** içeren op'ta `consistency async|durable` bildirildi. (Cross-module
      **read** = `calls <Module>.<Query>`; hedef **query** + **non-`@internal`**; consistency-garantisiz
      TÜREV — ayrı `consistency` gerekmez.)
- [ ] ownership/roles iş'ten **geniş** değil (geniştiyse kullanıcı onayı belgeli).
- [ ] `own`/`<relation>` ownership'li her op'ta **sütun bağı** var (`by <Entity>.<alan>` — entity
      op'un `access`'inde, alan skaler/enum; bağsız = warning → kullanıcıya soruldu). (ADR-0038.)
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

> ⚠ **MANİFEST KISITI (kritik):** `manifest.json` üreteci (`emit-manifest.mjs` → `emitManifest`)
> **YALNIZ tek kök dokümanı** gezer (ADR-0019: import edilen içerik manifest'e girmez). Bu yüzden
> bir sistemin **tüm domain module'leri TEK kök `.tcdsl` dosyasında** olmalıdır (örnek/fixture'lar
> böyle: `slice.tcdsl`, `order-management.tcdsl` — birden çok `module` tek dosyada). Domain
> module'lerini ayrı dosyalara bölersen manifest **eksik** olur; `emit-manifest.mjs` bunu **hata
> verir** (kök dışı `module` → exit 2), sessiz partial üretmez. `import` yalnız **extension-pack**
> (annotation şeması) içindir — pack dosyaları `module` değil yalnız `extension` bildirir, manifest'e
> girmez. (Bu kural toolchain'in bugünkü gerçeğidir: çok-doküman manifest birleştirme YOK.)

- **Tek-module analiz** → tek `<module>.tcdsl` (içinde dependency sırası).
- **Çok-module analiz** → module'leri **tek kök `.tcdsl`'de** topla (yukarıdaki manifest kısıtı);
  paylaşılan saf-teknik tipler aynı dosyada veya import edilen extension-pack'te. `contract` kökte
  bildirilir.
- `operations.tcdsl` / `entities.tcdsl` gibi **tipe göre dosya AÇMA.**
- Aynı isim uzayında çakışma olmasın: farklı module'lerde aynı `type`/`enum`/`entity` adını
  tekrar tanımlama (cross-document çift-tanım çakışır — `examples/` her dosyayı izole tutar).

## D. Üretim çıktısı

Çıktı modunu kullanıcı seçer ama **DSL her zaman linked** ve module-bazlıdır. İstenirse yanında
okunur bir özet doküman üretilebilir; ama tek **doğrulanan** çıktı `.tcdsl`'dir. Üretimden hemen
sonra **doğrulayıcıyı çalıştır** (`validator.md`).
