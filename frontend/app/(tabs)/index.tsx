// import { Image, StyleSheet, Platform } from 'react-native';

// import { HelloWave } from '@/components/HelloWave';
// import ParallaxScrollView from '@/components/ParallaxScrollView';
// import { ThemedText } from '@/components/ThemedText';
// import { ThemedView } from '@/components/ThemedView';

// export default function HomeScreen() {
//   return (
//     <ParallaxScrollView
//       headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
//       headerImage={
//         <Image
//           source={require('@/assets/images/partial-react-logo.png')}
//           style={styles.reactLogo}
//         />
//       }>
//       <ThemedView style={styles.titleContainer}>
//         <ThemedText type="title">Welcome!</ThemedText>
//         <HelloWave />
//       </ThemedView>
//       <ThemedView style={styles.stepContainer}>
//         <ThemedText type="subtitle">Step 1: Try it</ThemedText>
//         <ThemedText>
//           Edit <ThemedText type="defaultSemiBold">app/(tabs)/index.tsx</ThemedText> to see changes.
//           Press{' '}
//           <ThemedText type="defaultSemiBold">
//             {Platform.select({
//               ios: 'cmd + d',
//               android: 'cmd + m',
//               web: 'F12'
//             })}
//           </ThemedText>{' '}
//           to open developer tools.
//         </ThemedText>
//       </ThemedView>
//       <ThemedView style={styles.stepContainer}>
//         <ThemedText type="subtitle">Step 2: Explore</ThemedText>
//         <ThemedText>
//           Tap the Explore tab to learn more about what's included in this starter app.
//         </ThemedText>
//       </ThemedView>
//       <ThemedView style={styles.stepContainer}>
//         <ThemedText type="subtitle">Step 3: Get a fresh start</ThemedText>
//         <ThemedText>
//           When you're ready, run{' '}
//           <ThemedText type="defaultSemiBold">npm run reset-project</ThemedText> to get a fresh{' '}
//           <ThemedText type="defaultSemiBold">app</ThemedText> directory. This will move the current{' '}
//           <ThemedText type="defaultSemiBold">app</ThemedText> to{' '}
//           <ThemedText type="defaultSemiBold">app-example</ThemedText>.
//         </ThemedText>
//       </ThemedView>
//     </ParallaxScrollView>
//   );
// }

// const styles = StyleSheet.create({
//   titleContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 8,
//   },
//   stepContainer: {
//     gap: 8,
//     marginBottom: 8,
//   },
//   reactLogo: {
//     height: 178,
//     width: 290,
//     bottom: 0,
//     left: 0,
//     position: 'absolute',
//   },
// });






// import { View, Button } from "react-native";
// import { useRouter } from "expo-router";

// export default function HomeScreen() {
//     const router = useRouter();

//     return (
//         <View>
//             <Button title="Post Food" onPress={() => router.push("../screens/FoodPostScreen")} />
//             <Button title="View Marketplace" onPress={() => router.push("../screens/MarketPlaceScreen")} />
//         </View>
//     );
// }





import { Image, StyleSheet, Platform, Button, View } from 'react-native';
import React, { useEffect, useState } from 'react';
import { HelloWave } from '@/components/HelloWave';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from "expo-router";
import { router } from 'expo-router';
import { makeRedirectUri } from 'expo-auth-session';
//https://auth.expo.io/@aabaran/frontend
// Register for redirect URI
WebBrowser.maybeCompleteAuthSession();

export default function HomeScreen() {
  const [authError, setAuthError] = useState(null);
  const router = useRouter();

  
  // Use both clientId and webClientId to cover both scenarios
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: '556981446145-qa9vinqthj28lmv49of5ssor9im3pk1v.apps.googleusercontent.com',
    webClientId: '556981446145-qa9vinqthj28lmv49of5ssor9im3pk1v.apps.googleusercontent.com',
    redirectUri: 'http://localhost:8081/',
    scopes: ['profile', 'email']
  });
  
  // Check for existing authentication
  useEffect(() => {
    const checkExistingAuth = async () => {
      const userToken = await AsyncStorage.getItem('userToken');
      if (userToken) {
        router.replace('/netid');
      }
    };
    
    checkExistingAuth();
  }, []);
  
  // Handle auth response with better logging
  useEffect(() => {
    if (response) {
      console.log('Auth response received:', response);
      
      if (response?.type === 'success') {
        handleAuthSuccess(response);
      } else if (response?.type === 'error') {
        console.error('Authentication error:', response.error);
        setAuthError(`Auth error: ${response.error?.message || 'Unknown error'}`);
      }
    }
  }, [response]);

  
  const handleAuthSuccess = async (response) => {
    try {
      console.log('Success response:', response);
      const { authentication } = response;
      
      if (!authentication || !authentication.accessToken) {
        throw new Error('No access token in response');
      }
      
      await AsyncStorage.setItem('userToken', authentication.accessToken);
      
      // Get user info
      const userInfoResponse = await fetch('https://www.googleapis.com/userinfo/v2/me', {
        headers: { Authorization: `Bearer ${authentication.accessToken}` }
      });

      
      const userInfo = await userInfoResponse.json();
      await AsyncStorage.setItem('userInfo', JSON.stringify(userInfo));
      
      // Redirect to main content
      router.replace('/netid');
    } catch (error) {
      console.error('Error handling authentication:', error);
      setAuthError(`Error processing login: ${error.message}`);
    }

    
  };
  
  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Welcome!</ThemedText>
        <HelloWave />
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Sign in to continue</ThemedText>
        <View style={styles.buttonContainer}>
          <Button
            title="Sign in with Google"
            onPress={() => {
              setAuthError(null);
              // Try with useProxy set to false
              promptAsync({useProxy: false});
            }}
            color="#4285F4"
          />
        </View>
        {authError && (
          <ThemedText style={{color: 'red'}}>{authError}</ThemedText>
        )}
      </ThemedView>


      {/* Navigation Buttons Section */}
      <ThemedView style={styles.navigationContainer}>
        <Button
          title="Post Food"
          onPress={() => router.push('../screens/FoodPostScreen')}
          color="#4CAF50"
        />
        <Button
          title="View Marketplace"
          onPress={() => router.push('../screens/MarketPlaceScreen')}
          color="#FF9800"
          style={{ marginTop: 10 }}
        />
      </ThemedView>


    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
  buttonContainer: {
    marginVertical: 15,
  },
  navigationContainer: {
    marginTop: 20,
    gap: 10,
  },

});