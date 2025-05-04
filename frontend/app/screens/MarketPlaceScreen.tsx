// import React, { useEffect, useState } from "react";
// import { View, Text, FlatList, Image, ActivityIndicator, StyleSheet, Button, TextInput,
//     Modal,
//     TouchableOpacity,} from "react-native";
// import { getFoodItems, reserveFood, searchFoodItems, completeTransaction,getGoogleId, getNetId   } from "../apiService";
// import { useRouter } from "expo-router";

// import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
// const Tab = createMaterialTopTabNavigator();

// const MarketPlaceScreen = () => {
//     return (
//         <Tab.Navigator>
//             <Tab.Screen name="Marketplace" component={MarketplaceTab} />
//             <Tab.Screen name="My Active Posts" component={MyPostsTab} />
//             <Tab.Screen name="My Active Reservations" component={MyReservationsTab} />
//         </Tab.Navigator>
//     );
// };
// let googleId: string | null = null;
// let netId: string | null = null;

// const initializeGlobalData = async () => {
//   googleId = await getGoogleId();
//   console.log("Google ID:", googleId);
  
//   if (!googleId) return;

//   netId = await getNetId(googleId);
// };

// initializeGlobalData();

// interface FoodItem {
//    id: number;
//    foodName: string;
//    quantity: string;
//    category: string;
//    pickupLocation: string;
//    pickupTime: string;
//    photo: string;
//    status: string;
//    postedBy: string;
//    reportCount: number;
//    createdAt: string;
//    expirationTime: string;
//    reservedBy: string;
// }

// const MarketplaceTab = () => {
//     const router = useRouter();
//     const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
//     const [loading, setLoading] = useState(true);
//     const [modalVisible, setModalVisible] = useState(false);
//     const [foodNameFilter, setFoodNameFilter] = useState("");
//     const [categoryFilter, setCategoryFilter] = useState("");
//     const [pickupLocationFilter, setPickupLocationFilter] = useState("");
//     const [pickupTimeFilter, setPickupTimeFilter] = useState("");
//     const [isFiltering, setIsFiltering] = useState(false);


// //    useEffect(() => {
// //     const fetchFoodItems = async () => {
// //         try {
// //             const data = await getFoodItems();
// //             const filteredData = filterExpiredItems(data); // Remove expired items
// //             setFoodItems(filteredData);
// //         } catch (error) {
// //             console.error("Failed to fetch food items:", error);
// //         } finally {
// //             setLoading(false);
// //         }
// //     };

// //     fetchFoodItems();
// //    }, []);

// // sorting the food items by createdAt
//     useEffect(() => {
//         const fetchFoodItems = async () => {
//             try {
//                 const data = await getFoodItems();
//                 const filteredData = filterExpiredItems(data); // Remove expired items

//                 // Sort the filtered data by createdAt (newest first)
//                 const sortedData = filteredData.sort(
//                     (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
//                 );

//                 setFoodItems(sortedData);
//             } catch (error) {
//                 console.error("Failed to fetch food items:", error);
//             } finally {
//                 setLoading(false);
//             }
//         };

//         fetchFoodItems();
//     }, []);


//    const getStatusStyle = (status?: string) => {
//        if (!status) {
//            return { text: "Unknown", color: "gray" }; // Handle undefined status
//        }
  
//        switch (status.toLowerCase()) {
//            case "green":
//                return { text: "Available", color: "green" };
//            case "yellow":
//                return { text: "Reserved", color: "orange" };
//            case "red":
//                return { text: "Unavailable", color: "red" };
//            default:
//                return { text: "Unknown", color: "gray" };
//        }
//    };
//     const applyFilters = async () => {
//         setIsFiltering(true);
//         try {
//             const filteredItems = await searchFoodItems({
//                 foodName: foodNameFilter,
//                 category: categoryFilter,
//                 pickupLocation: pickupLocationFilter,
//                 pickupTime: pickupTimeFilter,
//             });
//             const nonExpiredItems = filterExpiredItems(filteredItems); // Remove expired items
//             setFoodItems(nonExpiredItems);
//         } catch (error) {
//             console.error("Failed to fetch filtered food items:", error);
//         } finally {
//             setModalVisible(false);
//             setIsFiltering(false);
//         }
//     };

//     const formatDateTime = (dateString: string): string => {
//         const date = new Date(dateString);
//         if (isNaN(date.getTime())) {
//             // If the date is invalid, use the current system time
//             return new Intl.DateTimeFormat("en-US", {
//                 month: "short",
//                 day: "numeric",
//                 year: "numeric",
//                 hour: "2-digit",
//                 minute: "2-digit",
//             }).format(new Date());
//         }
//         return new Intl.DateTimeFormat("en-US", {
//             month: "short",
//             day: "numeric",
//             year: "numeric",
//             hour: "2-digit",
//             minute: "2-digit",
//         }).format(date);
//     };
// const renderItem = ({ item }: { item: FoodItem }) => {
//     const statusStyle = getStatusStyle(item.status);

//     const handleReserve = async () => {
//         if (!netId) {
//             return;
//         }
//     // Check if the current user is the same as the person who posted the food
//     if (item.postedBy === netId) {
//         alert("You cannot reserve food that you posted.");
//         return;
//     }


//         try {
//             const user = netId; // Replace with the actual logged-in user's identifier
//             const response = await reserveFood(item.id, user);
//             alert(`Reservation successful! Please pick up the food from ${item.pickupLocation} before ${formatDateTime(item.expirationTime)}`);
//             console.log("Reservation successful:", response);

//             // Update the UI to reflect the new status
//             setFoodItems((prevItems) =>
//                 prevItems.map((food) =>
//                     food.id === item.id ? { ...food, status: "yellow", reservedBy: user } : food
//                 )
//             );
//         } catch (error) {
//             console.error("Failed to reserve food:", error);
//             alert("Failed to reserve food. Please try again.");
//         }
//     };

//     const handleReport = () => {
//         try {
//             router.push({
//                 pathname: '../ReportScreen',
//                 params: { foodId: item.id, foodName: item.foodName }
//             });
//         } catch (error) {
//             console.error('Report navigation error:', error);
//         }
//     };

//     // Determine if the button should be disabled
//     const isReserved = item.status === "yellow" || item.status === "red";

