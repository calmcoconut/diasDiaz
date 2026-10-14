# A small personal homepage, circa 2002

## Summary and approval

Build an English-language, personal-first Hugo site on the existing PaperMod installation at `diasdiaz.net`. Use the warmth, readability, and personal character of Tania Rascia’s site as inspiration—not its code, identity, or artwork as a template.

This specification was approved through the Grill Me interview. This deliverable is a plan only: no site implementation, deployment, or hosting changes are authorized by this document. Interview decisions are in `GRILL-ME.md`.

## Current state and constraints

- Site root: `diasdiaz/`; Hugo configuration currently contains the domain, English locale, placeholder title, and PaperMod theme selection.
- Content, local layouts, assets, and static directories are empty. PaperMod is a Git submodule.
- Installed Hugo: v0.167.0 extended. The installed theme uses `layouts/_partials`, supports `assets/css/extended/*.css`, and includes search, archive, RSS, and color-mode functionality.
- Preserve existing staged changes, the submodule revision, and generated files. Do not edit the theme or hand-edit `public/`.
- Use local Hugo overrides and theme extension points; no new framework, CMS, npm build pipeline, or external service.

## Experience and visual design

The homepage should feel like a small, deliberately maintained personal corner of the web—not a portfolio landing page or simulated application.

- Center a fluid, approximately 760px-wide reading column with comfortable mobile gutters.
- Show the editable display name and brief welcome, with plain Blog / Résumé / Shelves navigation.
- Follow with **Lately**, showing one current book and one current film or series. Use small optional covers alongside text; stack these entries on narrow screens.
- Show **Recent writing** as five newest dated post links, not cards. Include an “All writing” link.
- Keep Search, Archive, Tags, and RSS as secondary footer links.
- Preserve the existing diasDiaz identity while gently warming the canvas: barely cream off-white light surfaces (`#FAF9F6`), dark-gray body text (`#454545`), headings (`#404040`), and the signature muted-magenta accent (`#AA759F`). Source: `calmcoconut/diasDiaz` sets `color-scheme: magenta` in `_config.yml`; `_sass/_ed.scss` defines its accent, and `assets/css/style.scss` defines text colors. The off-white is a new design choice, not a sampled color from the screenshot or repository. Use a darker related magenta (`#805277`) for normal-size links on off-white to meet contrast requirements rather than copying the old link contrast. The new dark-mode adaptation uses charcoal (`#202020`), light-gray text (`#E8E8E8`), and pale magenta links (`#D6A6CC`). Retain crisp rules, system sans-serif body text, and monospace headings/navigation/dates. Define local CSS variables and validate contrast in both modes. This supersedes the earlier stronger cream/rust, sage, lavender, and strict-white proposals; it does not change the retro layout or migrate the old site's content.
- Use a coordinated set of small, colorful pixel-art icons as the main retro detail, rather than a single decorative mark. Pair icons with text in navigation, page headings, and reading/watching labels; keep article rows undecorated. Use original or appropriately licensed local assets, never the inspiration site's artwork or floppy-disk identity. No hero buttons, gradients, faux windows, CRT effects, remote fonts, or decorative animation.
- Default color mode follows the system; explicit user selection persists using PaperMod’s existing mechanism. Avoid duplicate theme-toggle scripts.
- Use clearly labeled editable identity placeholders; do not infer a public name or biography from the local environment.

### Pixel-art icon system

Icons supply the nostalgic character while the page layout and typography stay simple. This supersedes the earlier single-pixel-mark concept; it does not introduce a sidebar or change the agreed navigation structure.

| Placement | Motif | Display size |
| --- | --- | --- |
| Linked site name / home | Small house | 24px |
| Blog navigation and page heading | Notebook and pencil | 16px / 32px |
| Résumé navigation and page heading | Typed document | 16px / 32px |
| Shelves navigation and page heading | Books on a shelf | 16px / 32px |
| Reading label on home and shelves | Open book | 24px |
| Watching label on home and shelves | Small television | 24px |
| Search footer link and page heading | Magnifying glass | 16px / 32px |
| Archive footer link and page heading | File box | 16px / 32px |

