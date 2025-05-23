import React, { useEffect, useState } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  Alert,
  TouchableOpacity,
  ScrollView
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { submitReport } from "../apiService";
import { getGoogleId, getNetId, getPosterNetId, canReportPost } from "../apiService";


let googleId: string | null = null;
let netId: string | null = null;

const initializeGlobalData = async () => {
  googleId = await getGoogleId();
  if (!googleId) return;
  netId = await getNetId(googleId);
};

initializeGlobalData();

const ReportScreen = () => {
  const [reportMessage, setReportMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [canReport, setCanReport] = useState(true);
  const [reasonMessage, setReasonMessage] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const router = useRouter();
  const params = useLocalSearchParams();

  const { foodId, foodName } = params;

  useEffect(() => {
    const checkReportEligibility = async () => {
      try {
        const googleID = await getGoogleId();
        const userNetId = await getNetId(googleID);
        const { canReport, reason } = await canReportPost(foodId, userNetId);
        setCanReport(canReport);
        setReasonMessage(reason || "You cannot report this food item");
      } catch (error) {
        console.error("Error checking report eligibility:", error);
        setCanReport(false);
        setReasonMessage("Unable to verify report eligibility");
      }
    };

    if (foodId) {
      checkReportEligibility();
    }
  }, [foodId]);

  const handleSubmit = async () => {

    if (!reportMessage.trim()) {
      window.alert("Please provide a reason for your report");
      Alert.alert("Error", "Please provide a reason for your report");
      return;
    }
    
    if (!foodId) {
      Alert.alert(
        "Error",
        "Missing food item information. Please try again.",
        [{ text: "OK" }]
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const googleID = await getGoogleId();
      const user1Id = await getNetId(googleID);
      const user2Id = await getPosterNetId(foodId);
      
      if (!user2Id) {
        throw new Error("Could not retrieve poster's information");
      }

      // Check if user is trying to report their own food
      if (user1Id === user2Id) {
        throw new Error("You cannot report your own food item");
      }

      const response = await submitReport(foodId, reportMessage, user1Id, user2Id);
      
      window.alert("Report Submitted. Thank you for your report. Our team will review it shortly.");
      setIsSubmitting(false);
      setIsSubmitted(true); // Set this before alert
      Alert.alert(
        "Report Submitted",
        "Thank you for your report. Our team will review it shortly.",
        [
          { 
            text: "OK", 
            onPress: () => router.back() 
          }
        ]
      );
    } 

      catch (error) {
      let errorMessage = "Failed to submit report. Please try again later.";
      
      if (error instanceof Error && error.message.includes("already reported")) {
        errorMessage = "You have already reported this food item.";
      } else if (error instanceof Error && error.message.includes("your own")) {
        errorMessage = "You cannot report your own food item.";
      } else {
        if (error instanceof Error) {
          errorMessage = error.message || errorMessage;
        }
      }

      Alert.alert(
        "Report Failed",
        errorMessage,
        [{ text: "OK" }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Report Food Item</Text>
        
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Food Item:</Text>
          <Text style={styles.infoValue}>{foodName || "Unknown Item"}</Text>
        </View>
        
        <Text style={styles.label}>Why are you reporting this item?</Text>
        <TextInput
          style={styles.textArea}
          multiline
          numberOfLines={6}
          placeholder="Please provide details about why you're reporting this item..."
          placeholderTextColor="#999"
          value={reportMessage}
          onChangeText={setReportMessage}
          textAlignVertical="top"
          editable={canReport}
        />
        
        <View style={styles.buttonContainer}>
          {/* <TouchableOpacity 
            style={[
              styles.submitButton, 
              (!canReport || isSubmitting) && styles.disabledButton
            ]} 
            onPress={handleSubmit}
            disabled={isSubmitting || !canReport}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? "Submitting..." : "Submit Report"}
            </Text>
          </TouchableOpacity> */}
          <TouchableOpacity 
            style={[
              styles.submitButton, 
              (!canReport || isSubmitting || isSubmitted) && styles.disabledButton
            ]} 
            onPress={handleSubmit}
            disabled={isSubmitting || !canReport || isSubmitted}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? "Submitting..." : "Submit Report"}
            </Text>
          </TouchableOpacity>
        </View>

        {!canReport && (
          <View style={styles.messageBox}>
            <Text style={styles.errorMessage}>{reasonMessage}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#333",
  },
  infoBox: {
    backgroundColor: "#f8f8f8",
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  infoLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#555",
  },
  infoValue: {
    fontSize: 18,
    marginTop: 5,
    color: "#333",
  },
  label: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#555",
  },
  textArea: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
    color: "#333",
    minHeight: 150,
    marginBottom: 15,
  },
  buttonContainer: {
    marginTop: 10,
  },
  submitButton: {
    backgroundColor: "#d32f2f",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  disabledButton: {
    backgroundColor: '#aaaaaa',
  },
  messageBox: {
    marginTop: 20,
    padding: 15,
    backgroundColor: '#fff3f3',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffcdd2',
  },
  errorMessage: {
    color: '#d32f2f',
    fontSize: 15,
    textAlign: 'center',
  },
});

export default ReportScreen;