//     return (
//         <View style={styles.card}>
//             <Image source={{ uri: item.photo }} style={styles.image} />

//             <View style={styles.textContainer}>
//                 <Text style={styles.foodName}>{item.foodName}</Text>
//                 <Text style={styles.detail}>Quantity: {item.quantity}</Text>
//                 <Text style={styles.detail}>Category: {item.category}</Text>
//                 <Text style={styles.detail}>Pickup Location: {item.pickupLocation}</Text>
//                 <Text style={styles.detail}>Pickup Time: {formatDateTime(item.pickupTime)}</Text>
//                 <Text style={[styles.detail, { color: statusStyle.color, fontWeight: "bold" }]}>
//                     Status: {statusStyle.text}
//                 </Text>
//                 <Text style={styles.detail}>Posted By: {item.postedBy}</Text>
//                    <Text style={styles.detail}>Report Count: {item.reportCount}</Text>
//                    <Text style={styles.detail}>Created At: {formatDateTime(item.createdAt)}</Text>
//                    <Text style={styles.detail}>Expiration Time: {formatDateTime(item.expirationTime)}</Text>
//                 <Button
//                     title={isReserved ? "Reserved" : "Reserve"}
//                     onPress={handleReserve}
//                     disabled={isReserved} // Disable the button if the item is reserved
//                     color={isReserved ? "gray" : "blue"} // Change the button color if disabled
//                 />

//                  <TouchableOpacity 
//                     style={styles.reportButton}
//                     onPress={handleReport}
//                 >
//                     <Text style={styles.reportButtonText}>Report</Text>
//                 </TouchableOpacity>
//             </View>
//         </View>
//     );
// };


//    if (loading) {
//        return <ActivityIndicator size="large" color="#0000ff" style={styles.loader} />;
//    }


//    return (
//     <View style={styles.container}>
//     <TouchableOpacity onPress={() => router.push('../FoodPostScreen')} style={styles.postButton}>
//                     <Text style={styles.postButtonText}>Post Food</Text>
//                 </TouchableOpacity>

//     {/* Search Button */}
//     <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.searchButton}>
//         <Text style={styles.searchButtonText}>Search</Text>
//     </TouchableOpacity>

//     {/* Modal for filters */}
//     <Modal
//         animationType="slide"
//         transparent={true}
//         visible={modalVisible}
//         onRequestClose={() => setModalVisible(false)}
//     >
//         <View style={styles.modalView}>
//             <TextInput
//                 placeholder="Food Name"
//                 style={styles.input}
//                 value={foodNameFilter}
//                 onChangeText={setFoodNameFilter}
//             />
//             <TextInput
//                 placeholder="Category"
//                 style={styles.input}
//                 value={categoryFilter}
//                 onChangeText={setCategoryFilter}
//             />
//             <TextInput
//                 placeholder="Pickup Location"
//                 style={styles.input}
//                 value={pickupLocationFilter}
//                 onChangeText={setPickupLocationFilter}
//             />
//             <TextInput
//                 placeholder="Pickup Time"
//                 style={styles.input}
//                 value={pickupTimeFilter}
//                 onChangeText={setPickupTimeFilter}
//             />
//             <Button title="Apply Filters" onPress={applyFilters} disabled={isFiltering} />
//             <Button title="Close" onPress={() => setModalVisible(false)} />
//         </View>
//     </Modal>

//     <FlatList
//         data={foodItems}
//         keyExtractor={(item, index) => index.toString()}
//         renderItem={renderItem}
//     />
// </View>
// );
// };
// const filterExpiredItems = (items: FoodItem[]): FoodItem[] => {
//     const now = new Date();
//     return items.filter((item) => {
//         const expirationDate = new Date(item.expirationTime);
//         return expirationDate.getTime() > now.getTime(); // Keep items that haven't expired
//     });
// };




// const MyPostsTab = () => {
//     const router = useRouter();
       
    
//         const [myFoodItems, setMyFoodItems] = useState<FoodItem[]>([]);
//        const [loading, setLoading] = useState(true);

       
    
    
//        useEffect(() => {

//            const fetchMyFoodItems = async () => {
            
        
//                try {
//                    const data = await getFoodItems();
//                    // Filter items where postedBy matches currentUser
//                 const myItems: FoodItem[] = data.filter((item: FoodItem) => item.postedBy === netId);  const filteredData = filterExpiredItems(myItems);
//                    setMyFoodItems(filteredData);
//                } catch (error) {
//                    console.error("Failed to fetch my food items:", error);
//                } finally {
//                    setLoading(false);
//                }
//            };
    
    
//            fetchMyFoodItems();
//        }, []);
    
    
//        const getStatusStyle = (status?: string) => {
//            if (!status) {
//                return { text: "Unknown", color: "gray" };
//            }
      
//            switch (status.toLowerCase()) {
//                case "green":
//                    return { text: "Available", color: "green" };
//                case "yellow":
//                    return { text: "Reserved", color: "orange" };
//                case "red":
//                    return { text: "Unavailable", color: "red" };
//                default:
//                    return { text: "Unknown", color: "gray" };
//            }
//        };
    
    
//        const formatDateTime = (dateString: string): string => {
//            const date = new Date(dateString);
//            if (isNaN(date.getTime())) {
//                return new Intl.DateTimeFormat("en-US", {
//                    month: "short",
//                    day: "numeric",
//                    year: "numeric",
//                    hour: "2-digit",
//                    minute: "2-digit",
//                }).format(new Date());
//            }
//            return new Intl.DateTimeFormat("en-US", {
//                month: "short",
//                day: "numeric",
//                year: "numeric",
//                hour: "2-digit",
//                minute: "2-digit",
//            }).format(date);
//        };
    
    
    
    
//        const renderItem = ({ item }: { item: FoodItem }) => {
//        const statusStyle = getStatusStyle(item.status);
//        const isCompleted = item.status === "red";
    
    
//        return (
//            <View style={styles.card}>
//                <Image source={{ uri: item.photo }} style={styles.image} />
    
    
//                <View style={styles.textContainer}>
//                    <Text style={styles.foodName}>{item.foodName}</Text>
//                    <Text style={styles.detail}>Quantity: {item.quantity}</Text>
//                    <Text style={styles.detail}>Category: {item.category}</Text>
//                    <Text style={styles.detail}>Pickup Location: {item.pickupLocation}</Text>
//                    <Text style={styles.detail}>Pickup Time: {formatDateTime(item.pickupTime)}</Text>
//                    <Text style={[styles.detail, { color: statusStyle.color, fontWeight: "bold" }]}>
//                        Status: {statusStyle.text}
//                    </Text>
//                    <Text style={styles.detail}>Report Count: {item.reportCount}</Text>
//                    <Text style={styles.detail}>Created At: {formatDateTime(item.createdAt)}</Text>
//                    <Text style={styles.detail}>Expiration Time: {formatDateTime(item.expirationTime)}</Text>
                  
