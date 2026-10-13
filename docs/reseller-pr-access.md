# Reseller PR access

Admin → Resellers → Add reseller / Edit includes **Enable PR packages**. New accounts default to unchecked. Existing accounts without the field keep their previous access until an admin changes it.

When enabled, the existing milestone counts every 100 successfully delivered product units, not the number of order records. When disabled, the reseller's PR card, progress, request controls and PR notifications are hidden. The API returns only `enabled: false` for progress and rejects package submissions with 403, even when a browser has stale eligibility data. Resellers cannot change this flag through their own settings.

Disabling does not erase delivery counts or historical requests. Admins can reject an old pending request silently, but must re-enable PR before approving it. Re-enabling resumes existing progress and pending-request checks.

Deploy frontend and backend together so the checkbox can be saved and enforced. Backend tests cover legacy defaults, opt-in creation, disabling/re-enabling, validation, direct request blocking, notifications, and preservation of history.
