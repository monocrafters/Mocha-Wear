# Homepage editorial design

The homepage uses the existing published content and settings; no data migration is needed.

## Managing content

- **Hero:** Admin → Hero. Images/videos, heading and italic accent, description, labels, sale badges and both links remain editable. Slides use manual previous/next and selection controls. Image-only slides remain supported; videos have native playback controls and do not download or autoplay in the background.
- **Collections:** Admin → Collections. The first four published collections, in their configured order, appear in the staggered collection grid. All collections remain accessible through the collection link.
- **Products:** Admin → Products. The homepage displays up to eight products per collection filter, using the catalogue order. The full shop is always accessible. The catalogue provider still supplies reseller-specific prices and multiple collection memberships.
- **Section headings:** Admin → Settings → Homepage collections / Homepage products / Reviews.
- **Atelier story:** Uses the Settings brand name, atelier heading and tagline. Its photograph uses a secondary product image when available, otherwise the first product cover.
- **Reviews:** Admin → Reviews, with the existing horizontal review controls.
- **Services:** Admin → Settings → Before you buy. Titles, descriptions and support link label remain editable.
- **Newsletter:** Settings controls visibility, heading and button text. This is explicitly an email-request form: it opens the visitor's email app addressed to the configured store email, rather than claiming to save a subscription. It hides if no store email is configured.
- **Footer:** Uses the existing brand, contact email, Instagram, mobile line, visit heading and copyright settings.
- **WhatsApp:** The existing floating button remains in the store layout and continues to resolve reseller contacts.

## Performance and accessibility

The first hero is server-rendered with a 60-second revalidation interval and a bounded API timeout. Only the active hero media is mounted. Responsive images reserve their aspect ratios and images below the hero stay lazy-loaded. The product grid is capped at eight cards; no new frontend runtime dependencies are needed.

The homepage has one main heading, labelled carousel buttons, native filter buttons with pressed states, keyboard focus outlines, reduced-motion styles and mobile layouts down to 320px. Sale timers do not announce every second to screen readers.
