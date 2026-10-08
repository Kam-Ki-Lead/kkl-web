# Staging deployment — 8 October 2026

Deploy this repository's `staging` branch. The source configuration and
`deploy/staging.env.example` are prepared; no hosted deployment is claimed.
Full instructions: https://github.com/Kam-Ki-Lead/bdrpl-application/blob/staging/docs/deployment/STAGING-HANDOFF.md

Use the platform-generated URL, with no custom domain. Use a separate staging
database. Never point these variables at a review or production database.
The current staging configuration intentionally has sign-in unavailable;
there is no public development-code or role-issuing bypass.

Future releases: merge reviewed changes into `staging`, then check the hosted
build and smoke tests. Pushing this branch can trigger deployment once connected.
Do not force-push it or assume the historical development branches auto-sync.
