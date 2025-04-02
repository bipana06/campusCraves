import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, Button, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";

const AppEntry = () => {
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState<string | null>(null);
    const router = useRouter();

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
            <Button
                title="Post Food"
                onPress={() => router.push("/screens/FoodPostScreen")}
                color="#4CAF50"
            />
            <View style={{ marginTop: 10 }}>
                <Button
                    title="View Marketplace"
                    onPress={() => router.push("/screens/MarketPlaceScreen")}
                    color="#FF9800"
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    errorContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    container: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
        backgroundColor: "#f5f5f5",
    },
});

export default AppEntry;