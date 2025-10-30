import { StyleSheet } from 'react-native';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Home from './screens/Home';
import Chat from './screens/Chat';
import History from './screens/History';
import Profile from './screens/Profile';
import Presentation from './screens/Presentation';
import Download from './screens/Download';
import Signin from './screens/Signin';
import { store } from './redux/store';
import { Provider } from 'react-redux';
import { AdsProvider } from './contexts/adsContext';

const Stack = createNativeStackNavigator();

const App = () => {
  return (
    <Provider store={store}>
      <AdsProvider>
        <NavigationContainer>
          <Stack.Navigator initialRouteName="Download">
            <Stack.Screen name="Download" options={{ headerShown: false }}>
              {({ navigation }) => (
                <Download
                  onDownloadComplete={modelPath => {
                    console.log('✅ Model hazır, navigasyon başlıyor...');
                    // Signin ekranına yönlendir
                    navigation.replace('Signin');
                  }}
                />
              )}
            </Stack.Screen>

            <Stack.Screen
              name="Signin"
              component={Signin}
              options={{ headerShown: false }}
            />

            <Stack.Screen
              name="Home"
              component={Home}
              options={{ headerShown: false }}
            />

            <Stack.Screen name="Profile" component={Profile} />

            <Stack.Screen
              name="Presentation"
              component={Presentation}
              options={{ headerShown: false }}
            />

            <Stack.Screen name="Chat" component={Chat} />

            <Stack.Screen name="History" component={History} />
          </Stack.Navigator>
        </NavigationContainer>
      </AdsProvider>
    </Provider>
  );
};

export default App;
