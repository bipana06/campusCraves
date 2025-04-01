// Working form not connected to backend 

// import React, { useState, useEffect } from 'react';
// import { StyleSheet, View, TextInput, Button, ActivityIndicator, ScrollView } from 'react-native';
// import { ThemedText } from '@/components/ThemedText';
// import { ThemedView } from '@/components/ThemedView';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import { router } from 'expo-router';

// export default function NetIDScreen() {
//   const [formData, setFormData] = useState({
//     netId: '',
//     fullName: '',
//     phoneNumber: '',
//   });
//   const [userInfo, setUserInfo] = useState(null);
//   const [isLoading, setIsLoading] = useState(false);
//   const [error, setError] = useState(null);

//   useEffect(() => {
//     // Retrieve user info from Google auth
//     const getUserInfo = async () => {
//       try {
//         const storedUserInfo = await AsyncStorage.getItem('userInfo');
//         if (storedUserInfo) {
//           setUserInfo(JSON.parse(storedUserInfo));
//         } else {
//           // No user info - redirect back to login
//           router.replace('/');
//         }
//       } catch (error) {
//         console.error('Error getting user info:', error);
//         setError('Failed to retrieve user information');
//       }
//     };

//     getUserInfo();
//   }, []);

//   const handleChange = (field, value) => {
//     setFormData(prev => ({ ...prev, [field]: value }));
//   };

//   const handleSubmit = async () => {
//     // Validate form
//     if (!formData.netId.trim()) {
//       setError('Please enter your NYU Net ID');
//       return;
//     }
    
//     if (!formData.fullName.trim()) {
//       setError('Please enter your full name');
//       return;
//     }

//     setIsLoading(true);
//     setError(null);

//     try {
//       // Create a complete user profile combining Google data and form data
//       const profile = {
//         ...formData,
//         email: userInfo?.email,
//         googleId: userInfo?.id,
//         picture: userInfo?.picture
//       };
      
//       // Store the profile locally for now
//       // Later you'll send this to your MongoDB backend
//       await AsyncStorage.setItem('userProfile', JSON.stringify(profile));
      
