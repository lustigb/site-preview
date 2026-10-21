# Drawing kit (egglab art)

Every hand-drawable frame in the easter eggs. The ones here now are simple stand-ins drawn by code;
any of them can be replaced by a real drawing. Open **index.html** in this folder to see them all, big,
with names and which egg uses each. Zip this whole folder to share it.

## Redrawing a frame
1. Draw it on a canvas with the **same shape** as the stand-in, with a **transparent background**:
   - `peeker/` frames: 5 wide x 7 tall (e.g. 200 x 280 px)
   - `pole/` and `ski/` frames: square (e.g. 280 x 280 px)
   Draw at 4x size or more; the page shrinks it. On the site a pole frame is only about 25 px tall on a
   phone, so bold, simple shapes read best.
2. Keep the **same framing** as the stand-in: same facing direction, feet on the same spot (for
   standing poses, the bottom edge), about the same size inside the box. Easiest: trace over the SVG.
3. Save it as PNG with the **same name**, next to the stand-in (e.g. `pole/walk_a.png`).
4. List it in `custom.js`: `window.CUSTOM_ART = ['pole/walk_a.png'];`. Listed drawings replace the
   stand-ins; unlisted ones are ignored, so half-finished drawings can sit here safely.

Frames named `_a` / `_b` (/ `_c`) alternate quickly (walking, waving, sliding): draw them as a pair.

## Not in this folder (drawn by code for now)
- **catComb**: the sleeping cat, its fur, the comb's spine
- **pasta**: the giant fork, the guy eating, his hand
- **galton**: the pegs, beads and slots
- **fillUp**: the water
- **sheetFall**: nothing: the paper is the photo itself
- **light shows, shankShuffle, noodleDrop**: nothing: they move the photo's own shanks

(Rebuilt by tools/makeArtKit.py.)
