import React, { useState } from 'react';
import { StyleSheet, View, TextInput, Button, ActivityIndicator, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { registerUser } from '../apiService';

export default function SignupScreen() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    netId: '',
    googleId:'',
    fullName: '',
    phoneNumber: '',
    picture: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.email.trim() || !formData.password.trim() || !formData.netId.trim() || !formData.fullName.trim()) {
      setError('Please fill all required fields');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await registerUser(formData);

      if (result.success) {
        await AsyncStorage.setItem('userProfile', JSON.stringify(result.user));
        router.replace('./pageZero');
      } else {
        setError(result.message || 'Failed to register user');
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError('Something went wrong during registration');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <ThemedText type="title" style={styles.title}>Sign Up</ThemedText>
        


        <ThemedView style={styles.form}>
          <ThemedText style={styles.label}>Username *</ThemedText>
          <TextInput
              style={styles.input}
              placeholder="Choose a username"
              value={formData.username}
              onChangeText={(value) => handleChange('username', value)}
              autoCapitalize="none"
              autoCorrect={false}
            />
          <ThemedText style={styles.label}>Email *</ThemedText>
          <TextInput
            style={styles.input}
            placeholder="your@email.com"
            value={formData.email}
            onChangeText={(value) => handleChange('email', value)}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />

          <ThemedText style={styles.label}>Password *</ThemedText>
          <TextInput
            style={styles.input}
            placeholder="Enter a password"
            value={formData.password}
            onChangeText={(value) => handleChange('password', value)}
            secureTextEntry
          />

          <ThemedText style={styles.label}>NYU Net ID *</ThemedText>
          <TextInput
            style={styles.input}
            placeholder="e.g., abc123"
            value={formData.netId}
            onChangeText={(value) => handleChange('netId', value)}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <ThemedText style={styles.label}>Full Name *</ThemedText>
          <TextInput
            style={styles.input}
            placeholder="Your full name"
            value={formData.fullName}
            onChangeText={(value) => handleChange('fullName', value)}
            autoCorrect={false}
          />

          <ThemedText style={styles.label}>Phone Number</ThemedText>
          <TextInput
            style={styles.input}
            placeholder="(123) 456-7890"
            value={formData.phoneNumber}
            onChangeText={(value) => handleChange('phoneNumber', value)}
            keyboardType="phone-pad"
          />

          {error && <ThemedText style={styles.errorText}>{error}</ThemedText>}
        </ThemedView>
          {isLoading ? (
            <ActivityIndicator />
          ) : (
            <TouchableOpacity style={styles.buttonContainer} onPress={handleSubmit}>
              <ThemedText style={styles.buttonText}>Register</ThemedText>
            </TouchableOpacity>  )}  
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: 'white', // creamy parchment background
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 40,
    paddingTop: 60,
  },
  title: {
    fontSize: 40,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
    color: '#3E7B27', 
  },
  form: {
    width: '100%',
    alignSelf: 'center',
    borderColor: '#3E7B27', // subtle olive green border
    borderWidth: 2,
    borderRadius: 10,
    padding: 14,
   backgroundColor: 'white',
  },
  label: {
    marginBottom: 8,
    fontWeight: '600',
    color: '#3E7B27', // creamy parchment text
    fontSize: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    fontSize: 14,
    color: '#5F6F65', // green input text for consistency
    backgroundColor: '#FDF8EF', // ✨ cozy soft input background
  },
  errorText: {
    color: '#ff4444',
    marginBottom: 16,
    textAlign: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#EFE3C2',
  },
  buttonContainer: {
    backgroundColor: "#85A947",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginVertical: 15,
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
