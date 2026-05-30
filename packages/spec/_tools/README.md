# publish/_tools — usage

The validator is a single-purpose CLI that checks one variant folder against the
contract in [`publish/SPEC.md`](../SPEC.md). Run it before committing any atom
edit, before handing a variant to the render tool, and as the de facto
"unit test" for the publish pipeline.

## What it checks

Per atom:

- Frontmatter matches the JSON Schema in [`publish/_schema/<type>.schema.json`](../_schema/).
- `type:` is one of the 12 allowed values.
- `name:` is a kebab-slug and is **unique within the variant folder**.
- `source:` resolves to a real atom in `master/` (or is `null` for variant-only atoms).
- `period-end >= period-start` (lexicographic on `YYYY-MM`).
- Body has no level-1 heading (`# ...`).
- Body has no banned token (see [`banned-strings.txt`](./banned-strings.txt)).
- Every bullet (`-` or `- **`) leads with an action verb from [`action-verbs.txt`](./action-verbs.txt).

Per variant:

- Every `[A-Z]{2,}` acronym used in any body either appears with its
  parenthetical expansion somewhere in the variant (e.g.
  `Digital Adoption Platform (DAP)`) or is in the built-in whitelist.
- Among `work-experience` atoms, at most one carries `period-end: present`,
  and it must be the one with the latest `period-start`.

## Install (once)

From the repo root (`Curriculum/`):

```bash
cd _tools
npm install
cd -
```

`node_modules/` is gitignored. The lockfile is tracked.

## Run

Always validate one variant folder at a time:

```bash
npx --prefix _tools tsx _tools/validate.ts publish/founder-cto/
```

Replace `founder-cto` with `vp-eng`, `architect`, or `product-owner` as needed.

A short alias is convenient — add to your shell once:

```bash
alias cvval='npx --prefix _tools tsx _tools/validate.ts'
```

Then: `cvval publish/founder-cto/`.


## Common errors and how to fix

| Error fragment | Cause | Fix |
|---|---|---|
| `missing frontmatter` | File doesn't start with `---\n` | Add the frontmatter block. |
| `schema: must have required property 'X'` | Frontmatter missing a per-type required field | Add field per SPEC §4.x. |
| `banned token in body: "<word>"` | Body contains a privacy- or topic-violating string | Rephrase or generalise. Don't add the word to the whitelist unless it's a genuine false positive. |
| `bullet leads with non-action verb: "<verb>"` | Bullet doesn't lead with a whitelisted verb | Rephrase to use a verb from `action-verbs.txt`. Only extend the file if the new verb is genuinely action-class (avoid soft verbs like "Worked", "Helped", "Was"). |
| `acronyms used without expansion anywhere in the variant: ["X"]` | Acronym used but never expanded | Expand the acronym on first use somewhere in the variant: `Full Name (X)`. Or add to `ACRONYM_WHITELIST` in `validate.ts` if it's universally understood. |
| `period-end <Y> precedes period-start <X>` | Date inversion | Correct the dates. |
| `multiple work-experience atoms marked period-end: present` | Two roles claim to be current | Set the older one to its actual end date. |
| `duplicate name "X" across atoms: ...` | Two atoms share the same `name:` slug in the same variant folder | Rename one. |
| `source <slug> does not match any master atom` | The `source:` slug points nowhere | Fix the slug, or set `source: null` if it's variant-only. |

## Configuration files

### `banned-strings.txt`

One token per line. Case-insensitive substring match with word-boundary anchors
(`(?:^|\W)token(?:\W|$)`). Multi-word tokens (e.g. `AWS Bedrock`) work — the
space is a boundary character.

Edit when:

- A new internal product codename needs to be hidden from the public CV.
- A privacy rule in `SPEC.md` §10 adds a new no-go phrase.

Don't add common English words — the word-boundary match prevents most false
positives, but a token like `team` would still fire on every body.

### `action-verbs.txt`

One verb per line, case-sensitive, leading capital. The regex captures
hyphenated forms too (`Co-founded`, `Co-led`).

Edit when:

