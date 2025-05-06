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

                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const filteredItems: FoodItem[] = foodItems
                    .filter((item: FoodItem) => {
                        const createdAt: Date = new Date(item.createdAt);
                        createdAt.setHours(0, 0, 0, 0);
                        return item.postedBy !== userNetId && createdAt.getTime() === today.getTime();
                    })
                    .sort((a: FoodItem, b: FoodItem) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

                setRecentPosts(filteredItems);
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
        return new Date(dateTime).toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    if (loading) {
        return <ActivityIndicator size="large" color="#0000ff" style={styles.loader} />;
    }

    return (

        <View style={styles.container}>
            <Text style={styles.header}>Today's Notifications</Text>
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
                            <View style={styles.textContainer}>
                                <Text style={styles.foodName}>{item.foodName}</Text>
                                <Text style={styles.subText}>
                                    Available until {formatDateTime(item.pickupTime)}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    )}
                />
            ) : (
                <Text style={styles.emptyText}>No food posts for today yet.</Text>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f0f4f8",
        padding: 16,
    },
    notificationCard: {
        backgroundColor: "#ffffff",
        padding: 20,
        borderRadius: 14,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 3,
        marginBottom: 16,
        flexDirection: "row",
        alignItems: "center",
    },
    emoji: {
        fontSize: 28,
        marginRight: 16,
    },
    textContainer: {
        flex: 1,
    },
    foodName: {
        fontSize: 17,
        fontWeight: "600",
        color: "#1e90ff",
        marginBottom: 4,
    },
    subText: {
        fontSize: 15,
        color: "#444",
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
        marginTop: 40,
    },
    header: {
        fontSize: 26,
        fontWeight: "700",
        color: "#1e293b",
        marginBottom: 20,
        textAlign: "center",
    },
});

export default Notifications;

