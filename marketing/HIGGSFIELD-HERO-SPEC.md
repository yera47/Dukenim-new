# Dukenim — Higgsfield hero-video spec (production-ready)

Last reviewed: 2026-09-03

## Status and boundaries

- This is a **production brief**, not a generated asset. In the environment where it was
  written there was no authorised Higgsfield access without buying credits, so no video was
  generated and no money was spent.
- The hero must remain fully usable **without** this film. `src/components/marketing/hero-art.tsx`
  keeps its built-in animated CRM / product / phone composition as the visual fallback, and the
  film is an atmospheric layer behind the real interface — never a replacement for it
  (`DECISIONS.md` 2026-08-20; `DESIGN.md` Motion and states).
- Motion character follows the approved reference `IMG_9449.MP4`: smooth, restrained, physically
  responsive; motion clarifies a state change and never becomes decorative clutter.
- `prefers-reduced-motion` must fully suppress playback (see Integration below).
- Do not depict real payment confirmation, real Kaspi/'"перевод"' wording, a real person, the
  Instagram identity, or any competitor UI. Generated UI text stays generic ("Каталог",
  "Корзина", "Заказ", "Новый заказ") — never a fake amount presented as a paid total.

## Placement and role

- Slot: the right-hand sculptural area of the landing hero (`.hero-art-sculpture` /
  `.hero-higgsfield-film`), behind the CRM panel, product card and phone.
- Rendered with `opacity: .42; mix-blend-mode: screen; filter: saturate(.68) contrast(1.06)` and
  `object-fit: cover` (already in `globals.css`). Design the film so it still reads correctly
  when composited at ~42% opacity in "screen" over Black Jade `#071B17`.
- The left ~32–42% of frame is covered by a dark gradient scrim and the headline column; treat
  it as fully obscured.

## Format and export parameters

| Parameter | Value |
|---|---|
| Aspect ratio | 16:9 |
| Master resolution | 1920×1080 (deliver 3840×2160 if the model/plan allows, downscale on export) |
| Duration | 8.0 s, seamless loop (first and last frame must match for a hard cut loop) |
| Frame rate | 30 fps (accept 24 fps source; conform to 30) |
| Color | Rec.709, no baked LUT beyond the grade described below |
| Motion | Locked-off camera or ≤3% slow push-in only; no whip pans, no parallax rig moves |
| Delivered codec | H.264 High, yuv420p, ~8–10 Mbps, `-movflags +faststart`, **no audio track** |
| Also deliver | WebM/VP9 (~1.5–2.5 Mbps) and a 1920×1080 poster JPG/PNG of the first frame |
| Target file size | MP4 ≤ 3.5 MB, WebM ≤ 2.5 MB (hero must not delay LCP) |
| Filename | `dukenim-hero-atelier-loop-v1.mp4` / `.webm` / `-poster.jpg` |

Export naming and the poster let the current integration keep
`poster="/design/dukenim-hero-monolith-base-v1.png"` or switch to the matched poster.

## Look and grade

- Palette strictly from the brandbook: Black Jade `#071B17`, Graphite `#101713`, Aged Gold
  `#B08A50`, Pale Stone `#F4F0E8`, Warm Sand `#E8DFD0`.
- Scene: a quiet, monolithic "atelier of commerce" — dark basalt/obsidian volumes and slabs,
  one warm aged-gold light seam acting as a threshold, fine engraved Kazakh ornament used only
  as a faint surface etch (never a bright graphic). Think architectural, cinematic, expensive,
  restrained — not SaaS, not a particle explosion.
- Single key light, low and warm (aged gold), soft falloff; deep shadows staying above pure
  black so "screen" blending does not crush.
- Subtle volumetric haze, slow dust motes, and a slow-travelling specular highlight along one
  gold seam. No lens flares, no bokeh spheres, no text, no logos, no UI, no people.
- Grain: light, film-like, static-free.

## Storyboard (8 s, 30 fps → 240 frames)

All timings are seconds. Camera is effectively locked; "move" means in-scene motion.

| t (s) | Frames | On screen | In-scene motion |
|---|---|---|---|
| 0.0–1.5 | 0–45 | Establish: three dark monolith slabs, one horizontal aged-gold light seam low-right, haze settling | Haze drifts left→right very slowly; one dust mote falls |
| 1.5–3.5 | 45–105 | The gold seam brightens ~15% and a specular glint travels along it left→right | Glint travel; faint ornament etch fades up ~8% on the tallest slab |
| 3.5–5.5 | 105–165 | A second, shorter gold seam lights on a lower slab; a soft warm bloom pulses once at the seam intersection (a "threshold opening" feeling, abstract) | Bloom rises and falls once over ~0.8 s; haze continues |
| 5.5–7.0 | 165–210 | Everything settles back toward the opening state; brightness eases down to match frame 0 | Glint returns to start x-position; haze phase realigns to loop |
| 7.0–8.0 | 210–240 | Hold on the settled establishing look, identical framing/brightness to 0.0 | Only haze + one mote, matched to the 0.0 state for a seamless cut |

