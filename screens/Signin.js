import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { useDispatch } from 'react-redux';
import { setUserInfo, resetUserInfo } from '../redux/userInfo';

import { GoogleSignin } from '@react-native-google-signin/google-signin';
import {
  getAuth,
  signInWithCredential,
  GoogleAuthProvider,
} from '@react-native-firebase/auth';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const Signin = () => {
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const dispatch = useDispatch();

  const navigate = useNavigation();

  useEffect(() => {
    GoogleSignin.configure({
      webClientId:
        '53852373022-th52gtqcb9bah24899cunbl5i6n1bol1.apps.googleusercontent.com',
      offlineAccess: true,
    });

    const authInstance = getAuth();
    const unsubscribe = authInstance.onAuthStateChanged(firebaseUser => {
      setUser(firebaseUser);

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
        navigate.navigate('Download');
      } else {
        dispatch(resetUserInfo());
      }
    });

    return () => unsubscribe();
  }, [dispatch]);

  const onGoogleButtonPress = async () => {
    try {
      setLoading(true);

      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });

      const signInResult = await GoogleSignin.signIn();
      const idToken = signInResult.data?.idToken;

      if (!idToken) {
        throw new Error('ID Token alınamadı');
      }

      const googleCredential = GoogleAuthProvider.credential(idToken);
      const authInstance = getAuth();
      const userCredential = await signInWithCredential(
        authInstance,
        googleCredential,
      );
      navigate.navigate('Download');

      console.log('Giriş başarılı:', userCredential?.user);
      Alert.alert('Başarılı', 'Google ile giriş yapıldı!');
    } catch (error) {
      console.error('Google Sign-In hatası:', error);

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
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user.displayName?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
            <View style={styles.onlineBadge} />
          </View>

          <Text style={styles.welcomeText}>Welcome back</Text>
          <Text style={styles.userName}>{user.displayName}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={signOut}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={styles.logoutIcon}>🚪</Text>
                <Text style={styles.logoutText}>Sign Out</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.decorativeCircle1} />
        <View style={styles.decorativeCircle2} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.decorativeCircle1} />
      <View style={styles.decorativeCircle2} />

      <View style={styles.loginCard}>
        <View style={styles.logoContainer}>
          <View style={styles.logo}>
            <Text style={styles.logoText}>Z</Text>
          </View>
        </View>

        <Text style={styles.title}>ZenAI</Text>
        <Text style={styles.subtitle}>
          Welcome to your AI-powered assistant
        </Text>

        <View style={styles.featuresContainer}>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>✨</Text>
            <Text style={styles.featureText}>Smart</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>🔒</Text>
            <Text style={styles.featureText}>Secure</Text>
          </View>
          <View style={styles.featureItem}>
            <Text style={styles.featureIcon}>⚡</Text>
            <Text style={styles.featureText}>Fast</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.googleButton}
          onPress={onGoogleButtonPress}
          disabled={loading}
          activeOpacity={0.9}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <View style={styles.googleIconContainer}>
                <Text style={styles.googleIcon}>G</Text>
              </View>
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.termsText}>
          By continuing, you agree to our{' '}
          <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
          <Text style={styles.termsLink}>Privacy Policy</Text>
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  decorativeCircle1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    top: -100,
    right: -100,
  },
  decorativeCircle2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(168, 85, 247, 0.1)',
    bottom: -50,
    left: -50,
  },
  loginCard: {
    width: width * 0.9,
    maxWidth: 400,
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 25,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  logoContainer: {
    marginBottom: 24,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  logoText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 15,
    color: '#94A3B8',
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  featuresContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  featureItem: {
    alignItems: 'center',
    flex: 1,
  },
  featureIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  featureText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 20,
  },
  googleIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4285F4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  googleIcon: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  googleButtonText: {
    color: '#1E293B',
    fontSize: 16,
    fontWeight: '700',
  },
  termsText: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 8,
  },
  termsLink: {
    color: '#818CF8',
    fontWeight: '600',
  },
  profileCard: {
    width: width * 0.9,
    maxWidth: 400,
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 25,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 24,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#334155',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10B981',
    borderWidth: 3,
    borderColor: '#1E293B',
  },
  welcomeText: {
    fontSize: 16,
    color: '#94A3B8',
    marginBottom: 8,
    fontWeight: '500',
  },
  userName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  userEmail: {
    fontSize: 15,
    color: '#64748B',
    marginBottom: 24,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 24,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: '100%',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  logoutIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default Signin;
