---
title: "Building Small, Deliberate Things on the Modern Web"
date: 2026-01-15T10:00:00Z
slug: "building-small-deliberate-things"
description: "Reflections on handcrafted personal websites, system monospace fonts, and resisting digital clutter."
tags:
  - "web"
  - "design"
  - "simplicity"
draft: true
---

The web used to feel smaller, warmer, and more personal. You would find someone's site through an understated text link, explore their reading list, and read a few short essays written without the pressure of metrics, engagement loops, or algorithmic distribution.

## Keeping things simple

When building this site, the goal was deliberate restraint:
- Flat off-white canvas with high-contrast text
- System fonts without third-party font downloads
- No trackers, client-side frameworks, or heavy assets

### Code example

Here is a snippet showing how clean code blocks render with horizontal scrolling:

```go
package main

import (
    "fmt"
    "net/http"
)

func main() {
    http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        fmt.Fprintln(w, "Hello from a calm corner of the web.")
    })
    http.ListenAndServe(":8080", nil)
}
```

A thoughtful layout prioritizes reading comfort over visual noise.
