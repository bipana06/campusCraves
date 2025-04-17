

import React, { useEffect, useState } from "react";
import { View, Text, FlatList, Image, ActivityIndicator, StyleSheet, Button, TextInput,
    Modal,
    TouchableOpacity,} from "react-native";
import { getFoodItems, reserveFood, searchFoodItems, completeTransaction,getGoogleId, getNetId   } from "../apiService";

import { useRouter } from "expo-router";

import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
const Tab = createMaterialTopTabNavigator();

const MarketPlaceScreen = () => {
    return (
        <Tab.Navigator>
            <Tab.Screen name="Marketplace" component={MarketplaceTab} />
            <Tab.Screen name="My Active Posts" component={MyPostsTab} />
            <Tab.Screen name="My Active Reservations" component={MyReservationsTab} />
        </Tab.Navigator>
    );
};
let googleId: string | null = null;
let netId: string | null = null;

const initializeGlobalData = async () => {
  googleId = await getGoogleId();
  console.log("Google ID:", googleId);
  
  if (!googleId) return;

  netId = await getNetId(googleId);
};

initializeGlobalData();

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
   reservedBy: string;
}


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
        
      


        if (!netId) {
            return;
        }
        
    // Check if the current user is the same as the person who posted the food
    if (item.postedBy === netId) {
        alert("You cannot reserve food that you posted.");
        return;
    }


        try {
            const user = netId; // Replace with the actual logged-in user's identifier
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
        try {
            router.push({
                pathname: '../ReportScreen',
                params: { foodId: item.id, foodName: item.foodName }
            });
        } catch (error) {
            console.error('Report navigation error:', error);
        }
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
    <TouchableOpacity onPress={() => router.push('../FoodPostScreen')} style={styles.postButton}>
                    <Text style={styles.postButtonText}>Post Food</Text>
                </TouchableOpacity>

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




const MyPostsTab = () => {
    const router = useRouter();
       
    
        const [myFoodItems, setMyFoodItems] = useState<FoodItem[]>([]);
       const [loading, setLoading] = useState(true);

       
    
    
       useEffect(() => {

           const fetchMyFoodItems = async () => {
            
        
               try {
                   const data = await getFoodItems();
                   // Filter items where postedBy matches currentUser
                const myItems: FoodItem[] = data.filter((item: FoodItem) => item.postedBy === netId);  const filteredData = filterExpiredItems(myItems);
                   setMyFoodItems(filteredData);
               } catch (error) {
                   console.error("Failed to fetch my food items:", error);
               } finally {
                   setLoading(false);
               }
           };
    
    
           fetchMyFoodItems();
       }, []);
    
    
       const getStatusStyle = (status?: string) => {
           if (!status) {
               return { text: "Unknown", color: "gray" };
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
    
    
       const formatDateTime = (dateString: string): string => {
           const date = new Date(dateString);
           if (isNaN(date.getTime())) {
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
       const isCompleted = item.status === "red";
    
    
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
                   <Text style={styles.detail}>Report Count: {item.reportCount}</Text>
                   <Text style={styles.detail}>Created At: {formatDateTime(item.createdAt)}</Text>
                   <Text style={styles.detail}>Expiration Time: {formatDateTime(item.expirationTime)}</Text>
                  
               </View>
           </View>
       );
    };
    
    
       if (loading) {
           return <ActivityIndicator size="large" color="#0000ff" style={styles.loader} />;
       }
    
    
       return (
           <View style={styles.container}>
               <View style={styles.header}>
                   <Text style={styles.title}>My Food Posts</Text>
                   <Text style={styles.userText}>{netId}</Text>
               </View>
    
    
               {myFoodItems.length === 0 ? (
                   <View style={styles.emptyState}>
                       <Text style={styles.emptyStateText}>You haven't posted any food items yet.</Text>
                       <TouchableOpacity
                           onPress={() => router.push('../FoodPostScreen')}
                           style={styles.postButton}
                       >
                           <Text style={styles.postButtonText}>Post Food Now</Text>
                       </TouchableOpacity>
                   </View>
               ) : (
                   <FlatList
                       data={myFoodItems}
                       keyExtractor={(item) => item.id.toString()}
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
         // Replace with your actual current user identifier
          
       useEffect(() => {
           const fetchReservedItems = async () => {
           
    
               try {

                   const data = await getFoodItems();
                   // Filter items where reservedBy matches currentUser
                const myReservations: FoodItem[] = data.filter((item: FoodItem) =>
                    item.reservedBy === netId
                );  
                console.log("My Reservations:", myReservations);
                
                const filteredData = filterExpiredItems(myReservations);
                   setReservedItems(filteredData);
               } catch (error) {
                   console.error("Failed to fetch reserved items:", error);
               } finally {
                   setLoading(false);
               }
           };
    
    
           fetchReservedItems();
       }, []);
    
    
       const getStatusStyle = (status?: string) => {
           if (!status) {
               return { text: "Unknown", color: "gray" };
           }
      
           switch (status.toLowerCase()) {
               case "green":
                   return { text: "Available", color: "green" };
               case "yellow":
                   return { text: "Reserved by You", color: "orange" };
               case "red":
                   return { text: "Completed", color: "red" };
               default:
                   return { text: "Unknown", color: "gray" };
           }
       };
    
    
       const formatDateTime = (dateString: string): string => {
           const date = new Date(dateString);
           if (isNaN(date.getTime())) {
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
           const isCompleted = item.status === "red";
           const isReserved = item.status === "yellow" && item.reservedBy === netId;
    
    
           const handleCompleteTransaction = async () => {
               try {
                   // Call the API to mark the transaction as complete
                   await completeTransaction(item.id, netId);
                   console.log("Transaction completed successfully");
                  
                   // Update the UI state
                   setReservedItems(prevItems =>
                       prevItems.map(item =>
                           item.id === item.id
                               ? { ...item, status: "red" }
                               : item
                       )
                   );
                   alert("Transaction completed successfully!");
               } catch (error) {
                   console.error("Failed to complete transaction:", error);
                   if (error instanceof Error) {
                       alert(`Failed to complete transaction: ${error.message}`);
                   } else {
                       alert("Failed to complete transaction: An unknown error occurred.");
                   }
               }
           };
    
    
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

    
    
                       {isReserved && !isCompleted && (
                           <>
                               <TouchableOpacity
                                   style={styles.completeButton}
                                   onPress={() => handleCompleteTransaction()}
                               >
                                   <Text style={styles.completeButtonText}>
                                       Complete Transaction
                                   </Text>
                               </TouchableOpacity>


                              
                           </>
                       )}
    
    
                       {isCompleted && (
                           <Text style={[styles.detail, { color: 'red', fontWeight: 'bold' }]}>
                               Transaction Completed
                           </Text>
                       )}
                        <TouchableOpacity
                            style={styles.reportButton}
                            onPress={() => {
                                const foodId = item._id || item.id;
                                if (!foodId) {
                                    console.error("No valid ID found in item:", item);
                                    return;
                                }
                                router.push({
                                    pathname: '../ReportScreen',
                                    params: { 
                                        foodId: foodId,
                                        foodName: item.foodName 
                                    }
                                });
                            }}
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
               <View style={styles.header}>
                   <Text style={styles.title}>My Reservations</Text>
                   <Text style={styles.userText}>{netId}</Text>
               </View>
    
    
               {reservedItems.length === 0 ? (
                   <View style={styles.emptyState}>
                       <Text style={styles.emptyStateText}>You haven't reserved any food items yet.</Text>
                   </View>
               ) : (
                   <FlatList
                       data={reservedItems}
                       keyExtractor={(item) => item.id.toString()}
                       renderItem={renderItem}
                   />
               )}
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
        searchButton: {
           backgroundColor: "#007bff",
           paddingVertical: 10, // Adjust vertical padding for height
           paddingHorizontal: 20, // Adjust horizontal padding for width
           borderRadius: 5,
           alignItems: "center", // Center text horizontally
           justifyContent: "center", // Center text vertically
           alignSelf: "center", // Center the button within its parent container
           marginVertical: 10, // Add spacing above and below the butto
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
        postButton: {
           backgroundColor: "#28a745",
           paddingVertical: 10, // Adjust vertical padding for height
           paddingHorizontal: 20, // Adjust horizontal padding for width
           borderRadius: 5,
           alignItems: "center", // Center text horizontally
           justifyContent: "center", // Center text vertically
           alignSelf: "center", // Center the button within its parent container
           marginVertical: 10, // Add spacing above and below the button
        },
           postButtonText: { color: "#fff", fontWeight: "bold" },
           header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
           userText: { fontSize: 16, color: "gray" },
           emptyState: {
               flex: 1,
               justifyContent: 'center',
               alignItems: 'center',
               padding: 20,
           },
           emptyStateText: {
               fontSize: 18,
               textAlign: 'center',
               marginBottom: 20,
           },
           completeButton: {
               backgroundColor: '#4CAF50',
               padding: 10,
               borderRadius: 5,
               marginTop: 10,
               alignItems: 'center',
           },
           completedButton: {
               backgroundColor: '#cccccc',
           },
           completeButtonText: {
               color: 'white',
               fontWeight: 'bold',
           },
        });
        

export default MarketPlaceScreen;