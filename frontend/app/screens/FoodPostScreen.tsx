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
            <Text style={styles.title}>🍱 NEW POST 🍱 </Text>
            </View>
            <Text style={styles.title}>Please fill in the following details!</Text>

            <Text style={styles.label}>Food Name *</Text>
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

            <Text style={styles.label}>Quantity *</Text>
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

            <Text style={styles.label}>Category *</Text>
            <View style={styles.pickerWrapper}>
                <Picker selectedValue={category} onValueChange={setCategory}>
                    <Picker.Item label="Snacks" value="snacks" />
                    <Picker.Item label="Meal" value="meal" />
                    <Picker.Item label="Breakfast" value="breakfast" />
                </Picker>
            </View>

            <Text style={styles.label}>Dietary Info</Text>
            <TextInput
                style={styles.input}
                value={dietaryInfo}
                onChangeText={setDietaryInfo}
                placeholder="e.g. Vegan, Gluten-free"
            />

            <Text style={styles.label}>Pickup Location *</Text>
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

            <Text style={styles.label}>Pickup Time *</Text>
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

            <Text style={styles.label}>Expiration Time *</Text>
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

            <TouchableOpacity onPress={pickImage} style={[styles.buttonContainer, styles.pickImageButton]}>
                <Text style={styles.buttonText}>Pick an Image (&lt;1MB) *</Text>
            </TouchableOpacity>
            {errors.photo && <Text style={styles.errorText}>{errors.photo}</Text>}
            {photo && <Image source={{ uri: photo.uri }} style={styles.image} />}

            <TouchableOpacity onPress={handleSubmit} style={[styles.buttonContainer]}>
                <Text style={styles.buttonText}>Submit Post</Text>
            </TouchableOpacity>
        </ScrollView>
    );
};


const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        padding: 20,
        backgroundColor: "#F2F4F7",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 16,
    },
    backButton: {
        padding: 8,
        backgroundColor: "#EFE3C2",
        borderRadius: 8,
    },
    backButtonText: {
        color: "#333",
        fontSize: 14,
        fontWeight: "600",
    },
    title: {
        fontSize: 20,
        fontWeight: "700",
        textAlign: "center",
        color: "#123524",
        marginBottom: 24, 
    },
    
    label: {
        marginTop: 12,
        marginBottom: 6,
        fontSize: 14,
        fontWeight: "600",
        color: "#123524",
    },
    input: {
        borderWidth: 1,
        borderColor: "#5F6F65",
        borderRadius: 8,
        padding: 12,
        backgroundColor: "#FFF",
        fontSize: 14,
        color: "#5F6F65",
        marginBottom: 16,
    },
    errorInput: {
        borderColor: "#EF4444",
    },
    errorText: {
        color: "#EF4444",
        fontSize: 12,
        marginTop: 2,
    },
    pickerWrapper: {
        backgroundColor: "#FFF",
        marginBottom: 10, 
        borderRadius: 8,
        borderColor: "#5F6F65",
    },
    image: {
        width: "100%",
        height: 180,
        marginTop: 12,
        borderRadius: 10,
        resizeMode: "cover",
    },

    pickImageButton: {
        backgroundColor: "#27548A",
    },
    buttonContainer: {
        backgroundColor: "#3E7B27",
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        marginVertical: 20,
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
      },
      buttonText: {
        color: "#EFE3C2",
        fontSize: 18,
        fontWeight: "bold",
      },
    
});


export default function ProtectedFoodPostScreen() {
    return (
        <AuthGuard>
            <FoodPostScreen />
        </AuthGuard>
    );
}