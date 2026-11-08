"use client";

import {
  hasCollection,
  readCollection,
  upsertCollectionRecord,
  writeCollection,
} from "./localDb";
import { getProfileState } from "./profileRepository";
import seedData from "./seed/visits.json";
import type { TreatmentItem, Visit, VisitStatus } from "./types";

const COLLECTION = "visits";
const seedVisits = seedData as Visit[];

/**
 * Older records (created before visits supported multiple types, and before
 * payments were split into their own collection) need normalizing so the
 * rest of the app can rely on `Visit.type` always being `string[]` and
 * `Visit` never carrying an embedded `payments` array.
 */
function normalizeVisit(visit: Visit): Visit {
  const rawType = visit.type as unknown;
  const { payments: _legacyPayments, ...rest } = visit as Visit & {
    payments?: unknown;
  };
  const normalized = { ...rest } as Visit;
  if (!Array.isArray(rawType)) {
    normalized.type = typeof rawType === "string" && rawType ? [rawType] : [];
  }
  return normalized;
}

function normalizeVisits(visits: Visit[]): Visit[] {
  return visits.map(normalizeVisit);
}

export async function getVisits(embeddedVisits: Visit[] = []): Promise<Visit[]> {
  const initialized = await hasCollection(COLLECTION);
  const stored = normalizeVisits(await readCollection<Visit>(COLLECTION));

  if (initialized) {
    return stored;
  }

  const visitsById = new Map(seedVisits.map((visit) => [visit.id, visit]));
  for (const visit of [...stored, ...embeddedVisits]) {
    visitsById.set(visit.id, visit);
  }

  const visits = normalizeVisits([...visitsById.values()]);
  await writeCollection<Visit>(COLLECTION, visits);
  return visits;
}

export async function getVisitsForPatient(
  patientId: string,
  embeddedVisits: Visit[] = [],
): Promise<Visit[]> {
  const visits = await getVisits(embeddedVisits);
  return visits.filter((visit) => visit.patientId === patientId);
}

export async function deleteVisitsForPatient(patientId: string): Promise<void> {
  const visits = await getVisits();
  await writeCollection(
    COLLECTION,
    visits.filter((visit) => visit.patientId !== patientId),
  );
}

export type NewVisitInput = {
  patientId: string;
  date: string;
  type: string[];
  status: VisitStatus;
  treatments: TreatmentItem[];
  notes?: string;
};

/**
 * Create a visit and stamp it with whichever doctor profile is currently
 * active, so the record shows who performed it.
 */
export async function addVisit(input: NewVisitInput): Promise<Visit> {
  const { profiles, activeId } = await getProfileState();
  const activeDoctor = profiles.find((profile) => profile.id === activeId);

  const visit: Visit = {
    id:
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `visit-${Date.now()}`,
    patientId: input.patientId,
    date: input.date,
    type: input.type,
    status: input.status,
    treatments: input.treatments,
    notes: input.notes?.trim() || undefined,
    ...(activeDoctor
      ? { doctorId: activeDoctor.id, doctorName: activeDoctor.name }
      : {}),
  };

  await upsertCollectionRecord<Visit>(COLLECTION, visit);
  return visit;
}

