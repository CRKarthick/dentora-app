"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Check, Pencil, Plus, Trash2, Upload, X } from "lucide-react";
import {
  addProfile,
  deleteProfile,
  deriveInitials,
  getProfileState,
  setActiveProfile,
  subscribeToProfileStateChanges,
  updateProfile,
} from "../../lib/profileRepository";
import { fileToAvatarDataUrl } from "../../lib/image";
import type { UserProfile } from "../../lib/types";
import Avatar from "../../components/Avatar";
import styles from "./settings.module.css";

type View =
  | { kind: "list" }
  | { kind: "add" }
  | { kind: "edit"; profile: UserProfile }
  | { kind: "delete"; profile: UserProfile };

export default function DoctorProfilesPanel() {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [activeId, setActiveId] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  const [view, setView] = useState<View>({ kind: "list" });

  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  // undefined = unchanged, null = removed, string = new data URL.
  const [photo, setPhoto] = useState<string | null | undefined>(undefined);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;

    const syncProfileState = () => {
      void getProfileState().then(({ profiles: list, activeId: id }) => {
        if (active) {
          setProfiles(list);
          setActiveId(id);
          setIsLoaded(true);
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

  function resetForm() {
    setName("");
    setRole("");
    setPhoto(undefined);
    setError("");
    setBusy(false);
  }

  function backToList() {
    setView({ kind: "list" });
    resetForm();
  }

  function startAdd() {
    resetForm();
    setView({ kind: "add" });
  }

  function startEdit(profile: UserProfile) {
    resetForm();
    setName(profile.name);
    setRole(profile.role);
    setView({ kind: "edit", profile });
  }

  function startDelete(profile: UserProfile) {
    resetForm();
    setView({ kind: "delete", profile });
  }

  async function handleSwitch(id: string) {
    setActiveId(id);
    await setActiveProfile(id);
  }

  async function handleDelete(profile: UserProfile) {
    setBusy(true);
    try {
      const result = await deleteProfile(profile.id);
      setProfiles(result.profiles);
      setActiveId(result.activeId);
      backToList();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not delete profile.");
      setBusy(false);
    }
  }

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow re-picking the same file
    if (!file) {
      return;
    }

    setBusy(true);
    try {
      setPhoto(await fileToAvatarDataUrl(file));
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not read the image.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!name.trim()) {
      setError("Please enter a name.");
      return;
    }

    setBusy(true);

    if (view.kind === "edit") {
      const updated = await updateProfile(view.profile.id, {
        name,
        role: role.trim() || "Doctor",
        photo,
      });
      setProfiles((prev) =>
        prev.map((profile) => (profile.id === updated.id ? updated : profile)),
      );
    } else {
      const created = await addProfile({
        name,
        role: role.trim() || "Doctor",
        ...(typeof photo === "string" ? { photo } : {}),
      });
      setProfiles((prev) => [...prev, created]);
      setActiveId(created.id);
      await setActiveProfile(created.id);
    }

    backToList();
  }

  if (!isLoaded) {
    return <p>Loading doctor profiles...</p>;
  }

  // What the avatar preview should show while adding or editing.
  const previewProfile = {
    name: name || "New profile",
    initials: name.trim() ? deriveInitials(name) : "??",
    photo:
      photo === null
        ? undefined
        : (photo ?? (view.kind === "edit" ? view.profile.photo : undefined)),
  };

  const isEditing = view.kind === "add" || view.kind === "edit";
  const isDeleting = view.kind === "delete";

  if (isDeleting) {
    return (
      <div className={styles.profileConfirm}>
        <div className={styles.groupHeader}>
          <h3>Delete profile</h3>
          <span>This will permanently remove this profile. This cannot be undone.</span>
        </div>

        <div className={styles.profileConfirmRow}>
          <Avatar profile={view.profile} size={44} />
          <span className={styles.profileConfirmText}>
            <span className={styles.profileName}>{view.profile.name}</span>
            <span className={styles.profileRole}>{view.profile.role}</span>
          </span>
        </div>

        {error ? <p className={styles.error}>{error}</p> : null}

        <div className={styles.profileFormActions}>
          <button type="button" className={styles.resetButton} onClick={backToList}>
            <X size={14} />
          </button>
          <button
            type="button"
            className={styles.deleteConfirmButton}
            onClick={() => handleDelete(view.profile)}
            disabled={busy}
          >
            Delete
          </button>
        </div>
      </div>
    );
  }

  if (isEditing) {
    return (
      <form className={styles.profileForm} onSubmit={handleSubmit}>
        <div className={styles.groupHeader}>
          <h3>{view.kind === "edit" ? "Edit profile" : "New doctor profile"}</h3>
        </div>

        <div className={styles.photoRow}>
          <Avatar profile={previewProfile} size={56} />

          <div className={styles.photoActions}>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className={styles.fileInput}
              onChange={handleFile}
            />
            <button
              type="button"
              className={styles.optionAddButton}
              onClick={() => fileRef.current?.click()}
              disabled={busy}
            >
              <Upload size={14} />
              {previewProfile.photo ? "Change photo" : "Upload photo"}
            </button>

            {previewProfile.photo ? (
              <button
                type="button"
                className={styles.optionAddButton}
                onClick={() => setPhoto(null)}
              >
                <Trash2 size={14} />
                Remove
              </button>
            ) : null}
          </div>
        </div>

        <label className={styles.profileField}>
          <span>Name</span>
          <input
            value={name}
            autoFocus
            placeholder="Dr. Jane Doe"
            onChange={(event) => {
              setName(event.target.value);
              setError("");
            }}
          />
        </label>

        <label className={styles.profileField}>
          <span>Role</span>
          <input
            value={role}
            placeholder="Orthodontist"
            onChange={(event) => setRole(event.target.value)}
          />
        </label>

        {error ? <p className={styles.error}>{error}</p> : null}

        <div className={styles.profileFormActions}>
          <button type="button" className={styles.resetButton} onClick={backToList}>
            <X size={14} />
          </button>
          <button type="submit" className={styles.optionAddButton} disabled={busy}>
            {view.kind === "edit" ? "Save changes" : "Add profile"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className={styles.group}>
      <div className={styles.groupHeader}>
        <h3>Doctor Profiles</h3>
        <span>Switch, add, edit, or remove the clinicians available in this app.</span>
      </div>

      <div className={styles.profileList}>
        {profiles.map((profile) => {
          const isActive = profile.id === activeId;
          const canDelete = profiles.length > 1;
          return (
            <div
              key={profile.id}
              className={`${styles.profileRow} ${isActive ? styles.profileRowActive : ""}`}
            >
              <button
                type="button"
                className={styles.profileItem}
                onClick={() => handleSwitch(profile.id)}
              >
                <Avatar profile={profile} />
                <span className={styles.profileConfirmText}>
                  <span className={styles.profileName}>{profile.name}</span>
                  <span className={styles.profileRole}>{profile.role}</span>
                </span>
              </button>

              <button
                type="button"
                className={styles.resetButton}
                onClick={() => startEdit(profile)}
                aria-label={`Edit ${profile.name}`}
                title={`Edit ${profile.name}`}
              >
                <Pencil size={14} />
              </button>

              <button
                type="button"
                className={styles.resetButton}
                onClick={() => startDelete(profile)}
                disabled={!canDelete}
                aria-label={`Delete ${profile.name}`}
                title={canDelete ? `Delete ${profile.name}` : "At least one profile must remain"}
              >
                <Trash2 size={14} />
              </button>

              {isActive ? <Check size={16} className={styles.activeCheck} aria-label="Active" /> : null}
            </div>
          );
        })}
      </div>

      <button type="button" className={styles.optionAddButton} onClick={startAdd}>
        <Plus size={14} />
        Add new profile
      </button>
    </div>
  );
}
