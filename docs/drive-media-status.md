# Drive Media implementation and setup status

Authoritative worktree: `C:/Users/M. Mohsin/.codex/worktrees/6904/Sale`.
Task: `01a08249-fd9a-7e22-8c5e-717bce8e8045`. Other draft in 0844 is stopped; do not merge blindly.

2026-09-09: Correct owner's Google login persists and MFA enabled. Dedicated Google Cloud project **Mocha Wear Media**, project id **mocha-wear-media**, was created and verified. Drive API enabled; OAuth consent app and client created. Replacement client secret and encryption key saved in ignored backend/.env. No Drive folder created, no live connection or deployment.

Implementation: private server-side OAuth, encrypted refresh token in private Supabase document, dedicated private folder, 8 MiB resumable chunks, disk-staged max 1 GiB individual uploads, server-streamed originals, authenticated thumbnail proxy, single-use short-lived downloads that recheck reseller status. Existing Cloudinary media stays readable/copyable/deletable. No product/hero/collection Cloudinary changes.

Validation: nine mocked backend integration tests passed (`node --test test/mediaDrive.test.js`). TypeScript passed after Next generated types. Production build blocked fetching existing Google Fonts. TypeScript and targeted MediaExplorer lint passed after fixes. Live Google upload/download not tested.

Pending review: PKCE for OAuth; partial persistence/upload cleanup; reference-safe folder deletion; resumable lost-response tests; upload resource/concurrency limits. Single API replica required by in-memory locks/OAuth state/tickets.

Required server-only environment: GOOGLE_DRIVE_CLIENT_ID, GOOGLE_DRIVE_CLIENT_SECRET, GOOGLE_DRIVE_REDIRECT_URI, GOOGLE_DRIVE_TOKEN_KEY (32 random bytes hex, stored separately from encrypted tokens). Never expose in NEXT_PUBLIC variables or commit credentials. Production callback: `https://mocha-wear-production.up.railway.app/api/admin/media/drive/callback`; local callback: `http://localhost:5000/api/admin/media/drive/callback`.

Google OAuth: Web application; limited `https://www.googleapis.com/auth/drive.file` scope and offline access. External Testing refresh tokens expire after seven days; configure appropriate production publishing before relying on unattended access. Connect via authenticated Admin Media; same-owner reconnect enforced. Run real original-byte upload/download validation after connection.

Original checkout `D:/RDP/Swagger/Sale` still has incomplete duplicate-agent `backend/src/googleDrive.js`; replace only with validated implementation when integrating. Preserve unrelated `.cursor/`, `backend/scripts/seed-reviews.js`, and user changes. 2026-09-10: All implementation files and private backend/.env copied and hash-verified into D:/RDP/Swagger/Sale at explicit user request. Unrelated user files preserved. Not deployed or pushed.

Official references: https://developers.google.com/identity/protocols/oauth2/web-server ; https://developers.google.com/workspace/drive/api/guides/manage-uploads ; https://developers.google.com/workspace/drive/api/guides/manage-downloads
