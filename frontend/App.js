import React, { useState } from 'react';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';

import { AuthProvider, useAuth } from './src/context/AuthContext';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import PriceListScreen from './src/screens/PriceListScreen';
import PackagesScreen from './src/screens/PackagesScreen';
import ClientsScreen from './src/screens/ClientsScreen';
import BillsScreen from './src/screens/BillsScreen';
import CreateBillScreen from './src/screens/CreateBillScreen';
import BillDetailScreen from './src/screens/BillDetailScreen';
import SharedBillScreen from './src/screens/SharedBillScreen';
import EstimationScreen from './src/screens/EstimationScreen';
import DatesScreen from './src/screens/DatesScreen';
import TeamScreen from './src/screens/TeamScreen';
import LandingScreen from './src/screens/LandingScreen';
import Workspace from './src/design/Workspace';
import WebPolish from './src/design/WebPolish';
import EnquiriesScreen from './src/screens/EnquiriesScreen';

const Stack = createNativeStackNavigator();
const navigationRef = createNavigationContainerRef();

function AppNavigator() {
  const { user, loading, logout } = useAuth();
  const [activeRoute,setActiveRoute] = useState('Home');

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#1a237e" />
      </View>
    );
  }

  // Detect if user opened with a public share token
  const hasShareParam =
    typeof window !== 'undefined' &&
    window.location &&
    (window.location.search.includes('token=') || window.location.pathname.includes('/view/'));

  const initialRoute = hasShareParam ? 'SharedBill' : (!user ? 'Landing' : 'Home');

  return (
    <NavigationContainer ref={navigationRef} onStateChange={() => setActiveRoute(navigationRef.getCurrentRoute()?.name || 'Home')}>
      <WebPolish />
      <Workspace user={user} route={activeRoute} logout={logout} navigate={name => navigationRef.isReady() && navigationRef.navigate(name)}>
      <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
        {!user ? (
          <>
            <Stack.Screen name="Landing" component={LandingScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="SharedBill" component={SharedBillScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="PriceList" component={PriceListScreen} />
            <Stack.Screen name="Packages" component={PackagesScreen} />
            <Stack.Screen name="Clients" component={ClientsScreen} />
            <Stack.Screen name="Bills" component={BillsScreen} />
            <Stack.Screen name="Estimation" component={EstimationScreen} />
            <Stack.Screen name="Dates" component={DatesScreen} />
            <Stack.Screen name="Team" component={TeamScreen} />
            <Stack.Screen name="Enquiries" component={EnquiriesScreen} />
            <Stack.Screen name="CreateBill" component={CreateBillScreen} />
            <Stack.Screen name="BillDetail" component={BillDetailScreen} />
            <Stack.Screen name="SharedBill" component={SharedBillScreen} />
          </>
        )}
      </Stack.Navigator>
      </Workspace>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}
