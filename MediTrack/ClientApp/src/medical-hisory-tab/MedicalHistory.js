import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from "react-native";
import { LayoutAnimation, Platform, UIManager } from 'react-native';
import globalStyles from "../GlobalStyles";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { BASE_URL } from "../../config";
import SearchBar from "../components/SearchBar";
import Icon from "react-native-vector-icons/Ionicons";
import { CircleButton } from "../components/Button";
import QRCodeScreen from "./GenerateQR";
import { Buffer } from "buffer";
import utils from './prescriptionUtils';
const { width, height } = Dimensions.get("window");

const _QrButton = ({ onPress, disabled = false }) => {
  return (
    <TouchableOpacity
      style={[styles.QrButton, disabled && styles.QrButtonDisabled]}
      onPress={disabled ? null : onPress}
      activeOpacity={disabled ? 1 : 0.7}
    >
      <Icon
        name="qr-code-outline"
        size={50}
        color="#fff"
        style={styles.QrIcon}
      />
      <View style={styles.QrTextContainer}>
        <Text style={styles.QrTitle}>{disabled ? "Generate QR (disabled)" : "Generate QR Code"}</Text>
        <Text style={styles.QrSubtitle}>Include Side Effect log</Text>
      </View>
    </TouchableOpacity>
  );
};

