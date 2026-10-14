# Authoring and Content Guide for diasdiaz.net

This guide explains how to maintain, customize, and publish content on your Hugo site.

---

## 1. Replacing Identity and Placeholders

All site-wide identity settings are managed in `hugo.yaml` and the homepage markdown file.

### Site Title & Display Name
Open `hugo.yaml`:
```yaml
title: "Jane Doe"             # Site title in metadata and browser tab
params:
  display_name: "Jane Doe"    # Shown in the top header and links
```

### Homepage Welcome
Edit `content/_index.md`:
```markdown
---
title: "Jane Doe"
---

Hi, I'm Jane Doe.

Welcome to my personal corner of the web. This little site is where I share notes on things I'm learning, writing on software and systems, and an informal log of what I'm reading and watching.
```

---

## 2. Editing the Résumé

The résumé is authored in standard Markdown at `content/resume.md`:

```markdown
---
title: "Résumé"
layout: "resume"
---

## Summary
A concise 2–3 sentence overview of your background and technical interests.

## Experience
### Senior Software Engineer
**Acme Systems** · *2022 – Present*
- Engineered core distributed storage engine handling high throughput.
- Reduced p99 query latency by 35% through cache optimizations.

## Skills
- **Languages:** Python, Go, TypeScript, Rust, SQL
- **Systems & Tools:** Linux, Docker, PostgreSQL, Hugo, Git

## Education
### B.S. in Computer Science
**University Name** · *2018 – 2022*
```

### Printing the Résumé
- Visit `/resume/` in your browser.
- Click the **Print résumé** button (or press `Cmd+P` / `Ctrl+P`).
- The print stylesheet automatically hides headers, footers, theme toggles, and buttons, formatting the document cleanly in black-and-white for standard Letter and A4 paper.

---

## 3. Writing Blog Posts

All articles live in `content/blog/`.

### Creating a New Post
Use Hugo's archetype command:
```bash
hugo new content blog/my-new-post.md
```
Or create a file manually at `content/blog/<slug>.md`.

### Front Matter Contract
```markdown
---
title: "Understanding Distributed Systems"
date: 2026-03-01T12:00:00Z
slug: "understanding-distributed-systems"
description: "A practical guide to consensus protocols and network partitions."
tags:
  - "distributed-systems"
  - "architecture"
draft: true
---
```

- `title`: The human-readable title of your article.
- `date`: ISO timestamp (`YYYY-MM-DDTHH:MM:SSZ`).
- `slug`: Stable URL slug. The article will be published at `/blog/<slug>/`.
- `description`: A 1–2 sentence summary displayed on the blog index and search results.
- `tags`: List of topic tags. Each tag generates a collection at `/tags/<tag>/`.
- `draft`: Set to `true` while drafting. Set to `false` when ready to publish.

### Publishing a Post
Change `draft: true` to `draft: false`. Draft posts are never included in production builds or RSS feeds.

---

## 4. Managing Shelves (Reading & Watching)

The reading and watching lists are configured in `data/shelves.yaml`.

### Data Schema
```yaml
items:
  - id: "structure-and-interpretation"
    type: "book"                   # Enum: "book", "film", or "series"
    title: "Structure and Interpretation of Computer Programs"
    creator: "Harold Abelson, Gerald Jay Sussman"
    status: "current"              # Enum: "current" or "finished"
    order: 1                       # Ascending priority (1 = highest)
    note: "Revisiting metacircular evaluators in Scheme."
    url: "https://mitp-content-server.mit.edu/books/content/sectbyfn/books_pres_0/sicip/book.html"
    cover: "sicp.png"              # Optional asset in assets/images/shelves/
    draft: false                   # Optional boolean (default: false)

  - id: "severance-s1"
    type: "series"
    title: "Severance (Season 1)"
    creator: "Dan Erickson"
    status: "finished"
    order: 1
    completed: "2026-01-20"        # Quoted ISO date (YYYY-MM-DD) for finished items
    note: "Sharp commentary on work-life compartmentalization."
    url: "https://tv.apple.com/show/severance"
    draft: false
```

### Field Definitions
| Field | Requirement | Description |
|---|---|---|
| `id` | Required | Unique, stable identifier string (e.g. `sicp-book`). |
| `type` | Required | `book` (Reading), `film` (Watching), or `series` (Watching). |
| `title` | Required | Title of the work. |
| `creator` | Optional | Author, director, or creator string. |
| `status` | Required | `current` (currently reading/watching) or `finished`. |
| `order` | Required | Integer priority for `current` items (1 comes first). |
| `completed` | Optional | Completion date (`YYYY-MM-DD`) for `finished` items. |
| `note` | Optional | Brief personal note or impression. |
| `url` | Optional | Absolute link to external page. |
| `cover` | Optional | Relative filename inside `assets/images/shelves/`. |
| `draft` | Optional | Set to `true` for preview fixtures that should not appear in production. |

### How Covers Work
- Place cover images in `assets/images/shelves/` (e.g., `assets/images/shelves/my-book.jpg`).
- Reference them by filename in `cover`: `cover: "my-book.jpg"`.
- Covers are processed through Hugo's asset pipeline. Omitted covers render clean text-only rows. Draft covers are never published to production builds.

---

## 5. Previewing & Building

### Local Development Preview (Including Drafts)
To view both published and draft content (sample posts and test media):
```bash
hugo server --buildDrafts
```
Visit `http://localhost:1313/` in your browser.

### Production Preview (Exact Production State)
To preview exactly what will be built in production without draft posts or preview fixtures:
```bash
hugo server
```
This allows you to verify honest empty states (e.g. "No posts yet" when no articles are published).

### Building Production Output
To build static HTML into `public/`:
```bash
hugo
```

---

## 6. Pre-Publication Checklist

Before deploying your site to production, complete this checklist:

- [ ] **Site title and display name updated:** In `hugo.yaml`, verify `title` and `params.display_name` are set to your real name instead of `[Your Name]`.
- [ ] **Homepage intro updated:** In `content/_index.md`, replace the placeholder text with your real personal intro.
- [ ] **Résumé updated:** In `content/resume.md`, replace placeholder jobs, companies, skills, and degree details with your actual background.
- [ ] **Shelves populated:** In `data/shelves.yaml`, verify your reading and watching items, and ensure `status` and `type` fields are correct.
- [ ] **Sample posts removed or drafted:** Ensure test fixtures (`content/blog/sample-post-1.md`, etc.) have `draft: true` or have been replaced with real articles.
- [ ] **Verify clean production build:** Run `hugo` and inspect the output to ensure no build errors or warnings occur.
- [ ] **Verify RSS feed:** Check `public/index.xml` to confirm it only contains published blog posts.
- [ ] **Verify search index:** Check `public/index.json` to confirm it only contains published blog posts.
