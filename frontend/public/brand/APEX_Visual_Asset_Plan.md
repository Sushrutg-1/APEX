# APEX — Complete Visual Asset Plan

**Brand:** APEX — Advanced Platform for Event Intelligence and Execution
**Positioning:** Professional rover monitoring & control platform (IoT / field ops), not a sci-fi AI product.
**Test for every asset:** Would this look at home on a real industrial monitoring SaaS site, next to the APEX dashboard? If it reads as "generic AI," redo it.

---

## 0. Brand system reference (applies to every asset below)

| Token | Hex | Use |
|---|---|---|
| Primary Navy | `#0B1220` | Dark backgrounds, wordmark on light |
| Secondary Navy | `#162033` | Dark surfaces, cards |
| Background | `#F7F8FA` | App/page background |
| White | `#FFFFFF` | Cards, light surfaces |
| Primary Text | `#111827` | Body copy |
| Secondary Text | `#64748B` | Captions, labels |
| Border | `#E2E8F0` | Dividers, card borders |
| Brand Blue | `#2563EB` | Primary accent, CTAs, active states |
| Secondary Blue | `#3B82F6` | Hover, secondary accents |
| Light Blue | `#60A5FA` | Mark accent on dark bg, chart highlight |
| Success | `#16A34A` | Online / success only |
| Warning | `#D97706` | Warning states only |
| Danger | `#DC2626` | Critical alerts only |
| Dark Background | `#070B12` | Dark-mode app background |
| Dark Surface | `#0F1724` | Dark-mode cards |
| Dark Border | `#1E293B` | Dark-mode dividers |
| Dark Text | `#F8FAFC` | Dark-mode text |

**Color balance across any composite image:** ~70% neutral, ~20% navy/charcoal, ~7% blue accent, ~3% status color. Never let blue dominate a scene — it marks specific UI/data elements, not the whole image.

**Fonts:** Inter for all UI/product text. Manrope only for large marketing headlines (hero text, OG image title). No other typefaces.

**Universal negative prompt** (append to every photographic/illustration generation prompt):
`no humanoid robots, no glowing circuit patterns, no cyberpunk or neon, no purple AI gradient lighting, no holographic UI, no floating 3D glass panels, no cartoon or mascot characters, no glassmorphism, no lens flare, no sci-fi weaponry, no generic "AI brain" iconography`

---

## 1. BRAND — Logo system

Delivered in this response as working SVG files (see attached), built from a single geometric mark: two offset diagonal strokes meeting near an open apex, crossed by a short blue accent bar — reads as an "A," and doubles as a directional/navigation arrow. Abstract, not a literal vehicle or robot, legible at 16px.

| Asset | Filename | Format | Transparent | Sizes tested | Where used |
|---|---|---|---|---|---|
| Primary logo (mark + wordmark, light) | `logo.svg` | SVG | Yes | 16–512px | Website navbar (light), docs, presentations |
| Primary logo, dark bg | `logo-dark.svg` | SVG | Yes | 16–512px | Dark navbar, dark landing hero |
| Horizontal logo (compact) | `logo-horizontal.svg` | SVG | Yes | 24–128px | App header bar, email footer |
| Symbol only | `logo-mark.svg` | SVG | Yes | 16–512px | Sidebar collapsed state, loading screen |
| Symbol only, dark bg | `logo-mark-dark.svg` | SVG | Yes | 16–512px | Dark sidebar, splash screen |
| Wordmark only | `wordmark.svg` | SVG | Yes | any | Legal footer, merch, minimal contexts |
| Monochrome black | `logo-mark-black.svg` | SVG | Yes | any | Print, single-color stamping, watermarks |
| Monochrome white | `logo-mark-white.svg` | SVG | Yes | any | Dark photo overlays, embroidery |
| Favicon | `favicon.svg` (export `favicon.ico`, `favicon-32.png`, `favicon-16.png`) | SVG→ICO/PNG | No (navy bg) | 16, 32, 48px | Browser tab |
| App icon | `app-icon.svg` (export 1024px PNG for stores) | SVG→PNG | No (navy bg, rounded per-platform mask) | 512–1024px | iOS/Android home screen, PWA icon |

All logo files are in `/mnt/user-data/outputs/brand/`. Recolor by swapping the two stroke colors and the accent color — do not redraw the geometry.

---

## 2–3. LANDING PAGE — Hero & Dashboard mockup (P0)

