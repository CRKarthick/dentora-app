"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { getPatients } from "../../lib/patientsRepository";
import { getPayments } from "../../lib/paymentsRepository";
import { getProfiles } from "../../lib/profileRepository";
import { formatCurrency, formatDate } from "../../lib/format";
import type { Patient, Payment, UserProfile, Visit } from "../../lib/types";
import DoctorBadge from "../../components/DoctorBadge";
import VisitTypeTags from "../../components/VisitTypeTags";
import styles from "./payments.module.css";

export default function PaymentsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    // Loading from the local database is async (Electron IPC or localStorage),
    // so the initial render matches the server-rendered (empty) markup.
    getPatients().then(setPatients);
    getPayments().then(setPayments);
    getProfiles().then(setProfiles);
  }, []);

  const patientsById = useMemo(
    () => new Map(patients.map((patient) => [patient.id, patient])),
    [patients],
  );

  const visitsById = useMemo(() => {
    const map = new Map<string, Visit>();
    for (const patient of patients) {
      for (const visit of patient.visits ?? []) {
        map.set(visit.id, visit);
      }
    }
    return map;
  }, [patients]);

  const rows = useMemo(
    () =>
      payments
        .map((payment) => ({
          payment,
          patient: patientsById.get(payment.patientId),
          visit: visitsById.get(payment.visitId),
        }))
        .sort((a, b) => b.payment.date.localeCompare(a.payment.date)),
    [payments, patientsById, visitsById],
  );

  const filteredRows = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    if (!query) {
      return rows;
    }

    return rows.filter(
      ({ patient, payment, visit }) =>
        patient?.name.toLowerCase().includes(query) ||
        payment.method.toLowerCase().includes(query) ||
        payment.reference?.toLowerCase().includes(query) ||
        payment.doctorName?.toLowerCase().includes(query) ||
        visit?.type.some((visitType) => visitType.toLowerCase().includes(query)),
    );
  }, [rows, searchText]);

  const totalCollected = useMemo(
    () => payments.reduce((sum, payment) => sum + payment.amount, 0),
    [payments],
  );

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Payments</h1>
          <p>All recorded payments across patients</p>
        </div>
        <span className={styles.paymentCount}>
          {payments.length} {payments.length === 1 ? "payment" : "payments"} ·{" "}
          {formatCurrency(totalCollected)} collected
        </span>
      </div>

      <div className={styles.filterBar}>
        <div className={styles.searchWrap}>
          <Search size={18} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search payments by patient, method, reference, or doctor..."
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
        </div>
      </div>

      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Date</th>
              <th>Patient</th>
              <th>Visit Type</th>
              <th>Method</th>
              <th>Reference</th>
              <th>Doctor</th>
              <th>Amount</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={8} className={styles.emptyState}>
                  No payments found.
                </td>
              </tr>
            ) : (
              filteredRows.map(({ payment, patient, visit }) => (
                <tr key={payment.id}>
                  <td>{formatDate(payment.date)}</td>
                  <td>
                    {patient ? (
                      <div className={styles.patientCell}>
                        <span className={styles.avatar}>{patient.initials}</span>
                        <span className={styles.patientName}>{patient.name}</span>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    <VisitTypeTags types={visit?.type ?? []} />
                  </td>
                  <td>{payment.method}</td>
                  <td>{payment.reference ?? "—"}</td>
                  <td>
                    <DoctorBadge
                      doctorId={payment.doctorId}
                      doctorName={payment.doctorName}
                      profiles={profiles}
                    />
                  </td>
                  <td className={styles.amount}>{formatCurrency(payment.amount)}</td>
                  <td>
                    {patient ? (
                      <Link
                        href={`/patients/profile?id=${patient.id}`}
                        className={styles.viewButton}
                      >
                        View Profile
                      </Link>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
