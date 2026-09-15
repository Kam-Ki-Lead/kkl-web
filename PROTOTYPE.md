# Viewing the prototype

The clickable design prototype is a set of static HTML files with no build step and no server
dependency — open `docs/design/prototype/index.html` directly in a browser, or serve the folder
with any static file server, e.g.:

```
npx serve docs/design/prototype
```

Start at `index.html` (Homepage) or `screens.html` (full screen index with links to every built
screen). See `docs/design/journeys.md` for the six walkthrough scripts this prototype supports,
matching the client's requested first-prototype demonstration (public discovery → enquiry → Buyer
tracking → Builder notification, plus the Seller KYC → marketplace → purchase journey and the
Admin KYC-approval journey).

This prototype is explicitly disposable: it uses synthetic data, has no backend, and is not
reused as production code. It exists to get written design sign-off (per the proposal's Phase 1
acceptance criteria) before Phase 2 frontend implementation begins.
