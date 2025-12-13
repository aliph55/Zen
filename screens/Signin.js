import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  GoogleSignin,
  GoogleSigninButton,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch } from 'react-redux';
import { setUserInfo, resetUserInfo } from '../redux/userInfo';

const Signin = ({ navigation }) => {
  const [userInfo, setUserInfoLocal] = useState(null);
  const [isSigninInProgress, setIsSigninInProgress] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  let dispatch;
  try {
    dispatch = useDispatch();
  } catch (error) {
    console.warn('Redux dispatch error:', error);
    dispatch = null;
  }

  useEffect(() => {
    GoogleSignin.configure({
      webClientId:
        '53852373022-rkjsk0003jki7e4d2g0mba89a95udble.apps.googleusercontent.com',
      offlineAccess: true,
      forceCodeForRefreshToken: true,
    });

    checkSignInStatus();
  }, []);

  const checkSignInStatus = async () => {
    try {
      setIsLoading(true);

      const userToken = await AsyncStorage.getItem('userToken');
      const currentUser = await GoogleSignin.getCurrentUser();

      if (currentUser && userToken) {
        const userData =
          currentUser.user || currentUser.data?.user || currentUser;
        setUserInfoLocal(userData);

        // Redux'a kaydet (varsa)
        if (dispatch) {
          dispatch(
            setUserInfo({
              givenName: userData.givenName || '',
              familyName: userData.familyName || '',
              email: userData.email || '',
              photo: userData.photo || '',
              name: userData.name || '',
              id: userData.id || '',
            }),
          );
        }

        // Giriş yapılmış, direkt Home'a git
        console.log('✅ User is signed in, going to Home');
        navigation.replace('Download');
      } else {
        console.log('❌ No user found, staying on Signin');
      }
    } catch (error) {
      console.log('User status check error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToHome = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Download' }],
    });
  };

  const saveUserData = async userInfo => {
    try {
      await AsyncStorage.setItem('userInfo', JSON.stringify(userInfo));
      await AsyncStorage.setItem('userToken', userInfo.idToken || 'logged_in');
      await AsyncStorage.setItem('isLoggedIn', 'true');
    } catch (error) {
      console.error('Data save error:', error);
    }
  };

  const signIn = async () => {
    try {
      setIsSigninInProgress(true);

      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });

      const signInResult = await GoogleSignin.signIn();
      console.log('Sign in successful:', signInResult);

      const userData =
        signInResult.user || signInResult.data?.user || signInResult;
      setUserInfoLocal(userData);

      // Redux'a kaydet (varsa)
      if (dispatch) {
        dispatch(
          setUserInfo({
            givenName: userData.givenName || '',
            familyName: userData.familyName || '',
            email: userData.email || '',
            photo: userData.photo || '',
            name: userData.name || '',
            id: userData.id || '',
          }),
        );
      }

      const tokens = await GoogleSignin.getTokens();
      console.log('Access Token:', tokens.accessToken);
      console.log('ID Token:', tokens.idToken);

      signInResult.idToken = tokens.idToken;
      signInResult.accessToken = tokens.accessToken;

      await saveUserData(signInResult);

      const userName =
        userData.name ||
        userData.givenName ||
        userData.email?.split('@')[0] ||
        'User';

      Alert.alert(
        'Success',
        `Welcome, ${userName}!`,
        [{ text: 'OK', onPress: () => navigateToHome() }],
        { cancelable: false },
      );
    } catch (error) {
      handleSignInError(error);
    } finally {
      setIsSigninInProgress(false);
    }
  };

  const handleSignInError = error => {
    console.log('Sign in error:', error);

    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      Alert.alert('Cancelled', 'Sign-in process was cancelled');
    } else if (error.code === statusCodes.IN_PROGRESS) {
      Alert.alert('In Progress', 'Sign-in is already in progress');
    } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      Alert.alert(
        'Error',
        'Google Play Services is unavailable or not up to date',
      );
    } else {
      Alert.alert(
        'Error',
        `Sign-in error: ${error.message || error.toString()}`,
      );
    }
  };

  const signOut = async () => {
    try {
      await GoogleSignin.signOut();
      await AsyncStorage.multiRemove(['userInfo', 'userToken', 'isLoggedIn']);
      if (dispatch) {
        dispatch(resetUserInfo());
      }
      setUserInfoLocal(null);
      Alert.alert('Success', 'Logged out');
      navigation.reset({
        index: 0,
        routes: [{ name: 'Signin' }],
      });
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'An error occurred while logging out');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#6366f1" />
        <Text style={styles.loadingText}>Checking...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Text style={styles.logo}>🤖</Text>
        <Text style={styles.appName}>ZenAI</Text>
        <Text style={styles.tagline}>Your Offline AI Assistant</Text>
      </View>

      <View style={styles.signInContainer}>
        <TouchableOpacity
          style={styles.customGoogleButton}
          onPress={signIn}
          disabled={isSigninInProgress}
        >
          {isSigninInProgress ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <View style={styles.googleIconContainer}>
                <Text style={styles.googleG}>G</Text>
              </View>
              <Text style={styles.googleButtonText}>Sign in with Google</Text>
            </>
          )}
        </TouchableOpacity>

        <GoogleSigninButton
          style={styles.googleSignInButton}
          size={GoogleSigninButton.Size.Wide}
          color={GoogleSigninButton.Color.Dark}
          onPress={signIn}
          disabled={isSigninInProgress}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fd',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logo: {
    fontSize: 80,
    marginBottom: 16,
  },
  appName: {
    fontSize: 36,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  signInContainer: {
    alignItems: 'center',
    gap: 16,
  },
  customGoogleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 24,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    minWidth: 250,
    justifyContent: 'center',
  },
  googleIconContainer: {
    width: 28,
    height: 28,
    backgroundColor: 'white',
    borderRadius: 6,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleG: {
    color: '#6366f1',
    fontSize: 18,
    fontWeight: 'bold',
  },
  googleButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  googleSignInButton: {
    width: 250,
    height: 48,
  },
});

export default Signin;