Loop rule: frame 240 ≡ frame 0 in composition, brightness, haze position and mote position.

## First frame / last frame

- **First frame (poster):** wide, locked shot. Left 40% in shadow/gradient. Right: three
  overlapping obsidian slabs with a single dim aged-gold horizontal seam at ~65% width, ~70%
  height. Haze low. No bright hotspots. Overall exposure low-key so the interface composited on
  top stays dominant. This frame is exported as the poster.
- **Last frame:** visually identical to the first frame (same framing, same seam brightness,
  same haze and mote position) so the 8 s loop cuts with no visible jump.

## Safe areas (1920×1080 reference)

- **Obscured — put nothing important here:** left 0–800 px (headline column + scrim), and a
  180 px feather from the top and bottom edges (gradient overlays in `globals.css`).
- **Interface occlusion — keep visually calm, low-contrast:** center-right box roughly
  x 980–1780, y 150–560 (CRM panel), x 1180–1730 y 40–260 (product card), x 1280–1620 y
  360–1060 (phone). Motion behind these areas must be gentle; no bright moving edges directly
  under the phone.
- **Best area for the visible gold-seam action:** x 1150–1900, y 560–860 (below/right of the
  phone and CRM panel), which stays uncovered on desktop.
- On mobile the art becomes a full-width band `clip-path: polygon(0 5%,100% 0,100% 100%,0 100%)`
  ~30–42 rem tall; keep the key seam within the vertical center third so the diagonal top cut
  does not remove it.

## Higgsfield prompt (image-to-video preferred; start from a brand still)

**Positive prompt:**

```
Cinematic locked-off wide shot of a dark monolithic "atelier of commerce": overlapping obsidian
and black-jade basalt slabs in deep shadow, one warm aged-gold horizontal light seam low on the
right acting as a threshold, faint engraved Kazakh geometric ornament etched almost invisibly
into one slab, slow volumetric haze, a few slow dust motes, a single slow specular glint
travelling along the gold seam, one soft warm bloom pulse at a seam intersection then settling
back. Colour palette limited to deep green-black #071B17 / #101713, aged gold #B08A50, pale
stone #F4F0E8. Low-key single warm key light, soft falloff, shadows lifted above pure black,
light film grain. Architectural, restrained, expensive, quiet. Seamless loop, first and last
frame identical. No text, no logo, no UI, no people, no lens flare.
```

**Negative prompt:**

```
text, typography, letters, numbers, watermark, logo, UI, user interface, buttons, app screen,
phone mockup, people, person, hands, face, fast motion, camera shake, whip pan, zoom burst,
strobe, flicker, particles explosion, sparkles, glitter, neon, rainbow colours, teal-and-orange
grade, oversaturated, HDR bloom overload, bokeh balls, lens flare, cartoon, 3d render look,
low quality, jpeg artifacts, banding, morphing geometry, warping walls, seams not matching on
loop, subtitles, caption
```

**Generation settings guidance:** image-to-video from an approved brand still if available
(e.g. `public/design/dukenim-hero-monolith-base-v1.png`); motion/strength low (the scene is
nearly still); duration 8 s or the nearest supported (5 s acceptable, then loop-extend);
disable any model audio; pick the most photographic / least "AI motion" model tier available
on the current plan. Do not upgrade the plan or buy credits to unlock a tier without explicit
owner approval of the exact cost.

## Review checklist before the film is used

1. Loop cut is invisible at 8 s (scrub frame 239→0).
2. At 42% opacity, `screen` blend over `#071B17`, nothing brighter than the aged-gold seam.
3. Nothing legible (no accidental text/shapes) appears behind the phone.
4. Poster frame exported and matches the first frame.
5. MP4 has no audio track; `faststart` set; file size within budget.
6. Plays on iOS Safari (muted, `playsInline`) and does not autoplay under reduced motion.

## Integration in code

- `src/components/marketing/hero-art.tsx` reads `NEXT_PUBLIC_HIGGSFIELD_HERO_VIDEO`. Set it to
  the deployed `/…/dukenim-hero-atelier-loop-v1.mp4` URL **only after** the review checklist
  passes. While it is blank, the built-in scene renders and nothing is missing.
- The component now also checks `prefers-reduced-motion`: when the user asks for reduced motion,
  the `<video autoPlay loop>` is not rendered at all — only the still poster — so the film adds
  zero motion for those users. Keep this behaviour if the slot is refactored.
- If both an MP4 and a WebM are shipped, add a second `<source>` for the WebM before the MP4
  source; browsers pick the first they support.
- Do not deploy the film URL and change DNS in the same step; treat it as a normal release
  with `npx tsc --noEmit`, `npm run build`, and a visual pass of the landing hero at the
  mobile, tablet and desktop breakpoints.