### Hero visual — `hero-rover-field.jpg`
- **Purpose:** Landing page hero, establishes "this is a real rover product."
- **Dimensions:** 2880×1620px (2x for 1440px layout), export web copy at 1920×1080 WebP.
- **Format:** JPG master / WebP for web. Non-transparent.
- **Generation prompt:** *"Professional product photograph of a compact four-wheeled outdoor monitoring rover, matte dark-gray and navy chassis with a small blue status LED strip, mounted mast camera with pan-tilt housing, positioned on a gravel path at the edge of an industrial research facility at dusk. Natural overcast lighting with a single soft blue accent rim light from the left. Shallow but realistic depth of field, sharp focus on the rover. Wide negative space of out-of-focus facility/field in the upper third and right side for text overlay. Realistic materials — brushed aluminum, matte plastic, rubber treads. No people, no other vehicles, no visible logos. Commercial product photography style, Canon 5D quality, natural color grading, restrained contrast."* + universal negative prompt.
- **Usage:** Landing page hero background, behind headline + CTA.
- **Color:** Neutral/dark environment, single blue accent light only.

### Dashboard mockup — `dashboard-mockup.png`
- **Purpose:** Shows the actual product below/behind the hero, proof it's a real SaaS.
- **Dimensions:** 2400×1500px @2x.
- **Format:** PNG (screen content, needs crisp edges), non-transparent (or transparent outer frame if placed in a device bezel).
- **Generation prompt:** *"High-fidelity UI screenshot mockup of a rover monitoring web dashboard. Dark navy sidebar (#0B1220) with white wordmark 'APEX' top-left and simple line icons (dashboard, map, camera, history, settings). Main panel on #F7F8FA background: top-left large live camera feed panel with a subtle rover-eye-view of an outdoor gravel yard, blue pan/tilt control overlay bottom-right of the feed; top-right a GPS map panel with light-gray map, blue route line, blue rover marker, and a dashed geofence boundary; below, three small stat cards showing Battery 82%, Speed 1.4 m/s, Signal -61 dBm each with a small icon and thin border; bottom strip shows a row of recent snapshot thumbnails with detection tags. Clean 8px-grid spacing, Inter typeface, thin 1px borders (#E2E8F0), rounded 8px corners, flat design, no gradients, no drop shadows beyond subtle 2% card elevation."* + universal negative prompt.
- **Usage:** Below hero on landing page, feature section anchor image, App Store/README screenshot.
- **Color:** Strict brand palette above — blue only for active/data elements.

---

## 4. ROVER IMAGERY (P0/P1) — one consistent rover across all shots

Establish the rover design once (compact 4-wheel chassis, matte navy/charcoal body, mast-mounted camera with pan-tilt gimbal, single blue status strip, no visible branding of other companies) and reuse this exact description in every prompt below so all ten images depict the same unit.

**Shared rover description to paste into every prompt:**
*"[SAME ROVER: compact rugged four-wheeled monitoring rover, ~50cm long, matte dark charcoal-navy polymer chassis, visible suspension arms, a raised rear mast with a gimbal-mounted camera module (small pan-tilt housing, single front lens, tiny status LED), subtle blue accent strip along the chassis edge, no visible third-party logos, realistic industrial-grade fabrication, brushed metal accents at joints]"*

| # | Shot | Filename | Dimensions | Prompt focus |
|---|---|---|---|---|
| 1 | Front view | `rover-front.jpg` | 1600×1600 | Studio-lit front elevation, seamless light-gray sweep background, symmetrical |
| 2 | Side view | `rover-side.jpg` | 2000×1200 | Full profile, same studio setup, shows suspension & wheel detail |
| 3 | Three-quarter view | `rover-three-quarter.jpg` | 2000×1500 | 3/4 hero angle, subtle gradient background, primary catalog image |
| 4 | Outdoor field | `rover-field.jpg` | 2400×1600 | On gravel/dirt path, overcast daylight, wide environment |
| 5 | Indoor monitoring | `rover-indoor.jpg` | 2400×1600 | In a clean industrial facility corridor, cool fluorescent lighting |
| 6 | Close-up (chassis) | `rover-closeup.jpg` | 1800×1800 | Macro on suspension/wheel joint, shows material realism |
| 7 | Camera close-up | `rover-camera-closeup.jpg` | 1800×1800 | Macro on the gimbal camera module, lens detail, status LED lit blue |
| 8 | Sensor close-up | `rover-sensor-closeup.jpg` | 1800×1800 | Macro on GPS/antenna and sensor cluster on the mast |
| 9 | Moving | `rover-moving.jpg` | 2400×1400 | Motion on gravel, slight motion blur on wheels only, rover sharp |
| 10 | Stationary monitoring | `rover-stationary.jpg` | 2400×1600 | Parked at a fixed post/dock, camera mast raised, dusk lighting |