- Use one consistent, original pixel-art family, created as local SVG assets on a 16px grid, with dedicated 24px variants for the house, open book, and television. Render 32px heading versions at exactly twice their 16px dimensions. Prefer original assets; any substituted licensed assets must match the family and include license/attribution records.
- Store icons in `assets/icons/` and render them through a shared Hugo partial using an explicit semantic-name allowlist. Set width and height to avoid layout shifts. Do not load an icon font, third-party CDN, emoji glyphs, or an entire icon library.
- Use unmistakable pixel-art silhouettes, hard pixel edges, consistent dark outlines, and restrained two-tone highlights—not generic outline icons or emoji. Muted gold, dusty blue, and coral details complement the signature magenta accent on the neutral canvas; do not recolor every icon magenta. Preserve recognizable silhouettes in both color modes without automatic CSS inversion.
- Place navigation icons immediately before their labels with a 6–8px gap; heading icons use a 10–12px gap. Keep icon and label together when navigation wraps on mobile. A 16px image does not imply a 16px interaction target: padding must retain comfortable hit areas.
- Icons accompany visible text and are decorative to assistive technology (`aria-hidden="true"` for inline SVG; empty alt text for images). Do not replace labels with icons on mobile. The theme control retains a visible text label and may reuse PaperMod's existing sun/moon indicator rather than adding unrelated artwork.
- Keep Tags and RSS as plain text links; no icon is required for every link. Do not add icons to individual post rows, article titles, each résumé entry, or every shelf record. Reading/watching icons belong to group labels; covers remain the imagery for individual media entries.
- Derive the favicon from the original house motif, not the reference site's floppy disk. Record asset provenance in the authoring guide and supply any required license notices with the site.
- Check icons at normal and high-density display scales, in both themes, and at mobile widths. They must remain crisp, aligned, and distinguishable without introducing overflow or duplicate accessible names.

## Wireframe

These wireframes define composition and hierarchy, not additional features. Bracketed names, titles, and dates are placeholders. Lines represent section dividers, not boxes around content. The page remains a simple document in normal scrolling flow: no sidebar, fixed navigation, dashboard cards, or full-screen hero.

Icon notation: to keep the text diagrams readable, navigation labels imply their leading 16px icons, and Blog/Résumé/Shelves/Search/Archive page headings imply their leading 32px icons from the icon table. READING and WATCHING group labels imply the open-book and television icons on both desktop and mobile. Search and Archive footer links also carry their 16px icons. Article titles and individual post rows stay text-only.

### Shared page shell

- **Canvas:** a flat, barely cream off-white (`#FAF9F6`) extending to the viewport edges—close to white, with only a subtle warmth, not a visibly yellow/beige wash. Content sits directly on it, without an inset sheet, border, or shadow. Dark mode uses charcoal (`#202020`) with light-gray text and pale magenta links. Preserve the existing site's `#AA759F` identity accent rather than tinting the entire background magenta. Keep the same palette across every route.
- **Width and spacing:** a centered column with a maximum content width of approximately 760px, including the header. Keep at least 20px side gutters on small screens and approximately 32px of space above the desktop header, reduced to 24px on mobile. Use roughly 32–40px between major sections and 8–12px between related elements: compact like a personal web directory, not a spacious marketing landing page.
- **Header:** a small pixel-art house and linked display name on the left, with icon-and-text Blog, Résumé, Shelves links and a labeled compact theme control on the right. All icons are decorative beside text. Internal pages reuse this header; the name links home. Active navigation uses an underline or other non-color cue.
- **Typography:** readable 17–18px system sans-serif body text with approximately 1.65 line height. Use a local system monospace stack (`ui-monospace, "Cascadia Mono", "Segoe UI Mono", Menlo, Consolas, monospace`) for the site name, navigation, page and section headings, and dates. Page headings are bold, approximately 30–32px; section headings 20–22px; navigation 14–16px; dates and small labels 13–14px. On narrow screens page headings reduce to approximately 26px. This stronger typewriter-like hierarchy supplies retro character without making prose a terminal or using pixel fonts for paragraphs.
- **Links:** persistent underlines on text links, with dark magenta (`#805277`) on off-white (`#FAF9F6`) and pale magenta (`#D6A6CC`) on charcoal. Hover can use a flat subtle magenta-tinted highlight with sufficient text contrast, never a glow or animation. Focus rings remain visible. Navigation is compact but retains comfortable clickable areas.
- **Rules and controls:** use crisp one-pixel separators rather than faint hairlines, with neutral-gray tokens that remain visible in both modes. Use the signature magenta for decorative accents and its contrast-safe variants for meaningful control states. Search inputs and print/theme controls use square corners, clear borders, and monospace labels; no pill shapes, glossy surfaces, or soft shadows. Retain the plain document layout—do not box every section or add fake window chrome.
- **Footer:** a thin rule followed by Search · Archive · Tags · RSS. Use a modest text size and generous space above the rule. The footer follows content rather than being pinned to the screen bottom; no newsletter banner or large call to action.
- **Skip link & keyboard navigation:** include an accessible skip link targeting `#content`. Because PaperMod's default script intercepts fragment links and scrolls smoothly without shifting keyboard focus, provide an explicit focus transfer script to ensure activating the skip link moves keyboard focus (via `tabindex="-1"` and `.focus()`) directly to the main content container.

