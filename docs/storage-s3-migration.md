# S3 uploads and migrating from Firebase Storage

## Runtime configuration

Fill in placeholders from the repo [`.env.example`](../.env.example) locally. In **Vercel**, add the same names under Project → Settings → Environment Variables for **Production**, **Preview**, and **Development** scopes (`AWS_S3_PREFIX` is optional—see below; use scoped IAM credentials per environment where possible).

Key variables:

| Variable | Description |
|----------|--------------|
| `AWS_REGION` | e.g. `eu-central-1` |
| `AWS_ACCESS_KEY_ID` | Scoped IAM principal for this app |
| `AWS_SECRET_ACCESS_KEY` | Companion secret |
| `AWS_S3_BUCKET` | Target bucket |
| `AWS_S3_PREFIX` | **Optional.** Omitted ⇒ inferred from `NODE_ENV` (`<node_env>/`). Set explicitly to override; empty value ⇒ no prefix key (bucket root). |

Presigned GET URLs use a fixed **3600 s** TTL (`AWS_S3_SIGNED_URL_TTL_SECONDS` in `config/config.ts`), not env.

`FIREBASE_STORAGE_BUCKET` is optional; if omitted it defaults to `{FIREBASE_PROJECT_ID}.appspot.com` so the Firebase Admin SDK can still resolve the default bucket name for legacy GCS deletes.

New uploads write **private** objects to keys shaped as:

`<prefix>/barbers/{barberId}/avatar/<uuid>.<ext>`  
`<prefix>/barbers/{barberId}/portfolio/<uuid>.<ext>`  
`<prefix>/clients/{clientId}/avatar/<uuid>.<ext>`

Firestore stores the **full S3 object key** (including `AWS_S3_PREFIX`). API responses return **temporary presigned HTTPS URLs** resolved at read time. Legacy **`https://storage.googleapis.com/...`** values remain readable until migrated; staleness checks use HTTP HEAD for those URLs.

## Migrating existing Firestore documents from GCS public URLs

1. For each barber/client with `avatar` or `images[]` pointing at `storage.googleapis.com`, download the object (Firebase Admin SDK or authenticated HTTP GET if still public).

2. `PutObject` to the canonical path above (same prefix as your deploy `NODE_ENV` / `AWS_S3_PREFIX`).

3. Update Firestore to the **new full S3 key** (string, not HTTPS).

4. Optionally delete the old GCS object after verification.

Automate steps 2–4 in a one-off Node script against production with read-only snapshots first if you batch-migrate.

## Tests

Integration tests stub `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` in [`jest.setup.ts`](../jest.setup.ts). Avatar validation specs mock `fetch` HEAD for Firebase URLs where needed.
