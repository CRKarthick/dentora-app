const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");

const SCHEMA_VERSION = 1;
const LEGACY_MIGRATION_KEY = "legacy-json-v1";

function createDentoraDatabase({ databasePath, legacyJsonPath }) {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });

  const database = new DatabaseSync(databasePath);
  database.exec("PRAGMA foreign_keys = ON");
  database.exec("PRAGMA journal_mode = WAL");
  database.exec("PRAGMA synchronous = NORMAL");
  database.exec("PRAGMA busy_timeout = 5000");

  initializeSchema(database);
  migrateLegacyJson(database, legacyJsonPath);

  return {
    collectionExists(name) {
      assertStorageKey(name, "collection");
      return Boolean(
        database
          .prepare("SELECT 1 FROM collection_state WHERE name = ?")
          .get(name),
      );
    },

    readCollection(name) {
      assertStorageKey(name, "collection");
      return readCollection(database, name);
    },

    replaceCollection(name, records) {
      assertStorageKey(name, "collection");
      assertRecords(records);
      return withTransaction(database, () => {
        replaceCollection(database, name, records);
        return true;
      });
    },

    upsertRecord(name, id, record) {
      assertStorageKey(name, "collection");
      assertRecordId(id);
      assertRecord(record);
      return withTransaction(database, () => {
        upsertRecord(database, name, id, record);
        markCollectionInitialized(database, name);
        return true;
      });
    },

    deleteRecord(name, id) {
      assertStorageKey(name, "collection");
      assertRecordId(id);
      return withTransaction(database, () => {
        deleteRecord(database, name, id);
        markCollectionInitialized(database, name);
        return true;
      });
    },

    readDocument(key) {
      assertStorageKey(key, "document");
      const row = database
        .prepare("SELECT value_json FROM app_documents WHERE key = ?")
        .get(key);
      return row ? parseJson(row.value_json, `document "${key}"`) : null;
    },

    writeDocument(key, value) {
      assertStorageKey(key, "document");
      assertRecord(value);
      database
        .prepare(
          `INSERT INTO app_documents (key, value_json)
           VALUES (?, ?)
           ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json`,
        )
        .run(key, serializeJson(value));
      return true;
    },

    close() {
      database.close();
    },
  };
}

function initializeSchema(database) {
  const version = database.prepare("PRAGMA user_version").get().user_version;
  if (version > SCHEMA_VERSION) {
    throw new Error(
      `Database schema ${version} is newer than supported schema ${SCHEMA_VERSION}.`,
    );
  }

  database.exec(`
    CREATE TABLE IF NOT EXISTS collection_state (
      name TEXT PRIMARY KEY,
      initialized_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS app_documents (
      key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      initials TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL DEFAULT '',
      last_visit TEXT,
      balance REAL NOT NULL DEFAULT 0,
      age INTEGER,
      gender TEXT,
      address TEXT,
      emergency_contact_name TEXT,
      emergency_contact_phone TEXT,
      tags_json TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS visits (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL,
      notes TEXT,
      position INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS visits_patient_date
      ON visits(patient_id, date DESC);

    CREATE TABLE IF NOT EXISTS treatments (
      visit_id TEXT NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
      position INTEGER NOT NULL,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      PRIMARY KEY (visit_id, position)
    );

    CREATE TABLE IF NOT EXISTS visit_payments (
      visit_id TEXT NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
      position INTEGER NOT NULL,
      method TEXT NOT NULL,
      reference TEXT,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      PRIMARY KEY (visit_id, position)
    );

    CREATE TABLE IF NOT EXISTS doctors (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      initials TEXT NOT NULL,
      role TEXT NOT NULL,
      photo TEXT
    );

    CREATE TABLE IF NOT EXISTS generic_collections (
      name TEXT PRIMARY KEY,
      records_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS storage_migrations (
      key TEXT PRIMARY KEY,
      completed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    PRAGMA user_version = ${SCHEMA_VERSION};
  `);
}

