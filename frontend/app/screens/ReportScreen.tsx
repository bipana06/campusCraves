import React, { useEffect,useState } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  Button, 
  StyleSheet, 
  Alert,
  TouchableOpacity,
  ScrollView
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { submitReport } from "../apiService";
import { getGoogleId, getNetId, getPosterNetId, canReportPost  } from "../apiService";

let googleId: string | null = null;
let netId: string | null = null;
let posterNetId: string | null = null;


const initializeGlobalData = async () => {
 googleId = await getGoogleId();
 console.log("Google ID:", googleId);
  if (!googleId) return;


 netId = await getNetId(googleId);
};


initializeGlobalData();


const ReportScreen = () => {
  const [reportMessage, setReportMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [canReport, setCanReport] = useState(true);
  const [reasonMessage, setReasonMessage] = useState("");
  const router = useRouter();
  const params = useLocalSearchParams();

  // Extract parameters from the route
  const { foodId, foodName } = params;
  useEffect(() => {
    const checkReportEligibility = async () => {
      try {
        const googleID = await getGoogleId();
        const userNetId = await getNetId(googleID);
        const { canReport, reason } = await canReportPost(foodId, userNetId);
        setCanReport(canReport);
        setReasonMessage(reason || "");
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
        Alert.alert("Error", "Please provide a reason for your report");
        return;
      }
      
      // Add validation for foodId
      if (!foodId) {
        Alert.alert("Error", "Missing food item information");
        console.error("Missing foodId in report submission");
        return;
      }
  
      setIsSubmitting(true);
  
      try {
        const googleID = await getGoogleId();
        const user1Id = await getNetId(googleID);
        
        // Log the foodId before calling getPosterNetId
        console.log("Getting poster NetID for foodId:", foodId);
        const user2Id = await getPosterNetId(foodId);
        
        // More validation
        if (!user2Id) {
          throw new Error("Could not retrieve poster's information");
        }
        
        console.log("Sending report with data:", {
          foodId,
          reportMessage,
          user1Id,
          user2Id
        });
  
        const response = await submitReport(foodId, reportMessage, user1Id, user2Id);
            
        
        console.log("Report submission response:", response);
    
        Alert.alert(
            "Report Submitted",
            "Thank you for your report. Our team will review it shortly.",
            [{ text: "OK", onPress: () => router.back() }]
        );
        } catch (error) {
        console.error("Failed to submit report:", error);
        Alert.alert(
            "Error",
            `Failed to submit report: ${error.message || "Please try again later."}`
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
          <Text style={styles.infoValue}>{foodName}</Text>
        </View>
        
        <Text style={styles.label}>Why are you reporting this item?</Text>
        <TextInput
          style={styles.textArea}
          multiline
          numberOfLines={6}
          placeholder="Please provide details about why you're reporting this item..."
          value={reportMessage}
          onChangeText={setReportMessage}
          textAlignVertical="top"
        />
        
        <View style={styles.buttonContainer}>
          {/* <TouchableOpacity 
            style={styles.cancelButton} 
            onPress={() => router.back()}
            disabled={isSubmitting}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.submitButton} 
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? "Submitting..." : "Submit Report"}
            </Text>
          </TouchableOpacity> */}
          <TouchableOpacity 
            style={[
              styles.submitButton, 
              !canReport && styles.disabledButton
            ]} 
            onPress={handleSubmit}
            disabled={isSubmitting || !canReport}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? "Submitting..." : "Submit Report"}
            </Text>
          </TouchableOpacity>
          {!canReport && reasonMessage && (
            <Text style={styles.errorMessage}>{reasonMessage}</Text>
          )}
        </View>
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
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  cancelButton: {
    backgroundColor: "#f2f2f2",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#555",
    fontSize: 16,
    fontWeight: "bold",
  },
  submitButton: {
    backgroundColor: "#d32f2f",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    marginLeft: 10,
    alignItems: "center",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  disabledButton: {
    backgroundColor: '#cccccc',
    opacity: 0.7,
  },
  errorMessage: {
    color: '#d32f2f',
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center',
  },
});

export default ReportScreen;