### Homepage — desktop

```text
      [house] [Your name]       Blog  Résumé  Shelves  [Theme]

      Hi, I'm [Your name].
      [A short, first-person welcome: who you are and what this
       little site is for. Two or three natural lines, not a pitch.]

      ───────────────────────────────────────────────────────────
      Lately

      READING                       WATCHING
      [small   ] [Book title]        [small   ] [Film / series title]
      [cover   ] [Author]            [cover   ] [Creator, if supplied]
                 [Short note]                  [Short note]

      More on my shelves →

      ───────────────────────────────────────────────────────────
      Recent writing

      [Date]       [A linked post title]
      [Date]       [Another linked title, potentially wrapping
                    onto a second line aligned with its title]
      [Date]       [A linked post title]
      [Date]       [A linked post title]
      [Date]       [A linked post title]

      All writing →

      ───────────────────────────────────────────────────────────
      Search · Archive · Tags · RSS
```

The introduction is the strongest element, but not a hero occupying a whole screen. “Lately” is an intimate glimpse of current interests rather than a catalogue. Reading and Watching share two equal columns only when there is enough space; neither sits inside a card. Covers are approximately 56–64px wide with natural aspect ratios, bounded to avoid tall images dominating an entry. Titles are visually stronger than creators and notes. Without a cover, the text starts at the entry’s left edge without reserving a blank image slot. Link titles only when an entry URL exists; do not give inert text a link appearance.

Recent writing uses compact rows, a subdued monospace date column, and underlined titles. No thumbnails, summaries, tags, or reading-time badges on the homepage. If fewer than five posts exist, show only those available. Empty states occupy the corresponding section naturally: “No posts yet,” “Nothing listed for reading yet,” or “Nothing listed for watching yet.” Never use skeleton loaders or fabricated activity.

### Homepage — mobile

```text
  [house] [Your name]       [Theme]
  Blog   Résumé   Shelves

  Hi, I'm [Your name].
  [Welcome text wraps naturally
   within the screen gutters.]

  ──────────────────────────────────
  Lately

  READING
  [cover] [Book title]
          [Author and short note]

  WATCHING
  [cover] [Film / series title]
          [Creator and short note]

  More on my shelves →

  ──────────────────────────────────
  Recent writing

  [Date]
  [Linked title wrapping as needed]

  [Date]
  [Next linked title]

  All writing →

  ──────────────────────────────────
  Search · Archive · Tags · RSS
```

Below approximately 600px, place navigation on its own wrapping row, stack Reading above Watching, and place each post date above its title. There is no hamburger menu or horizontal scrolling navigation. Keep cover and text together within each media entry. Footer links wrap naturally. Use the same content order in the DOM, on desktop, and on mobile.

### Blog index, archive, tags, and search

