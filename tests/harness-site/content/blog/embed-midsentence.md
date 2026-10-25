---
title: "Mid-sentence embed"
date: 2021-03-11T00:00:00Z
slug: "embed-midsentence"
description: "An embed with sibling prose degrades to an inline wikilink."
draft: false
---

A card cannot live inside a sentence, so ![[embed-target]] renders as an
inline link and the paragraph stays valid phrasing content.

No mid-sentence `$$` math appears in any fixture: it shatters the paragraph by
design (§9 trap 3) and a golden file must never enshrine that.
