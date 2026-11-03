# External V2 security metadata archive

This separate receiver accepts authenticated Supabase/Vercel log batches, keeps
only allowlisted timestamps, source, severity, status and action labels, encrypts
them to the APGI recovery public key and acknowledges only persisted ciphertext.
It never has the private recovery key. Identities, IPs, URLs, SQL, credentials,
headers, message bodies and customer content are omitted. It is consequently a
security metadata archive, not a complete forensic copy of every provider log.

The Render service is separate from the hourly observer, with a paid
0.5c-512mb instance and a 5 GB persistent disk mounted at `/var/data`. Its two
separate ingest tokens, Vercel signature secret and owner export token belong only
in protected service/provider settings. Supply the approved public key as
`recovery-public-key.asc` and set its exact fingerprint. This source contains no
private key or token. Supabase log drain charges are outside its spend cap.

On 3 November 2026, the approved service `srv-dbks0795efls73fgiuu0` was deployed
from `6a0b875c8297d30623acd8002c753463e36bf6c9`, with 5 GB persistent disk
`dsk-dbks263bc2fs73a7890g` at `/var/data` and `/health` monitoring.
Base service/disk cost is $7 + $1.25 = $8.25/month before applicable taxes/usage.
Vercel drain `drn_cFkS3JC8u0uWxE87` is enabled for the V2 project only, including
its preview/production logs. Supabase activation is a separate private-credential
handoff and must be verified in provider settings before claiming it is active.

Vercel delivery requires both its separate Bearer token and a valid raw-body
HMAC-SHA1 signature. Supabase delivery uses its own Bearer token; that provider
does not currently sign custom HTTP batches. Compression and input are bounded.
Authenticated owner manifest/file export returns ciphertext and integrity-checked
receipts, never decrypted records. There is no public archive listing.

Eight unit tests and nine live receiver checks passed. A remote encrypted test
batch was downloaded, decrypted in memory and checked for omitted personal fields.
Its ciphertext digest remained identical after a real disk-backed redeployment.
An encrypted OneDrive mirror was verified locally; that is not yet proof of a
cloud-download round trip or an automatically scheduled mirror.

Retain encrypted metadata for one year as the proposed baseline; no automatic
deletion is implemented. Disk capacity and retention need operational review.
A full/failed disk returns an error, which must be monitored externally. A paid
disk alone is not immutable storage, independent assurance or a guarantee of lossless
delivery. Add a separate encrypted OneDrive mirror/anchor, verify a deliberate
alarm, and independently inspect delivery gaps before marking this control complete.

Run `node --test receiver.test.mjs` locally. After paid setup, verify provider
headers, TLS, key fingerprint, persistence across restart, unauthorised denial,
oversized request rejection, alert delivery and an actual encrypted-file download
and decryption. No existing customer data should be used in that exercise.