- **Blog:** shared header, `Blog` page title, then ten text-led entries per page. Each entry shows a small date/reading-time line, a linked heading, a short description when supplied, and understated tag links. Separate entries with whitespace, not cards. Previous/Newer and Next/Older pagination links sit below the list with unambiguous labels.
- **Archive:** `Archive` title followed by year headings and compact date/title rows matching the homepage. No timeline rail, calendar grid, or decorative chronology.
- **Tags:** `Tags` title followed by a wrapping list of plain linked tag names and post counts, not oversized pill badges. Individual tag pages show the tag heading and the same text-led post list as Blog.
- **Search:** `Search` title, a visible `Search posts` label, and a full-width input with a simple one-pixel border. PaperMod’s bundled search only renders titles and lacks excerpts, guidance, and accessible state feedback; provide a local JavaScript search override (retaining the bundled Fuse.js library) to render linked titles alongside matched text excerpts, initial query guidance, and an ARIA live region that announces result counts, empty matches, or loading/error states. Results appear directly below without an overlay or modal. The no-JavaScript fallback message linking to the blog/archive occupies this same area.

### Article page

```text
      [Shared header]

      [Post title, allowed to wrap]
      [Publication date] · [Reading time]
      [Optional tag links]

      [Opening paragraph]

      [Optional contents list, in the document flow]

      Section heading
      [Readable paragraphs with underlined inline links.]

      [Code block with restrained contrasting background,
       monospace text, horizontal scrolling, and copy control]

      [Remaining article content]

      [Shared footer]
```

Articles use the same column rather than a second layout with a sidebar. Images fit the column and retain their aspect ratio. Blockquotes use a thin accent rule, not a large colored panel. The optional table of contents is a compact in-flow list, never a floating widget. Do not invent an author card, profile photo, reaction counter, or related-content carousel.

### Résumé page

- Start with `Résumé` and a modest `Print résumé` control aligned beside the heading where space allows, below it on mobile.
- Follow with Summary, Experience, Skills, and Education in that order. Use section headings and whitespace to create structure, not separate cards.
- Experience entries emphasize the role, then organization and dates in secondary text, followed by concise achievement bullets. On mobile all fields flow vertically. Clearly marked placeholders demonstrate the structure without fake employers or achievements.
- Skills are short grouped text lists rather than proficiency bars or badges. Education uses the same role/organization/date hierarchy as experience.
- The printed page becomes a conventional black-on-white document headed by the configured display name and Résumé. Remove the site shell and controls, preserve the content hierarchy, and let text paginate naturally.

### Shelves page

```text
      [Shared header]

      Shelves
      [One short explanation of this personal reading/watch log.]

      Reading
      CURRENT
      [cover] [Title] — [Author]
              [Short personal note]

      FINISHED
      [cover] [Title] — [Author]
              [Completion date, when present]
              [Short personal note]
      [Additional entries in the same format]

      ───────────────────────────────────────────────────────────
      Watching
      CURRENT
      [cover] [Film / series title]
              [Creator, optional] · [Film or Series]
              [Short personal note]

      FINISHED
      [Entries in the same format, optional completion dates]

      [Shared footer]
```

Keep Reading and Watching as successive full-width sections, not competing columns or a poster grid. Each entry is a simple cover-and-text row; covers remain small, approximately 64–80px wide. Current/Finished labels communicate state without badges or color dependence. Dates are secondary metadata, and omitted dates leave no blank row. Empty groups show a short honest sentence. No tabs, filters, ratings, progress bars, or clickable entry containers; only supplied title links navigate externally.

## Routes and behavior

| Route | Purpose |
| --- | --- |
| `/` | Personal introduction, Lately, five recent posts |
| `/blog/` | Reverse-chronological post list, 10 posts per page |
| `/blog/<slug>/` | Individual Markdown article |
| `/resume/` | Printable HTML résumé |
| `/shelves/` | Reading and watching, grouped into current and finished |
| `/tags/` and `/tags/<tag>/` | Blog topic navigation |
| `/archive/` | Blog posts grouped by year |
| `/search/` | PaperMod client-side search restricted to blog posts |
| `/index.xml` | Blog-only RSS with empty-state guard |

Use Markdown under `content/blog/` and explicit stable slugs for article URLs. Configure `mainSections` for the blog. Disable unused category taxonomy. Search JSON, RSS, archives, and homepage queries must explicitly select the blog section; configuration alone is not sufficient evidence that each theme template filters correctly.