function migrateLegacyJson(database, legacyJsonPath) {
  if (!legacyJsonPath || !fs.existsSync(legacyJsonPath)) {
    return;
  }

  const completed = database
    .prepare("SELECT 1 FROM storage_migrations WHERE key = ?")
    .get(LEGACY_MIGRATION_KEY);
  if (completed) {
    return;
  }

  const hasSqliteData =
    database.prepare("SELECT COUNT(*) AS count FROM collection_state").get()
      .count > 0 ||
    database.prepare("SELECT COUNT(*) AS count FROM app_documents").get().count >
      0;

  if (hasSqliteData) {
    database
      .prepare("INSERT INTO storage_migrations (key) VALUES (?)")
      .run(LEGACY_MIGRATION_KEY);
    return;
  }

  const legacyData = parseJson(
    fs.readFileSync(legacyJsonPath, "utf8"),
    "legacy JSON database",
  );
  if (
    typeof legacyData !== "object" ||
    legacyData === null ||
    Array.isArray(legacyData)
  ) {
    throw new Error("Legacy JSON database must contain an object.");
  }

  withTransaction(database, () => {
    for (const [key, value] of Object.entries(legacyData)) {
      assertStorageKey(key, "legacy database key");
      if (Array.isArray(value)) {
        replaceCollection(database, key, value);
      } else if (typeof value === "object" && value !== null) {
        database
          .prepare("INSERT INTO app_documents (key, value_json) VALUES (?, ?)")
          .run(key, serializeJson(value));
      } else {
        throw new Error(`Unsupported legacy value stored at "${key}".`);
      }
    }
    database
      .prepare("INSERT INTO storage_migrations (key) VALUES (?)")
      .run(LEGACY_MIGRATION_KEY);
  });

  const backupPath = `${legacyJsonPath}.migrated`;
  if (fs.existsSync(backupPath)) {
    fs.renameSync(
      legacyJsonPath,
      `${backupPath}.${new Date().toISOString().replace(/[:.]/g, "-")}`,
    );
  } else {
    fs.renameSync(legacyJsonPath, backupPath);
  }
}

function readCollection(database, name) {
  if (name === "patients") {
    return readPatients(database);
  }
  if (name === "visits") {
    return readVisits(database);
  }
  if (name === "doctors") {
    return database
      .prepare(
        "SELECT id, name, initials, role, photo FROM doctors ORDER BY rowid",
      )
      .all()
      .map((row) => ({
        id: row.id,
        name: row.name,
        initials: row.initials,
        role: row.role,
        ...(row.photo ? { photo: row.photo } : {}),
      }));
  }

  const row = database
    .prepare("SELECT records_json FROM generic_collections WHERE name = ?")
    .get(name);
  return row ? parseJson(row.records_json, `collection "${name}"`) : [];
}

function readPatients(database) {
  return database
    .prepare("SELECT * FROM patients ORDER BY rowid")
    .all()
    .map((patient) => ({
      id: patient.id,
      name: patient.name,
      initials: patient.initials,
      tags: parseJson(patient.tags_json, `patient "${patient.id}" tags`),
      phone: patient.phone,
      email: patient.email,
      ...(patient.last_visit ? { lastVisit: patient.last_visit } : {}),
      balance: patient.balance,
      ...(patient.age !== null ? { age: patient.age } : {}),
      ...(patient.gender ? { gender: patient.gender } : {}),
      ...(patient.address ? { address: patient.address } : {}),
      ...(patient.emergency_contact_name
        ? { emergencyContactName: patient.emergency_contact_name }
        : {}),
      ...(patient.emergency_contact_phone
        ? { emergencyContactPhone: patient.emergency_contact_phone }
        : {}),
    }));
}