//                </View>
//            </View>
//        );
//     };
    
    
//        if (loading) {
//            return <ActivityIndicator size="large" color="#0000ff" style={styles.loader} />;
//        }
    
    
//        return (
//            <View style={styles.container}>
//                <View style={styles.header}>
//                    <Text style={styles.title}>My Food Posts</Text>
//                    <Text style={styles.userText}>{netId}</Text>
//                </View>
    
    
//                {myFoodItems.length === 0 ? (
//                    <View style={styles.emptyState}>
//                        <Text style={styles.emptyStateText}>You haven't posted any food items yet.</Text>
//                        <TouchableOpacity
//                            onPress={() => router.push('../FoodPostScreen')}
//                            style={styles.postButton}
//                        >
//                            <Text style={styles.postButtonText}>Post Food Now</Text>
//                        </TouchableOpacity>
//                    </View>
//                ) : (
//                    <FlatList
//                        data={myFoodItems}
//                        keyExtractor={(item) => item.id.toString()}
//                        renderItem={renderItem}
//                    />
//                )}
//            </View>
//        );
//     };
    
    
//     const MyReservationsTab = () => {
//         const router = useRouter();
//         const [reservedItems, setReservedItems] = useState<FoodItem[]>([]);
//         const [loading, setLoading] = useState(true);
//          // Replace with your actual current user identifier
          
//        useEffect(() => {
//            const fetchReservedItems = async () => {
           
    
//                try {

//                    const data = await getFoodItems();
//                    // Filter items where reservedBy matches currentUser
//                 const myReservations: FoodItem[] = data.filter((item: FoodItem) =>
//                     item.reservedBy === netId
//                 );  
//                 console.log("My Reservations:", myReservations);
                
//                 const filteredData = filterExpiredItems(myReservations);
//                    setReservedItems(filteredData);
//                } catch (error) {
//                    console.error("Failed to fetch reserved items:", error);
//                } finally {
//                    setLoading(false);
//                }
//            };
    
    
//            fetchReservedItems();
//        }, []);
    
    
//        const getStatusStyle = (status?: string) => {
//            if (!status) {
//                return { text: "Unknown", color: "gray" };
//            }
      
//            switch (status.toLowerCase()) {
//                case "green":
//                    return { text: "Available", color: "green" };
//                case "yellow":
//                    return { text: "Reserved by You", color: "orange" };
//                case "red":
//                    return { text: "Completed", color: "red" };
//                default:
//                    return { text: "Unknown", color: "gray" };
//            }
//        };
    
    
//        const formatDateTime = (dateString: string): string => {
//            const date = new Date(dateString);
//            if (isNaN(date.getTime())) {
//                return new Intl.DateTimeFormat("en-US", {
//                    month: "short",
//                    day: "numeric",
//                    year: "numeric",
//                    hour: "2-digit",
//                    minute: "2-digit",
//                }).format(new Date());
//            }
//            return new Intl.DateTimeFormat("en-US", {
//                month: "short",
//                day: "numeric",
//                year: "numeric",
//                hour: "2-digit",
//                minute: "2-digit",
//            }).format(date);
//        };
      
//        const renderItem = ({ item }: { item: FoodItem }) => {
//            const statusStyle = getStatusStyle(item.status);
//            const isCompleted = item.status === "red";
//            const isReserved = item.status === "yellow" && item.reservedBy === netId;
    
    
//            const handleCompleteTransaction = async () => {
//                try {
//                    // Call the API to mark the transaction as complete
//                    await completeTransaction(item.id, netId);
//                    console.log("Transaction completed successfully");
                  
//                    // Update the UI state
//                    setReservedItems(prevItems =>
//                        prevItems.map(item =>
//                            item.id === item.id
//                                ? { ...item, status: "red" }
//                                : item
//                        )
//                    );
//                    alert("Transaction completed successfully!");
//                } catch (error) {
//                    console.error("Failed to complete transaction:", error);
//                    if (error instanceof Error) {
//                        alert(`Failed to complete transaction: ${error.message}`);
//                    } else {
//                        alert("Failed to complete transaction: An unknown error occurred.");
//                    }
//                }
//            };
    
    
//            return (
//                <View style={styles.card}>
//                    <Image source={{ uri: item.photo }} style={styles.image} />
    
    
//                    <View style={styles.textContainer}>
//                        <Text style={styles.foodName}>{item.foodName}</Text>
//                        <Text style={styles.detail}>Quantity: {item.quantity}</Text>
//                        <Text style={styles.detail}>Category: {item.category}</Text>
//                        <Text style={styles.detail}>Pickup Location: {item.pickupLocation}</Text>
//                        <Text style={styles.detail}>Pickup Time: {formatDateTime(item.pickupTime)}</Text>
//                        <Text style={[styles.detail, { color: statusStyle.color, fontWeight: "bold" }]}>
//                            Status: {statusStyle.text}
//                        </Text>
//                        <Text style={styles.detail}>Posted By: {item.postedBy}</Text>
//                        <Text style={styles.detail}>Report Count: {item.reportCount}</Text>
//                        <Text style={styles.detail}>Created At: {formatDateTime(item.createdAt)}</Text>
//                        <Text style={styles.detail}>Expiration Time: {formatDateTime(item.expirationTime)}</Text>

    
    
