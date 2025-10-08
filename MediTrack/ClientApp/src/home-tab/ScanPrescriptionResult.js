import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

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

const ScanPrescriptionResult = ({
  visible,
  onConfirm,
  onClose,
  medications = [],
}) => {
  const [editableMeds, setEditableMeds] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [diseaseName, setDiseaseName] = useState("");

  useEffect(() => {
    if (visible) {
      setEditMode(false);
      const normalizedMeds = medications.map((m, index) => ({
        id: index,
        name: m.name || "",
        dosage: m.dosage || "",
        frequency: m.frequency || "",
        duration: m.duration || "",
        start_date: m.start_date || "",
        end_date: m.end_date || "",
        instructions: m.instructions || "",
      }));
      setEditableMeds(normalizedMeds);
      
      // Extract disease name if available
      if (medications.length > 0 && medications[0].disease_name) {
        setDiseaseName(medications[0].disease_name);
      }
    }
  }, [visible, medications]);

  const addEmptyMedicine = () => {
    const newMed = {
      id: Date.now(),
      name: "",
      dosage: "",
      frequency: "",
      duration: "",
      start_date: "",
      end_date: "",
      instructions: "",
    };
    setEditableMeds((prev) => [...prev, newMed]);
  };

  const updateMedication = (id, field, value) => {
    setEditableMeds((prev) =>
      prev.map((med) => (med.id === id ? { ...med, [field]: value } : med))
    );
  };

  const removeMedication = (id) => {
    Alert.alert(
      "Xóa thuốc",
      "Bạn có chắc muốn xóa thuốc này?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: () => {
            setEditableMeds((prev) => prev.filter((med) => med.id !== id));
          },
        },
      ]
    );
  };

  const handleConfirm = () => {
    const validMeds = editableMeds.filter((med) => med.name.trim());
    if (validMeds.length === 0) {
      Alert.alert("Lỗi", "Vui lòng thêm ít nhất một loại thuốc");
      return;
    }

    const formattedMeds = validMeds.map((m) => ({
      medication_name: m.name,
      name: m.name,
      dosage: m.dosage || null,
      frequency: m.frequency || null,
      duration: m.duration || null,
      start_date: m.start_date || null,
      end_date: m.end_date || null,
      instructions: m.instructions || null,
      disease_name: diseaseName || null,
    }));

    onConfirm(formattedMeds);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Ionicons name="close" size={24} color="#007AFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Kết quả scan đơn thuốc</Text>
          <View style={styles.headerButton} />
        </View>

        {/* Success Icon */}
        <View style={styles.successContainer}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={80} color="#34C759" />
          </View>
          <Text style={styles.successTitle}>Scan thành công!</Text>
          <Text style={styles.successSubtitle}>
            Chúng tôi đã phát hiện {editableMeds.length} loại thuốc
          </Text>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Disease Name Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Chẩn đoán</Text>
            <View style={styles.diseaseContainer}>
              <TextInput
                style={styles.diseaseInput}
                value={diseaseName}
                onChangeText={setDiseaseName}
                placeholder="Nhấn để thêm chẩn đoán"
                placeholderTextColor="#999"
              />
            </View>
          </View>

          {/* Medications Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Danh sách thuốc</Text>
              <TouchableOpacity onPress={addEmptyMedicine} style={styles.addButton}>
                <Ionicons name="add-circle" size={24} color="#007AFF" />
                <Text style={styles.addButtonText}>Thêm</Text>
              </TouchableOpacity>
            </View>

            {editableMeds.map((med, index) => (
              <View key={med.id} style={styles.medicationCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.medicationNumber}>
                    <Text style={styles.numberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.cardTitle}>
                    {med.name || "Thuốc mới"}
                  </Text>
                  <TouchableOpacity
                    onPress={() => removeMedication(med.id)}
                    style={styles.removeButton}
                  >
                    <Ionicons name="trash-outline" size={16} color="#FF3B30" />
                  </TouchableOpacity>
                </View>

                <View style={styles.cardContent}>
                  {/* Medication Name */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Tên thuốc</Text>
                    <TextInput
                      style={styles.textInput}
                      value={med.name}
                      onChangeText={(text) => updateMedication(med.id, "name", text)}
                      placeholder="Nhập tên thuốc"
                      placeholderTextColor="#999"
                    />
                  </View>

                  {/* Row 1: Dosage & Frequency */}
                  <View style={styles.inputRow}>
                    <View style={styles.inputHalf}>
                      <Text style={styles.inputLabel}>Liều dùng</Text>
                      <TextInput
                        style={styles.textInput}
                        value={med.dosage}
                        onChangeText={(text) => updateMedication(med.id, "dosage", text)}
                        placeholder="VD: 500mg"
                        placeholderTextColor="#999"
                      />
                    </View>
                    <View style={styles.inputHalf}>
                      <Text style={styles.inputLabel}>Tần suất</Text>
                      <TextInput
                        style={styles.textInput}
                        value={med.frequency}
                        onChangeText={(text) => updateMedication(med.id, "frequency", text)}
                        placeholder="VD: 2 lần/ngày"
                        placeholderTextColor="#999"
                      />
                    </View>
                  </View>

                  {/* Row 2: Duration & Instructions */}
                  <View style={styles.inputRow}>
                    <View style={styles.inputHalf}>
                      <Text style={styles.inputLabel}>Thời gian</Text>
                      <TextInput
                        style={styles.textInput}
                        value={med.duration}
                        onChangeText={(text) => updateMedication(med.id, "duration", text)}
                        placeholder="VD: 7 ngày"
                        placeholderTextColor="#999"
                      />
                    </View>
                    <View style={styles.inputHalf}>
                      <Text style={styles.inputLabel}>Ghi chú</Text>
                      <TextInput
                        style={styles.textInput}
                        value={med.instructions}
                        onChangeText={(text) => updateMedication(med.id, "instructions", text)}
                        placeholder="VD: Sau ăn"
                        placeholderTextColor="#999"
                      />
                    </View>
                  </View>

                  {/* Row 3: Start & End Date */}
                  <View style={styles.inputRow}>
                    <View style={styles.inputHalf}>
                      <Text style={styles.inputLabel}>Ngày bắt đầu</Text>
                      <TextInput
                        style={styles.textInput}
                        value={med.start_date}
                        onChangeText={(text) => updateMedication(med.id, "start_date", validateDate(text))}
                        placeholder="DD/MM/YYYY"
                        placeholderTextColor="#999"
                        maxLength={10}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={styles.inputHalf}>
                      <Text style={styles.inputLabel}>Ngày kết thúc</Text>
                      <TextInput
                        style={styles.textInput}
                        value={med.end_date}
                        onChangeText={(text) => updateMedication(med.id, "end_date", validateDate(text))}
                        placeholder="DD/MM/YYYY"
                        placeholderTextColor="#999"
                        maxLength={10}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Bottom Actions */}
        <View style={styles.bottomActions}>
          <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Hủy</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleConfirm} style={styles.confirmButton}>
            <Text style={styles.confirmText}>Xác nhận</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
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
  successContainer: {
    alignItems: "center",
    paddingVertical: 24,
    backgroundColor: "#fff",
    marginBottom: 8,
  },
  successIcon: {
    marginBottom: 12,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  successSubtitle: {
    fontSize: 14,
    color: "#666",
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
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
  diseaseContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  diseaseInput: {
    fontSize: 16,
    color: "#333",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  medicationCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  medicationNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#007AFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  numberText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  removeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "#ffebee",
  },
  cardContent: {
    gap: 12,
  },
  inputGroup: {
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 8,
  },
  inputHalf: {
    flex: 1,
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
    color: "#333",
  },
  bottomActions: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  cancelButton: {
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
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: "#007AFF",
    alignItems: "center",
  },
  confirmText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default ScanPrescriptionResult;
