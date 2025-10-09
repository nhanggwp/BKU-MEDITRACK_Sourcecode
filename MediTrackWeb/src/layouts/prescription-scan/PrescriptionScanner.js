// WebApp/src/pages/PrescriptionScanner.jsx
import React, { useState } from "react";
import "./PrescriptionScanner.css";
import MedicalRecord from "../medical-record-popup/MedicalRecord";

const BASE_URL = "http://localhost:8000";

/* ============== helpers ============== */

// Decode base64 “an toàn” (xử lý padding/URL-safe)
const safeB64DecodeToString = (b64) => {
  let s = String(b64 || "")
    .trim()
    .replace(/\s+/g, "");
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  const mod = s.length % 4;
  if (mod === 2) s += "==";
  else if (mod === 3) s += "=";
  else if (mod !== 0) throw new Error("Invalid base64 length");
  return atob(s);
};

// rows từ prescriptions (giữ prescription_id để nhóm)
const mapFromPrescriptions = (prescriptions = []) => {
  const rows = [];
  prescriptions.forEach((p) => {
    const condition =
      p?.disease_name || p?.diagnosis || p?.condition || "Unknown";
    const prescDate = p?.prescription_date || p?.created_at || "";
    const prescId = p?.id || p?.prescription_id || "";

    const items = Array.isArray(p?.medications)
      ? p.medications
      : Array.isArray(p?.prescription_items)
      ? p.prescription_items
      : [];

    items.forEach((m) => {
      const name = m?.name || m?.medication_name || m?.drug_name || "";
      const dosage = m?.dosage || m?.dose || "";
      const frequency = m?.frequency || m?.freq || "";
      const notes = m?.notes || m?.remark || "";
      const start =
        m?.start_date || m?.started_at || prescDate || p?.created_at || "";
      rows.push({
        prescription_id: prescId,
        condition,
        medication: [name, dosage, frequency].filter(Boolean).join(" • "),
        allergy: notes || "None",
        startDate: start,
      });
    });
  });
  return rows;
};

// rows từ items rời
const mapFromStandaloneItems = (items = [], fallbackCondition = "Medication") =>
  (items || []).map((m) => ({
    prescription_id: m?.prescription_id || "", // có thì nhóm theo, không thì rỗng
    condition: m?.condition || m?.disease || fallbackCondition,
    medication: [
      m?.name || m?.medication_name || m?.drug_name || "",
      m?.dosage || m?.dose || "",
      m?.frequency || m?.freq || "",
    ]
      .filter(Boolean)
      .join(" • "),
    allergy: m?.notes || m?.remark || "None",
    startDate:
      m?.start_date || m?.started_at || m?.created_at || m?.updated_at || "",
  }));

// 🧠 Gom các dòng cùng prescription_id + condition + startDate
const groupRowsByPrescription = (rows) => {
  const map = new Map();
  rows.forEach((r) => {
    const key = `${r.prescription_id || ""}__${r.condition}__${r.startDate}`;
    if (!map.has(key)) {
      map.set(key, { ...r, medication: [r.medication] });
    } else {
      map.get(key).medication.push(r.medication);
    }
  });
  return Array.from(map.values()).map((r) => ({
    ...r,
    medication: r.medication.join(", "),
  }));
};

// Chuẩn hóa dữ liệu tổng hợp {profile, prescriptions, ...} -> shape MedicalRecord
const normalizeToPatient = (bundle) => {
  const prof = bundle?.profile || bundle?.user || bundle?.user_profile || {};

  const emergencyContact =
    typeof prof?.emergency_contact === "string"
      ? { name: "", phone: prof.emergency_contact, relation: "" }
      : prof?.emergencyContact || { name: "", phone: "", relation: "" };

  const rawRows = [
    ...mapFromPrescriptions(bundle?.prescriptions),
    ...mapFromStandaloneItems(
      bundle?.standalone_items ||
        bundle?.unassigned_items ||
        bundle?.items ||
        bundle?.prescription_items,
      "Unassigned"
    ),
  ];

  const groupedRows = groupRowsByPrescription(rawRows);

  return {
    name: prof?.full_name || prof?.name || "Patient",
    record: {
      gender: prof?.gender || "",
      birthDate: prof?.date_of_birth || prof?.birthDate || "",
      address: prof?.address || "",
      phone: prof?.phone || "",
      maritalStatus: prof?.maritalStatus || "",
      email: prof?.email || "",
      employment: prof?.employment || "",
      insurance: prof?.insurance || {},
      emergencyContact,
      medicalHistory: groupedRows,
    },
  };
};

/* ============== component ============== */

const PrescriptionScanner = () => {
  const [manualText, setManualText] = useState("");
  const [decodedPatient, setDecodedPatient] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchWithToken = async (token, path) => {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}`);
    return res.json();
  };

  const handleKeyDown = async (e) => {
    if (e.key !== "Enter" || e.shiftKey) return;
    e.preventDefault();

    try {
      setLoading(true);

      // 1) Decode QR -> { t: access_token, ... }
      const s = safeB64DecodeToString(manualText);
      const parsed = JSON.parse(s);
      const token = parsed?.t;
      if (!token) throw new Error("QR missing token field 't'");

      // 2) Gọi song song: profile + prescriptions
      const [profileResp, prescResp] = await Promise.all([
        fetchWithToken(token, "/api/users/profile"), // trả { profile: {...} }
        fetchWithToken(token, "/api/prescriptions/list?limit=50&offset=0"),
      ]);

      // 3) Gộp bundle rồi normalize
      const bundle = {
        profile: profileResp?.profile || profileResp,
        ...prescResp,
      };
      const patient = normalizeToPatient(bundle);

      // 4) Show popup
      setDecodedPatient(patient);
      setManualText("");
    } catch (err) {
      console.error("Scan failed:", err);
      alert(`Scan failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="scanner-page">
      <h2>Scanner</h2>
      <div className="scanner-card">
        <div className="manual-input">
          <label htmlFor="prescription">Code Input:</label>
          <textarea
            id="prescription"
            rows="6"
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Paste/scan base64, then press Enter…"
          />
          {loading && <p>Loading…</p>}
        </div>
      </div>

      {decodedPatient && (
        <MedicalRecord
          patient={decodedPatient}
          onClose={() => setDecodedPatient(null)}
        />
      )}
    </div>
  );
};

export default PrescriptionScanner;
