# Laksh Bharani — Portfolio

Live site: https://lakshbharani.github.io/

## Update the site

Edit `dist/index.html`, `dist/style.css`, or files in `dist/assets/`, then push to `main`.
GitHub Actions checks the pages and assets, then publishes `dist/` to GitHub Pages.
Pull requests run the same checks without deploying. A failed check blocks deployment.
You can also run the workflow manually from the repository's Actions tab.

```sh
python3 check.py
python3 -m http.server 4173 --directory dist
```

Preview at http://localhost:4173/.

There is no build step, package installation, or deployment secret to maintain.
Technology icons come from Devicon; the license is in `dist/assets/tech/LICENSE.txt`.
