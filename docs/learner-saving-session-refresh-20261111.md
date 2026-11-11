# Learner saving recovery - 11 November 2026

Production parent: d5f72d5e8e8482289832f1302f94bd23bc284166.
Target: training.apgi.app / training-platform, Supabase ooujszdvncwijbuzpjfp.

The active LU3 browser showed 'Progress could not be saved'. Supabase auth logs
at 07:42 UTC confirmed repeated /user 403 responses: 'token has invalid claims:
token is expired'. Session code stored refresh credentials but never refreshed.
Saved SCORM rows remained present; the failure did not prove all work was saved.

The Next.js proxy refreshes expired or soon-expiring tokens using the existing
provider refresh token. Provider identity must match the existing session user.
It forwards rotated cookies to the current route and browser, so old open
activities can recover on their next autosave without iframe reload. Existing
server identity, enrolment and row ownership checks remain authoritative. JWT
expiry decoding is only a refresh scheduling hint and grants no access.

Provider errors preserve cookies for retry and never claim a save succeeded.
No change to course content, assessment rules, existing attempts or Viewer seats.
Dependencies and build stay outside OneDrive. Prior release evidence retained.

Validation: meaningful regression tests cover expired autosave recovery, forwarded
cookies, untouched body, secure cookies, healthy/near-expiry tokens, no anonymous
session, identity mismatch, provider/network failures and incomplete replies.
Production browser/database evidence is recorded separately after deployment.
