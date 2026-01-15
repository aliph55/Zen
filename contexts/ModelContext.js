import React, { createContext, useState, useContext } from 'react';
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
  const [session, setSession] = useState(null);
  const [vocab, setVocab] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Assets'ten model yükleme
  const loadModelFromAssets = async () => {
    try {
      console.log('📦 Loading model from assets...');

      const assetPath = 'model.onnx';
      const destPath = `${RNFS.DocumentDirectoryPath}/model.onnx`;

      // Check if already copied
      const exists = await RNFS.exists(destPath);

      if (!exists) {
        console.log('📋 Copying model from assets to app directory...');

        // Android için assets'ten kopyalama
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
        // 400 MB minimum
        console.warn('⚠️ Model file seems too small, may be corrupted');
      }

      // Load ONNX session
      console.log('🧠 Initializing ONNX session...');
      const newSession = await InferenceSession.create(destPath);

      setSession(newSession);
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

      const newSession = await InferenceSession.create(modelPath);
      setSession(newSession);

      console.log('✅ Model loaded successfully from path');
      return newSession;
    } catch (error) {
      console.error('❌ Error loading model from path:', error);
      throw error;
    }
  };

  // Vocab yükleme
  const loadVocab = async () => {
    try {
      console.log('📖 Loading vocabulary...');

      const vocabPath = 'vocab.json';
      const vocabContent = await RNFS.readFileAssets(vocabPath, 'utf8');
      const vocabData = JSON.parse(vocabContent);

      setVocab(vocabData);
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

        setVocab(vocabData);
        console.log('✅ Vocabulary loaded from fallback location');
        return vocabData;
      } catch (fallbackError) {
        console.error('❌ Fallback vocabulary loading failed:', fallbackError);
        throw fallbackError;
      }
    }
  };

  // Generic model loader - önce assets'e bakar, sonra downloaded
  const loadModel = async (modelPath = null) => {
    if (isLoading) {
      console.log('⏳ Model is already loading...');
      return null;
    }

    setIsLoading(true);

    try {
      let loadedSession;

      if (modelPath) {
        // Belirli bir path verilmişse oradan yükle
        console.log('📂 Loading from specified path:', modelPath);
        loadedSession = await loadModelFromPath(modelPath);
      } else {
        // Önce assets'e bak
        console.log('📦 Attempting to load from assets...');
        try {
          loadedSession = await loadModelFromAssets();
        } catch (assetsError) {
          console.log(
            '⚠️ Assets loading failed, checking DocumentDirectory...',
          );

          // Assets'te yoksa DocumentDirectory'de ara
          const downloadedPath = `${RNFS.DocumentDirectoryPath}/model.onnx`;
          const exists = await RNFS.exists(downloadedPath);

          if (exists) {
            console.log('📂 Found model in DocumentDirectory');
            loadedSession = await loadModelFromPath(downloadedPath);
          } else {
            throw new Error(
              'Model file not found in assets or DocumentDirectory. ' +
                'Please download the model or place it in the assets folder.',
            );
          }
        }
      }

      setIsReady(true);
      console.log('✅ Model is ready for inference');

      return loadedSession;
    } catch (error) {
      console.error('❌ Failed to load model:', error);
      setIsReady(false);

      Alert.alert(
        'Model Loading Error',
        `Failed to load AI model: ${error.message}\n\n` +
          'Please ensure:\n' +
          '1. Model file is in assets folder, OR\n' +
          '2. Model has been downloaded successfully',
      );

      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Model inference
  const runInference = async inputTensor => {
    if (!session) {
      throw new Error('Model not loaded. Please load the model first.');
    }

    try {
      console.log('🔮 Running inference...');
      const feeds = { input: inputTensor };
      const results = await session.run(feeds);
      console.log('✅ Inference completed');
      return results;
    } catch (error) {
      console.error('❌ Inference error:', error);
      throw error;
    }
  };

  const value = {
    session,
    vocab,
    isLoading,
    isReady,
    loadModel,
    loadVocab,
    loadModelFromAssets,
    loadModelFromPath,
    runInference,
  };

  return (
    <ModelContext.Provider value={value}>{children}</ModelContext.Provider>
  );
};

export default ModelContext;
