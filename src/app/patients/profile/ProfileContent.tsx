"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Phone,
  Mail,
  Calendar,
  CreditCard,
  Banknote,
  Wallet,
} from "lucide-react";
import { getPatientById } from "@/lib/patientsRepository";
import { getPaymentsForPatient } from "@/lib/paymentsRepository";
import { formatDate, formatCurrency } from "@/lib/format";
import type { Patient, Payment, Visit, VisitStatus } from "@/lib/types";
import VisitTypeTags from "@/components/VisitTypeTags";
import { getUniqueVisitTypes } from "@/lib/visitTypes";
import EditPatientModal from "./EditPatientModal";
import AddVisitModal from "./AddVisitModal";
import styles from "./profile.module.css";

type Tab = "overview" | "visits";
// Loading state is represented separately from "not found" (null) so the two
// can be told apart while data is still being fetched from the local database.
type PatientState = Patient | null | "loading";

const visitStatusClassMap: Record<VisitStatus, string> = {
  Paid: styles.visitStatusPaid,
  Partial: styles.visitStatusPartial,
  Pending: styles.visitStatusPending,
};

function paymentIcon(method: string) {
  const normalized = method.toLowerCase();
  if (normalized.includes("card")) {
    return CreditCard;
  }
  if (normalized.includes("cash")) {
    return Banknote;
  }
  return Wallet;
}

function visitTotals(visit: Visit, paid: number) {
  const total = visit.treatments.reduce((sum, item) => sum + item.price, 0);
  return { total, paid };
}

