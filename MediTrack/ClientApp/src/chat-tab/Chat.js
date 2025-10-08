import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Image,
} from "react-native";
import { GoogleGenerativeAI } from "@google/generative-ai";

//"AIzaSyAQqugjonJmwYpnRBXCV_TIdEcRDRWZDmY"
// Initialize Gemini AI
const genAI = new GoogleGenerativeAI("AIzaSyAQqugjonJmwYpnRBXCV_TIdEcRDRWZDmY");

const Chat = () => {
  const [messages, setMessages] = useState([
    {
      id: "1",
      text: "Hi! I'm MediTrack AI assistant. How can I help you with your medical questions today?",
      from: "bot",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef();

  // const sendMessage = async () => {
  //   if (inputText.trim() === "") return;

  //   const newMessage = {
  //     id: Date.now().toString(),
  //     text: inputText,
  //     from: "user",
  //   };

  //   setMessages((prevMessages) => [...prevMessages, newMessage]);
  //   setInputText("");

  //   // Simulate bot response
  //   setTimeout(() => {
  //     const botReply = {
  //       id: Date.now().toString() + "-bot",
  //       text: "Hi, I'm MediTrack, how are you?",
  //       from: "bot",
  //     };
  //     setMessages((prevMessages) => [...prevMessages, botReply]);
  //   }, 500);
  // };

  // Gemini AI Integration
  const sendMessage = async () => {
    if (inputText.trim() === "" || isLoading) return;

    const userMessage = inputText.trim();
    const newMessage = {
      id: Date.now().toString(),
      text: userMessage,
      from: "user",
    };

    setMessages((prevMessages) => [...prevMessages, newMessage]);
    setInputText("");
    setIsLoading(true);

    try {
      // Get the generative model - using the updated model name
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

      // Create a medical-focused prompt
      const medicalPrompt = `Bạn là MediTrack AI, một trợ lý y tế hữu ích. Vui lòng cung cấp thông tin chính xác, hữu ích về câu hỏi y tế sau dưới dạng câu trả lời ngắn gọn (dưới 100 từ). Luôn nhắc người dùng tham khảo ý kiến chuyên gia y tế đối với các vấn đề sức khỏe nghiêm trọng.

User question: ${userMessage}

Please provide a helpful and informative response:`;

      const result = await model.generateContent(medicalPrompt);
      const response = await result.response;
      const text = response.text();

      const botReply = {
        id: Date.now().toString() + "-bot",
        text:
          text ||
          "I apologize, but I couldn't generate a response. Please try again.",
        from: "bot",
      };

      setMessages((prevMessages) => [...prevMessages, botReply]);
    } catch (error) {
      console.error("Error calling Gemini AI:", error);
      const errorReply = {
        id: Date.now().toString() + "-error",
        text: "I'm having trouble connecting right now. Please check your internet connection and try again.",
        from: "bot",
      };
      setMessages((prevMessages) => [...prevMessages, errorReply]);
    } finally {
      setIsLoading(false);
    }
  };

  // Scroll to bottom when new message is added
  useEffect(() => {
    if (flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const renderItem = ({ item }) => (
    <View
      style={[
        styles.messageRow,
        item.from === "user" ? styles.userRow : styles.botRow,
      ]}
    >
      {item.from === "bot" && (
        <Image
          source={require("../../assets/logo.png")}
          style={styles.botLogo}
        />
      )}
      <View
        style={[
          styles.messageContainer,
          item.from === "user" ? styles.userMessage : styles.botMessage,
        ]}
      >
        <Text style={styles.messageText}>{item.text}</Text>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 5 : 0}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />
      {/* Input */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Ask me about medications, symptoms, or health concerns..."
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={sendMessage}
          returnKeyType="send"
          editable={!isLoading}
        />
        <TouchableOpacity
          onPress={sendMessage}
          style={[styles.sendButton, isLoading && styles.sendButtonDisabled]}
          disabled={isLoading}
        >
          <Text style={styles.sendText}>{isLoading ? "..." : "Send"}</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.disclaimer}>
        MediTrack may make mistakes. Please verify important information.
      </Text>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  messagesList: {
    marginTop: 30,
    padding: 20,
    paddingBottom: 80,
  },
  messageContainer: {
    marginTop: 10,
    marginVertical: 10,
    maxWidth: "80%",
    borderRadius: 15,
    padding: 10,
  },
  userMessage: {
    backgroundColor: "#DCF8C6",
    alignSelf: "flex-end",
  },
  botMessage: {
    backgroundColor: "#E4E6EB",
    alignSelf: "flex-start",
  },
  messageText: {
    fontSize: 16,
  },
  inputContainer: {
    flexDirection: "row",
    padding: 10,
    backgroundColor: "#f0f0f0",
    borderTopWidth: 1,
    borderColor: "#ccc",
    alignItems: "center",
  },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 15,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ccc",
    marginRight: 10,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  sendButtonDisabled: {
    backgroundColor: "#CCCCCC",
  },
  sendText: {
    color: "#fff",
    fontWeight: "bold",
  },

  messageRow: {
    flexDirection: "row",
    marginTop: 15,
    marginBottom: 10,
    maxWidth: "80%",
  },
  userRow: {
    alignSelf: "flex-end",
    justifyContent: "flex-end",
  },
  botRow: {
    alignSelf: "flex-start",
    justifyContent: "flex-start",
  },
  disclaimer: {
    textAlign: "center",
    fontSize: 10,
    color: "#999",
    marginHorizontal: 20,
    marginBottom: 5,
  },
  botLogo: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
    alignSelf: "center",
  },
});

export default Chat;