- **Format:** JPG master, WebP delivery. Non-transparent (studio shots may use a light-gray sweep that can be cleanly knocked out later if a transparent cutout is needed for the app).
- **Style:** professional product photography, realistic materials/reflections, controlled lighting, sharp focus, industrial finish — never sci-fi, never oversaturated.

---

## 5. TECHNICAL ILLUSTRATIONS (P1) — process diagrams

Shared style for this whole set: thin 2px consistent line weight, navy `#0B1220` linework, single blue `#2563EB` accent per diagram, white/`#F7F8FA` background, simple flat geometric icons (no gradients, no cartoon proportions), consistent 700×400 canvas.

| Diagram | Filename | Prompt |
|---|---|---|
| GPS tracking | `tech-gps-tracking.svg` | "Minimal line-art diagram: simplified rover icon on the left connected by a thin dotted path to a location-pin icon, with a faint route line and one small waypoint dot between them. Navy linework, one blue accent element, white background, flat vector, no perspective distortion." |
| Live monitoring | `tech-live-monitoring.svg` | "Line-art diagram showing a simplified rover icon with a small camera glyph, connected by a signal-wave line to a rectangular dashboard-screen icon. Navy lines, blue accent on the signal waves only." |
| Remote control | `tech-remote-control.svg` | "Line-art diagram: a simple hand/cursor-and-joystick glyph on the left, an arrow, then a simplified rover icon on the right showing directional motion lines. Navy + one blue accent." |
| Event detection | `tech-event-detection.svg` | "Line-art diagram: camera icon → dotted scan-frame around a small silhouette shape → bell/alert icon. Navy lines, blue scan-frame, no red (reserve red for real alerts)." |
| Geofencing | `tech-geofencing.svg` | "Line-art diagram: simplified top-down map tile with a dashed polygon boundary, a rover icon inside it, one rover icon crossing the boundary line. Navy map lines, blue boundary." |
| Snapshot capture | `tech-snapshot-capture.svg` | "Line-art diagram: camera icon → single photograph-frame icon → small stacked-cards icon representing history. Navy lines, blue accent on the capture frame only." |
| Telemetry | `tech-telemetry.svg` | "Line-art diagram: rover icon feeding three small glyphs (speedometer, battery, signal bars) via thin lines into a dashboard-screen icon. Navy lines, blue accent on the connecting lines." |

---

## 6. FEATURE ILLUSTRATIONS (P1) — 6-piece set for the features section

One shared visual system: same 2px line weight, same isometric-flat 3/4 perspective, same palette (navy line, blue accent fill at ~15% opacity, no other colors), same canvas 480×360, same character of detail (simple geometric icons, not scenes).

| # | Feature | Filename | Prompt core |
|---|---|---|---|
| 1 | Live Rover Monitoring | `feature-live-monitoring.svg` | Rover glyph + radiating signal arcs + small live-dot indicator |
| 2 | Remote Vehicle Control | `feature-remote-control.svg` | D-pad/joystick glyph with directional arrows toward a rover glyph |
| 3 | GPS Tracking | `feature-gps-tracking.svg` | Map-pin glyph with a dotted trail and small rover glyph at the end |
| 4 | Live Camera | `feature-live-camera.svg` | Camera glyph with a viewfinder frame and a small "LIVE" corner tag (no text baked in — leave as a dot) |
| 5 | Event Detection | `feature-event-detection.svg` | Scan-frame glyph around a simple silhouette, with a small alert dot |
| 6 | Snapshot History | `feature-snapshot-history.svg` | Stacked photo-card glyphs, slightly fanned |

All six must be generated in the same session/prompt batch with "maintain identical line weight, perspective, and palette across this set" appended, so they visually belong together.

---

## 7. AUTHENTICATION ASSETS (P1)

| Asset | Filename | Dimensions | Prompt |
|---|---|---|---|
| Login illustration | `login-illustration.svg` | 480×480, transparent | "Small, restrained abstract line illustration: a simplified map-grid backdrop with a single rover glyph and a dotted route line, navy lines, one blue accent dot marking current position. Very minimal, mostly negative space, sits comfortably beside a login form without competing for attention." |
| Signup illustration | `signup-illustration.svg` | 480×480, transparent | "Same visual system as the login illustration: simplified dashboard-tile glyph with a checkmark accent, navy lines, single blue accent, minimal and restrained." |

