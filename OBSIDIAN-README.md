# Working in Obsidian

**TL;DR**

1. Open `content/` as your Obsidian vault.
2. New post: insert the `blog-post` template. Fill in `title`, `date`, `slug` and `draft`.
3. Write with normal Obsidian syntax: wikilinks, callouts, math, `%%comments%%`.
4. Every image needs alt text: `![[image.png|What it shows]]`.
5. Preview with `hugo server -D`. To publish, set `draft: false`, then commit and push.

If the build fails, the error names the file and the problem (see §8).

## 1. Setup (once)

**Open folder as vault** → this repo's `content/`. The committed `content/.obsidian/` config
applies automatically; enable the **Templates** core plugin if prompted.

| Setting | Value | Why |
| --- | --- | --- |
| Attachments | `blog/_attachments` | images stay unpublished until a post uses them |
| New link format | wikilinks (`[[note]]`) | what the site's link resolver expects |
| Templates folder | `templates/` | provides the post skeleton |

No build step or plugins needed.

## 2. Create a post

**Cmd/Ctrl+P → "Templates: Insert template" → `blog-post`**, or `hugo new content blog/my-post.md`.
One post is one flat file in `content/blog/` — no per-post folders.

## 3. Front matter

| Property | Required | Notes |
| --- | --- | --- |
| `title` | always | Heading, and text of links to this post |
| `date` | always | ISO, e.g. `2026-01-01T00:00:00Z` |
| `slug` | always | The permanent URL. **Set once, never change** |
| `draft` | always | `true` while writing, `false` to publish |
| `description` | if you use `[[` or `%%` | One sentence, for search and social previews |
| `tags` | optional | Plain words; each becomes `/tags/<tag>/` |
| `aliases` | optional | Old URLs that redirect here, e.g. `["/old-url/"]` |

Because of `slug`, you can rename the file or title later without breaking URLs or wikilinks.

## 4. Syntax

| You write | You get |
| --- | --- |
| `[[Some Post]]` | link, using that post's title |
| `[[Some Post\|shown text]]` | link with your own text |
| `[[Some Post#Heading]]` | link to a heading |
| `[[Some Post^block-id]]` | link to a paragraph marked `^block-id` |
| `![[Some Post]]` | citation card (alone on a line) or inline link (mid-sentence) |
| `![[diagram.svg\|Alt text]]` | image (see §5) |
| `> [!note] Title` | callout |
| `> [!tip]+ Title` / `> [!tip]- Title` | foldable callout, open / closed |
| `==text==` | highlight |
| `$E = mc^2$` / `$$\int x\,dx$$` | math, rendered at build time |
| `%%private note%%` | hidden from all published output |
| `[^1]` + `[^1]: text` | footnote |

Callout types: `note info todo abstract summary tldr`, `tip hint important check done success`,
`warning caution attention question help faq`, `danger error bug fail failure missing`,
`quote cite example`.

## 5. Images

Paste or drag an image in; Obsidian saves it to `content/blog/_attachments/` and inserts
`![[image.png]]`. **The build rejects images without alt text** — deliberately, for
accessibility — so add it:

- `![[image.png|What the image shows]]`
- `![[image.png|decorative]]` for purely ornamental images
- `![[image.png|Alt text|400]]` to cap display width in pixels

Any filename works, spaces and capitals included. Images used only by drafts never publish.

## 6. Preview

```bash
hugo server -D
```

Open <http://localhost:1313>; drafts are visible. Ctrl+C to stop.

## 7. Publish

Set `draft: false`, check the build, then commit and push. Never commit `public/` — CI generates it.

```bash
hugo --panicOnWarning -d /tmp/preview --cleanDestinationDir   # must exit 0
```

## 8. Build errors

The build stops rather than publish something wrong, naming the file and problem:

| Message contains | Fix |
| --- | --- |
| `unresolved wikilink` | No published post matches — check spelling, or the target is still a draft |
| `ambiguous wikilink` | Several posts match — link by exact `slug` |
| `heading anchor ... does not exist` | That `#Heading` isn't in the target post |
| `missing required front-matter field "description"` | Add a one-sentence `description` |
| `not found in "content/blog/_attachments/` | Image missing — re-paste it |
| `missing required accessible alt text` | Use `![[image.png\|alt text]]` |
| `unbalanced '%%'` | Close your `%%` comment |
| `unexpanded Obsidian plugin syntax` | Replace Dataview/Templater blocks with plain text |
| `Mermaid diagrams are not rendered` | Export the diagram as `.svg` and embed that |

## 9. Examples

`content/blog/example-draft-post.md` is a short, typical post kept as a draft — copy it as a
starting point.

`content/blog/obsidian-syntax-sandbox.md` is a draft using every feature above, plus a
companion note for links to land on. Edit it with `hugo server -D` running to see the output.
None of these publish; delete them when done.

## 10. Not supported

- Inline `#tags` — use the `tags` property.
- `![[Some Post^block-id]]` paragraph transclusion — link to it instead.
- Dataview, Templater, Canvas, graph view.
- Layouts and CSS — they live outside `content/`, so edit them in a code editor.
