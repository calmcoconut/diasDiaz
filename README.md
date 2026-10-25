# diasdiaz

Source for [diasdiaz.net](https://diasdiaz.net), a personal blog built with
[Hugo](https://gohugo.io) and the [PaperMod](https://github.com/adityatelange/hugo-PaperMod)
theme (a git submodule — clone with `--recurse-submodules`).

## Building

Requires Hugo extended (`hugo version` must report `+extended`); the pinned
version lives in `.github/workflows/hugo.yml` and a test asserts it matches.

```sh
hugo server -D      # local preview, drafts included
hugo --minify       # production build into public/
node --test tests/  # zero-dependency test suite
```

`public/` is build output and is deliberately untracked.

## Deploying

Pushing to `master` triggers `.github/workflows/hugo.yml`, which builds the
site and publishes it to GitHub Pages via a Pages artifact deployment. Only
`master` deploys. The pre-Hugo Jekyll site is preserved as the annotated tag
`legacy-jekyll-archive`.

## License

[MIT](LICENSE.md), covering both the site's source and its written content
(blog posts and pages). Third-party components keep their own terms — notably
the PaperMod theme, which is MIT licensed by its authors.