---

## 8. EMPTY STATE ASSETS (P1)

Shared style: monochrome secondary-text gray `#64748B` linework, one small blue `#2563EB` accent per icon, geometric, no characters, 240×240 canvas.

| State | Filename | Prompt |
|---|---|---|
| No snapshot history | `empty-snapshots.svg` | "Minimal geometric icon: an empty photo-frame outline with a faint stack shadow behind it, gray linework, single blue corner accent." |
| No events | `empty-events.svg` | "Minimal geometric icon: an outlined bell/alert shape with no dot, gray linework only." |
| Rover offline | `empty-rover-offline.svg` | "Minimal geometric icon: simplified rover glyph rendered in dashed/faded outline, one small muted-gray disconnect glyph beside it." |
| Camera unavailable | `empty-camera-unavailable.svg` | "Minimal geometric icon: camera glyph outline with a faint diagonal slash, gray linework, no red." |
| GPS unavailable | `empty-gps-unavailable.svg` | "Minimal geometric icon: map-pin outline faded to 40% opacity with a small question-mark-free 'searching' pulse ring." |
| No search results | `empty-search-results.svg` | "Minimal geometric icon: magnifying glass outline over a faint empty grid pattern, gray linework, single blue accent on the glass rim." |

---

## 9. ERROR STATE ASSETS (P1)

Same restrained system as empty states, but reserve `#DC2626` for a single small accent only where truly critical (server/connection errors), not decoratively.

| State | Filename | Prompt |
|---|---|---|
| 404 | `error-404.svg` | "Minimal geometric illustration: a broken/offset route line ending abruptly with a small map-pin outline, gray linework, no large numerals baked into the art." |
| Connection lost | `error-connection-lost.svg` | "Minimal geometric icon: two signal-wave glyphs with a gap/break between them, gray linework, one small amber accent dot." |
| Server error | `error-server.svg` | "Minimal geometric icon: simplified server-rack glyph with one small red accent dot, otherwise gray linework." |
| Camera error | `error-camera.svg` | "Minimal geometric icon: camera glyph outline with a small warning triangle accent in amber." |
| GPS error | `error-gps.svg` | "Minimal geometric icon: map-pin outline with a small warning triangle accent in amber." |
| Rover disconnected | `error-rover-disconnected.svg` | "Minimal geometric icon: rover glyph split by a small signal-break glyph, gray linework, one red accent dot." |

---

## 10. STATUS GRAPHICS (P0/P1 — used everywhere in-app)

Simple dot/pill indicators, not illustrations. Build directly as small SVG/CSS components rather than generated images:

| State | Visual | Color |
|---|---|---|
| Online | Solid filled circle | `#16A34A` |
| Offline | Solid filled circle, muted | `#64748B` at 60% opacity |
| Connecting | Pulsing ring animation | `#2563EB` |
| Warning | Filled triangle or dot | `#D97706` |
| Critical | Filled circle with subtle pulse | `#DC2626` |
| Success (transient) | Filled circle + checkmark | `#16A34A` |

Deliver as a single `status-indicators.svg` sprite sheet (6 symbols, 24×24 each) rather than six separate files — simplest to maintain and matches how these are consumed in code.

---

## 11. ICON SYSTEM

**Recommendation: use Lucide icons directly for all standard UI glyphs** — do not regenerate these as custom art; Lucide already matches the required geometric/outline/consistent-stroke style and keeps the app maintainable.

Map required icons to existing Lucide names:

`Dashboard→layout-dashboard`, `Home→home`, `History→history`, `Camera→camera`, `Map→map`, `GPS→map-pin`, `Navigation→navigation`, `Battery→battery`, `Speed→gauge`, `Signal→signal`, `WiFi→wifi`, `Satellite→satellite-dish`, `Alert→bell`, `Warning→triangle-alert`, `Settings→settings`, `Profile→user`, `Logout→log-out`, `Snapshot→camera`, `Pan→move-horizontal`, `Tilt→move-vertical`, `Forward→arrow-up`, `Backward→arrow-down`, `Left→arrow-left`, `Right→arrow-right`, `Stop→square`, `Detection→scan-search`, `Event→zap`, `Analytics→bar-chart-3`, `Search→search`, `Filter→filter`, `Download→download`, `Delete→trash-2`, `Close→x`, `Check→check`, `Chevron→chevron-down` (rotate per direction), `Menu→menu`.

**Custom (not in Lucide, need a matching one-off mark):**

