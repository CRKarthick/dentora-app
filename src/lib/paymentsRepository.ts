"use client";

/**
 * Payments repository.
 *
 * Payments are recorded independently from visits (linked by `visitId`/
 * `patientId`) so they can be listed and reported on from their own Payments
 * page instead of being embedded inside each visit.
 */

import {
  hasCollection,
  readCollection,
  upsertCollectionRecord,
  writeCollection,
} from "./localDb";
import { getProfileState } from "./profileRepository";
import { getVisits } from "./visitsRepository";
import seedData from "./seed/payments.json";
import type { Payment } from "./types";

const COLLECTION = "payments";
const seedPayments = seedData as Payment[];

/**
 * Visits created before payments were split into their own collection may
 * still have an embedded `payments` array in the local database. Migrate any
 * such records into standalone payment records the first time this
 * collection is read.
 */
async function migrateEmbeddedPayments(): Promise<Payment[]> {
  const visits = (await getVisits()) as Array<{
    id: string;
    patientId: string;
    payments?: Array<{
      method: string;
      reference?: string;
      amount: number;
      date: string;
    }>;
  }>;

  const migrated: Payment[] = [];
  for (const visit of visits) {
    for (const payment of visit.payments ?? []) {
      migrated.push({
        id:
          typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : `payment-${visit.id}-${migrated.length}`,
        patientId: visit.patientId,
        visitId: visit.id,
        method: payment.method,
        reference: payment.reference,
        amount: payment.amount,
        date: payment.date,
      });
    }
  }
  return migrated;
}

export async function getPayments(embeddedPayments: Payment[] = []): Promise<Payment[]> {
  const initialized = await hasCollection(COLLECTION);
  const stored = await readCollection<Payment>(COLLECTION);

  if (initialized) {
    return stored;
  }

  const migrated = await migrateEmbeddedPayments();
  const paymentsById = new Map(seedPayments.map((payment) => [payment.id, payment]));
  for (const payment of [...stored, ...migrated, ...embeddedPayments]) {
    paymentsById.set(payment.id, payment);
  }

  const payments = [...paymentsById.values()];
  await writeCollection<Payment>(COLLECTION, payments);
  return payments;
}

export async function getPaymentsForPatient(patientId: string): Promise<Payment[]> {
  const payments = await getPayments();
  return payments.filter((payment) => payment.patientId === patientId);
}

export async function getPaymentsForVisit(visitId: string): Promise<Payment[]> {
  const payments = await getPayments();
  return payments.filter((payment) => payment.visitId === visitId);
}

export async function deletePaymentsForPatient(patientId: string): Promise<void> {
  const payments = await getPayments();
  await writeCollection(
    COLLECTION,
    payments.filter((payment) => payment.patientId !== patientId),
  );
}

export type NewPaymentInput = {
  patientId: string;
  visitId: string;
  method: string;
  reference?: string;
  amount: number;
  date: string;
};

/**
 * Record a payment and stamp it with whichever doctor profile is currently
 * active, so the record shows who collected it.
 */
export async function addPayment(input: NewPaymentInput): Promise<Payment> {
  const { profiles, activeId } = await getProfileState();
  const activeDoctor = profiles.find((profile) => profile.id === activeId);

  const payment: Payment = {
    id:
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `payment-${Date.now()}`,
    patientId: input.patientId,
    visitId: input.visitId,
    method: input.method,
    reference: input.reference,
    amount: input.amount,
    date: input.date,
    ...(activeDoctor
      ? { doctorId: activeDoctor.id, doctorName: activeDoctor.name }
      : {}),
  };

  await upsertCollectionRecord<Payment>(COLLECTION, payment);
  return payment;
}
