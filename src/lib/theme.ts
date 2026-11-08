/**
 * Theme system.
 *
 * Every colour used by the app is defined here as a named token and applied at
 * runtime as a CSS custom property (`--<token>`) on the document root. Stylesheets
 * only ever reference `var(--token)`, never a raw hex value, which is what makes
 * the whole palette configurable from the Settings screen.
 */

/** All configurable colour tokens. */
export type ThemeColors = {
  // Surfaces & layout
  appBackground: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  borderStrong: string;

  // Typography
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textLink: string;

  // Sidebar
  sidebarBackground: string;
  sidebarBorder: string;
  sidebarItemText: string;
  sidebarItemHover: string;
  sidebarActiveBackground: string;
  sidebarActiveText: string;

  // Buttons
  primaryButtonBackground: string;
  primaryButtonText: string;
  primaryButtonHover: string;
  secondaryButtonBackground: string;
  secondaryButtonText: string;
  secondaryButtonHover: string;

  // Avatars & tags
  avatarBackground: string;
  avatarText: string;
  tagBackground: string;
  tagText: string;
  tagBorder: string;

  // Balances
  balanceDue: string;
  balanceCredit: string;
  balanceZero: string;

  // Visit payment status badges
  visitPaidBackground: string;
  visitPaidText: string;
  visitPaidBorder: string;
  visitPartialBackground: string;
  visitPartialText: string;
  visitPartialBorder: string;
  visitPendingBackground: string;
  visitPendingText: string;
  visitPendingBorder: string;
};

export type ThemeMode = "light" | "dark";

export type ThemeSettings = {
  mode: ThemeMode;
  /** Per-mode colour overrides, merged over the built-in presets. */
  overrides: Partial<Record<ThemeMode, Partial<ThemeColors>>>;
};

export const lightTheme: ThemeColors = {
  appBackground: "#f7f8fa",
  surface: "#ffffff",
  surfaceMuted: "#f7f7f8",
  border: "#eaeaea",
  borderStrong: "#d9d9d9",

  textPrimary: "#111111",
  textSecondary: "#6b6b6b",
  textMuted: "#8a8a8a",
  textLink: "#2266d7",

  sidebarBackground: "#ffffff",
  sidebarBorder: "#eaeaea",
  sidebarItemText: "#4b4b4b",
  sidebarItemHover: "#f5f5f5",
  sidebarActiveBackground: "#111111",
  sidebarActiveText: "#ffffff",

  primaryButtonBackground: "#111111",
  primaryButtonText: "#ffffff",
  primaryButtonHover: "#262626",
  secondaryButtonBackground: "#ffffff",
  secondaryButtonText: "#111111",
  secondaryButtonHover: "#f5f5f5",

  avatarBackground: "#eef0f3",
  avatarText: "#444444",
  tagBackground: "#fafafa",
  tagText: "#555555",
  tagBorder: "#e2e2e2",

  balanceDue: "#d33b3b",
  balanceCredit: "#1f9254",
  balanceZero: "#9a9a9a",

  visitPaidBackground: "#e8f7ee",
  visitPaidText: "#1f9254",
  visitPaidBorder: "#bfe6cf",
  visitPartialBackground: "#fff6e0",
  visitPartialText: "#b7791f",
  visitPartialBorder: "#f0d998",
  visitPendingBackground: "#fdeaea",
  visitPendingText: "#c53030",
  visitPendingBorder: "#f3c6c6",
};

export const darkTheme: ThemeColors = {
  appBackground: "#14161a",
  surface: "#1c1f24",
  surfaceMuted: "#23262c",
  border: "#2c3037",
  borderStrong: "#3a3f47",

  textPrimary: "#f2f4f7",
  textSecondary: "#a8b0ba",
  textMuted: "#7d858f",
  textLink: "#6ea8ff",

  sidebarBackground: "#1c1f24",
  sidebarBorder: "#2c3037",
  sidebarItemText: "#c2c9d2",
  sidebarItemHover: "#272b32",
  sidebarActiveBackground: "#f2f4f7",
  sidebarActiveText: "#14161a",

  primaryButtonBackground: "#f2f4f7",
  primaryButtonText: "#14161a",
  primaryButtonHover: "#d9dde3",
  secondaryButtonBackground: "#23262c",
  secondaryButtonText: "#f2f4f7",
  secondaryButtonHover: "#2c3037",

  avatarBackground: "#2f343c",
  avatarText: "#d5dae1",
  tagBackground: "#23262c",
  tagText: "#b3bac3",
  tagBorder: "#343941",

  balanceDue: "#ff6b6b",
  balanceCredit: "#4ade80",
  balanceZero: "#7d858f",

  visitPaidBackground: "#123420",
  visitPaidText: "#4ade80",
  visitPaidBorder: "#1f5c37",
  visitPartialBackground: "#3d2f10",
  visitPartialText: "#f0c05a",
  visitPartialBorder: "#5a4718",
  visitPendingBackground: "#3d1a1a",
  visitPendingText: "#ff6b6b",
  visitPendingBorder: "#5c2626",
};