//       // Redirect to main content
//       router.replace('/(tabs)/explore');
//     } catch (error) {
//       console.error('Error saving profile:', error);
//       setError('Failed to save profile');
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   return (
//     <ThemedView style={styles.container}>
//       <ScrollView contentContainerStyle={styles.scrollContainer}>
//         <ThemedText type="title" style={styles.title}>Complete Your Profile</ThemedText>
        
//         {userInfo && (
//           <ThemedView style={styles.infoBox}>
//             <ThemedText>Signed in as: {userInfo.email}</ThemedText>
//           </ThemedView>
//         )}
        
//         <ThemedView style={styles.form}>
//           <ThemedText style={styles.label}>NYU Net ID *</ThemedText>
//           <TextInput
//             style={styles.input}
//             placeholder="e.g., abc123"
//             value={formData.netId}
//             onChangeText={(value) => handleChange('netId', value)}
//             autoCapitalize="none"
//             autoCorrect={false}
//           />
          
//           <ThemedText style={styles.label}>Full Name *</ThemedText>
//           <TextInput
//             style={styles.input}
//             placeholder="Your full name"
//             value={formData.fullName}
//             onChangeText={(value) => handleChange('fullName', value)}
//             autoCorrect={false}
//           />
          
//           <ThemedText style={styles.label}>Phone Number</ThemedText>
//           <TextInput
//             style={styles.input}
//             placeholder="(123) 456-7890"
//             value={formData.phoneNumber}
//             onChangeText={(value) => handleChange('phoneNumber', value)}
//             keyboardType="phone-pad"
//           />
          
//           {error && (
//             <ThemedText style={styles.errorText}>{error}</ThemedText>
//           )}
          
//           <Button
//             title={isLoading ? "Submitting..." : "Complete Registration"}
//             onPress={handleSubmit}
//             disabled={isLoading}
//             color="#4285F4"
//           />
          
//           {isLoading && <ActivityIndicator style={styles.loader} />}
//         </ThemedView>
//       </ScrollView>
//     </ThemedView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//   },
//   scrollContainer: {
//     flexGrow: 1,
//     padding: 20,
//     paddingTop: 60,
//   },
//   title: {
//     fontSize: 24,
//     marginBottom: 24,
//     textAlign: 'center',
//   },
//   infoBox: {
//     padding: 12,
//     borderRadius: 8,
//     marginBottom: 24,
//     alignItems: 'center',
//     borderWidth: 1,
//     borderColor: '#e0e0e0',
//   },
//   form: {
//     width: '100%',
//     maxWidth: 400,
//     alignSelf: 'center',
//   },
//   label: {
//     marginBottom: 8,
//     fontWeight: '500',
//   },
//   input: {
//     borderWidth: 1,
//     borderColor: '#ccc',
//     borderRadius: 8,
//     padding: 12,
//     marginBottom: 20,
//     fontSize: 16,
//   },
//   errorText: {
//     color: 'red',
//     marginBottom: 16,
//   },
//   loader: {
//     marginTop: 20,
//   }
// });


//VERSION 2


// import React, { useState, useEffect } from 'react';
// import { StyleSheet, View, TextInput, Button, ActivityIndicator, ScrollView } from 'react-native';
// import { ThemedText } from '@/components/ThemedText';
// import { ThemedView } from '@/components/ThemedView';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import { router } from 'expo-router';
// import { registerUser, getUser } from './apiService';

// export default function NetIDScreen() {
//   const [formData, setFormData] = useState({
//     netId: '',
//     fullName: '',
//     phoneNumber: '',
//   });
//   const [userInfo, setUserInfo] = useState(null);
//   const [isLoading, setIsLoading] = useState(false);
//   const [error, setError] = useState(null);

//   useEffect(() => {
//     // Retrieve user info from Google auth
//     const getUserInfo = async () => {
//       try {
//         const storedUserInfo = await AsyncStorage.getItem('userInfo');
//         if (storedUserInfo) {
//           setUserInfo(JSON.parse(storedUserInfo));
//         } else {
//           // No user info - redirect back to login
//           router.replace('/');
//         }
//       } catch (error) {
//         console.error('Error getting user info:', error);
//         setError('Failed to retrieve user information');
//       }
//     };

//     getUserInfo();
//   }, []);

//   const handleChange = (field, value) => {
//     setFormData((prev) => ({ ...prev, [field]: value }));
//   };

//   const handleSubmit = async () => {
//     // Validate form
//     if (!formData.netId.trim()) {
//       setError('Please enter your NYU Net ID');
//       return;
//     }

//     if (!formData.fullName.trim()) {
//       setError('Please enter your full name');
//       return;
//     }

//     setIsLoading(true);
//     setError(null);

//     try {
//       // Create a complete user profile combining Google data and form data
//       const profile = {
//         ...formData,
//         email: userInfo?.email,
//         googleId: userInfo?.id,
//         picture: userInfo?.picture,
//       };

//       // Send profile data to backend for registration
//       const result = await registerUser(profile);

//       if (result.success) {
//         console.log('User registered successfully:', result);
//         await AsyncStorage.setItem('userProfile', JSON.stringify(profile));
//         router.replace('/(tabs)/explore'); // Redirect to Explore tab
//       } else {
//         setError(result.message || 'Failed to register user');
//       }
//     } catch (error) {
//       console.error('Error saving profile:', error);
//       setError('Failed to save profile');
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const fetchExistingUser = async () => {
//     try {
//       if (!userInfo?.id) return;

//       const existingUser = await getUser(userInfo.id);
//       console.log('Fetched existing user:', existingUser);
//       // You can populate the form with existing user data if needed
//     } catch (error) {
//       console.error('Error fetching existing user:', error);
//       setError('Failed to fetch existing user');
//     }
//   };

//   useEffect(() => {
//     fetchExistingUser(); // Fetch existing user data on component load
//   }, [userInfo]);

//   return (
//     <ThemedView style={styles.container}>
//       <ScrollView contentContainerStyle={styles.scrollContainer}>
//         <ThemedText type="title" style={styles.title}>
//           Complete Your Profile
//         </ThemedText>

//         {userInfo && (
//           <ThemedView style={styles.infoBox}>
//             <ThemedText>Signed in as: {userInfo.email}</ThemedText>
//           </ThemedView>
//         )}

//         <ThemedView style={styles.form}>
//           <ThemedText style={styles.label}>NYU Net ID *</ThemedText>
//           <TextInput
//             style={styles.input}
//             placeholder="e.g., abc123"
//             value={formData.netId}
//             onChangeText={(value) => handleChange('netId', value)}
//             autoCapitalize="none"
//             autoCorrect={false}
//           />

//           <ThemedText style={styles.label}>Full Name *</ThemedText>
//           <TextInput
//             style={styles.input}
//             placeholder="Your full name"
//             value={formData.fullName}
//             onChangeText={(value) => handleChange('fullName', value)}
//             autoCorrect={false}
//           />

//           <ThemedText style={styles.label}>Phone Number</ThemedText>
//           <TextInput
//             style={styles.input}
//             placeholder="(123) 456-7890"
//             value={formData.phoneNumber}
//             onChangeText={(value) => handleChange('phoneNumber', value)}
//             keyboardType="phone-pad"
//           />

//           {error && <ThemedText style={styles.errorText}>{error}</ThemedText>}

//           <Button
//             title={isLoading ? 'Submitting...' : 'Complete Registration'}
//             onPress={handleSubmit}
//             disabled={isLoading}
//             color="#4285F4"
//           />

//           {isLoading && <ActivityIndicator style={styles.loader} />}
//         </ThemedView>
//       </ScrollView>
//     </ThemedView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//   },
//   scrollContainer: {
//     flexGrow: 1,
//     padding: 20,
//     paddingTop: 60,
//   },
//   title: {
//     fontSize: 24,
//     marginBottom: 24,
//     textAlign: 'center',
//   },
//   infoBox: {
//     padding: 12,
//     borderRadius: 8,
//     marginBottom: 24,
//     alignItems: 'center',
//     borderWidth: 1,
//     borderColor: '#e0e0e0',
//   },
//   form: {
//     width: '100%',
//     maxWidth: 400,
//     alignSelf: 'center',
//   },
//   label: {
//     marginBottom: 8,
//     fontWeight: '500',
//   },
//   input: {
//     borderWidth: 1,
//     borderColor: '#ccc',
//     borderRadius: 8,
//     padding: 12,
//     marginBottom: 20,
//     fontSize: 16,
//   },
//   errorText: {
//     color: 'red',
//     marginBottom: 16,
//   },
//   loader: {
//     marginTop: 20,
//   },
// });



import React, { useState, useEffect } from 'react';
import { StyleSheet, View, TextInput, Button, ActivityIndicator, ScrollView } from 'react-native';
import { ThemedText } from '../components/ThemedText';
import { ThemedView } from '../components/ThemedView';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { registerUser, getUser } from './apiService'; // Use relative path for apiService.js

export default function NetIDScreen() {
  const [formData, setFormData] = useState({
    netId: '',
    fullName: '',
    phoneNumber: '',
  });
  const [userInfo, setUserInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // Start as loading
  const [error, setError] = useState(null);
  const [userExists, setUserExists] = useState(false);

  // Fetch user info and check if they exist in the database
  useEffect(() => {
    const getUserInfo = async () => {
      try {
        const storedUserInfo = await AsyncStorage.getItem('userInfo');
        if (storedUserInfo) {
          const parsedUserInfo = JSON.parse(storedUserInfo);
          setUserInfo(parsedUserInfo);

          // Check if user exists in the database
          try {
            const existingUser = await getUser(parsedUserInfo.id);
            console.log('User found in database:', existingUser);

            // User exists; store profile and redirect to Explore page
            await AsyncStorage.setItem('userProfile', JSON.stringify(existingUser));
            router.replace('/(tabs)/explore');
          } catch (error) {
            // If error is 404, user doesn't exist
            if (error.response && error.response.status === 404) {
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

    getUserInfo();
  }, []);

  // Handle form field changes
  const handleChange = (field, value) => {
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
        googleId: userInfo?.id,
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
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 24,
    marginBottom: 24,
    textAlign: 'center',
  },
  infoBox: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  form: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  label: {
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    fontSize: 16,
  },
  errorText: {
    color: 'red',
    marginBottom: 16,
  },
});
