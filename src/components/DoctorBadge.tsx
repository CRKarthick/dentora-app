"use client";

import { useState } from "react";
import { deriveInitials } from "@/lib/profileRepository";
import type { UserProfile } from "@/lib/types";
import Avatar from "./Avatar";
import styles from "./DoctorBadge.module.css";

/**
 * Shows just the attending doctor's avatar in table cells, with the full
 * name/role revealed in a popover on hover or focus. Falls back to
 * reconstructing a display profile from the stored `doctorName` when the
 * original profile has since been deleted from the directory.
 */
export default function DoctorBadge({
  doctorId,
  doctorName,
  profiles,
}: {
  doctorId?: string;
  doctorName?: string;
  profiles: UserProfile[];
}) {
  const [active, setActive] = useState(false);

  if (!doctorName) {
    return <span className={styles.empty}>—</span>;
  }

  const profile = profiles.find((item) => item.id === doctorId);
  const doctor: Pick<UserProfile, "name" | "initials" | "photo"> & { role?: string } = profile
    ? profile
    : { name: doctorName, initials: deriveInitials(doctorName) };

  return (
    <span
      className={styles.container}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      onFocus={() => setActive(true)}
      onBlur={() => setActive(false)}
    >
      <button type="button" className={styles.trigger} aria-label={doctor.name}>
        <Avatar profile={doctor} size={32} />
      </button>

      <div className={`${styles.popover} ${active ? styles.popoverOpen : ""}`} role="tooltip">
        <Avatar profile={doctor} size={44} />
        <span className={styles.info}>
          <span className={styles.name}>{doctor.name}</span>
          {doctor.role ? <span className={styles.role}>{doctor.role}</span> : null}
        </span>
      </div>
    </span>
  );
}
