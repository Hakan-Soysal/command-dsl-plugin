# `_template/` — Yeni Skill İskeleti

Aileye yeni bir skill eklerken bu iskeleti **kopyala** ve doldur. Kurallar: `../CONVENTIONS.md`.

> ⚠ Bu dizin **repo kökündedir, `plugins/.../skills/` altında DEĞİL** — bilerek: `skills/` altındaki
> her `SKILL.md` gerçek skill olarak yüklenir/tetiklenir. İskelet orada olsaydı yanlışlıkla çağrılırdı.
> İskelet kökte = saf scaffolding; plugin-install kullanıcılarına da gitmez (yalnız `plugins/<plugin>/` ship olur).

## Kullanım

```
cp -R _template plugins/command-dsl/skills/<yeni-skill-adı>
```
Sonra `CONVENTIONS.md §11 — Yeni skill checklist`'i izle:

1. **Ad:** Türkçe görev adı, `-dsl`'siz (`is-analizi`, `teknik-analiz`, `kod-uretimi` gibi).
2. **SKILL.md:** frontmatter `name` + zengin `description` (TR/EN tetikleyici + upstream/downstream).
   Gövde: "neden" → altın kurallar → başlamadan → fazlar (faz↔kural 1:1) → emit/doğrula → referanslar.
3. **Tür seç — İKİSİ BİRDEN DEĞİL:**
   - Bir DSL **doğruluyorsan** → `validator/` ekle (gömülü self-contained `.mjs` + `build.<x>.mjs` +
     SNAPSHOT; `${CLAUDE_SKILL_DIR}` ile çağır). Bkz. CONVENTIONS §4.
   - Bir dış araca **yönlendiren ön-kapı**ysan → `capability/` ekle (sürüme-çivili snapshot +
     `SNAPSHOT.json` + improvements backlog). Bkz. CONVENTIONS §5. (`kod-uretimi` örneği.)
4. **`references/examples/`** = validator/parser-kanıtlı (0 error) exemplar'lar.
5. **`evals/evals.json`** = declarative senaryolar (doldur).
6. **Sürüm bump** (`plugin.json` + `marketplace.json` senkron) + gerçek data ile local doğrula.
7. Commit (junk yok) — push **yalnız kullanıcı onayıyla**.

## İçerik

```
_template/
  README.md                    # bu dosya — kopyaladıktan sonra SİL
  SKILL.md                     # iskelet (placeholder + satır-içi rehber); doldur
  references/examples/README.md
  evals/evals.json             # eval iskeleti
  # + validator/  VEYA  capability/  (türüne göre EKLE)
```
