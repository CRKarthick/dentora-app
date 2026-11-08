"use client";

import { useState, type FormEvent } from "react";
import { Moon, Palette, Plus, RotateCcw, Stethoscope, Sun, User, X } from "lucide-react";
import { useTheme } from "../../components/ThemeProvider";
import { useClinicOptions } from "../../components/ClinicOptionsProvider";
import { themeColorGroups, type ThemeColors, type ThemeMode } from "../../lib/theme";
import DoctorProfilesPanel from "./DoctorProfilesPanel";
import styles from "./settings.module.css";

const modeOptions: { mode: ThemeMode; label: string; icon: typeof Sun }[] = [
  { mode: "light", label: "Light", icon: Sun },
  { mode: "dark", label: "Dark", icon: Moon },
];

type SettingsTab = "appearance" | "clinic" | "doctors";

const tabs: { id: SettingsTab; label: string; icon: typeof Palette }[] = [
  { id: "appearance", label: "Appearance & Colors", icon: Palette },
  { id: "clinic", label: "Clinic Options", icon: Stethoscope },
  { id: "doctors", label: "Doctor Profiles", icon: User },
];

function OptionListEditor({
  title,
  description,
  items,
  placeholder,
  onAdd,
  onRemove,
  onReset,
}: {
  title: string;
  description: string;
  items: string[];
  placeholder: string;
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
  onReset: () => void;
}) {
  const [draft, setDraft] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.trim()) {
      return;
    }
    onAdd(draft);
    setDraft("");
  }

  return (
    <div className={styles.group}>
      <div className={styles.groupHeader}>
        <h3>{title}</h3>
        <span>{description}</span>
      </div>

      <div className={styles.optionList}>
        {items.length === 0 ? (
          <p className={styles.emptyOptions}>No options configured.</p>
        ) : (
          items.map((item) => (
            <span key={item} className={styles.optionChip}>
              {item}
              <button
                type="button"
                onClick={() => onRemove(item)}
                aria-label={`Remove ${item}`}
              >
                <X size={12} />
              </button>
            </span>
          ))
        )}
      </div>

      <form className={styles.optionForm} onSubmit={handleSubmit}>
        <input
          value={draft}
          placeholder={placeholder}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button type="submit" className={styles.optionAddButton}>
          <Plus size={14} />
          Add
        </button>
        <button type="button" className={styles.resetButton} onClick={onReset} title="Reset to defaults">
          <RotateCcw size={14} />
        </button>
      </form>
    </div>
  );
}

export default function SettingsPage() {
  const { settings, colors, presetColors, isLoaded, setMode, setColor, resetColor, resetAllColors } =
    useTheme();
  const {
    options: clinicOptions,
    isLoaded: clinicOptionsLoaded,
    addVisitType,
    removeVisitType,
    addPaymentMethod,
    removePaymentMethod,
    resetVisitTypes,
    resetPaymentMethods,
  } = useClinicOptions();
  const [activeTab, setActiveTab] = useState<SettingsTab>("appearance");

  const modeOverrides = settings.overrides[settings.mode] ?? {};
  const customCount = Object.keys(modeOverrides).length;

  if (!isLoaded) {
    return (
      <main className={styles.page}>
        <div className={styles.header}>
          <div>
            <h1>Settings</h1>
            <p>Loading saved preferences...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Settings</h1>
          <p>Configure the application theme, clinic options, and doctor profiles</p>
        </div>
        {activeTab === "appearance" ? (
          <button
            type="button"
            className={styles.resetAllButton}
            onClick={resetAllColors}
            disabled={customCount === 0}
          >
            <RotateCcw size={16} />
            Reset {settings.mode} theme
          </button>
        ) : null}
      </div>

      <div className={styles.tabBar} role="tablist">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={activeTab === id}
            className={`${styles.tabButton} ${activeTab === id ? styles.tabButtonActive : ""}`}
            onClick={() => setActiveTab(id)}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {activeTab === "appearance" ? (
        <>
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <h2>Appearance</h2>
              <p>Choose the base theme. Colors are saved separately for each theme.</p>
            </div>
            <div className={styles.modeRow}>
              {modeOptions.map(({ mode, label, icon: Icon }) => (
                <button
                  key={mode}
                  type="button"
                  className={`${styles.modeButton} ${
                    settings.mode === mode ? styles.modeButtonActive : ""
                  }`}
                  onClick={() => setMode(mode)}
                  aria-pressed={settings.mode === mode}
                >
                  <Icon size={18} />
                  {label}
                </button>
              ))}
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <h2>Colors</h2>
              <p>
                {customCount > 0
                  ? `${customCount} customised ${customCount === 1 ? "color" : "colors"} in the ${
                      settings.mode
                    } theme.`
                  : `Using the default ${settings.mode} palette.`}
              </p>
            </div>

            {themeColorGroups.map((group) => (
              <div key={group.title} className={styles.group}>
                <div className={styles.groupHeader}>
                  <h3>{group.title}</h3>
                  <span>{group.description}</span>
                </div>

                <div className={styles.tokenGrid}>
                  {group.tokens.map(({ key, label }) => {
                    const value = colors[key];
                    const isCustom = Object.prototype.hasOwnProperty.call(modeOverrides, key);

                    return (
                      <div key={key} className={styles.token}>
                        <label className={styles.tokenLabel} htmlFor={`color-${key}`}>
                          {label}
                          {isCustom ? <span className={styles.customDot} title="Customised" /> : null}
                        </label>

                        <div className={styles.tokenControls}>
                          <input
                            id={`color-${key}`}
                            type="color"
                            className={styles.colorInput}
                            value={value}
                            onChange={(event) => setColor(key as keyof ThemeColors, event.target.value)}
                          />
                          <input
                            type="text"
                            className={styles.hexInput}
                            value={value}
                            spellCheck={false}
                            onChange={(event) => setColor(key as keyof ThemeColors, event.target.value)}
                          />
                          <button
                            type="button"
                            className={styles.resetButton}
                            onClick={() => resetColor(key as keyof ThemeColors)}
                            disabled={!isCustom}
                            title={`Reset to default (${presetColors[key]})`}
                            aria-label={`Reset ${label}`}
                          >
                            <RotateCcw size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </section>
        </>
      ) : null}

      {activeTab === "clinic" ? (
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Clinic Options</h2>
            <p>Manage the visit type and payment method presets available when recording a visit.</p>
          </div>

          {!clinicOptionsLoaded ? (
            <p>Loading clinic options...</p>
          ) : (
            <>
              <OptionListEditor
                title="Visit Types"
                description="Presets shown in the Visit Type dropdown on the Add Visit form."
                items={clinicOptions.visitTypes}
                placeholder="e.g. Scaling"
                onAdd={addVisitType}
                onRemove={removeVisitType}
                onReset={resetVisitTypes}
              />

              <OptionListEditor
                title="Payment Methods"
                description="Presets shown in the Payment Method dropdown when recording payments."
                items={clinicOptions.paymentMethods}
                placeholder="e.g. Bank Transfer"
                onAdd={addPaymentMethod}
                onRemove={removePaymentMethod}
                onReset={resetPaymentMethods}
              />
            </>
          )}
        </section>
      ) : null}

      {activeTab === "doctors" ? (
        <section className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Doctor Profiles</h2>
            <p>Manage the clinicians available in this app, same as the topbar profile menu.</p>
          </div>

          <DoctorProfilesPanel />
        </section>
      ) : null}
    </main>
  );
}
