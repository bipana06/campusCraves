import axios from "axios";
import { Alert } from "react-native";

// const API_URL = "http://127.0.0.1:10000/api/food"; 
// const USER_API_URL = "http://127.0.0.1:10000/api/users";
const API_URL = "https://campuscraves.onrender.com/api/food"; 
const USER_API_URL = "https://campuscraves.onrender.com/api/users";
const API_framework = "https://campuscraves.onrender.com/"

export const postFood = async (foodData) => {
    console.log("Posting food data:", foodData);
    try {
        const formData = new FormData();
        formData.append("foodName", foodData.foodName);
        formData.append("quantity", foodData.quantity);
        formData.append("category", foodData.category);
        formData.append("dietaryInfo", foodData.dietaryInfo || "");
        formData.append("pickupLocation", foodData.pickupLocation);
        formData.append("pickupTime", foodData.pickupTime);
        formData.append("expirationTime", foodData.expirationTime);
        formData.append("createdAt", foodData.createdAt);

        // Serialize the photo object as a JSON string
        if (foodData.photo) {
            formData.append("photo", JSON.stringify(foodData.photo));
        }
       
        formData.append("user", foodData.user); // Replace with actual user ID
        for (let [key, value] of formData.entries()) {
                        console.log(key, value, typeof value);
                    }

        const response = await axios.post(API_URL, formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
        window.alert("Success", "Food item posted successfully!"); //to be replaced with Alert.alert
        if (Platform.OS === "web") {
            // Use browser's alert for web
            window.alert("Success", "Food item posted successfully!");
        } else {
            // Use React Native's Alert for mobile
            Alert.alert("Success", "Food item posted successfully!")
        }
        return response.data;
    } catch (error) {
        console.error("Error posting food:", error);
        throw error;
    }
};

export const getFoodItems = async () => {
    try {
        const response = await axios.get(API_URL);
        return response.data.food_posts; 
    } catch (error) {
        console.error("Error fetching food items:", error);
        throw error;
    }
};

export const reserveFood = async (foodId, user) => {
    try {
        const response = await axios.post(
            `${API_URL}/reserve`, // Ensure the correct endpoint is used
            {
                food_id: foodId,
                user: user,
            },
            {
                headers: {
                    "Content-Type": "application/json", // Explicitly set the content type to JSON
                },
            }
        );
        return response.data;
    } catch (error) {
        console.error("Error reserving food:", error.response?.data || error.message);
        throw error;
    }
};

export const completeTransaction = async (foodId, user) => {
    try {
        const formData = new FormData();
        formData.append("food_id", foodId);
        formData.append("user", user);
 
 
        const response = await axios.post(
            `${API_URL}/complete`,  // Note the /api prefix
            formData,
            {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            }
        );
        return response.data;
    } catch (error) {
        console.error("Error completing transaction:", error.response?.data || error.message);
        throw error;
    }
 };
 
// get the foods according to filters
export const searchFoodItems = async (filters) => {
    try {
        const response = await axios.get(`${API_URL}/search`, { params: filters });
        return response.data.food_posts;
    } catch (error) {
        console.error("Error fetching filtered food items:", error);
        throw error;
    }
 };

// // New user-related functions
// export const registerUser = async (userData) => {
//     try {
//         console.log("Registering user:", userData);
        
//         // The backend expects a JSON body for user registration
//         const response = await axios.post(`${USER_API_URL}/register`, userData, {
//             headers: { "Content-Type": "application/json" },
//         });
        
//         console.log("User registration response:", response.data);
//         return response.data;
//     } catch (error) {
//         console.error("Error registering user:", error);
//         throw error;
//     }
// };
export const registerUser = async (userData) => {
    try {
        console.log("Registering user:", userData);

        // Create a clean object with exactly the fields needed
        const dataToSend = {
            username: userData.username,
            email: userData.email,
            password: userData.password,
            netId: userData.netId,
            googleId: userData.netId, // Use netId as googleId
            fullName: userData.fullName,
            phoneNumber: userData.phoneNumber || null,
            picture: userData.picture || null
        };

        console.log("Sending data to server:", JSON.stringify(dataToSend, null, 2));

        // Use axios directly with the JSON data
        const response = await axios({
            method: 'post',
            url: `${USER_API_URL}/signup`,
            data: dataToSend,
            headers: { 'Content-Type': 'application/json' }
        });

        console.log("User registration response:", response.data);
        return response.data;
    } catch (error) {
        // Enhanced error logging
        console.error("Error registering user:", error);
        if (error.response) {
            console.error("Error details:", error.response.data);
            console.error("Status code:", error.response.status);
        }
        throw error;
    }
};


// export const getUser = async (googleId) => {
//     try {
//         if (!googleId) {
//             throw new Error("Google ID is required to fetch user data");
//         }
        
//         console.log("Fetching user with Google ID:", googleId);
//         const response = await axios.get(`${USER_API_URL}/${googleId}`);
//         console.log("User data retrieved:", response.data);
//         return response.data;
//     } catch (error) {
//         console.error("Error fetching user:", error);
//         throw error;
//     }
// };

// export const getNetId = async (googleId) => {
//     try {
//         if (!googleId) {
//             throw new Error("Google ID is required to fetch Net ID");
//         }

//         console.log("Fetching Net ID for Google ID:", googleId);
//         const response = await axios.get(`${USER_API_URL}/netid/${googleId}`); // Use path parameter
//         console.log("Net ID retrieved:", response.data.netId);
//         return response.data.netId;
//     } catch (error) {
//         console.error("Error fetching Net ID:", error.response?.data || error.message);
//         throw error;
//     }
// };

export const getUser = async (netId) => {
    try {
        if (!netId) throw new Error("Net ID is required to fetch user data");
        
        console.log("Fetching user with Net ID:", netId);
        const response = await axios.get(`${USER_API_URL}/${netId}`);
        console.log("User data retrieved:", response.data);
        return response.data;
    } catch (error) {
        console.error("Error fetching user:", error);
        throw error;
    }
};

export const getNetId = async (netId) => {
    try {
        if (!netId) throw new Error("Net ID is required to fetch Net ID");

        console.log("Fetching Net ID for:", netId);
        const response = await axios.get(`${USER_API_URL}/netid/${netId}`);
        console.log("Net ID retrieved:", response.data.netId);
        return response.data.netId;
    } catch (error) {
        console.error("Error fetching Net ID:", error.response?.data || error.message);
        throw error;
    }
};


import AsyncStorage from '@react-native-async-storage/async-storage';

export const getGoogleId = async () => {
    try {
        
        const storedUserInfo = await AsyncStorage.getItem('userInfo');
        if (storedUserInfo) {
            console.log("Retrieving googleId from AsyncStorage");
            const parsedUserInfo = JSON.parse(storedUserInfo);
            console.log("Parsed user info:", parsedUserInfo);

            // Use googleId if available, otherwise fallback to id
            const googleId = parsedUserInfo.googleId || parsedUserInfo.id;
            if (!googleId) {
                console.error("Neither googleId nor id is available in user info");
                return null;
            }

            return googleId; // Return the googleId or id
        } else {
            console.error("No user info found in AsyncStorage");
            return null;
        }
    } catch (error) {
        console.error("Error retrieving googleId from AsyncStorage:", error);
        return null;
    }
};

  
export const submitReport = async (postId, message, user1Id, user2Id) => {
    try {
      const response = await fetch(`${API_framework}api/report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded", // Ensure this matches FastAPI's expected format
        },
        body: new URLSearchParams({
          postId,
          message,
          user1Id: user1Id.toString(),
          user2Id: user2Id.toString(),
        }).toString(),
      });
  
      if (!response.ok) {
        throw new Error(`Error: ${response.statusText}`);
      }
  
      return await response.json();
    } catch (error) {
      console.error("submitReport error:", error);
      throw error;
    }
  };
// Add this to apiService.js
export const logoutUser = async () => {
    try {
      // Clear all authentication-related items from AsyncStorage
      await AsyncStorage.multiRemove(['userToken', 'userInfo', 'userProfile']);
      return { success: true };
    } catch (error) {
      console.error("Error during logout:", error);
      throw error;
    }
  };
  export const getPosterNetId = async (foodId) => {
    try {
        if (!foodId) {
            throw new Error("Food ID is required to fetch poster's Net ID");
        }

        console.log("Fetching poster's Net ID for food ID:", foodId);
        const response = await axios.get(`${API_URL}/poster-netid/${foodId}`);
        console.log("Poster's Net ID retrieved:", response.data.netId);
        return response.data.netId;
    } catch (error) {
        console.error("Error fetching poster's Net ID:", error.response?.data || error.message);
        throw error;
    }
};
export const canReportPost = async (postId, userId) => {
    try {
        const response = await axios.get(`${API_framework}api/report/can-report/${postId}/${userId}`);
      return response.data;

    } catch (error) {
      console.error("Error checking report eligibility:", error);
      throw error;
    }
  };

export default {
    postFood,
    getFoodItems,
    completeTransaction,
    getNetId,
    searchFoodItems,
    reserveFood,
    submitReport,
    registerUser,
    getUser,
    logoutUser,
    getPosterNetId,
    canReportPost
 }
 

