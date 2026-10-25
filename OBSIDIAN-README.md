# Working in Obsidian

Short version: open `content/` as your vault, write a note, flip `draft: false`, commit.
Hugo turns the note into a page.

---

## 1. One-time setup

1. In Obsidian: **Open folder as vault** → choose this repo's `content/` directory.
2. Settings are already committed in `content/.obsidian/`, so they should apply automatically:

   | Setting | Value | Why |
   | --- | --- | --- |
   | Attachments | `blog/_attachments` | keeps images out of the published bundle until used |
   | New link format | wikilinks (`[[note]]`), not Markdown links | what the site's link resolver expects |
   | Templates folder | `templates/` | gives you the post skeleton |

3. If prompted, enable the **Templates** core plugin.

That's it — no build step, no plugin to install. The vault is plain Markdown in the repo.

---

## 2. Create a post

Either:

- **Cmd/Ctrl+P → "Templates: Insert template" → `blog-post`**, or
- run `hugo new content blog/my-post.md`

You get a file at `content/blog/my-post.md`. One post = one flat file. Do not create folders per post.

---

## 3. Fill in the front matter

| Property | Required | Notes |
| --- | --- | --- |
| `title` | always | Shown as the heading and in links to this post |
| `date` | always | ISO, e.g. `2026-01-01T00:00:00Z` |
| `slug` | always | The permanent URL. **Set it once and leave it alone** |
| `draft` | always | `true` while writing, `false` to publish |
| `description` | if you use `[[` or `%%` | One sentence, for search and social previews |
| `tags` | optional | Plain words; each becomes `/tags/<tag>/` |
| `aliases` | optional | Extra URLs that redirect here, e.g. `["/old-url/"]` |

`slug` is what makes renaming safe: change the filename or title later and existing URLs and
`[[wikilinks]]` still work.

---

## 4. Write

Type Obsidian syntax. The site understands:

| You write | You get |
| --- | --- |
| `[[Some Post]]` | link, using that post's title |
| `[[Some Post\|shown text]]` | link with your own text |
| `[[Some Post#Heading]]` | link to a heading there |
| `[[Some Post^block-id]]` | link to a paragraph marked `^block-id` |
| `![[Some Post]]` | citation card (alone on a line) or inline link (mid-sentence) |
| `![[diagram.svg\|Alt text]]` | image — **alt text is required** |
| `> [!note] Title` | callout (`tip`, `warning`, `danger`, `quote`…) |
| `> [!tip]+ Title` / `> [!tip]- Title` | foldable callout, open / closed |
| `==text==` | highlighted text |
| `$E = mc^2$` / `$$\int x\,dx$$` | math, rendered at build time, no JavaScript |
| `%%private note%%` | hidden from everything published |
| `[^1]` + `[^1]: text` | footnote |

Callout types: `note info todo abstract summary tldr`, `tip hint important check done success`,
`warning caution attention question help faq`, `danger error bug fail failure missing`,
`quote cite example`.

---

## 5. Images

Paste or drag an image into a note. Obsidian saves it to `content/blog/_attachments/` and
inserts `![[image.png]]`. **Add alt text:** `![[image.png|What the image shows]]`.

`![[image.png|decorative]]` is accepted for purely ornamental images.

An image referenced only by a draft is never published.

---

## 6. Preview

```bash
hugo server -D
```

Open <http://localhost:1313>. Drafts are visible here; themes, backlinks, callouts and math all
render. Stop with Ctrl+C.

---

## 7. Publish

1. Set `draft: false` in the note's Properties.
2. Commit and push. (`public/` is generated in CI; never commit it.)

Check before pushing:

```bash
hugo --panicOnWarning -d /tmp/preview --cleanDestinationDir   # must exit 0
```

---

## 8. If the build refuses

The build stops rather than publishing something wrong. The message names the file and the fix:

| Message contains | Fix |
| --- | --- |
| `unresolved wikilink` | No published post matches that name. Fix the spelling — or the target may still be a draft. |
| `ambiguous wikilink` | Several posts match — link using the exact `slug`. |
| `heading anchor ... does not exist` | That `#Heading` isn't in the target post. |
| `missing required front-matter field "description"` | Add a one-sentence `description`. |
| `not found in "content/blog/_attachments/` | The image isn't there — re-paste it. |
| `missing required accessible alt text` | Use `![[image.png\|alt text]]`. |
| `unbalanced '%%'` | You opened `%%` and didn't close it. |
| `unexpanded Obsidian plugin syntax` | Dataview/Templater blocks can't be published — replace with plain text. |
| `Mermaid diagrams are not rendered` | Export the diagram as `.svg` and embed the file instead. |

---

## 9. Try it first

`content/blog/obsidian-syntax-sandbox.md` is a **draft** that uses every feature above, with a
companion target note so backlinks have somewhere to land. Open it in Obsidian, edit it, and
run `hugo server -D` to see what each construct turns into. Neither note ever publishes — delete
both when you're done with them.

---

## 10. Things that won't work

- Inline `#tags` in prose — put tags in Properties instead.
- `![[Some Post^block-id]]` (transcluding a single paragraph) — link to it instead.
- Dataview, Templater, Canvas, graph view.
- Editing layouts or CSS is not an Obsidian job. The vault root is `content/`, so nothing else in
  the repo is even visible from Obsidian; those files are edited in a code editor.
