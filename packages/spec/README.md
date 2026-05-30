# CV publish tree

See [SPEC.md](SPEC.md) for the contract between this folder and the render tool.

Each variant lives in its own folder. The render tool consumes a single variant folder end-to-end:

```
publish/<variant>/
  variant.md          # variant root: identity, section-order, target-role
  personal.md         # contact block (body in document, never in PDF header/footer)
  identity/           # headline + professional summary
  experience/         # reverse-chronological work-experience atoms
  projects/           # curated project atoms (with .curation.md note)
  community/          # volunteering / community organising atoms
  open-source/        # OSS authored / maintained atoms
  education/          # one atom per degree
  awards/             # award atoms
  skills.md, languages.md  # single-file sections
```

Validate any variant before handing it to the render tool:

```bash
npx --prefix _tools tsx _tools/validate.ts publish/<variant>/
```

## Variants

- `founder-cto/` — Technical Co-founder & CTO
- `vp-eng/` — VP / Director of Engineering
- `architect/` — Principal / Staff / Solution Architect
- `product-owner/` — Senior Product Owner / Product Manager

