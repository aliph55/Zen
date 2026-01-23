// Components/Chat/ChatLogic.js
// ✅ REAL AI - No mock responses
import { useState, useEffect, useRef, useCallback } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useModel } from '../../contexts/ModelContext';
import * as ort from 'onnxruntime-react-native';

export const useChatLogic = ({ route, navigation }) => {
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
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState('');
  const [streamingComplete, setStreamingComplete] = useState(false);
  const [title, setTitle] = useState('New Chat');
  const [isGroupNameModalVisible, setGroupNameModalVisible] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [groupId, setGroupId] = useState(null);

  const scrollViewRef = useRef(null);

  // Model yükleme
  useEffect(() => {
    const initModel = async () => {
      if (!modelLoaded && !modelIsLoading) {
        console.log('🔄 Loading model...');
        await loadModel();
        await loadVocab();
      }
    };
    initModel();
  }, []);

  // Grup yükleme
  useEffect(() => {
    const loadGroup = async () => {
      if (route.params?.groupId) {
        const gId = route.params.groupId;
        setGroupId(gId);
        await loadMessagesFromGroup(gId);
      }
    };
    loadGroup();
  }, [route.params?.groupId]);

  const formatTime = timestamp => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const loadMessagesFromGroup = async gId => {
    try {
      const groups = await AsyncStorage.getItem('groups');
      if (groups) {
        const parsedGroups = JSON.parse(groups);
        const group = parsedGroups.find(g => g.id === gId);
        if (group && group.chats && group.chats.length > 0) {
          const chat = group.chats[0];
          setMessages(chat.messages || []);
          setTitle(chat.title || 'Chat');
        }
      }
    } catch (error) {
      console.error('❌ Load messages error:', error);
    }
  };

  const saveMessagesToGroup = async (gId, msgs) => {
    try {
      const groups = await AsyncStorage.getItem('groups');
      const parsedGroups = groups ? JSON.parse(groups) : [];

      const groupIndex = parsedGroups.findIndex(g => g.id === gId);

      if (groupIndex !== -1) {
        if (
          parsedGroups[groupIndex].chats &&
          parsedGroups[groupIndex].chats.length > 0
        ) {
          parsedGroups[groupIndex].chats[0].messages = msgs;
          parsedGroups[groupIndex].chats[0].lastOpened =
            new Date().toISOString();
        }
        await AsyncStorage.setItem('groups', JSON.stringify(parsedGroups));
      }
    } catch (error) {
      console.error('❌ Save messages error:', error);
    }
  };

  // Tokenize
  const tokenize = useCallback(
    async text => {
      if (!vocab) return [50256];

      const trimmed = text.trim();
      if (!trimmed) return [50256];

      const tokens = [];
      const words = trimmed.toLowerCase().split(/\s+/);

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
      return tokens;
    },
    [vocab],
  );

  // Decode token
  const decodeToken = useCallback(
    tokenId => {
      if (!reverseVocab || tokenId === undefined || tokenId === null) {
        return '';
      }
      if (tokenId === 50256 || tokenId === 50257) return '';

      const token = reverseVocab[tokenId];
      if (!token) return '';

      return token
        .replace(/^Ġ/g, ' ')
        .replace(/Ċ/g, '\n')
        .replace(/ĉ/g, '\t')
        .replace(/<\|endoftext\|>/g, '');
    },
    [reverseVocab],
  );

  // Create empty KV cache
  const createEmptyKVCache = useCallback((numLayers = 6) => {
    const kvCache = {};
    for (let i = 0; i < numLayers; i++) {
      kvCache[`past_key_values.${i}.key`] = new ort.Tensor(
        'float32',
        new Float32Array(0),
        [1, 12, 0, 64],
      );
      kvCache[`past_key_values.${i}.value`] = new ort.Tensor(
        'float32',
        new Float32Array(0),
        [1, 12, 0, 64],
      );
    }
    return kvCache;
  }, []);

  // ✅ REAL AI GENERATION
  const generateAIResponse = async prompt => {
    if (!sessionRef.current) {
      throw new Error('Model not loaded');
    }

    try {
      const tokens = await tokenize(prompt);
      const inputIds = tokens.slice(0, 128);

      const maxNewTokens = 150; // 50 → 150 (daha uzun cevaplar)
      const temperature = 0.9; // 0.8 → 0.9 (daha yaratıcı)
      const eosTokenId = vocab?.['<|endoftext|>'] || 50256;

      let generatedText = '';
      let generatedTokens = [];
      let pastKVCache = null;
      let pastLength = 0;

      setCurrentStreamingMessage('');
      setIsStreaming(true);
      setStreamingComplete(false);

      for (let step = 0; step < maxNewTokens; step++) {
        const inputForStep =
          step === 0 ? inputIds : [generatedTokens[generatedTokens.length - 1]];

        const inputTensor = new ort.Tensor(
          'int64',
          new BigInt64Array(inputForStep.map(id => BigInt(id))),
          [1, inputForStep.length],
        );

        // Attention mask
        const totalLength = pastLength + inputForStep.length;
        const attentionMaskArray = new BigInt64Array(totalLength);
        for (let i = 0; i < totalLength; i++) {
          attentionMaskArray[i] = BigInt(1);
        }
        const attentionMask = new ort.Tensor('int64', attentionMaskArray, [
          1,
          totalLength,
        ]);

        // Position IDs
        const positionIdsArray = new BigInt64Array(inputForStep.length);
        for (let i = 0; i < inputForStep.length; i++) {
          positionIdsArray[i] = BigInt(pastLength + i);
        }
        const positionIds = new ort.Tensor('int64', positionIdsArray, [
          1,
          inputForStep.length,
        ]);

        const feeds = {
          input_ids: inputTensor,
          attention_mask: attentionMask,
          position_ids: positionIds,
        };

        // Add KV cache
        if (step === 0) {
          Object.assign(feeds, createEmptyKVCache(6));
        } else if (pastKVCache) {
          for (let i = 0; i < 6; i++) {
            feeds[`past_key_values.${i}.key`] = pastKVCache[`present.${i}.key`];
            feeds[`past_key_values.${i}.value`] =
              pastKVCache[`present.${i}.value`];
          }
        } else {
          Object.assign(feeds, createEmptyKVCache(6));
        }

        const results = await sessionRef.current.run(feeds);

        if (!results.logits?.data) {
          throw new Error('Invalid model output');
        }

        pastKVCache = results;
        pastLength += inputForStep.length;

        // Get next token
        const logits = results.logits;
        const vocabSize = logits.dims[2];
        const lastTokenLogits = new Float32Array(vocabSize);
        const start = logits.data.length - vocabSize;

        for (let i = 0; i < vocabSize; i++) {
          lastTokenLogits[i] = logits.data[start + i];
        }

        // Temperature + Softmax
        const scaledLogits = lastTokenLogits.map(l => l / temperature);
        const maxLogit = Math.max(...scaledLogits);
        const expLogits = scaledLogits.map(l =>
          Math.exp(Math.min(l - maxLogit, 20)),
        );
        const sumExp = expLogits.reduce((a, b) => a + b, 0);
        const probs = expLogits.map(e => e / sumExp);

        // Sample next token
        let nextTokenId = 0;
        let maxProb = 0;
        for (let i = 0; i < probs.length; i++) {
          if (probs[i] > maxProb) {
            maxProb = probs[i];
            nextTokenId = i;
          }
        }

        // Decode and append
        const decoded = decodeToken(nextTokenId);
        if (decoded) {
          generatedText += decoded;
          generatedTokens.push(nextTokenId);

          // Her 3 token'de bir UI güncelle (daha smooth)
          if (generatedTokens.length % 3 === 0 || step === maxNewTokens - 1) {
            setCurrentStreamingMessage(generatedText.trim());
          }
        }

        console.log(
          `Step ${step}: Token ${nextTokenId} (${
            decoded || 'empty'
          }) - Total: ${generatedTokens.length}`,
        );

        // Stop conditions
        if (nextTokenId === eosTokenId) break;

        if (generatedTokens.length >= 3) {
          const last3 = generatedTokens.slice(-3);
          if (last3[0] === last3[1] && last3[1] === last3[2]) break;
        }

        await new Promise(resolve => setTimeout(resolve, 50));
      }

      setStreamingComplete(true);
      const finalText = generatedText.trim() || 'No response generated.';
      setCurrentStreamingMessage(finalText);
      await new Promise(resolve => setTimeout(resolve, 300));

      return finalText;
    } catch (error) {
      console.error('❌ AI generation error:', error);
      throw error;
    }
  };

  // ✅ SEND MESSAGE - REAL AI
  const sendMessage = async () => {
    if (!inputText.trim()) {
      Alert.alert('Warning', 'Please enter a message');
      return;
    }

    if (!modelLoaded || !sessionRef.current || !vocab) {
      Alert.alert('Error', 'AI model not ready. Please wait...');
      return;
    }

    if (isLoading || isStreaming) return;

    const userMessage = {
      id: Date.now().toString(),
      text: inputText.trim(),
      sender: 'user',
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    const userInput = inputText;
    setInputText('');
    setIsLoading(true);

    try {
      // ✅ REAL AI CALL
      const aiResponse = await generateAIResponse(userInput);

      const aiMessage = {
        id: (Date.now() + 1).toString(),
        text: aiResponse,
        sender: 'ai',
        timestamp: new Date().toISOString(),
      };

      const finalMessages = [...updatedMessages, aiMessage];
      setMessages(finalMessages);

      if (groupId) {
        await saveMessagesToGroup(groupId, finalMessages);
      }
    } catch (error) {
      console.error('❌ Send error:', error);
      Alert.alert('Error', `Failed: ${error.message}`);
      setMessages(messages);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      setCurrentStreamingMessage('');
    }
  };

  const startNewGroup = async () => {
    const newGroupId = Date.now().toString();
    const newChatId = (Date.now() + 1).toString();

    const newGroup = {
      id: newGroupId,
      name: 'General',
      chats: [
        {
          id: newChatId,
          title: 'New Chat',
          startDate: new Date().toISOString(),
          lastOpened: new Date().toISOString(),
          messages: [],
        },
      ],
    };

    try {
      const groups = await AsyncStorage.getItem('groups');
      const parsed = groups ? JSON.parse(groups) : [];
      parsed.unshift(newGroup);
      await AsyncStorage.setItem('groups', JSON.stringify(parsed));

      setGroupId(newGroupId);
      setMessages([]);
      setTitle('New Chat');

      navigation.replace('Chat', { groupId: newGroupId, chatId: newChatId });
    } catch (error) {
      console.error('❌ New group error:', error);
    }
  };

  const updateGroupName = async () => {
    if (!newGroupName.trim() || !groupId) return;

    try {
      const groups = await AsyncStorage.getItem('chatGroups');
      const parsed = groups ? JSON.parse(groups) : [];
      const idx = parsed.findIndex(g => g.id === groupId);

      if (idx !== -1) {
        parsed[idx].name = newGroupName.trim();
        await AsyncStorage.setItem('chatGroups', JSON.stringify(parsed));
        setTitle(newGroupName.trim());
        setGroupNameModalVisible(false);
        setNewGroupName('');
      }
    } catch (error) {
      console.error('❌ Update name error:', error);
    }
  };

  return {
    messages,
    setMessages,
    inputText,
    setInputText,
    isLoading,
    modelLoaded,
    modelLoadError,
    currentStreamingMessage,
    isStreaming,
    streamingComplete,
    title,
    isGroupNameModalVisible,
    setGroupNameModalVisible,
    newGroupName,
    setNewGroupName,
    scrollViewRef,
    loadModel,
    startNewGroup,
    updateGroupName,
    sendMessage,
    formatTime,
  };
};
