// App.js
import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
// SafeAreaView'i react-native-safe-area-context'ten import ediyoruz
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  BannerAd,
  BannerAdSize,
  InterstitialAd,
  RewardedAd,
  RewardedAdEventType,
  TestIds,
  AdEventType,
  // mobileAds doğru şekilde import ediliyor
  MobileAds,
} from 'react-native-google-mobile-ads';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Test ID'leri (Production'da kendi ID'lerinizi kullanın)
const adUnitIds = {
  banner: __DEV__ ? TestIds.BANNER : 'ca-app-pub-xxxxxxxxxxxxx/yyyyyyyyyy',
  interstitial: __DEV__
    ? TestIds.INTERSTITIAL
    : 'ca-app-pub-xxxxxxxxxxxxx/yyyyyyyyyy',
  rewarded: __DEV__ ? TestIds.REWARDED : 'ca-app-pub-xxxxxxxxxxxxx/yyyyyyyyyy',
};

// Interstitial reklam oluştur
const interstitial = InterstitialAd.createForAdRequest(adUnitIds.interstitial, {
  requestNonPersonalizedAdsOnly: true,
});

// Rewarded reklam oluştur
const rewarded = RewardedAd.createForAdRequest(adUnitIds.rewarded, {
  requestNonPersonalizedAdsOnly: true,
});

