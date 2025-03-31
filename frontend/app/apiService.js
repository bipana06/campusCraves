import axios from "axios";

const API_URL = "http://127.0.0.1:8000/api/food"; 
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

export default{
    postFood,
    getFoodItems
}