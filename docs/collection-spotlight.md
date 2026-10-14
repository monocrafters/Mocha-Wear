# Collection hero

The desktop homepage uses a restrained collection carousel with a larger active circle. It advances every five seconds by default, including while hovered or after manual selection. Explicit pause/play controls remain available. Hidden browser tabs suspend the timer; returning starts a full interval. Reduced-motion preferences remove animated movement. Mobile retains the existing hero.

Each circle shows a complete collection montage, contained inside its frame without cropping away corner articles. The active artwork also supplies the subtle background atmosphere. There are no individual product names, prices or product cards within the desktop hero. The primary link opens the active collection.

Admin -> Hero -> Collection hero manages publication, title, artwork, optional background, ordering, automatic rotation and 4-15 second intervals. Create future collections in Collections first, then add them here as drafts, upload complete collection artwork and publish. Published hero entries require an image. Catalog-unpublished and deleted collections are filtered from the public response. Existing legacy hero slides remain separate.

Deploy backend and frontend together. Endpoints: public GET /api/spotlight; authenticated GET/PUT /api/admin/spotlight and POST /api/admin/spotlight/image. Uses the existing private document store with document collection_spotlight; no schema migration. Until that API is deployed, local preview uses bundled defaults and admin saving is disabled with an explanation. Existing saved documents keep their explicit settings.

## Artwork

Built-in image_gen produced five collection montages from reference sheets containing all current collection memberships: Cotton & Lawn 9, Khaddar 16, Bana Dora 11, Grip Silk 3 and Cotrai 9. Five published collections were available, so no sixth collection was invented. All 48 memberships, including secondary collection assignments, are recorded in collection-artwork-sources.json. These promotional composites do not replace product listing photography.

Final assets are frontend/public/images/collections/*-v2.png. Exact prompts and counts are recorded in collection-image-prompts-v2.json. Older artwork remains in the repository but is not referenced by the new defaults. New articles do not automatically regenerate imagery: upload an updated montage through the editor when collection contents change.

## Validation

Backend tests cover five-second defaults, persistence, publication filtering, ordering, draft creation, required artwork, invalid settings, duplicates, unknown collections and image URL validation. Browser checks cover rotation during hover/focus, manual reset, wraparound, explicit pause, stable timing across catalog refreshes, reduced motion, single/disabled collections, desktop bounds and links. Admin browser checks use mocked authenticated responses for upload, ordering, publication, reload and API error handling; production records are not modified.
