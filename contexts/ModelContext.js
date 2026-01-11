import React, { createContext, useContext, useState, useRef } from 'react';
import * as ort from 'onnxruntime-react-native';
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
  const [modelLoaded, setModelLoaded] = useState(false);
  const [modelLoadError, setModelLoadError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [vocab, setVocab] = useState(null);
  const [reverseVocab, setReverseVocab] = useState(null);
  const sessionRef = useRef(null);

  const modelPath = `${RNFS.DocumentDirectoryPath}/gpt2-quantized.onnx`;
  const vocabPath = `${RNFS.DocumentDirectoryPath}/vocab.json`;

  const loadVocab = async () => {
    try {
      console.log('📖 Vocab yükleniyor...');
      const vocabData = await RNFS.readFile(vocabPath, 'utf8');
      const loadedVocab = JSON.parse(vocabData);

      // reverseVocab oluştur (ÖNEMLİ!)
      const reverse = {};
      for (const [token, id] of Object.entries(loadedVocab)) {
        reverse[id] = token;
      }

      setVocab(loadedVocab);
      setReverseVocab(reverse);

      console.log(
        '✅ Vocab yüklendi:',
        Object.keys(loadedVocab).length,
        'token',
      );
      console.log(
        '✅ ReverseVocab yüklendi:',
        Object.keys(reverse).length,
        'ID',
      );

      // Test
      console.log('Test - İlk 5 token:');
      for (let i = 0; i < 5; i++) {
        console.log(`  ${i} => "${reverse[i]}"`);
      }

      return { vocab: loadedVocab, reverseVocab: reverse };
    } catch (error) {
      console.error('❌ Vocab yükleme hatası:', error);
      throw error;
    }
  };

  const loadModel = async () => {
    if (modelLoaded || isLoading) {
      console.log('⏭️ Model zaten yüklü');
      return;
    }

    try {
      setIsLoading(true);
      setModelLoadError(null);
      console.log('🔄 Model yükleniyor...');

      const modelExists = await RNFS.exists(modelPath);
      if (!modelExists) {
        throw new Error('Model dosyası bulunamadı');
      }

      const session = await ort.InferenceSession.create(modelPath);
      sessionRef.current = session;
      setModelLoaded(true);
      console.log('✅ Model yüklendi');
    } catch (error) {
      console.error('❌ Model hatası:', error);
      setModelLoadError(error.message);
      Alert.alert('Hata', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ModelContext.Provider
      value={{
        modelLoaded,
        modelLoadError,
        isLoading,
        vocab,
        reverseVocab,
        sessionRef,
        loadModel,
        loadVocab,
      }}
    >
      {children}
    </ModelContext.Provider>
  );
};
