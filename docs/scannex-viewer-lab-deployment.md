# Scannex Viewer Lab deployment

## Purpose

The Viewer Lab gives an enrolled Scannex learner a time-limited practice session in the genuine Windows Scannex Viewer. Learning Unit 6 opens the session in a separate browser window so the learner can move it to a second screen while keeping the learning material visible.

The first release is a practice sandbox. Opening it does not award a score, complete a learning unit or make a competency decision.

## Confirmed starting point

- AWS account: APGI hosting (`216511318705`).
- AWS region: Europe (Ireland), `eu-west-1`.
- Existing image builder: `apgi-scannex-dev-builder`.
- The Viewer, Training Tool and IVServer ran successfully on the image builder during the September 2026 compatibility check.
- The image builder is stopped.
- Hosted use of the trainer version has been authorised by the client for this e-learning delivery.

## Target learner environment

| Resource | Planned value |
| --- | --- |
| WorkSpaces Applications image | `apgi-scannex-practice-v1` |
| Fleet | `apgi-scannex-practice` |
| Stack | `apgi-scannex-practice` |
| Published application | `Viewer` |
| Instance family | Start with `stream.standard.medium`, then confirm performance in a one-user pilot. |
| Capacity | One concurrent user for the pilot. |
| Session mode | Training practice only. |

The image must start IVServer before the learner launches the Viewer. The learner must receive the published Viewer application rather than an unrestricted Windows desktop. Clipboard, local-drive, printer and file-transfer features remain disabled unless a documented training need is approved.

## Secure launch

The learner never receives an AWS administrator credential or a reusable streaming address.

1. The learner signs into the APGI Training Platform.
2. The platform confirms an active Scannex enrolment.
3. A server-only route calls AWS `CreateStreamingURL` for the approved fleet, stack and Viewer application.
4. AWS returns a single-use, short-lived address.
5. The learner is redirected to the native streaming session in a new window.

Vercel authenticates to AWS with OpenID Connect and assumes a least-privilege IAM role. No permanent AWS access key is stored in the application.

### IAM permission policy

Replace the resource names only if the deployed fleet or stack names change.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "CreateScannexPracticeStreamingUrl",
      "Effect": "Allow",
      "Action": "appstream:CreateStreamingURL",
      "Resource": [
        "arn:aws:appstream:eu-west-1:216511318705:fleet/apgi-scannex-practice",
        "arn:aws:appstream:eu-west-1:216511318705:stack/apgi-scannex-practice"
      ]
    }
  ]
}
```

The role trust policy must match the Vercel team, project and production environment exactly. The Vercel project supplies `AWS_ROLE_ARN`; Vercel issues the short-lived OIDC token automatically.

## Platform settings

Configure these as server-side production settings after the AWS image, fleet, stack and application exist:

```text
SCANNEX_VIEWER_LAB_ENABLED=true
SCANNEX_VIEWER_LAB_REGION=eu-west-1
SCANNEX_VIEWER_LAB_STACK_NAME=apgi-scannex-practice
SCANNEX_VIEWER_LAB_FLEET_NAME=apgi-scannex-practice
SCANNEX_VIEWER_LAB_APPLICATION_ID=Viewer
SCANNEX_VIEWER_LAB_SESSION_TTL_SECONDS=60
AWS_ROLE_ARN=arn:aws:iam::216511318705:role/apgi-scannex-viewer-lab-launcher
```

The feature stays visibly unavailable when any required setting is absent or when `SCANNEX_VIEWER_LAB_ENABLED` is not `true`.

## Pilot acceptance checks

1. A learner without an active Scannex enrolment cannot create a session.
2. An enrolled learner can open the Viewer from LU 6 in a new window.
3. The Viewer starts with IVServer ready and shows only the approved practice material.
4. The learner can use zoom, palettes, brightness, contrast, pan and reference-image controls.
5. The learner cannot open an unrestricted desktop, browse another learner's files or extract controlled material.
6. AWS toolbar **Profile → End session → End session** ends the streaming session and a later learner receives a clean environment. Closing a browser window or using TrainingTool LogOff is not proof that the stream has ended.
7. Opening or closing a practice session does not alter course completion or assessment results.
8. A one-user cost and performance check is recorded before capacity is increased.

## Practice instructions and progression checks

The learner page now includes the tested TrainingTool workflow: Catalog → TrainingTool → Connect (`127.0.0.1`) → Viewer 1 → LogOn → Scannex Viewer Practice → Start Exercise → Yes. The learner can use Zoom 1/4 if the first image is too large. Finish an image with the check-mark control, dismiss Results with OK, then select Release to receive the next image. Learners may explore any number of available images; the exercise has no scored answer annotations.

An amber streaming notice explains that weak or unstable connections can delay controls and asks learners to click once and wait for the response.

Before a learner opens a different unit that is not currently available for Viewer practice, the platform reads that learner's latest launch record and asks AWS `DescribeSessions` for only that learner in the configured stack and fleet. ACTIVE and PENDING sessions block progression even when NOT_CONNECTED. The current practice unit remains accessible. Another Viewer-enabled unit retains the same session. Ordinary unit pages, direct SCORM launches and assessment entry pages share this check; cached navigation is checked again before an activity mounts.

Launch expiry is stored in the existing private `viewer_lab_sessions.metadata` JSON field before the streaming URL is returned. A still-valid launch link plus a 60-second AWS propagation allowance blocks progression while the session is starting. An AWS/configuration/history failure keeps the gate closed with retry instructions; it never claims logout succeeded. No new database migration is required beyond PR #122's existing tables.

Attach the additional read-only policy in `docs/scannex-viewer-session-check-policy.json` to `apgi-scannex-viewer-lab-launcher` before production activation. It grants only `appstream:DescribeSessions` for the named Scannex fleet and stack; no session termination, broader launch access or persistent credentials are added. See [AWS IAM action/resource support](https://docs.aws.amazon.com/service-authorization/latest/reference/list_appstream.html) and [DescribeSessions](https://docs.aws.amazon.com/appstream2/latest/APIReference/API_DescribeSessions.html).

Release depends on PR #122, which supplies the per-unit Viewer configuration and private launch table. Merge that dependency first, then this enhancement. Keep the production-only Vercel OIDC trust boundary; previews do not get AWS access. A final production pilot must confirm that LU 6 → LU 7 is blocked with an open/disconnected stream, then succeeds after Profile → End session, and that an admin-enabled consecutive Viewer unit permits retaining the session.

Validation: `npx vitest run --config vitest.viewer.config.mts`, `npm run typecheck`, `npm run build`.

## Later assessment work

Formal online practical assessment remains a separate release. It requires the approved case set, answer keys, pass rules, feedback suppression, result retention, Movement Log handling and assessor workflow. The practice Viewer Lab must not be presented as that assessment.
