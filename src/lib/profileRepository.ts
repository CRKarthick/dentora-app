"use client";

/**
 * Profile repository.
 *
 * Stores the clinician directory as a `doctors` collection plus an
 * `activeProfile` document holding the id of the currently selected doctor.
 * Both live in local storage (SQLite in Electron, localStorage in a browser),
 * and the directory is seeded once on first run.
 */

import {
  readCollection,
  writeCollection,
  readDocument,
  writeDocument,
  upsertCollectionRecord,
  deleteCollectionRecord,
} from "./localDb";
import seedData from "./seed/doctors.json";
import type { UserProfile } from "./types";

const COLLECTION = "doctors";
const ACTIVE_DOCUMENT = "activeProfile";
const PROFILE_STATE_CHANGE_EVENT = "dentora:profile-state-change";

const seedDoctors = seedData as UserProfile[];

function emitProfileStateChange(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(PROFILE_STATE_CHANGE_EVENT));
  }
}

/** Subscribe to profile directory or active-profile changes in this window. */
export function subscribeToProfileStateChanges(
  listener: () => void,
): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  window.addEventListener(PROFILE_STATE_CHANGE_EVENT, listener);
  return () =>
    window.removeEventListener(PROFILE_STATE_CHANGE_EVENT, listener);
}

/** Load every profile, seeding the database on first run. */
export async function getProfiles(): Promise<UserProfile[]> {
  const stored = await readCollection<UserProfile>(COLLECTION);

  if (stored.length > 0) {
    return stored;
  }

  await writeCollection<UserProfile>(COLLECTION, seedDoctors);
  return seedDoctors;
}

/**
 * Load the directory together with the active profile. Falls back to the first
 * doctor when nothing is selected yet or the stored id no longer exists.
 */
export async function getProfileState(): Promise<{
  profiles: UserProfile[];
  activeId: string;
}> {
  const profiles = await getProfiles();
  const stored = await readDocument<{ id: string }>(ACTIVE_DOCUMENT);

  const isValid = stored
    ? profiles.some((profile) => profile.id === stored.id)
    : false;

  const activeId = isValid && stored ? stored.id : (profiles[0]?.id ?? "");

  return { profiles, activeId };
}

/** Remember which profile is currently selected. */
export async function setActiveProfile(id: string): Promise<void> {
  await writeDocument<{ id: string }>(ACTIVE_DOCUMENT, { id });
  emitProfileStateChange();
}

/**
 * Add a doctor to the directory and return the created record. Initials are
 * derived from the name when not supplied.
 */
export async function addProfile(input: {
  name: string;
  role: string;
  initials?: string;
  photo?: string;
}): Promise<UserProfile> {
  await getProfiles();

  const profile: UserProfile = {
    id: `doctor-${Date.now()}`,
    name: input.name.trim(),
    role: input.role.trim(),
    initials: (input.initials?.trim() || deriveInitials(input.name)).toUpperCase(),
    ...(input.photo ? { photo: input.photo } : {}),
  };

  await upsertCollectionRecord<UserProfile>(COLLECTION, profile);
  emitProfileStateChange();
  return profile;
}

/**
 * Update an existing doctor. `photo` is tri-state: omit it to leave the current
 * picture untouched, pass a data URL to replace it, or pass `null` to remove it.
 */
export async function updateProfile(
  id: string,
  changes: { name: string; role: string; photo?: string | null },
): Promise<UserProfile> {
  const profiles = await getProfiles();
  const existing = profiles.find((profile) => profile.id === id);

  if (!existing) {
    throw new Error(`No profile with id "${id}".`);
  }

  const updated: UserProfile = {
    ...existing,
    name: changes.name.trim(),
    role: changes.role.trim(),
    initials: deriveInitials(changes.name),
  };

  if (changes.photo === null) {
    delete updated.photo;
  } else if (typeof changes.photo === "string") {
    updated.photo = changes.photo;
  }

  await upsertCollectionRecord<UserProfile>(COLLECTION, updated);
  emitProfileStateChange();

  return updated;
}

/**
 * Delete a doctor from the directory. Refuses to remove the last remaining
 * profile — the app always needs at least one. If the deleted profile was the
 * active one, the first remaining profile becomes active.
 */
export async function deleteProfile(
  id: string,
): Promise<{ profiles: UserProfile[]; activeId: string }> {
  const profiles = await getProfiles();

  if (profiles.length <= 1) {
    throw new Error("At least one profile must remain.");
  }

  const remaining = profiles.filter((profile) => profile.id !== id);
  await deleteCollectionRecord(COLLECTION, id);
  emitProfileStateChange();

  const stored = await readDocument<{ id: string }>(ACTIVE_DOCUMENT);
  const activeId =
    stored?.id && stored.id !== id
      ? stored.id
      : remaining[0].id;

  if (activeId !== stored?.id) {
    await setActiveProfile(activeId);
  }

  return { profiles: remaining, activeId };
}

/** Build initials from a name, ignoring a leading "Dr." style title. */
export function deriveInitials(name: string): string {
  const words = name
    .replace(/^\s*(dr|doctor|prof)\.?\s+/i, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return "??";
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}