For RSS (`/index.xml`), provide a local template override that filters to published blog posts (`where .Site.RegularPages "Section" "blog"`) before applying limits. When the blog has zero published posts (such as in the initial production state), guard `lastBuildDate` calculation so it is only computed and emitted when filtered posts exist, preventing build errors or malformed feed timestamps on an empty blog.

Article pages retain readable metadata, optional table of contents, syntax highlighting, and code-copy functionality from PaperMod where appropriate. Show publication date and reading time; omit unset author information, cover placeholders, comments, and social-share button clutter. Long code blocks scroll without widening the page. Search has clear no-results behavior and a no-JavaScript message linking to the blog/archive. Core navigation and content work without JavaScript.

Keep the base URL `https://diasdiaz.net/`, configure Hugo’s supported English language setting, and provide page titles, canonical URLs, descriptions, sitemap, and RSS discovery through existing Hugo/theme facilities. Do not fabricate social profile or contact links.

## Editable content and interfaces

### Markdown

- `content/_index.md`: placeholder display text and introduction.
- `content/resume.md`: summary, experience, skills, education; `layout: resume`.
- Section/index pages for blog, shelves, archive, and search, with layouts assigned as needed.
- Blog front matter: `title`, `date`, `slug`, `description`, `tags`, `draft`; optional article-specific settings. Keep new-post archetypes draft-first.
- Document which configuration field controls the site-wide display name and title so replacing placeholders is straightforward.

### Shelves data

Use `data/shelves.yaml` with an `items` list. Every entry has:

| Field | Contract |
| --- | --- |
| `id` | Required unique stable string |
| `type` | Required enum: `book`, `film`, `series` |
| `title` | Required nonempty string |
| `creator` | Optional author/director/creator display string |
| `status` | Required enum: `current`, `finished` |
| `order` | Required integer; ascending priority within current entries |
| `completed` | Optional quoted ISO date `YYYY-MM-DD`; allowed for finished items |
| `note` | Optional short plain-text personal note |
| `url` | Optional absolute HTTP(S) link |
| `cover` | Optional asset path relative to `assets/images/shelves/` |
| `draft` | Optional boolean, default false; used for preview-only examples |

Process cover images through Hugo’s asset pipeline (`resources.Get`) from `assets/images/shelves/`, rather than placing them in `static/`. Files in `static/` are unconditionally copied to `public/`, which would leak preview/draft covers into production builds even when their YAML records are marked as drafts. With the asset pipeline, covers are only published to `public/` when rendered in HTML. An omitted cover renders a clean text-only entry, not a broken image or a fake cover. An explicitly configured cover that does not resolve to an asset is a validation error. Supplied images require appropriate rights; preview fixtures use original neutral artwork, not scraped book/show covers.

Implement one shared validation/filtering partial for homepage and shelves. Validate the entire collection and emit Hugo build errors naming the item and offending field for duplicate IDs, missing required values, bad enum/type/date/URL values, or unresolvable cover asset paths. Reject traversal and external URLs in cover paths. Render notes as escaped plain text.

Filter out entries with `draft: true` unless Hugo’s build-drafts option is enabled. Use the filtered collection everywhere. Group books as Reading and films/series as Watching. Within each group:

- Current: ascending `order`, then stable `id` as a tie-breaker.
- Finished: descending completion date; undated records last; `id` as tie-breaker.
- Homepage: first current entry from each group. Never substitute a finished item for a missing current entry.
- Shelves: show all eligible entries. No ratings, progress bars, review routes, filtering UI, or pagination in version one.

## Résumé

Render accessible HTML from Markdown with an explicit Print résumé control and print stylesheet. A small local print handler may call `window.print()`; ordinary browser printing must work without it.

Printing hides navigation, theme controls, print control, and footer; uses black text on white; removes decorative styling; and avoids splitting headings from their following content where possible. Support common Letter and A4 output without fixed page heights. No separately maintained PDF, invented experience, or download link that points nowhere.

## Hugo integration approach

