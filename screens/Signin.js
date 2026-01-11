import React, { useState } from 'react';
import { View, Button, Text, Alert } from 'react-native';
import { authorize, refresh, revoke } from 'react-native-app-auth';

const config = {
  issuer: 'https://accounts.google.com', // veya Auth0, Okta vs.
  clientId:
    '53852373022-9atpf2mdvt5jmg269b79fakt73670sb7.apps.googleusercontent.com',
  redirectUrl: 'http://localhost/oauth2redirect',
  scopes: ['openid', 'profile', 'email'],
};

const Signin = () => {
  const [authState, setAuthState] = useState(null);

  const handleAuthorize = async () => {
    try {
      const result = await authorize(config);
      setAuthState(result);
      console.log('Auth Success:', result);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleRefresh = async () => {
    try {
      const result = await refresh(config, {
        refreshToken: authState.refreshToken,
      });
      setAuthState(result);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleRevoke = async () => {
    try {
      await revoke(config, {
        tokenToRevoke: authState.accessToken,
      });
      setAuthState(null);
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
      {!authState ? (
        <Button title="Login" onPress={handleAuthorize} />
      ) : (
        <View>
          <Text>Logged In!</Text>
          <Text>Access Token: {authState.accessToken.substring(0, 20)}...</Text>
          <Button title="Refresh Token" onPress={handleRefresh} />
          <Button title="Logout" onPress={handleRevoke} />
        </View>
      )}
    </View>
  );
};

export default Signin;
