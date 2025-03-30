import React, { useState } from "react";
import { View, Text, TextInput, Button, Image, Alert, StyleSheet } from "react-native";
import * as ImagePicker from "react-native-image-picker";
import { postFood } from "../apiService";

const FoodPostScreen = () => {
    const [foodName, setFoodName] = useState("");
    const [quantity, setQuantity] = useState("");
    const [category, setCategory] = useState("");
    const [dietaryInfo, setDietaryInfo] = useState("");
    const [pickupLocation, setPickupLocation] = useState("");
    const [pickupTime, setPickupTime] = useState("");
    const [photo, setPhoto] = useState<{ uri: string } | null>(null);

    const pickImage = () => {
        ImagePicker.launchImageLibrary({ mediaType: "photo" }, (response) => {
            if (response.didCancel) {
                console.log("User cancelled image picker");
            } else if (response.errorCode || response.errorMessage) {
                console.log("ImagePicker Error: ", response.errorCode, response.errorMessage);
            } else {
                if (response.assets && response.assets.length > 0) {
                    if (response.assets[0].uri) {
                        setPhoto({ uri: response.assets[0].uri });  // Ensure uri is defined
                    } else {
                        console.log("Image asset does not have a valid URI");
                    }
                }
            }
        });
    };

    const handleSubmit = async () => {
        if (!foodName || !quantity || !category || !pickupLocation || !pickupTime || !photo) {
            Alert.alert("Error", "Please fill all required fields and upload an image.");
            return;
        }

        const foodData = {
            foodName,
            quantity,
            category,
            dietaryInfo,
            pickupLocation,
            pickupTime,
            photo: photo,  // Pass the entire photo object
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

            <Text>Pickup Time</Text>
            <TextInput value={pickupTime} onChangeText={setPickupTime} style={styles.input} />

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
        backgroundColor: "#fff"
    },
    input: { 
        borderWidth: 1, 
        borderColor: "#ccc", 
        marginBottom: 10, 
        padding: 10, 
        backgroundColor: "#fff", 
        color: "#000"
    },
    image: { 
        width: 100, 
        height: 100, 
        marginTop: 10 
    }
});

export default FoodPostScreen;