export const themePresets: Record<ThemeMode, ThemeColors> = {
  light: lightTheme,
  dark: darkTheme,
};

export const defaultThemeSettings: ThemeSettings = {
  mode: "light",
  overrides: {},
};

/** Human-friendly grouping used to render the Settings screen. */
export const themeColorGroups: {
  title: string;
  description: string;
  tokens: { key: keyof ThemeColors; label: string }[];
}[] = [
  {
    title: "Surfaces & Layout",
    description: "Page background, cards, and borders",
    tokens: [
      { key: "appBackground", label: "App Background" },
      { key: "surface", label: "Card Surface" },
      { key: "surfaceMuted", label: "Muted Surface" },
      { key: "border", label: "Border" },
      { key: "borderStrong", label: "Strong Border" },
    ],
  },
  {
    title: "Typography",
    description: "Text and link colors",
    tokens: [
      { key: "textPrimary", label: "Primary Text" },
      { key: "textSecondary", label: "Secondary Text" },
      { key: "textMuted", label: "Muted Text" },
      { key: "textLink", label: "Link" },
    ],
  },
  {
    title: "Sidebar",
    description: "Navigation panel colors",
    tokens: [
      { key: "sidebarBackground", label: "Background" },
      { key: "sidebarBorder", label: "Border" },
      { key: "sidebarItemText", label: "Item Text" },
      { key: "sidebarItemHover", label: "Item Hover" },
      { key: "sidebarActiveBackground", label: "Active Background" },
      { key: "sidebarActiveText", label: "Active Text" },
    ],
  },
  {
    title: "Buttons",
    description: "Primary and secondary actions",
    tokens: [
      { key: "primaryButtonBackground", label: "Primary Background" },
      { key: "primaryButtonText", label: "Primary Text" },
      { key: "primaryButtonHover", label: "Primary Hover" },
      { key: "secondaryButtonBackground", label: "Secondary Background" },
      { key: "secondaryButtonText", label: "Secondary Text" },
      { key: "secondaryButtonHover", label: "Secondary Hover" },
    ],
  },
  {
    title: "Avatars & Tags",
    description: "Patient initials and treatment tags",
    tokens: [
      { key: "avatarBackground", label: "Avatar Background" },
      { key: "avatarText", label: "Avatar Text" },
      { key: "tagBackground", label: "Tag Background" },
      { key: "tagText", label: "Tag Text" },
      { key: "tagBorder", label: "Tag Border" },
    ],
  },
  {
    title: "Balances",
    description: "Outstanding, credit, and settled amounts",
    tokens: [
      { key: "balanceDue", label: "Amount Due" },
      { key: "balanceCredit", label: "Credit" },
      { key: "balanceZero", label: "Zero Balance" },
    ],
  },
  {
    title: "Visit Status",
    description: "Payment status badges shown on the Visits page and a patient's visit history",
    tokens: [
      { key: "visitPaidBackground", label: "Paid Background" },
      { key: "visitPaidText", label: "Paid Text" },
      { key: "visitPaidBorder", label: "Paid Border" },
      { key: "visitPartialBackground", label: "Partial Background" },
      { key: "visitPartialText", label: "Partial Text" },
      { key: "visitPartialBorder", label: "Partial Border" },
      { key: "visitPendingBackground", label: "Pending Background" },
      { key: "visitPendingText", label: "Pending Text" },
      { key: "visitPendingBorder", label: "Pending Border" },
    ],
  },
];

/** Convert a camelCase token name into its CSS custom property name. */
export function cssVarName(token: keyof ThemeColors): string {
  return `--${token.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`)}`;
}

/** Merge a mode's preset with any saved overrides to get the effective palette. */
export function resolveThemeColors(settings: ThemeSettings): ThemeColors {
  const preset = themePresets[settings.mode] ?? lightTheme;
  return { ...preset, ...(settings.overrides[settings.mode] ?? {}) };
}
