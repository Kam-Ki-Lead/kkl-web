/**
 * Where each real-backend adapter gets its bearer token.
 *
 * `developmentIssuerModules` are the only modules that call
 * `POST /v1/dev/sessions`. They do that only while `KKL_AUTH` is unset
 * (legacy review mode). With `KKL_AUTH=backend`, `callAs` and the
 * lead-request client send the browser session instead, and a failure of
 * that session is not repaired by issuing a development identity.
 *
 * Locations are public reads and carry no session.
 */

export const IDENTITY = {
  developmentIssuerModules: [
    "src/lib/services/backend/session.ts",
    "src/lib/services/backend/lead-requests.ts",
  ],
  browserSessionModules: [
    "src/lib/services/backend/enquiries.ts",
    "src/lib/services/backend/profile.ts",
    "src/lib/services/backend/commerce.ts",
    "src/lib/services/backend/owner-listings.ts",
    "src/lib/services/backend/builder-enquiries.ts",
    "src/lib/services/backend/support.ts",
    "src/lib/services/backend/admin-support.ts",
    "src/lib/services/backend/notifications.ts",
    "src/lib/services/backend/verification.ts",
    "src/lib/services/backend/admin-verification.ts",
    "src/lib/services/backend/admin-operations.ts",
    "src/lib/services/backend/lead-requests.ts",
    "src/lib/services/backend/staff-orders.ts",
    "src/lib/services/backend/intake.ts",
  ],
  publicReads: ["src/lib/services/backend/locations.ts"],
} as const;
