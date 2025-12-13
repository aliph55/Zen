import React, { createContext, useContext, useState, useRef } from 'react';
import * as ort from 'onnxruntime-react-native';
import RNFS from 'react-native-fs';
import { Platform, Alert } from 'react-native';

const ModelContext = createContext();

export const useModel = () => {
  const context = useContext(ModelContext);
  if (!context) {
    throw new Error('useModel must be used within ModelProvider');
  }
  return context;
};

export const ModelProvider = ({ children }) => {
  const [modelLoaded, setModelLoaded] = useState(false);
  const [modelLoadError, setModelLoadError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [vocab, setVocab] = useState(null);
  const [reverseVocab, setReverseVocab] = useState(null);

  const sessionRef = useRef(null);

  const MODEL_PATHS = {
    android: {
      model: `${RNFS.DocumentDirectoryPath}/model.onnx`,
      vocab: `${RNFS.DocumentDirectoryPath}/vocab.json`,
      config: `${RNFS.DocumentDirectoryPath}/config.json`,
    },
    ios: {
      model: `${RNFS.DocumentDirectoryPath}/model.onnx`,
      vocab: `${RNFS.DocumentDirectoryPath}/vocab.json`,
      config: `${RNFS.DocumentDirectoryPath}/config.json`,
    },
  };

  const getModelPath = () => {
    return Platform.OS === 'android' ? MODEL_PATHS.android : MODEL_PATHS.ios;
  };

  const copyModelFromAssets = async () => {
    try {
      const paths = getModelPath();
      const modelExists = await RNFS.exists(paths.model);

      if (!modelExists) {
        console.log(
          "Model dosyası DocumentDirectory'de yok, assets'ten kopyalanıyor...",
        );
        if (Platform.OS === 'android') {
          try {
            const assetsModelPath = 'model.onnx';
            console.log("Android: Assets'ten kopyalanıyor:", assetsModelPath);
            await RNFS.copyFileAssets(assetsModelPath, paths.model);
            console.log('✅ Model başarıyla kopyalandı:', paths.model);
            const modelStat = await RNFS.stat(paths.model);
            console.log('✅ Kopyalanan model boyutu:', modelStat.size, 'bytes');
            return true;
          } catch (copyError) {
            console.error("❌ Assets'ten kopyalama hatası:", copyError);
            throw new Error(
              `Model assets'ten kopyalanamadı: ${copyError.message}`,
            );
          }
        } else {
          const bundleModelPath = `${RNFS.MainBundlePath}/model.onnx`;
          await RNFS.copyFile(bundleModelPath, paths.model);
          console.log("✅ Model iOS bundle'dan kopyalandı");
          return true;
        }
      }
      console.log('✅ Model dosyası zaten mevcut:', paths.model);
      return true;
    } catch (error) {
      console.error('❌ Model kopyalama hatası:', error);
      throw error;
    }
  };

  const loadModel = async () => {
    // ÖNEMLI: Eğer model zaten yüklüyse, tekrar yükleme
    if (modelLoaded && sessionRef.current) {
      console.log('✅ Model zaten yüklü, tekrar yükleme atlanıyor');
      return;
    }

    try {
      setIsLoading(true);
      setModelLoadError(null);

      const copySuccess = await copyModelFromAssets();
      if (!copySuccess) {
        throw new Error('Model dosyası kopyalanamadı');
      }

      const paths = getModelPath();
      const modelExists = await RNFS.exists(paths.model);
      if (!modelExists) {
        throw new Error(`Model dosyası hala bulunamadı: ${paths.model}`);
      }

      const modelStat = await RNFS.stat(paths.model);
      console.log('📊 Model dosya boyutu:', modelStat.size, 'bytes');

      if (modelStat.size === 0) {
        throw new Error('Model dosyası boş!');
      }

      let session;
      try {
        console.log('🔄 Model yükleniyor (path)...');
        session = await ort.InferenceSession.create(paths.model, {
          executionProviders: ['cpu'],
          graphOptimizationLevel: 'all',
          enableCpuMemArena: true,
          enableMemPattern: true,
          executionMode: 'sequential',
          logSeverityLevel: 0,
          interOpNumThreads: 1,
          intraOpNumThreads: 1,
          memoryLimit: 512 * 1024 * 1024,
          enableProfiling: false,
        });
        console.log('✅ Model path ile yüklendi');
      } catch (pathError) {
        console.warn(
          '⚠️ Path ile yükleme başarısız, buffer ile deneniyor...',
          pathError.message,
        );

        const CHUNK_SIZE = 10 * 1024 * 1024;
        const fileSize = modelStat.size;
        let modelData = '';

        console.log("📦 Model chunk'lar halinde okunuyor...");
        for (let offset = 0; offset < fileSize; offset += CHUNK_SIZE) {
          const length = Math.min(CHUNK_SIZE, fileSize - offset);
          const chunk = await RNFS.read(paths.model, length, offset, 'base64');
          modelData += chunk;
          const progress = (((offset + length) / fileSize) * 100).toFixed(1);
          console.log(`📊 İlerleme: ${progress}%`);
          await new Promise(resolve => setTimeout(resolve, 10));
        }

        console.log('🔄 Base64 decode ediliyor...');
        const binaryString = atob(modelData);
        const modelBuffer = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          modelBuffer[i] = binaryString.charCodeAt(i);
        }

        console.log('🔄 Model buffer ile yükleniyor...');
        session = await ort.InferenceSession.create(modelBuffer, {
          executionProviders: ['cpu'],
          graphOptimizationLevel: 'disabled',
          enableCpuMemArena: false,
          enableMemPattern: false,
          executionMode: 'sequential',
          logSeverityLevel: 0,
          interOpNumThreads: 1,
          intraOpNumThreads: 1,
        });
        console.log('✅ Model buffer ile yüklendi');
      }

      sessionRef.current = session;
      setModelLoaded(true);
      console.log('✅✅ Model başarıyla yüklendi ve global olarak saklandı!');
    } catch (error) {
      console.error('❌ Model yükleme hatası:', error);
      setModelLoadError(error.message);
      Alert.alert('Model Yükleme Hatası', error.message, [
        { text: 'Tekrar Dene', onPress: loadModel },
        { text: 'İptal', style: 'cancel' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadVocab = async () => {
    // Vocab zaten yüklüyse tekrar yükleme
    if (vocab && reverseVocab) {
      console.log('✅ Vocab zaten yüklü, tekrar yükleme atlanıyor');
      return;
    }

    try {
      const paths = getModelPath();
      const vocabExists = await RNFS.exists(paths.vocab);

      if (!vocabExists) {
        if (Platform.OS === 'android') {
          try {
            const vocabContent = await RNFS.readFileAssets(
              'vocab.json',
              'utf8',
            );
            await RNFS.writeFile(paths.vocab, vocabContent, 'utf8');
          } catch (readError) {
            const defaultVocab = {
              '<|endoftext|>': 0,
              the: 1,
              a: 2,
              is: 3,
              to: 4,
              of: 5,
              and: 6,
              in: 7,
              that: 8,
              it: 9,
              '<unk>': 10,
            };
            await RNFS.writeFile(
              paths.vocab,
              JSON.stringify(defaultVocab),
              'utf8',
            );
          }
        } else {
          const bundlePath = `${RNFS.MainBundlePath}/vocab.json`;
          await RNFS.copyFile(bundlePath, paths.vocab);
        }
      }

      const vocabContent = await RNFS.readFile(paths.vocab, 'utf8');
      const vocabData = JSON.parse(vocabContent);
      const reverse = {};
      for (const [token, id] of Object.entries(vocabData)) {
        reverse[id] = token;
      }

      setVocab(vocabData);
      setReverseVocab(reverse);
      console.log('✅ Vocab başarıyla yüklendi ve global olarak saklandı');
    } catch (error) {
      console.error('Vocab yükleme hatası:', error);
      const fallbackVocab = {};
      for (let i = 0; i < 50000; i++) {
        fallbackVocab[i] = `token_${i}`;
      }
      setReverseVocab(fallbackVocab);
      Alert.alert('Hata', `Vocab yüklenemedi: ${error.message}`);
    }
  };

  const releaseModel = () => {
    if (sessionRef.current) {
      sessionRef.current.release?.();
      sessionRef.current = null;
      setModelLoaded(false);
      console.log('🗑️ Model hafızadan temizlendi');
    }
  };

  const value = {
    modelLoaded,
    modelLoadError,
    isLoading,
    vocab,
    reverseVocab,
    sessionRef,
    loadModel,
    loadVocab,
    releaseModel,
  };

  return (
    <ModelContext.Provider value={value}>{children}</ModelContext.Provider>
  );
};
