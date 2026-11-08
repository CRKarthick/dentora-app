"use client";

import { useEffect, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import {
  addPatient,
  type NewPatientInput,
} from "../../lib/patientsRepository";
import type { Patient } from "../../lib/types";
import PatientFormFields from "./PatientFormFields";
import styles from "./NewPatientModal.module.css";

const emptyForm: NewPatientInput = {
  name: "",
  phone: "",
  email: "",
  age: undefined,
  gender: "",
  address: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
};

export default function NewPatientModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (patient: Patient) => void;
}) {
  const [form, setForm] = useState<NewPatientInput>(emptyForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) {
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, saving]);

  function updateField<K extends keyof NewPatientInput>(
    field: K,
    value: NewPatientInput[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.name.trim()) {
      setError("Please enter the patient's name.");
      return;
    }
    if (!form.phone.trim()) {
      setError("Please enter a phone number.");
      return;
    }
    if (!/^\d{10}$/.test(form.phone)) {
      setError("Phone number must contain exactly 10 digits.");
      return;
    }
    if (
      form.emergencyContactPhone &&
      !/^\d{10}$/.test(form.emergencyContactPhone)
    ) {
      setError("Emergency phone number must contain exactly 10 digits.");
      return;
    }

    setSaving(true);
    try {
      const patient = await addPatient(form);
      onCreated(patient);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The patient record could not be saved.",
      );
      setSaving(false);
    }
  }

  return (
    <div
      className={styles.overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) {
          onClose();
        }
      }}
    >
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-patient-title"
      >
        <div className={styles.header}>
          <div>
            <h2 id="new-patient-title">New Patient</h2>
            <p>Record the basic information needed to create a patient profile.</p>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <PatientFormFields form={form} onChange={updateField} />

          {error ? (
            <p className={styles.error} role="alert">
              {error}
            </p>
          ) : null}

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={saving}
            >
              {saving ? "Creating..." : "Create Patient"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
