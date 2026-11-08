/**
 * Configurable option lists used by the visit form.
 *
 * Clinics differ in the treatments they offer and the payment methods they
 * accept, so both lists are editable from the Settings screen. These are the
 * built-in presets used the first time the app runs.
 */

/** Common visit types for a general dental clinic. */
export const defaultVisitTypes: string[] = [
  "Checkup",
  "Cleaning",
  "Consultation",
  "Treatment",
  "Root Canal",
  "Extraction",
  "Filling",
  "Crown / Bridge",
  "Orthodontic",
  "Emergency",
  "Follow-up",
];

/** Common payment methods accepted at a clinic. */
export const defaultPaymentMethods: string[] = ["Cash", "Card", "UPI"];

export type ClinicOptions = {
  visitTypes: string[];
  paymentMethods: string[];
};

export const defaultClinicOptions: ClinicOptions = {
  visitTypes: defaultVisitTypes,
  paymentMethods: defaultPaymentMethods,
};
