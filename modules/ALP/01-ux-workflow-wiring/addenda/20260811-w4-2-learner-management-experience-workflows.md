# UX Workflow Addendum — Learner Management Experience

## Administrator learner-management flow

1. An authorised administrator opens **Learners** from the persistent administration navigation.
2. The directory shows a paginated, read-only set of learner records with search, enrolment count, status and last activity where available.
3. Selecting a learner opens their management context; access changes are presented as a draft and cannot submit in this slice.
4. **Invite learner** opens a validated draft form. The primary action is labelled **Review invitation draft** and does not invoke the existing invitation action.
5. **Import learners** opens a staged import workspace. An administrator downloads a CSV template, chooses a local CSV/TSV/text file, reviews parser/validation results, and sees that import execution is unavailable pending lifecycle approval.
6. **Course preview** exposes an **Open full-page preview** action. The route stays administrator-only and carries an explicit no-progress/no-enrolment message.

## Safety and feedback

- All unavailable actions identify why they are unavailable and what decision is required.
- No raw invitation token, token hash, service credential or imported learner row is sent or written by the staged UI.
- Search and paging are server-rendered and read-only; failures show an empty, explanatory state rather than privileged data.
