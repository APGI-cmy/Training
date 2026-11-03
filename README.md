# External security metadata archive — prepared, not activated

This separate receiver accepts authenticated Supabase/Vercel log batches, keeps
only allowlisted timestamps, source, severity, status and action labels, encrypts
them to the APGI recovery public key and acknowledges only persisted ciphertext.
It never has the private recovery key. Identities, IPs, URLs, SQL, credentials,
headers, message bodies and customer content are omitted. It is consequently a
security metadata archive, not a complete forensic copy of every provider log.

The proposed Render service is separate from the hourly observer, with a paid
0.5c-512mb instance and a 5 GB persistent disk mounted at `/var/data`. Its two
separate ingest tokens belong only in protected service/provider settings. Supply
the approved public key as `recovery-public-key.asc` and set its exact fingerprint.
No provider drain, paid receiver, disk, key or access grant is activated by adding
this source. Obtain approval of the concrete provider charges and data routing
before creation. Supabase log drain charges are outside its spend cap.

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
