import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  Dimensions,
} from "react-native";
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from "@expo/vector-icons";
import { BASE_URL } from "../../config";

const { width } = Dimensions.get('window');

// Custom Alert Component
const CustomAlert = ({ visible, onClose, title, message, icon, iconColor, buttonText = "Đã hiểu" }) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={alertStyles.overlay}>
        <View style={alertStyles.container}>
          <View style={alertStyles.header}>
            <View style={[alertStyles.iconContainer, { backgroundColor: iconColor + '20' }]}>
              <Ionicons name={icon} size={32} color={iconColor} />
            </View>
            <Text style={alertStyles.title}>{title}</Text>
          </View>
          
          <ScrollView style={alertStyles.messageContainer} showsVerticalScrollIndicator={false}>
            <Text style={alertStyles.message}>{message}</Text>
          </ScrollView>
          
          <TouchableOpacity style={[alertStyles.button, { backgroundColor: iconColor }]} onPress={onClose}>
            <Text style={alertStyles.buttonText}>{buttonText}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const alertStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: width * 0.85,
    maxHeight: '70%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  header: {
    alignItems: 'center',
    paddingTop: 24,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  messageContainer: {
    maxHeight: 200,
    paddingHorizontal: 20,
  },
  message: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    textAlign: 'center',
  },
  button: {
    marginHorizontal: 20,
    marginVertical: 20,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

// Helper function to validate and format dates
const validateDate = (dateStr) => {
  if (!dateStr || !dateStr.trim()) return "";
  
  // Remove any non-numeric characters except / and -
  const cleaned = dateStr.replace(/[^\d\/\-]/g, '');
  
  // Add slashes automatically for DD/MM/YYYY format
  if (cleaned.length === 8 && !cleaned.includes('/') && !cleaned.includes('-')) {
    return `${cleaned.substring(0,2)}/${cleaned.substring(2,4)}/${cleaned.substring(4,8)}`;
  }
  
  return cleaned;
};

// Individual Medication Card Component
const MedicationCard = ({ medication, onUpdate, onRemove }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedMed, setEditedMed] = useState(medication);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  // Sync editedMed với medication prop khi medication thay đổi
  useEffect(() => {
    setEditedMed(medication);
  }, [medication]);

  const handleSave = () => {
    onUpdate(editedMed);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedMed(medication);
    setIsEditing(false);
  };

  const formatDate = (date) => {
    if (!date) return "dd/mm/yyyy";
    if (date instanceof Date) {
      return date.toLocaleDateString("vi-VN");
    }
    return date;
  };

  const parseDate = (dateStr) => {
    if (!dateStr || !dateStr.trim()) {
      // Don't return default date - return current date for picker display only
      return new Date();
    }
    
    // Try to parse DD/MM/YYYY format
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1; // Month is 0-indexed
      const year = parseInt(parts[2]);
      return new Date(year, month, day);
    }
    
    // Fallback to default Date parsing
    return new Date(dateStr) || new Date();
  };

  const handleStartDateChange = (event, selectedDate) => {
    if (selectedDate && event.type !== 'dismissed') {
      const formattedDate = formatDate(selectedDate);
      setEditedMed(prev => ({ ...prev, start_date: formattedDate }));
    }
    // Đóng picker ngay sau khi chọn hoặc dismiss
    setShowStartDatePicker(false);
  };

  const handleEndDateChange = (event, selectedDate) => {
    if (selectedDate && event.type !== 'dismissed') {
      const formattedDate = formatDate(selectedDate);
      setEditedMed(prev => ({ ...prev, end_date: formattedDate }));
    }
    // Đóng picker ngay sau khi chọn hoặc dismiss
    setShowEndDatePicker(false);
  };

  if (isEditing) {
    return (
      <View style={styles.medicationCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Chỉnh sửa thuốc</Text>
          <View style={styles.cardActions}>
            <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
              <Ionicons name="checkmark" size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
              <Ionicons name="close" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Tên thuốc</Text>
          <TextInput
            style={styles.textInput}
            value={editedMed.medication_name || editedMed.name || ""}
            onChangeText={(text) => setEditedMed(prev => ({ ...prev, medication_name: text, name: text }))}
            placeholder="Nhập tên thuốc"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Liều dùng</Text>
          <TextInput
            style={styles.textInput}
            value={editedMed.dosage || ""}
            onChangeText={(text) => setEditedMed(prev => ({ ...prev, dosage: text }))}
            placeholder="VD: 500mg"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Tần suất</Text>
          <TextInput
            style={styles.textInput}
            value={editedMed.frequency || ""}
            onChangeText={(text) => setEditedMed(prev => ({ ...prev, frequency: text }))}
            placeholder="VD: 2 lần/ngày"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Thời gian dùng</Text>
          <TextInput
            style={styles.textInput}
            value={editedMed.duration || ""}
            onChangeText={(text) => setEditedMed(prev => ({ ...prev, duration: text }))}
            placeholder="VD: 7 ngày"
          />
        </View>

        <View style={styles.dateRow}>
          <View style={styles.dateInput}>
            <Text style={styles.inputLabel}>Ngày bắt đầu</Text>
            <TouchableOpacity 
              style={styles.dateButton}
              onPress={() => setShowStartDatePicker(true)}
            >
              <Text style={styles.dateButtonText}>
                {editedMed.start_date || "Chọn ngày"}
              </Text>
              <Ionicons name="calendar-outline" size={20} color="#007AFF" />
            </TouchableOpacity>
            {/* DateTimePicker cho ngày bắt đầu */}
            {showStartDatePicker && (
              <DateTimePicker
                value={editedMed.start_date ? parseDate(editedMed.start_date) : new Date()}
                mode="date"
                display="default"
                onChange={handleStartDateChange}
                textColor="#333333"
                accentColor="#007AFF"
              />
            )}
          </View>

          <View style={styles.dateInput}>
            <Text style={styles.inputLabel}>Ngày kết thúc</Text>
            <TouchableOpacity 
              style={styles.dateButton}
              onPress={() => setShowEndDatePicker(true)}
            >
              <Text style={styles.dateButtonText}>
                {editedMed.end_date || "Chọn ngày"}
              </Text>
              <Ionicons name="calendar-outline" size={20} color="#007AFF" />
            </TouchableOpacity>
            {/* DateTimePicker cho ngày kết thúc */}
            {showEndDatePicker && (
              <DateTimePicker
                value={editedMed.end_date ? parseDate(editedMed.end_date) : new Date()}
                mode="date"
                display="default"
                onChange={handleEndDateChange}
                textColor="#333333"
                accentColor="#007AFF"
              />
            )}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Ghi chú</Text>
          <TextInput
            style={styles.textInput}
            value={editedMed.instructions || editedMed.notes || ""}
            onChangeText={(text) => setEditedMed(prev => ({ 
              ...prev, 
              instructions: text, 
              notes: text 
            }))}
            placeholder="VD: Uống sau ăn"
            multiline
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.medicationCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{medication.medication_name || medication.name || "Tên thuốc không xác định"}</Text>
        <View style={styles.cardActions}>
          <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.editButton}>
            <Ionicons name="pencil" size={16} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onRemove(medication)} style={styles.removeButton}>
            <Ionicons name="trash-outline" size={16} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.medicationDetails}>
        {medication.dosage && (
          <View style={styles.detailRow}>
            <Ionicons name="medical-outline" size={16} color="#666" />
            <Text style={styles.detailText}>Liều: {medication.dosage}</Text>
          </View>
        )}
        
        {medication.frequency && (
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={16} color="#666" />
            <Text style={styles.detailText}>Tần suất: {medication.frequency}</Text>
          </View>
        )}

        {medication.duration && (
          <View style={styles.detailRow}>
            <Ionicons name="calendar-outline" size={16} color="#666" />
            <Text style={styles.detailText}>Thời gian: {medication.duration}</Text>
          </View>
        )}

        {(medication.start_date || medication.end_date) && (
          <View style={styles.detailRow}>
            <Ionicons name="today-outline" size={16} color="#666" />
            <Text style={styles.detailText}>
              {medication.start_date && medication.start_date}
              {medication.start_date && medication.end_date && " - "}
              {medication.end_date && medication.end_date}
            </Text>
          </View>
        )}

        {(medication.instructions || medication.notes) && (
          <View style={styles.detailRow}>
            <Ionicons name="information-circle-outline" size={16} color="#666" />
            <Text style={styles.detailText}>{medication.instructions || medication.notes}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

// Disease Name Editor Component
const DiseaseNameEditor = ({ diseaseName, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(diseaseName || "");

  const handleSave = () => {
    onUpdate(editedName);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedName(diseaseName || "");
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <View style={styles.diseaseEditor}>
        <Text style={styles.sectionTitle}>Chẩn đoán</Text>
        <View style={styles.diseaseEditRow}>
          <TextInput
            style={[styles.textInput, { flex: 1 }]}
            value={editedName}
            onChangeText={setEditedName}
            placeholder="Nhập chẩn đoán"
            autoFocus
          />
          <TouchableOpacity onPress={handleSave} style={styles.saveButton}>
            <Ionicons name="checkmark" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
            <Ionicons name="close" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.diseaseDisplay}>
      <Text style={styles.sectionTitle}>Chẩn đoán</Text>
      <TouchableOpacity 
        style={styles.diseaseNameContainer}
        onPress={() => setIsEditing(true)}
      >
        <Text style={styles.diseaseName}>
          {diseaseName || "Nhấn để thêm chẩn đoán"}
        </Text>
        <Ionicons name="pencil" size={16} color="#007AFF" />
      </TouchableOpacity>
    </View>
  );
};

// Main Enhanced Confirm Result Component
const ConfirmPrescriptionResult = ({ visible, onClose, medications, token }) => {
  const [currentMedications, setCurrentMedications] = useState([]);
  const [diseaseName, setDiseaseName] = useState("");
  const [currentStep, setCurrentStep] = useState("edit"); // "edit" | "summary" | "success"
  const [interactionData, setInteractionData] = useState(null);
  const [loadingCheck, setLoadingCheck] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Custom alert state
  const [alertConfig, setAlertConfig] = useState({
    visible: false,
    title: "",
    message: "",
    icon: "",
    iconColor: "",
  });

  // Helper function to show custom alerts
  const showCustomAlert = (title, message, icon, iconColor) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      icon,
      iconColor,
    });
  };

  const hideCustomAlert = () => {
    setAlertConfig(prev => ({ ...prev, visible: false }));
    // Only close the modal if save was successful
    if (saveSuccess) {
      onClose && onClose();
    }
  };

  // Memoized medications for interaction checking
  const medsToUse = useMemo(() => {
    const validMeds = currentMedications.filter(med => 
      (med.medication_name || med.name || "").trim()
    );
    return validMeds.map(med => ({
      medication_name: med.medication_name || med.name,
      dosage: med.dosage || null,
      frequency: med.frequency || null,
      duration: med.duration || null,
      start_date: med.start_date || null,
      end_date: med.end_date || null,
      notes: med.instructions || null,
    }));
  }, [currentMedications]);

  // Fetch interaction data when entering summary step
  useEffect(() => {
    if (currentStep === "summary" && medsToUse.length > 0) {
      // Small delay để đảm bảo UI đã render
      const timeoutId = setTimeout(() => {
        fetchInteractionData();
      }, 100);
      return () => clearTimeout(timeoutId);
    }
    // Clear interaction data khi về edit để force refresh
    if (currentStep === "edit") {
      setInteractionData(null);
      setLoadingCheck(false);
    }
  }, [currentStep, medsToUse]);

  // Force refresh interaction data khi medications thay đổi và đang ở summary
  useEffect(() => {
    if (currentStep === "summary" && medsToUse.length > 0) {
      // Debounce để tránh call API quá nhiều
      const timeoutId = setTimeout(() => {
        fetchInteractionData();
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [currentMedications, currentStep]); // Add currentStep dependency

  // Additional effect to force re-render when stepping back to summary
  useEffect(() => {
    if (currentStep === "summary") {
      // Force component re-render by clearing and refetching data
      setInteractionData(null);
      setLoadingCheck(false);
    }
  }, [currentStep]);

  const fetchInteractionData = async () => {
    if (!medsToUse.length) {
      setInteractionData(null);
      return;
    }
    try {
      setLoadingCheck(true);

      // Extract only medication names for the API call
      const medicationNames = medsToUse.map(med => med.medication_name).filter(Boolean);
      
      if (medicationNames.length === 0) {
        setInteractionData({
          summary: "Không có thuốc hợp lệ để kiểm tra tương tác.",
          interactions: [],
        });
        setLoadingCheck(false);
        return;
      }

      const res = await fetch(`${BASE_URL}/api/interactions/check`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          medications: medicationNames,  // Send array of strings, not objects
          include_user_history: true,
        }),
      });

      const data = await res.json();
      
      // Check if API returned an error
      if (!res.ok) {
        console.error("API Error:", data);
        setInteractionData({
          summary: "Không thể kiểm tra tương tác thuốc do lỗi hệ thống.",
          interactions: [],
        });
        return;
      }

      // Sanitize the summary to avoid displaying technical errors
      let cleanSummary = data?.summary || "Không có thông tin tương tác.";
      
      // Filter out technical error messages that shouldn't be shown to users
      const errorPatterns = [
        /error/i,
        /exception/i,
        /failed/i,
        /không thể tạo tóm tắt do lỗi/i,
        /AI explanation generation failed/i,
        /Traceback/i,
        /File.*line/i
      ];
      
      const hasError = errorPatterns.some(pattern => pattern.test(cleanSummary));
      
      // Also check if summary is too short (likely truncated error)
      const isInvalidSummary = hasError || cleanSummary.trim().split(' ').length < 5;
      
      if (isInvalidSummary) {
        cleanSummary = "Hệ thống đang xử lý thông tin. Vui lòng kiểm tra danh sách tương tác bên dưới.";
      }

      setInteractionData({
        summary: cleanSummary,
        interactions: Array.isArray(data?.interactions) ? data.interactions : [],
      });
    } catch (error) {
      console.error("❌ Error fetching interaction data:", error);
      setInteractionData({
        summary: "Không thể kiểm tra tương tác thuốc.",
        interactions: [],
      });
    } finally {
      setLoadingCheck(false);
    }
  };

  // Initialize medications when modal opens
  React.useEffect(() => {
    if (visible && medications) {
      // Reset state when modal opens
      setCurrentStep("edit");
      setInteractionData(null);
      setLoadingCheck(false);
      setSaveSuccess(false);
      setAlertConfig({
        visible: false,
        title: "",
        message: "",
        icon: "",
        iconColor: "",
      });
      
      const normalizedMeds = Array.isArray(medications) ? medications : [];
      const medObjects = normalizedMeds.map((med, index) => {
        if (typeof med === "string") {
          return { 
            id: index, 
            medication_name: med.trim(), 
            name: med.trim() 
          };
        }
        return {
          id: index,
          medication_name: med?.name || med?.medication_name || "",
          name: med?.name || med?.medication_name || "",
          dosage: med?.dosage || null,
          frequency: med?.frequency || null,
          duration: med?.duration || null,
          start_date: med?.start_date || null,
          end_date: med?.end_date || null,
          instructions: med?.instructions || med?.notes || null,
        };
      });
      setCurrentMedications(medObjects);
      
      // Try to extract disease name from various sources
      let extractedDiseaseName = "";
      
      // Check if it's from OCR analysis with disease_name field
      if (medications.length > 0) {
        const firstMed = medications[0];
        if (firstMed?.disease_name) {
          extractedDiseaseName = firstMed.disease_name;
        } else if (firstMed?.analysis?.disease_name) {
          extractedDiseaseName = firstMed.analysis.disease_name;
        }
      }
      
      // Check if medications object has analysis with disease name
      if (medications.analysis?.disease_name) {
        extractedDiseaseName = medications.analysis.disease_name;
      }
      
      // Set the disease name if found
      if (extractedDiseaseName && extractedDiseaseName.trim()) {
        setDiseaseName(extractedDiseaseName.trim());
      } else {
        setDiseaseName("");
      }
    }
  }, [visible, medications]);

  const handleMedicationUpdate = (updatedMed) => {
    setCurrentMedications(prev => 
      prev.map(med => med.id === updatedMed.id ? updatedMed : med)
    );
  };

  const handleMedicationRemove = (medToRemove) => {
    Alert.alert(
      "Xóa thuốc", 
      `Bạn có chắc muốn xóa thuốc "${medToRemove.medication_name || medToRemove.name}"?`,
      [
        { text: "Hủy", style: "cancel" },
        { 
          text: "Xóa", 
          style: "destructive",
          onPress: () => {
            setCurrentMedications(prev => 
              prev.filter(med => med.id !== medToRemove.id)
            );
          }
        }
      ]
    );
  };

  const handleAddMedication = () => {
    const newMed = {
      id: Date.now(),
      medication_name: "",
      name: "",
      dosage: null,
      frequency: null,
      duration: null,
      start_date: null,
      end_date: null,
      instructions: null,
    };
    setCurrentMedications(prev => [...prev, newMed]);
  };

  const handleDone = () => {
    // Validate that we have at least one medication
    const validMeds = currentMedications.filter(med => 
      (med.medication_name || med.name || "").trim()
    );
    
    if (validMeds.length === 0) {
      Alert.alert("Lỗi", "Vui lòng thêm ít nhất một loại thuốc");
      return;
    }
    
    // Clear interaction data để force refresh
    setInteractionData(null);
    setLoadingCheck(false);
    
    // Force update currentMedications to trigger re-render
    setCurrentMedications(prev => [...prev]);
    
    setCurrentStep("summary");
  };

  const handleBackToEdit = () => {
    // Clear interaction data when going back to edit
    setInteractionData(null);
    setLoadingCheck(false);
    setCurrentStep("edit");
  };

  const handleConfirmSave = async () => {
    try {
      const validMeds = currentMedications.filter(med => 
        (med.medication_name || med.name || "").trim()
      );

      const response = await fetch(`${BASE_URL}/api/prescriptions/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          medications: validMeds,
          disease_name: diseaseName 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const msg = data?.detail || data?.message || "Lưu thất bại. Vui lòng thử lại.";
        Alert.alert("Lưu thất bại", msg);
        return;
      }

      // Mark as successful save
      setSaveSuccess(true);

      // Navigate to success screen instead of showing alert
      setCurrentStep("success");
    } catch (err) {
      console.error("❌ Save error:", err);
      Alert.alert("Lỗi lưu", "Không thể kết nối tới server.");
    }
  };

  const renderEditStep = () => (
    <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
      <DiseaseNameEditor 
        diseaseName={diseaseName}
        onUpdate={setDiseaseName}
      />

      <View style={styles.medicationsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Danh sách thuốc</Text>
          <TouchableOpacity onPress={handleAddMedication} style={styles.addButton}>
            <Ionicons name="add-circle" size={24} color="#007AFF" />
            <Text style={styles.addButtonText}>Thêm thuốc</Text>
          </TouchableOpacity>
        </View>

        {currentMedications.map((medication) => (
          <MedicationCard
            key={medication.id}
            medication={medication}
            onUpdate={handleMedicationUpdate}
            onRemove={handleMedicationRemove}
          />
        ))}
      </View>
    </ScrollView>
  );

  const renderSummaryStep = () => {
    // Create a more comprehensive hash for forcing re-renders
    const dataHash = JSON.stringify({
      meds: currentMedications.map(m => ({
        id: m.id,
        name: m.medication_name || m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        duration: m.duration,
        start_date: m.start_date,
        end_date: m.end_date,
        instructions: m.instructions
      })),
      disease: diseaseName,
      step: currentStep,
      timestamp: Date.now()
    });
    
    return (
      <ScrollView 
        key={`summary-${currentMedications.length}-${dataHash.slice(0, 20)}`}
        style={styles.scroll} 
        showsVerticalScrollIndicator={false}
      >
      <Text style={styles.summaryTitle}>Xác nhận thông tin đơn thuốc</Text>
      
      {diseaseName && (
        <View style={styles.summarySection}>
          <Text style={styles.summaryLabel}>Chẩn đoán:</Text>
          <Text style={styles.summaryValue}>{diseaseName}</Text>
        </View>
      )}

      <View style={styles.summarySection}>
        <Text style={styles.summaryLabel}>Danh sách thuốc ({currentMedications.length} loại):</Text>
        {currentMedications.map((med, index) => (
          <View key={`${med.id}-${med.medication_name}-${index}`} style={styles.summaryMedCard}>
            <Text style={styles.summaryMedName}>
              {index + 1}. {med.medication_name || med.name}
            </Text>
            {med.dosage && <Text style={styles.summaryMedDetail}>Liều: {med.dosage}</Text>}
            {med.frequency && <Text style={styles.summaryMedDetail}>Tần suất: {med.frequency}</Text>}
            {med.duration && <Text style={styles.summaryMedDetail}>Thời gian: {med.duration}</Text>}
            {(med.start_date || med.end_date) && (
              <Text style={styles.summaryMedDetail}>
                Từ {med.start_date || "N/A"} 
                {" đến "} 
                {med.end_date || "N/A"}
              </Text>
            )}
          </View>
        ))}
      </View>

      {/* Drug Interaction Section */}
      <View style={styles.summarySection}>
        <Text style={styles.summaryLabel}>⚕️ Kiểm tra tương tác thuốc:</Text>
        {loadingCheck ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Đang kiểm tra tương tác thuốc...</Text>
          </View>
        ) : interactionData ? (
          <>
            {/* Interactions List */}
            {interactionData.interactions && interactionData.interactions.length > 0 ? (
              <>
                {/* Summary - only show when there are interactions */}
                {interactionData.summary && (
                  <Text style={styles.interactionSummary}>{interactionData.summary}</Text>
                )}
                
                {/* List of interactions */}
                {interactionData.interactions.map((item, index) => {
                  const severityColor = 
                    item.severity?.toLowerCase() === 'major' ? '#FF3B30' :
                    item.severity?.toLowerCase() === 'moderate' ? '#FF9500' :
                    item.severity?.toLowerCase() === 'minor' ? '#007AFF' : '#8E8E93';
                  
                  return (
                    <View key={index} style={styles.interactionCard}>
                      <View style={[styles.severityBadge, { backgroundColor: severityColor }]}>
                        <Text style={styles.severityText}>
                          {item.severity?.toUpperCase() || "UNKNOWN"}
                        </Text>
                      </View>
                      <Text style={styles.drugPair}>
                        {item.drug1_name || "?"} ↔ {item.drug2_name || "?"}
                      </Text>
                      <Text style={styles.interactionDescription}>
                        {item.description || "Không có mô tả"}
                      </Text>
                    </View>
                  );
                })}
              </>
            ) : (
              <Text style={styles.noInteractionText}>
                Không phát hiện tương tác thuốc nguy hiểm
              </Text>
            )}
          </>
        ) : (
          <Text style={styles.noInteractionText}>
            Sẽ kiểm tra tương tác thuốc khi bạn chuyển sang bước này
          </Text>
        )}
      </View>
    </ScrollView>
    );
  };

  const renderSuccessStep = () => (
    <View style={styles.successContainer}>
      <View style={styles.successContent}>
        <View style={[styles.successIcon, { backgroundColor: '#34C759' + '20' }]}>
          <Ionicons name="checkmark-circle" size={64} color="#34C759" />
        </View>
        
        <Text style={styles.successTitle}>Lưu thành công!</Text>
        <Text style={styles.successMessage}>
          Đơn thuốc đã được lưu vào hệ thống.{'\n'}
          Bạn có thể xem lại trong mục Medical History.
        </Text>

        {/* Show interaction warning if exists */}
        {interactionData?.interactions?.length > 0 && (
          <View style={styles.warningBox}>
            <Ionicons name="warning" size={24} color="#FF9500" />
            <Text style={styles.warningText}>
              {interactionData.interactions.some(i => i.severity?.toLowerCase() === 'major')
                ? "Phát hiện tương tác thuốc nghiêm trọng. Vui lòng tham khảo ý kiến bác sĩ."
                : "Phát hiện tương tác thuốc. Vui lòng thận trọng khi sử dụng."
              }
            </Text>
          </View>
        )}

        <TouchableOpacity 
          style={styles.successButton} 
          onPress={() => onClose && onClose()}
        >
          <Text style={styles.successButtonText}>Hoàn tất</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent={false}>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.headerButton}>
              <Ionicons name="close" size={24} color="#007AFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {currentStep === "edit" ? "Chỉnh sửa đơn thuốc" : 
               currentStep === "summary" ? "Xác nhận đơn thuốc" : "Hoàn tất"}
            </Text>
            <View style={styles.headerButton} />
          </View>

          {currentStep === "edit" ? renderEditStep() : 
           currentStep === "summary" ? renderSummaryStep() : 
           renderSuccessStep()}

          <View style={styles.bottomButtons}>
            {currentStep === "edit" ? (
              <>
                <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
                  <Text style={styles.cancelText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleDone} style={styles.doneBtn}>
                  <Text style={styles.doneText}>Hoàn tất</Text>
                </TouchableOpacity>
              </>
            ) : currentStep === "summary" ? (
              <>
                <TouchableOpacity 
                  onPress={handleBackToEdit} 
                  style={styles.backBtn}
                >
                  <Text style={styles.backText}>Quay lại</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleConfirmSave} style={styles.confirmBtn}>
                  <Text style={styles.confirmText}>Xác nhận</Text>
                </TouchableOpacity>
              </>
            ) : null /* Success step has its own button */}
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 50,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 16,
  },
  diseaseEditor: {
    backgroundColor: "#fff",
    padding: 16,
    marginVertical: 8,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  diseaseDisplay: {
    backgroundColor: "#fff",
    padding: 16,
    marginVertical: 8,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  diseaseEditRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  diseaseNameContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    marginTop: 8,
  },
  diseaseName: {
    fontSize: 16,
    color: "#333",
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  medicationsSection: {
    marginVertical: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  addButtonText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "500",
  },
  medicationCard: {
    backgroundColor: "#fff",
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    flex: 1,
  },
  cardActions: {
    flexDirection: "row",
    gap: 8,
  },
  editButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#e3f2fd",
  },
  removeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#ffebee",
  },
  saveButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#4CAF50",
  },
  cancelButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#f44336",
  },
  medicationDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: "#666",
    flex: 1,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    marginBottom: 4,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  dateRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  dateInput: {
    flex: 1,
  },
  dateButton: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateButtonText: {
    fontSize: 16,
    color: "#333",
    flex: 1,
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    marginVertical: 16,
  },
  summarySection: {
    backgroundColor: "#fff",
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  summaryLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 16,
    color: "#666",
  },
  summaryMedCard: {
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  summaryMedName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  summaryMedDetail: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  bottomButtons: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
  },
  cancelText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
  },
  doneBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: "#007AFF",
    alignItems: "center",
  },
  doneText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  backBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
  },
  backText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "600",
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: "#34C759",
    alignItems: "center",
  },
  confirmText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  // Drug Interaction Styles
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: "#666",
  },
  interactionSummary: {
    fontSize: 14,
    color: "#333",
    marginBottom: 12,
    padding: 12,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#007AFF",
  },
  interactionCard: {
    backgroundColor: "#fff",
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  severityBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 6,
  },
  severityText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
  },
  drugPair: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  interactionDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  noInteractionText: {
    fontSize: 14,
    color: "#34C759",
    textAlign: "center",
    padding: 16,
    backgroundColor: "#f0f9f0",
    borderRadius: 8,
    fontWeight: "500",
  },
  // Success Step Styles
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  successContent: {
    alignItems: 'center',
    width: '100%',
  },
  successIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 24,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9E6',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
    marginBottom: 24,
    width: '100%',
  },
  warningText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#8B5A00',
    lineHeight: 20,
  },
  successButton: {
    backgroundColor: '#34C759',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  successButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default ConfirmPrescriptionResult;