- A real action verb is missing (e.g. you wrote `Negotiated` and it's not in
  the file). Only add verbs that are genuinely action-class.

Don't add soft verbs (`Handled`, `Worked`, `Helped`, `Was`, `Did`) — they
degrade the CV quality the lint is meant to enforce.

### `ACRONYM_WHITELIST` (inline in `validate.ts`)

Edit `validate.ts` directly to add an acronym that is universally understood
and shouldn't need an expansion in every variant. Examples already in the list:
`CTO`, `CEO`, `VP`, `SVP`, `SAP`, `JSON`, `XML`, `EU`, `UK`, `US`.

Don't add domain-specific acronyms (`DAP`, `DDD`, `CQRS`, `MCP`) — those should
be expanded in body on first use so the CV stays readable to non-specialist
recruiters.

## When to run

- **Before every commit** that touches `publish/<variant>/`.
- **Before handing a variant to the render tool.**
- **After editing any file in `publish/_schema/`** (the schema and the validator
  share the same atom contract — schema edits can break previously valid atoms).
- **After editing `banned-strings.txt`, `action-verbs.txt`, or `validate.ts`** —
  re-validate all four variants to confirm no atom regressed.

Quick sweep across all variants:

```bash
for v in publish/{founder-cto,vp-eng,architect,product-owner}; do
  echo "=== $v ==="
  npx --prefix _tools tsx _tools/validate.ts $v/ || break
done
```

## Adding a new variant

1. `mkdir -p publish/<variant>/{identity,experience,projects,community,open-source,education,awards}`
2. Write `variant.md` first (validator picks up the `section-order:` from it).
3. Write atoms; validate after each. The validator runs in roughly a second
   even on a full variant, so re-run liberally.
4. Once `ok: N atoms valid` lands, commit.

## Extending the validator

The TypeScript source is ~270 lines in `validate.ts`. Common extension points:

| Lint | Where | What |
|---|---|---|
| New banned token | `banned-strings.txt` | One line, no code edit. |
| New action verb | `action-verbs.txt` | One line, no code edit. |
| New whitelisted acronym | `ACRONYM_WHITELIST` set in `validate.ts` | Add string to the set literal. |
| New per-atom lint | `validateAtom` in `validate.ts` | Add a new `lintFoo(fm, body, label)` function and call it. |
| New variant-level lint | `main` in `validate.ts` | Add a `checkBar(atoms)` function next to `checkAcronyms` and push its return into `errors`. |
| New per-type schema | `publish/_schema/<type>.schema.json` | Add the file; the loader picks it up automatically. Update `atom.schema.json` enum if a new `type:` value is introduced. |

After any code change, run the TypeScript check:

```bash
npx --prefix _tools tsc -p _tools/tsconfig.json --noEmit
```

Then run the validator across all variants to confirm no regression.

## File map

```
publish/_tools/
├── README.md                # this file
├── validate.ts              # the CLI
├── tsconfig.json            # strict TS, ES2022, node types
├── banned-strings.txt       # privacy/topic blocklist (one per line)
├── action-verbs.txt         # ATS-strength verb whitelist (one per line)
├── package.json             # ajv + ajv-formats + js-yaml + tsx + @types/node
├── package-lock.json        # tracked
├── .gitignore               # node_modules/
└── node_modules/            # gitignored; npm install populates this
```

## Limitations

- The validator does not enforce body **length** targets (SPEC §6.3). Eyeball
  per atom on review.
- The validator does not check render-tool-target compatibility (JSON Resume,
  Europass XML, Pandoc). Those are the render tool's concern.
- Bullet action-verb lint only fires on lines beginning with `- ` or `- **`.
  Paragraph leads are not linted (intentional; see SPEC §6.3).
- Banned-strings substring match cannot tell `Bedrock` (banned) from
  `bedrock formation` (geology). If false positives appear in legitimate
  content, refine the token rather than removing the rule.
- `source:` lookup walks `master/` linearly per atom. Fast on the current
  ~80 master files; if master grows to thousands of files, consider caching the
  name→path map once per run.