function readVisits(database) {
  const visits = database.prepare("SELECT * FROM visits ORDER BY position").all();
  const treatmentsStatement = database.prepare(
    "SELECT name, price FROM treatments WHERE visit_id = ? ORDER BY position",
  );
  const paymentsStatement = database.prepare(
    `SELECT method, reference, amount, date
     FROM visit_payments WHERE visit_id = ? ORDER BY position`,
  );

  return visits.map((visit) => ({
    id: visit.id,
    patientId: visit.patient_id,
    date: visit.date,
    type: visit.type,
    status: visit.status,
    treatments: treatmentsStatement.all(visit.id).map((treatment) => ({
      name: treatment.name,
      price: treatment.price,
    })),
    payments: paymentsStatement.all(visit.id).map((payment) => ({
      method: payment.method,
      ...(payment.reference ? { reference: payment.reference } : {}),
      amount: payment.amount,
      date: payment.date,
    })),
    ...(visit.notes ? { notes: visit.notes } : {}),
  }));
}

function replaceCollection(database, name, records) {
  assertRecords(records);
  markCollectionInitialized(database, name);

  if (name === "patients") {
    const visitsById = new Map(
      readVisits(database).map((visit) => [visit.id, visit]),
    );
    for (const patient of records) {
      for (const visit of Array.isArray(patient.visits) ? patient.visits : []) {
        visitsById.set(visit.id, { ...visit, patientId: patient.id });
      }
    }
    database.exec("DELETE FROM patients");
    for (const record of records) {
      writePatient(database, record);
    }
    replaceVisits(
      database,
      [...visitsById.values()].filter((visit) =>
        records.some((record) => record.id === visit.patientId),
      ),
    );
    return;
  }
  if (name === "visits") {
    replaceVisits(database, records);
    return;
  }
  if (name === "doctors") {
    database.exec("DELETE FROM doctors");
    for (const record of records) {
      writeDoctor(database, record);
    }
    return;
  }

  database
    .prepare(
      `INSERT INTO generic_collections (name, records_json)
       VALUES (?, ?)
       ON CONFLICT(name) DO UPDATE SET records_json = excluded.records_json`,
    )
    .run(name, serializeJson(records));
}

function upsertRecord(database, name, id, record) {
  if (record.id !== id) {
    throw new Error("Record id does not match the requested id.");
  }
  if (name === "patients") {
    writePatient(database, record);
    return;
  }
  if (name === "visits") {
    writeVisit(database, record, existingVisitPosition(database, id));
    return;
  }
  if (name === "doctors") {
    writeDoctor(database, record);
    return;
  }

  const records = readCollection(database, name);
  const index = records.findIndex((item) => item?.id === id);
  if (index === -1) {
    records.push(record);
  } else {
    records[index] = record;
  }
  replaceCollection(database, name, records);
}

function deleteRecord(database, name, id) {
  if (name === "patients") {
    database.prepare("DELETE FROM patients WHERE id = ?").run(id);
    return;
  }
  if (name === "visits") {
    database.prepare("DELETE FROM visits WHERE id = ?").run(id);
    return;
  }
  if (name === "doctors") {
    database.prepare("DELETE FROM doctors WHERE id = ?").run(id);
    return;
  }

  const records = readCollection(database, name);
  replaceCollection(
    database,
    name,
    records.filter((record) => record?.id !== id),
  );
}

function writePatient(database, patient) {
  assertRecord(patient);
  assertRecordId(patient.id);
  requireString(patient.name, "Patient name");
  requireString(patient.initials, "Patient initials");
  requireString(patient.phone, "Patient phone");

  database
    .prepare(
      `INSERT INTO patients (
        id, name, initials, phone, email, last_visit, balance, age, gender,
        address, emergency_contact_name, emergency_contact_phone, tags_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        initials = excluded.initials,
        phone = excluded.phone,
        email = excluded.email,
        last_visit = excluded.last_visit,
        balance = excluded.balance,
        age = excluded.age,
        gender = excluded.gender,
        address = excluded.address,
        emergency_contact_name = excluded.emergency_contact_name,
        emergency_contact_phone = excluded.emergency_contact_phone,
        tags_json = excluded.tags_json`,
    )
    .run(
      patient.id,
      patient.name,
      patient.initials,
      patient.phone,
      patient.email ?? "",
      patient.lastVisit ?? null,
      numberOrDefault(patient.balance, 0),
      patient.age ?? null,
      patient.gender ?? null,
      patient.address ?? null,
      patient.emergencyContactName ?? null,
      patient.emergencyContactPhone ?? null,
      serializeJson(Array.isArray(patient.tags) ? patient.tags : []),
    );

}

