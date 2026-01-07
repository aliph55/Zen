import { useState, useEffect, useRef, useCallback } from 'react';
import * as ort from 'onnxruntime-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { showRewardedAd } from '../adsService';
import { useModel } from '../../contexts/ModelContext';

export const useChatLogic = ({ route, navigation }) => {
  const { groupId, chatId } = route.params || {};

  const {
    modelLoaded,
    modelLoadError,
    isLoading: modelIsLoading,
    vocab,
    reverseVocab,
    sessionRef,
    loadModel,
    loadVocab,
  } = useModel();

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingComplete, setStreamingComplete] = useState(false);
  const [groups, setGroups] = useState([]);
  const [currentGroupId, setCurrentGroupId] = useState(groupId);
  const [currentGroupName, setCurrentGroupName] = useState('');
  const [currentChatId, setCurrentChatId] = useState(chatId);
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [lastOpened, setLastOpened] = useState(null);
  const [isGroupNameModalVisible, setGroupNameModalVisible] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [seconds, setSeconds] = useState(420);

  const scrollViewRef = useRef(null);
  const streamingMessageId = useRef(null);
  const saveTimeoutRef = useRef(null);

  useEffect(() => {
    const initializeModel = async () => {
      if (!modelLoaded && !modelIsLoading) {
        console.log('🔄 Model henüz yüklenmedi, yükleniyor...');
        await loadModel();
        await loadVocab();
      }
    };
    initializeModel();
  }, []);

  // ============================================
  // MODEL INPUT/OUTPUT'LARI İNCELE
  // ============================================
  const inspectModelInputs = useCallback(() => {
    if (!sessionRef.current) return;

    console.log('📋 Model Inputs:');
    sessionRef.current.inputNames.forEach(name => {
      console.log(`  - ${name}`);
    });

    console.log('📋 Model Outputs:');
    sessionRef.current.outputNames.forEach(name => {
      console.log(`  - ${name}`);
    });
  }, [sessionRef]);

  // ============================================
  // TOKENIZE
  // ============================================
  const tokenize = useCallback(
    async text => {
      if (!vocab) {
        console.warn('⚠️ Vocab henüz yüklenmedi');
        return [50256];
      }

      const trimmedText = text.trim();
      if (!trimmedText) return [50256];

      console.log('🔍 Tokenizing:', trimmedText);

      const tokens = [];
      const words = trimmedText.toLowerCase().split(/\s+/);

      for (const word of words) {
        if (!word) continue;

        if (vocab[word] !== undefined) {
          tokens.push(vocab[word]);
        } else if (vocab['Ġ' + word] !== undefined) {
          tokens.push(vocab['Ġ' + word]);
        } else {
          for (const char of word) {
            tokens.push(vocab[char] || vocab['<unk>'] || 10);
          }
        }
      }

      tokens.unshift(vocab['<|endoftext|>'] || 50256);
      console.log('✅ Tokens:', tokens.slice(0, 10), '...');
      return tokens;
    },
    [vocab],
  );

  // ============================================
  // DECODE
  // ============================================
  const decodeToken = useCallback(
    tokenId => {
      if (!reverseVocab || tokenId === undefined || tokenId === null) {
        return '';
      }

      if (tokenId === 50256 || tokenId === 50257) {
        return '';
      }

      let token = reverseVocab[tokenId];

      if (!token) {
        return '';
      }

      return token
        .replace(/^Ġ/g, ' ')
        .replace(/Ċ/g, '\n')
        .replace(/ĉ/g, '\t')
        .replace(/<\|endoftext\|>/g, '');
    },
    [reverseVocab],
  );

  // ============================================
  // EMPTY KV CACHE OLUŞTUR
  // ============================================
  const createEmptyKVCache = useCallback((numLayers = 6) => {
    const kvCache = {};

    for (let i = 0; i < numLayers; i++) {
      // Boş key tensörü (1, num_heads, 0, head_dim)
      kvCache[`past_key_values.${i}.key`] = new ort.Tensor(
        'float32',
        new Float32Array(0),
        [1, 12, 0, 64],
      );

      // Boş value tensörü (1, num_heads, 0, head_dim)
      kvCache[`past_key_values.${i}.value`] = new ort.Tensor(
        'float32',
        new Float32Array(0),
        [1, 12, 0, 64],
      );
    }

    return kvCache;
  }, []);

  // ============================================
  // GENERATION (KV CACHE İLE)
  // ============================================
  const generateStreamingResponse = async prompt => {
    if (!sessionRef.current) {
      const mockResponse = 'Model henüz yüklenmedi. Lütfen bekleyin.';
      setCurrentStreamingMessage('');
      setIsStreaming(true);
      setStreamingComplete(false);

      const words = mockResponse.split(' ');
      for (let i = 0; i < words.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
        setCurrentStreamingMessage(words.slice(0, i + 1).join(' '));
      }

      setStreamingComplete(true);
      await new Promise(resolve => setTimeout(resolve, 300));
      setIsStreaming(false);
      return mockResponse;
    }

    try {
      console.log('🚀 Generation başlıyor...');
      inspectModelInputs();

      const tokens = await tokenize(prompt || 'Merhaba');
      let inputIds = tokens.slice(0, 100); // Max input length

      const maxNewTokens = 50;
      const temperature = 0.8;
      const eosTokenId = vocab?.['<|endoftext|>'] || 50256;

      let generatedText = '';
      let generatedTokens = [];
      let pastKVCache = null;
      let pastLength = 0;

      setCurrentStreamingMessage('');
      setIsStreaming(true);
      setStreamingComplete(false);

      for (let step = 0; step < maxNewTokens; step++) {
        // İlk adımda tüm input, sonraki adımlarda sadece son token
        const inputForStep =
          step === 0 ? inputIds : [generatedTokens[generatedTokens.length - 1]];

        // Input IDs tensörü
        const inputTensor = new ort.Tensor(
          'int64',
          new BigInt64Array(inputForStep.map(id => BigInt(id))),
          [1, inputForStep.length],
        );

        // Attention mask oluştur
        const totalLength = pastLength + inputForStep.length;
        const attentionMaskArray = new BigInt64Array(totalLength);
        for (let i = 0; i < totalLength; i++) {
          attentionMaskArray[i] = BigInt(1);
        }
        const attentionMask = new ort.Tensor('int64', attentionMaskArray, [
          1,
          totalLength,
        ]);

        // Position IDs oluştur
        const positionIdsArray = new BigInt64Array(inputForStep.length);
        for (let i = 0; i < inputForStep.length; i++) {
          positionIdsArray[i] = BigInt(pastLength + i);
        }
        const positionIds = new ort.Tensor('int64', positionIdsArray, [
          1,
          inputForStep.length,
        ]);

        // Feeds oluştur
        const feeds = {
          input_ids: inputTensor,
          attention_mask: attentionMask,
          position_ids: positionIds,
        };

        // KV cache ekle
        if (step === 0) {
          // İlk adım: boş KV cache
          const emptyKV = createEmptyKVCache(6);
          Object.assign(feeds, emptyKV);
        } else {
          // Sonraki adımlar: önceki KV cache'i kullan
          if (pastKVCache) {
            for (let i = 0; i < 6; i++) {
              feeds[`past_key_values.${i}.key`] =
                pastKVCache[`present.${i}.key`];
              feeds[`past_key_values.${i}.value`] =
                pastKVCache[`present.${i}.value`];
            }
          } else {
            // Fallback: boş KV cache
            const emptyKV = createEmptyKVCache(6);
            Object.assign(feeds, emptyKV);
          }
        }

        console.log(
          `Step ${step}: Input shape [1, ${inputForStep.length}], Past length ${pastLength}`,
        );

        // Model inference
        const results = await sessionRef.current.run(feeds);

        if (!results.logits || !results.logits.data) {
          throw new Error('Model geçersiz logits döndü');
        }

        // KV cache'i sakla
        pastKVCache = results;
        pastLength += inputForStep.length;

        // Logits'ten next token seç
        const logits = results.logits;
        const vocabSize = logits.dims[2];
        const lastTokenLogits = new Float32Array(vocabSize);
        const lastTokenStart = logits.data.length - vocabSize;

        for (let i = 0; i < vocabSize; i++) {
          lastTokenLogits[i] = logits.data[lastTokenStart + i];
        }

        // Temperature + Softmax
        const scaledLogits = lastTokenLogits.map(l => l / temperature);
        const maxLogit = Math.max(...scaledLogits);
        const expLogits = scaledLogits.map(l =>
          Math.exp(Math.min(l - maxLogit, 20)),
        );
        const sumExp = expLogits.reduce((a, b) => a + b, 0);
        const probs = expLogits.map(e => e / sumExp);

        // Greedy sampling (en yüksek prob)
        let nextTokenId = 0;
        let maxProb = 0;
        for (let i = 0; i < probs.length; i++) {
          if (probs[i] > maxProb) {
            maxProb = probs[i];
            nextTokenId = i;
          }
        }

        console.log(`  → Token ${nextTokenId} (prob: ${maxProb.toFixed(4)})`);

        // Decode ve ekle
        const decodedToken = decodeToken(nextTokenId);
        if (decodedToken) {
          generatedText += decodedToken;
          generatedTokens.push(nextTokenId);
          setCurrentStreamingMessage(generatedText.trim());
        }

        // Durma koşulları
        if (nextTokenId === eosTokenId) {
          console.log('⏹️ EOS token');
          break;
        }

        if (generatedTokens.length >= 3) {
          const lastThree = generatedTokens.slice(-3);
          if (lastThree[0] === lastThree[1] && lastThree[1] === lastThree[2]) {
            console.log('⏹️ Token tekrarı');
            break;
          }
        }

        await new Promise(resolve => setTimeout(resolve, 50));
      }

      setStreamingComplete(true);
      const finalText = generatedText.trim() || 'Model yanıt üretemedi.';
      console.log('✅ Final:', finalText);

      setCurrentStreamingMessage(finalText);
      await new Promise(resolve => setTimeout(resolve, 300));
      setIsStreaming(false);

      return finalText;
    } catch (error) {
      console.error('❌ Generation hatası:', error);
      console.error('Stack:', error.stack);
      setStreamingComplete(true);
      setIsStreaming(false);
      return `Hata: ${error.message}`;
    }
  };

  // ============================================
  // SEND MESSAGE
  // ============================================
  const sendMessage = async () => {
    if (!inputText.trim() || isStreaming) return;

    if (!modelLoaded) {
      Alert.alert('Uyarı', 'Model henüz yüklenmedi.');
      return;
    }

    if (!vocab || !reverseVocab) {
      Alert.alert('Uyarı', 'Vocab henüz yüklenmedi.');
      return;
    }

    const userMessage = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const userInput = inputText;
    setInputText('');

    streamingMessageId.current = (Date.now() + 1).toString();

    try {
      const response = await generateStreamingResponse(userInput);

      const aiMessage = {
        id: streamingMessageId.current,
        text: response,
        sender: 'ai',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
      setCurrentStreamingMessage('');
    } catch (error) {
      console.error('❌ Mesaj hatası:', error);
      Alert.alert('Hata', 'Yanıt oluşturulurken hata oluştu.');
      setIsStreaming(false);
      setCurrentStreamingMessage('');
    }
  };

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================
  const testAsyncStorage = async () => {
    try {
      await AsyncStorage.setItem('test', 'ok');
      console.log('✅ AsyncStorage çalışıyor');
    } catch (error) {
      console.error('❌ AsyncStorage hatası:', error);
    }
  };

  const saveGroups = useCallback(async groupsToSave => {
    try {
      await AsyncStorage.setItem('groups', JSON.stringify(groupsToSave));
    } catch (error) {
      console.error('❌ Grup kaydetme hatası:', error);
    }
  }, []);

  const loadGroups = async () => {
    console.log('Gruplar yükleniyor...');
  };

  const startNewGroup = () => {
    console.log('Yeni grup');
  };

  const startNewChat = () => {
    console.log('Yeni sohbet');
  };

  const updateGroupName = () => {
    console.log('Grup adı güncellendi');
  };

  const formatTime = () => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  useEffect(() => {
    testAsyncStorage();
    loadGroups();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds(prev => (prev <= 1 ? (showRewardedAd(), 420) : prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return {
    messages,
    setMessages,
    inputText,
    setInputText,
    isLoading: modelIsLoading,
    modelLoaded,
    modelLoadError,
    currentStreamingMessage,
    isStreaming,
    streamingComplete,
    groups,
    currentGroupId,
    currentGroupName,
    currentChatId,
    title,
    isGroupNameModalVisible,
    setGroupNameModalVisible,
    newGroupName,
    setNewGroupName,
    vocab,
    reverseVocab,
    seconds,
    sessionRef,
    scrollViewRef,
    loadModel,
    startNewGroup,
    startNewChat,
    updateGroupName,
    sendMessage,
    formatTime,
  };
};
