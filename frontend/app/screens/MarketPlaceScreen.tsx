

import React, { useEffect, useState } from "react";
import { View, Text, FlatList, Image, ActivityIndicator, StyleSheet, Button, TextInput,
    Modal,
    TouchableOpacity,} from "react-native";
import { getFoodItems, reserveFood, searchFoodItems } from "../apiService";
import { useRouter } from "expo-router";


interface FoodItem {
   id: number;
   foodName: string;
   quantity: string;
   category: string;
   pickupLocation: string;
   pickupTime: string;
   photo: string;
   status: string;
   postedBy: string;
   reportCount: number;
   createdAt: string;
   expirationTime: string;
}


const MarketPlaceScreen = () => {
    const router = useRouter();
    const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [foodNameFilter, setFoodNameFilter] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [pickupLocationFilter, setPickupLocationFilter] = useState("");
    const [pickupTimeFilter, setPickupTimeFilter] = useState("");
    const [isFiltering, setIsFiltering] = useState(false);



   useEffect(() => {
    const fetchFoodItems = async () => {
        try {
            const data = await getFoodItems();
            const filteredData = filterExpiredItems(data); // Remove expired items
            setFoodItems(filteredData);
        } catch (error) {
            console.error("Failed to fetch food items:", error);
        } finally {
            setLoading(false);
        }
    };

    fetchFoodItems();
   }, []);


   const getStatusStyle = (status?: string) => {
       if (!status) {
           return { text: "Unknown", color: "gray" }; // Handle undefined status
       }
  
       switch (status.toLowerCase()) {
           case "green":
               return { text: "Available", color: "green" };
           case "yellow":
               return { text: "Reserved", color: "orange" };
           case "red":
               return { text: "Unavailable", color: "red" };
           default:
               return { text: "Unknown", color: "gray" };
       }
   };
    const applyFilters = async () => {
        setIsFiltering(true);
        try {
            const filteredItems = await searchFoodItems({
                foodName: foodNameFilter,
                category: categoryFilter,
                pickupLocation: pickupLocationFilter,
                pickupTime: pickupTimeFilter,
            });
            const nonExpiredItems = filterExpiredItems(filteredItems); // Remove expired items
            setFoodItems(nonExpiredItems);
        } catch (error) {
            console.error("Failed to fetch filtered food items:", error);
        } finally {
            setModalVisible(false);
            setIsFiltering(false);
        }
    };

    const formatDateTime = (dateString: string): string => {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            // If the date is invalid, use the current system time
            return new Intl.DateTimeFormat("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            }).format(new Date());
        }
        return new Intl.DateTimeFormat("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        }).format(date);
    };
const renderItem = ({ item }: { item: FoodItem }) => {
    const statusStyle = getStatusStyle(item.status);

    const handleReserve = async () => {
        try {
            const user = "currentUser"; // Replace with the actual logged-in user's identifier
            const response = await reserveFood(item.id, user);
            console.log("Reservation successful:", response);

            // Update the UI to reflect the new status
            setFoodItems((prevItems) =>
                prevItems.map((food) =>
                    food.id === item.id ? { ...food, status: "yellow", reservedBy: user } : food
                )
            );
        } catch (error) {
            console.error("Failed to reserve food:", error);
            alert("Failed to reserve food. Please try again.");
        }
    };
    
    const handleReport = () => {
        router.push({
            pathname: "../screens/ReportScreen",
            params: { 
                foodId: item.id, 
                foodName: item.foodName 
            }
        });
    };

    // Determine if the button should be disabled
    const isReserved = item.status === "yellow" || item.status === "red";

    return (
        <View style={styles.card}>
            <Image source={{ uri: item.photo }} style={styles.image} />

            <View style={styles.textContainer}>
                <Text style={styles.foodName}>{item.foodName}</Text>
                <Text style={styles.detail}>Quantity: {item.quantity}</Text>
                <Text style={styles.detail}>Category: {item.category}</Text>
                <Text style={styles.detail}>Pickup Location: {item.pickupLocation}</Text>
                <Text style={styles.detail}>Pickup Time: {formatDateTime(item.pickupTime)}</Text>
                <Text style={[styles.detail, { color: statusStyle.color, fontWeight: "bold" }]}>
                    Status: {statusStyle.text}
                </Text>
                <Text style={styles.detail}>Posted By: {item.postedBy}</Text>
                   <Text style={styles.detail}>Report Count: {item.reportCount}</Text>
                   <Text style={styles.detail}>Created At: {formatDateTime(item.createdAt)}</Text>
                   <Text style={styles.detail}>Expiration Time: {formatDateTime(item.expirationTime)}</Text>
                <Button
                    title={isReserved ? "Reserved" : "Reserve"}
                    onPress={handleReserve}
                    disabled={isReserved} // Disable the button if the item is reserved
                    color={isReserved ? "gray" : "blue"} // Change the button color if disabled
                />
                 <TouchableOpacity 
                    style={styles.reportButton}
                    onPress={handleReport}
                >
                    <Text style={styles.reportButtonText}>Report</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};


   if (loading) {
       return <ActivityIndicator size="large" color="#0000ff" style={styles.loader} />;
   }


   return (
    <View style={styles.container}>
    <Text style={styles.title}>Marketplace</Text>

    {/* Search Button */}
    <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.searchButton}>
        <Text style={styles.searchButtonText}>Search</Text>
    </TouchableOpacity>

    {/* Modal for filters */}
    <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
    >
        <View style={styles.modalView}>
            <TextInput
                placeholder="Food Name"
                style={styles.input}
                value={foodNameFilter}
                onChangeText={setFoodNameFilter}
            />
            <TextInput
                placeholder="Category"
                style={styles.input}
                value={categoryFilter}
                onChangeText={setCategoryFilter}
            />
            <TextInput
                placeholder="Pickup Location"
                style={styles.input}
                value={pickupLocationFilter}
                onChangeText={setPickupLocationFilter}
            />
            <TextInput
                placeholder="Pickup Time"
                style={styles.input}
                value={pickupTimeFilter}
                onChangeText={setPickupTimeFilter}
            />
            <Button title="Apply Filters" onPress={applyFilters} disabled={isFiltering} />
            <Button title="Close" onPress={() => setModalVisible(false)} />
        </View>
    </Modal>

    <FlatList
        data={foodItems}
        keyExtractor={(item, index) => index.toString()}
        renderItem={renderItem}
    />
</View>
);
};
const filterExpiredItems = (items: FoodItem[]): FoodItem[] => {
    const now = new Date();
    return items.filter((item) => {
        const expirationDate = new Date(item.expirationTime);
        return expirationDate.getTime() > now.getTime(); // Keep items that haven't expired
    });
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
title: {
fontSize: 24,
fontWeight: "bold",
marginBottom: 10,
textAlign: "center",
},
card: {
flexDirection: "row",
backgroundColor: "#f9f9f9",
borderRadius: 10,
padding: 15,
marginBottom: 10,
alignItems: "center",
shadowColor: "#000",
shadowOffset: { width: 0, height: 2 },
shadowOpacity: 0.1,
shadowRadius: 5,
elevation: 2,
},
image: {
width: 80,
height: 80,
borderRadius: 10,
marginRight: 15,
},
textContainer: {
flex: 1,
},
foodName: {
fontSize: 18,
fontWeight: "bold",
marginBottom: 5,
},
detail: {
fontSize: 14,
color: "#555",
},
searchButton: {
backgroundColor: "#007BFF",
padding: 10,
borderRadius: 5,
marginBottom: 10,
},
searchButtonText: {
color: "#fff",
textAlign: "center",
fontWeight: "bold",
},
modalView: {
flex: 1,
justifyContent: "center",
alignItems: "center",
backgroundColor: "rgba(0, 0, 0, 0.5)",
padding: 20,
},
buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
},
reportButton: {
    backgroundColor: "#d32f2f",
    alignItems: "center",
    paddingVertical: 7,
    paddingHorizontal: 15,
    borderRadius: 5,
},
reportButtonText: {
    color: "#fff",
    fontWeight: "bold",
},
input: {
backgroundColor: "#fff",
padding: 10,
marginBottom: 10,
borderRadius: 5,
width: "80%",
},
});

export default MarketPlaceScreen;