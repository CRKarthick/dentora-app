"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { getPatients } from "../../lib/patientsRepository";
import { getProfiles } from "../../lib/profileRepository";
import { formatCurrency, formatDate } from "../../lib/format";
import type { Patient, UserProfile } from "../../lib/types";
import DoctorBadge from "../../components/DoctorBadge";
import VisitTypeTags from "../../components/VisitTypeTags";
import { getUniqueVisitTypes } from "../../lib/visitTypes";
import NewPatientModal from "./NewPatientModal";
import styles from "./patients.module.css";

function formatBalance(balance: number) {
  if (balance > 0) {
    return { text: formatCurrency(balance), className: styles.balanceDue };
  }
  if (balance < 0) {
    return {
      text: `${formatCurrency(balance)} Credit`,
      className: styles.balanceCredit,
    };
  }
  return { text: formatCurrency(0), className: styles.balanceZero };
}

/** The doctor who attended the patient's most recent visit, if recorded. */
function latestVisitDoctor(patient: Patient): { doctorId?: string; doctorName?: string } {
  const visits = patient.visits ?? [];
  if (visits.length === 0) {
    return {};
  }
  const latest = visits.reduce((latest, visit) =>
    visit.date > latest.date ? visit : latest,
  );
  return { doctorId: latest.doctorId, doctorName: latest.doctorName };
}

export default function PatientsPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [searchText, setSearchText] = useState("");
  const [showNewPatient, setShowNewPatient] = useState(false);

  useEffect(() => {
    // Loading from the local database is async (Electron IPC or localStorage),
    // so the initial render matches the server-rendered (empty) markup.
    getPatients().then(setPatients);
    getProfiles().then(setProfiles);
  }, []);

  const filteredPatients = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    if (!query) {
      return patients;
    }

    return patients.filter(
      (patient) =>
        patient.name.toLowerCase().includes(query) ||
        patient.phone.toLowerCase().includes(query) ||
        patient.email.toLowerCase().includes(query) ||
        getUniqueVisitTypes(patient.visits ?? []).some((visitType) =>
          visitType.toLowerCase().includes(query),
        ),
    );
  }, [patients, searchText]);

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Patients</h1>
          <p>Manage patient information</p>
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => setShowNewPatient(true)}
          >
            <Plus size={16} />
            New Patient
          </button>
        </div>
      </div>

      <div className={styles.filterBar}>
        <div className={styles.searchWrap}>
          <Search size={18} className={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search patients by name, contact, or visit type..."
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
          />
        </div>
      </div>

      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Patient</th>
              <th>Contact</th>
              <th>Last Visit</th>
              <th>Doctor</th>
              <th>Balance</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPatients.length === 0 ? (
              <tr>
                <td colSpan={6} className={styles.emptyState}>
                  No patients found.
                </td>
              </tr>
            ) : (
              filteredPatients.map((patient) => {
                const balance = formatBalance(patient.balance);
                const doctor = latestVisitDoctor(patient);
                return (
                  <tr key={patient.id}>
                    <td>
                      <div className={styles.patientCell}>
                        <span className={styles.avatar}>{patient.initials}</span>
                        <div>
                          <div className={styles.patientName}>{patient.name}</div>
                          <VisitTypeTags
                            types={getUniqueVisitTypes(patient.visits ?? [])}
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className={styles.contactPhone}>{patient.phone}</div>
                      <div className={styles.contactEmail}>{patient.email}</div>
                    </td>
                    <td>{patient.lastVisit ? formatDate(patient.lastVisit) : "—"}</td>
                    <td>
                      <DoctorBadge
                        doctorId={doctor.doctorId}
                        doctorName={doctor.doctorName}
                        profiles={profiles}
                      />
                    </td>
                    <td className={balance.className}>{balance.text}</td>
                    <td>
                      <Link href={`/patients/profile?id=${patient.id}`} className={styles.viewButton}>
                        View Profile
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showNewPatient ? (
        <NewPatientModal
          onClose={() => setShowNewPatient(false)}
          onCreated={(patient) => {
            setPatients((current) => [...current, patient]);
            setShowNewPatient(false);
            router.push(`/patients/profile?id=${patient.id}`);
          }}
        />
      ) : null}
    </main>
  );
}