//                        {isReserved && !isCompleted && (
//                            <>
//                                <TouchableOpacity
//                                    style={styles.completeButton}
//                                    onPress={() => handleCompleteTransaction()}
//                                >
//                                    <Text style={styles.completeButtonText}>
//                                        Complete Transaction
//                                    </Text>
//                                </TouchableOpacity>


                              
//                            </>
//                        )}
    
    
//                        {isCompleted && (
//                            <Text style={[styles.detail, { color: 'red', fontWeight: 'bold' }]}>
//                                Transaction Completed
//                            </Text>
//                        )}
//                         <TouchableOpacity
//                             style={styles.reportButton}
//                             onPress={() => {
//                                 const foodId = item._id || item.id;
//                                 if (!foodId) {
//                                     console.error("No valid ID found in item:", item);
//                                     return;
//                                 }
//                                 router.push({
//                                     pathname: '../ReportScreen',
//                                     params: { 
//                                         foodId: foodId,
//                                         foodName: item.foodName 
//                                     }
//                                 });
//                             }}
//                         >
//                             <Text style={styles.reportButtonText}>Report</Text>
//                         </TouchableOpacity>
//                    </View>
//                </View>
//            );
//        };
    
    
//        if (loading) {
//            return <ActivityIndicator size="large" color="#0000ff" style={styles.loader} />;
//        }
    
    
//        return (
//            <View style={styles.container}>
//                <View style={styles.header}>
//                    <Text style={styles.title}>My Reservations</Text>
//                    <Text style={styles.userText}>{netId}</Text>
//                </View>
    
    
//                {reservedItems.length === 0 ? (
//                    <View style={styles.emptyState}>
//                        <Text style={styles.emptyStateText}>You haven't reserved any food items yet.</Text>
//                    </View>
//                ) : (
//                    <FlatList
//                        data={reservedItems}
//                        keyExtractor={(item) => item.id.toString()}
//                        renderItem={renderItem}
//                    />
//                )}
//            </View>
//        );
//     };
    


//     const styles = StyleSheet.create({
//         container: {
//         flex: 1,
//         backgroundColor: "#F8F9FA",
//         },
        
//         loader: {
//         flex: 1,
//         justifyContent: "center",
//         alignItems: "center",
//         },
//         title: {
//         fontSize: 24,
//         fontWeight: "bold",
//         marginBottom: 10,
//         textAlign: "center",
//         },
//         card: {
//         flexDirection: "row",
//         backgroundColor: "#f9f9f9",
//         borderRadius: 10,
//         padding: 15,
//         marginBottom: 10,
//         alignItems: "center",
//         shadowColor: "#000",
//         shadowOffset: { width: 0, height: 2 },
//         shadowOpacity: 0.1,
//         shadowRadius: 5,
//         elevation: 2,
//         },
//         image: {
//         width: 80,
//         height: 80,
//         borderRadius: 10,
//         marginRight: 15,
//         },
//         textContainer: {
//         flex: 1,
//         },
//         foodName: {
//         fontSize: 18,
//         fontWeight: "bold",
//         marginBottom: 5,
//         },
//         detail: {
//         fontSize: 14,
//         color: "#555",
//         },
//         searchButton: {
//            backgroundColor: "#007bff",
//            paddingVertical: 10, // Adjust vertical padding for height
//            paddingHorizontal: 20, // Adjust horizontal padding for width
//            borderRadius: 5,
//            alignItems: "center", // Center text horizontally
//            justifyContent: "center", // Center text vertically
//            alignSelf: "center", // Center the button within its parent container
//            marginVertical: 10, // Add spacing above and below the butto
//         },
//         searchButtonText: {
//         color: "#fff",
//         textAlign: "center",
//         fontWeight: "bold",
//         },
//         modalView: {
//         flex: 1,
//         justifyContent: "center",
//         alignItems: "center",
//         backgroundColor: "rgba(0, 0, 0, 0.5)",
//         padding: 20,
//         },
//         buttonRow: {
//            flexDirection: "row",
//            justifyContent: "space-between",
//            alignItems: "center",
//            marginTop: 10,
//         },
//         reportButton: {
//            backgroundColor: "#d32f2f",
//            alignItems: "center",
//            paddingVertical: 7,
//            paddingHorizontal: 15,
//            borderRadius: 5,
//         },
//         reportButtonText: {
//            color: "#fff",
//            fontWeight: "bold",
//         },
//         input: {
//         backgroundColor: "#fff",
//         padding: 10,
//         marginBottom: 10,
//         borderRadius: 5,
//         width: "80%",
//         },
//         postButton: {
//            backgroundColor: "#28a745",
//            paddingVertical: 10, // Adjust vertical padding for height
//            paddingHorizontal: 20, // Adjust horizontal padding for width
//            borderRadius: 5,
//            alignItems: "center", // Center text horizontally
//            justifyContent: "center", // Center text vertically
//            alignSelf: "center", // Center the button within its parent container
//            marginVertical: 10, // Add spacing above and below the button
//         },
//            postButtonText: { color: "#fff", fontWeight: "bold" },
//            header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
//            userText: { fontSize: 16, color: "gray" },
//            emptyState: {
//                flex: 1,
//                justifyContent: 'center',
//                alignItems: 'center',
//                padding: 20,
//            },
//            emptyStateText: {
//                fontSize: 18,
//                textAlign: 'center',
//                marginBottom: 20,
//            },
//            completeButton: {
//                backgroundColor: '#4CAF50',
//                padding: 10,
//                borderRadius: 5,
//                marginTop: 10,
//                alignItems: 'center',
//            },
//            completedButton: {
//                backgroundColor: '#cccccc',
//            },
//            completeButtonText: {
//                color: 'white',
//                fontWeight: 'bold',
//            },
//         });
        

// export default MarketPlaceScreen;

import React, { useEffect, useState } from "react";
import {
    View, Text, FlatList, Image, ActivityIndicator, StyleSheet, Button as RNButton, 
    TextInput, Modal, TouchableOpacity
} from "react-native";
import { getFoodItems, reserveFood, searchFoodItems, completeTransaction, getGoogleId, getNetId } from "../apiService";
import { useRouter } from "expo-router";
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { Ionicons } from '@expo/vector-icons'; 

const Tab = createMaterialTopTabNavigator();

let googleId: string | null = null;
let netId: string | null = null;

