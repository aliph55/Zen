import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions,
  StatusBar,
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
import LinearGradient from 'react-native-linear-gradient';

const { width, height } = Dimensions.get('window');

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
      <LinearGradient
        colors={['#0F172A', '#1E293B', '#0F172A']}
        style={styles.container}
      >
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

        {/* Animated Background Blobs */}
        <View style={styles.blob1} />
        <View style={styles.blob2} />
        <View style={styles.blob3} />

        <View style={styles.profileCard}>
          {/* Avatar */}
          <View style={styles.avatarWrapper}>
            <LinearGradient
              colors={['#8B5CF6', '#EC4899', '#EF4444']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatarGradient}
            >
              <Text style={styles.avatarText}>
                {user.displayName?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </LinearGradient>
            <View style={styles.onlineBadge} />
          </View>

          {/* User Info */}
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.userName}>{user.displayName}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>24</Text>
              <Text style={styles.statLabel}>Chats</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>156</Text>
              <Text style={styles.statLabel}>Messages</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>12</Text>
              <Text style={styles.statLabel}>Days</Text>
            </View>
          </View>

          {/* Logout Button */}
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
                <Text style={styles.logoutText}>Sign Out</Text>
                <Text style={styles.logoutIcon}>→</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#0F172A', '#1E293B', '#0F172A']}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* Animated Background Blobs */}
      <View style={styles.blob1} />
      <View style={styles.blob2} />
      <View style={styles.blob3} />

      <View style={styles.content}>
        {/* Logo & Title */}
        <View style={styles.header}>
          <LinearGradient
            colors={['#8B5CF6', '#EC4899']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoGradient}
          >
            <Text style={styles.logoText}>Z</Text>
          </LinearGradient>

          <Text style={styles.title}>ZenAI</Text>
          <Text style={styles.subtitle}>Your intelligent AI companion</Text>
        </View>

        {/* Feature Cards */}
        <View style={styles.featuresGrid}>
          <View style={styles.featureCard}>
            <LinearGradient
              colors={['rgba(139, 92, 246, 0.15)', 'rgba(139, 92, 246, 0.05)']}
              style={styles.featureGradient}
            >
              <Text style={styles.featureEmoji}>✨</Text>
              <Text style={styles.featureTitle}>Smart AI</Text>
              <Text style={styles.featureDesc}>Advanced intelligence</Text>
            </LinearGradient>
          </View>

          <View style={styles.featureCard}>
            <LinearGradient
              colors={['rgba(236, 72, 153, 0.15)', 'rgba(236, 72, 153, 0.05)']}
              style={styles.featureGradient}
            >
              <Text style={styles.featureEmoji}>🔒</Text>
              <Text style={styles.featureTitle}>Secure</Text>
              <Text style={styles.featureDesc}>Privacy first</Text>
            </LinearGradient>
          </View>

          <View style={styles.featureCard}>
            <LinearGradient
              colors={['rgba(239, 68, 68, 0.15)', 'rgba(239, 68, 68, 0.05)']}
              style={styles.featureGradient}
            >
              <Text style={styles.featureEmoji}>⚡</Text>
              <Text style={styles.featureTitle}>Fast</Text>
              <Text style={styles.featureDesc}>Instant responses</Text>
            </LinearGradient>
          </View>
        </View>

        {/* Google Sign In Button */}
        <TouchableOpacity
          style={styles.googleButton}
          onPress={onGoogleButtonPress}
          disabled={loading}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={['#ffffff', '#f8f9fa']}
            style={styles.googleButtonGradient}
          >
            {loading ? (
              <ActivityIndicator color="#1E293B" size="small" />
            ) : (
              <>
                <View style={styles.googleIconWrapper}>
                  <Text style={styles.googleG}>G</Text>
                </View>
                <Text style={styles.googleButtonText}>
                  Continue with Google
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Terms */}
        <Text style={styles.termsText}>
          By continuing, you agree to our{'\n'}
          <Text style={styles.termsLink}>Terms</Text> and{' '}
          <Text style={styles.termsLink}>Privacy Policy</Text>
        </Text>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Animated Blobs
  blob1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    top: -150,
    right: -100,
    opacity: 0.6,
  },
  blob2: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(236, 72, 153, 0.08)',
    bottom: -100,
    left: -80,
    opacity: 0.6,
  },
  blob3: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    top: height * 0.4,
    right: -50,
    opacity: 0.6,
  },

  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoGradient: {
    width: 72,
    height: 72,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  logoText: {
    fontSize: 36,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -1,
  },
  title: {
    fontSize: 42,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 8,
    letterSpacing: -2,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '500',
    letterSpacing: 0.5,
  },

  // Features Grid
  featuresGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 40,
    width: '100%',
  },
  featureCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  featureGradient: {
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 16,
  },
  featureEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  featureTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
  },

  // Google Button
  googleButton: {
    width: '100%',
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  googleButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  googleIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4285F4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  googleG: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
  googleButtonText: {
    color: '#1E293B',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Terms
  termsText: {
    fontSize: 11,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    color: '#8B5CF6',
    fontWeight: '700',
  },

  // Profile Card
  profileCard: {
    width: width * 0.9,
    maxWidth: 400,
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    backdropFilter: 'blur(20px)',
    borderRadius: 32,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 24 },
    shadowOpacity: 0.4,
    shadowRadius: 32,
    elevation: 12,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 24,
  },
  avatarGradient: {
    width: 110,
    height: 110,
    borderRadius: 55,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  avatarText: {
    fontSize: 44,
    fontWeight: '900',
    color: '#fff',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#10B981',
    borderWidth: 4,
    borderColor: 'rgba(30, 41, 59, 0.9)',
  },
  welcomeText: {
    fontSize: 15,
    color: '#64748B',
    marginBottom: 8,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  userName: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -1,
  },
  userEmail: {
    fontSize: 15,
    color: '#64748B',
    marginBottom: 32,
    fontWeight: '500',
  },

  // Stats
  statsContainer: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 4,
    letterSpacing: -1,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginHorizontal: 12,
  },

  // Logout Button
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: '100%',
    borderWidth: 1.5,
    borderColor: '#EF4444',
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '800',
    marginRight: 8,
    letterSpacing: 0.5,
  },
  logoutIcon: {
    color: '#EF4444',
    fontSize: 18,
    fontWeight: '900',
  },
});

export default Signin;
