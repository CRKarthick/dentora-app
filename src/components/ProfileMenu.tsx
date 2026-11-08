"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import {
  getProfileState,
  setActiveProfile,
  subscribeToProfileStateChanges,
} from "@/lib/profileRepository";
import type { UserProfile } from "@/lib/types";
import Avatar from "./Avatar";
import styles from "./ProfileMenu.module.css";

/**
 * Bottom-of-sidebar control for switching the active doctor profile. Adding,
 * editing, and deleting profiles lives on the Settings page instead, so this
 * stays a simple, focused switcher.
 */
export default function ProfileMenu({ collapsed = false }: { collapsed?: boolean }) {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [activeId, setActiveId] = useState("");
  const [open, setOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;

    const syncProfileState = () => {
      void getProfileState().then(({ profiles: list, activeId: id }) => {
        if (active) {
          setProfiles(list);
          setActiveId(id);
        }
      });
    };

    syncProfileState();
    const unsubscribe = subscribeToProfileStateChanges(syncProfileState);

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const active = profiles.find((profile) => profile.id === activeId) ?? null;

  async function handleSwitch(id: string) {
    setActiveId(id);
    setOpen(false);
    await setActiveProfile(id);
  }

  if (!active) {
    return null;
  }

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        type="button"
        className={`${styles.trigger} ${collapsed ? styles.triggerCollapsed : ""}`}
        onClick={() => setOpen((prev) => (profiles.length > 1 ? !prev : prev))}
        aria-haspopup={profiles.length > 1 ? "menu" : undefined}
        aria-expanded={profiles.length > 1 ? open : undefined}
        title={active.name}
      >
        <span key={active.id} className={styles.triggerInner}>
          <Avatar profile={active} />
          {!collapsed ? (
            <span className={styles.triggerText}>
              <span className={styles.triggerName}>{active.name}</span>
              <span className={styles.triggerRole}>{active.role}</span>
            </span>
          ) : null}
        </span>
      </button>

      {profiles.length > 1 ? (
        <div
          className={`${styles.menu} ${styles.menuUpward} ${
            collapsed ? styles.menuFlyout : styles.menuInline
          } ${open ? styles.menuOpen : ""}`}
          role="menu"
          aria-hidden={!open}
        >
          <div className={styles.menuHeader}>Switch profile</div>
          <div className={styles.list}>
            {profiles.map((profile) => {
              const isActive = profile.id === activeId;
              return (
                <button
                  key={profile.id}
                  type="button"
                  role="menuitem"
                  className={`${styles.item} ${isActive ? styles.itemActive : ""}`}
                  onClick={() => handleSwitch(profile.id)}
                  tabIndex={open ? 0 : -1}
                >
                  <Avatar profile={profile} />
                  <span className={styles.itemText}>
                    <span className={styles.itemName}>{profile.name}</span>
                    <span className={styles.itemRole}>{profile.role}</span>
                  </span>
                  {isActive ? (
                    <Check size={16} className={styles.check} aria-label="Active" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
