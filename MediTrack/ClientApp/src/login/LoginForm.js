import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Image,
  TouchableOpacity,
} from "react-native";
import Input from "../components/Input";
import globalStyles from "../GlobalStyles";
import { SolidButton } from "../components/Button";
import { useNavigation } from "@react-navigation/native";
import * as UtilitySet from "../utils/Set";
import { BASE_URL } from "../../config";

const LoginForm = () => {
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const navigation = useNavigation();

  const _handleForgetPassword = () => {
    Alert.alert("Redirect", "You tapped on 'Forget password?'");
  };

  const _handleLogin = async () => {
    // const email = loginEmail.trim();
    // const password = loginPassword;
    const email = "userdemo@example.com";
    const password = "userdemo";

    try {
      const response = await fetch(`${BASE_URL}/api/auth/signin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setErrorMessage("");
        console.log("🟢 Login Success:", data);

        // ✅ Lấy raw access_token (KHÔNG thêm "Bearer ")
        const token = data?.session?.access_token || data?.access_token;
        if (!token) {
          Alert.alert("Error", "Missing token in response");
          return;
        }

        // ✅ Điều hướng vào tab Home và truyền token qua params của Home
        navigation.navigate("MainTab", { token });
      } else {
        setErrorMessage("Incorrect email or password");
      }
    } catch (error) {
      console.error("🔴 Error:", error?.message || error);
      Alert.alert("Error", "Cannot connect to the server");
    }
  };

  const _handleSignUp = () => {
    navigation.navigate("SignUp");
  };

  return (
    <View style={styles.container}>
      <Image
        source={require("../../assets/logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />
      <Image
        source={require("./welcome-to-meditrack.png")}
        style={styles.welcome}
        resizeMode="contain"
      />

      <View style={styles.input}>
        <Input
          textHolder="Email or phone number"
          value={loginEmail}
          onChangeText={setLoginEmail}
        />
        <Input
          textHolder="Password"
          value={loginPassword}
          onChangeText={setLoginPassword}
          secureTextEntry
        />

        {!!errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
      </View>

      <TouchableOpacity onPress={_handleForgetPassword}>
        <Text style={[globalStyles.textLink, styles.forget]}>
          Forgot password?
        </Text>
      </TouchableOpacity>

      <SolidButton title="Login" onPress={_handleLogin} style={styles.login} />

      <View style={styles.line} />

      <View style={[globalStyles.row, globalStyles.alignSelfCenter]}>
        <Text style={[globalStyles.textGrey, UtilitySet.FontSize(12)]}>
          Don't have an account?{" "}
        </Text>
        <TouchableOpacity onPress={_handleSignUp}>
          <Text
            style={[
              globalStyles.textLink,
              styles.signUp,
              UtilitySet.FontSize(12),
            ]}
          >
            Sign up now
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  logo: {
    height: "25%",
    marginTop: "27%",
    alignSelf: "center",
  },
  welcome: {
    height: "10%",
    marginTop: "5%",
    alignSelf: "center",
  },
  forget: {
    marginLeft: "13%",
    paddingVertical: 5,
  },
  input: {
    alignSelf: "center",
  },
  login: {
    width: 327,
    marginTop: 24,
    backgroundColor: "#006FFD",
    alignSelf: "center",
  },
  line: {
    height: 1,
    width: "70%",
    backgroundColor: "#ccc",
    marginVertical: 16,
    alignSelf: "center",
  },
  signUp: {
    paddingLeft: 3,
  },
  errorText: {
    color: "red",
    fontSize: 14,
    marginTop: 6,
    marginLeft: 4,
    alignSelf: "flex-start",
  },
});

export default LoginForm;