function replaceVisits(database, visits) {
  database.exec("DELETE FROM visits");
  visits.forEach((visit, position) => writeVisit(database, visit, position));
}

function existingVisitPosition(database, id) {
  const row = database.prepare("SELECT position FROM visits WHERE id = ?").get(id);
  if (row) {
    return row.position;
  }
  return database.prepare("SELECT COUNT(*) AS count FROM visits").get().count;
}

function writeVisit(database, visit, position) {
  assertRecord(visit);
  assertRecordId(visit.id);
  requireString(visit.patientId, "Visit patient id");
  database.prepare("DELETE FROM visits WHERE id = ?").run(visit.id);
  database
    .prepare(
      `INSERT INTO visits (
        id, patient_id, date, type, status, notes, position
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      visit.id,
      visit.patientId,
      requireString(visit.date, "Visit date"),
      requireString(visit.type, "Visit type"),
      requireString(visit.status, "Visit status"),
      visit.notes ?? null,
      position,
    );

  const treatments = Array.isArray(visit.treatments) ? visit.treatments : [];
  treatments.forEach((treatment, treatmentPosition) => {
    assertRecord(treatment);
    database
      .prepare(
        `INSERT INTO treatments (visit_id, position, name, price)
         VALUES (?, ?, ?, ?)`,
      )
      .run(
        visit.id,
        treatmentPosition,
        requireString(treatment.name, "Treatment name"),
        numberOrDefault(treatment.price, 0),
      );
  });

  const payments = Array.isArray(visit.payments) ? visit.payments : [];
  payments.forEach((payment, paymentPosition) => {
    assertRecord(payment);
    database
      .prepare(
        `INSERT INTO visit_payments (
          visit_id, position, method, reference, amount, date
        ) VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        visit.id,
        paymentPosition,
        requireString(payment.method, "Payment method"),
        payment.reference ?? null,
        numberOrDefault(payment.amount, 0),
        requireString(payment.date, "Payment date"),
      );
  });
}

function writeDoctor(database, doctor) {
  assertRecord(doctor);
  assertRecordId(doctor.id);
  database
    .prepare(
      `INSERT INTO doctors (id, name, initials, role, photo)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         initials = excluded.initials,
         role = excluded.role,
         photo = excluded.photo`,
    )
    .run(
      doctor.id,
      requireString(doctor.name, "Doctor name"),
      requireString(doctor.initials, "Doctor initials"),
      requireString(doctor.role, "Doctor role"),
      doctor.photo ?? null,
    );
}

function markCollectionInitialized(database, name) {
  database
    .prepare("INSERT OR IGNORE INTO collection_state (name) VALUES (?)")
    .run(name);
}

function withTransaction(database, operation) {
  database.exec("BEGIN IMMEDIATE");
  try {
    const result = operation();
    database.exec("COMMIT");
    return result;
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

function assertStorageKey(value, label) {
  if (
    typeof value !== "string" ||
    !/^[a-z][a-zA-Z0-9_-]{0,63}$/.test(value)
  ) {
    throw new Error(`Invalid ${label} name.`);
  }
}

function assertRecords(value) {
  if (!Array.isArray(value)) {
    throw new Error("Collection records must be an array.");
  }
  value.forEach(assertRecord);
}

function assertRecord(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Database record must be an object.");
  }
}

function assertRecordId(value) {
  if (typeof value !== "string" || value.length === 0 || value.length > 200) {
    throw new Error("Record id must be a non-empty string.");
  }
}

function requireString(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }
  return value;
}

function numberOrDefault(value, fallback) {
  if (value === undefined || value === null) {
    return fallback;
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error("Database numeric value must be finite.");
  }
  return value;
}

function serializeJson(value) {
  return JSON.stringify(value);
}

function parseJson(value, label) {
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error(`Could not parse ${label}.`, { cause: error });
  }
}

module.exports = { createDentoraDatabase, SCHEMA_VERSION };
