import axios from "axios";
import { Alert } from "react-native";

const API_URL = "http://127.0.0.1:8000/api/food"; 
const USER_API_URL = "http://127.0.0.1:8000/api/users";

export const postFood = async (foodData) => {
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
                        console.log(key, value);
                    }

        const response = await axios.post("http://127.0.0.1:8000/api/food", formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
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

// New user-related functions
export const registerUser = async (userData) => {
    try {
        console.log("Registering user:", userData);
        
        // The backend expects a JSON body for user registration
        const response = await axios.post(`${USER_API_URL}/register`, userData, {
            headers: { "Content-Type": "application/json" },
        });
        
        console.log("User registration response:", response.data);
        return response.data;
    } catch (error) {
        console.error("Error registering user:", error);
        throw error;
    }
};

export const getUser = async (googleId) => {
    try {
        if (!googleId) {
            throw new Error("Google ID is required to fetch user data");
        }
        
        console.log("Fetching user with Google ID:", googleId);
        const response = await axios.get(`${USER_API_URL}/${googleId}`);
        console.log("User data retrieved:", response.data);
        return response.data;
    } catch (error) {
        console.error("Error fetching user:", error);
        throw error;
    }
};
 


  
export const submitReport = async (postId, message, user1Id, user2Id) => {
    try {
      const response = await fetch("http://localhost:8000/api/report", {
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
  

export default {
    postFood,
    getFoodItems,
    searchFoodItems,
    reserveFood,
    submitReport,
    registerUser,
    getUser
 }
 

