"use client";

/**
 * Patients repository.
 *
 * All patient data access goes through this module so that UI components never
 * hold hardcoded records. Data lives in SQLite under Electron and localStorage
 * in the browser. On first run it is seeded from `seed/patients.json`.
 */

import {
  deleteCollectionRecord,
  hasCollection,
  readCollection,
  upsertCollectionRecord,
  writeCollection,
} from "./localDb";
import seedData from "./seed/patients.json";
import type { Patient, Visit } from "./types";
import {
  deleteVisitsForPatient,
  getVisits,
} from "./visitsRepository";
import {
  deletePaymentsForPatient,
  getPaymentsForPatient,
} from "./paymentsRepository";

const COLLECTION = "patients";

const seedPatients = seedData as Patient[];
const seedPatientById = new Map(seedPatients.map((patient) => [patient.id, patient]));
type LegacyPatient = Patient & { dateOfBirth?: string; tags?: string[] };

function withoutVisits(patient: Patient): Patient {
  const record = { ...patient };
  delete record.visits;
  return record;
}

async function hydratePatients(records: LegacyPatient[]): Promise<Patient[]> {
  const embeddedVisits = records.flatMap((patient) =>
    (patient.visits ?? []).map((visit) => ({
      ...visit,
      patientId: visit.patientId ?? patient.id,
    })),
  ) as Visit[];
  const visits = await getVisits(embeddedVisits);
  const visitsByPatient = new Map<string, Visit[]>();
  for (const visit of visits) {
    const patientVisits = visitsByPatient.get(visit.patientId) ?? [];
    patientVisits.push(visit);
    visitsByPatient.set(visit.patientId, patientVisits);
  }

  return records.map((patient) => ({
    ...withoutVisits(patient),
    visits: visitsByPatient.get(patient.id) ?? [],
  }));
}

/**
 * Load all patients from the local database, seeding it on first run so the
 * initial dataset is written to disk instead of living in the app bundle.
 */
export async function getPatients(): Promise<Patient[]> {
  const initialized = await hasCollection(COLLECTION);
  const stored = await readCollection<LegacyPatient>(COLLECTION);

  if (initialized) {
    if (stored.length === 0) {
      return [];
    }

    const requiresMigration = stored.some(
      (patient) =>
        patient.dateOfBirth ||
        patient.tags !== undefined ||
        (!patient.gender && seedPatientById.get(patient.id)?.gender) ||
        patient.phone !== normalizeStoredIndianMobileNumber(patient.phone) ||
        (patient.emergencyContactPhone !== undefined &&
          patient.emergencyContactPhone !==
            normalizeStoredIndianMobileNumber(patient.emergencyContactPhone)),
    );
    if (!requiresMigration) {
      return hydratePatients(stored);
    }

    const migrated = stored.map((record) => {
      const patient = { ...record };
      const { dateOfBirth } = patient;
      delete patient.dateOfBirth;
      delete patient.tags;
      const seededGender = seedPatientById.get(patient.id)?.gender;
      return {
        ...patient,
        phone: normalizeStoredIndianMobileNumber(patient.phone),
        ...(patient.age === undefined && dateOfBirth
          ? { age: ageFromDateOfBirth(dateOfBirth) }
          : {}),
        ...(!patient.gender && seededGender ? { gender: seededGender } : {}),
        ...(patient.emergencyContactPhone
          ? {
              emergencyContactPhone: normalizeStoredIndianMobileNumber(
                patient.emergencyContactPhone,
              ),
            }
          : {}),
      };
    });
    await writeCollection<Patient>(COLLECTION, migrated.map(withoutVisits));
    return hydratePatients(migrated);
  }

  await writeCollection<Patient>(COLLECTION, seedPatients.map(withoutVisits));
  return hydratePatients(seedPatients);
}

/** Replace all patients in the local database. */
export async function savePatients(records: Patient[]): Promise<void> {
  await writeCollection<Patient>(COLLECTION, records.map(withoutVisits));
}

/** Load a single patient by id, or `null` if no such patient exists. */
export async function getPatientById(id: string): Promise<Patient | null> {
  const patients = await getPatients();
  return patients.find((patient) => patient.id === id) ?? null;
}

export type NewPatientInput = {
  name: string;
  phone: string;
  email?: string;
  age?: number;
  gender?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
};

