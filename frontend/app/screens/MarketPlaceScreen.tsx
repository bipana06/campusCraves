

import React, { useEffect, useState } from "react";
import { View, Text, FlatList, Image, ActivityIndicator, StyleSheet, Button } from "react-native";
import { getFoodItems } from "../apiService";


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
   const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
   const [loading, setLoading] = useState(true);


   useEffect(() => {
       const fetchFoodItems = async () => {
           try {
               const data = await getFoodItems();
               setFoodItems(data);
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
   const renderItem = ({ item }: { item: FoodItem }) => {
       const statusStyle = getStatusStyle(item.status);
       return (
           <View style={styles.card}>
               <Image source={{ uri: item.photo }} style={styles.image} />
              
               <View style={styles.textContainer}>
                   {/* <Text style={styles.detail}>{item.id}</Text> */}
                   <Text style={styles.foodName}>{item.foodName}</Text>
                   <Text style={styles.detail}>Quantity: {item.quantity}</Text>
                   <Text style={styles.detail}>Category: {item.category}</Text>
                   <Text style={styles.detail}>Pickup: {item.pickupLocation}</Text>
                   <Text style={styles.detail}>Time: {item.pickupTime}</Text>
                   <Text style={[styles.detail, { color: statusStyle.color, fontWeight: "bold" }]}>Status: {statusStyle.text}</Text>
                   <Text style={styles.detail}>Posted By: {item.postedBy}</Text>
                   <Text style={styles.detail}>Report Count: {item.reportCount}</Text>
                   <Text style={styles.detail}>Created At: {new Date(item.createdAt).toLocaleString()}</Text>
                   <Text style={styles.detail}>Expiration Time: {item.expirationTime}</Text>
                    <Button title="Reserve" onPress={() => console.log("Reserve clicked")} />
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
           <FlatList
               data={foodItems}
               keyExtractor={(item, index) => index.toString()}
               renderItem={renderItem}
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
});


export default MarketPlaceScreen;




