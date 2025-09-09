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
        setUserInfoLocal(currentUser);

        // Redux'a kullanıcı bilgilerini kaydet
        const userData = currentUser?.user || currentUser;
        dispatch(setUserInfo(userData));

        // TEST İÇİN: Kullanıcı giriş yapmış olsa bile aynı sayfada kal
        // Normalde: navigateToHome(currentUser);
      }
    } catch (error) {
      console.log('Kullanıcı durumu kontrol hatası:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToHome = userInfo => {
    // Navigation stack'i resetle ve Home'a git
    navigation.reset({
      index: 0,
      routes: [
        {
          name: 'Home', // veya 'MainTab', 'Dashboard' - sizin route isminiz
          params: { user: userInfo },
        },
      ],
    });
  };

  const saveUserData = async userInfo => {
    try {
      // User bilgilerini AsyncStorage'a kaydet
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
      setUserInfoLocal(signInResult);

      // Redux'a kullanıcı bilgilerini kaydet
      const userData = signInResult?.user || signInResult;
      dispatch(setUserInfo(userData));

      // Token'ları al
      try {
        const tokens = await GoogleSignin.getTokens();
        console.log('Access Token:', tokens.accessToken);
        console.log('ID Token:', tokens.idToken);

        // UserInfo'ya token'ları ekle
        signInResult.idToken = tokens.idToken;
        signInResult.accessToken = tokens.accessToken;
      } catch (tokenError) {
        console.log('Token alma hatası:', tokenError);
      }

      // Kullanıcı bilgilerini kaydet
      await saveUserData(signInResult);

      // Kullanıcı adını güvenli bir şekilde al
      const userName =
        userData?.name ||
        userData?.givenName ||
        userData?.email?.split('@')[0] ||
        'Kullanıcı';

      // Başarılı giriş mesajı
      Alert.alert(
        'Başarılı',
        `Hoş geldiniz, ${userName}!`,
        [
          {
            text: 'Tamam',
            onPress: () => navigateToHome(signInResult),
          },
        ],
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
      Alert.alert('İptal', 'Giriş işlemi iptal edildi');
    } else if (error.code === statusCodes.IN_PROGRESS) {
      Alert.alert('Devam Ediyor', 'Giriş işlemi zaten devam ediyor');
    } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      Alert.alert(
        'Hata',
        'Google Play Services kullanılamıyor veya güncel değil',
      );
    } else {
      Alert.alert('Hata', `Giriş hatası: ${error.message || error.toString()}`);
    }
  };

  const signOut = async () => {
    try {
      await GoogleSignin.signOut();

      // AsyncStorage'ı temizle
      await AsyncStorage.multiRemove(['userInfo', 'userToken', 'isLoggedIn']);

      // Redux state'ini temizle
      dispatch(resetUserInfo());

      setUserInfoLocal(null);
      Alert.alert('Başarılı', 'Çıkış yapıldı');

      // Login sayfasına geri dön
      navigation.reset({
        index: 0,
        routes: [{ name: 'Signin' }],
      });
    } catch (error) {
      console.error('Çıkış hatası:', error);
      Alert.alert('Hata', 'Çıkış yapılırken bir hata oluştu');
    }
  };

  const revokeAccess = async () => {
    try {
      await GoogleSignin.revokeAccess();
      await GoogleSignin.signOut();

      // AsyncStorage'ı temizle
      await AsyncStorage.clear();

      // Redux state'ini temizle
      dispatch(resetUserInfo());

      setUserInfoLocal(null);
      Alert.alert('Başarılı', 'Erişim izinleri kaldırıldı');

      // Login sayfasına geri dön
      navigation.reset({
        index: 0,
        routes: [{ name: 'Signin' }],
      });
    } catch (error) {
      console.error('Erişim iptali hatası:', error);
      Alert.alert('Hata', 'Erişim iptal edilirken bir hata oluştu');
    }
  };

  const getUserInfo = () => {
    if (!userInfo) return null;

    // Farklı veri yapılarını destekle
    const user = userInfo.user || userInfo.data?.user || userInfo;

    if (!user) return null;

    return {
      name: user.name || user.givenName || user.displayName || 'İsimsiz',
      email: user.email || 'Email yok',
      photo: user.photo || user.photoURL || null,
      id: user.id || user.uid || 'ID yok',
      familyName: user.familyName || '',
    };
  };

  const user = getUserInfo();

  // İlk yükleme ekranı
  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4285F4" />
        <Text style={styles.loadingText}>Kontrol ediliyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Google Sign-In</Text>

      {user ? (
        <View style={styles.userContainer}>
          {user.photo && (
            <Image source={{ uri: user.photo }} style={styles.userPhoto} />
          )}
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
          <Text style={styles.userId}>ID: {user.id}</Text>

          <TouchableOpacity
            style={styles.continueButton}
            onPress={() => navigateToHome(userInfo)}
          >
            <Text style={styles.buttonText}>Ana Sayfaya Git</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={signOut}>
            <Text style={styles.buttonText}>Çıkış Yap</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.revokeButton]}
            onPress={revokeAccess}
          >
            <Text style={styles.buttonText}>Erişimi İptal Et</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.signInContainer}>
          {/* Özel buton tasarımı */}
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
                <Text style={styles.googleButtonText}>
                  Google ile Giriş Yap
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Veya hazır Google butonu kullanın */}
          <GoogleSigninButton
            style={styles.googleSignInButton}
            size={GoogleSigninButton.Size.Wide}
            color={GoogleSigninButton.Color.Dark}
            onPress={signIn}
            disabled={isSigninInProgress}
          />
        </View>
      )}
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
