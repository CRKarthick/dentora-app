"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  CreditCard,
  IndianRupee,
  RefreshCw,
  Users,
} from "lucide-react";
import DoctorBadge from "../components/DoctorBadge";
import { formatCurrency, formatDate } from "../lib/format";
import { getPatients } from "../lib/patientsRepository";
import { getPayments } from "../lib/paymentsRepository";
import { getProfileState } from "../lib/profileRepository";
import type {
  Patient,
  Payment,
  UserProfile,
  Visit,
  VisitStatus,
} from "../lib/types";
import styles from "./page.module.css";

type DashboardData = {
  patients: Patient[];
  payments: Payment[];
  profiles: UserProfile[];
  activeProfile: UserProfile | null;
};

const statusClassMap: Record<VisitStatus, string> = {
  Paid: styles.statusPaid,
  Partial: styles.statusPartial,
  Pending: styles.statusPending,
};

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function monthKey(date: Date): string {
  return localDateKey(date).slice(0, 7);
}

function greeting(date: Date): string {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>({
    patients: [],
    payments: [],
    profiles: [],
    activeProfile: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [now, setNow] = useState<Date | null>(null);

  const loadDashboard = useCallback(async () => {
    try {
      const [patients, payments, profileState] = await Promise.all([
        getPatients(),
        getPayments(),
        getProfileState(),
      ]);
      setData({
        patients,
        payments,
        profiles: profileState.profiles,
        activeProfile:
          profileState.profiles.find(
            (profile) => profile.id === profileState.activeId,
          ) ?? null,
      });
      setNow(new Date());
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The dashboard could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // The repositories resolve asynchronously through Electron IPC or
    // localStorage; this call only schedules those reads.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadDashboard();
  }, [loadDashboard]);

  const dashboard = useMemo(() => {
    const visits = data.patients
      .flatMap((patient) =>
        (patient.visits ?? []).map((visit) => ({ patient, visit })),
      )
      .sort((a, b) => b.visit.date.localeCompare(a.visit.date));
    const currentMonth = now ? monthKey(now) : "";
    const visitsThisMonth = visits.filter(({ visit }) =>
      visit.date.startsWith(currentMonth),
    ).length;
    const collectedThisMonth = data.payments
      .filter((payment) => payment.date.startsWith(currentMonth))
      .reduce((total, payment) => total + payment.amount, 0);
    const outstanding = data.patients.reduce(
      (total, patient) => total + Math.max(patient.balance, 0),
      0,
    );

    const statusCounts: Record<VisitStatus, number> = {
      Paid: 0,
      Partial: 0,
      Pending: 0,
    };
    for (const { visit } of visits) {
      statusCounts[visit.status] += 1;
    }

    const methodTotals = new Map<string, number>();
    for (const payment of data.payments) {
      methodTotals.set(
        payment.method,
        (methodTotals.get(payment.method) ?? 0) + payment.amount,
      );
    }
    const paymentMethods = [...methodTotals.entries()]
      .map(([method, amount]) => ({ method, amount }))
      .sort((a, b) => b.amount - a.amount);
    const totalCollected = paymentMethods.reduce(
      (total, item) => total + item.amount,
      0,
    );

    return {
      visits,
      visitsThisMonth,
      collectedThisMonth,
      outstanding,
      statusCounts,
      paymentMethods,
      totalCollected,
      outstandingPatientCount: data.patients.filter(
        (patient) => patient.balance > 0,
      ).length,
      outstandingPatients: data.patients
        .filter((patient) => patient.balance > 0)
        .sort((a, b) => b.balance - a.balance)
        .slice(0, 5),
    };
  }, [data, now]);

  const visitCount = dashboard.visits.length;
  const paidShare =
    visitCount > 0
      ? (dashboard.statusCounts.Paid / visitCount) * 100
      : 0;
  const partialShare =
    visitCount > 0
      ? (dashboard.statusCounts.Partial / visitCount) * 100
      : 0;
  const statusChart = {
    background:
      visitCount > 0
        ? `conic-gradient(
            var(--visit-paid-text) 0 ${paidShare}%,
            var(--visit-partial-text) ${paidShare}% ${paidShare + partialShare}%,
            var(--visit-pending-text) ${paidShare + partialShare}% 100%
          )`
        : "var(--surface-muted)",
  };

  if (loading) {
    return (
      <main className={styles.page} aria-busy="true">
        <div className={styles.loadingHeader} />
        <div className={styles.loadingCards}>
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className={styles.loadingCard} />
          ))}
        </div>
        <div className={styles.loadingPanel} />
      </main>
    );
  }

  if (error) {
    return (
      <main className={styles.page}>
        <section className={styles.errorState}>
          <h1>Dashboard unavailable</h1>
          <p>{error}</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setError("");
              void loadDashboard();
            }}
          >
            <RefreshCw size={16} />
            Try again
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Clinic overview</p>
          <h1>
            {now ? greeting(now) : "Welcome"}
            {data.activeProfile ? `, ${data.activeProfile.name}` : ""}
          </h1>
          <p className={styles.headerDate}>
            {now
              ? now.toLocaleDateString("en-US", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              : ""}
          </p>
        </div>
        <div className={styles.headerActions}>
          <Link href="/patients" className={styles.secondaryAction}>
            <Users size={16} />
            View patients
          </Link>
          <Link href="/visits" className={styles.primaryAction}>
            View visits
            <ArrowUpRight size={16} />
          </Link>
        </div>
      </header>

      <section className={styles.metrics} aria-label="Clinic summary">
        <article className={styles.metricCard}>
          <span className={`${styles.metricIcon} ${styles.iconPatients}`}>
            <Users size={19} />
          </span>
          <div>
            <span className={styles.metricLabel}>Total patients</span>
            <strong>{data.patients.length}</strong>
            <span className={styles.metricContext}>Active patient records</span>
          </div>
        </article>
        <article className={styles.metricCard}>
          <span className={`${styles.metricIcon} ${styles.iconVisits}`}>
            <CalendarDays size={19} />
          </span>
          <div>
            <span className={styles.metricLabel}>Visits this month</span>
            <strong>{dashboard.visitsThisMonth}</strong>
            <span className={styles.metricContext}>
              {visitCount} recorded overall
            </span>
          </div>
        </article>
        <article className={styles.metricCard}>
          <span className={`${styles.metricIcon} ${styles.iconCollected}`}>
            <CreditCard size={19} />
          </span>
          <div>
            <span className={styles.metricLabel}>Collected this month</span>
            <strong>{formatCurrency(dashboard.collectedThisMonth)}</strong>
            <span className={styles.metricContext}>
              {formatCurrency(dashboard.totalCollected)} overall
            </span>
          </div>
        </article>
        <article className={styles.metricCard}>
          <span className={`${styles.metricIcon} ${styles.iconOutstanding}`}>
            <IndianRupee size={19} />
          </span>
          <div>
            <span className={styles.metricLabel}>Outstanding balance</span>
            <strong>{formatCurrency(dashboard.outstanding)}</strong>
            <span className={styles.metricContext}>
              {dashboard.outstandingPatientCount} patients need follow-up
            </span>
          </div>
        </article>
      </section>

      <section className={styles.primaryGrid}>
        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Recent visits</h2>
              <p>Latest clinical activity across the clinic</p>
            </div>
            <Link href="/visits" className={styles.textLink}>
              View all <ArrowUpRight size={14} />
            </Link>
          </div>

          <div className={styles.visitList}>
            {dashboard.visits.length === 0 ? (
              <p className={styles.emptyState}>No visits recorded yet.</p>
            ) : (
              dashboard.visits.slice(0, 5).map(({ patient, visit }) => (
                <RecentVisit
                  key={visit.id}
                  patient={patient}
                  visit={visit}
                  profiles={data.profiles}
                />
              ))
            )}
          </div>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Visit status</h2>
              <p>Payment state of all visits</p>
            </div>
          </div>
          <div className={styles.statusOverview}>
            <div className={styles.donut} style={statusChart}>
              <div className={styles.donutCenter}>
                <strong>{visitCount}</strong>
                <span>Total visits</span>
              </div>
            </div>
            <div className={styles.statusLegend}>
              {(["Paid", "Partial", "Pending"] as VisitStatus[]).map(
                (status) => (
                  <div key={status} className={styles.legendRow}>
                    <span
                      className={`${styles.legendDot} ${statusClassMap[status]}`}
                    />
                    <span>{status}</span>
                    <strong>{dashboard.statusCounts[status]}</strong>
                  </div>
                ),
              )}
            </div>
          </div>
        </article>
      </section>

      <section className={styles.secondaryGrid}>
        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Collections by method</h2>
              <p>How payments are being received</p>
            </div>
            <Link href="/payments" className={styles.textLink}>
              Payments <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className={styles.methodList}>
            {dashboard.paymentMethods.length === 0 ? (
              <p className={styles.emptyState}>No payments recorded yet.</p>
            ) : (
              dashboard.paymentMethods.map(({ method, amount }) => {
                const percentage =
                  dashboard.totalCollected > 0
                    ? (amount / dashboard.totalCollected) * 100
                    : 0;
                return (
                  <div key={method} className={styles.methodRow}>
                    <div className={styles.methodDetails}>
                      <span>{method}</span>
                      <strong>{formatCurrency(amount)}</strong>
                    </div>
                    <div className={styles.progressTrack}>
                      <span
                        className={styles.progressBar}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Balances to follow up</h2>
              <p>Patients with the highest outstanding amounts</p>
            </div>
            <Link href="/patients" className={styles.textLink}>
              Patients <ArrowUpRight size={14} />
            </Link>
          </div>
          <div className={styles.balanceList}>
            {dashboard.outstandingPatients.length === 0 ? (
              <p className={styles.emptyState}>All balances are settled.</p>
            ) : (
              dashboard.outstandingPatients.map((patient) => (
                <Link
                  key={patient.id}
                  href={`/patients/profile?id=${patient.id}`}
                  className={styles.balanceRow}
                >
                  <span className={styles.patientAvatar}>
                    {patient.initials}
                  </span>
                  <span className={styles.balancePatient}>
                    <strong>{patient.name}</strong>
                    <span>
                      {patient.lastVisit
                        ? `Last visit ${formatDate(patient.lastVisit)}`
                        : "No visits recorded"}
                    </span>
                  </span>
                  <strong className={styles.balanceAmount}>
                    {formatCurrency(patient.balance)}
                  </strong>
                </Link>
              ))
            )}
          </div>
        </article>
      </section>
    </main>
  );
}

function RecentVisit({
  patient,
  visit,
  profiles,
}: {
  patient: Patient;
  visit: Visit;
  profiles: UserProfile[];
}) {
  return (
    <div className={styles.visitRow}>
      <span className={styles.patientAvatar}>{patient.initials}</span>
      <span className={styles.visitPatient}>
        <Link href={`/patients/profile?id=${patient.id}`}>{patient.name}</Link>
        <span>
          {visit.type.length > 0 ? visit.type.join(", ") : "General visit"}
        </span>
      </span>
      <span className={styles.visitDate}>{formatDate(visit.date)}</span>
      <DoctorBadge
        doctorId={visit.doctorId}
        doctorName={visit.doctorName}
        profiles={profiles}
      />
      <span
        className={`${styles.statusBadge} ${statusClassMap[visit.status]}`}
      >
        {visit.status}
      </span>
      <Link
        href={`/patients/profile?id=${patient.id}`}
        className={styles.rowAction}
        aria-label={`View ${patient.name}'s profile`}
      >
        <ArrowUpRight size={16} />
      </Link>
    </div>
  );
}
