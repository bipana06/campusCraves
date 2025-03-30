import axios from "axios";

const API_URL = "http://127.0.0.1:8000/api/food"; // Use your local IP if testing on a phone

export const postFood = async (foodData) => {
    try {
        const formData = new FormData();
        formData.append("foodName", foodData.foodName);
        formData.append("quantity", foodData.quantity);
        formData.append("category", foodData.category);
        formData.append("dietaryInfo", foodData.dietaryInfo || ""); // Optional field
        formData.append("pickupLocation", foodData.pickupLocation);
        formData.append("pickupTime", foodData.pickupTime);

        // Handle Image Upload (Just use the image URI path instead of converting to Base64)
        if (foodData.photo) {
            formData.append("photo", foodData.photo.uri); // Sending the URI of the photo
        }

        // Log the formData to see what's being sent
        for (let [key, value] of formData.entries()) {
            console.log(key, value);
        }

        // Send the request without explicitly setting the Content-Type (axios will handle it)
        const response = await axios.post(API_URL, formData);
        return response.data;
    } catch (error) {
        console.error("Error posting food:", error);
        throw error;
    }
};
