import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Home from './screens/Home';
import Chat from './screens/Chat';
import History from './screens/History';
import Profile from './screens/Profile';
import Presentation from './screens/Presentation';
import Abuot from './screens/About';
import Download from './screens/Download';
import { store } from './redux/store';
import { Provider } from 'react-redux';
import { AdsProvider } from './contexts/adsContext';
import { ModelProvider } from './contexts/ModelContext';

const Stack = createNativeStackNavigator();

// ✅ Navigation theme

const App = () => {
  return (
    <SafeAreaProvider>
      <Provider store={store}>
        <ModelProvider>
          <AdsProvider>
            <NavigationContainer>
              <Stack.Navigator
                initialRouteName="Presentation"
                screenOptions={{
                  headerStyle: {
                    backgroundColor: '#0F172A',
                  },
                  headerTintColor: '#fff',
                  headerTitleStyle: {
                    fontWeight: '700',
                    fontSize: 18,
                  },
                  headerShadowVisible: false,
                  contentStyle: {
                    backgroundColor: '#0f172a',
                  },
                }}
              >
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

                {/* About */}
                <Stack.Screen
                  name="About"
                  component={Abuot}
                  options={{
                    contentStyle: { backgroundColor: '#0f172a' },
                    headerStyle: { backgroundColor: '#1e293b' },
                  }}
                />

                {/* Profile */}
                <Stack.Screen name="Profile" component={Profile} />

                {/* Chat */}
                <Stack.Screen name="Chat" component={Chat} />

                {/* History */}
                <Stack.Screen
                  name="History"
                  options={{
                    title: 'History',
                  }}
                  component={History}
                />
              </Stack.Navigator>
            </NavigationContainer>
          </AdsProvider>
        </ModelProvider>
      </Provider>
    </SafeAreaProvider>
  );
};

export default App;
