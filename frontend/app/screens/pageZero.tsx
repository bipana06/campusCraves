import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  Image,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  Text,
  ScrollView,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import ParallaxScrollView from "@/components/ParallaxScrollView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";

export default function PageZero() {
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<"email" | "password">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const router = useRouter();

  useEffect(() => {
    const checkExistingAuth = async () => {
      const userToken = await AsyncStorage.getItem("userToken");
      if (userToken) {
        router.replace("/(tabs)");
      } else {
        setLoading(false);
      }
    };
    checkExistingAuth();
  }, []);

  const checkEmailExists = async () => {
    setEmailError("");
    if (!email.includes("@")) {
      setEmailError("Please enter a valid email.");
      return;
    }
  
    try {
      console.log("Checking email:", email);
      const res = await fetch("https://campuscraves.onrender.com/api/users/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
  
      const data = await res.json();
      console.log("check-email response:", data);
  
      // Accept both boolean and string "false"
      if (data.exists === false || data.exists === "false") {
        await AsyncStorage.setItem("newUserEmail", email);
        // Use push instead of replace to allow back navigation if needed
        router.push("./netid");
      } else if (data.exists === true || data.exists === "true") {
        setStep("password");
      } else {
        setEmailError("Unexpected error occurred.");
      }
    } catch (err) {
      console.error("Email check error:", err);
      setEmailError("Error connecting to server.");
    }
  };

  const handleLogin = async () => {
    setPasswordError("");

    try {
      const res = await fetch("https://campuscraves.onrender.com/api/users/email-login", {

        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (res.status === 200) {
        const data = await res.json();
        console.log("Login response:", data);
        console.log("User token:", data.token);
        console.log("User info:", data.user);

        await AsyncStorage.setItem("userToken", data.token);
        await AsyncStorage.setItem("userInfo", JSON.stringify(data.user));
        router.replace("/(tabs)");
      } else {
        setPasswordError("Invalid password. Please try again.");
      }
    } catch (err) {
      console.error("Login error:", err);
      setPasswordError("Something went wrong.");
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: "#00000", dark: "#00000" }}
      headerImage={
        <Image
          source={require("@/assets/images/CCLogo.png")}
          style={styles.reactLogo}
        />
      }
    >
      <ThemedView style={styles.container}>
        <ThemedText type="title" style={styles.title}>
          Welcome to campusCraves!
        </ThemedText>
        <ThemedText type="subtitle" style={styles.subtitle}>
          Share. Discover. Enjoy.
        </ThemedText>
        <ThemedText style={styles.description}>
          Join a community where students share food, discover hidden gems on
          campus, and reduce waste together.
        </ThemedText>
        <ThemedText style={[styles.description, styles.italic]}>
          Enter your email to get started!
        </ThemedText>

        <View style={styles.stepContainer}>
          {step === "email" && (
            <>
              <TextInput
                placeholder="e.g. abc@gmail.com"
                value={email}
                onChangeText={setEmail}
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.buttonContainer}
                onPress={checkEmailExists}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>Continue</Text>
              </TouchableOpacity>
              {emailError !== "" && (
                <ThemedText style={styles.errorText}>{emailError}</ThemedText>
              )}
            </>
          )}

          {step === "password" && (
            <>
              <TextInput
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                style={styles.input}
                secureTextEntry
              />
              <TouchableOpacity
                style={styles.buttonContainer}
                onPress={handleLogin}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>Login</Text>
              </TouchableOpacity>
              {passwordError !== "" && (
                <ThemedText style={styles.errorText}>{passwordError}</ThemedText>
              )}
            </>
          )}
        </View>
      </ThemedView>
    </ParallaxScrollView>
    

  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  reactLogo: {
    height: 300,
    width: 300,
    alignSelf: "center",
    resizeMode: "contain",
    marginTop: 40,
  },
  stepContainer: {
    gap: 10,
    marginTop: 2,
    alignItems: "center",
    width: "100%",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginVertical: 15,
    justifyContent: "center",
  },
  input: {
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    width: "100%",
    marginTop: 15,
    fontSize: 16,
    backgroundColor: "#FDF8EF"
  },
  buttonContainer: {
    backgroundColor: "#85A947",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  buttonText: {
    color: "#EFE3C2",
    fontSize: 18,
    fontWeight: "bold",
  },
  container: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 30,
    marginTop: 0,
  },
  title: {
    fontSize: 40,
    fontWeight: "bold",
    textAlign: "center",
    color: "#3E7B27",
    marginTop: 0,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 25,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 10,
    color: "#85A947",
    marginBottom: 10,
  },
  description: {
    fontSize: 17,
    textAlign: "center",
    marginTop: 15,
    color: "#EFE3C2",
    paddingHorizontal: 15,
  },
  errorText: {
    color: "red",
    marginTop: 5,
  },
  italic: {
    fontStyle: "italic",
    fontSize: 16,
    color: "#3E7B27",
  },
});
