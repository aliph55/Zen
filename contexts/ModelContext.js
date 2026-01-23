import React, { createContext, useState, useContext, useRef } from 'react';
import { InferenceSession } from 'onnxruntime-react-native';
import RNFS from 'react-native-fs';
import { Alert } from 'react-native';

const ModelContext = createContext();

export const useModel = () => {
  const context = useContext(ModelContext);
  if (!context) {
    throw new Error('useModel must be used within ModelProvider');
  }
  return context;
};

export const ModelProvider = ({ children }) => {
  // ✅ session yerine sessionRef kullan (ChatLogic ile uyumlu)
  const sessionRef = useRef(null);

  const [vocab, setVocab] = useState(null);
  const [reverseVocab, setReverseVocab] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);

  // Assets'ten model yükleme
  const loadModelFromAssets = async () => {
    try {
      console.log('📦 Loading model from assets...');

      const assetPath = 'model.onnx';
      const destPath = `${RNFS.DocumentDirectoryPath}/model.onnx`;

      // Check if already copied
      const exists = await RNFS.exists(destPath);

      if (!exists) {
        console.log('📋 Copying model from assets...');
        await RNFS.copyFileAssets(assetPath, destPath);
        console.log('✅ Model copied successfully');
      } else {
        console.log('✅ Model already exists in app directory');
      }

      // Validate file size
      const stat = await RNFS.stat(destPath);
      console.log(
        '📊 Model file size:',
        (stat.size / 1024 / 1024).toFixed(2),
        'MB',
      );

      if (stat.size < 400000000) {
        console.warn('⚠️ Model file seems too small');
      }

      // Load ONNX session
      console.log('🧠 Initializing ONNX session...');
      const newSession = await InferenceSession.create(destPath, {
        executionProviders: ['cpu'],
        graphOptimizationLevel: 'basic', // 'all' yerine 'basic'
        enableCpuMemArena: false, // Memory hatası için false
        enableMemPattern: false,
      });

      sessionRef.current = newSession;
      setModelLoaded(true);
      console.log('✅ Model loaded successfully from assets');

      return newSession;
    } catch (error) {
      console.error('❌ Error loading model from assets:', error);
      throw error;
    }
  };

  // Downloaded model yükleme
  const loadModelFromPath = async modelPath => {
    try {
      console.log('🧠 Loading model from path:', modelPath);

      const exists = await RNFS.exists(modelPath);
      if (!exists) {
        throw new Error(`Model file not found at: ${modelPath}`);
      }

      const stat = await RNFS.stat(modelPath);
      console.log(
        '📊 Model file size:',
        (stat.size / 1024 / 1024).toFixed(2),
        'MB',
      );

      const newSession = await InferenceSession.create(modelPath, {
        executionProviders: ['cpu'],
        graphOptimizationLevel: 'basic',
        enableCpuMemArena: false,
        enableMemPattern: false,
      });

      sessionRef.current = newSession;
      setModelLoaded(true);

      console.log('✅ Model loaded successfully from path');
      return newSession;
    } catch (error) {
      console.error('❌ Error loading model from path:', error);
      throw error;
    }
  };

  // Vocab yükleme
  const loadVocab = async () => {
    // ✅ Eğer vocab zaten yüklüyse tekrar yükleme
    if (vocab && reverseVocab) {
      console.log('✅ Vocab already loaded, skipping...');
      return vocab;
    }

    try {
      console.log('📖 Loading vocabulary...');

      const vocabPath = 'vocab.json';
      const vocabContent = await RNFS.readFileAssets(vocabPath, 'utf8');
      const vocabData = JSON.parse(vocabContent);

      // Reverse vocab oluştur
      const reverse = {};
      for (const [token, id] of Object.entries(vocabData)) {
        reverse[id] = token;
      }

      setVocab(vocabData);
      setReverseVocab(reverse);

      console.log('✅ Vocabulary loaded successfully');
      console.log(
        '📊 Vocabulary size:',
        Object.keys(vocabData).length,
        'tokens',
      );

      return vocabData;
    } catch (error) {
      console.error('❌ Error loading vocabulary:', error);

      // Fallback: try from DocumentDirectory
      try {
        const fallbackPath = `${RNFS.DocumentDirectoryPath}/vocab.json`;
        const vocabContent = await RNFS.readFile(fallbackPath, 'utf8');
        const vocabData = JSON.parse(vocabContent);

        const reverse = {};
        for (const [token, id] of Object.entries(vocabData)) {
          reverse[id] = token;
        }

        setVocab(vocabData);
        setReverseVocab(reverse);

        console.log('✅ Vocabulary loaded from fallback');
        return vocabData;
      } catch (fallbackError) {
        console.error('❌ Fallback vocabulary loading failed:', fallbackError);
        throw fallbackError;
      }
    }
  };

  // Generic model loader
  const loadModel = async (modelPath = null) => {
    // ✅ Eğer model zaten yüklüyse tekrar yükleme
    if (modelLoaded && sessionRef.current) {
      console.log('✅ Model already loaded, skipping...');
      return sessionRef.current;
    }

    if (isLoading) {
      console.log('⏳ Model is already loading...');
      return null;
    }

    setIsLoading(true);

    try {
      let loadedSession;

      if (modelPath) {
        console.log('📂 Loading from specified path:', modelPath);
        loadedSession = await loadModelFromPath(modelPath);
      } else {
        console.log('📦 Attempting to load from assets...');
        try {
          loadedSession = await loadModelFromAssets();
        } catch (assetsError) {
          console.log(
            '⚠️ Assets loading failed, checking DocumentDirectory...',
          );

          const downloadedPath = `${RNFS.DocumentDirectoryPath}/model.onnx`;
          const exists = await RNFS.exists(downloadedPath);

          if (exists) {
            console.log('📂 Found model in DocumentDirectory');
            loadedSession = await loadModelFromPath(downloadedPath);
          } else {
            throw new Error('Model file not found. Please download the model.');
          }
        }
      }

      console.log('✅ Model is ready for inference');
      return loadedSession;
    } catch (error) {
      console.error('❌ Failed to load model:', error);
      setModelLoaded(false);

      Alert.alert(
        'Model Loading Error',
        `Failed to load AI model: ${error.message}\n\n` +
          'Please try:\n' +
          '1. Restart the app\n' +
          '2. Re-download the model\n' +
          '3. Check available storage space',
      );

      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    sessionRef, // ✅ ChatLogic sessionRef bekliyor
    session: sessionRef.current, // Backward compatibility
    vocab,
    reverseVocab,
    isLoading,
    modelLoaded, // ✅ ChatLogic modelLoaded bekliyor
    isReady: modelLoaded, // Backward compatibility
    loadModel,
    loadVocab,
    loadModelFromAssets,
    loadModelFromPath,
  };

  return (
    <ModelContext.Provider value={value}>{children}</ModelContext.Provider>
  );
};

export default ModelContext;
