# Laksh Bharani — Portfolio

Live site: https://lakshbharani.github.io/

## Update the site

Edit `dist/index.html`, `dist/style.css`, or files in `dist/assets/`, then push to `main`.
GitHub Actions checks the pages and assets, then publishes `dist/` to GitHub Pages.
Pull requests run the same checks without deploying. A failed check blocks deployment.
You can also run the workflow manually from the repository's Actions tab.

```sh
python3 check.py
node flight.test.mjs
python3 -m http.server 4173 --directory dist
```

Preview at http://localhost:4173/.

There is no build step, package installation, or deployment secret to maintain.
Technology icons come from Devicon; the license is in `dist/assets/tech/LICENSE.txt`.

The paper-plane journey is a decorative SVG layer driven by scroll position. Its route
is measured from the page layout, uses continuous curves through quiet visual areas, and stays stationary
when reduced motion is preferred. With JavaScript disabled, the site remains usable
and the decorative layer stays hidden. The flight logic has no third-party dependencies.

The raised-paper intro plays once per tab session; section links bypass it. Start flight
folds the sheet and hands off to the scroll-driven plane. Skip, Escape, and the footer
Replay intro button provide direct control. Reduced motion enters without the fold.

The flight spline shares tangents between segments and never stops at intermediate
checkpoints. The smaller plane retains its paper shape, size, and opacity throughout.
It starts on the portrait (or name on small screens) and rests on the footer divider.
The contact arrow remains independent and visible.
