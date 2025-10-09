import React from "react";
import "./MedicalRecord.css";

const fmtDate = (d) => {
  if (!d) return "";
  const date = new Date(d);
  if (isNaN(date.getTime())) return String(d);
  return date.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const renderMedications = (text) => {
  if (!text) return "";
  const parts = text.split(/,\s*/).filter(Boolean);
  return (
    <ul style={{ margin: 0, paddingLeft: "1.2em" }}>
      {parts.map((p, i) => (
        <li key={i}>{p}</li>
      ))}
    </ul>
  );
};

const MedicalRecord = ({ patient, onClose }) => {
  if (!patient) return null;

  const rec = patient.record || patient;
  const insurance = rec.insurance || {};
  const emer = rec.emergencyContact || {};
  const history =
    (rec.medicalHistory && Array.isArray(rec.medicalHistory)
      ? rec.medicalHistory
      : patient.medicalHistory) || [];

  return (
    <div className="mr-popup-overlay">
      <div className="mr-popup-content">
        <button className="mr-close-button" onClick={onClose}>
          X
        </button>

        <h1>Medical Record</h1>

        <section className="mr-section">
          <h2>General Information</h2>
          <p>
            <strong>Name:</strong> {patient.name || rec.name || ""}
          </p>
          <p>
            <strong>Gender:</strong> {rec.gender || ""}
          </p>
          <p>
            <strong>Date of Birth:</strong> {fmtDate(rec.birthDate)}
          </p>
          <p>
            <strong>Address:</strong> {rec.address || ""}
          </p>
          <p>
            <strong>Phone:</strong> {rec.phone || ""}
          </p>
          <p>
            <strong>Marital Status:</strong> {rec.maritalStatus || ""}
          </p>
          <p>
            <strong>Email:</strong> {rec.email || ""}
          </p>
          <p>
            <strong>Employment:</strong> {rec.employment || ""}
          </p>
        </section>

        <section className="mr-section">
          <h2>Health Coverage</h2>
          <p>
            <strong>Provider:</strong> {insurance.provider || ""}
          </p>
          <p>
            <strong>Plan:</strong> {insurance.plan || ""}
          </p>
          <p>
            <strong>Insurance ID:</strong> {insurance.id || ""}
          </p>
        </section>

        <section className="mr-section">
          <h2>Emergency Contact</h2>
          <p>
            <strong>Name:</strong> {emer.name || ""}
          </p>
          <p>
            <strong>Phone:</strong> {emer.phone || ""}
          </p>
          <p>
            <strong>Relation:</strong> {emer.relation || ""}
          </p>
        </section>

        <section className="mr-section">
          <h2>Medical History</h2>
          <table>
            <thead>
              <tr>
                <th>Condition</th>
                <th>Medication</th>
                <th>Allergy</th>
                <th>Start Date</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: "center", opacity: 0.7 }}>
                    No records
                  </td>
                </tr>
              ) : (
                history.map((entry, idx) => (
                  <tr key={idx}>
                    <td>{entry?.condition || ""}</td>
                    <td>{renderMedications(entry?.medication)}</td>
                    <td>{entry?.allergy || ""}</td>
                    <td>{fmtDate(entry?.startDate)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
};

export default MedicalRecord;
