---
title: "Kernel's Edge – Notes on O'Brien…"
date: 2021-03-04T00:00:00Z
slug: "apostrophe-title"
description: "A title carrying an apostrophe, an en dash and an ellipsis."
draft: false
---

Target of the typographer fixture. The title above reaches the HTML pass only
after Goldmark has rewritten `'` as `&rsquo;`, which is why both the lookup
key and the slug must survive that rewrite.

Inline math stays inline: $E = mc^2$ typesets without breaking this sentence.
