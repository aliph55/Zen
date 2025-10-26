import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Alert,
  TouchableOpacity,
} from 'react-native';
import RNFS from 'react-native-fs';

// DÜZELTME: Google Drive büyük dosyalar için özel URL
const MODEL_FILE_ID = '1uKWwxPq9XcmEg6M4Y_kaUphU_7W8TbAk';
const MODEL_DRIVE_URL = `https://drive.google.com/uc?export=download&id=${MODEL_FILE_ID}&confirm=t`;
const MODEL_LOCAL_PATH = `${RNFS.DocumentDirectoryPath}/model.onnx`;

const Download = ({ onDownloadComplete }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [statusMessage, setStatusMessage] = useState(
    'Model kontrol ediliyor...',
  );

  const downloadModel = async () => {
    try {
      setIsDownloading(true);
      setError(null);
      setStatusMessage('Model kontrol ediliyor...');

      // Model zaten var mı kontrol et
      const exists = await RNFS.exists(MODEL_LOCAL_PATH);
      if (exists) {
        console.log('✅ Model zaten mevcut, boyut kontrol ediliyor...');
        const stat = await RNFS.stat(MODEL_LOCAL_PATH);
        console.log('📊 Mevcut model boyutu:', stat.size, 'bytes');

        // Dosya boyutu 0'dan büyükse geçerli
        if (stat.size > 0) {
          console.log('✅ Model geçerli, indirme atlanıyor.');
          setStatusMessage('Model hazır!');

          if (typeof onDownloadComplete === 'function') {
            onDownloadComplete(MODEL_LOCAL_PATH);
          } else {
            console.error('❌ onDownloadComplete fonksiyonu tanımlı değil.');
            setError('Uygulama yapılandırma hatası.');
            Alert.alert(
              'Hata',
              'Uygulama yapılandırma hatası: onDownloadComplete fonksiyonu sağlanmadı.',
            );
          }
          setIsDownloading(false);
          return;
        } else {
          console.log('⚠️ Mevcut model dosyası boş, yeniden indiriliyor...');
          await RNFS.unlink(MODEL_LOCAL_PATH);
        }
      }

      console.log('📥 Model indiriliyor...');
      setStatusMessage('Model indiriliyor...');

      const downloadOptions = {
        fromUrl: MODEL_DRIVE_URL,
        toFile: MODEL_LOCAL_PATH,
        background: false, // Foreground'da indir
        progressDivider: 10, // Her %10'da bir güncelle
        begin: res => {
          console.log('🚀 İndirme başladı');
          console.log('📊 Toplam boyut:', res.contentLength, 'bytes');
          console.log('📊 Status code:', res.statusCode);
          console.log('📊 Headers:', JSON.stringify(res.headers));
        },
        progress: res => {
          const progressPercent =
            res.contentLength > 0
              ? (res.bytesWritten / res.contentLength) * 100
              : 0;
          setDownloadProgress(progressPercent);
          console.log(
            `📥 İndirildi: ${progressPercent.toFixed(1)}% (${
              res.bytesWritten
            }/${res.contentLength})`,
          );
          setStatusMessage(`Model indiriliyor: ${progressPercent.toFixed(0)}%`);
        },
      };

      console.log("🔗 İndirme URL'si:", MODEL_DRIVE_URL);
      const result = await RNFS.downloadFile(downloadOptions).promise;

      console.log('✅ İndirme tamamlandı, status code:', result.statusCode);
      console.log('📊 Yazılan byte:', result.bytesWritten);

      if (result.statusCode === 200) {
        // Dosya boyutunu kontrol et
        const stat = await RNFS.stat(MODEL_LOCAL_PATH);
        console.log('📊 İndirilen dosya boyutu:', stat.size, 'bytes');

        if (stat.size === 0) {
          throw new Error('İndirilen dosya boş!');
        }

        // Dosya içeriğini kontrol et (ilk birkaç byte)
        const firstBytes = await RNFS.read(MODEL_LOCAL_PATH, 100, 0, 'utf8');
        console.log('📄 Dosya başlangıcı:', firstBytes.substring(0, 50));

        // HTML sayfası mı kontrol et (Google Drive virus scan sayfası)
        if (
          firstBytes.includes('<!DOCTYPE html>') ||
          firstBytes.includes('<html')
        ) {
          console.error('❌ Google Drive virus scan sayfası indirildi!');
          await RNFS.unlink(MODEL_LOCAL_PATH);
          throw new Error(
            'Google Drive büyük dosya indirme hatası. Lütfen dosyayı manuel olarak assets klasörüne koyun.',
          );
        }

        console.log('✅ Model başarıyla indirildi:', MODEL_LOCAL_PATH);
        setStatusMessage('Model başarıyla indirildi!');

        if (typeof onDownloadComplete === 'function') {
          onDownloadComplete(MODEL_LOCAL_PATH);
        } else {
          console.error('❌ onDownloadComplete fonksiyonu tanımlı değil.');
          setError('Uygulama yapılandırma hatası.');
          Alert.alert(
            'Hata',
            'Uygulama yapılandırma hatası: onDownloadComplete fonksiyonu sağlanmadı.',
          );
        }
      } else {
        throw new Error(`İndirme hatası, durum kodu: ${result.statusCode}`);
      }
    } catch (err) {
      console.error('❌ Model indirme hatası:', err);
      const errorMessage = `Model indirilemedi: ${err.message}. 

Çözüm:
1. Model dosyasını manuel olarak android/app/src/main/assets/ klasörüne koyun
2. Veya internet bağlantınızı kontrol edin`;

      setError(errorMessage);
      setStatusMessage('Hata oluştu');
      Alert.alert('Model İndirme Hatası', errorMessage);
    } finally {
      setIsDownloading(false);
    }
  };

  useEffect(() => {
    downloadModel();
  }, []);

  const handleRetry = () => {
    setError(null);
    setDownloadProgress(0);
    downloadModel();
  };

  const handleSkip = () => {
    if (typeof onDownloadComplete === 'function') {
      // Model yok ama devam et (assets'ten yüklenecek)
      onDownloadComplete(null);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>AI Model Hazırlanıyor</Text>

      {isDownloading ? (
        <View style={styles.progressContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.progressText}>{statusMessage}</Text>
          {downloadProgress > 0 && (
            <View style={styles.progressBar}>
              <View
                style={[styles.progressFill, { width: `${downloadProgress}%` }]}
              />
            </View>
          )}
          <Text style={styles.hint}>
            İlk kullanımda model indirilmesi gerekiyor. Bu işlem bir kez
            yapılır.
          </Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
              <Text style={styles.retryButtonText}>Tekrar Dene</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
              <Text style={styles.skipButtonText}>Assets'ten Yükle</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.progressContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.progressText}>{statusMessage}</Text>
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
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 30,
  },
  progressContainer: {
    alignItems: 'center',
    width: '100%',
  },
  progressText: {
    marginTop: 15,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  progressBar: {
    width: '80%',
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginTop: 15,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  hint: {
    marginTop: 20,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
    width: '90%',
  },
  errorText: {
    color: '#c62828',
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  skipButton: {
    backgroundColor: '#6c757d',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 5,
  },
  skipButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default Download;
