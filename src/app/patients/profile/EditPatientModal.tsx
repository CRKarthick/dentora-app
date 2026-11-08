"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Trash2, X } from "lucide-react";
import {
  deletePatient,
  updatePatient,
  type NewPatientInput,
} from "../../../lib/patientsRepository";
import type { Patient } from "../../../lib/types";
import PatientFormFields from "../PatientFormFields";
import styles from "../NewPatientModal.module.css";

function editableMobileNumber(value?: string): string {
  return value?.replace(/\D/g, "").slice(-10) ?? "";
}

export default function EditPatientModal({
  patient,
  onClose,
  onUpdated,
  onDeleted,
}: {
  patient: Patient;
  onClose: () => void;
  onUpdated: (patient: Patient) => void;
  onDeleted: () => void;
}) {
  const [form, setForm] = useState<NewPatientInput>({
    name: patient.name,
    phone: editableMobileNumber(patient.phone),
    email: patient.email,
    age: patient.age,
    gender: patient.gender ?? "",
    address: patient.address ?? "",
    emergencyContactName: patient.emergencyContactName ?? "",
    emergencyContactPhone: editableMobileNumber(patient.emergencyContactPhone),
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || busy) {
        return;
      }
      if (confirmingDelete) {
        setConfirmingDelete(false);
      } else {
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [busy, confirmingDelete, onClose]);

  function updateField<K extends keyof NewPatientInput>(
    field: K,
    value: NewPatientInput[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    try {
      onUpdated(await updatePatient(patient.id, form));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "The patient record could not be updated.",
      );
      setBusy(false);
    }
  }

  async function handleDelete() {
    setBusy(true);
    try {
      await deletePatient(patient.id);
      onDeleted();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "The patient record could not be deleted.",
      );
      setConfirmingDelete(false);
      setBusy(false);
    }
  }

  return (
    <div
      className={styles.overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy && !confirmingDelete) {
          onClose();
        }
      }}
    >
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-patient-title"
      >
        {confirmingDelete ? (
          <div className={styles.confirmation}>
            <div className={styles.confirmationIcon}>
              <Trash2 size={22} />
            </div>
            <h2 id="edit-patient-title">Delete patient record?</h2>
            <p>
              This will permanently delete <strong>{patient.name}</strong>, including
              their visit and treatment history. This action cannot be undone.
            </p>
            {error ? <p className={styles.error}>{error}</p> : null}
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={() => setConfirmingDelete(false)}
                disabled={busy}
              >
                Keep Record
              </button>
              <button
                type="button"
                className={styles.dangerButton}
                onClick={handleDelete}
                disabled={busy}
              >
                {busy ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className={styles.header}>
              <div>
                <h2 id="edit-patient-title">Edit Patient Profile</h2>
                <p>Update the patient's contact and demographic information.</p>
              </div>
              <button
                type="button"
                className={styles.closeButton}
                onClick={onClose}
                disabled={busy}
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
              <div className={styles.actionsBetween}>
                <button
                  type="button"
                  className={styles.deleteButton}
                  onClick={() => setConfirmingDelete(true)}
                  disabled={busy}
                >
                  <Trash2 size={15} />
                  Delete Record
                </button>
                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.cancelButton}
                    onClick={onClose}
                    disabled={busy}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={styles.submitButton}
                    disabled={busy}
                  >
                    {busy ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