export default function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const patientId = searchParams.get("id");

  const [patient, setPatient] = useState<PatientState>("loading");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [editing, setEditing] = useState(false);
  const [addingVisit, setAddingVisit] = useState(false);

  useEffect(() => {
    if (!patientId) {
      // The client search parameter is the source of truth for this route.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPatient(null);
      setPayments([]);
      return;
    }

    let cancelled = false;
    setPatient("loading");
    getPatientById(patientId).then((found) => {
      if (!cancelled) {
        setPatient(found);
      }
    });
    getPaymentsForPatient(patientId).then((found) => {
      if (!cancelled) {
        setPayments(found);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [patientId]);

  const visits = useMemo(
    () => (patient && patient !== "loading" ? (patient.visits ?? []) : []),
    [patient],
  );
  const visitTypes = useMemo(() => getUniqueVisitTypes(visits), [visits]);

  const paymentsByVisit = useMemo(() => {
    const map = new Map<string, Payment[]>();
    for (const payment of payments) {
      const list = map.get(payment.visitId) ?? [];
      list.push(payment);
      map.set(payment.visitId, list);
    }
    return map;
  }, [payments]);

  const lastPaymentDate = useMemo(() => {
    const dates = payments.map((payment) => payment.date);
    return dates.length > 0 ? dates.sort().at(-1) : null;
  }, [payments]);

  if (patient === "loading") {
    return <main className={styles.page} />;
  }

  if (patient === null) {
    return (
      <main className={styles.page}>
        <Link href="/patients" className={styles.backLink}>
          <ArrowLeft size={16} />
          Back to Patients
        </Link>
        <p className={styles.notFound}>Patient not found.</p>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <Link href="/patients" className={styles.backLink}>
        <ArrowLeft size={16} />
        Back to Patients
      </Link>

      <div className={styles.header}>
        <h1>Patient Profile</h1>
        <p>Manage patient information and visits</p>
      </div>

      <div className={styles.profileCard}>
        <div className={styles.profileMain}>
          <span className={styles.avatar}>{patient.initials}</span>
          <div className={styles.profileInfo}>
            <div className={styles.profileName}>{patient.name}</div>
            <div className={styles.metaRow}>
              <span className={styles.metaItem}>
                <Phone size={14} />
                {patient.phone}
              </span>
              <span className={styles.metaItem}>
                <Mail size={14} />
                {patient.email || "Not provided"}
              </span>
              <span className={styles.metaItem}>
                <Calendar size={14} />
                Last visit: {patient.lastVisit ? formatDate(patient.lastVisit) : "No visits yet"}
              </span>
            </div>
            <VisitTypeTags types={visitTypes} />
          </div>
        </div>

        <div className={styles.profileActions}>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => setEditing(true)}
          >
            Edit Profile
          </button>
          <button type="button" className={styles.primaryButton} onClick={() => setAddingVisit(true)}>
            <Plus size={16} />
            Add Visit
          </button>
        </div>
      </div>

      <div className={styles.tabBar}>
        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === "overview" ? styles.tabButtonActive : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          Overview
        </button>
        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === "visits" ? styles.tabButtonActive : ""}`}
          onClick={() => setActiveTab("visits")}
        >
          Visits &amp; Treatments
        </button>
      </div>

      {activeTab === "overview" ? (
        <div className={styles.overviewGrid}>
          <div className={styles.card}>
            <h2>Demographics</h2>
            <div className={styles.fieldGroup}>
              <div className={styles.fieldLabel}>Age</div>
              <div className={styles.fieldValue}>
                {patient.age !== undefined ? `${patient.age} years` : "—"}
              </div>
            </div>
            <div className={styles.fieldGroup}>
              <div className={styles.fieldLabel}>Gender</div>
              <div className={styles.fieldValue}>
                {patient.gender ?? "—"}
              </div>
            </div>
            <div className={styles.fieldGroup}>
              <div className={styles.fieldLabel}>Address</div>
              <div className={styles.fieldValue}>{patient.address ?? "—"}</div>
            </div>
            <div className={styles.fieldGroup}>
              <div className={styles.fieldLabel}>Emergency Contact</div>
              <div className={styles.fieldValue}>
                {patient.emergencyContactName
                  ? `${patient.emergencyContactName}${
                      patient.emergencyContactPhone ? ` - ${patient.emergencyContactPhone}` : ""
                    }`
                  : "—"}
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <h2>Financial Summary</h2>
            <div className={styles.summaryRow}>
              <span className={styles.fieldLabel}>Total Outstanding</span>
              <span
                className={
                  patient.balance > 0
                    ? styles.balanceDue
                    : patient.balance < 0
                      ? styles.balanceCredit
                      : styles.balanceZero
                }
              >
                {formatCurrency(patient.balance)}
                {patient.balance < 0 ? " Credit" : ""}
              </span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.fieldLabel}>Total Visits</span>
              <span className={styles.fieldValue}>{visits.length}</span>
            </div>
            <div className={styles.summaryRow}>
              <span className={styles.fieldLabel}>Last Payment</span>
              <span className={styles.fieldValue}>
                {lastPaymentDate ? formatDate(lastPaymentDate) : "—"}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.visitsSection}>
          <div className={styles.visitsHeader}>
            <h2>Visit History</h2>
            <button type="button" className={styles.primaryButton} onClick={() => setAddingVisit(true)}>
              <Plus size={16} />
              Add Visit
            </button>
          </div>

          {visits.length === 0 ? (
            <div className={styles.card}>
              <p className={styles.notFound}>No visits recorded yet.</p>
            </div>
          ) : (
            [...visits]
              .sort((a, b) => (a.date < b.date ? 1 : -1))
              .map((visit, index) => {
                const visitPayments = paymentsByVisit.get(visit.id) ?? [];
                const paidAmount = visitPayments.reduce((sum, item) => sum + item.amount, 0);
                const { total, paid } = visitTotals(visit, paidAmount);
                return (
                  <div key={visit.id} className={styles.visitCard}>
                    <div className={styles.visitHeader}>
                      <div>
                        <div className={styles.visitTitleRow}>
                          <span className={styles.visitTitle}>
                            Visit #{visits.length - index}
                          </span>
                          <VisitTypeTags types={visit.type} />
                          <span
                            className={`${styles.visitStatusBadge} ${visitStatusClassMap[visit.status]}`}
                          >
                            {visit.status}
                          </span>
                        </div>
                        <div className={styles.visitDate}>{formatDate(visit.date)}</div>
                        {visit.doctorName ? (
                          <div className={styles.visitDoctor}>Attended by {visit.doctorName}</div>
                        ) : null}
                      </div>
                      <div className={styles.visitTotals}>
                        <div className={styles.visitTotal}>
                          Total: {formatCurrency(total)}
                        </div>
                        <div className={styles.visitPaid}>Paid: {formatCurrency(paid)}</div>
                      </div>
                    </div>

                    <div className={styles.visitSection}>
                      <h3>Treatments</h3>
                      {visit.treatments.map((treatment, treatmentIndex) => (
                        <div key={treatmentIndex} className={styles.lineItem}>
                          <span>{treatment.name}</span>
                          <span>{formatCurrency(treatment.price)}</span>
                        </div>
                      ))}
                    </div>

                    {visitPayments.length > 0 ? (
                      <div className={styles.visitSection}>
                        <h3>Payments</h3>
                        {visitPayments.map((payment) => {
                          const Icon = paymentIcon(payment.method);
                          return (
                            <div key={payment.id} className={styles.paymentItem}>
                              <span className={styles.paymentMethod}>
                                <Icon size={16} />
                                {payment.method}
                                {payment.reference ? (
                                  <span className={styles.paymentReference}>
                                    ({payment.reference})
                                  </span>
                                ) : null}
                              </span>
                              <span className={styles.paymentAmountGroup}>
                                <span className={styles.paymentAmount}>
                                  {formatCurrency(payment.amount)}
                                </span>
                                <span className={styles.paymentDate}>
                                  {formatDate(payment.date)}
                                </span>
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}

                    {visit.notes ? (
                      <div className={styles.visitSection}>
                        <h3>Notes</h3>
                        <div className={styles.notesBox}>{visit.notes}</div>
                      </div>
                    ) : null}
                  </div>
                );
              })
          )}
        </div>
      )}

      {editing ? (
        <EditPatientModal
          patient={patient}
          onClose={() => setEditing(false)}
          onUpdated={(updated) => {
            setPatient(updated);
            setEditing(false);
          }}
          onDeleted={() => router.push("/patients")}
        />
      ) : null}

      {addingVisit ? (
        <AddVisitModal
          patient={patient}
          onClose={() => setAddingVisit(false)}
          onCreated={(updatedPatient) => {
            setPatient(updatedPatient);
            setAddingVisit(false);
            setActiveTab("visits");
          }}
        />
      ) : null}
    </main>
  );
}
