# Homepage campaign design

The homepage uses the existing published content and settings; no data migration is needed.

## Managing content

- **Hero copy:** Admin → Settings → Homepage hero. A headline, optional italic accent, short supporting line, and one button form the opening campaign. Defaults apply to existing stores without a migration. Text length limits keep campaign copy concise, and the button accepts internal paths, anchors, or HTTP(S) URLs.
- **Hero media:** Admin → Hero → Use on homepage. This promotes the chosen published image/video to the first position, including across the Slides and Images tabs. Only this media is shown: no rotating gallery, counters, offer badges, specifications, or secondary CTA. Existing slide data remains saved. Videos have native playback controls and do not download or autoplay in the background.
- **Collections:** Admin → Collections. The first four published collections, in their configured order, appear in an aligned four-column grid (two columns on phones). All collections remain accessible through the collection link.
- **Products:** Admin → Products. The homepage displays up to eight products per collection filter, using the catalogue order. The full shop is always accessible. The catalogue provider still supplies reseller-specific prices and multiple collection memberships.
- **Section headings:** Admin → Settings → Homepage collections / Homepage products / Reviews.
- **Atelier story:** Uses the Settings brand name, atelier heading and tagline. Its photograph uses a secondary product image when available, otherwise the first product cover.
- **Reviews:** Admin → Reviews, with the existing horizontal review controls.
- **Services:** Admin → Settings → Before you buy. Titles, descriptions and support link label remain editable.
- **Newsletter:** Settings controls visibility, heading and button text. This is explicitly an email-request form: it opens the visitor's email app addressed to the configured store email, rather than claiming to save a subscription. It hides if no store email is configured.
- **Footer:** Uses the existing brand, contact email, Instagram, mobile line, visit heading and copyright settings.
- **WhatsApp:** The existing floating button remains in the store layout and continues to resolve reseller contacts.

## Performance and accessibility

The first hero is server-rendered with a 60-second revalidation interval and a bounded API timeout. Only one hero media is mounted. DM Sans and Cormorant Garamond are self-hosted through next/font. Responsive images reserve their aspect ratios and images below the hero stay lazy-loaded. The product grid is capped at eight cards; no new frontend runtime dependencies are needed.

The homepage has one main heading, native filter buttons with pressed states, keyboard focus outlines, reduced-motion styles and mobile layouts down to 320px. Sale timers do not announce every second to screen readers. Hero content stays in normal flow so longer custom copy can grow rather than clip. The default campaign fits the first screen above the mobile navigation.

The mobile navigation uses equal icon/label alignment, a 64px row, safe-area padding, and a forest selected state. Cart and order badges remain available. The WhatsApp button keeps reseller contact resolution and dragging, with a smaller visual treatment and position bounds based on the navigation's measured height.

The hero backdrop is a small, blurred version of the selected image. Foreground masks blend into this image-derived background, with a light overlay behind copy for readability. Changing the hero image updates both layers automatically; the blend is not tied to one photograph's background color.
