# Thakaai

A buildless company website. Serve `dist/` with any static web server.

## Preview

```sh
python3 -m http.server 4173 --directory dist
```

Open http://localhost:4173.

- Hold a non-interactive area with the mouse or hold the bottom control to reveal the intelligence dimension. Release to return.
- Hold Space on the page, or activate “Explore this page in 3D” to keep the mode open. Escape returns.
- On touch devices, hold the bottom control. Regular page gestures continue to scroll.
- Solution rows open details; the sound explorer switches between illustrative signal profiles.
- Enquiries generate a downloadable text brief. There is no email delivery or lead database configured. Configure a real company contact destination before a public launch.
- Logo asset is the supplied brand board, framed in CSS to show the primary lockup. Replace with the original transparent logo when available.

The normal tree and signal use Canvas 2D. The tree silhouette is traced as editable vector paths from the supplied brand mark, with curved root ribbons, ten tapered leaves, three gold olives, and five circuit rings. Every tree component uses fine lines: curved surface grids inside the leaf, trunk, root and olive contours, plus wire tubes for the circuit branches and terminal rings. Both views share these wire geometries and retain the same silhouette. `tree-art.js` and `assets/logo-tree.svg` describe the same artwork; the normal and 3D views share it. The dimension uses locally vendored Three.js 0.180.0 (MIT) and its bundled typeface data; no CDN is needed for 3D rendering. Fonts for the normal page load from Google Fonts with system fallbacks.

The 3D view measures the actual page text and layout, then builds extruded headings, text meshes, the extruded logo tree, panels, spatial grid, and floating shapes at corresponding positions. Pointer position or arrow keys rotate the camera; + / - change distance. Scrolling moves through the same page in 3D. A radial irregular portal with RGB splitting and scanlines transitions between views. Release returns to the page at the same scroll position. On touch, use the persistent 3D toggle and drag to look around, or hold and move the bottom control.

Reduced-motion preferences simplify the transition and disable ambient tree/waveform motion. If WebGL is unavailable, the normal website remains accessible and 3D controls report that the view is unavailable.

## GitHub Pages

Push to `main` to deploy `dist/` using `.github/workflows/pages.yml`. If initial automatic setup is unavailable, choose GitHub Actions in Settings → Pages → Source and rerun the workflow.
