/**
 * Approved-screen facts the phase 3.j contract still does not carry.
 *
 * The phase 3.i blockers — no staff-wide order list, no past intake runs —
 * are closed by `GET /v1/orders?scope=all` and
 * `GET /v1/leads/intake/batches`. What remains is information the approved
 * screens draw and the payload does not include. Those screens render the
 * published fields and leave these out.
 */
export {
  INTAKE_SCREEN_OMISSIONS as INTAKE_GAPS,
  ORDER_SCREEN_OMISSIONS as STAFF_ORDER_GAPS,
} from "./staff-views";
