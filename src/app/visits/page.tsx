"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { getPatients } from "../../lib/patientsRepository";
import { getProfiles } from "../../lib/profileRepository";
import { formatCurrency, formatDate } from "../../lib/format";
import type { Patient, UserProfile, Visit, VisitStatus } from "../../lib/types";
import DoctorBadge from "../../components/DoctorBadge";
import VisitTypeTags from "../../components/VisitTypeTags";
import styles from "./visits.module.css";

const visitStatusClassMap: Record<VisitStatus, string> = {
  Paid: styles.visitStatusPaid,
  Partial: styles.visitStatusPartial,
  Pending: styles.visitStatusPending,
};

function visitTotal(visit: Visit) {
  return visit.treatments.reduce((total, treatment) => total + treatment.price, 0);
}

export default function VisitsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    // Loading from the local database is async (Electron IPC or localStorage),
    // so the initial render matches the server-rendered (empty) markup.
    getPatients().then(setPatients);
    getProfiles().then(setProfiles);
  }, []);

  const visits = useMemo(
    () =>
      patients
        .flatMap((patient) =>
          (patient.visits ?? []).map((visit) => ({ patient, visit })),
        )
        .sort((a, b) => b.visit.date.localeCompare(a.visit.date)),
    [patients],
  );

  const filteredVisits = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    if (!query) {
      return visits;
    }

    return visits.filter(
      ({ patient, visit }) =>
        patient.name.toLowerCase().includes(query) ||
        visit.type.some((visitType) => visitType.toLowerCase().includes(query)) ||
        visit.doctorName?.toLowerCase().includes(query) ||
        visit.treatments.some((treatment) =>
          treatment.name.toLowerCase().includes(query),
        ),
    );
  }, [visits, searchText]);

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Visits</h1>
          <p>Visit history across all patients</p>
        </div>
        <span className={styles.visitCount}>
          {visits.length} {visits.length === 1 ? "visit" : "visits"}
        </span>
      </div>

      <div className={styles.filterBar}>
        <div className={styles.searchWrap}>
          <Search size={18} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search visits by patient, doctor, type, or treatment..."
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
              <th>Type</th>
              <th>Treatments</th>
              <th>Doctor</th>
              <th>Total</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredVisits.length === 0 ? (
              <tr>
                <td colSpan={8} className={styles.emptyState}>
                  No visits found.
                </td>
              </tr>
            ) : (
              filteredVisits.map(({ patient, visit }) => (
                <tr key={visit.id}>
                  <td>{formatDate(visit.date)}</td>
                  <td>
                    <div className={styles.patientCell}>
                      <span className={styles.avatar}>{patient.initials}</span>
                      <span className={styles.patientName}>{patient.name}</span>
                    </div>
                  </td>
                  <td>
                    <VisitTypeTags types={visit.type} />
                  </td>
                  <td>{visit.treatments.map((treatment) => treatment.name).join(", ")}</td>
                  <td>
                    <DoctorBadge
                      doctorId={visit.doctorId}
                      doctorName={visit.doctorName}
                      profiles={profiles}
                    />
                  </td>
                  <td className={styles.visitTotal}>{formatCurrency(visitTotal(visit))}</td>
                  <td>
                    <span
                      className={`${styles.visitStatusBadge} ${visitStatusClassMap[visit.status]}`}
                    >
                      {visit.status}
                    </span>
                  </td>
                  <td>
                    <Link
                      href={`/patients/profile?id=${patient.id}`}
                      className={styles.viewButton}
                    >
                      View Profile
                    </Link>
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
