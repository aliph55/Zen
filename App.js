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
import { ModelProvider } from './contexts/ModelContext';

const Stack = createNativeStackNavigator();

const App = () => {
  return (
    <Provider store={store}>
      <ModelProvider>
        <AdsProvider>
          <NavigationContainer>
            <Stack.Navigator
              initialRouteName="Presentation"
              screenOptions={{ headerShown: false }}
            >
              {/* 1. İLK SAYFA: Presentation */}
              <Stack.Screen name="Presentation" component={Presentation} />

              {/* 2. İKİNCİ SAYFA: Download */}
              <Stack.Screen name="Download">
                {({ navigation }) => (
                  <Download
                    onDownloadComplete={() => {
                      console.log('✅ Model ready, going to Home...');
                      navigation.replace('Home');
                    }}
                  />
                )}
              </Stack.Screen>

              {/* 3. ÜÇÜNCÜ SAYFA: Home */}
              <Stack.Screen name="Home" component={Home} />

              {/* DİĞER SAYFALAR */}
              <Stack.Screen name="Signin" component={Signin} />
              <Stack.Screen name="Profile" component={Profile} />
              <Stack.Screen name="Chat" component={Chat} />
              <Stack.Screen name="History" component={History} />
            </Stack.Navigator>
          </NavigationContainer>
        </AdsProvider>
      </ModelProvider>
    </Provider>
  );
};

export default App;

const styles = StyleSheet.create({});
