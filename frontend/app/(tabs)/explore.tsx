// import React, { useEffect, useState } from "react";
// import { View, Text, StyleSheet, FlatList, ActivityIndicator, Image } from "react-native";
// import axios from "axios";
// import {getGoogleId, getNetId  } from "../apiService";
// import { useRouter } from "expo-router";
// import { Button } from "react-native";
// const router = useRouter();
// interface UserData {
//     username: string;
//     email: string;
//     post_count: number;
//     received_count: number;
//     post_history: { _id: string; foodName: string; createdAt: string }[];
//     received_history: { _id: string; foodName: string; receivedAt: string }[];
//     _id: string;  // MongoDB usually uses _id
//     id?: string;  // Optional fallback
//     foodName: string;
// }

// const handleReport = (item) => {
//     try {
//         // Add debugging
//         console.log("Item being reported:", item);
//         const foodId = item._id || item.id; // Try both _id and id
        
//         if (!foodId) {
//             console.error("No valid ID found in item:", item);
//             return;
//         }
//         router.push({
//             pathname: '../screens/ReportScreen',
//             params: { foodId: foodId, foodName: item.foodName }
//         });
//     } catch (error) {
//         console.error('Report navigation error:', error);
//     }
// };
// const UserProfileScreen = () => {
//     const [userData, setUserData] = useState<UserData | null>(null);
//     const [loading, setLoading] = useState(true);

//     useEffect(() => {
//         const fetchUserProfile = async () => {
//             // Retrieve googleId from AsyncStorage
//         const googleId = await getGoogleId();
//         console.log("Google ID:", googleId);
//         if (!googleId) {
           
//             return;
//         }

//         // Fetch netId using googleId
//         const netId = await getNetId(googleId);
//         if (!netId) {
    
//             return;
//         }

//             try {
//                 const userId = netId; // Replace with the logged-in user's ID
//                 const response = await axios.get(`https://campuscraves.onrender.com/api/users/profile/${userId}`);
//                 setUserData(response.data);
//             } catch (error) {
//                 console.error("Failed to fetch user profile:", error);
//             } finally {
//                 setLoading(false);
//             }
//         };

//         fetchUserProfile();
//     }, []);

//     if (loading) {
//         return <ActivityIndicator size="large" color="#0000ff" style={styles.loader} />;
//     }

//     if (!userData) {
//         return (
//             <View style={styles.container}>
//                 <Text style={styles.errorText}>Failed to load user profile.</Text>
//             </View>
//         );
//     }

//     return (
//         <View style={styles.container}>
//             <View style={styles.header}>
//                 <Image
//                     source={{ uri: "https://via.placeholder.com/100" }} // Replace with user's profile picture if available
//                     style={styles.profileImage}
//                 />
//                 <Text style={styles.username}>{userData.username}</Text>
//                 <Text style={styles.email}>{userData.email}</Text>
//             </View>

//             <View style={styles.statsContainer}>
//                 <View style={styles.statBox}>
//                     <Text style={styles.statNumber}>{userData.post_count}</Text>
//                     <Text style={styles.statLabel}>Posts</Text>
//                 </View>
//                 <View style={styles.statBox}>
//                     <Text style={styles.statNumber}>{userData.received_count}</Text>
//                     <Text style={styles.statLabel}>Received</Text>
//                 </View>
//             </View>

//             <Text style={styles.sectionTitle}>Post History</Text>
//             <FlatList
//                 data={userData.post_history}
//                 keyExtractor={(item) => item._id}
//                 renderItem={({ item }) => (
//                     <View style={styles.historyItem}>
//                         <Text style={styles.historyText}>{item.foodName}</Text>
//                         <Text style={styles.historyDate}>{new Date(item.createdAt).toLocaleString()}</Text>
//                     </View>
//                 )}
//             />

//             <Text style={styles.sectionTitle}>Received History</Text>
//             <FlatList
//                 data={userData.received_history}
//                 keyExtractor={(item) => item._id}
//                 renderItem={({ item }) => (
//                     <View style={styles.historyItem}>
//                         <Text style={styles.historyText}>{item.foodName}</Text>
//                     </View>
//                 )}
//                 renderItem={({ item }) => (
//                     <View style={styles.historyItem}>
//                         <Text style={styles.historyText}>{item.foodName}</Text>
//                         <Text style={styles.historyDate}>{new Date(item.createdAt).toLocaleString()}</Text>
//                         <Button
//                             title="Report"
//                             onPress={() => handleReport(item)}
//                             color="red"
//                         />
//                     </View>
//                 )}

//             />

//         </View>
//     );
// };

// const styles = StyleSheet.create({
//     container: {
//         flex: 1,
//         backgroundColor: "#fff",
//         padding: 20,
//     },
//     loader: {
//         flex: 1,
//         justifyContent: "center",
//         alignItems: "center",
//     },
//     errorText: {
//         color: "red",
//         textAlign: "center",
//         fontSize: 16,
//     },
//     header: {
//         alignItems: "center",
//         marginBottom: 20,
//     },
//     profileImage: {
//         width: 100,
//         height: 100,
//         borderRadius: 50,
//         marginBottom: 10,
//     },
//     username: {
//         fontSize: 24,
//         fontWeight: "bold",
//     },
//     email: {
//         fontSize: 16,
//         color: "#555",
//     },
//     statsContainer: {
//         flexDirection: "row",
//         justifyContent: "space-around",
//         marginBottom: 20,
//     },
//     statBox: {
//         alignItems: "center",
//     },
//     statNumber: {
//         fontSize: 20,
//         fontWeight: "bold",
//     },
//     statLabel: {
//         fontSize: 14,
//         color: "#555",
//     },
//     sectionTitle: {
//         fontSize: 18,
//         fontWeight: "bold",
//         marginBottom: 10,
//     },
//     historyItem: {
//         flexDirection: "row",
//         justifyContent: "space-between",
//         paddingVertical: 10,
//         borderBottomWidth: 1,
//         borderBottomColor: "#ddd",
//     },
//     historyText: {
//         fontSize: 16,
//     },
//     historyDate: {
//         fontSize: 14,
//         color: "#555",
//     },
// });