/** Create a patient with the defaults expected before their first visit. */
export async function addPatient(input: NewPatientInput): Promise<Patient> {
  const details = normalizePatientDetails(input);
  const patient: Patient = {
    id:
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `patient-${Date.now()}`,
    ...details,
    balance: 0,
  };

  await upsertCollectionRecord<Patient>(COLLECTION, withoutVisits(patient));
  return { ...patient, visits: [] };
}

/** Update a patient's editable profile details. */
export async function updatePatient(
  id: string,
  input: NewPatientInput,
): Promise<Patient> {
  const patients = await getPatients();
  const index = patients.findIndex((patient) => patient.id === id);
  if (index === -1) {
    throw new Error("Patient record not found.");
  }

  const updated = { ...patients[index], ...normalizePatientDetails(input) };
  await upsertCollectionRecord<Patient>(COLLECTION, withoutVisits(updated));
  return updated;
}

/** Permanently remove a patient and their visit history. */
export async function deletePatient(id: string): Promise<void> {
  const patients = await getPatients();
  if (!patients.some((patient) => patient.id === id)) {
    throw new Error("Patient record not found.");
  }
  await deleteCollectionRecord(COLLECTION, id);
  await deleteVisitsForPatient(id);
  await deletePaymentsForPatient(id);
}

/**
 * Recompute a patient's `lastVisit` and outstanding `balance` from their visit
 * history. Called after a visit is added so the patient list/profile reflect it
 * immediately.
 */
export async function recalculatePatientVisitSummary(id: string): Promise<Patient> {
  const patients = await getPatients();
  const patient = patients.find((record) => record.id === id);
  if (!patient) {
    throw new Error("Patient record not found.");
  }

  const visits = patient.visits ?? [];
  const lastVisit = visits.reduce<string | undefined>(
    (latest, visit) => (!latest || visit.date > latest ? visit.date : latest),
    undefined,
  );
  const payments = await getPaymentsForPatient(id);
  const paidByVisit = new Map<string, number>();
  for (const payment of payments) {
    paidByVisit.set(payment.visitId, (paidByVisit.get(payment.visitId) ?? 0) + payment.amount);
  }
  const balance = visits.reduce((total, visit) => {
    const visitTotal = visit.treatments.reduce((sum, item) => sum + item.price, 0);
    const paid = paidByVisit.get(visit.id) ?? 0;
    return total + (visitTotal - paid);
  }, 0);

  const updated: Patient = { ...patient, lastVisit, balance };
  await upsertCollectionRecord<Patient>(COLLECTION, withoutVisits(updated));
  return updated;
}

function normalizePatientDetails(input: NewPatientInput) {
  const name = input.name.trim();
  if (!name) {
    throw new Error("Patient name is required.");
  }
  const phone = normalizeIndianMobileNumber(input.phone, "Phone number");
  if (
    input.age !== undefined &&
    (!Number.isInteger(input.age) || input.age < 0 || input.age > 130)
  ) {
    throw new Error("Age must be a whole number between 0 and 130.");
  }

  return {
    name,
    initials: derivePatientInitials(name),
    phone,
    email: input.email?.trim() ?? "",
    age: input.age,
    gender: input.gender?.trim() || undefined,
    address: input.address?.trim() || undefined,
    emergencyContactName: input.emergencyContactName?.trim() || undefined,
    emergencyContactPhone: input.emergencyContactPhone?.trim()
      ? normalizeIndianMobileNumber(
          input.emergencyContactPhone,
          "Emergency phone number",
        )
      : undefined,
  };
}

function derivePatientInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

function normalizeIndianMobileNumber(value: string, fieldName: string): string {
  const digits = value.replace(/\D/g, "");
  const mobileNumber =
    digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;

  if (mobileNumber.length !== 10) {
    throw new Error(`${fieldName} must contain exactly 10 digits.`);
  }
  return `+91 ${mobileNumber}`;
}

function normalizeStoredIndianMobileNumber(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+91 ${digits.slice(2)}`;
  }
  if (digits.length >= 10) {
    return `+91 ${digits.slice(-10)}`;
  }
  return value;
}

function ageFromDateOfBirth(dateOfBirth: string): number {
  const birthDate = new Date(`${dateOfBirth}T00:00:00`);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const birthdayHasPassed =
    today.getMonth() > birthDate.getMonth() ||
    (today.getMonth() === birthDate.getMonth() &&
      today.getDate() >= birthDate.getDate());

  if (!birthdayHasPassed) {
    age -= 1;
  }
  return age;
}
