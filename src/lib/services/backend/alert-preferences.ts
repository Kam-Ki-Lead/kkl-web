/**
 * Role-specific alert choices on GET and PATCH /v1/me/profile.
 *
 * A seller sends seller keys. A builder sends builder keys. Omitted keys
 * stay as they are. `delivery` is read and never written. These are not
 * whatsappOptIn or emailOptIn.
 */

export const SELLER_ALERT_KEYS = ["newLeadsInMyAreas", "viewedLeadOnSale", "lowBalance"] as const;
export const BUILDER_ALERT_KEYS = ["newEnquiry", "siteVisitRequest", "subscriptionReminders"] as const;

export type SellerAlertKey = (typeof SELLER_ALERT_KEYS)[number];
export type BuilderAlertKey = (typeof BUILDER_ALERT_KEYS)[number];

export type SellerAlertChoices = Record<SellerAlertKey, boolean>;
export type BuilderAlertChoices = Record<BuilderAlertKey, boolean>;

const SELLER_FALSE: SellerAlertChoices = {
  newLeadsInMyAreas: false,
  viewedLeadOnSale: false,
  lowBalance: false,
};

const BUILDER_FALSE: BuilderAlertChoices = {
  newEnquiry: false,
  siteVisitRequest: false,
  subscriptionReminders: false,
};

/** A checked box submits "true" after a hidden "false". An absent box is false. */
export function explicitBoolean(formData: FormData, name: string): boolean {
  return formData.getAll(name).some((value) => value === "true" || value === "on");
}

export function alertFieldsSubmitted(formData: FormData, keys: readonly string[]): boolean {
  return keys.some((key) => formData.getAll(key).length > 0);
}

export function sellerAlertsPatch(
  choices: Partial<SellerAlertChoices>,
): { alerts: Partial<SellerAlertChoices> } {
  const alerts: Partial<SellerAlertChoices> = {};
  for (const key of SELLER_ALERT_KEYS) {
    if (typeof choices[key] === "boolean") alerts[key] = choices[key];
  }
  return { alerts };
}

export function builderAlertsPatch(
  choices: Partial<BuilderAlertChoices>,
): { alerts: Partial<BuilderAlertChoices> } {
  const alerts: Partial<BuilderAlertChoices> = {};
  for (const key of BUILDER_ALERT_KEYS) {
    if (typeof choices[key] === "boolean") alerts[key] = choices[key];
  }
  return { alerts };
}

export function sellerProfilePatch(input: {
  contactName: string;
  agencyName: string;
  alerts?: Partial<SellerAlertChoices>;
}) {
  return {
    displayName: input.contactName,
    companyName: input.agencyName,
    ...(input.alerts ? sellerAlertsPatch(input.alerts) : {}),
  };
}

export function builderProfilePatch(input: {
  contactName: string;
  companyName: string;
  email: string | null;
  alerts?: Partial<BuilderAlertChoices>;
}) {
  return {
    displayName: input.contactName,
    companyName: input.companyName,
    contactEmail: input.email,
    ...(input.alerts ? builderAlertsPatch(input.alerts) : {}),
  };
}

type AlertBody = {
  delivery?: { available?: boolean } | null;
} | null;

function deliveryAvailable(alerts: AlertBody): boolean {
  return alerts?.delivery?.available === true;
}

function hasOwnChoice(alerts: object, keys: readonly string[]): boolean {
  return keys.some((key) => key in alerts);
}

export function readSellerAlerts(alerts: (Partial<SellerAlertChoices> & { delivery?: { available?: boolean } | null }) | null | undefined): {
  writable: boolean;
  choices: SellerAlertChoices;
  deliveryAvailable: boolean;
} {
  if (alerts == null || !hasOwnChoice(alerts, SELLER_ALERT_KEYS)) {
    return { writable: false, choices: SELLER_FALSE, deliveryAvailable: false };
  }
  return {
    writable: true,
    deliveryAvailable: deliveryAvailable(alerts),
    choices: {
      newLeadsInMyAreas: alerts.newLeadsInMyAreas === true,
      viewedLeadOnSale: alerts.viewedLeadOnSale === true,
      lowBalance: alerts.lowBalance === true,
    },
  };
}

export function readBuilderAlerts(alerts: (Partial<BuilderAlertChoices> & { delivery?: { available?: boolean } | null }) | null | undefined): {
  writable: boolean;
  choices: BuilderAlertChoices;
  deliveryAvailable: boolean;
} {
  if (alerts == null || !hasOwnChoice(alerts, BUILDER_ALERT_KEYS)) {
    return { writable: false, choices: BUILDER_FALSE, deliveryAvailable: false };
  }
  return {
    writable: true,
    deliveryAvailable: deliveryAvailable(alerts),
    choices: {
      newEnquiry: alerts.newEnquiry === true,
      siteVisitRequest: alerts.siteVisitRequest === true,
      subscriptionReminders: alerts.subscriptionReminders === true,
    },
  };
}

/** Saved choices are not sent alerts. The sentence follows the returned capability. */
export function alertSavedMessage(deliveryAvailable: boolean): string {
  return deliveryAvailable
    ? "Your alert preferences are saved."
    : "Your alert preferences are saved. Alert delivery is not available yet.";
}
