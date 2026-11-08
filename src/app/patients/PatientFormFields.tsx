import type { NewPatientInput } from "../../lib/patientsRepository";
import styles from "./NewPatientModal.module.css";

export default function PatientFormFields({
  form,
  onChange,
}: {
  form: NewPatientInput;
  onChange: <K extends keyof NewPatientInput>(
    field: K,
    value: NewPatientInput[K],
  ) => void;
}) {
  return (
    <div className={styles.grid}>
      <label className={`${styles.field} ${styles.fullWidth}`}>
        <span>
          Full Name <strong>*</strong>
        </span>
        <input
          autoFocus
          required
          value={form.name}
          placeholder="Patient's full name"
          onChange={(event) => onChange("name", event.target.value)}
        />
      </label>

      <label className={styles.field}>
        <span>
          Phone Number <strong>*</strong>
        </span>
        <div className={styles.phoneInput}>
          <span className={styles.phonePrefix}>+91</span>
          <input
            type="tel"
            inputMode="numeric"
            pattern="[0-9]{10}"
            maxLength={10}
            required
            value={form.phone}
            placeholder="9876543210"
            aria-label="10-digit mobile number"
            onChange={(event) =>
              onChange("phone", event.target.value.replace(/\D/g, "").slice(0, 10))
            }
          />
        </div>
      </label>

      <label className={styles.field}>
        <span>Email</span>
        <input
          type="email"
          value={form.email}
          placeholder="patient@email.com"
          onChange={(event) => onChange("email", event.target.value)}
        />
      </label>

      <label className={styles.field}>
        <span>Age</span>
        <input
          type="number"
          min="0"
          max="130"
          step="1"
          value={form.age ?? ""}
          placeholder="Age in years"
          onChange={(event) =>
            onChange(
              "age",
              event.target.value === "" ? undefined : Number(event.target.value),
            )
          }
        />
      </label>

      <label className={styles.field}>
        <span>Gender</span>
        <select
          value={form.gender}
          onChange={(event) => onChange("gender", event.target.value)}
        >
          <option value="">Select gender</option>
          <option value="Female">Female</option>
          <option value="Male">Male</option>
          <option value="Non-binary">Non-binary</option>
          <option value="Prefer not to say">Prefer not to say</option>
        </select>
      </label>

      <label className={`${styles.field} ${styles.fullWidth}`}>
        <span>Address</span>
        <input
          value={form.address}
          placeholder="Street, city, state, postal code"
          onChange={(event) => onChange("address", event.target.value)}
        />
      </label>

      <label className={styles.field}>
        <span>Emergency Contact</span>
        <input
          value={form.emergencyContactName}
          placeholder="Contact name"
          onChange={(event) =>
            onChange("emergencyContactName", event.target.value)
          }
        />
      </label>

      <label className={styles.field}>
        <span>Emergency Phone</span>
        <div className={styles.phoneInput}>
          <span className={styles.phonePrefix}>+91</span>
          <input
            type="tel"
            inputMode="numeric"
            pattern="[0-9]{10}"
            maxLength={10}
            value={form.emergencyContactPhone}
            placeholder="9876543210"
            aria-label="10-digit emergency mobile number"
            onChange={(event) =>
              onChange(
                "emergencyContactPhone",
                event.target.value.replace(/\D/g, "").slice(0, 10),
              )
            }
          />
        </div>
      </label>
    </div>
  );
}
