"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { getProfileState } from "../../../lib/profileRepository";
import { addVisit } from "../../../lib/visitsRepository";
import { addPayment } from "../../../lib/paymentsRepository";
import { recalculatePatientVisitSummary } from "../../../lib/patientsRepository";
import { useClinicOptions } from "../../../components/ClinicOptionsProvider";
import type { Patient, TreatmentItem, Visit, VisitStatus } from "../../../lib/types";
import styles from "./AddVisitModal.module.css";

type TreatmentRow = { name: string; price: string };
type PaymentRow = { method: string; reference: string; amount: string; date: string };

const emptyTreatmentRow: TreatmentRow = { name: "", price: "" };

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function AddVisitModal({
  patient,
  onClose,
  onCreated,
}: {
  patient: Patient;
  onClose: () => void;
  onCreated: (patient: Patient, visit: Visit) => void;
}) {
  const { options, addVisitType } = useClinicOptions();
  const [activeDoctorName, setActiveDoctorName] = useState<string | null>(null);
  const [date, setDate] = useState(today());
  const [selectedTypes, setSelectedTypes] = useState<string[]>(
    options.visitTypes[0] ? [options.visitTypes[0]] : [],
  );
  const [typePicker, setTypePicker] = useState("");
  const [isAddingCustomType, setIsAddingCustomType] = useState(false);
  const [customType, setCustomType] = useState("");
  const [status, setStatus] = useState<VisitStatus>("Pending");
  const [treatments, setTreatments] = useState<TreatmentRow[]>([emptyTreatmentRow]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getProfileState().then(({ profiles, activeId }) => {
      const active = profiles.find((profile) => profile.id === activeId);
      setActiveDoctorName(active?.name ?? null);
    });
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) {
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, saving]);

  function updateTreatment(index: number, field: keyof TreatmentRow, value: string) {
    setTreatments((current) =>
      current.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row)),
    );
    setError("");
  }

  function updatePayment(index: number, field: keyof PaymentRow, value: string) {
    setPayments((current) =>
      current.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row)),
    );
    setError("");
  }

  function addType(value: string) {
    const trimmed = value.trim();
    if (!trimmed || selectedTypes.some((item) => item.toLowerCase() === trimmed.toLowerCase())) {
      return;
    }
    setSelectedTypes((current) => [...current, trimmed]);
    setError("");
  }

  function removeType(value: string) {
    setSelectedTypes((current) => current.filter((item) => item !== value));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!date) {
      setError("Please choose a visit date.");
      return;
    }
    if (selectedTypes.length === 0) {
      setError("Please add at least one visit type.");
      return;
    }

    const parsedTreatments: TreatmentItem[] = [];
    for (const row of treatments) {
      if (!row.name.trim() && !row.price.trim()) {
        continue;
      }
      if (!row.name.trim()) {
        setError("Every treatment needs a name.");
        return;
      }
      const price = Number(row.price);
      if (!Number.isFinite(price) || price < 0) {
        setError(`Enter a valid price for "${row.name.trim()}".`);
        return;
      }
      parsedTreatments.push({ name: row.name.trim(), price });
    }
    if (parsedTreatments.length === 0) {
      setError("Add at least one treatment.");
      return;
    }

    const parsedPayments: { method: string; reference?: string; amount: number; date: string }[] =
      [];
    for (const row of payments) {
      if (!row.method.trim() && !row.amount.trim()) {
        continue;
      }
      if (!row.method.trim()) {
        setError("Every payment needs a method.");
        return;
      }
      const amount = Number(row.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        setError(`Enter a valid amount for the ${row.method.trim()} payment.`);
        return;
      }
      parsedPayments.push({
        method: row.method.trim(),
        reference: row.reference.trim() || undefined,
        amount,
        date: row.date || date,
      });
    }

    setSaving(true);
    try {
      for (const visitType of selectedTypes) {
        if (!options.visitTypes.some((item) => item.toLowerCase() === visitType.toLowerCase())) {
          addVisitType(visitType);
        }
      }

      const visit = await addVisit({
        patientId: patient.id,
        date,
        type: selectedTypes,
        status,
        treatments: parsedTreatments,
        notes,
      });

      for (const payment of parsedPayments) {
        await addPayment({
          patientId: patient.id,
          visitId: visit.id,
          method: payment.method,
          reference: payment.reference,
          amount: payment.amount,
          date: payment.date,
        });
      }

      const updatedPatient = await recalculatePatientVisitSummary(patient.id);
      onCreated({ ...updatedPatient, visits: [...(patient.visits ?? []), visit] }, visit);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The visit could not be saved.");
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
        aria-labelledby="add-visit-title"
      >
        <div className={styles.header}>
          <div>
            <h2 id="add-visit-title">Add Visit</h2>
            <p>Record a new visit for {patient.name}.</p>
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
          <div className={styles.activeDoctor}>
            Recorded by <strong>{activeDoctorName ?? "the active profile"}</strong>
          </div>

          <div className={styles.grid}>
            <label className={`${styles.field} ${styles.fullWidth}`}>
              <span>
                Visit Type <strong>*</strong>
              </span>

              {selectedTypes.length > 0 ? (
                <div className={styles.optionChips}>
                  {selectedTypes.map((visitType) => (
                    <span key={visitType} className={styles.optionChip}>
                      {visitType}
                      <button
                        type="button"
                        onClick={() => removeType(visitType)}
                        aria-label={`Remove ${visitType}`}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}

              {isAddingCustomType ? (
                <div className={styles.customTypeRow}>
                  <input
                    required
                    autoFocus
                    value={customType}
                    placeholder="Enter new visit type"
                    onChange={(event) => setCustomType(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        addType(customType);
                        setCustomType("");
                        setIsAddingCustomType(false);
                      }
                    }}
                  />
                  <button
                    type="button"
                    className={styles.removeRowButton}
                    onClick={() => {
                      addType(customType);
                      setCustomType("");
                      setIsAddingCustomType(false);
                    }}
                    aria-label="Add visit type"
                  >
                    <Plus size={14} />
                  </button>
                  <button
                    type="button"
                    className={styles.removeRowButton}
                    onClick={() => {
                      setIsAddingCustomType(false);
                      setCustomType("");
                    }}
                    aria-label="Cancel new visit type"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <select
                  value={typePicker}
                  onChange={(event) => {
                    const { value } = event.target;
                    if (value === "__custom__") {
                      setIsAddingCustomType(true);
                      setCustomType("");
                      setTypePicker("");
                      return;
                    }
                    if (value) {
                      addType(value);
                    }
                    setTypePicker("");
                  }}
                >
                  <option value="" disabled>
                    {options.visitTypes.length === 0 ? "No visit types configured" : "Select a visit type"}
                  </option>
                  <option value="__custom__">+ Add new visit type...</option>
                  {options.visitTypes
                    .filter(
                      (visitType) =>
                        !selectedTypes.some((item) => item.toLowerCase() === visitType.toLowerCase()),
                    )
                    .map((visitType) => (
                      <option key={visitType} value={visitType}>
                        {visitType}
                      </option>
                    ))}
                </select>
              )}
            </label>

            <label className={styles.field}>
              <span>
                Date <strong>*</strong>
              </span>
              <input
                type="date"
                required
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </label>

            <label className={styles.field}>
              <span>Status</span>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as VisitStatus)}
              >
                <option value="Pending">Pending</option>
                <option value="Partial">Partial</option>
                <option value="Paid">Paid</option>
              </select>
            </label>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3>Treatments</h3>
              <button
                type="button"
                className={styles.addRowButton}
                onClick={() =>
                  setTreatments((current) => [...current, { ...emptyTreatmentRow }])
                }
              >
                <Plus size={14} />
                Add Treatment
              </button>
            </div>

            {treatments.map((row, index) => (
              <div key={index} className={styles.row}>
                <input
                  className={styles.rowInput}
                  value={row.name}
                  placeholder="Treatment name"
                  onChange={(event) => updateTreatment(index, "name", event.target.value)}
                />
                <input
                  className={styles.rowInput}
                  type="number"
                  min="0"
                  step="1"
                  value={row.price}
                  placeholder="Price"
                  onChange={(event) => updateTreatment(index, "price", event.target.value)}
                />
                <button
                  type="button"
                  className={styles.removeRowButton}
                  onClick={() =>
                    setTreatments((current) => current.filter((_, rowIndex) => rowIndex !== index))
                  }
                  disabled={treatments.length === 1}
                  aria-label="Remove treatment"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h3>Payments</h3>
              <button
                type="button"
                className={styles.addRowButton}
                onClick={() =>
                  setPayments((current) => [
                    ...current,
                    { method: options.paymentMethods[0] ?? "", reference: "", amount: "", date: "" },
                  ])
                }
              >
                <Plus size={14} />
                Add Payment
              </button>
            </div>

            {payments.length === 0 ? (
              <p className={styles.emptyRows}>No payments recorded yet.</p>
            ) : (
              payments.map((row, index) => (
                <div key={index} className={styles.paymentRow}>
                  <select
                    className={styles.rowInput}
                    value={row.method}
                    onChange={(event) => updatePayment(index, "method", event.target.value)}
                  >
                    {options.paymentMethods.length === 0 ? (
                      <option value="">No payment methods configured</option>
                    ) : null}
                    {options.paymentMethods.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>
                  <input
                    className={styles.rowInput}
                    value={row.reference}
                    placeholder="Reference (optional)"
                    onChange={(event) => updatePayment(index, "reference", event.target.value)}
                  />
                  <input
                    className={styles.rowInput}
                    type="number"
                    min="0"
                    step="1"
                    value={row.amount}
                    placeholder="Amount"
                    onChange={(event) => updatePayment(index, "amount", event.target.value)}
                  />
                  <input
                    className={styles.rowInput}
                    type="date"
                    value={row.date}
                    onChange={(event) => updatePayment(index, "date", event.target.value)}
                  />
                  <button
                    type="button"
                    className={styles.removeRowButton}
                    onClick={() =>
                      setPayments((current) => current.filter((_, rowIndex) => rowIndex !== index))
                    }
                    aria-label="Remove payment"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>

          <label className={styles.field}>
            <span>Notes</span>
            <textarea
              value={notes}
              placeholder="Additional notes about the visit"
              onChange={(event) => setNotes(event.target.value)}
            />
          </label>

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
            <button type="submit" className={styles.submitButton} disabled={saving}>
              {saving ? "Saving..." : "Save Visit"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