const Ads = () => {
  const [interstitialLoaded, setInterstitialLoaded] = useState(false);
  const [rewardedLoaded, setRewardedLoaded] = useState(false);
  const [coins, setCoins] = useState(0);
  const [bannerError, setBannerError] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Mobile Ads SDK'yı başlat - Doğru kullanım
    const initializeAds = async () => {
      try {
        const adapterStatuses = await MobileAds().initialize();
        console.log('AdMob SDK initialized:', adapterStatuses);
        setIsInitialized(true);
      } catch (error) {
        console.error('AdMob initialization error:', error);
      }
    };

    initializeAds();

    // Interstitial reklam dinleyicileri
    const unsubscribeInterstitialLoaded = interstitial.addAdEventListener(
      AdEventType.LOADED,
      () => {
        setInterstitialLoaded(true);
        console.log('Interstitial loaded');
      },
    );

    const unsubscribeInterstitialClosed = interstitial.addAdEventListener(
      AdEventType.CLOSED,
      () => {
        setInterstitialLoaded(false);
        // Yeni reklam yükle
        interstitial.load();
      },
    );

    // Interstitial hata dinleyicisi
    const unsubscribeInterstitialError = interstitial.addAdEventListener(
      AdEventType.ERROR,
      error => {
        console.error('Interstitial error:', error);
        setInterstitialLoaded(false);
        // 3 saniye sonra tekrar dene
        setTimeout(() => {
          interstitial.load();
        }, 3000);
      },
    );

    // Rewarded reklam dinleyicileri
    const unsubscribeRewardedLoaded = rewarded.addAdEventListener(
      RewardedAdEventType.LOADED,
      () => {
        setRewardedLoaded(true);
        console.log('Rewarded ad loaded');
      },
    );

    const unsubscribeRewardedEarned = rewarded.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      reward => {
        console.log('User earned reward:', reward);
        setCoins(prevCoins => prevCoins + reward.amount);
        Alert.alert('Tebrikler!', `${reward.amount} coin kazandınız!`);
      },
    );

    const unsubscribeRewardedClosed = rewarded.addAdEventListener(
      AdEventType.CLOSED,
      () => {
        setRewardedLoaded(false);
        // Yeni reklam yükle
        rewarded.load();
      },
    );

    // Rewarded hata dinleyicisi
    const unsubscribeRewardedError = rewarded.addAdEventListener(
      AdEventType.ERROR,
      error => {
        console.error('Rewarded ad error:', error);
        setRewardedLoaded(false);
        // 3 saniye sonra tekrar dene
        setTimeout(() => {
          rewarded.load();
        }, 3000);
      },
    );

    // İlk reklamları yükle
    interstitial.load();
    rewarded.load();

    // Cleanup
    return () => {
      unsubscribeInterstitialLoaded();
      unsubscribeInterstitialClosed();
      unsubscribeInterstitialError();
      unsubscribeRewardedLoaded();
      unsubscribeRewardedEarned();
      unsubscribeRewardedClosed();
      unsubscribeRewardedError();
    };
  }, []);

  const showInterstitialAd = () => {
    if (interstitialLoaded) {
      interstitial.show();
    } else {
      Alert.alert('Uyarı', 'Reklam henüz yüklenmedi. Lütfen bekleyin.');
      interstitial.load();
    }
  };

  const showRewardedAd = () => {
    if (rewardedLoaded) {
      rewarded.show();
    } else {
      Alert.alert('Uyarı', 'Ödüllü reklam henüz yüklenmedi. Lütfen bekleyin.');
      rewarded.load();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Icon name="monetization-on" size={50} color="#4CAF50" />
          <Text style={styles.title}>React Native Ads Demo</Text>
          <Text style={styles.subtitle}>Google Mobile Ads Entegrasyonu</Text>
        </View>

        {/* SDK Status */}
        {!isInitialized && (
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>AdMob SDK yükleniyor...</Text>
          </View>
        )}

        {/* Coin Counter */}
        <View style={styles.coinContainer}>
          <Icon name="stars" size={30} color="#FFD700" />
          <Text style={styles.coinText}>Coins: {coins}</Text>
        </View>

        {/* Ad Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[
              styles.button,
              !interstitialLoaded && styles.buttonDisabled,
            ]}
            onPress={showInterstitialAd}
            disabled={!interstitialLoaded || !isInitialized}
          >
            <Icon name="play-circle-outline" size={24} color="white" />
            <Text style={styles.buttonText}>
              {interstitialLoaded
                ? 'Interstitial Reklam Göster'
                : 'Yükleniyor...'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.rewardedButton,
              !rewardedLoaded && styles.buttonDisabled,
            ]}
            onPress={showRewardedAd}
            disabled={!rewardedLoaded || !isInitialized}
          >
            <Icon name="card-giftcard" size={24} color="white" />
            <Text style={styles.buttonText}>
              {rewardedLoaded
                ? 'Ödüllü Reklam İzle (+10 Coin)'
                : 'Yükleniyor...'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Info Cards */}
        <View style={styles.infoContainer}>
          <View style={styles.infoCard}>
            <Icon name="info-outline" size={20} color="#2196F3" />
            <Text style={styles.infoTitle}>Banner Reklam</Text>
            <Text style={styles.infoText}>
              Sayfanın altında sürekli görünen reklam türü
            </Text>
          </View>

          <View style={styles.infoCard}>
            <Icon name="fullscreen" size={20} color="#FF9800" />
            <Text style={styles.infoTitle}>Interstitial Reklam</Text>
            <Text style={styles.infoText}>
              Tam ekran geçiş reklamı, kapatılabilir
            </Text>
          </View>

          <View style={styles.infoCard}>
            <Icon name="redeem" size={20} color="#4CAF50" />
            <Text style={styles.infoTitle}>Ödüllü Reklam</Text>
            <Text style={styles.infoText}>
              İzleyene ödül veren video reklam türü
            </Text>
          </View>
        </View>

        {/* Test Mode Warning */}
        {__DEV__ && (
          <View style={styles.warningContainer}>
            <Icon name="warning" size={20} color="#FF5722" />
            <Text style={styles.warningText}>
              Test modunda çalışıyor. Production'da gerçek reklam ID'lerini
              kullanın.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Banner Ad */}
      {!bannerError && isInitialized && (
        <View style={styles.bannerContainer}>
          <BannerAd
            unitId={adUnitIds.banner}
            size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
            requestOptions={{
              requestNonPersonalizedAdsOnly: true,
            }}
            onAdFailedToLoad={error => {
              console.error('Banner ad failed to load:', error);
              setBannerError(true);
            }}
          />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 100, // Banner için boşluk
  },
  header: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: 'white',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  statusContainer: {
    alignItems: 'center',
    padding: 10,
    marginHorizontal: 20,
    marginBottom: 10,
    backgroundColor: '#FFF3E0',
    borderRadius: 10,
  },
  statusText: {
    fontSize: 14,
    color: '#E65100',
  },
  coinContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 15,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  coinText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10,
  },
  buttonContainer: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2196F3',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  rewardedButton: {
    backgroundColor: '#4CAF50',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
    elevation: 1,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  infoContainer: {
    paddingHorizontal: 20,
  },
  infoCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 5,
    marginBottom: 5,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 10,
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: '#E65100',
    marginLeft: 10,
    lineHeight: 18,
  },
  bannerContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
});

export default Ads;
