import { Suspense } from "react";
import ProfileContent from "./ProfileContent";
import styles from "./profile.module.css";

// `useSearchParams` (used by ProfileContent to read `?id=`) requires a Suspense
// boundary for static export builds — see Next.js "missing-suspense-with-csr-bailout".
export default function PatientProfilePage() {
  return (
    <Suspense fallback={<main className={styles.page}>Loading…</main>}>
      <ProfileContent />
    </Suspense>
  );
}