const initializeGlobalData = async () => {
    try {
        googleId = await getGoogleId();
        console.log("Google ID:", googleId);
        if (!googleId) return;
        netId = await getNetId(googleId);
        console.log("Net ID:", netId);
    } catch (error) {
        console.error("Failed to initialize global data:", error);
    }
};

initializeGlobalData();

interface FoodItem {
    _id?: string; 
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
    reservedBy: string | null; 
}

const filterExpiredItems = (items: FoodItem[]): FoodItem[] => {
    const now = new Date().getTime();
    return items.filter((item) => {
        try {
            const expirationDate = new Date(item.expirationTime);
            return !isNaN(expirationDate.getTime()) && expirationDate.getTime() > now;
        } catch (e) {
            console.warn("Could not parse expiration time for item:", item.id, item.expirationTime);
            return false; 
        }
    });
};

const formatDateTime = (dateString: string): string => {
     try {
        const date = new Date(dateString);
         if (isNaN(date.getTime())) {
             return "Invalid Date"; 
         }
        return new Intl.DateTimeFormat("en-US", {
            month: "short", day: "numeric",
            hour: "numeric", minute: "2-digit", hour12: true 
        }).format(date);
    } catch (e) {
        console.warn("Could not format date string:", dateString);
        return "Invalid Date";
    }
};

const getStatusPresentation = (status?: string, reservedByCurrentUser?: boolean) => {
    const lowerStatus = status?.toLowerCase();
    switch (lowerStatus) {
        case "green":
            return { text: "Available", colorHint: "green" };
        case "yellow":
             // Text depends on who reserved it, but color is consistent
             return { text: reservedByCurrentUser ? "Reserved by You" : "Reserved", colorHint: "orange" };
        case "red":
            return { text: "Unavailable", colorHint: "red" };
        default:
            return { text: "Unknown", colorHint: "gray" };
    }
};



