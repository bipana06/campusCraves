// frontend/components/AuthGuard.tsx
import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { ThemedText } from './ThemedText';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userToken = await AsyncStorage.getItem('userToken');
       
        if (!userToken) {
          // No token found, redirect to login
          router.replace('/screens/pageZero');
          return;
        }
       
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Error checking authentication:', error);
        router.replace('/screens/pageZero');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ThemedText>Redirecting to login...</ThemedText>
      </View>
    );
  }

  return <>{children}</>;
}