| Icon | Filename | Prompt |
|---|---|---|
| Rover | `icon-rover.svg` | "Single-color outline icon of a simplified 4-wheel rover from a 3/4 angle, 2px stroke, 24×24 grid, matches Lucide's stroke weight and corner radius exactly, no fill." |
| Geofence | `icon-geofence.svg` | "Single-color outline icon: a dashed polygon boundary shape, 2px stroke, 24×24 grid, Lucide-matched style." |

---

## 12. MAP VISUAL STYLE

Not a generated image — a style spec for the live map component:

- Base map: neutral light gray (`#F7F8FA`/`#E2E8F0` tones), desaturated roads, muted gray labels.
- Rover marker: filled blue (`#2563EB`) circle with white outline, small direction wedge.
- Route line: solid blue `#2563EB`, 3px, rounded joins.
- Geofence boundary: dashed navy `#0B1220` or blue outline, ~15% blue fill inside.
- Critical event markers: red `#DC2626` pin, used only for genuine critical events — never decoratively.
- Keep contrast low enough that UI cards/overlays remain legible on top.

---

## 13. SNAPSHOT HISTORY EXAMPLE IMAGES (P1)

Six example capture images, all framed as if shot from the rover's own mast camera (slightly low angle, fixed lens character, consistent slight barrel distortion and color grading) so they read as one continuous product, not stock photos.

| # | Scene | Filename | Prompt |
|---|---|---|---|
| 1 | Person detection | `history-person-detection.jpg` | "First-person rover camera capture, slightly low angle with mild lens barrel distortion, muted natural color grading, outdoor daylight scene showing a distant person walking across a gravel yard. Neutral realistic tones, no overlay graphics baked in." |
| 2 | Vehicle detection | `history-vehicle-detection.jpg` | "Same rover-camera lens character as the set, outdoor daylight, a parked utility van at the edge of frame on a gravel lot." |
| 3 | Object detection | `history-object-detection.jpg` | "Same rover-camera lens character, a stack of storage crates/pallets in an outdoor yard, mid-afternoon light." |
| 4 | Empty scene | `history-empty-scene.jpg` | "Same rover-camera lens character, quiet empty gravel yard with a chain-link fence, no subjects, overcast light." |
| 5 | Outdoor environment | `history-outdoor.jpg` | "Same rover-camera lens character, wide outdoor field view at dusk, facility perimeter fence in the distance." |
| 6 | Indoor environment | `history-indoor.jpg` | "Same rover-camera lens character, a plain industrial corridor/warehouse aisle under fluorescent lighting." |

**Dimensions:** 1280×720 (16:9, matches a live camera feed aspect). **Format:** JPG. Generate all six in one batch with "identical lens/color-grade character across this set" appended so the History grid feels like one camera.

---

## 14. SOCIAL / MARKETING ASSETS (P2)

