import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Platform,
} from 'react-native';
import RNFS from 'react-native-fs';
import { useModel } from '../contexts/ModelContext';

// AWS S3 URL - CORS ve public access kontrol edilmeli
const MODEL_URL =
  'https://s3.eu-north-1.amazonaws.com/model.onnxugvjhb/model.onnx';
const MODEL_LOCAL_PATH = `${RNFS.DocumentDirectoryPath}/model.onnx`;
const EXPECTED_MODEL_SIZE = 482272438; // 482.27 MB (bytes)
const MIN_VALID_SIZE = 480000000; // Minimum 480 MB

const Download = ({ onDownloadComplete }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [statusMessage, setStatusMessage] = useState('Checking model...');

  const { loadModel, loadVocab } = useModel();

  const downloadModel = async () => {
    try {
      setIsDownloading(true);
      setError(null);
      setStatusMessage('Checking model...');

      // Check if model already exists
      const exists = await RNFS.exists(MODEL_LOCAL_PATH);
      if (exists) {
        console.log('✅ Model file found, validating...');
        const stat = await RNFS.stat(MODEL_LOCAL_PATH);
        console.log('📊 Current model size:', stat.size, 'bytes');
        console.log('📊 Expected size:', EXPECTED_MODEL_SIZE, 'bytes');

        if (stat.size >= MIN_VALID_SIZE) {
          console.log('✅ Model is valid, skipping download.');
          setStatusMessage('Model is ready!');

          await loadModel();
          await loadVocab();

          if (typeof onDownloadComplete === 'function') {
            onDownloadComplete(MODEL_LOCAL_PATH);
          }
          setIsDownloading(false);
          return;
        } else {
          console.log('⚠️ Model file is incomplete or corrupted!');
          console.log(
            `📊 Current: ${stat.size} bytes, Expected: ${EXPECTED_MODEL_SIZE} bytes`,
          );
          console.log('🗑️ Deleting old file...');
          await RNFS.unlink(MODEL_LOCAL_PATH);
          console.log('✅ Old file deleted, starting download...');
        }
      }

      // Test URL connectivity first
      console.log('🔍 Testing URL connectivity...');
      try {
        const testResponse = await fetch(MODEL_URL, { method: 'HEAD' });
        console.log('📡 URL test status:', testResponse.status);

        if (!testResponse.ok) {
          throw new Error(`URL unreachable. Status: ${testResponse.status}`);
        }

        const contentLength = testResponse.headers.get('content-length');
        console.log('📊 Server reported size:', contentLength, 'bytes');

        if (contentLength && parseInt(contentLength) < MIN_VALID_SIZE) {
          throw new Error(
            'Server is reporting incorrect file size. Please check the S3 URL.',
          );
        }
      } catch (fetchError) {
        console.error('❌ URL test failed:', fetchError);
        throw new Error(
          `Cannot reach model URL. Please check:\n` +
            `1. S3 bucket is public\n` +
            `2. CORS is configured\n` +
            `3. File exists at the URL\n` +
            `Error: ${fetchError.message}`,
        );
      }

      console.log('📥 Downloading model...');
      console.log('🔗 URL:', MODEL_URL);
      setStatusMessage('Downloading model... (This may take a few minutes)');

      const downloadOptions = {
        fromUrl: MODEL_URL,
        toFile: MODEL_LOCAL_PATH,
        background: false,
        progressDivider: 1,
        connectionTimeout: 60000, // 60 saniye
        readTimeout: 60000, // 60 saniye
        headers: {
          Accept: '*/*',
          'User-Agent': 'ReactNative/ZenAI',
        },
        begin: res => {
          console.log('🚀 Download started');
          console.log('📊 Total size:', res.contentLength, 'bytes');
          console.log('📊 Status code:', res.statusCode);
          console.log('📊 Headers:', JSON.stringify(res.headers));

          if (res.statusCode !== 200) {
            throw new Error(`Server error: ${res.statusCode}`);
          }

          if (res.contentLength && res.contentLength < MIN_VALID_SIZE) {
            console.warn('⚠️ Server response size is smaller than expected!');
            throw new Error(
              `Server is sending a file that's too small. ` +
                `Expected: ${(EXPECTED_MODEL_SIZE / 1024 / 1024).toFixed(
                  1,
                )} MB, ` +
                `Got: ${(res.contentLength / 1024 / 1024).toFixed(1)} MB`,
            );
          }
        },
        progress: res => {
          const progressPercent =
            res.contentLength > 0
              ? (res.bytesWritten / res.contentLength) * 100
              : (res.bytesWritten / EXPECTED_MODEL_SIZE) * 100;

          setDownloadProgress(progressPercent);

          if (Math.floor(progressPercent) % 10 === 0) {
            console.log(
              `📥 Downloaded: ${progressPercent.toFixed(1)}% (${(
                res.bytesWritten /
                1024 /
                1024
              ).toFixed(1)} MB / ${(
                (res.contentLength || EXPECTED_MODEL_SIZE) /
                1024 /
                1024
              ).toFixed(1)} MB)`,
            );
          }

          setStatusMessage(
            `Downloading: ${progressPercent.toFixed(0)}% (${(
              res.bytesWritten /
              1024 /
              1024
            ).toFixed(1)} MB)`,
          );
        },
      };

      const result = await RNFS.downloadFile(downloadOptions).promise;

      console.log('✅ Download completed, status code:', result.statusCode);
      console.log('📊 Bytes written:', result.bytesWritten);

      if (result.statusCode === 200 || result.statusCode === 201) {
        // Verify downloaded file
        const fileExists = await RNFS.exists(MODEL_LOCAL_PATH);
        if (!fileExists) {
          throw new Error('Downloaded file not found on device!');
        }

        const stat = await RNFS.stat(MODEL_LOCAL_PATH);
        console.log('📊 Downloaded file size:', stat.size, 'bytes');
        console.log('📊 Expected size:', EXPECTED_MODEL_SIZE, 'bytes');

        if (stat.size < MIN_VALID_SIZE) {
          console.error('❌ Downloaded file is too small!');
          await RNFS.unlink(MODEL_LOCAL_PATH);
          throw new Error(
            `Downloaded file is incomplete!\n` +
              `Downloaded: ${(stat.size / 1024 / 1024).toFixed(1)} MB\n` +
              `Expected: ${(EXPECTED_MODEL_SIZE / 1024 / 1024).toFixed(1)} MB`,
          );
        }

        if (stat.size === 0) {
          await RNFS.unlink(MODEL_LOCAL_PATH);
          throw new Error('Downloaded file is empty!');
        }

        // Verify it's not an HTML error page
        try {
          const firstBytes = await RNFS.read(
            MODEL_LOCAL_PATH,
            100,
            0,
            'base64',
          );
          const decoded = Buffer.from(firstBytes, 'base64').toString('utf8');

          console.log(
            '📄 File beginning (first 50 characters):',
            decoded.substring(0, 50),
          );

          if (
            decoded.includes('<!DOCTYPE html>') ||
            decoded.includes('<html') ||
            decoded.includes('<?xml')
          ) {
            console.error('❌ HTML/XML page downloaded! (Error page)');
            await RNFS.unlink(MODEL_LOCAL_PATH);
            throw new Error(
              'Server returned an error page instead of the model file.\n' +
                'Please check:\n' +
                '1. S3 bucket URL is correct\n' +
                '2. File is publicly accessible\n' +
                '3. CORS is configured properly',
            );
          }
        } catch (readError) {
          console.log('ℹ️ File is in binary format (expected for ONNX model)');
        }

        console.log('✅ Model successfully downloaded and validated!');
        setStatusMessage('Loading model into memory...');

        await loadModel();
        await loadVocab();

        setStatusMessage('Model ready!');

        if (typeof onDownloadComplete === 'function') {
          onDownloadComplete(MODEL_LOCAL_PATH);
        } else {
          console.error('❌ onDownloadComplete function is not defined.');
          setError('Application configuration error.');
        }
      } else {
        throw new Error(
          `Download failed with status code: ${result.statusCode}\n` +
            `Please check your internet connection and try again.`,
        );
      }
    } catch (err) {
      console.error('❌ Model download error:', err);
      console.error('Error detail:', err.stack || err);

      let errorMessage = `Model download failed!\n\n`;

      if (
        err.message.includes('URL unreachable') ||
        err.message.includes('Cannot reach')
      ) {
        errorMessage += `Network Error:\n${err.message}\n\n`;
        errorMessage += `Please check:\n`;
        errorMessage += `• Internet connection (WiFi recommended)\n`;
        errorMessage += `• VPN settings (disable if active)\n`;
        errorMessage += `• S3 bucket is publicly accessible\n`;
      } else if (
        err.message.includes('too small') ||
        err.message.includes('incomplete')
      ) {
        errorMessage += `File Size Error:\n${err.message}\n\n`;
        errorMessage += `The file on the server may be corrupted.\n`;
      } else if (err.message.includes('HTML') || err.message.includes('XML')) {
        errorMessage += `Server Configuration Error:\n${err.message}\n`;
      } else {
        errorMessage += `Error: ${err.message}\n\n`;
        errorMessage += `Solutions:\n`;
        errorMessage += `• Check internet connection\n`;
        errorMessage += `• Try again later\n`;
        errorMessage += `• Or use "Load from Assets" option\n`;
      }

      setError(errorMessage);
      setStatusMessage('Error occurred');

      Alert.alert('Model Download Error', errorMessage, [
        {
          text: 'Retry',
          onPress: handleRetry,
        },
        {
          text: 'Load from Assets',
          onPress: handleSkip,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]);
    } finally {
      setIsDownloading(false);
    }
  };

  useEffect(() => {
    // Delay başlatma - uygulama yüklenirken bekle
    const timer = setTimeout(() => {
      downloadModel();
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const handleRetry = () => {
    setError(null);
    setDownloadProgress(0);
    downloadModel();
  };

  const handleSkip = async () => {
    try {
      console.log('ℹ️ Download skipped, trying to load from assets...');
      setStatusMessage('Loading model from assets...');
      setIsDownloading(true);

      await loadModel();
      await loadVocab();

      if (typeof onDownloadComplete === 'function') {
        onDownloadComplete(null);
      }
    } catch (assetError) {
      console.error('❌ Asset loading error:', assetError);
      setError(
        'Model could not be loaded from assets.\n' +
          'Please ensure model.onnx is in the assets folder.',
      );
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>🤖</Text>
          </View>
        </View>

        <Text style={styles.title}>AI Model Preparation</Text>

        {isDownloading ? (
          <View style={styles.progressContainer}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={styles.progressText}>{statusMessage}</Text>
            {downloadProgress > 0 && (
              <>
                <View style={styles.progressBarContainer}>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${Math.min(downloadProgress, 100)}%` },
                      ]}
                    />
                  </View>
                  <Text style={styles.progressPercentage}>
                    {downloadProgress.toFixed(1)}%
                  </Text>
                </View>
              </>
            )}
            <View style={styles.hintContainer}>
              <Text style={styles.hint}>
                Model download is required on first use.{'\n'}
                File size: ~460 MB{'\n'}
                This is a one-time process and may take a few minutes.
              </Text>
            </View>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <View style={styles.errorIcon}>
              <Text style={styles.errorIconText}>⚠️</Text>
            </View>
            <Text style={styles.errorText}>{error}</Text>
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={handleRetry}
              >
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
                <Text style={styles.skipButtonText}>Load from Assets</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.progressContainer}>
            <ActivityIndicator size="large" color="#6366f1" />
            <Text style={styles.progressText}>{statusMessage}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default Download;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fd',
    padding: 20,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 24,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#eef2ff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  iconText: {
    fontSize: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 32,
    letterSpacing: 0.3,
  },
  progressContainer: {
    alignItems: 'center',
    width: '100%',
  },
  progressText: {
    marginTop: 20,
    fontSize: 16,
    color: '#475569',
    fontWeight: '600',
    textAlign: 'center',
  },
  progressBarContainer: {
    width: '100%',
    marginTop: 24,
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 12,
    backgroundColor: '#e2e8f0',
    borderRadius: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6366f1',
    borderRadius: 12,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  progressPercentage: {
    marginTop: 12,
    fontSize: 24,
    fontWeight: '700',
    color: '#6366f1',
    letterSpacing: 0.5,
  },
  hintContainer: {
    marginTop: 24,
    padding: 20,
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#6366f1',
  },
  hint: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    width: '100%',
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  errorIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorIconText: {
    fontSize: 32,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    justifyContent: 'center',
  },
  retryButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    flex: 1,
    maxWidth: 150,
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  skipButton: {
    backgroundColor: '#64748b',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
    flex: 1,
    maxWidth: 150,
    alignItems: 'center',
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  skipButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
