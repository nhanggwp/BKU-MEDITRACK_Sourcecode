// ClientApp/src/medical-hisory-tab/MedicalHistory.js
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import globalStyles from "../GlobalStyles";
import { useNavigation, useRoute } from "@react-navigation/native";
import SearchBar from "../components/SearchBar";
import Icon from "react-native-vector-icons/Ionicons";
import { CircleButton } from "../components/Button";
import QRCodeScreen from "./GenerateQR";
import { Buffer } from "buffer";

const { width: W, height: H } = Dimensions.get("window");

/* ------------ Helpers: decode JWT để lấy user id ------------ */
const base64UrlToUtf8 = (b64url) => {
  // chuyển base64-url sang base64 chuẩn + padding
  let s = (b64url || "").replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4;
  if (pad === 2) s += "==";
  else if (pad === 3) s += "=";
  else if (pad === 1) throw new Error("Invalid base64url length");
  return Buffer.from(s, "base64").toString("utf8");
};

const decodeJwt = (token) => {
  // JWT: header.payload.signature
  if (!token || typeof token !== "string") throw new Error("Empty token");
  const parts = token.split(".");
  if (parts.length < 2) throw new Error("Invalid JWT format");
  const payloadJson = base64UrlToUtf8(parts[1]);
  return JSON.parse(payloadJson);
};

const getUserIdFromToken = (token) => {
  try {
    const payload = decodeJwt(token);
    // các field có thể có: sub (chuẩn), id, user_id, email
    const userId = payload.sub || payload.user_id || payload.id || null;
    // log đầy đủ để debug
    console.log("🔍 JWT payload:", payload);
    console.log("👤 Resolved userId:", userId);
    return { userId, payload };
  } catch (e) {
    console.warn("⚠️ Decode JWT failed:", e?.message || e);
    return { userId: null, payload: null };
  }
};
/* ------------------------------------------------------------ */

const _QrButton = ({ onPress }) => (
  <TouchableOpacity style={styles.QrButton} onPress={onPress}>
    <Icon name="qr-code-outline" size={50} color="#fff" style={styles.QrIcon} />
    <View style={styles.QrTextContainer}>
      <Text style={styles.QrTitle}>Generate QR Code</Text>
      <Text style={styles.QrSubtitle}>Include Side Effect log</Text>
    </View>
  </TouchableOpacity>
);

const _importanceTag = ({ level }) => {
  const colors = { high: "#EF4444", medium: "#F59E0B", low: "#3B82F6" };
  return (
    <View style={[styles.tag, { backgroundColor: colors[level] || "#ccc" }]}>
      <Text style={styles.tagText}>{(level || "low").toUpperCase()}</Text>
    </View>
  );
};

const _medicalRecordCard = ({
  disease,
  medications,
  startDate,
  endDate,
  importance,
}) => (
  <View style={styles.medicalRecord}>
    <View style={styles.cardHeader}>
      <Text style={globalStyles.headingThree}>{disease}</Text>
      <_importanceTag level={importance} />
    </View>
    <View style={styles.row}>
      <Text style={styles.cardLabel}>Medications:</Text>
      <Text style={styles.cardValue}>{medications}</Text>
    </View>
    <View style={styles.row}>
      <Text style={styles.cardLabel}>Treatment Period:</Text>
      <Text style={styles.cardValue}>
        {startDate} - {endDate}
      </Text>
    </View>
    <View style={styles.line} />
  </View>
);

const MedicalHistory = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const tokenFromParams = route.params?.token; // <- token truyền từ Login/Tab

  const [qrVisible, setQRVisible] = useState(false);
  const [qrData, setQRData] = useState("");

  // debug: giữ userId & email từ token
  const [debugUid, setDebugUid] = useState(null);
  const [debugEmail, setDebugEmail] = useState(null);

  const [medicalRecords] = useState([
    {
      id: 1,
      disease: "Rối loạn giấc ngủ",
      medications: ["Temazepam", "Sildenafil", "Bumetanide"],
      startDate: "27 May 2025",
      endDate: "1 June 2025",
      importance: "medium",
    },
    {
      id: 2,
      disease: "Viêm dạ dày",
      medications: ["Omeprazole", "Hyoscine butylbromide", "Sucralfate"],
      startDate: "25 July 2025",
      endDate: "1 Aug 2025",
      importance: "low",
    },
    {
      id: 3,
      disease: "Viêm họng cấp",
      medications: ["Acemuc", "Propanolol", "Augmentin"],
      startDate: "18 Jan 2025",
      endDate: "23 Jan 2025",
      importance: "low",
    },
  ]);

  // decode token khi vào màn hình / đổi token
  useEffect(() => {
    if (!tokenFromParams) {
      console.warn("⚠️ Missing access token in route params");
      setDebugUid(null);
      setDebugEmail(null);
      return;
    }
    const { userId, payload } = getUserIdFromToken(tokenFromParams);
    setDebugUid(userId);
    setDebugEmail(payload?.email || null);
  }, [tokenFromParams]);

  const handleGenerateQR = () => {
    if (!tokenFromParams) {
      console.warn("Missing access token, cannot build QR");
      return;
    }
    const payload = {
      t: tokenFromParams, // access_token (JWT)
      v: 1, // version để sau này đổi format dễ
      exp: Date.now() + 5 * 60 * 1000, // 5 phút
    };
    const base64 = Buffer.from(JSON.stringify(payload), "utf-8").toString(
      "base64"
    );
    setQRData(base64);
    setQRVisible(true);
  };

  return (
    <ScrollView style={styles.container}>
      <CircleButton
        style={styles.avatar}
        onPress={() => navigation.navigate("Profile")}
      />

      <Text style={styles.header}>Medical History</Text>
      <SearchBar style={styles.searchBar} />
      <_QrButton onPress={handleGenerateQR} />

      {medicalRecords.map((r) => (
        <_medicalRecordCard
          key={r.id}
          disease={r.disease}
          medications={r.medications.join(", ")}
          startDate={r.startDate}
          endDate={r.endDate}
          importance={r.importance}
        />
      ))}

      <QRCodeScreen
        visible={qrVisible}
        onClose={() => setQRVisible(false)}
        data={qrData}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  avatar: { position: "absolute", top: 60, right: 20 },
  header: {
    ...globalStyles.headingTwo,
    alignSelf: "center",
    marginTop: 0.1 * H,
    paddingVertical: 2,
  },
  debugBox: {
    marginTop: 8,
    marginHorizontal: 20,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
  },
  debugLine: {
    fontSize: 12,
    color: "#374151",
    marginBottom: 4,
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
    width: "75%",
    height: "7%",
    alignSelf: "center",
  },
  QrIcon: { marginRight: 12 },
  QrTextContainer: { flexDirection: "column" },
  QrTitle: { color: "#fff", fontSize: 20, fontWeight: "600" },
  QrSubtitle: { color: "#e0e7ff", fontSize: 15 },
  medicalRecord: { marginTop: "5%", marginLeft: "11%" },
  line: {
    height: 1,
    width: W * 0.75,
    backgroundColor: "#ccc",
    marginVertical: 8,
    alignSelf: "center",
    marginLeft: -0.11 * W,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 4,
    marginRight: 35,
    gap: 10,
  },
  cardHeader: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    marginRight: 20,
  },
  tag: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 8 },
  tagText: { color: "#fff", fontWeight: "600", fontSize: 12 },
  cardLabel: { ...globalStyles.textBased, fontWeight: "bold" },
  cardValue: { flex: 1, color: "#333" },
});

export default MedicalHistory;
