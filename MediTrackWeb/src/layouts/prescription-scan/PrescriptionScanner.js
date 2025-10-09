import React, { useState, useRef, useCallback, useEffect } from "react";
import "./PrescriptionScanner.css";
import MedicalRecord from "../medical-record-popup/MedicalRecord";

const BASE_URL = "http://localhost:8000";

const safeB64DecodeToString = (input) => {
  try {
    const trimmed = String(input || "").trim();
    
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      return trimmed;
    }
    
    let s = trimmed.replace(/\s+/g, "");
    s = s.replace(/-/g, "+").replace(/_/g, "/");
    
    const mod = s.length % 4;
    if (mod === 2) s += "==";
    else if (mod === 3) s += "=";
    else if (mod !== 0 && mod !== 1) {
      throw new Error("Invalid base64 length");
    }
    
    return atob(s);
  } catch (error) {
    const fallback = String(input || "").trim();
    if (fallback.startsWith('{') && fallback.endsWith('}')) {
      return fallback;
    }
    throw new Error(`Failed to decode input: ${error.message}`);
  }
};

// Process prescriptions and prescription_items data from backend  
const processMedicalHistory = (prescriptions = []) => {
  const groupedHistory = [];
  
  // Process each prescription with its nested medications
  prescriptions.forEach(prescription => {
    const medications = (prescription.medications || []).map(med => 
      [med.name, med.dosage, med.frequency].filter(Boolean).join(" • ")
    ).join(", ");

    groupedHistory.push({
      condition: prescription.disease_name || "General Prescription",
      medication: medications || "No medications recorded",
      allergy: prescription.notes || "None",
      startDate: prescription.prescription_date || prescription.created_at || "",
      doctor: prescription.doctor_name || "",
      clinic: prescription.clinic_name || ""
    });
  });

  return groupedHistory;
};

const normalizeToPatient = (bundle) => {
  const prof = bundle?.profile || bundle?.user || bundle?.user_profile || {};
  
  // Process medical history from prescriptions with nested medications
  const medicalHistory = processMedicalHistory(
    bundle?.prescriptions || []
  );
  
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
      emergencyContact: prof?.emergencyContact || { name: "", phone: "", relation: "" },
      medicalHistory,
    },
  };
};

const PrescriptionScanner = () => {
  const [decodedPatient, setDecodedPatient] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scannerInput, setScannerInput] = useState("");
  const [scanBuffer, setScanBuffer] = useState("");
  const inputRef = useRef(null);
  const scanTimeoutRef = useRef(null);

  // Global keyboard handler for QR scanner input
  useEffect(() => {
    const handleGlobalKeyPress = (e) => {
      if (!isScanning) return;
      
      // Ignore special keys except Enter
      if (e.key === 'Enter') {
        e.preventDefault();
        if (scanBuffer.trim()) {
          processQRCode(scanBuffer.trim());
          setScanBuffer("");
        }
        return;
      }
      
      // Ignore modifier keys, function keys, etc.
      if (e.key.length > 1 && e.key !== 'Backspace') return;
      
      e.preventDefault();
      
      if (e.key === 'Backspace') {
        setScanBuffer(prev => prev.slice(0, -1));
      } else {
        setScanBuffer(prev => prev + e.key);
        
        // Clear previous timeout
        if (scanTimeoutRef.current) {
          clearTimeout(scanTimeoutRef.current);
        }
        
        // Auto-process after 500ms of no input (typical for QR scanner)
        scanTimeoutRef.current = setTimeout(() => {
          const currentBuffer = scanBuffer + e.key;
          if (currentBuffer.length > 10) { // Minimum reasonable QR length
            processQRCode(currentBuffer.trim());
            setScanBuffer("");
          }
        }, 500);
      }
    };

    if (isScanning) {
      document.addEventListener('keydown', handleGlobalKeyPress);
      document.addEventListener('keypress', handleGlobalKeyPress);
    }

    return () => {
      document.removeEventListener('keydown', handleGlobalKeyPress);
      document.removeEventListener('keypress', handleGlobalKeyPress);
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    };
  }, [isScanning, scanBuffer]);

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

  const processQRCode = useCallback(async (qrCodeData) => {
    try {
      setLoading(true);
      setScannerInput(""); // Clear visible input

      const s = safeB64DecodeToString(qrCodeData);
      const parsed = JSON.parse(s);
      const token = parsed?.t;
      if (!token) throw new Error("QR missing token field 't'");

      // Fetch both profile and prescriptions data (prescriptions include nested medications)
      const [profileResp, prescResp] = await Promise.all([
        fetchWithToken(token, "/api/users/profile"),
        fetchWithToken(token, "/api/prescriptions/list?limit=50&offset=0"),
      ]);

      const bundle = {
        profile: profileResp?.profile || profileResp,
        prescriptions: prescResp?.prescriptions || prescResp?.data || [],
      };
      
      const patient = normalizeToPatient(bundle);
      setDecodedPatient(patient);
      stopScanner();
    } catch (err) {
      console.error("Scan failed:", err);
      alert(`Scan failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const startScanner = () => {
    setIsScanning(true);
    setScannerInput("");
    setScanBuffer("");
    // No need to focus on hidden input
  };

  const stopScanner = () => {
    setIsScanning(false);
    setScannerInput("");
    setScanBuffer("");
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current);
    }
  };

  return (
    <div className="scanner-page">
      <div className="scanner-header">
        <h2>QR Code Scanner</h2>
        <p className="scanner-subtitle">
          Scan a prescription QR code to view medical records instantly
        </p>
      </div>

      <div className="scanner-card">
        <div className="scanner-content-section">
          {/* Scanning indicator - always present */}
          <div className="scanning-indicator">
            <div className="scanner-animation">
              {isScanning && <div className="scan-line"></div>}
              <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <path d="M9 9h6v6h-6z"/>
              </svg>
            </div>
            
            <p className="scan-status">
              {loading ? "Processing..." : 
               scanBuffer ? "Retrieving info..." : 
               isScanning ? "Point your QR scanner at the code" : 
               "Ready to scan QR code"}
            </p>
          </div>
          
          {/* Hidden input for fallback */}
          <input
            ref={inputRef}
            type="text"
            value={scannerInput}
            onChange={() => {}} // Disabled - we use global keyboard capture
            className="qr-scanner-input-hidden"
            tabIndex={-1}
            style={{ position: 'absolute', left: '-9999px', opacity: 0 }}
          />
          
          {/* Fixed position button */}
          <div className="scanner-controls">
            <button 
              className={isScanning ? "stop-scan-button" : "start-scan-button"}
              onClick={isScanning ? stopScanner : startScanner}
              disabled={loading}
            >
              {loading ? "Processing..." : isScanning ? "Stop QR Scanner" : "Start QR Scanner"}
            </button>
          </div>
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