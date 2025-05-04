import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, Button, StyleSheet, TouchableOpacity, Text } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import {getGoogleId, getNetId  } from "../apiService";
import axios from "axios";

interface UserData {
    username: string;
    fullName: string;
    
}

const AppEntry = () => {
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState<string | null>(null);
    const router = useRouter();
    const [userData, setUserData] = useState<UserData | null>(null);
    
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const userToken = await AsyncStorage.getItem("userToken");
                if (userToken) {
                    // If authenticated, navigate to the tabs
                    router.replace("/(tabs)");
                } else {
                    // If not authenticated, navigate to the authentication page
                    router.replace("/screens/pageZero");
                }
            } catch (error) {
                console.error("Error checking authentication:", error);
                setAuthError("Failed to check authentication. Please try again.");
                router.replace("/screens/pageZero");
            } finally {
                setLoading(false);
            }
        };

        checkAuth();
    }, []);

    useEffect(() => {
        const fetchUserProfile = async () => {
            // Retrieve googleId from AsyncStorage
        const googleId = await getGoogleId();
        console.log("Google ID:", googleId);
        if (!googleId) {
           
            return;
        }

        // Fetch netId using googleId
        const netId = await getNetId(googleId);
        if (!netId) {
    
            return;
        }

            try {
                const userId = netId; // Replace with the logged-in user's ID
                const response = await axios.get(`https://campuscraves.onrender.com/api/users/profile/${userId}`);
                setUserData(response.data);
            } catch (error) {
                console.error("Failed to fetch user profile:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchUserProfile();
    }, []);

    const handleReport = () => {
        try {
            router.push({
                pathname: '../ReportScreen',
                params: { foodId: item.id, foodName: item.foodName }
            });
        } catch (error) {
            console.error('Report navigation error:', error);
        }
    };
    const handleLogout = async () => {
        try {
          // Remove all authentication-related items from AsyncStorage
          await AsyncStorage.multiRemove(['userToken', 'userInfo', 'userProfile']);
          // Navigate to the authentication page
          router.replace("/screens/pageZero");
        } catch (error) {
          console.error("Error during logout:", error);
          setAuthError("Failed to logout. Please try again.");
    
        }
      };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0000ff" />
            </View>
        );
    }

    if (authError) {
        return (
            <View style={styles.errorContainer}>
                <Button title="Retry" onPress={() => router.replace("/screens/pageZero")} />
            </View>
        );
    }

    return (
    <View style={styles.container}>
        <Text style={styles.welcomeText}> Welcome, <Text style = {styles.italics}>{userData?.username || "Foodie"}!</Text></Text>
        {/* <Text style={styles.welcomeText}>Welcome, {userData?.username || "Foodie"}!</Text> */}
        {/* <Text style ={styles.welcomeText}>Welcome!</Text> */}
        <Text style={styles.subText}> Choose an option below to get started. </Text>
        
        <TouchableOpacity
        style={[styles.button, { backgroundColor: "#4CAF50" }]}
        onPress={() => router.push("/screens/FoodPostScreen")}
        >
        <Text style={styles.buttonText}>Post Food</Text>
        </TouchableOpacity>
        <View style={{ marginTop: 10 }}>
        <TouchableOpacity
            style={[styles.button, { backgroundColor: "#FF9800" }]}
            onPress={() => router.push("/screens/MarketPlaceScreen")}
        >
            <Text style={styles.buttonText}>View Marketplace</Text>
        </TouchableOpacity>
        </View>
        <View style={{ marginTop: 20 }}>
        <TouchableOpacity
            style={[styles.button, { backgroundColor: "#d32f2f" }]}
            onPress={handleLogout}
        >
            <Text style={styles.buttonText}>Logout</Text>
        </TouchableOpacity>
        </View>
    </View>
    
    );
};

const styles = StyleSheet.create({
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "#121212",
    },
    container: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: 30,
      backgroundColor: "#121212",
    },
    errorContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    button: {
      paddingVertical: 20,
      paddingHorizontal: 24,
      borderRadius: 14,
      elevation: 3,
      shadowColor: "#000",
      shadowOffset: { width: 1, height: 3 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      alignItems: "center",
      width: "100%",
      maxWidth: 300,
    },
    buttonText: {
      color: "#EFE3C2",
      fontSize: 18,
      fontWeight: "600",
    },
    welcomeText: {
      fontSize: 30,
      fontWeight: "bold",
      textAlign: "center",
      color: "#3E7B27",
      marginBottom: 8,
    },
    subText: {
      fontSize: 20,
      fontWeight: "400",
      textAlign: "center",
      color: "#EFE3C2",
      marginBottom: 40,
    },
    italics: {
        fontStyle: "italic",
        color: "#85A947",
        marginTop: 10,
        },
  });

export default AppEntry;
