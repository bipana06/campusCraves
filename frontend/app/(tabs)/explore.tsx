import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Image } from "react-native";
import axios from "axios";
import {getGoogleId, getNetId  } from "../apiService";
interface UserData {
    username: string;
    email: string;
    post_count: number;
    received_count: number;
    post_history: { _id: string; foodName: string; createdAt: string }[];
    received_history: { _id: string; foodName: string; receivedAt: string }[];
}

const UserProfileScreen = () => {
    const [userData, setUserData] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);

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
                const response = await axios.get(`http://127.0.0.1:8000/api/users/profile/${userId}`);
                setUserData(response.data);
            } catch (error) {
                console.error("Failed to fetch user profile:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchUserProfile();
    }, []);

    if (loading) {
        return <ActivityIndicator size="large" color="#0000ff" style={styles.loader} />;
    }

    if (!userData) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>Failed to load user profile.</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Image
                    source={{ uri: "https://via.placeholder.com/100" }} // Replace with user's profile picture if available
                    style={styles.profileImage}
                />
                <Text style={styles.username}>{userData.username}</Text>
                <Text style={styles.email}>{userData.email}</Text>
            </View>

            <View style={styles.statsContainer}>
                <View style={styles.statBox}>
                    <Text style={styles.statNumber}>{userData.post_count}</Text>
                    <Text style={styles.statLabel}>Posts</Text>
                </View>
                <View style={styles.statBox}>
                    <Text style={styles.statNumber}>{userData.received_count}</Text>
                    <Text style={styles.statLabel}>Received</Text>
                </View>
            </View>

            <Text style={styles.sectionTitle}>Post History</Text>
            <FlatList
                data={userData.post_history}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                    <View style={styles.historyItem}>
                        <Text style={styles.historyText}>{item.foodName}</Text>
                        <Text style={styles.historyDate}>{new Date(item.createdAt).toLocaleString()}</Text>
                    </View>
                )}
            />

            <Text style={styles.sectionTitle}>Received History</Text>
            <FlatList
                data={userData.received_history}
                keyExtractor={(item) => item._id}
                renderItem={({ item }) => (
                    <View style={styles.historyItem}>
                        <Text style={styles.historyText}>{item.foodName}</Text>
                        <Text style={styles.historyDate}>{new Date(item.receivedAt).toLocaleString()}</Text>
                    </View>
                )}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
        padding: 20,
    },
    loader: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    errorText: {
        color: "red",
        textAlign: "center",
        fontSize: 16,
    },
    header: {
        alignItems: "center",
        marginBottom: 20,
    },
    profileImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
        marginBottom: 10,
    },
    username: {
        fontSize: 24,
        fontWeight: "bold",
    },
    email: {
        fontSize: 16,
        color: "#555",
    },
    statsContainer: {
        flexDirection: "row",
        justifyContent: "space-around",
        marginBottom: 20,
    },
    statBox: {
        alignItems: "center",
    },
    statNumber: {
        fontSize: 20,
        fontWeight: "bold",
    },
    statLabel: {
        fontSize: 14,
        color: "#555",
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        marginBottom: 10,
    },
    historyItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#ddd",
    },
    historyText: {
        fontSize: 16,
    },
    historyDate: {
        fontSize: 14,
        color: "#555",
    },
});

export default UserProfileScreen;