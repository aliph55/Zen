import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useDispatch } from 'react-redux';
import { setUserInfo, resetUserInfo } from '../redux/userInfo';

import { GoogleSignin } from '@react-native-google-signin/google-signin';
// Modern modular API import
import {
  getAuth,
  signInWithCredential,
  GoogleAuthProvider,
} from '@react-native-firebase/auth';

const Signin = () => {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const dispatch = useDispatch();

  useEffect(() => {
    // Google Sign-In yapılandırması
    GoogleSignin.configure({
      webClientId:
        '53852373022-th52gtqcb9bah24899cunbl5i6n1bol1.apps.googleusercontent.com',
      offlineAccess: true,
    });

    // Mevcut kullanıcıyı kontrol et - Modern API
    const authInstance = getAuth();
    const unsubscribe = authInstance.onAuthStateChanged(firebaseUser => {
      setUser(firebaseUser);

      // Firebase kullanıcısı varsa Redux'a kaydet
      if (firebaseUser) {
        dispatch(
          setUserInfo({
            givenName: firebaseUser.displayName?.split(' ')[0] || '',
            familyName:
              firebaseUser.displayName?.split(' ').slice(1).join(' ') || '',
            email: firebaseUser.email || '',
            photo: firebaseUser.photoURL || '',
            name: firebaseUser.displayName || '',
            id: firebaseUser.uid || '',
          }),
        );
      } else {
        // Kullanıcı çıkış yaptıysa Redux'ı temizle
        dispatch(resetUserInfo());
      }
    });

    return () => unsubscribe();
  }, [dispatch]);

  const onGoogleButtonPress = async () => {
    try {
      setLoading(true);

      // Google Play servislerinin kullanılabilir olduğunu kontrol et
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });

      // Google hesabı ile giriş yap
      const signInResult = await GoogleSignin.signIn();
      const idToken = signInResult.data?.idToken;

      if (!idToken) {
        throw new Error('ID Token alınamadı');
      }

      // Modern API ile Google credential oluştur
      const googleCredential = GoogleAuthProvider.credential(idToken);

      // Firebase ile giriş yap - Modern API
      const authInstance = getAuth();
      const userCredential = await signInWithCredential(
        authInstance,
        googleCredential,
      );

      console.log('Giriş başarılı:', userCredential?.user);
      Alert.alert('Başarılı', 'Google ile giriş yapıldı!');

      // Not: Redux güncelleme onAuthStateChanged callback'inde otomatik yapılacak
    } catch (error) {
      console.error('Google Sign-In hatası:', error);

      // Hata mesajlarını daha iyi göster
      let errorMessage = 'Giriş yapılırken bir hata oluştu';

      if (error.code === 'auth/invalid-credential') {
        errorMessage = 'Geçersiz kimlik bilgileri';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'İnternet bağlantısı hatası';
      } else if (
        error.code === 'auth/account-exists-with-different-credential'
      ) {
        errorMessage = 'Bu hesap farklı bir giriş yöntemi ile kayıtlı';
      } else if (error.message) {
        errorMessage = error.message;
      }

      Alert.alert('Hata', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await GoogleSignin.signOut();
      const authInstance = getAuth();
      await authInstance.signOut();
      // Redux temizleme onAuthStateChanged'de otomatik yapılacak
      Alert.alert('Başarılı', 'Çıkış yapıldı');
    } catch (error) {
      console.error('Sign-Out hatası:', error);
      Alert.alert('Hata', 'Çıkış yapılırken bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  if (user) {
    return (
      <View style={styles.container}>
        <View style={styles.userInfo}>
          <Text style={styles.welcomeText}>Hoş geldiniz!</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
          <Text style={styles.userName}>{user.displayName}</Text>
          {user.photoURL && (
            <Text style={styles.photoUrl} numberOfLines={1}>
              Profil: {user.photoURL}
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={[styles.button, styles.signOutButton]}
          onPress={signOut}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Çıkış Yap</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>ZenAI</Text>
        <Text style={styles.subtitle}>Google hesabınızla giriş yapın</Text>

        <TouchableOpacity
          style={styles.googleButton}
          onPress={onGoogleButtonPress}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.googleButtonText}>🔐</Text>
              <Text style={styles.buttonText}>Google ile Giriş Yap</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '80%',
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
    textAlign: 'center',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4285F4',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    width: '100%',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  googleButtonText: {
    fontSize: 24,
    marginRight: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  userInfo: {
    alignItems: 'center',
    marginBottom: 40,
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  userEmail: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  userName: {
    fontSize: 18,
    color: '#333',
    fontWeight: '500',
    marginBottom: 5,
  },
  photoUrl: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  button: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    width: '80%',
    alignItems: 'center',
  },
  signOutButton: {
    backgroundColor: '#f44336',
  },
});

export default Signin;
