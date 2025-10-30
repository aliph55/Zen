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

// AWS S3 URL
const MODEL_URL =
  'https://s3.eu-north-1.amazonaws.com/model.onnxugvjhb/model.onnx';
const MODEL_LOCAL_PATH = `${RNFS.DocumentDirectoryPath}/model.onnx`;
const EXPECTED_MODEL_SIZE = 482272438; // 482.27 MB (bytes)
const MIN_VALID_SIZE = 480000000; // Minimum 480 MB olmalı

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
        console.log('✅ Model dosyası bulundu, doğrulanıyor...');
        const stat = await RNFS.stat(MODEL_LOCAL_PATH);
        console.log('📊 Mevcut model boyutu:', stat.size, 'bytes');
        console.log('📊 Beklenen boyut:', EXPECTED_MODEL_SIZE, 'bytes');

        // DÜZELTME: Boyut kontrolü - minimum 480MB olmalı
        if (stat.size >= MIN_VALID_SIZE) {
          console.log('✅ Model geçerli, indirme atlanıyor.');
          setStatusMessage('Model hazır!');

          if (typeof onDownloadComplete === 'function') {
            onDownloadComplete(MODEL_LOCAL_PATH);
          } else {
            console.error('❌ onDownloadComplete fonksiyonu tanımlı değil.');
            setError('Uygulama yapılandırma hatası.');
          }
          setIsDownloading(false);
          return;
        } else {
          console.log('⚠️ Model dosyası eksik veya bozuk!');
          console.log(
            `📊 Mevcut: ${stat.size} bytes, Beklenen: ${EXPECTED_MODEL_SIZE} bytes`,
          );
          console.log('🗑️ Eski dosya siliniyor...');
          await RNFS.unlink(MODEL_LOCAL_PATH);
          console.log('✅ Eski dosya silindi, yeniden indirme başlıyor...');
        }
      }

      console.log('📥 Model indiriliyor...');
      console.log('🔗 URL:', MODEL_URL);
      setStatusMessage(
        'Model indiriliyor... (Bu işlem birkaç dakika sürebilir)',
      );

      const downloadOptions = {
        fromUrl: MODEL_URL,
        toFile: MODEL_LOCAL_PATH,
        background: false,
        progressDivider: 1, // Her %1'de güncelle
        connectionTimeout: 30000, // 30 saniye timeout
        readTimeout: 30000,
        begin: res => {
          console.log('🚀 İndirme başladı');
          console.log('📊 Toplam boyut:', res.contentLength, 'bytes');
          console.log('📊 Status code:', res.statusCode);

          if (res.contentLength && res.contentLength < MIN_VALID_SIZE) {
            console.warn('⚠️ Sunucu yanıt boyutu beklenenden küçük!');
          }
        },
        progress: res => {
          const progressPercent =
            res.contentLength > 0
              ? (res.bytesWritten / res.contentLength) * 100
              : (res.bytesWritten / EXPECTED_MODEL_SIZE) * 100;

          setDownloadProgress(progressPercent);

          // Her %5'te bir log
          if (Math.floor(progressPercent) % 5 === 0) {
            console.log(
              `📥 İndirildi: ${progressPercent.toFixed(1)}% (${(
                res.bytesWritten /
                1024 /
                1024
              ).toFixed(1)} MB / ${(res.contentLength / 1024 / 1024).toFixed(
                1,
              )} MB)`,
            );
          }

          setStatusMessage(
            `Model indiriliyor: ${progressPercent.toFixed(0)}% (${(
              res.bytesWritten /
              1024 /
              1024
            ).toFixed(1)} MB)`,
          );
        },
      };

      const result = await RNFS.downloadFile(downloadOptions).promise;

      console.log('✅ İndirme tamamlandı, status code:', result.statusCode);
      console.log('📊 Yazılan byte:', result.bytesWritten);

      if (result.statusCode === 200) {
        // Dosya boyutunu kontrol et
        const stat = await RNFS.stat(MODEL_LOCAL_PATH);
        console.log('📊 İndirilen dosya boyutu:', stat.size, 'bytes');
        console.log('📊 Beklenen boyut:', EXPECTED_MODEL_SIZE, 'bytes');

        // DÜZELTME: Minimum boyut kontrolü
        if (stat.size < MIN_VALID_SIZE) {
          console.error('❌ İndirilen dosya çok küçük!');
          await RNFS.unlink(MODEL_LOCAL_PATH);
          throw new Error(
            `İndirilen dosya eksik! İndirilen: ${(
              stat.size /
              1024 /
              1024
            ).toFixed(1)} MB, Beklenen: ${(
              EXPECTED_MODEL_SIZE /
              1024 /
              1024
            ).toFixed(1)} MB`,
          );
        }

        if (stat.size === 0) {
          await RNFS.unlink(MODEL_LOCAL_PATH);
          throw new Error('İndirilen dosya boş!');
        }

        // DÜZELTME: ONNX dosyası kontrolü (binary file)
        try {
          const firstBytes = await RNFS.read(
            MODEL_LOCAL_PATH,
            100,
            0,
            'base64',
          );
          const decoded = Buffer.from(firstBytes, 'base64').toString('utf8');

          console.log(
            '📄 Dosya başlangıcı (ilk 50 karakter):',
            decoded.substring(0, 50),
          );

          // HTML sayfası mı kontrol et
          if (
            decoded.includes('<!DOCTYPE html>') ||
            decoded.includes('<html')
          ) {
            console.error(
              '❌ HTML sayfası indirildi! (Muhtemelen hata sayfası)',
            );
            await RNFS.unlink(MODEL_LOCAL_PATH);
            throw new Error(
              "Sunucu hata sayfası döndürdü. Lütfen URL'yi kontrol edin.",
            );
          }
        } catch (readError) {
          // Binary file okuma hatası normal (ONNX binary formatı)
          console.log('ℹ️ Dosya binary format (beklenen durum)');
        }

        console.log('✅ Model başarıyla indirildi ve doğrulandı!');
        setStatusMessage('Model başarıyla indirildi!');

        if (typeof onDownloadComplete === 'function') {
          onDownloadComplete(MODEL_LOCAL_PATH);
        } else {
          console.error('❌ onDownloadComplete fonksiyonu tanımlı değil.');
          setError('Uygulama yapılandırma hatası.');
        }
      } else {
        throw new Error(`İndirme hatası, durum kodu: ${result.statusCode}`);
      }
    } catch (err) {
      console.error('❌ Model indirme hatası:', err);
      console.error('Hata detayı:', err.stack);

      const errorMessage = `Model indirilemedi: ${err.message}

Çözüm önerileri:
1. İnternet bağlantınızı kontrol edin (Wi-Fi önerilir)
2. Model dosyasını manuel olarak android/app/src/main/assets/ klasörüne koyun
3. Veya "Assets'ten Yükle" butonuna tıklayın`;

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
    console.log("ℹ️ İndirme atlandı, assets'ten yükleme deneniyor...");
    if (typeof onDownloadComplete === 'function') {
      // Model yok ama devam et (assets'ten yüklenecek)
      onDownloadComplete(null);
    }
  };

  const formatBytes = bytes => {
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>AI Model Hazırlanıyor</Text>

      {isDownloading ? (
        <View style={styles.progressContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.progressText}>{statusMessage}</Text>
          {downloadProgress > 0 && (
            <>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${downloadProgress}%` },
                  ]}
                />
              </View>
              <Text style={styles.progressPercentage}>
                {downloadProgress.toFixed(1)}%
              </Text>
            </>
          )}
          <Text style={styles.hint}>
            İlk kullanımda model indirilmesi gerekiyor.{'\n'}
            Dosya boyutu: ~460 MB{'\n'}
            Bu işlem bir kez yapılır ve birkaç dakika sürebilir.
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

export default Download;

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
    textAlign: 'center',
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
  progressPercentage: {
    marginTop: 8,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  hint: {
    marginTop: 20,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 22,
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
