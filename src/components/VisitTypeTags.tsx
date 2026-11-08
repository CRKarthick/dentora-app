"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./VisitTypeTags.module.css";

/** Compact visit-type display shared by patient, visit, and payment records. */
export default function VisitTypeTags({ types }: { types: string[] }) {
  const [isPinned, setIsPinned] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isPinned) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsPinned(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsPinned(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPinned]);

  if (types.length === 0) {
    return <div className={styles.tagRow}>—</div>;
  }

  const [first, ...rest] = types;
  const isPopoverOpen = isPinned || isHovered;

  return (
    <div
      ref={containerRef}
      className={styles.tagRow}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span className={styles.tag}>{first}</span>
      {rest.length > 0 ? (
        <span className={styles.tagMoreWrap}>
          <button
            type="button"
            className={styles.tagMoreButton}
            onClick={() => setIsPinned((current) => !current)}
            aria-expanded={isPopoverOpen}
            aria-label={`Show all ${types.length} visit types`}
          >
            +{rest.length}
          </button>
          {isPopoverOpen ? (
            <div className={styles.tagPopover}>
              {types.map((visitType) => (
                <span key={visitType} className={styles.tag}>
                  {visitType}
                </span>
              ))}
            </div>
          ) : null}
        </span>
      ) : null}
    </div>
  );
}
