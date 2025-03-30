// import axios from "axios";

// const API_URL = "http://127.0.0.1:8000/api"; // Use your local IP if testing on a phone

// // Function to post food items
// export const postFood = async (foodData) => {
//     try {
//         const formData = new FormData();
//         formData.append("foodName", foodData.foodName);
//         formData.append("quantity", foodData.quantity);
//         formData.append("category", foodData.category);
//         formData.append("dietaryInfo", foodData.dietaryInfo || ""); // Optional field
//         formData.append("pickupLocation", foodData.pickupLocation);
//         formData.append("pickupTime", foodData.pickupTime);

//         // Handle Image Upload (Just use the image URI path instead of converting to Base64)
//         if (foodData.photo) {
//             formData.append("photo", foodData.photo.uri); // Sending the URI of the photo
//         }

//         // Log the formData to see what's being sent
//         for (let [key, value] of formData.entries()) {
//             console.log(key, value);
//         }

//         // Send the request without explicitly setting the Content-Type (axios will handle it)
//         const response = await axios.post(API_URL, formData);
//         return response.data;
//     } catch (error) {
//         console.error("Error posting food:", error);
//         throw error;
//     }
// };


// // Function to get food items for the marketplace
// export const getFoodItems = async () => {
//     try {
//         const response = await axios.get(`${API_URL}/get-all-food`);
//         return response.data;
//     } catch (error) {
//         console.error("Error fetching food items:", error);
//         throw error;
//     }
// };


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

        // Handle Image Upload
        if (foodData.photo) {
            formData.append("photo", {
                uri: foodData.photo.uri,
                name: "food_image.jpg",
                type: "image/jpeg",
            });
        }

        const response = await axios.post(API_URL, formData, {
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
