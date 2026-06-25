# Örnekler

- `profile.json` — doldurulmuş neutral profil (greenfield, **TAM** eşleşme: techgen 0.2.0).
  `_match` satırı eşleşmenin hangi snapshot eksenlerinden çıktığını gösterir (kanıt).
- `gen.config.json` — yukarıdaki profilden Faz 4'te türetilen techgen config'i. Sadece snapshot
  `inputs.config.schema`'da tanımlı alan (`DbProvider`) var; profilin geri kalanı üreteç-sabiti.

> KISMİ örnek: profil.persistence.dbProvider = "mysql" olsaydı → dil/transport/mimari ✓ ama dbProvider
> snapshot dışı → **KISMİ**; Faz 3'te dispozisyon (postgres'e çek vs ertele) + `improvements.md`'ye
> "techgen'e mysql provider" kaydı.
>
> YOK örnek: transport = "gRPC" olsaydı → `boundaries`'te "non-REST desteklenmez" → **YOK**;
> bloklayan eksen = transport, en yakın aday yok (tek üreteç REST-only).
