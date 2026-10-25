---
title: "Obsidian Syntax Sandbox"
date: 2026-09-11
slug: "obsidian-syntax-sandbox"
description: "Draft-only note exercising every Obsidian authoring feature the site supports. Open this in Obsidian and edit freely; it never publishes."
tags: ["sandbox", "obsidian"]
draft: true
aliases: ["/sandbox-alias/"]
---

This note exists to exercise the whole Obsidian authoring surface in one place. It is a
draft, so it never reaches a production build. Edit it, add to it, or delete it.

## Links

A plain link [[obsidian-sandbox-target]], an aliased one
[[obsidian-sandbox-target|readable alias]], a heading deep link
[[obsidian-sandbox-target#A Stable Heading]], and a block link
[[obsidian-sandbox-target^lemma-one|the lemma]].

## Transclusion

A mid-sentence transclusion sits right here ![[obsidian-sandbox-target]] inside a paragraph,
so it degrades to an inline link rather than breaking the paragraph.

An isolated transclusion becomes a card:

![[obsidian-sandbox-target]]

## Image

As Obsidian drops it: ![[sandbox-diagram.svg|A test diagram of two boxes]]

## Callouts

> [!note] Static note callout
> Body of the note callout.

> [!tip]+ Foldable, open by default
> Body of the open tip.

> [!warning]- Foldable, closed by default
> Body of the closed warning.

> [!danger] Danger callout
> Body of the danger callout.

> [!quote] Quoted callout
> Body of the quote callout.

## Inline formatting and math

A highlighted ==important phrase== inside prose.

Inline math $E = mc^2$ sits in a sentence, and prices like $10 on $100 are left alone.

$$
\int_0^1 x \, dx = \tfrac{1}{2}
$$

A footnote reference[^note1] and a private aside %%this must never appear%%.

[^note1]: The footnote body.

## Code samples stay literal

Inline code: `[[not a link]]` and `%%not a comment%%`.

```text
[[also not a link]]
%%also not a comment%%
```
