---
title: "Documenting the wikilink syntax safely"
date: 2021-03-06T00:00:00Z
slug: "inline-code-documented"
draft: false
---

This post deliberately omits `description`: every wikilink and comment token in
it is inside code, so the front-matter scan in obsidian-lookup-map.html strips
them and does not demand a description. If the code masking ever regresses,
this fixture stops building.

Inline code keeps the syntax literal: `[[syntax]]` and `%%private%%`.

```markdown
[[Not A Note]] %%x%%
```

The fenced sample above is documentation too, not a link.
