"use client";

import type { UserProfile } from "@/lib/types";
import styles from "./Avatar.module.css";

/**
 * Shows the doctor's uploaded picture, falling back to their initials when no
 * photo has been set.
 */
export default function Avatar({
  profile,
  size = 34,
  className = "",
}: {
  profile: Pick<UserProfile, "name" | "initials" | "photo">;
  size?: number;
  className?: string;
}) {
  const style = {
    width: size,
    height: size,
    minWidth: size,
    fontSize: Math.max(10, Math.round(size * 0.38)),
  };

  if (profile.photo) {
    return (
      // A plain <img> is used rather than next/image because the source is a
      // runtime data URL, which the image optimiser cannot process.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={profile.photo}
        alt={profile.name}
        className={`${styles.avatar} ${styles.photo} ${className}`}
        style={style}
      />
    );
  }

  return (
    <span className={`${styles.avatar} ${className}`} style={style} aria-hidden="true">
      {profile.initials}
    </span>
  );
}