const _sortButton = ({ currentSort, onSelect }) => {
  const [showOptions, setShowOptions] = useState(false);

  const options = [
    { label: "Importance", value: "importance" },
    { label: "Start Date", value: "date" },
  ];

  const toggleOptions = () => {
    setShowOptions(!showOptions);
  };

  const selectOption = (value) => {
    onSelect(value);
    setShowOptions(false);
  };

  return (
    <View style={styles.sortWrapper}>
      <TouchableOpacity style={styles.sortButton} onPress={toggleOptions}>
        <Text style={styles.sortButtonText}>Sort by: {currentSort}</Text>
      </TouchableOpacity>

      {showOptions && (
        <View style={styles.optionsContainer}>
          {options.map(({ label, value }) => (
            <TouchableOpacity
              key={value}
              style={styles.option}
              onPress={() => selectOption(value)}
            >
              <Text style={styles.optionText}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const _importanceTag = ({ level }) => {
  const colors = {
    high: "#EF4444", // Red
    medium: "#F59E0B", // Orange
    low: "#3B82F6", // Blue
  };

  return (
    <View style={[styles.tag, { backgroundColor: colors[level] || "#ccc" }]}>
      <Text style={styles.tagText}>{level.toUpperCase()}</Text>
    </View>
  );
};

const _medicalRecordCard = ({
  disease,
  medications,
  startDate,
  endDate,
  importance,
}) => {
  return (
    <View style={styles.medicalRecord}>
      {/* Card Header  */}
      <View style={styles.cardHeader}>
        <Text style={globalStyles.headingThree}>{disease}</Text>
        <_importanceTag level={importance} />
      </View>

      {/* Medications  */}
      <View style={styles.row}>
        <Text style={styles.cardLabel}>Medications:</Text>
        <Text style={styles.cardValue}>{medications}</Text>
      </View>
                        <Text style={styles.cardLabel}>Period:</Text>
                        <Text style={styles.cardValue}>{utils.formatDate(med.start_date)} - {utils.formatDate(med.end_date)}</Text>
      <View style={styles.row}>
        <Text style={styles.cardLabel}>Treatment Period:</Text>
        <Text style={styles.cardValue}>
          {startDate} - {endDate}
        </Text>
      </View>

      {/* Separator  */}
      <View style={styles.line} />
    </View>
  );
};

const MedicalHistory = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { token } = route.params || {};

  const [qrVisible, setQRVisible] = useState(false);
  const [qrData, setQRData] = useState("");
  const [medicalRecords, setRecord] = useState([]); // now holds grouped prescriptions
  const [expandedIds, setExpandedIds] = useState({}); // track expanded prescription ids
  const [reminders, setReminders] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editedValue, setEditedValue] = useState("");
  const [dirty, setDirty] = useState(false); // whether changes happened
  
  const [sortMode, setSortMode] = useState("importance");
  const _sortRecords = (mode) => {
    let sortedRecords = [...medicalRecords];
    if (mode === "importance") {
      const order = { high: 1, medium: 2, low: 3 };
      sortedRecords.sort((a, b) => order[a.importance] - order[b.importance]);
    } else if (mode === "date") {
      sortedRecords.sort(
        (a, b) => new Date(a.startDate) - new Date(b.startDate)
      );
    }
    setRecord(sortedRecords);
    setSortMode(mode);
  };
  const _handleGenerateQR = () => {
    // const payload = JSON.stringify({
    //   userId: 123,
    //   summary: medicalRecords.map(
    //     ({ disease, importance, medications, startDate, endDate }) => ({
    //       disease,
    //       importance,
    //       medications,
    //       startDate,
    //       endDate,
    //     })
    //   ),
    // });
    const payload = JSON.stringify({
      name: "Tran Minh Quoc",
      age: 20,
      status: "Stable",
      record: {
        birthDate: "2000-01-15",
        gender: "Male",
        address: "123 Ly Thuong Kiet, Ha Noi",
        phone: "(028) 1234 5678",
        maritalStatus: "Single",
        email: "minhquoc@meditrackcom",
        employment: "Student",
        insurance: {
          provider: "Bao Viet",
          plan: "Standard",
          id: "BV001",
        },
        emergencyContact: {
          name: "Tran Minh Tam",
          phone: "0987-654-321",
          relation: "Father",
        },
        medicalHistory: [
          {
            condition: "Roi loan giac ngu man tinh",
            medication: "Temazepam, Sildenafil, Bumetanide",
            allergy: "None",
            startDate: "2025-07-25",
          },
          {
            condition: "Viem da day",
            medication: "Omeprazole, Hyoscine butylbromide, Sucralfate",
            allergy: "None",
            startDate: "2025-07-25",
          },
          {
            condition: "Viem hong cap",
            medication: "Acemuc, Propanolol, Augmentin",
            allergy: "None",
            startDate: "2025-01-18",
          },
        ],
      },
    });
    // const base64 = Buffer.from(payload).toString("base64"); // ✅ Base64 unicode
    const base64 = btoa(payload); // ✅ Base64 ASCII
    setQRData(base64);
    setQRVisible(true);
  };

  // enable LayoutAnimation on Android
  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  // Fetch prescriptions from backend and group by disease_name
  const fetchPrescriptions = async () => {
    try {
      if (!token) return;
      console.log("🔑 MedicalHistory token:", token);
      const res = await fetch(`${BASE_URL}/api/prescriptions/list`, {
        method: "GET",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      console.log("📥 Response from /prescriptions/list:", data);
      const prescriptions = Array.isArray(data?.prescriptions) ? data.prescriptions : [];
      const records = utils.mapPrescriptionsToRecords(prescriptions);
      setRecord(records);
    } catch (e) {
      console.error("❌ fetchPrescriptions error:", e);
    }
  };

  // Fetch upcoming reminders
  const fetchReminders = async () => {
    try {
      if (!token) return;
      const res = await fetch(`${BASE_URL}/api/reminders/upcoming`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setReminders(Array.isArray(data?.reminders) ? data.reminders : []);
    } catch (e) {
      console.error("❌ fetchReminders error:", e);
    }
  };

  useEffect(() => {
    fetchReminders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Re-fetch prescriptions when screen becomes focused so saved items show immediately
  useFocusEffect(
    useCallback(() => {
      fetchPrescriptions();
      // no cleanup
      return () => {};
    }, [token])
  );

  // Edit / Delete / Save handlers
  const handleEdit = (id, current) => {
    setEditingId(id);
    setEditedValue(current);
  };

  const handleDelete = (id) => {
    // mark dirty and remove locally
    setRecord((prev) => prev.map((group) => ({
      ...group,
      medications: group.medications.filter((m) => m.id !== id)
    })));
    setDirty(true);
  };

  const handleSaveToServer = async () => {
    try {
      if (!token) {
        alert("Not authenticated");
        return;
      }
      // First, for groups that came from OCR uploads, update their extracted_medicines via OCR review API
      for (const group of medicalRecords) {
        if (!group.upload_id) continue;
        const medicinesPayload = (group.medications || []).map((m) => ({
          extracted_name: m.name || m.display_name || "",
          dosage: m.dosage || null,
          frequency: m.frequency || null,
          duration: m.duration || null,
          confidence_score: m.confidence_score || 0.8,
        }));

        try {
          const reviewRes = await fetch(`${BASE_URL}/api/ocr/uploads/${group.upload_id}/review`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ ocr_upload_id: group.upload_id, medicines: medicinesPayload, verified: false }),
          });
          if (!reviewRes.ok) {
            console.warn("Review update failed for upload", group.upload_id, await reviewRes.text());
          }
        } catch (e) {
          console.error("Error updating review for upload", group.upload_id, e);
        }
      }

      // Save per-upload groups (create/update prescriptions rows) and attach medication rows to them
      for (const group of medicalRecords) {
        const medsPayload = (group.medications || []).map((m) => ({
          medication_name: m.name || m.display_name || "",
          dosage: m.dosage || null,
          frequency: m.frequency || null,
          duration: m.duration || null,
          start_date: m.start_date || group.prescription_date || null,
          end_date: m.end_date || null,
          notes: m.notes || null,
        })).filter(x => x.medication_name && x.medication_name.trim());

        // If the group came from an OCR upload, include prescription metadata so backend links the prescription
        const payload = {
          medications: medsPayload,
          prescription: group.upload_id ? { ocr_upload_id: group.upload_id, disease_name: group.disease_name, prescription_date: group.prescription_date } : undefined,
        };

        try {
          const res = await fetch(`${BASE_URL}/api/prescriptions/save`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify(payload),
          });
          const data = await res.json();
          if (!res.ok) {
            console.warn("Save failed for group", group.upload_id, data);
          }
        } catch (e) {
          console.error("Error saving group to server", group.upload_id, e);
        }
      }

      // Final fetch to refresh UI
      alert("Saved to server");
      setDirty(false);
      fetchPrescriptions();
    } catch (e) {
      console.error("❌ save error:", e);
      alert("Save error");
    }
  };

  const applyEdit = () => {
    if (!editingId) return;
    setRecord((prev) =>
      prev.map((group) => ({
        ...group,
        medications: group.medications.map((m) => (m.id === editingId ? { ...m, name: editedValue, display_name: editedValue } : m))
      }))
    );
    setEditingId(null);
    setEditedValue("");
    setDirty(true);
  };

  const toggleExpand = (prescriptionId) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedIds((prev) => ({ ...prev, [prescriptionId]: !prev[prescriptionId] }));
  };
  return (
    <ScrollView style={styles.container}>
      {/* Avatar  */}
      <CircleButton
        style={styles.avatar}
        onPress={() => {
          navigation.navigate("Profile");
        }}
      ></CircleButton>

      {/* Header  */}
      <Text style={styles.header}>Medical History</Text>

      {/* Search Bar  */}
      <SearchBar style={styles.searchBar}></SearchBar>

      {/* QR Generate  */}
  <_QrButton onPress={_handleGenerateQR} disabled={!(medicalRecords && medicalRecords.length > 0)} />

      {/* Sorting - Temporarily hidden */}
      {/* <_sortButton currentSort={sortMode} onSelect={_sortRecords} /> */}

      {/* QR Generate button already above. Save button will be rendered at end when changes exist */}

      {/* Upcoming reminders */}
      {reminders.length > 0 && (
        <View style={{ marginTop: 20, marginLeft: "11%" }}>
          <Text style={[globalStyles.headingThree, { marginBottom: 8 }]}>Upcoming Reminders</Text>
          {reminders.map((r, i) => (
            <View key={i} style={{ marginBottom: 8 }}>
              <Text style={{ fontWeight: "700" }}>{r.medication_name || r.name || 'Medicine'}</Text>
              <Text style={{ color: "#666" }}>{r.next_time || r.time || ''}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Medical Records grouped by prescription time */}
      {medicalRecords.length === 0 ? (
        <View style={{ marginTop: 40, alignItems: 'center' }}>
          <Text style={{ color: '#666' }}>No medical history yet.</Text>
        </View>
      ) : (
        medicalRecords.map((group) => (
          <View key={group.prescription_id || group.disease_name} style={{ marginTop: 12 }}>
            <TouchableOpacity
              onPress={() => toggleExpand(group.prescription_id)}
              accessibilityRole="button"
              accessibilityLabel={`Prescription for ${group.disease_name}. ${expandedIds[group.prescription_id] ? 'Collapse' : 'Expand'} to view medications`}
              style={styles.prescriptionHeader}
            >
              <View>
                <Text style={styles.prescriptionTitle}>{group.disease_name}</Text>
                <Text style={styles.prescriptionSubtitle}>Ngày tạo: {utils.formatDate(group.created_at)} • {Array.isArray(group.medications) ? group.medications.length : 0} loại thuốc</Text>
              </View>
              <Icon name={expandedIds[group.prescription_id] ? 'chevron-up' : 'chevron-down'} size={24} color="#007AFF" />
            </TouchableOpacity>

            {expandedIds[group.prescription_id] && (
              <View style={styles.medicationsContainer}>
                {(group.medications || []).map((med) => (
                  <View key={med.id} style={styles.medicationCard}>
                    <View style={styles.medicationHeader}>
                      <Text style={styles.medicationName}>{med.name}</Text>
                    </View>

                    <View style={styles.medicationDetails}>
                      <View style={styles.row}>
                        <Text style={styles.cardLabel}>Dosage:</Text>
                        <Text style={styles.cardValue}>{med.dosage || '—'}</Text>
                      </View>

                      <View style={styles.row}>
                        <Text style={styles.cardLabel}>Frequency:</Text>
                        <Text style={styles.cardValue}>{med.frequency || '—'}</Text>
                      </View>

                      <View style={styles.row}>
                        <Text style={styles.cardLabel}>Duration:</Text>
                        <Text style={styles.cardValue}>{med.duration || '—'}</Text>
                      </View>

                      {med.notes && med.notes.trim() !== '' ? (
                        <View style={styles.row}>
                          <Text style={styles.cardLabel}>Notes:</Text>
                          <Text style={styles.cardValue}>{med.notes}</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))
      )}

      {/* Save button at the end of the scroll, visible only when there are unsaved changes */}
      {dirty && (
        <View style={{ width: '90%', alignSelf: 'center', marginVertical: 30 }}>
          <TouchableOpacity onPress={handleSaveToServer} style={{ backgroundColor: '#007AFF', padding: 12, borderRadius: 8, alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Save History</Text>
          </TouchableOpacity>
        </View>
      )}

      <QRCodeScreen
        visible={qrVisible}
        onClose={() => setQRVisible(false)}
        data={qrData}
      />
    </ScrollView>
  );
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  avatar: {
    position: "absolute",
    top: 60,
    right: 20,
  },

  header: {
    ...globalStyles.headingTwo,
    alignSelf: "center",
    marginTop: 0.1 * height,
    paddingVertical: 2,
  },
  searchBar: {
    width: "80%",
    marginTop: 15,
    marginBottom: 15,
    alignSelf: "center",
  },

  QrButton: {
    flexDirection: "row",
    backgroundColor: "#347CFF",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    width: 320,
    height: 72,
    alignSelf: "center",
  },
  QrButtonDisabled: {
    backgroundColor: "#9bb7ff",
    opacity: 0.8,
  },
  QrIcon: {
    marginRight: 12,
  },
  QrTextContainer: {
    flexDirection: "column",
  },
  QrTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "600",
  },
  QrSubtitle: {
    color: "#e0e7ff",
    fontSize: 15,
  },

  medicalRecord: {
    marginTop: 12,
    marginLeft: "11%",
    paddingVertical: 8,
    paddingRight: 12,
  },

  line: {
    height: 1,
    width: width * 0.75,
    backgroundColor: "#ccc",
    marginVertical: 8,
    alignSelf: "center",
    marginLeft: -0.11 * width, // equal leftMargin of medicalRecord
  },

  cardHeader: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    marginRight: 20,
    marginBottom: 6,
  },

  tag: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 8,
  },

  tagText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 12,
  },

  cardLabel: {
    ...globalStyles.textBased,
    fontWeight: "600",
    fontSize: 14,
    color: '#555',
    minWidth: 80,
  },

  cardValue: {
    flex: 1,
    color: "#2c3e50",
    fontSize: 14,
    lineHeight: 20,
  },

  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
    gap: 12,
  },

  sortWrapper: {
    marginTop: 20,
    width: "40%",
    marginLeft: "11%",
  },
  sortButton: {
    backgroundColor: "#e5e7eb",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  sortButtonText: {
    ...globalStyles.textBased,
    fontSize: 12,
  },
  optionsContainer: {
    marginTop: 6,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#ccc",
  },
  option: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  optionText: {
    fontSize: 15,
    color: "#333",
  },
  prescriptionHeader: {
    marginLeft: '11%',
    marginRight: '11%',
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  prescriptionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  prescriptionSubtitle: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  medicationsContainer: {
    marginLeft: '11%',
    marginRight: '11%',
    marginBottom: 16,
  },
  medicationCard: {
    backgroundColor: '#ffffff',
    marginBottom: 12,
    marginLeft: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  medicationHeader: {
    backgroundColor: '#f1f3f4',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  medicationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  medicationDetails: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
});
export default MedicalHistory;
