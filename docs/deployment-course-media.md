# Deployment rule for course media

This platform includes published iSpring packages and video files stored in Git LFS.

## Production deployment

Deploy production by pushing the approved change to the `main` branch and allow the Vercel Git integration to build it. That path retrieves the real Git LFS media objects.

Do not use a direct Vercel CLI or file-upload deployment for this repository. That path can receive Git LFS pointer files instead of the actual media. The build-time media verification will deliberately fail in that situation so incomplete course packages cannot go live.

## Verification

A valid production build reports that course-media verification passed. Confirm that the Vercel deployment is Ready before treating it as the current production release.
