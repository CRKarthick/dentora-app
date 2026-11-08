/**
 * A clinician profile. The app supports several of these so the active doctor
 * can be switched, and new ones added, from the topbar profile menu.
 */
export type UserProfile = {
  id: string;
  name: string;
  initials: string;
  role: string;
  /**
   * Optional profile picture as a data URL. Stored inline because the local
   * local database has no separate blob storage; images are downscaled before
   * saving so records stay small.
   */
  photo?: string;
};

export type Patient = {
  id: string;
  name: string;
  initials: string;
  phone: string;
  email: string;
  lastVisit?: string;
  balance: number;

  // Demographics, shown on the patient profile's Overview tab.
  age?: number;
  gender?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;

  // Hydrated by the repository for the patient profile.
  visits?: Visit[];
};

export type TreatmentItem = {
  name: string;
  price: number;
};

/** Whether a visit's treatments have been paid for in full, in part, or not yet. */
export type VisitStatus = "Paid" | "Partial" | "Pending";

export type Visit = {
  id: string;
  patientId: string;
  date: string;
  /** Short labels such as "Treatment", "Checkup", or "Consultation". A visit can have multiple types. */
  type: string[];
  status: VisitStatus;
  treatments: TreatmentItem[];
  notes?: string;

  /** The clinician who was active when the visit was recorded. */
  doctorId?: string;
  doctorName?: string;
};

/**
 * A recorded payment. Payments are stored independently from visits (linked
 * by `visitId`/`patientId`) so they can be listed, searched, and reported on
 * from their own Payments page.
 */
export type Payment = {
  id: string;
  patientId: string;
  visitId: string;
  method: string;
  /** Masked account/card reference, e.g. "****1234". */
  reference?: string;
  amount: number;
  date: string;

  /** The clinician who was active when the payment was recorded. */
  doctorId?: string;
  doctorName?: string;
};
