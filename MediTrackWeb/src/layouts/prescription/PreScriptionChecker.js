import React, { useState, useEffect } from "react";
import "./PreScriptionChecker.css";

import { FiMinusCircle } from "react-icons/fi";
import Select from "react-select";
import CreatableSelect from "react-select/creatable";
import drugInteractionService from "../../services/drugInteractionService";
import aiService from "../../services/aiService";
import { LoadingSpinner, Toast } from "../../components/CommonComponents";

const initialDrugOptions = [
  { value: "Paracetamol", label: "Paracetamol" },
  { value: "Ibuprofen", label: "Ibuprofen" },
  { value: "Aspirin", label: "Aspirin" },
  { value: "Clopidogrel", label: "Clopidogrel" },
];

const initialPatientOptions = [
  { value: "Hồ Minh Nhật", label: "Hồ Minh Nhật" },
  { value: "Trần Minh Quốc", label: "Trần Minh Quốc" },
  { value: "Phạm Nam An", label: "Phạm Nam An" },
];

const sharedStyle = {
  control: (base) => ({ ...base, minHeight: 38, borderRadius: 8 }),
};
const DropdownIndicator = () => null;
const IndicatorSeparator = () => null;

export default function PrescriptionChecker() {
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [drugOptions, setDrugOptions] = useState(initialDrugOptions);
  const [drugs, setDrugs] = useState([null, null, null]);
  const [alert, setAlert] = useState("");
  const [patientOptions, setPatientOptions] = useState(initialPatientOptions);
  const [isLoading, setIsLoading] = useState(false);
  const [interactions, setInteractions] = useState([]);
  const [aiExplanation, setAiExplanation] = useState("");
  const [toast, setToast] = useState(null);

  // Search medications from backend
  const searchMedications = async (query) => {
    if (query.length < 2) return [];
    
    try {
      const response = await drugInteractionService.searchMedications(query);
      return response.medications.map(med => ({
        value: med.name,
        label: med.name
      }));
    } catch (error) {
      console.error('Failed to search medications:', error);
      return [];
    }
  };

  // Debounced search
  useEffect(() => {
    const loadMedications = async () => {
      try {
        const response = await drugInteractionService.searchMedications("a", 50);
        const backendOptions = response.medications.map(med => ({
          value: med.name,
          label: med.name
        }));
        setDrugOptions([...initialDrugOptions, ...backendOptions]);
      } catch (error) {
        console.error('Failed to load medications:', error);
      }
    };

    loadMedications();
  }, []);

  const handleDrugChange = (idx, sel) => {
    const next = [...drugs];
    next[idx] = sel;
    setDrugs(next);
  };

  const handleCreateDrug = (idx, inputValue) => {
    const newOpt = { value: inputValue, label: inputValue };
    setDrugOptions((prev) => [...prev, newOpt]);
    handleDrugChange(idx, newOpt);
  };

  const createNewPatient = (inputValue) => {
    const newPatient = { value: inputValue, label: inputValue };
    setPatientOptions((prev) => [...prev, newPatient]);
    setSelectedPatient(newPatient);
  };

  const addDrugField = () => {
    setDrugs([...drugs, null]);
  };

  const removeDrugAt = (idx) => {
    if (drugs.length > 1) {
      const next = drugs.filter((_, i) => i !== idx);
      setDrugs(next);
    }
  };

  const handleCheck = async () => {
    // Get non-null drug values
    const selectedDrugs = drugs.filter(drug => drug?.value).map(drug => drug.value);
    
    if (selectedDrugs.length < 2) {
      setToast({ message: "Please select at least 2 medications to check interactions", type: "warning" });
      return;
    }

    setIsLoading(true);
    setAlert("");
    setInteractions([]);
    setAiExplanation("");

    try {
      // Check drug interactions
      const interactionResponse = await drugInteractionService.checkInteractions(selectedDrugs);
      setInteractions(interactionResponse.interactions || []);

      // Get AI explanation
      const aiResponse = await aiService.explainMedicationRisks(selectedDrugs, {
        includeMedicalHistory: true
      });
      setAiExplanation(aiResponse.explanation);

      // Set alert based on risk level
      const riskLevel = drugInteractionService.getRiskLevel(interactionResponse.interactions);
      const riskMessage = drugInteractionService.formatInteractionMessage(interactionResponse.interactions);
      
      setAlert(riskMessage);
      setToast({ 
        message: `Analysis complete! Found ${interactionResponse.interactions?.length || 0} interactions.`, 
        type: riskLevel === 'high' ? 'error' : riskLevel === 'medium' ? 'warning' : 'success'
      });

    } catch (error) {
      console.error('Interaction check failed:', error);
      // setAlert("Failed to check interactions. Please try again.");
      // setToast({ message: error.message, type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <h2>New Prescription</h2>
      
      {/* Choose Patient  */}
      <div className="patient-wrapper">
        <CreatableSelect
          options={patientOptions}
          value={selectedPatient}
          onChange={setSelectedPatient}
          onCreateOption={createNewPatient}
          placeholder="Choose Patient"
          isClearable
          components={{ DropdownIndicator, IndicatorSeparator }}
          styles={sharedStyle}
        />
      </div>

      {/* List Medicine  */}
      {drugs.map((drug, idx) => (
        <div key={idx} className="input-wrapper">
          <CreatableSelect
            options={drugOptions}
            value={drug}
            onChange={(sel) => handleDrugChange(idx, sel)}
            onCreateOption={(val) => handleCreateDrug(idx, val)}
            placeholder={`Medicine ${idx + 1}`}
            isClearable
            components={{ DropdownIndicator, IndicatorSeparator }}
            styles={sharedStyle}
          />
          {/* Remove Medicine Button  */}
          <button
            className="remove-inside-btn"
            onClick={() => removeDrugAt(idx)}
            type="button"
          >
            <FiMinusCircle size={18} color="#9ca3af" />
          </button>
        </div>
      ))}
      
      {/* Add Medicine Button  */}
      <button className="add-btn" onClick={addDrugField}>
        ➕ Add Medicine
      </button>

      {/* Check Interaction  */}
      <div style={{ textAlign: "center" }}>
        <button className="check-btn" onClick={handleCheck} disabled={isLoading}>
          {isLoading ? (
            <LoadingSpinner size="small" color="white" />
          ) : (
            "Check Interaction"
          )}
        </button>
      </div>

      {/* Alert  */}
      {alert && (
        <div
          className={`alert ${
            alert.includes("Safe") || alert.includes("No significant") 
              ? "alert-safe" 
              : "alert-danger"
          }`}
        >
          {alert}
        </div>
      )}

      {/* AI Explanation */}
      {aiExplanation && (
        <div className="ai-explanation" style={{
          marginTop: "20px",
          padding: "15px",
          border: "1px solid #ddd",
          borderRadius: "8px",
          backgroundColor: "#f9f9f9"
        }}>
          <h4>AI Analysis</h4>
          <div dangerouslySetInnerHTML={{ __html: aiExplanation.replace(/\n/g, '<br>') }} />
        </div>
      )}

      {/* Detailed Interactions */}
      {interactions.length > 0 && (
        <div className="interactions-detail" style={{
          marginTop: "20px",
          padding: "15px",
          border: "1px solid #ddd",
          borderRadius: "8px"
        }}>
          <h4>Detailed Interactions ({interactions.length})</h4>
          {interactions.map((interaction, idx) => (
            <div key={idx} style={{
              padding: "10px",
              margin: "5px 0",
              border: "1px solid #eee",
              borderRadius: "4px",
              borderLeft: `4px solid ${drugInteractionService.getRiskColor(interaction.severity)}`
            }}>
              <strong>{interaction.drug1_name || interaction.drug1} + {interaction.drug2_name || interaction.drug2}</strong>
              <br />
              <span style={{ color: drugInteractionService.getRiskColor(interaction.severity) }}>
                Severity: {interaction.severity}
              </span>
              <br />
              {interaction.description}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
