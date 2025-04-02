import React, { useState } from "react";
import { View, Text, TextInput, Button, Image, Alert, StyleSheet, TouchableOpacity } from "react-native";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css"; // Required for Web
import * as ImagePicker from "react-native-image-picker";
import { postFood,getGoogleId, getNetId  } from "../apiService";
import { AuthGuard } from "@/components/AuthGuard"; // Import the AuthGuard

const FoodPostScreen = () => {
    const [foodName, setFoodName] = useState("");
    const [quantity, setQuantity] = useState("");
    const [category, setCategory] = useState("");
    const [dietaryInfo, setDietaryInfo] = useState("");
    const [pickupLocation, setPickupLocation] = useState("");
    const [pickupTime, setPickupTime] = useState<Date | null>(null);
    const [expirationTime, setExpirationTime] = useState<Date | null>(null);
    const [photo, setPhoto] = useState<{ uri: string; type?: string; name?: string } | null>(null);

    const pickImage = () => {
        ImagePicker.launchImageLibrary({ mediaType: "photo" }, (response) => {
            if (response.didCancel) {
                console.log("User cancelled image picker");
            } else if (response.errorCode || response.errorMessage) {
                console.log("ImagePicker Error: ", response.errorCode, response.errorMessage);
            } else {
                if (response.assets && response.assets.length > 0) {
                    const selectedPhoto = response.assets[0];
                    if (selectedPhoto.uri) {
                        setPhoto({
                            uri: selectedPhoto.uri,
                            type: selectedPhoto.type || "image/jpeg",
                            name: selectedPhoto.fileName || selectedPhoto.uri.split("/").pop(),
                        });
                    } else {
                        console.log("Image asset does not have a valid URI");
                    }
                }
            }
        });
    };

    const handleSubmit = async () => {
        console.log("Submitting food post...");
        if (!foodName || !quantity || !category || !pickupLocation || !pickupTime || !photo) {
            Alert.alert("Error", "Please fill all required fields and upload an image.");
            return;
        }
         // Retrieve googleId from AsyncStorage
         const googleId = await getGoogleId();
         console.log("Google ID:", googleId);
         if (!googleId) {
             Alert.alert("Error", "Failed to retrieve Google ID. Please log in again.");
             return;
         }
        

         // Fetch netId using googleId
         const netId = await getNetId(googleId);
         if (!netId) {
             Alert.alert("Error", "Failed to retrieve Net ID. Please try again.");
             return;
         }

        

        const foodData = {
            foodName,
            quantity,
            category,
            dietaryInfo,
            pickupLocation,
            pickupTime: pickupTime.toISOString(),
            expirationTime: expirationTime ? expirationTime.toISOString() : null,
            photo: photo,
            user: netId,
            createdAt: new Date().toISOString(),
        };

        try {
            
            const response = await postFood(foodData);
            Alert.alert("Success", response.message);
        } catch (error) {
            Alert.alert("Error", "Failed to post food.");
        }
    };

    return (
        <View style={styles.container}>
            <Text>Food Name</Text>
            <TextInput value={foodName} onChangeText={setFoodName} style={styles.input} />

            <Text>Quantity</Text>
            <TextInput value={quantity} onChangeText={setQuantity} keyboardType="numeric" style={styles.input} />

            <Text>Category</Text>
            <TextInput value={category} onChangeText={setCategory} style={styles.input} />

            <Text>Dietary Info (optional)</Text>
            <TextInput value={dietaryInfo} onChangeText={setDietaryInfo} style={styles.input} />

            <Text>Pickup Location</Text>
            <TextInput value={pickupLocation} onChangeText={setPickupLocation} style={styles.input} />

            {/* Pickup Time */}
            <Text>Pickup Time</Text>
            <DatePicker
                selected={pickupTime}
                onChange={(date) => setPickupTime(date)}
                showTimeSelect
                showTimeSelectOnly
                timeIntervals={15}
                timeCaption="Pickup Time"
                dateFormat="hh:mm aa"
                className="datepicker-input"
            />

            {/* Expiration Time */}
            <Text>Expiration Time</Text>
            <DatePicker
                selected={expirationTime}
                onChange={(date) => setExpirationTime(date)}
                showTimeSelect
                showTimeSelectOnly
                timeIntervals={15}
                timeCaption="Expiration Time"
                dateFormat="hh:mm aa"
                className="datepicker-input"
            />

            <Button title="Pick an Image" onPress={pickImage} />
            {photo && <Image source={{ uri: photo.uri }} style={styles.image} />}

            <Button title="Submit Post" onPress={handleSubmit} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: "#fff",
    },
    input: {
        borderWidth: 1,
        borderColor: "#ccc",
        marginBottom: 10,
        padding: 10,
        backgroundColor: "#fff",
        color: "#000",
    },
    image: {
        width: 100,
        height: 100,
        marginTop: 10,
    },
});

// export default FoodPostScreen;

export default function ProtectedFoodPostScreen() {
    return (
        <AuthGuard>
            <FoodPostScreen />
        </AuthGuard>
    );
}