import React, { useEffect, useState } from "react";
import { View, Button, StyleSheet, Image, ActivityIndicator, Alert, TouchableOpacity, Text } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import ParallaxScrollView from "@/components/ParallaxScrollView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { HelloWave } from "@/components/HelloWave";

import { GOOGLE_CLIENT_ID, GOOGLE_WEB_CLIENT_ID, REDIRECT_URI } from '@env';


// Complete the auth session
WebBrowser.maybeCompleteAuthSession();

export default function PageZero() {
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Google Auth Request
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: GOOGLE_CLIENT_ID,
    webClientId: GOOGLE_WEB_CLIENT_ID,
    redirectUri: REDIRECT_URI,
    scopes: ['profile', 'email'],
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
      // headerBackgroundColor={{ light: "#A1CEDC", dark: "#1D3D47" }}
      headerBackgroundColor={{light: "#00000", dark: "#00000"}}
      headerImage={
        <Image
        source={require("@/assets/images/CCLogo.png")}
        style={styles.reactLogo}
        />
      }
    >
      <ThemedView style={styles.container}>
        <ThemedText type="title" style={styles.title}>
          Welcome to <Text style={styles.italic}>campusCraves</Text>!
        </ThemedText>
        <ThemedText type="subtitle" style={styles.subtitle}>
          Share. Discover. Enjoy.
        </ThemedText>
        <ThemedText style={styles.description}>
          Join a community where students share food, discover hidden gems on campus, and reduce waste together.
        </ThemedText>
        <View style={styles.stepContainer}>
          <TouchableOpacity
            style={styles.buttonContainer}
            onPress={() => {
              setAuthError(null);
              promptAsync();
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Sign in with Google</Text>
          </TouchableOpacity>
          {authError && <ThemedText style={styles.errorText}>{authError}</ThemedText>}
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
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  reactLogo: {
    height: 300,
    width: 300,
    alignSelf: "center",
    resizeMode: "contain",
    marginTop: 20,
  },
  stepContainer: {
    gap: 8,
    marginTop: 20,
    alignItems: "center",
  },
  buttonContainer: {
    backgroundColor: "#85A947",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginVertical: 15,
    alignItems: "center",
    justifyContent: "center",
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
  },
  title: {
    fontSize: 50,
    fontWeight: "bold",
    textAlign: "center",
    color: "#3E7B27",
    marginTop: 20,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 10,
    color: "#85A947",
    marginBottom: 10,
  },
  description: {
    fontSize: 20,
    textAlign: "center",
    marginTop: 15,
    color: "#EFE3C2",
    paddingHorizontal: 15,
  },
  errorText: {
    color: "red",
    marginTop: 5,
  },
  headerImage: {
    width: "100%",
    height: 200,
    resizeMode: "cover",
    alignContent: "center",
  },
  italic: {
    fontStyle: "italic",
  },
});