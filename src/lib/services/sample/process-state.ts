/**
 * One instance of a piece of sample state per Node process.
 *
 * WHY THIS EXISTS
 * ---------------
 * Module-scope `let` is not per-process in Next. Route handlers, pages and
 * server actions are bundled separately, so the same source module can be
 * instantiated more than once in one server — and each copy gets its own
 * variables. That is not a theory: the Seller review route set a balance to
 * zero, returned 200, and every page went on rendering the old balance, because
 * the route's copy of the store and the pages' copy were different objects.
 *
 * Hanging the state off `globalThis` under a single key gives exactly one
 * instance whichever bundle reaches it first. It is the same reason the Next
 * documentation recommends it for a database client in development.
 *
 * WHAT IT DOES NOT FIX
 * --------------------
 * It is still one process. Two server instances, or a serverless deployment
 * where requests land on different workers, do not share `globalThis` — so
 * sample state is still lost on restart, still unshared across instances, and
 * still not a model for anything that needs to be durable or consistent. Those
 * limits belong to kkl-backend and a database, and are documented where each
 * store defines them.
 */

const REGISTRY = Symbol.for("kkl.sample.state");

type Registry = Map<string, unknown>;

function registry(): Registry {
  const host = globalThis as typeof globalThis & { [REGISTRY]?: Registry };
  host[REGISTRY] ??= new Map<string, unknown>();
  return host[REGISTRY];
}

/**
 * The single instance of `key`, creating it on first use.
 *
 * `create` must return a mutable holder object — mutate its fields rather than
 * reassigning the result, or the second bundle to load will keep a stale
 * reference.
 */
export function processState<T extends object>(key: string, create: () => T): T {
  const store = registry();
  const existing = store.get(key);
  if (existing !== undefined) return existing as T;
  const created = create();
  store.set(key, created);
  return created;
}
