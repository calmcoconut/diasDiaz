---
title: "Example Draft Post"
date: 2026-10-25T00:00:00Z
slug: "example-draft-post"
description: "A minimal example post that stays in draft mode, showing what a typical note looks like."
tags: ["example"]
draft: true
---

This is an example of an ordinary post. It has `draft: true`, so it shows up in
`hugo server -D` but never in a production build. Copy it as a starting point, or delete it.

%%Comments like this one never publish, even after the draft flag is turned off.%%

## Linking to another post

Wikilinks use the target's title: see [[Sockets in C]], or give the link
[[Sockets in C|your own text]].

> [!tip] Publishing
> When the post is ready, set `draft: false` in Properties and commit.

## Formatting

Obsidian formatting works as usual: ==highlights==, inline math like $a^2 + b^2 = c^2$, and
footnotes.[^1]

[^1]: Footnotes render at the bottom of the page.
