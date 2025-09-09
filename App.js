import { StyleSheet } from 'react-native';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Home from './screens/Home';
import Chat from './screens/Chat';
import History from './screens/History';
import Profile from './screens/Profile';
import Presentation from './screens/Presentation';
import Signin from './screens/Signin';
import { store } from './redux/store';
import { Provider } from 'react-redux';

const Stack = createNativeStackNavigator();

const App = () => {
  return (
    <Provider store={store}>
      <NavigationContainer>
        <Stack.Navigator initialRouteName="Signin">
          <Stack.Screen name="Signin" component={Signin} />

          <Stack.Screen
            name="Home"
            component={Home}
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen name="Profile" component={Profile} />

          <Stack.Screen name="Presentation" component={Presentation} />
          <Stack.Screen name="Chat" component={Chat} />
          <Stack.Screen name="History" component={History} />
        </Stack.Navigator>
      </NavigationContainer>
    </Provider>
  );
};

export default App;

const styles = StyleSheet.create({});

// initialRouteName="Chat"