| Asset | Filename | Dimensions | Format | Notes |
|---|---|---|---|---|
| Open Graph image | `og-image.png` | 1200×630 | PNG | Navy `#0B1220` background, APEX logo top-left, large Manrope headline "APEX", subhead "Advanced Platform for Event Intelligence and Execution", small tagline "Monitor. Control. Respond." bottom-left, three-quarter rover product shot or dashboard crop on the right third. |
| Website preview / general social share | `social-preview.png` | 1200×630 | PNG | Same system as OG image, can reuse directly. |
| LinkedIn banner | `linkedin-banner.png` | 1584×396 | PNG | Wide crop of the hero rover image with logo + tagline overlaid left-aligned, generous negative space (LinkedIn overlays the profile photo on the left). |
| Project presentation cover | `presentation-cover.png` | 1920×1080 | PNG | Dark navy background, centered logo lockup, tagline, subtle dark technical-grid background asset beneath. |
| GitHub repo social preview | `github-social-preview.png` | 1280×640 | PNG | Simplified: logo + wordmark centered on navy, no photography (renders small in GitHub's UI). |

All must reuse the exact logo files, palette, and hero/dashboard imagery already generated — no new visual language introduced.

---

## 15. PRESENTATION ASSETS (P2)

| Slide | Filename | Notes |
|---|---|---|
| Title slide background | `pres-title-bg.png` | Dark navy + subtle grid background, logo lockup, 1920×1080. |
| Architecture slide | `pres-architecture.svg` | Simple boxes-and-lines system diagram (rover → gateway → cloud → dashboard), same line style as Section 5. |
| Rover overview | `pres-rover-overview.jpg` | Reuse `rover-three-quarter.jpg`. |
| System workflow | `pres-system-workflow.svg` | Combine the 7 technical-illustration glyphs from Section 5 into one horizontal flow. |
| GPS tracking | `pres-gps-tracking.jpg` / `.svg` | Reuse map style spec (Section 12) with sample route. |
| Camera monitoring | `pres-camera-monitoring.jpg` | Reuse `rover-camera-closeup.jpg` or a history example image. |
| Event detection | `pres-event-detection.svg` | Reuse `tech-event-detection.svg`. |
| Dashboard screenshot | `pres-dashboard.png` | Reuse `dashboard-mockup.png`. |
| Technology stack | `pres-tech-stack.svg` | Simple logo-grid of stack components in flat monochrome, brand-consistent. |

Format: SVG/transparent PNG so each drops cleanly into slide templates.

---

## 16. BACKGROUND ASSETS (P3 — keep extremely subtle)

| Background | Filename | Notes |
|---|---|---|
| Dark technical grid | `bg-dark-grid.svg` | 1px lines, `#1E293B` on `#070B12`, ~4–6% opacity, large repeat tile. |
| Subtle map/grid texture | `bg-map-texture.svg` | Very faint road/grid lines, `#E2E8F0` on `#F7F8FA`, ~5% opacity. |
| Light geometric background | `bg-light-geometric.svg` | A few large, very low-opacity angled lines echoing the logo geometry — never competing with foreground UI. |
| Dark landing background | `bg-dark-landing.jpg` | Very subtle out-of-focus facility/field photo, heavily darkened, sits behind hero text only. |

Rule: every background must pass this check — cover it with real UI/text and confirm nothing distracting shows through.

---

## 17. File format quick-reference

| Type | Format | When |
|---|---|---|
| Logos, icons, diagrams, simple illustrations | SVG (export PNG/ICO as needed) | Always scalable, crisp at all sizes |
| Transparent illustrations, app icons, marketing composites | PNG | Needs transparency or crisp UI edges |
| Photography (rover, hero, history examples) | JPG master, WebP for delivery | Photographic content, no transparency needed |

---

## 18. Folder structure (as delivered)

```
public/
├── brand/
│   ├── logo.svg
│   ├── logo-dark.svg
│   ├── logo-horizontal.svg
│   ├── logo-mark.svg
│   ├── logo-mark-dark.svg
│   ├── logo-mark-black.svg
│   ├── logo-mark-white.svg
│   ├── wordmark.svg
│   ├── favicon.svg
│   └── app-icon.svg
├── images/
│   ├── hero/            (hero-rover-field.jpg, bg-dark-landing.jpg)
│   ├── rover/            (rover-front.jpg … rover-stationary.jpg)
│   ├── camera/           (rover-camera-closeup.jpg)
│   ├── monitoring/       (dashboard-mockup.png, rover-indoor.jpg)
│   └── history/          (history-*.jpg)
├── illustrations/
│   ├── features/         (feature-*.svg)
│   ├── authentication/   (login-illustration.svg, signup-illustration.svg)
│   ├── empty-states/      (empty-*.svg)
│   ├── errors/            (error-*.svg)
│   └── technical/         (tech-*.svg, icon-rover.svg, icon-geofence.svg, status-indicators.svg)
├── backgrounds/           (bg-*.svg, bg-*.jpg)
├── marketing/
│   ├── og-image.png
│   ├── social-preview.png
│   ├── linkedin-banner.png
│   ├── presentation-cover.png
│   └── github-social-preview.png
└── icons/                  (use Lucide directly; only icon-rover.svg / icon-geofence.svg live here as custom SVGs)
```

---

## 19. Build order (priority)

1. **P0 (done in this response):** full logo/icon family, favicon, app icon.
2. **P0 (next, needs an image-generation tool):** hero rover photo, dashboard mockup, one rover three-quarter shot.
3. **P1:** remaining rover shots, technical + feature illustration set, empty/error states, auth illustrations, history example images.
4. **P2:** OG image, social preview, LinkedIn banner, presentation cover.
5. **P3:** decorative backgrounds, any extras.

**Note on photography/complex illustrations:** the logo/icon SVGs above are delivered as real, ready-to-use files in this conversation. The rover photography, dashboard mockup, and illustration sets are specified above with exact, ready-to-paste generation prompts — feed each prompt into an image-generation tool (Midjourney, DALL·E, Claude's image tool if you have one connected, etc.) one asset at a time, since each needs a dedicated render pass rather than being produced as code.
