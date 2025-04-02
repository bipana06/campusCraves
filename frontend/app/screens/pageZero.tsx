import React, { useEffect, useState } from "react";
import { View, Button, StyleSheet, Image, ActivityIndicator, Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import ParallaxScrollView from "@/components/ParallaxScrollView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { HelloWave } from "@/components/HelloWave";

// Complete the auth session
WebBrowser.maybeCompleteAuthSession();

export default function PageZero() {
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Google Auth Request
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: "556981446145-qa9vinqthj28lmv49of5ssor9im3pk1v.apps.googleusercontent.com",
    webClientId: "556981446145-qa9vinqthj28lmv49of5ssor9im3pk1v.apps.googleusercontent.com",
    redirectUri: "http://localhost:8081/",
    scopes: ["profile", "email"],
  });

  // Check for existing authentication
  useEffect(() => {
    const checkExistingAuth = async () => {
      const userToken = await AsyncStorage.getItem("userToken");
      if (userToken) {
        router.replace("/(tabs)"); // Redirect to tabs if already authenticated
      } else {
        setLoading(false); // Stop loading if no token is found
      }
    };

    checkExistingAuth();
  }, []);

  // Handle Google Auth Response
  useEffect(() => {
    if (response?.type === "success") {
      handleAuthSuccess(response);
    } else if (response?.type === "error") {
      console.error("Authentication error:", response.error);
      setAuthError(`Auth error: ${response.error?.message || "Unknown error"}`);
    }
  }, [response]);

  const handleAuthSuccess = async (response: any) => {
    try {
      const { authentication } = response;

      if (!authentication || !authentication.accessToken) {
        throw new Error("No access token in response");
      }

      // Save the token in AsyncStorage
      await AsyncStorage.setItem("userToken", authentication.accessToken);

      // Fetch user info from Google
      const userInfoResponse = await fetch("https://www.googleapis.com/userinfo/v2/me", {
        headers: { Authorization: `Bearer ${authentication.accessToken}` },
      });

      const userInfo = await userInfoResponse.json();
      const { id: googleId, email, name: fullName, picture } = userInfo;
      console.log("User Info:", userInfo);
      console.log("Google ID:", googleId);
      console.log("HEYYY")


      // Check if the user exists in the database
      const dbResponse = await fetch("http://127.0.0.1:8000/api/users/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ googleId }),
      });

      const dbData = await dbResponse.json();

      if (dbResponse.status === 404) {
        // User does not exist, redirect to netid.tsx
        await AsyncStorage.setItem("userInfo", JSON.stringify({ googleId, email, fullName, picture }));
        router.replace("/screens/netid");
      } else if (dbResponse.status === 200) {
        // User exists, save user data and redirect to tabs
        await AsyncStorage.setItem("userInfo", JSON.stringify(dbData));
        router.replace("/(tabs)");
      } else {
        throw new Error(dbData.message || "Unknown error occurred while checking user");
      }
    } catch (error) {
      console.error("Error handling authentication:", error);
      if (error instanceof Error) {
        setAuthError(`Error processing login: ${error.message}`);
      } else {
        setAuthError("Error processing login: An unknown error occurred");
      }
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
      headerBackgroundColor={{ light: "#A1CEDC", dark: "#1D3D47" }}
      headerImage={
        <Image
          source={require("@/assets/images/partial-react-logo.png")}
          style={styles.reactLogo}
        />
      }
    >
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Welcome!</ThemedText>
        <HelloWave />
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Sign in to continue</ThemedText>
        <View style={styles.buttonContainer}>
          <Button
            title="Sign in with Google"
            onPress={() => {
              setAuthError(null);
              promptAsync();
            }}
            color="#4285F4"
          />
        </View>
        {authError && <ThemedText style={{ color: "red" }}>{authError}</ThemedText>}
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
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: "absolute",
  },
  buttonContainer: {
    marginVertical: 15,
  },
});