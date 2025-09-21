// ========== adsService.js - Fixed Version ==========
import {
  InterstitialAd,
  RewardedAd,
  RewardedAdEventType,
  TestIds,
  AdEventType,
  MobileAds,
} from 'react-native-google-mobile-ads';
import { Alert, AppState } from 'react-native';

// Test ID'leri
const adUnitIds = {
  banner: __DEV__ ? TestIds.BANNER : 'ca-app-pub-xxxxxxxxxxxxx/yyyyyyyyyy',
  interstitial: __DEV__
    ? TestIds.INTERSTITIAL
    : 'ca-app-pub-xxxxxxxxxxxxx/yyyyyyyyyy',
  rewarded: __DEV__ ? TestIds.REWARDED : 'ca-app-pub-xxxxxxxxxxxxx/yyyyyyyyyy',
};

// Global değişkenler
let interstitial = null;
let rewarded = null;
let interstitialLoaded = false;
let rewardedLoaded = false;
let isInitialized = false;
let rewardCallback = null;
let initializationPromise = null;

// Interstitial reklam oluştur
const createInterstitialAd = () => {
  try {
    interstitial = InterstitialAd.createForAdRequest(adUnitIds.interstitial, {
      requestNonPersonalizedAdsOnly: true,
    });

    interstitial.addAdEventListener(AdEventType.LOADED, () => {
      interstitialLoaded = true;
      console.log('Interstitial loaded');
    });

    interstitial.addAdEventListener(AdEventType.CLOSED, () => {
      interstitialLoaded = false;
      // Biraz bekleyip yeniden yükle
      setTimeout(() => {
        if (interstitial) {
          interstitial.load();
        }
      }, 1000);
    });

    interstitial.addAdEventListener(AdEventType.ERROR, error => {
      console.error('Interstitial error:', error);
      interstitialLoaded = false;

      // Activity null hatası değilse tekrar dene
      if (!error.message?.includes('null-activity')) {
        setTimeout(() => {
          if (interstitial) {
            interstitial.load();
          }
        }, 5000);
      }
    });

    // İlk yüklemeyi geciktir
    setTimeout(() => {
      if (interstitial && AppState.currentState === 'active') {
        interstitial.load();
      }
    }, 2000);
  } catch (error) {
    console.error('Error creating interstitial:', error);
  }
};

// Rewarded reklam oluştur
const createRewardedAd = () => {
  try {
    rewarded = RewardedAd.createForAdRequest(adUnitIds.rewarded, {
      requestNonPersonalizedAdsOnly: true,
    });

    rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
      rewardedLoaded = true;
      console.log('Rewarded ad loaded');
    });

    rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, reward => {
      console.log('User earned reward:', reward);
      if (rewardCallback) {
        rewardCallback(reward);
        rewardCallback = null;
      }
    });

    rewarded.addAdEventListener(AdEventType.CLOSED, () => {
      rewardedLoaded = false;
      // Biraz bekleyip yeniden yükle
      setTimeout(() => {
        if (rewarded) {
          rewarded.load();
        }
      }, 1000);

      if (rewardCallback) {
        rewardCallback(null);
        rewardCallback = null;
      }
    });

    rewarded.addAdEventListener(AdEventType.ERROR, error => {
      console.error('Rewarded ad error:', error);
      rewardedLoaded = false;

      if (rewardCallback) {
        rewardCallback(null);
        rewardCallback = null;
      }

      // Activity null hatası değilse tekrar dene
      if (!error.message?.includes('null-activity')) {
        setTimeout(() => {
          if (rewarded) {
            rewarded.load();
          }
        }, 5000);
      }
    });

    // İlk yüklemeyi geciktir
    setTimeout(() => {
      if (rewarded && AppState.currentState === 'active') {
        rewarded.load();
      }
    }, 2000);
  } catch (error) {
    console.error('Error creating rewarded ad:', error);
  }
};

// SDK'yı başlat - Geciktirilmiş ve güvenli
export const initializeAds = async () => {
  // Zaten başlatılıyorsa bekle
  if (initializationPromise) {
    return initializationPromise;
  }

  if (isInitialized) {
    return true;
  }

  initializationPromise = new Promise(async resolve => {
    try {
      // Uygulama aktif olana kadar bekle
      if (AppState.currentState !== 'active') {
        const subscription = AppState.addEventListener(
          'change',
          nextAppState => {
            if (nextAppState === 'active') {
              subscription?.remove();
              initializeAdsInternal().then(resolve);
            }
          },
        );
      } else {
        // Biraz geciktir (Activity'nin hazır olması için)
        setTimeout(() => {
          initializeAdsInternal().then(resolve);
        }, 1000);
      }
    } catch (error) {
      console.error('AdMob initialization error:', error);
      resolve(false);
    }
  });

  return initializationPromise;
};

// İç başlatma fonksiyonu
const initializeAdsInternal = async () => {
  try {
    const adapterStatuses = await MobileAds().initialize();
    console.log('AdMob SDK initialized:', adapterStatuses);
    isInitialized = true;

    // Reklamları oluştur
    createInterstitialAd();
    createRewardedAd();

    return true;
  } catch (error) {
    console.error('AdMob initialization error:', error);
    return false;
  }
};

// Interstitial reklamı göster
export const showInterstitialAd = async () => {
  // Başlatılmamışsa bekle
  if (!isInitialized) {
    await initializeAds();
  }

  if (!isInitialized) {
    Alert.alert('Uyarı', 'Reklam sistemi henüz hazır değil.');
    return false;
  }

  if (interstitialLoaded && interstitial) {
    try {
      await interstitial.show();
      return true;
    } catch (error) {
      console.error('Error showing interstitial:', error);
      return false;
    }
  } else {
    Alert.alert('Uyarı', 'Reklam henüz yüklenmedi. Lütfen bekleyin.');
    if (interstitial) {
      interstitial.load();
    }
    return false;
  }
};

// Rewarded reklamı göster - Promise döner
export const showRewardedAd = () => {
  return new Promise(async (resolve, reject) => {
    // Başlatılmamışsa bekle
    if (!isInitialized) {
      await initializeAds();
    }

    if (!isInitialized) {
      Alert.alert('Uyarı', 'Reklam sistemi henüz hazır değil.');
      reject(new Error('Ads not initialized'));
      return;
    }

    if (rewardedLoaded && rewarded) {
      rewardCallback = reward => {
        if (reward) {
          resolve(reward);
        } else {
          reject(new Error('No reward earned'));
        }
      };

      try {
        await rewarded.show();
      } catch (error) {
        console.error('Error showing rewarded ad:', error);
        rewardCallback = null;
        reject(error);
      }
    } else {
      Alert.alert('Uyarı', 'Ödüllü reklam henüz yüklenmedi. Lütfen bekleyin.');
      if (rewarded) {
        rewarded.load();
      }
      reject(new Error('Ad not loaded'));
    }
  });
};

// Reklam durumlarını kontrol et
export const getAdsStatus = () => ({
  isInitialized,
  interstitialLoaded,
  rewardedLoaded,
});

// Reklamları yeniden yükle (hata durumlarında kullanılabilir)
export const reloadAds = () => {
  if (interstitial && AppState.currentState === 'active') {
    interstitial.load();
  }
  if (rewarded && AppState.currentState === 'active') {
    rewarded.load();
  }
};

// AppState değişikliklerini dinle
AppState.addEventListener('change', nextAppState => {
  if (nextAppState === 'active' && isInitialized) {
    // Uygulama aktif olduğunda reklamları yeniden yükle
    setTimeout(() => {
      reloadAds();
    }, 1000);
  }
});
