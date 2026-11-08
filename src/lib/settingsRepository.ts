"use client";

/**
 * Settings repository.
 *
 * Theme configuration is stored as a local database document, so customised
 * colors persist across restarts just like patient records.
 */

import { readDocument, writeDocument } from "./localDb";
import { defaultThemeSettings, type ThemeSettings } from "./theme";
import { defaultClinicOptions, type ClinicOptions } from "./clinicOptions";

const THEME_KEY = "themeSettings";
const CLINIC_OPTIONS_KEY = "clinicOptions";

export async function getThemeSettings(): Promise<ThemeSettings> {
  const stored = await readDocument<ThemeSettings>(THEME_KEY);

  if (!stored) {
    return defaultThemeSettings;
  }

  return {
    mode: stored.mode === "dark" ? "dark" : "light",
    overrides: stored.overrides ?? {},
  };
}

export async function saveThemeSettings(settings: ThemeSettings): Promise<void> {
  await writeDocument<ThemeSettings>(THEME_KEY, settings);
}

/** Load configurable visit types and payment methods, seeding defaults on first run. */
export async function getClinicOptions(): Promise<ClinicOptions> {
  const stored = await readDocument<ClinicOptions>(CLINIC_OPTIONS_KEY);

  if (!stored) {
    return defaultClinicOptions;
  }

  return {
    visitTypes:
      Array.isArray(stored.visitTypes) && stored.visitTypes.length > 0
        ? stored.visitTypes
        : defaultClinicOptions.visitTypes,
    paymentMethods:
      Array.isArray(stored.paymentMethods) && stored.paymentMethods.length > 0
        ? stored.paymentMethods
        : defaultClinicOptions.paymentMethods,
  };
}

export async function saveClinicOptions(options: ClinicOptions): Promise<void> {
  await writeDocument<ClinicOptions>(CLINIC_OPTIONS_KEY, options);
}
