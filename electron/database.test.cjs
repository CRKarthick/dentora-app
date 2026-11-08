const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { createDentoraDatabase, SCHEMA_VERSION } = require("./database.cjs");

function temporaryDirectory() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "dentora-sqlite-test-"));
}

function testPatient(id = "patient-1") {
  return {
    id,
    name: "Test Patient",
    initials: "TP",
    tags: ["Testing"],
    phone: "+91 9876543210",
    email: "patient@example.com",
    lastVisit: "2026-09-01",
    balance: 500,
    age: 30,
    gender: "Female",
  };
}

function testVisit(patientId = "patient-1") {
  return {
    id: `${patientId}-visit-1`,
    patientId,
    date: "2026-09-01",
    type: "checkup",
    status: "Partial",
    treatments: [{ name: "Examination", price: 1000 }],
    payments: [
      {
        method: "UPI",
        reference: "UPI-1234",
        amount: 500,
        date: "2026-09-01",
      },
    ],
    notes: "SQLite round-trip test.",
  };
}

test("stores patients and visits as separate normalized collections", () => {
  const directory = temporaryDirectory();
  const databasePath = path.join(directory, "dentora.db");
  const database = createDentoraDatabase({ databasePath });

  try {
    assert.equal(database.collectionExists("patients"), false);
    database.replaceCollection("patients", [testPatient()]);
    database.replaceCollection("visits", [testVisit()]);
    assert.equal(database.collectionExists("patients"), true);
    assert.deepEqual(database.readCollection("patients"), [testPatient()]);
    assert.deepEqual(database.readCollection("visits"), [testVisit()]);

    const updated = { ...testPatient(), name: "Updated Patient", initials: "UP" };
    database.upsertRecord("patients", updated.id, updated);
    assert.deepEqual(database.readCollection("patients"), [updated]);
    assert.deepEqual(database.readCollection("visits"), [testVisit()]);

    database.deleteRecord("patients", updated.id);
    assert.deepEqual(database.readCollection("patients"), []);
    assert.deepEqual(database.readCollection("visits"), []);
    assert.equal(database.collectionExists("patients"), true);

    database.writeDocument("themeSettings", { mode: "dark", overrides: {} });
    assert.deepEqual(database.readDocument("themeSettings"), {
      mode: "dark",
      overrides: {},
    });
  } finally {
    database.close();
    fs.rmSync(directory, { recursive: true });
  }
});

test("imports the legacy JSON database once and preserves a backup", () => {
  const directory = temporaryDirectory();
  const databasePath = path.join(directory, "dentora.db");
  const legacyJsonPath = path.join(directory, "dentora-db.json");
  const legacyVisit = { ...testVisit("legacy-patient") };
  delete legacyVisit.patientId;
  const legacyData = {
    patients: [
      {
        ...testPatient("legacy-patient"),
        visits: [legacyVisit],
      },
    ],
    doctors: [
      {
        id: "doctor-1",
        name: "Dr. Test",
        initials: "DT",
        role: "Dentist",
      },
    ],
    activeProfile: { id: "doctor-1" },
  };
  fs.writeFileSync(legacyJsonPath, JSON.stringify(legacyData), "utf8");

  const database = createDentoraDatabase({ databasePath, legacyJsonPath });
  try {
    assert.deepEqual(database.readCollection("patients"), [
      testPatient("legacy-patient"),
    ]);
    assert.deepEqual(database.readCollection("visits"), [
      testVisit("legacy-patient"),
    ]);
    assert.deepEqual(database.readCollection("doctors"), legacyData.doctors);
    assert.deepEqual(
      database.readDocument("activeProfile"),
      legacyData.activeProfile,
    );
    assert.equal(fs.existsSync(`${legacyJsonPath}.migrated`), true);
  } finally {
    database.close();
    fs.rmSync(directory, { recursive: true });
  }
});

test("exports the current schema version", () => {
  assert.equal(SCHEMA_VERSION, 1);
});
