import type { BuyerNotification, BuyerProfile } from "@/lib/domain/types";
import { ValidationError } from "@/lib/services/contracts";
import { processState } from "./process-state";

/**
 * In-process store for the sample Buyer profile (P-15) and notifications (P-16).
 *
 * LIMITATIONS — the same ones as enquiry-store.ts, restated because they matter
 * here too:
 *
 * 1. Memory only. A restart reverts the profile and marks every notification
 *    unread again.
 * 2. Per-process, and NOT per-account: sample mode has no accounts, so every
 *    visitor to this server shares one profile. Two reviewers editing at once
 *    would overwrite each other. Real per-account isolation is kkl-backend's.
 * 3. Nothing here authenticates anyone. Saving a profile changes a value in this
 *    process; it does not update a real account, send a verification message, or
 *    alter any notification preference at a provider.
 */

const DEFAULT_PROFILE: BuyerProfile = {
  fullName: "Priya Sen",
  mobile: "9830041288",
  email: "priya.sen@example.invalid",
  preferredLocalityId: "new-town",
  notifyByWhatsApp: true,
  notifyByEmail: false,
};



export function getProfile(): BuyerProfile {
  return state.profile;
}

export function saveProfile(input: {
  fullName: string;
  email: string | null;
  preferredLocalityId: string | null;
  notifyByWhatsApp: boolean;
  notifyByEmail: boolean;
}): BuyerProfile {
  const fields: Record<string, string> = {};

  const fullName = input.fullName.trim();
  if (fullName.length < 2) {
    fields.fullName = "Enter your name as it should reach the builder.";
  }

  const email = input.email?.trim() ? input.email.trim() : null;
  if (email !== null && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    fields.email = "Enter a valid email address, or leave it blank.";
  }

  if (input.notifyByEmail && email === null) {
    fields.email = "Add an email address to receive updates by email.";
  }

  if (Object.keys(fields).length > 0) throw new ValidationError(fields);

  state.profile = {
    ...state.profile,
    fullName,
    email,
    preferredLocalityId: input.preferredLocalityId,
    notifyByWhatsApp: input.notifyByWhatsApp,
    notifyByEmail: input.notifyByEmail,
  };
  return state.profile;
}

const SEED_NOTIFICATIONS: readonly BuyerNotification[] = [
  {
    id: "n-3001",
    category: "enquiry",
    title: "Greenview Residency replied to your enquiry",
    body: "The builder has marked your enquiry as contacted. Open it to see the thread.",
    createdAt: "2026-09-20T09:12:00.000Z",
    readAt: null,
    href: "/account/enquiries/e-40118",
  },
  {
    id: "n-3002",
    category: "match",
    title: "3 new projects match your requirement",
    body: "Two in Action Area II and one in Rajarhat were published this week.",
    createdAt: "2026-09-19T17:40:00.000Z",
    readAt: null,
    href: "/matches",
  },
  {
    id: "n-3003",
    category: "enquiry",
    title: "Your site-visit request was received",
    body: "Lakeshore Heights has your request. A request is not a confirmed visit.",
    createdAt: "2026-09-18T11:05:00.000Z",
    readAt: "2026-09-18T12:00:00.000Z",
    href: "/account/enquiries/e-40122",
  },
  {
    id: "n-3004",
    category: "account",
    title: "Your mobile number was verified",
    body: "You can now track enquiries and keep a shortlist.",
    createdAt: "2026-09-15T08:00:00.000Z",
    readAt: "2026-09-15T08:03:00.000Z",
    href: null,
  },
];

/**
 * Process-scoped, not module-scoped — see process-state.ts. Separate bundles
 * for route handlers and pages otherwise each get their own copy, and a profile
 * saved through an action is invisible to the page that renders it.
 */
const state = processState("account", () => ({
  profile: DEFAULT_PROFILE,
  notifications: SEED_NOTIFICATIONS.map((n) => ({ ...n })) as BuyerNotification[],
}));

export function listNotifications(): readonly BuyerNotification[] {
  return [...state.notifications].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function markRead(id: string): void {
  state.notifications = state.notifications.map((n) =>
    n.id === id && n.readAt === null ? { ...n, readAt: new Date().toISOString() } : n,
  );
}

export function markAllRead(): void {
  const now = new Date().toISOString();
  state.notifications = state.notifications.map((n) => (n.readAt === null ? { ...n, readAt: now } : n));
}

export function unreadCount(): number {
  return state.notifications.filter((n) => n.readAt === null).length;
}
