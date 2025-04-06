

import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, TextInput, Button, ActivityIndicator, ScrollView, BackHandler } from 'react-native';
import { ThemedText } from '../../components/ThemedText';
import { ThemedView } from '../../components/ThemedView';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { registerUser, getUser } from '../apiService'; // Use relative path for apiService.js
import { useFocusEffect, useNavigation } from '@react-navigation/native';

export default function NetIDScreen() {
  const [formData, setFormData] = useState({
    netId: '',
    fullName: '',
    phoneNumber: '',
  });

  const [userInfo, setUserInfo] = useState<{
    googleId: string;
    email: string;
    picture?: string;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userExists, setUserExists] = useState(false);
 
  // Get navigation for header modifications
  const navigation = useNavigation();

  // Prevent back navigation with hardware button
  useFocusEffect(
    useCallback(() => {
      // Disable hardware back button
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        // Return true to prevent default behavior (going back)
        return true;
      });

      // Clean up the event listener when component unmounts
      return () => backHandler.remove();
    }, [])
  );

  // Remove back button from header
  useEffect(() => {
    // Disable navigation header back button
    navigation.setOptions({
      headerLeft: () => null,
      gestureEnabled: false, // Disable swipe back gesture
    });
  }, [navigation]);

  // Fetch user info and check if they exist in the database
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const storedUserInfo = await AsyncStorage.getItem('userInfo');
        if (storedUserInfo) {
          const parsedUserInfo = JSON.parse(storedUserInfo);
          setUserInfo(parsedUserInfo);
          console.log("User info retrieved:", parsedUserInfo);
          console.log("googleId", parsedUserInfo.googleId);

          // Check if user exists in the database
          try {
            const existingUser = await getUser(parsedUserInfo.googleId);
            console.log('User found in database:', existingUser);

            // User exists; store profile and redirect to Explore page
            await AsyncStorage.setItem('userProfile', JSON.stringify(existingUser));
            router.replace('/(tabs)/explore');
          } catch (error) {
            if ((error as any)?.response?.status === 404) {
              console.log('New user detected; showing registration form');
              setUserExists(false);
            } else {
              console.error('Error checking user existence:', error);
              setError('Failed to check if user exists');
            }
          }
        } else {
          // No user info; redirect to login
          router.replace('/');
        }
      } catch (error) {
        console.error('Error retrieving user info:', error);
        setError('Failed to retrieve user information');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserInfo();
  }, []);

  // Handle form field changes
  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Handle form submission for new users
  const handleSubmit = async () => {
    if (!formData.netId.trim()) {
      setError('Please enter your NYU Net ID');
      return;
    }

    if (!formData.fullName.trim()) {
      setError('Please enter your full name');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const profile = {
        ...formData,
        email: userInfo?.email,
        googleId: userInfo?.googleId,
        picture: userInfo?.picture,
      };

      // Register the new user
      const result = await registerUser(profile);

      if (result.success) {
        console.log('User registered successfully:', result);
        await AsyncStorage.setItem('userProfile', JSON.stringify(profile));
        router.replace('/(tabs)/explore'); // Redirect to Explore page
      } else {
        setError(result.message || 'Failed to register user');
      }
    } catch (error) {
      console.error('Error during registration:', error);
      setError('Failed to save profile');
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading indicator while checking user status
  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator size="large" color="#4285F4" />
        <ThemedText style={styles.loadingText}>Checking user status...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <ThemedText type="title" style={styles.title}>
          Complete Your Profile
        </ThemedText>

        {userInfo && (
          <ThemedView style={styles.infoBox}>
            <ThemedText>Signed in as: {userInfo.email}</ThemedText>
          </ThemedView>
        )}

        <ThemedView style={styles.form}>
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

          <Button
            title="Complete Registration"
            onPress={handleSubmit}
            color="#4285F4"
          />
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff', // White background for good contrast
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 26, // Slightly larger for emphasis
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
    color: '#0d47a1', // Darker blue for better contrast
  },
  infoBox: {
    padding: 14,
    borderRadius: 8,
    marginBottom: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bdbdbd', // Slightly darker for visibility
    backgroundColor: '#e3f2fd', // Light blue background for contrast
  },
  form: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  label: {
    marginBottom: 8,
    fontWeight: '600',
    color: '#212121', // Darker text for readability
    fontSize: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#757575', // Darker border for clarity
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    fontSize: 16,
    color: '#212121', // Darker black text
    backgroundColor: '#fafafa', // Slightly off-white for contrast
  },
  errorText: {
    color: '#d32f2f', // Darker red for better visibility
    marginBottom: 16,
    fontWeight: 'bold',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#424242', // Darker gray for visibility
  },
});