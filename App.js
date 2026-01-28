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
            <Stack.Navigator initialRouteName="Presentation">
              {/* 1. İLK SAYFA: Presentation */}
              <Stack.Screen
                name="Presentation"
                options={{
                  headerShown: false,
                }}
                component={Presentation}
              />

              {/* 2. İKİNCİ SAYFA: Download */}
              <Stack.Screen
                name="Download"
                options={{
                  headerShown: false,
                }}
              >
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
              <Stack.Screen
                name="Home"
                options={{
                  headerShown: false,
                }}
                component={Home}
              />

              {/* DİĞER SAYFALAR */}
              <Stack.Screen
                name="Signin"
                options={{
                  headerShown: false,
                }}
                component={Signin}
              />

              {/* Profile - Themed Header */}
              <Stack.Screen
                name="Profile"
                options={{
                  headerStyle: {
                    backgroundColor: '#0F172A',
                  },
                  headerTintColor: '#fff',
                  headerTitleStyle: {
                    fontWeight: '700',
                    fontSize: 18,
                  },
                  headerShadowVisible: false,
                }}
                component={Profile}
              />

              {/* Chat - Themed Header */}
              <Stack.Screen
                name="Chat"
                options={{
                  headerStyle: {
                    backgroundColor: '#0F172A',
                  },
                  headerTintColor: '#fff',
                  headerTitleStyle: {
                    fontWeight: '700',
                    fontSize: 18,
                  },
                  headerShadowVisible: false,
                  title: 'Chat',
                }}
                component={Chat}
              />

              {/* History - Header Hidden (has its own header) */}
              <Stack.Screen
                name="History"
                options={{
                  headerStyle: {
                    backgroundColor: '#0F172A',
                  },
                  headerTintColor: '#fff',
                  headerTitleStyle: {
                    fontWeight: '700',
                    fontSize: 18,
                  },
                  headerShadowVisible: false,
                  title: 'History',
                }}
                component={History}
              />
            </Stack.Navigator>
          </NavigationContainer>
        </AdsProvider>
      </ModelProvider>
    </Provider>
  );
};

export default App;

const styles = StyleSheet.create({});
