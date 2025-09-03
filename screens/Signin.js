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

const Signin = () => {
  const [userInfo, setUserInfo] = useState(null);
  const [isSigninInProgress, setIsSigninInProgress] = useState(false);

  useEffect(() => {
    // Google Sign-In'i yapılandır
    GoogleSignin.configure({
      // WEB CLIENT ID - Bu zorunlu!
      // Google Cloud Console'dan Web Application type için oluşturduğunuz Client ID
      webClientId:
        '53852373022-rkjsk0003jki7e4d2g0mba89a95udble.apps.googleusercontent.com', // <-- Buraya Web Client ID'nizi yazın

      // iOS Client ID (sadece iOS için, opsiyonel)
      // iosClientId: 'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com',

      // Opsiyonel ayarlar
      offlineAccess: true, // refresh token almak için
      forceCodeForRefreshToken: true, // iOS'ta refresh token almak için

      // Ekstra scope'lar gerekiyorsa (varsayılan: email ve profile)
      // scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });

    // Önceden giriş yapılmış mı kontrol et
    checkSignInStatus();
  }, []);

  const checkSignInStatus = async () => {
    try {
      // isSignedIn() yeni versiyonlarda getCurrentUser() ile değiştirildi
      const currentUser = await GoogleSignin.getCurrentUser();
      if (currentUser) {
        setUserInfo(currentUser);
        console.log('Mevcut kullanıcı:', currentUser);
      }
    } catch (error) {
      console.log('Kullanıcı durumu kontrol hatası:', error);
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
      const userInfo = await GoogleSignin.signIn();
      setUserInfo(userInfo);
      console.log('Giriş başarılı:', userInfo);

      // Token'ları al (opsiyonel)
      try {
        const tokens = await GoogleSignin.getTokens();
        console.log('Access Token:', tokens.accessToken);
        console.log('ID Token:', tokens.idToken);

        // Backend'inize gönderebilirsiniz
        // await sendTokenToBackend(tokens.idToken);
      } catch (tokenError) {
        console.log('Token alma hatası:', tokenError);
      }
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
      setUserInfo(null);
      Alert.alert('Başarılı', 'Çıkış yapıldı');
    } catch (error) {
      console.error('Çıkış hatası:', error);
      Alert.alert('Hata', 'Çıkış yapılırken bir hata oluştu');
    }
  };

  const revokeAccess = async () => {
    try {
      await GoogleSignin.revokeAccess();
      await GoogleSignin.signOut();
      setUserInfo(null);
      Alert.alert('Başarılı', 'Erişim izinleri kaldırıldı');
    } catch (error) {
      console.error('Erişim iptali hatası:', error);
      Alert.alert('Hata', 'Erişim iptal edilirken bir hata oluştu');
    }
  };

  const getUserInfo = () => {
    if (!userInfo || !userInfo.user) return null;

    return {
      name: userInfo.user.name || userInfo.user.givenName || 'İsimsiz',
      email: userInfo.user.email || 'Email yok',
      photo: userInfo.user.photo || null,
      id: userInfo.user.id,
    };
  };

  const user = getUserInfo();

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
