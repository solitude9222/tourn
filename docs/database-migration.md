# PostgreSQL backups and deployment

The source of truth is PostgreSQL: users and authentication fields, profiles
(including links/widgets), site settings, analytics, invites, verification data,
and uploaded audio chunk tables. Browser drafts are recovery copies, not the
published database.

## Export/import

Sign in as the site owner and open **Admin → Data transfer**.

- **Export all data (.json)** streams a consistent database snapshot. It includes
  private account fields and password hashes; keep the downloaded file private.
- Choose the JSON on the new backend. The app uploads it in small chunks and
  validates its schema, binary fields and row counts before offering Import.
- **Merge** upserts matching primary keys and preserves unrelated rows. Unique
  account conflicts stop the transaction rather than deleting another account.
- **Replace** restores the backup as the whole database. Review the table counts
  and type `REPLACE ALL DATA` before applying it. Use this when migrating to an
  empty/new provider after making a backup of any destination data you need.

The updated backend must run once against the destination PostgreSQL database
first, so its tables exist. Imports preserve IDs, reset sequences, retain media
bytes, and turn internal audio URLs into portable `/api/media/audio/<id>` paths.
A failed restore rolls back all database changes. A successful replacement may
require signing in again with an account from the backup.

Environment variables are not user database rows and are not included. Configure
`DATABASE_URL`, `JWT_SECRET`, frontend/backend URLs, Discord OAuth/bot credentials,
Stripe settings and any other service secrets separately on the new provider.
External hosted URLs remain external URLs; the backup includes media bytes stored
in PostgreSQL, not files owned by a third-party host.

## Verify the deployed backend

`GET /api/health` must include `profileSaveProtocol: 2` and the deployment commit
(when Railway supplies `RAILWAY_GIT_COMMIT_SHA`). An older `{ "ok": true }` response
means the new save/export/import routes have not been deployed to that service.
The backend is `backends/index.js`, not the static frontend. Railway can use
repository root with the root `railway.json`, or Root Directory `backends` with
`backends/railway.json`. Deploy latest `main` on the backend service, and ensure
its `DATABASE_URL` points to the intended PostgreSQL database.