1. Configure menus, English language, blog section, outputs, theme settings, and metadata in `hugo.yaml`.
2. Implement a local homepage template, shelves and résumé layouts, and small shared partials using the installed Hugo/theme lookup conventions.
3. Extend visual styling through `assets/css/extended/`; override theme templates only when a hook cannot supply the required behavior. Provide a local skip-link focus transfer script to ensure keyboard focus shifts to `#content` on activation.
4. Inspect and narrowly override list/archive/search JSON/RSS behavior to enforce blog-only scope and the agreed compact presentation. Override the RSS template to filter to blog posts before limiting and guard `lastBuildDate` when the blog is empty. Provide a local JavaScript search override (using bundled Fuse.js) to render post excerpts, query guidance, and ARIA live-region empty/error status.
5. Centralize shelves validation, filtering, and ordering. Process covers through Hugo's asset pipeline (`resources.Get`) so draft cover images are never published in production. Keep sample posts and media draft-only.
6. Add content archetypes and a concise authoring guide with exact preview/build commands and launch cleanup instructions.

Keep overrides small, record which theme behavior they depend on, and avoid copying the full theme into the project.

## Empty states and preview safety

- Normal builds: no sample posts or sample media entries; show concise honest empty messages for writing, current interests, and shelves groups.
- Biography and résumé placeholders remain explicitly labeled until replaced. Do not claim the site is publication-ready while those remain.
- Draft preview: include at least two sample posts covering tags, headings, code, and long titles, plus shelf entries covering current/finished, reading/watching, optional covers, and missing completion dates.
- Use `hugo server --buildDrafts` for populated preview. Use `hugo server` to review production-like empty states.
- Keep normal and draft build output in separate temporary directories during verification to avoid stale sample output contaminating results.

## Verification and acceptance

### Build and data checks

- Run normal and `--buildDrafts` builds using Hugo v0.167.0 extended, with separate temporary destinations; both must succeed without unexpected warnings or errors.
- Inspect generated homepage, blog, archive, tags, search JSON, and RSS. Draft fixture IDs, titles, content, and draft cover image assets in `assets/images/shelves/` must be completely absent from normal production outputs in `public/` and present only where expected in draft outputs.
- Verify RSS generation succeeds with a valid feed when zero posts are published, verifying `lastBuildDate` is safely guarded.
- Confirm résumé and shelves never enter blog search, RSS, archives, or recent-post queries.
- Exercise empty data, a single current item, multiple current items, tied order, dated/undated finished items, and omitted optional fields.
- Verify malformed data fails with actionable diagnostics; use temporary fixture variants, not destructive edits to real content.
- Exercise more than ten published test posts to verify pagination and exactly five recent homepage links.
- Check internal links, canonical URLs, covers, favicon, and route outputs for broken references. Confirm no unexpected third-party asset requests.

### Browser checks

- Review at 320px, 375px, 768px, and desktop widths: no horizontal overflow except intentional code scrolling.
- Verify both color modes, initial system preference, persistent manual selection, visible focus, keyboard-only navigation, skip-link focus transfer to main content, and search behavior (including excerpts, query guidance, and live-region announcements for empty/error states).
- Maintain WCAG AA text contrast, semantic landmarks/headings, an accessible skip link with programmatic focus transfer, and adequately sized controls. Covers adjacent to equivalent titles use empty alt text to avoid repetition.
- Confirm navigation/content remain usable with JavaScript disabled; theme/search/print enhancements degrade clearly.
- Check long post titles, long shelf notes, missing covers, and unusually long code lines.
- Print résumé in Letter and A4 preview: no navigation, cropped content, dark background, or unnecessary empty pages.

### Handoff

Provide an authoring guide covering identity replacement, résumé editing, new posts/slugs/tags, shelf fields and ordering, adding local covers, draft previews, production builds, and pre-publication checks. Record actual verification results during future implementation; do not claim tests have run as part of this planning deliverable.

## Explicit exclusions and deferred inputs

No separate About page, projects section, CMS, comments, analytics, newsletter, bilingual content, automatic media imports, ratings, independently authored reviews, hosted preview, deployment, or hosting configuration changes.

Real biography, résumé, posts, media choices, and any licensed covers are deferred user content—not unresolved implementation decisions. This plan intentionally uses placeholders and safe draft fixtures until those are supplied.
