# Profil Keşfi — neutral profil şeması + keşif lensleri

Profil, hedefin **dil-/mimari-/altyapı-bağımsız** tanımıdır. Domain DSL'in (ne) tekrarı DEĞİL;
üretecin **girdi sözleşmesi** (nasıl / ne ile). Eşleştirme için tam domain modeli gerekmez; profil yeter.

## Şema

```jsonc
{
  "mode": "brownfield | greenfield",
  "intent": "<domain / niyet özeti>",
  "integrationMode": {
    "value": "integrated-module | standalone",
    "source": "declared-fact <nereden> | elicited",
    "rationale": "<mevcut app HOST mu (kod ona girer) yoksa adjacent mi>",
    // yalnız brownfield+integrated-module'de doldurulur — host kompozisyon noktaları (paylaşım sözleşmesi):
    "hostComposition": {
      "entry": "<host giriş dosyası: Program.cs / Startup.cs>",
      "diContainer": "<IServiceCollection kurulumu nerede>",
      "dbContext": "<host DbContext(ler) + connection adı; techgen App.AppDbContext'i benimser>",
      "authPipeline": "<auth/JWT pipeline nerede — host-owned>",
      "csprojKind": "<Sdk.Web host mu, yoksa lib mi>"
    }
  },
  "language": {
    "value": "<dil> | unconstrained",
    "source": "declared-fact <nereden> | elicited",
    "rationale": "<neden bu kısıt / neden serbest>"
  },
  "architecture": { "value": "hexagonal|DDD|VSA|3-tier|actor|...", "source": "..." },
  "transport":    { "value": "REST|gRPC|GraphQL|queue", "source": "..." },
  "persistence":  { "dbProvider": "<engine>", "source": "..." },
  "subDetails":   { "<param>": "<değer>", "...": "üreteçleri ayıran ince param'lar" }
}
```

**Kural:** her alanda `source` zorunlu. Brownfield'de `declared-fact` + nereden bulduğun
(paket/manifest/config/kod). Greenfield'de `elicited`. **Tahmin/uydurma yok** — bilinmeyeni sor.
`integrationMode` brownfield'de **MUTLAKA** elicit edilir (sessiz standalone yasak, Faz 0b); greenfield'de
genelde standalone (yeni app) ama yine de onaylanır (Faz 4.5).

## Emission-topology keşfi — `integrationMode` (brownfield, Faz 0b)

Mevcut app, üretilen kodun **HOST'u mu** (integrated-module) yoksa **komşu/ayrı sistem mi** (standalone)?
Bu eksen sorulmazsa executor standalone varsayar ve cross-system friction üretir.
- **integrated-module** seçildiyse, host'un **kompozisyon noktalarını** keşfet ve `hostComposition`'a yaz:
  host entry (`Program.cs`/`Startup`), DI container, **DbContext(ler) + connection adı**, auth/JWT
  pipeline, csproj türü (`Sdk.Web` host mü, lib mi). Bunlar handoff'ta paylaşım sözleşmesi olur.
- **Gerçekçilik sınırı (techgen 0.2.x — abartma):** dikiş `AddGenerated()`/`MapGenerated()` mevcut +
  `Program.cs`/`csproj` "yoksa-üret" (host varsa üretilmez). AMA techgen **kendi `App.AppDbContext`'ini**
  üretip kaydeder (`UseNpgsql` + `"Default"` connection) → "shared DbContext" = **host techgen'inkini
  benimser** (+ `"Default"` connection string sağlar), techgen host'un mevcut DbContext'ine *bağlanmaz*.
  Namespace `App` (rootNamespace knob yok). Auth paylaşımı gerçek (pipeline host-owned). Bu sınır
  handoff `hostComposition` sözleşmesinde açıkça yazılır; host-binding executor + devret-sonrası kapıda
  doğrulanır. (Daha temiz integrated-module: descriptor `emissionModes` + `rootNamespace`/host-DbContext
  knob'ları gelince — `capability/improvements.md`.)

## Brownfield keşfi — lens: `architecture-reviewer` (Faz 0 "understand the system")

Mevcut app'ten TÜRET; her bulguyu kaynağıyla kaydet:
- **Dil/framework/persistence** → paket/proje dosyaları (`*.csproj`/`package.json`/`go.mod`),
  bağımlılık manifestleri, ORM/driver paketleri (ör. `Npgsql` → postgres).
- **Transport** → endpoint tanımları (REST controller/minimal API vs gRPC `.proto` vs GraphQL şema vs
  kuyruk consumer'ı). Üretecin desteklediği transport'la eşleşmiyorsa bu Faz 2'de YOK/KISMİ sinyalidir.
- **Mimari** → proje/katman yerleşimi (tek-app modular-monolith mı, çok-projeli Clean/hexagonal mi),
  deploy sınırı (tek deployable mı). architecture-reviewer'ın "deploy sınırı / data-consistency"
  okuması burada profili keskinleştirir.
- **subDetails** → config dosyaları (id stratejisi, hata zarfı şekli, dış-client kurulumu).

## Greenfield keşfi

Niyet/gereksinimden elicit et — **düz dille**, üreteç-jargonu sormadan:
- "Hangi dil/platform zorunlu mu, yoksa serbest mi?" → `language`.
- "Tek uygulama mı, servisler mi? Katmanlı mı, dilim-bazlı mı?" → `architecture`.
- "Dışarı nasıl konuşacak — REST mi, başka bir protokol mü?" → `transport`.
- "Hangi veritabanı?" → `persistence.dbProvider`.
- Bilinmeyeni **sor**, varsayma. Kullanıcı "farketmez" derse → `unconstrained` (gerekçesiyle).

## Profil → config sözleşmesi — lens: `api-and-interface-design`

- **Contract First / Consistent Error Semantics:** profilin üretecin config şemasına map edilen kısmı
  (techgen'de `gen.config.json`) açık bir kontrattır; sadece snapshot'ın `inputs.config.schema`'sında
  tanımlı alanları doldur (bkz. `capability-and-matching.md`).
- **Şişirme yok:** profil zengin olabilir ama config sadece üretecin OKUDUĞU alanları taşır; gerisi
  üreteç-sabiti (techgen: Minimal API + CQRS + EF, REST-only) ya da boundary'dir.

## Anti-pattern'ler
- Sessiz profil: belirsiz `dbProvider`/`transport`'u doldurmadan geçmek.
- Domain'i profile sızdırmak: entity/operation detayını profile kopyalamak (o `manifest.json`'da; profil sadece "nasıl/ne ile").
- Profili üretece göre eğmek: keşfi nötr tut; eşleştirmeyi Faz 2 yapar (profili .NET'e göre yazma).
