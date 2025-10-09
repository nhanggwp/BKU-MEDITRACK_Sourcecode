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
    <ul className="mr-medication-list">
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
          <div className="mr-info-grid">
            <div className="mr-info-item">
              <strong>Full Name</strong>
              <span>{patient.name || rec.name || "Not specified"}</span>
            </div>
            <div className="mr-info-item">
              <strong>Gender</strong>
              <span>{rec.gender || "Not specified"}</span>
            </div>
            <div className="mr-info-item">
              <strong>Date of Birth</strong>
              <span>{fmtDate(rec.birthDate) || "Not specified"}</span>
            </div>
            <div className="mr-info-item">
              <strong>Phone Number</strong>
              <span>{rec.phone || "Not specified"}</span>
            </div>
            <div className="mr-info-item">
              <strong>Email Address</strong>
              <span>{rec.email || "Not specified"}</span>
            </div>
            <div className="mr-info-item">
              <strong>Marital Status</strong>
              <span>{rec.maritalStatus || "Not specified"}</span>
            </div>
            <div className="mr-info-item">
              <strong>Employment</strong>
              <span>{rec.employment || "Not specified"}</span>
            </div>
            <div className="mr-info-item">
              <strong>Address</strong>
              <span>{rec.address || "Not specified"}</span>
            </div>
          </div>
        </section>

        <section className="mr-section">
          <h2>Health Coverage</h2>
          <div className="mr-info-grid">
            <div className="mr-info-item">
              <strong>Insurance Provider</strong>
              <span>{insurance.provider || "Not specified"}</span>
            </div>
            <div className="mr-info-item">
              <strong>Plan Type</strong>
              <span>{insurance.plan || "Not specified"}</span>
            </div>
            <div className="mr-info-item">
              <strong>Insurance ID</strong>
              <span>{insurance.id || "Not specified"}</span>
            </div>
          </div>
        </section>

        <section className="mr-section">
          <h2>Emergency Contact</h2>
          <div className="mr-info-grid">
            <div className="mr-info-item">
              <strong>Contact Name</strong>
              <span>{emer.name || "Not specified"}</span>
            </div>
            <div className="mr-info-item">
              <strong>Phone Number</strong>
              <span>{emer.phone || "Not specified"}</span>
            </div>
            <div className="mr-info-item">
              <strong>Relationship</strong>
              <span>{emer.relation || "Not specified"}</span>
            </div>
          </div>
        </section>

        <section className="mr-section">
          <h2>Medical History & Prescriptions</h2>
          <div className="mr-table-container">
            <table>
              <thead>
                <tr>
                  <th>Condition/Diagnosis</th>
                  <th>Medications</th>
                  <th>Doctor</th>
                  <th>Clinic</th>
                  <th>Date</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="mr-empty-state">
                      No medical history or prescription records available
                    </td>
                  </tr>
                ) : (
                  history.map((entry, idx) => (
                    <tr key={idx}>
                      <td>
                        <strong>{entry?.condition || "Not specified"}</strong>
                      </td>
                      <td>{renderMedications(entry?.medication)}</td>
                      <td>{entry?.doctor || "Not specified"}</td>
                      <td>{entry?.clinic || "Not specified"}</td>
                      <td>{fmtDate(entry?.startDate) || "Not specified"}</td>
                      <td>
                        <span className="mr-notes">
                          {entry?.allergy || "No notes"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
};

export default MedicalRecord;
