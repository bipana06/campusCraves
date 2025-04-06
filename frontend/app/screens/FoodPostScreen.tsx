import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    Button,
    Image,
    Alert,
    StyleSheet,
    ScrollView,
    TouchableOpacity
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import * as ImagePicker from "react-native-image-picker";
import { postFood, getGoogleId, getNetId } from "../apiService";
import { AuthGuard } from "@/components/AuthGuard";
import { useNavigation } from "@react-navigation/native"; // Import useNavigation


const FoodPostScreen = () => {
    const navigation = useNavigation();
    const [foodName, setFoodName] = useState("");
    const [quantity, setQuantity] = useState("");
    const [category, setCategory] = useState("snacks");
    const [dietaryInfo, setDietaryInfo] = useState("");
    const [pickupLocation, setPickupLocation] = useState("");
    const [pickupTime, setPickupTime] = useState<Date | null>(null);
    const [expirationTime, setExpirationTime] = useState<Date | null>(null);
    const [photo, setPhoto] = useState<{ uri: string; type?: string; name?: string } | null>(null);

    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const validateInputs = () => {
        let tempErrors: { [key: string]: string } = {};

        if (!foodName || /^\d+$/.test(foodName)) {
            tempErrors.foodName = "Food name cannot be empty or only numbers.";
        }
        if (!quantity || isNaN(Number(quantity)) || Number(quantity) <= 0) {
            tempErrors.quantity = "Quantity must be a positive number.";
        }
        if (!pickupTime) {
            tempErrors.pickupTime = "Select a valid pickup time.";
        }
        if (!expirationTime) {
            tempErrors.expirationTime = "Select a valid expiration time.";
        } else if (pickupTime && expirationTime <= pickupTime) {
            tempErrors.expirationTime = "Expiration must be after pickup.";
        }
        if (!pickupLocation.trim()) {
            tempErrors.pickupLocation = "Enter a pickup location.";
        }
        if (!photo) {
            tempErrors.photo = "Image is required.";
        }

        setErrors(tempErrors);
        return Object.keys(tempErrors).length === 0;
    };

    const pickImage = () => {
        ImagePicker.launchImageLibrary({ mediaType: "photo" }, (response) => {
            if (response.assets && response.assets.length > 0) {
                const selectedPhoto = response.assets[0];
                if (selectedPhoto.uri) {
                    setPhoto({
                        uri: selectedPhoto.uri,
                        type: selectedPhoto.type || "image/jpeg",
                        name: selectedPhoto.fileName || selectedPhoto.uri.split("/").pop(),
                    });
                    setErrors(prev => ({ ...prev, photo: "" }));
                }
            }
        });
    };

    const handleSubmit = async () => {
        if (!validateInputs()) return;

        const googleId = await getGoogleId();
        if (!googleId) {
            Alert.alert("Error", "Failed to retrieve Google ID. Please log in again.");
            return;
        }

        const netId = await getNetId(googleId);
        if (!netId) {
            Alert.alert("Error", "Failed to retrieve Net ID.");
            return;
        }

        const foodData = {
            foodName,
            quantity,
            category,
            dietaryInfo,
            pickupLocation,
            pickupTime: pickupTime?.toISOString(),
            expirationTime: expirationTime?.toISOString(),
            photo,
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
        
        
        <ScrollView contentContainerStyle={styles.container}>
             <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.title}>🍱 Share Your Food</Text>
            </View>
            <Text style={styles.title}>🍱 Share Your Food</Text>

            <Text style={styles.label}>Food Name</Text>
            <TextInput
                style={[styles.input, errors.foodName && styles.errorInput]}
                value={foodName}
                onChangeText={text => {
                    setFoodName(text);
                    if (errors.foodName) setErrors(prev => ({ ...prev, foodName: "" }));
                }}
                placeholder="e.g. Pizza Slice"
            />
            {errors.foodName && <Text style={styles.errorText}>{errors.foodName}</Text>}

            <Text style={styles.label}>Quantity</Text>
            <TextInput
                style={[styles.input, errors.quantity && styles.errorInput]}
                value={quantity}
                keyboardType="numeric"
                onChangeText={text => {
                    setQuantity(text);
                    if (errors.quantity) setErrors(prev => ({ ...prev, quantity: "" }));
                }}
                placeholder="e.g. 3"
            />
            {errors.quantity && <Text style={styles.errorText}>{errors.quantity}</Text>}

            <Text style={styles.label}>Category</Text>
            <View style={styles.pickerWrapper}>
                <Picker selectedValue={category} onValueChange={setCategory}>
                    <Picker.Item label="Snacks" value="snacks" />
                    <Picker.Item label="Meal" value="meal" />
                    <Picker.Item label="Breakfast" value="breakfast" />
                </Picker>
            </View>

            <Text style={styles.label}>Dietary Info (Optional)</Text>
            <TextInput
                style={styles.input}
                value={dietaryInfo}
                onChangeText={setDietaryInfo}
                placeholder="e.g. Vegan, Gluten-free"
            />

            <Text style={styles.label}>Pickup Location</Text>
            <TextInput
                style={[styles.input, errors.pickupLocation && styles.errorInput]}
                value={pickupLocation}
                onChangeText={text => {
                    setPickupLocation(text);
                    if (errors.pickupLocation) setErrors(prev => ({ ...prev, pickupLocation: "" }));
                }}
                placeholder="e.g. Dorm Lobby"
            />
            {errors.pickupLocation && <Text style={styles.errorText}>{errors.pickupLocation}</Text>}

            <Text style={styles.label}>Pickup Time</Text>
            <DatePicker
                selected={pickupTime}
                onChange={setPickupTime}
                showTimeSelect
                showTimeSelectOnly
                timeIntervals={15}
                timeCaption="Pickup"
                dateFormat="hh:mm aa"
                className="datepicker-input"
            />
            {errors.pickupTime && <Text style={styles.errorText}>{errors.pickupTime}</Text>}

            <Text style={styles.label}>Expiration Time</Text>
            <DatePicker
                selected={expirationTime}
                onChange={setExpirationTime}
                showTimeSelect
                showTimeSelectOnly
                timeIntervals={15}
                timeCaption="Expires"
                dateFormat="hh:mm aa"
                className="datepicker-input"
            />
            {errors.expirationTime && <Text style={styles.errorText}>{errors.expirationTime}</Text>}

            <Button title="Pick an Image (jpg/png, <1MB)" onPress={pickImage} />
            {errors.photo && <Text style={styles.errorText}>{errors.photo}</Text>}
            {photo && <Image source={{ uri: photo.uri }} style={styles.image} />}

            <View style={styles.submitBtn}>
                <Button title="Submit Post" onPress={handleSubmit} color="#4CAF50" />
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 20,
        backgroundColor: "#f8f8f8",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 20,
    },
    backButton: {
        padding: 10,
        backgroundColor: "#ddd",
        borderRadius: 5,
    },
    backButtonText: {
        color: "#333",
        fontWeight: "bold",
    },
    title: {
        fontSize: 22,
        fontWeight: "bold",
        marginBottom: 20,
        textAlign: "center",
        color: "#333",
    },
    label: {
        marginTop: 10,
        marginBottom: 5,
        fontWeight: "bold",
        color: "#333",
    },
    input: {
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 8,
        padding: 10,
        backgroundColor: "#fff",
    },
    errorInput: {
        borderColor: "#ff4d4d",
    },
    errorText: {
        color: "#ff4d4d",
        marginBottom: 5,
    },
    pickerWrapper: {
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 8,
        backgroundColor: "#fff",
        marginBottom: 10,
    },
    image: {
        width: "100%",
        height: 200,
        marginTop: 10,
        borderRadius: 8,
    },
    submitBtn: {
        marginTop: 20,
    },
});

export default function ProtectedFoodPostScreen() {
    return (
        <AuthGuard>
            <FoodPostScreen />
        </AuthGuard>
    );
}