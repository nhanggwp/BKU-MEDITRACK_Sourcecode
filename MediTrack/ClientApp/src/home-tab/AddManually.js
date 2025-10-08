import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons"; // For plus icon

export default function AddManually({ visible, onClose, onSubmit }) {
  const [inputs, setInputs] = useState([""]);

  const handleAddInput = () => {
    setInputs((prev) => [...prev, ""]);
  };

  const handleChange = (text, index) => {
    const updated = [...inputs];
    updated[index] = text;
    setInputs(updated);
  };

  const handleCheck = () => {
    const medicineList = inputs.filter((name) => name.trim() !== "");
    onSubmit(medicineList);
    setInputs([""]);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.container}>
        {/* Header  */}
        <Text style={styles.title}>Enter Medicine Names</Text>

        {/* Input Area  */}
        <ScrollView contentContainerStyle={styles.inputList}>
          {inputs.map((input, index) => (
            <TextInput
              key={index}
              value={input}
              onChangeText={(text) => handleChange(text, index)}
              placeholder={`Medicine ${index + 1}`}
              style={styles.input}
            />
          ))}

          {/* ➕ Add another input */}
          <Pressable style={styles.addIcon} onPress={handleAddInput}>
            <Ionicons name="add-circle-outline" size={32} color="#2563eb" />
            <Text style={styles.addText}>Add another</Text>
          </Pressable>
        </ScrollView>

        {/* ✅ Check and Cancel */}
        <View style={styles.bottomButtons}>
          <Pressable onPress={onClose} style={[styles.button, styles.cancel]}>
            <Text style={styles.buttonText}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={handleCheck}
            style={[styles.button, styles.check]}
          >
            <Text style={styles.buttonText}>✔ Check</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
  },
  title: {
    marginTop: 20,
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
  },
  inputList: {
    paddingBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 10,
    paddingVertical: 12,
    paddingLeft: 12,
    fontSize: 16,
    alignSelf: "center",
    width: "90%",
    marginBottom: 10,
  },
  addIcon: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    marginLeft: 15,
  },
  addText: {
    marginLeft: 6,
    fontSize: 16,
    color: "#2563eb",
    fontWeight: "600",
  },
  bottomButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: "auto",
    gap: 10,
    alignSelf: "center",
    width: "90%",
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  cancel: {
    backgroundColor: "#aaa",
  },
  check: {
    backgroundColor: "#007AFF",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
