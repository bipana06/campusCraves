// import React, { useEffect, useState } from "react";
// import { View, Text, StyleSheet, ActivityIndicator, FlatList } from "react-native";
// import { getFoodItems, getGoogleId, getNetId } from "../apiService";

// interface FoodItem {
//     id: string;
//     foodName: string;
//     pickupTime: string;
//     createdAt: string;
//     postedBy: string;
// }

// const Notifications = () => {
//     const [recentPosts, setRecentPosts] = useState<FoodItem[]>([]);
//     const [loading, setLoading] = useState(true);
//     const [googleId, setGoogleId] = useState<string | null>(null);

//     useEffect(() => {
//         const fetchGoogleId = async () => {
//             const id = await getGoogleId();
//             setGoogleId(id);
//         };

//         fetchGoogleId();
//     }, []);

//     useEffect(() => {
//         const fetchRecentPosts = async () => {
//             try {
//                 const foodItems = await getFoodItems();
//                 const userNetId = await getNetId(googleId); // Fetch the Net ID once
    
//                 // Filter out posts by the current user
//                 const filteredItems = foodItems.filter((item: FoodItem) => item.postedBy !== userNetId);
    
//                 // Sort the filtered items by createdAt (newest first)
//                 const sortedItems = filteredItems.sort(
//                     (a: FoodItem, b: FoodItem) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
//                 );
    
//                 setRecentPosts(sortedItems);
//             } catch (error) {
//                 console.error("Failed to fetch food items:", error);
//             } finally {
//                 setLoading(false);
//             }
//         };
    
//         if (googleId) {
//             fetchRecentPosts();
//         }
//     }, [googleId]);

//     if (loading) {
//         return <ActivityIndicator size="large" color="#0000ff" style={styles.loader} />;
//     }

//     return (
//         <View style={styles.container}>
//             {recentPosts.length > 0 ? (
//                 <FlatList
//                     data={recentPosts}
//                     keyExtractor={(item) => item.id}
//                     renderItem={({ item }) => (
//                         <View style={styles.notificationCard}>
//                             <Text style={styles.message}>
//                                 {item.postedBy} posted "{item.foodName}". Check it out before {item.pickupTime}!
//                             </Text>
//                         </View>
//                     )}
//                 />
//             ) : (
//                 <Text style={styles.emptyText}>No recent notifications available.</Text>
//             )}
//         </View>
//     );
// };

// const styles = StyleSheet.create({
//     container: {
//         flex: 1,
//         backgroundColor: "#f8f9fa",
//         padding: 16,
//     },
//     notificationCard: {
//         backgroundColor: "#ffffff",
//         padding: 16,
//         borderRadius: 8,
//         shadowColor: "#000",
//         shadowOffset: { width: 0, height: 2 },
//         shadowOpacity: 0.1,
//         shadowRadius: 4,
//         elevation: 2,
//         marginBottom: 12,
//     },
//     message: {
//         fontSize: 16,
//         fontWeight: "bold",
//         color: "#333",
//     },
//     loader: {
//         flex: 1,
//         justifyContent: "center",
//         alignItems: "center",
//     },
//     emptyText: {
//         textAlign: "center",
//         fontSize: 16,
//         color: "#666",
//     },
// });

// export default Notifications;


import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    FlatList,
    TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { getFoodItems, getGoogleId, getNetId } from "../apiService";

interface FoodItem {
    id: string;
    foodName: string;
    pickupTime: string;
    createdAt: string;
    postedBy: string;
}

const Notifications = () => {
    const [recentPosts, setRecentPosts] = useState<FoodItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [googleId, setGoogleId] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        const fetchGoogleId = async () => {
            const id = await getGoogleId();
            setGoogleId(id);
        };

        fetchGoogleId();
    }, []);

    useEffect(() => {
        const fetchRecentPosts = async () => {
            try {
                const foodItems = await getFoodItems();
                const userNetId = await getNetId(googleId);

                const filteredItems = foodItems.filter(
                    (item: FoodItem) => item.postedBy !== userNetId
                );

                const sortedItems = filteredItems.sort(
                    (a: FoodItem, b: FoodItem) =>
                        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                );

                setRecentPosts(sortedItems);
            } catch (error) {
                console.error("Failed to fetch food items:", error);
            } finally {
                setLoading(false);
            }
        };

        if (googleId) {
            fetchRecentPosts();
        }
    }, [googleId]);

    const formatDateTime = (dateTime: string): string => {
        return new Date(dateTime).toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
        });
    };

    if (loading) {
        return <ActivityIndicator size="large" color="#0000ff" style={styles.loader} />;
    }

    return (
        <View style={styles.container}>
            {recentPosts.length > 0 ? (
                <FlatList
                    data={recentPosts}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={styles.notificationCard}
                            onPress={() => router.push('../screens/MarketPlaceScreen')}
                        >
                            <Text style={styles.emoji}>🍱</Text>
                            <Text style={styles.message}>
                                <Text style={styles.foodName}>{item.foodName}</Text> posted.{" "}
                                <Text style={styles.subText}>
                                    Check it out before {formatDateTime(item.pickupTime)}!
                                </Text>
                            </Text>
                        </TouchableOpacity>
                    )}
                />
            ) : (
                <Text style={styles.emptyText}>No recent notifications available.</Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f8f9fa",
        padding: 16,
    },
    notificationCard: {
        backgroundColor: "#ffffff",
        padding: 20,
        borderRadius: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 4,
        marginBottom: 16,
        flexDirection: "row",
        alignItems: "center",
    },
    emoji: {
        fontSize: 24,
        marginRight: 12,
    },
    message: {
        flex: 1,
        fontSize: 16,
        color: "#333",
    },
    foodName: {
        fontWeight: "bold",
        color: "#1e90ff",
    },
    subText: {
        color: "#555",
    },
    loader: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    emptyText: {
        textAlign: "center",
        fontSize: 16,
        color: "#666",
    },
});

export default Notifications;
