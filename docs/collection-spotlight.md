# Collection spotlight

Desktop homepage uses an expanding circle selector and collection-linked artwork. Mobile retains existing hero slides. Admin → Hero → Collection spotlight manages publication, title, description, image uploads, separate background, order, autoplay and 4–15 second intervals. Create future collections in Collections first, then select them in the spotlight editor. Unpublished/deleted collections are filtered from the public response.

Deploy backend and frontend together. New endpoints: GET /api/spotlight, authenticated GET/PUT /api/admin/spotlight, authenticated POST /api/admin/spotlight/image. Uses the existing private document store with document collection_spotlight. No schema migration. Existing hero slides are retained. Until the new API is deployed, local preview uses bundled defaults; admin save is explicitly disabled if that API is unavailable.

Four generated campaign images are stored in frontend/public/images/collections. Generated using built-in image_gen with actual catalog garments as references. These are collection promotional artwork; product listing photographs were not replaced. Cotrai remains the original collection cover. Only five published collections were found, not six. Cotrai generation failed because the image tool reported network permission revoked; a proposed sixth All collections overview image remains ungenerated.

Validation: backend tests cover persistence, publication filtering, ordering, invalid settings, duplicate/unknown collections and image URL validation. Browser tests use mocked authenticated responses and do not modify production records.