const MarketplaceTab = () => {
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
            setLoading(true); // Ensure loading is true at the start
            try {
                const data = await getFoodItems();
                const filteredData = filterExpiredItems(data);
                const sortedData = filteredData.sort(
                    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                );
                setFoodItems(sortedData);
            } catch (error) {
                console.error("Failed to fetch food items:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchFoodItems();
    }, []); // Run only on mount

    const applyFilters = async () => {
        setIsFiltering(true);
        setLoading(true); // Show loading indicator while filtering
        try {
            const filteredItems = await searchFoodItems({
                foodName: foodNameFilter || undefined, // Send undefined if empty
                category: categoryFilter || undefined,
                pickupLocation: pickupLocationFilter || undefined,
                pickupTime: pickupTimeFilter || undefined,
            });
            const nonExpiredItems = filterExpiredItems(filteredItems);
            const sortedData = nonExpiredItems.sort( // Sort filtered results too
                 (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            );
            setFoodItems(sortedData);
        } catch (error) {
            console.error("Failed to fetch filtered food items:", error);
        } finally {
            setModalVisible(false);
            setIsFiltering(false);
            setLoading(false); // Hide loading indicator
        }
    };

    const handleReserve = async (item: FoodItem) => {
        if (!netId) {
             console.error("Cannot reserve: NetID not available.");
             alert("User information not available. Please try again later.");
            return;
        }
        if (item.postedBy === netId) {
            alert("You cannot reserve food that you posted.");
            return;
        }
         if (item.status !== 'green') {
            alert("This item is no longer available.");
            return;
        }

        try {
            const user = netId;
            const response = await reserveFood(item.id, user); // Assuming API uses numeric id
            alert(`Reservation successful! Pickup from ${item.pickupLocation} by ${formatDateTime(item.expirationTime)}`);
            console.log("Reservation successful:", response);
             // Update UI optimistically or refetch
            setFoodItems((prevItems) =>
                prevItems.map((food) =>
                    food.id === item.id ? { ...food, status: "yellow", reservedBy: user } : food
                )
            );
        } catch (error) {
            console.error("Failed to reserve food:", error);
             // Check if error has a message property
             const errorMessage = error instanceof Error ? error.message : "Please try again.";
             alert(`Failed to reserve food. ${errorMessage}`);

        }
    };

    const handleReport = (item: FoodItem) => {
         const foodIdentifier = item._id || item.id; // Use _id if available, else id
         if (!foodIdentifier) {
             console.error("Cannot report: Missing item identifier.", item);
             alert("Cannot report this item: ID missing.");
             return;
         }
        try {
            router.push({
                pathname: '../ReportScreen', // Ensure this path is correct
                params: { foodId: foodIdentifier.toString(), foodName: item.foodName }
            });
        } catch (error) {
            console.error('Report navigation error:', error);
            alert("Error navigating to report screen.");
        }
    };

    const renderItem = ({ item }: { item: FoodItem }) => {
         const statusInfo = getStatusPresentation(item.status);
         const isActionable = item.status === 'green' && item.postedBy !== netId; // Can the current user reserve?
         const isReservedByOther = item.status === 'yellow' && item.reservedBy !== netId;
         const isUnavailable = item.status === 'red' || item.status === 'yellow'; // Simplified check for disabled button

        return (
            <View style={styles.card}>
                <View>
                     <Image
                        source={{ uri: item.photo || 'https://via.placeholder.com/300x150.png?text=No+Image' }} // Basic placeholder
                        style={styles.cardImage}
                        resizeMode="cover" // Ensure image covers the area
                    />
                    {item.category ? (
                        <View style={styles.categoryTagContainer}>
                             <Text style={styles.categoryTagText}>{item.category}</Text>
                        </View>
                    ) : null}
                 </View>

                <View style={styles.cardContent}>
                    <View style={styles.cardHeaderRow}>
                        <Text style={styles.cardTitle} numberOfLines={1}>{item.foodName}</Text>
                        <View style={[
                            styles.statusBadge,
                             statusInfo.colorHint === 'green' ? styles.statusBadgeGreen :
                             statusInfo.colorHint === 'orange' ? styles.statusBadgeOrange :
                             statusInfo.colorHint === 'red' ? styles.statusBadgeRed :
                             styles.statusBadgeGray
                        ]}>
                             <Text style={styles.statusBadgeText}>{statusInfo.text}</Text>
                        </View>
                    </View>

                     {/* Details Section */}
                     <View style={styles.cardDetailsSection}>
                        <Text style={styles.cardDetailText}>📍 {item.pickupLocation}</Text>
                        <Text style={styles.cardDetailText}>🕒 Available until {formatDateTime(item.expirationTime)} today</Text>
                        <Text style={styles.cardDetailText}>👤 Posted by: {item.postedBy}</Text>
                        <Text style={styles.cardDetailText}>📦 Quantity: {item.quantity}</Text>
                    </View>

                    <View style={styles.cardActionsRow}>
                        <TouchableOpacity
                            style={[styles.reserveButton, !isActionable && styles.reserveButtonDisabled]}
                            onPress={() => handleReserve(item)}
                            disabled={!isActionable}
                        >
                            <Text style={styles.reserveButtonText}>
                                 {isActionable ? "Reserve" : (isReservedByOther ? "Reserved" : statusInfo.text) }
                             </Text>
                        </TouchableOpacity>

                        {item.postedBy !== netId && ( // Only show report if not own post
                            <TouchableOpacity style={styles.reportButton} onPress={() => handleReport(item)}>
                                 <Ionicons name="flag-outline" size={20} color="#6c757d" />
                             </TouchableOpacity>
                         )}
                     </View>
                 </View>
            </View>
        );
    };

    if (loading && foodItems.length === 0) { // Show loader only on initial load
        return <ActivityIndicator size="large" color="#0000ff" style={styles.originalLoader} />;
    }

return (
    <View style={styles.originalContainer}>
        <TouchableOpacity 
            onPress={() => router.push('../FoodPostScreen')} 
            style={styles.originalPostButton}
        >
            <Text style={styles.originalPostButtonText}>Post Food</Text>
        </TouchableOpacity>

        <TouchableOpacity 
            onPress={() => setModalVisible(true)} 
            style={styles.originalSearchButton}
        >
            <Text style={styles.originalSearchButtonText}>Search</Text>
        </TouchableOpacity>

        <Modal
            animationType="slide"
            transparent={true}
            visible={modalVisible}
            onRequestClose={() => setModalVisible(false)}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    <Text style={styles.modalTitle}>Search Filters</Text>
                    
                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Food Name</Text>
                        <TextInput
                            placeholder="e.g. Pizza, Salad"
                            placeholderTextColor="#999"
                            style={styles.inputField}
                            value={foodNameFilter}
                            onChangeText={setFoodNameFilter}
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Category</Text>
                        <TextInput
                            placeholder="e.g. Breakfast, Snacks"
                            placeholderTextColor="#999"
                            style={styles.inputField}
                            value={categoryFilter}
                            onChangeText={setCategoryFilter}
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Pickup Location</Text>
                        <TextInput
                            placeholder="e.g. C2"
                            placeholderTextColor="#999"
                            style={styles.inputField}
                            value={pickupLocationFilter}
                            onChangeText={setPickupLocationFilter}
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>Pickup Time</Text>
                        <TextInput
                            placeholder="e.g. 10:00 PM"
                            placeholderTextColor="#999"
                            style={styles.inputField}
                            value={pickupTimeFilter}
                            onChangeText={setPickupTimeFilter}
                        />
                    </View>

                    <View style={styles.buttonRow}>
                        <TouchableOpacity 
                            style={[styles.button, styles.closeButton]}
                            onPress={() => setModalVisible(false)}
                        >
                            <Text style={styles.buttonText}>Close</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={[styles.button, styles.applyButton]}
                            onPress={applyFilters}
                            disabled={isFiltering}
                        >
                            {isFiltering ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.buttonText}>Apply Filters</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>

        <FlatList
            data={foodItems}
            keyExtractor={(item) => (item._id || item.id).toString()}
            renderItem={renderItem}
            ListEmptyComponent={() => (
                <Text style={{ textAlign: 'center', marginTop: 50, fontSize: 16, color: 'grey' }}>
                    {foodNameFilter || categoryFilter || pickupLocationFilter || pickupTimeFilter ? (
                        <Text style={{ textAlign: 'center', marginTop: 50, fontSize: 16, color: 'grey' }}>
                            No items match your search. Try using different filters!
                        </Text>
                    ) : (
                        <Text style={{ textAlign: 'center', marginTop: 50, fontSize: 16, color: 'grey' }}>
                            There are no active food posts at the moment. Check back later!
                        </Text>
                    )}
                </Text>
            )}
        />
    </View>
);
};

const MyPostsTab = () => {
    const router = useRouter();
    const [myFoodItems, setMyFoodItems] = useState<FoodItem[]>([]);
    const [loading, setLoading] = useState(true);

     useEffect(() => {
         const fetchMyFoodItems = async () => {
             if (!netId) {
                 console.log("MyPostsTab: Waiting for netId...");
                 return; // Wait for netId
             }
            setLoading(true);
            try {
                const data = await getFoodItems();
                 const myItems = data.filter((item: FoodItem) => item.postedBy === netId);
                const filteredData = filterExpiredItems(myItems);
                 const sortedData = filteredData.sort(
                     (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
                 );
                setMyFoodItems(sortedData);
            } catch (error) {
                console.error("Failed to fetch my food items:", error);
            } finally {
                setLoading(false);
            }
         };

         if(netId) fetchMyFoodItems();
         const intervalId = setInterval(() => {
             if (netId && myFoodItems.length === 0 && !loading) {
                 fetchMyFoodItems();
                 clearInterval(intervalId);
             } else if (netId || loading) { 
                 clearInterval(intervalId);
             }
         }, 1000);

          return () => clearInterval(intervalId); 
     }, [netId]);


    const renderItem = ({ item }: { item: FoodItem }) => {
        const statusInfo = getStatusPresentation(item.status);
        const reservedUser = item.status === 'yellow' && item.reservedBy ? ` (by ${item.reservedBy})` : '';

        return (
            <View style={styles.card}>
                 <View>
                    <Image
                        source={{ uri: item.photo || 'https://via.placeholder.com/300x150.png?text=No+Image' }}
                        style={styles.cardImage}
                        resizeMode="cover"
                     />
                    {item.category ? (
                        <View style={styles.categoryTagContainer}>
                             <Text style={styles.categoryTagText}>{item.category}</Text>
                         </View>
                     ) : null}
                 </View>

                <View style={styles.cardContent}>
                    <View style={styles.cardHeaderRow}>
                        <Text style={styles.cardTitle} numberOfLines={1}>{item.foodName}</Text>
                         <View style={[
                             styles.statusBadge,
                             statusInfo.colorHint === 'green' ? styles.statusBadgeGreen :
                             statusInfo.colorHint === 'orange' ? styles.statusBadgeOrange :
                             statusInfo.colorHint === 'red' ? styles.statusBadgeRed :
                             styles.statusBadgeGray
                         ]}>
                            <Text style={styles.statusBadgeText}>{statusInfo.text}{reservedUser}</Text>
                         </View>
                     </View>

                     <View style={styles.cardDetailsSection}>
                         <Text style={styles.cardDetailText}>📍 {item.pickupLocation}</Text>
                         <Text style={styles.cardDetailText}>🕒 Pickup: {formatDateTime(item.pickupTime)}</Text>
                         <Text style={styles.cardDetailText}>⏳ Expires: {formatDateTime(item.expirationTime)}</Text>
                        <Text style={styles.cardDetailText}>📦 Quantity: {item.quantity}</Text>
                        <Text style={styles.cardDetailText}>🚨 Reports: {item.reportCount}</Text>
                     </View>
                </View>
            </View>
        );
    };

    if (loading) {
        return <ActivityIndicator size="large" color="#0000ff" style={styles.originalLoader} />;
    }
     if (!netId && !loading) { 
         return (
             <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                 <Text style={{ color: 'grey', fontSize: 16 }}>Loading user info...</Text>
             </View>
         );
     }

    return (
         <View style={styles.originalContainer}>
            {myFoodItems.length === 0 ? (
                <View style={styles.originalEmptyState}>
                    <Text style={styles.originalEmptyStateText}>You haven't posted any food items yet.</Text>
                    <TouchableOpacity
                        onPress={() => router.push('../FoodPostScreen')}
                        style={styles.originalPostButton}
                    >
                        <Text style={styles.originalPostButtonText}>Post Food Now</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={myFoodItems}
                    keyExtractor={(item) => (item._id || item.id).toString()}
                    renderItem={renderItem}
                 />
            )}
        </View>
    );
};


const MyReservationsTab = () => {
    const router = useRouter();
    const [reservedItems, setReservedItems] = useState<FoodItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReservedItems = async () => {
            if (!netId) {
                console.log("MyReservationsTab: Waiting for netId...");
                return; 
             }
            setLoading(true);
            try {
                const data = await getFoodItems();
                const myReservations = data.filter((item: FoodItem) =>
                    item.reservedBy === netId && item.status === 'yellow' // Only show active reservations for the user
                );
                const filteredData = filterExpiredItems(myReservations);
                 const sortedData = filteredData.sort( // Sort reservations
                     (a, b) => new Date(a.expirationTime).getTime() - new Date(b.expirationTime).getTime() 
                 );
                setReservedItems(sortedData);
            } catch (error) {
                console.error("Failed to fetch reserved items:", error);
            } finally {
                setLoading(false);
            }
         };

         if (netId) fetchReservedItems();
         const intervalId = setInterval(() => {
             if (netId && reservedItems.length === 0 && !loading) {
                 fetchReservedItems();
                 clearInterval(intervalId);
             } else if (netId || loading) {
                 clearInterval(intervalId);
             }
         }, 1000);
         return () => clearInterval(intervalId); // Cleanup interval

     }, [netId]); 

     
const handleCompleteTransaction = async (item: FoodItem) => {
    if (!netId) {
        alert("User information not available.");
        return;
    }

    const confirmPickup = confirm("Mark this item as picked up?");
    if (!confirmPickup) {
        return; // Exit if the user cancels the confirmation
    }

    try {
        await completeTransaction(item.id, netId);
        alert("Transaction completed successfully!");
        setReservedItems(prevItems => prevItems.filter(i => i.id !== item.id));
    } catch (error) {
        console.error("Failed to complete transaction:", error);
        const errorMessage = error instanceof Error ? error.message : "Please try again.";
        alert(`Failed to complete transaction: ${errorMessage}`);
    }
};


     const handleReport = (item: FoodItem) => { 
        const foodIdentifier = item._id || item.id;
        if (!foodIdentifier) {
             console.error("Cannot report: Missing item identifier.", item);
             alert("Cannot report this item: ID missing.");
            return;
        }
        try {
            router.push({
                pathname: '../ReportScreen',
                params: { foodId: foodIdentifier.toString(), foodName: item.foodName }
            });
        } catch (error) {
            console.error('Report navigation error:', error);
            alert("Error navigating to report screen.");
        }
    };

     const renderItem = ({ item }: { item: FoodItem }) => {
         const statusInfo = getStatusPresentation('yellow', true);
         const isPickupPending = item.status === 'yellow' && item.reservedBy === netId; // Should always be true here

        return (
            <View style={styles.card}>
                <View>
                     <Image
                         source={{ uri: item.photo || 'https://via.placeholder.com/300x150.png?text=No+Image' }}
                         style={styles.cardImage}
                         resizeMode="cover"
                     />
                    {item.category ? (
                        <View style={styles.categoryTagContainer}>
                             <Text style={styles.categoryTagText}>{item.category}</Text>
                         </View>
                     ) : null}
                 </View>

                <View style={styles.cardContent}>
                    <View style={styles.cardHeaderRow}>
                        <Text style={styles.cardTitle} numberOfLines={1}>{item.foodName}</Text>
                        <View style={[styles.statusBadge, styles.statusBadgeOrange]}>
                             <Text style={styles.statusBadgeText}>{statusInfo.text}</Text>
                        </View>
                    </View>

                    <View style={styles.cardDetailsSection}>
                        <Text style={styles.cardDetailText}>📍 {item.pickupLocation}</Text>
                        <Text style={styles.cardDetailText}>🕒 Pickup: {formatDateTime(item.pickupTime)}</Text>
                        <Text style={styles.cardDetailText}>⏳ Expires: {formatDateTime(item.expirationTime)}</Text>
                        <Text style={styles.cardDetailText}>👤 Posted by: {item.postedBy}</Text>
                        <Text style={styles.cardDetailText}>📦 Quantity: {item.quantity}</Text>
                    </View>

                    <View style={styles.cardActionsRow}>
                         {isPickupPending && (
                             <TouchableOpacity
                                style={styles.completeButton} 
                                onPress={() => handleCompleteTransaction(item)}
                            >
                                <Text style={styles.completeButtonText}>Mark Picked Up</Text>
                            </TouchableOpacity>
                         )}
                        <TouchableOpacity style={styles.reportButton} onPress={() => handleReport(item)}>
                             <Ionicons name="flag-outline" size={20} color="#6c757d" />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    };

    if (loading) {
        return <ActivityIndicator size="large" color="#0000ff" style={styles.originalLoader} />;
    }
     if (!netId && !loading) {
        return (
             <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: 'grey', fontSize: 16 }}>Loading user info...</Text>
            </View>
         );
     }

    return (
         <View style={styles.originalContainer}>
            {reservedItems.length === 0 ? (
                <View style={styles.originalEmptyState}>
                    <Text style={styles.originalEmptyStateText}>You do not have any active reservations!.</Text>
                </View>
            ) : (
                <FlatList
                    data={reservedItems}
                    keyExtractor={(item) => (item._id || item.id).toString()}
                    renderItem={renderItem} 
                />
            )}
        </View>
    );
};