// export default UserProfileScreen;

import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    ActivityIndicator,
    Image,
    TouchableOpacity,
    ScrollView,
} from "react-native";
import axios from "axios";
import { getGoogleId, getNetId } from "../apiService";
import { useRouter } from "expo-router";

interface UserData {
    username: string;
    email: string;
    post_count: number;
    received_count: number;
    post_history: { _id: string; foodName: string; createdAt: string }[];
    received_history: { _id: string; foodName: string; createdAt: string }[];
}

interface ReportItem {
    _id?: string;
    id?: string;
    foodName: string;
}

const UserProfileScreen = () => {
    const router = useRouter();
    const [userData, setUserData] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);

    const handleReport = (item: ReportItem): void => {
        const foodId = item._id || item.id;
        if (!foodId) {
            console.error("No valid ID found in item:", item);
            return;
        }
        router.push({
            pathname: "../screens/ReportScreen",
            params: { foodId, foodName: item.foodName },
        });
    };

    const formatDateTime = (datetime: string): string => {
        const date = new Date(datetime);
        return `${date.toLocaleDateString()} • ${date.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        })}`;
    };

    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                const googleId = await getGoogleId();
                if (!googleId) return;

                const netId = await getNetId(googleId);
                if (!netId) return;

                const response = await axios.get(
                    `https://campuscraves.onrender.com/api/users/profile/${netId}`
                );
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
        return (
            <View style={styles.loader}>
                <ActivityIndicator size="small" color="#0000ff" />
            </View>
        );
    }

    if (!userData) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>Failed to load user profile.</Text>
            </View>
        );
    }
    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
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
    
            {/* Scrollable Post History Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Post History</Text>
                <FlatList
                    style={{ maxHeight: 300 }} // Adjust height as needed
                    data={userData.post_history}
                    keyExtractor={(item) => item._id}
                    renderItem={({ item }) => (
                        <View style={styles.historyItem}>
                            <Text style={styles.historyText}>{item.foodName}</Text>
                            <Text style={styles.historyDate}>
                                {new Date(item.createdAt).toLocaleDateString()} • {new Date(item.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </Text>
                        </View>
                    )}
                />
            </View>
    
            {/* Scrollable Received History Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Received History</Text>
                <FlatList
                    style={{ maxHeight: 300 }} // Adjust height as needed
                    data={userData.received_history}
                    keyExtractor={(item) => item._id}
                    renderItem={({ item }) => (
                        <View style={styles.historyItem}>
                            <Text style={styles.historyText}>{item.foodName}</Text>
                            <Text style={styles.historyDate}>
                                {new Date(item.createdAt).toLocaleDateString()} • {new Date(item.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </Text>
                            <TouchableOpacity 
                                style={styles.reportButton}
                                onPress={() => handleReport(item)}
                            >
                                <Text style={styles.reportButtonText}>Report</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                />
            </View>
        </ScrollView>
    );
    
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f8f9fa",
        padding: 16,
    },
    loader: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    errorText: {
        color: "#dc3545",
        textAlign: "center",
        fontSize: 16,
        marginTop: 20,
    },
    header: {
        alignItems: "center",
        marginBottom: 24,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: "#e0e0e0",
    },
    profileImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
        marginBottom: 12,
        backgroundColor: "#e0e0e0",
    },
    username: {
        fontSize: 20,
        fontWeight: "600",
        color: "#143D60",
        marginBottom: 4,
    },
    email: {
        fontSize: 14,
        color: "#6c757d",
    },
    statsContainer: {
        flexDirection: "row",
        justifyContent: "space-around",
        marginBottom: 24,
        padding: 16,
        backgroundColor: "#fff",
        borderRadius: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
    },
    statBox: {
        alignItems: "center",
    },
    statNumber: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#333",
    },
    statLabel: {
        fontSize: 14,
        color: "#6c757d",
        marginTop: 4,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#3E7B27",
        marginBottom: 12,
        paddingLeft: 8,
    },
    emptyText: {
        fontSize: 14,
        color: "#999",
        textAlign: "center",
        paddingVertical: 12,
    },
    historyItem: {
        backgroundColor: "#fff",
        padding: 16,
        marginBottom: 8,
        borderRadius: 8,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1,
    },
    historyText: {
        fontSize: 16,
        color: "#333",
    },
    historyDate: {
        fontSize: 14,
        color: "#6c757d",
        marginTop: 4,
    },
    reportButton: {
        backgroundColor: "#f8f9fa",
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: "#dc3545",
        marginLeft: 8,
    },
    reportButtonText: {
        color: "#dc3545",
        fontSize: 14,
        fontWeight: "500",
    },
});

export default UserProfileScreen;
