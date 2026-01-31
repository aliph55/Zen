import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import {
  GoogleSignin,
  GoogleSigninButton,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch } from 'react-redux';
import { setUserInfo, resetUserInfo } from '../redux/userInfo'; // Actions'ları import et

const Signin = ({ navigation }) => {
  const [userInfo, setUserInfoLocal] = useState(null);
  const [isSigninInProgress, setIsSigninInProgress] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const dispatch = useDispatch();

  useEffect(() => {
    // Google Sign-In'i yapılandır
    GoogleSignin.configure({
      webClientId:
        '53852373022-rkjsk0003jki7e4d2g0mba89a95udble.apps.googleusercontent.com',
      offlineAccess: true,
      forceCodeForRefreshToken: true,
    });

    // Önceden giriş yapılmış mı kontrol et
    checkSignInStatus();
  }, []);

  const checkSignInStatus = async () => {
    try {
      setIsLoading(true);

      // AsyncStorage'dan token kontrol et
      const userToken = await AsyncStorage.getItem('userToken');

      // Google'dan mevcut kullanıcıyı kontrol et
      const currentUser = await GoogleSignin.getCurrentUser();

      if (currentUser && userToken) {
        const userData =
          currentUser.user || currentUser.data?.user || currentUser;
        setUserInfoLocal(userData);

        // Redux'a sadeleştirilmiş kullanıcı bilgilerini kaydet
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
        // navigateToHome();
        navigation.navigate('Home');
      }
    } catch (error) {
      console.log('Kullanıcı durumu kontrol hatası:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToHome = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    });
  };

  const saveUserData = async userInfo => {
    try {
      await AsyncStorage.setItem('userInfo', JSON.stringify(userInfo));
      await AsyncStorage.setItem('userToken', userInfo.idToken || 'logged_in');
      await AsyncStorage.setItem('isLoggedIn', 'true');
    } catch (error) {
      console.error('Veri kaydetme hatası:', error);
    }
  };

  const signIn = async () => {
    try {
      setIsSigninInProgress(true);

      // Play Services kontrolü (sadece Android)
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });

      // Giriş yap
      const signInResult = await GoogleSignin.signIn();
      console.log('Giriş başarılı:', signInResult);

      const userData =
        signInResult.user || signInResult.data?.user || signInResult;
      setUserInfoLocal(userData);

      // Redux'a sadeleştirilmiş kullanıcı bilgilerini kaydet
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

      // Token'ları al
      const tokens = await GoogleSignin.getTokens();
      console.log('Access Token:', tokens.accessToken);
      console.log('ID Token:', tokens.idToken);

      // UserInfo'ya token'ları ekle
      signInResult.idToken = tokens.idToken;
      signInResult.accessToken = tokens.accessToken;

      // Kullanıcı bilgilerini kaydet
      await saveUserData(signInResult);

      // Başarılı giriş mesajı
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
      dispatch(resetUserInfo());
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

  const revokeAccess = async () => {
    try {
      await GoogleSignin.revokeAccess();
      await GoogleSignin.signOut();
      await AsyncStorage.clear();
      dispatch(resetUserInfo());
      setUserInfoLocal(null);
      Alert.alert('Success', 'Access revoked');
      navigation.reset({
        index: 0,
        routes: [{ name: 'Signin' }],
      });
    } catch (error) {
      console.error('Revoke access error:', error);
      Alert.alert('Error', 'An error occurred while revoking access');
    }
  };

  const getUserInfo = () => {
    if (!userInfo) return null;
    const user = userInfo.user || userInfo.data?.user || userInfo;
    return {
      name: user.name || user.givenName || user.displayName || 'Anonymous',
      email: user.email || 'No email',
      photo: user.photo || user.photoURL || null,
      id: user.id || user.uid || 'No ID',
      familyName: user.familyName || '',
    };
  };

  const user = getUserInfo();

  console.log(user);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4285F4" />
        <Text style={styles.loadingText}>Checking...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Google Sign-In</Text>

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
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 40,
    color: '#333',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  signInContainer: {
    alignItems: 'center',
  },
  customGoogleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4285F4',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  googleIconContainer: {
    width: 24,
    height: 24,
    backgroundColor: 'white',
    borderRadius: 4,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleG: {
    color: '#4285F4',
    fontSize: 16,
    fontWeight: 'bold',
  },
  googleButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  googleSignInButton: {
    width: 250,
    height: 48,
  },
  userContainer: {
    alignItems: 'center',
  },
  userPhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 20,
    borderWidth: 3,
    borderColor: '#4285F4',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  userEmail: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  userId: {
    fontSize: 12,
    color: '#999',
    marginBottom: 30,
  },
  button: {
    backgroundColor: '#4285F4',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    marginVertical: 10,
    width: 200,
    alignItems: 'center',
  },
  continueButton: {
    backgroundColor: '#34A853',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    marginVertical: 10,
    width: 200,
    alignItems: 'center',
  },
  revokeButton: {
    backgroundColor: '#DB4437',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default Signin;