const MarketPlaceScreen = () => {
    return (
        <Tab.Navigator>
            <Tab.Screen name="Marketplace" component={MarketplaceTab} />
            <Tab.Screen name="My Active Posts" component={MyPostsTab} />
            <Tab.Screen name="My Active Reservations" component={MyReservationsTab} />
        </Tab.Navigator>
    );
};



const styles = StyleSheet.create({
    card: {
        backgroundColor: "#FFFFFF",
        borderRadius: 5,         
        marginVertical: 8,     
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.18,
        shadowRadius: 1.00,
        elevation: 1,
        overflow: 'hidden', 
        borderWidth: 1, 
        borderColor: 'black', 
        marginHorizontal: 30, 
    },
    cardImage: {
        width: "100%",
        height: 150, 
        
    },
    categoryTagContainer: { 
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(0, 0, 0, 0.6)', 
        borderRadius: 4,
        paddingHorizontal: 6,
        paddingVertical: 3,
    },
    categoryTagText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '600',
    },
    cardContent: {
        padding: 12, 
    },
    cardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    cardTitle: {
        fontSize: 17, 
        fontWeight: "bold",
        color: "#333333",
        flex: 1, 
        marginRight: 8, 
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12, // Pill shape
        minWidth: 70, // Ensure badge has some width
        alignItems: 'center',
    },
    statusBadgeText: {
        fontSize: 11,
        fontWeight: "bold",
        color: '#FFFFFF', // Default white text for badges
    },
    statusBadgeGreen: { backgroundColor: '#28a745' }, // Available
    statusBadgeOrange: { backgroundColor: '#fd7e14' }, // Reserved
    statusBadgeRed: { backgroundColor: '#dc3545' }, // Unavailable
    statusBadgeGray: { backgroundColor: '#6c757d' }, // Unknown/Other

    cardDetailsSection: {
        marginBottom: 10, // Space before actions
    },
    cardDetailText: {
        fontSize: 13,
        color: "#555555", // Slightly lighter text for details
        marginBottom: 4, // Spacing between detail lines
    },
    cardActionsRow: {
        flexDirection: "row",
        justifyContent: "space-between", // Button left, icon right
        alignItems: "center",
        marginTop: 5, // Space above actions
        paddingTop: 5, // Optional top padding for visual separation
    },
    reserveButton: {
        backgroundColor: "#333333", 
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 5,
        flexGrow: 1, // Let button take most width
        marginRight: 10, // Space before report icon
        alignItems: 'center', // Center text
    },
    reserveButtonDisabled: {
        backgroundColor: "#cccccc", // Greyed out when disabled
    },
    reserveButtonText: {
        color: "#FFFFFF",
        fontWeight: "bold",
        fontSize: 13,
    },
    completeButton: { // Style for the "Mark Picked Up" button
        backgroundColor: "#28a745", // Green for completion action
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 5,
        flexGrow: 1,
        marginRight: 10,
        alignItems: 'center',
    },
    completeButtonText: {
        color: "#FFFFFF",
        fontWeight: "bold",
        fontSize: 13,
    },
    reportButton: { // Just the icon touchable area
        padding: 5, // Make it easier to press
    },

    originalContainer: {
        flex: 1,
        backgroundColor: '#fff', 
    },
    originalLoader: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
         marginTop: 50,
    },
    originalPostButton: { backgroundColor: 'blue', padding: 10, borderRadius: 5, margin: 10 },
    originalPostButtonText: { color: 'white', textAlign: 'center' },
    originalSearchButton: { backgroundColor: 'green', padding: 10, borderRadius: 5, margin: 10 },
    originalSearchButtonText: { color: 'white', textAlign: 'center' },
    originalModalView: {
         margin: 20,
         backgroundColor: "white",
         borderRadius: 20,
         padding: 35,
         alignItems: "center",
         shadowColor: "#000",
         shadowOffset: { width: 0, height: 2 },
         shadowOpacity: 0.25,
         shadowRadius: 4,
         elevation: 5,
         marginTop: '30%', // Position modal lower
    },
    originalInput: {
        height: 40,
        borderColor: 'gray',
        borderWidth: 1,
        marginBottom: 10,
        paddingHorizontal: 10,
        width: '100%', // Make inputs wider
    },
    originalEmptyState: {
        flex: 1, // Allow centering
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    originalEmptyStateText: {
        fontSize: 16,
        color: 'grey',
        textAlign: 'center',
        marginBottom: 15,
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContainer: {
        width: '90%',
        backgroundColor: 'white',
        borderRadius: 10,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 20,
        color: '#333',
        textAlign: 'center',
    },
    inputContainer: {
        marginBottom: 15,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 5,
        color: '#555',
    },
    inputField: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        backgroundColor: '#f9f9f9',
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    button: {
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 20,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '48%',
    },
    closeButton: {
        backgroundColor: '#6c757d',
    },
    applyButton: {
        backgroundColor: '#28a745',
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
});

export default MarketPlaceScreen;