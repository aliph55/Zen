import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import * as ort from 'onnxruntime-react-native';
import RNFS from 'react-native-fs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showRewardedAd, getAdsStatus } from '../Components/adsService';

const Chat = ({ route, navigation }) => {
  const { groupId, chatId } = route.params || {};
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [modelLoadError, setModelLoadError] = useState(null);
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
  const [vocab, setVocab] = useState(null);
  const [reverseVocab, setReverseVocab] = useState(null);
  const [seconds, setSeconds] = useState(420); // 7 minutes for ad timer

  const sessionRef = useRef(null);
  const scrollViewRef = useRef(null);
  const streamingMessageId = useRef(null);

  // Model file paths
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

  // Copy model from assets
  const copyModelFromAssets = async () => {
    try {
      const paths = getModelPath();
      const modelExists = await RNFS.exists(paths.model);
      if (!modelExists) {
        console.log('Model dosyası bulunamadı, mock model oluşturuluyor...');
        setModelLoaded(false);
        setModelLoadError(
          'Model dosyası bulunamadı. Lütfen model.onnx dosyasını android/app/src/main/assets/ klasörüne koyun.',
        );
        return false;
      }
      console.log('Model dosyası zaten mevcut');
      return true;
    } catch (error) {
      console.error('Model kopyalama hatası:', error);
      throw new Error(`Model kopyalanamadı: ${error.message}`);
    }
  };

  // Load ONNX model
  const loadModel = async () => {
    try {
      setIsLoading(true);
      setModelLoadError(null);
      await copyModelFromAssets();
      const paths = getModelPath();
      const modelExists = await RNFS.exists(paths.model);
      if (!modelExists)
        throw new Error(`Model dosyası bulunamadı: ${paths.model}`);
      const modelStat = await RNFS.stat(paths.model);
      if (modelStat.size === 0) throw new Error('Model dosyası boş!');
      let session;
      try {
        session = await ort.InferenceSession.create(paths.model, {
          executionProviders: ['cpu'],
          graphOptimizationLevel: 'disabled',
          enableCpuMemArena: false,
          enableMemPattern: false,
          executionMode: 'sequential',
          logSeverityLevel: 0,
          interOpNumThreads: 1,
          intraOpNumThreads: 1,
        });
      } catch (pathError) {
        const CHUNK_SIZE = 10 * 1024 * 1024;
        const fileSize = modelStat.size;
        let modelData = '';
        for (let offset = 0; offset < fileSize; offset += CHUNK_SIZE) {
          const length = Math.min(CHUNK_SIZE, fileSize - offset);
          const chunk = await RNFS.read(paths.model, length, offset, 'base64');
          modelData += chunk;
          await new Promise(resolve => setTimeout(resolve, 10));
        }
        const binaryString = atob(modelData);
        const modelBuffer = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          modelBuffer[i] = binaryString.charCodeAt(i);
        }
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
      }
      sessionRef.current = session;
      setModelLoaded(true);
    } catch (error) {
      console.error('Model yükleme hatası:', error);
      setModelLoadError(error.message);
      Alert.alert('Model Yükleme Hatası', error.message, [
        { text: 'Tekrar Dene', onPress: loadModel },
        { text: 'İptal', style: 'cancel' },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Load vocab
  const loadVocab = async () => {
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
    } catch (error) {
      console.error('Vocab yükleme hatası:', error);
      const fallbackVocab = {};
      for (let i = 0; i < 50000; i++) {
        fallbackVocab[i] = `token_${i}`;
      }
      setReverseVocab(fallbackVocab);
    }
  };

  // Load groups from AsyncStorage
  const loadGroups = async () => {
    try {
      const savedGroups = await AsyncStorage.getItem('groups');
      if (savedGroups) {
        const parsed = JSON.parse(savedGroups);
        let loadedGroups = parsed.map(g => ({
          ...g,
          chats: g.chats.map(c => ({
            ...c,
            startDate: new Date(c.startDate),
            lastOpened: new Date(c.lastOpened),
            messages: c.messages.map(m => ({
              ...m,
              timestamp: new Date(m.timestamp),
            })),
          })),
        }));
        setGroups(loadedGroups);
        if (groupId && chatId) {
          const currentGroup = loadedGroups.find(g => g.id === groupId);
          if (currentGroup) {
            const currentChat = currentGroup.chats.find(c => c.id === chatId);
            if (currentChat) {
              setCurrentGroupId(groupId);
              setCurrentGroupName(currentGroup.name);
              setCurrentChatId(chatId);
              setMessages(currentChat.messages);
              setTitle(currentChat.title);
              setStartDate(currentChat.startDate);
              setLastOpened(new Date());
              const updatedGroups = loadedGroups.map(g =>
                g.id === groupId
                  ? {
                      ...g,
                      chats: g.chats.map(c =>
                        c.id === chatId ? { ...c, lastOpened: new Date() } : c,
                      ),
                    }
                  : g,
              );
              await saveGroups(updatedGroups);
            }
          }
        }
      } else {
        const defaultGroup = {
          id: Date.now().toString(),
          name: 'Genel',
          chats: [],
        };
        setGroups([defaultGroup]);
        setCurrentGroupId(defaultGroup.id);
        setCurrentGroupName(defaultGroup.name);
        await saveGroups([defaultGroup]);
      }
    } catch (error) {
      console.error('Gruplar yükleme hatası:', error);
    }
  };

  // Save groups to AsyncStorage
  const saveGroups = async (groupsToSave = groups) => {
    try {
      const serializedGroups = groupsToSave.map(g => ({
        ...g,
        chats: g.chats.map(c => ({
          ...c,
          startDate: c.startDate.toISOString(),
          lastOpened: c.lastOpened.toISOString(),
          messages: c.messages.map(m => ({
            ...m,
            timestamp: m.timestamp.toISOString(),
          })),
        })),
      }));
      await AsyncStorage.setItem('groups', JSON.stringify(serializedGroups));
    } catch (error) {
      console.error('Gruplar kaydetme hatası:', error);
    }
  };

  // Update current chat
  const updateCurrentChat = () => {
    if (!currentGroupId || !currentChatId || messages.length === 0) return;
    let currentTitle = title;
    if (!currentTitle && messages.length > 0 && messages[0].sender === 'user') {
      currentTitle =
        messages[0].text.slice(0, 50) +
        (messages[0].text.length > 50 ? '...' : '');
    }
    const updatedChat = {
      id: currentChatId,
      title: currentTitle || 'Sohbet',
      startDate: startDate || new Date(),
      lastOpened: new Date(),
      messages,
    };
    const updatedGroups = groups.map(g =>
      g.id === currentGroupId
        ? {
            ...g,
            chats: g.chats.map(c => (c.id === currentChatId ? updatedChat : c)),
          }
        : g,
    );
    setGroups(updatedGroups);
    setTitle(updatedChat.title);
    setStartDate(updatedChat.startDate);
    setLastOpened(updatedChat.lastOpened);
    saveGroups(updatedGroups);
  };

  // Create new group
  const startNewGroup = () => {
    updateCurrentChat();
    const newGroupId = Date.now().toString();
    const newChatId = (Date.now() + 1).toString();
    const newGroup = {
      id: newGroupId,
      name: 'Genel',
      chats: [
        {
          id: newChatId,
          title: 'Sohbet', // Default title, will be updated by first message
          startDate: new Date(),
          lastOpened: new Date(),
          messages: [],
        },
      ],
    };
    setGroups(prev => [...prev, newGroup]);
    setCurrentGroupId(newGroupId);
    setCurrentGroupName(newGroup.name);
    setMessages([]);
    setCurrentChatId(newChatId);
    setTitle('Sohbet');
    setStartDate(new Date());
    setLastOpened(new Date());
    saveGroups();
    navigation.setParams({ groupId: newGroupId, chatId: newChatId });
  };

  // Create new chat
  const startNewChat = () => {
    if (!currentGroupId) return;
    updateCurrentChat();
    const newChatId = Date.now().toString();
    const newChat = {
      id: newChatId,
      title: 'Sohbet', // Default title, will be updated by first message
      startDate: new Date(),
      lastOpened: new Date(),
      messages: [],
    };
    setGroups(prev =>
      prev.map(g =>
        g.id === currentGroupId ? { ...g, chats: [...g.chats, newChat] } : g,
      ),
    );
    setCurrentChatId(newChatId);
    setMessages(newChat.messages);
    setTitle(newChat.title);
    setStartDate(newChat.startDate);
    setLastOpened(newChat.lastOpened);
    saveGroups();
    navigation.setParams({ groupId: currentGroupId, chatId: newChatId });
  };

  // Create new chat if none exists
  const createNewChatIfNeeded = () => {
    if (!currentGroupId) {
      const newGroupId = Date.now().toString();
      const newGroup = {
        id: newGroupId,
        name: 'Genel',
        chats: [],
      };
      setGroups([newGroup]);
      setCurrentGroupId(newGroupId);
      setCurrentGroupName(newGroup.name);
      saveGroups();
    }
    if (!currentChatId) {
      const newChatId = Date.now().toString();
      const newChat = {
        id: newChatId,
        title: 'Sohbet', // Default title, will be updated by first message
        startDate: new Date(),
        lastOpened: new Date(),
        messages: [],
      };
      setGroups(prev =>
        prev.map(g =>
          g.id === currentGroupId ? { ...g, chats: [...g.chats, newChat] } : g,
        ),
      );
      setCurrentChatId(newChatId);
      setStartDate(newChat.startDate);
      setLastOpened(newChat.lastOpened);
      saveGroups();
    }
  };

  // Update group name
  const updateGroupName = () => {
    if (!newGroupName.trim()) {
      Alert.alert('Hata', 'Grup adı boş olamaz.');
      return;
    }
    setGroups(prev =>
      prev.map(g =>
        g.id === currentGroupId ? { ...g, name: newGroupName } : g,
      ),
    );
    setCurrentGroupName(newGroupName);
    setNewGroupName('');
    setGroupNameModalVisible(false);
    saveGroups();
  };

  // Tokenizer
  const tokenize = async text => {
    if (!vocab) {
      console.warn('Vocab henüz yüklenmedi');
      return [50256];
    }
    let processedText = text.trim();
    if (!processedText) return [50256];
    const tokens = [];
    const words = processedText.split(' ');
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      if (!word) continue;
      const prefix = i === 0 ? '' : 'Ġ';
      if (vocab[prefix + word] !== undefined) {
        tokens.push(vocab[prefix + word]);
      } else if (vocab[prefix + word.toLowerCase()] !== undefined) {
        tokens.push(vocab[prefix + word.toLowerCase()]);
      } else {
        tokens.push(vocab['<unk>'] || 10);
      }
    }
    tokens.unshift(vocab['<|endoftext|>'] || 50256);
    return tokens;
  };

  // Streaming token decoder
  const decodeAndAppendToken = tokenId => {
    if (!reverseVocab) return '';
    let token = reverseVocab[tokenId] || `[${tokenId}]`;
    return token
      .replace(/Ġ/g, ' ')
      .replace(/Ċ/g, '\n')
      .replace(/ĉ/g, '\t')
      .replace(/Ģ/g, '')
      .replace(/â/g, '')
      .replace(/Ī/g, '')
      .replace(/ľ/g, '"')
      .replace(/Ŀ/g, '"')
      .replace(/ŉ/g, "'")
      .replace(/<\|endoftext\|>/g, '');
  };

  // Streaming text generation
  const generateStreamingResponse = async prompt => {
    if (!sessionRef.current) {
      const mockResponse = 'Model henüz yüklenmedi. Bu bir test mesajıdır.';
      const words = mockResponse.split(' ');
      setCurrentStreamingMessage('');
      setIsStreaming(true);
      setStreamingComplete(false);
      for (let i = 0; i < words.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 200));
        setCurrentStreamingMessage(words.slice(0, i + 1).join(' '));
      }
      setStreamingComplete(true);
      await new Promise(resolve => setTimeout(resolve, 500));
      setIsStreaming(false);
      return mockResponse;
    }

    try {
      const tokens = await tokenize(prompt || 'Merhaba');
      let currentInputIds = tokens.slice(0, 100);
      const maxNewTokens = 30;
      const temperature = 0.7;
      const topK = 50;
      const topP = 0.9;
      const repetitionPenalty = 1.3;
      const eosTokenId = vocab?.['<|endoftext|>'] || 50256;
      let generatedTokens = [];
      let pastKeyValues = null;
      let pastLength = 0;
      let recentTokens = [...currentInputIds];

      setCurrentStreamingMessage('');
      setIsStreaming(true);
      setStreamingComplete(false);

      for (let step = 0; step < maxNewTokens; step++) {
        const inputForStep =
          step === 0
            ? currentInputIds
            : [currentInputIds[currentInputIds.length - 1]];
        const inputTensor = new ort.Tensor(
          'int64',
          new BigInt64Array(inputForStep.map(id => BigInt(id))),
          [1, inputForStep.length],
        );
        const totalLength = pastLength + inputForStep.length;
        const attentionMask = new ort.Tensor(
          'int64',
          new BigInt64Array(new Array(totalLength).fill(1).map(v => BigInt(v))),
          [1, totalLength],
        );
        const positionIds = new ort.Tensor(
          'int64',
          new BigInt64Array(
            Array.from({ length: inputForStep.length }, (_, i) =>
              BigInt(pastLength + i),
            ),
          ),
          [1, inputForStep.length],
        );
        const feeds = {
          input_ids: inputTensor,
          attention_mask: attentionMask,
          position_ids: positionIds,
        };
        for (let i = 0; i < 6; i++) {
          feeds[`past_key_values.${i}.key`] = pastKeyValues
            ? pastKeyValues[`key_${i}`]
            : new ort.Tensor(
                'float32',
                new Float32Array(1 * 12 * 0 * 64),
                [1, 12, 0, 64],
              );
          feeds[`past_key_values.${i}.value`] = pastKeyValues
            ? pastKeyValues[`value_${i}`]
            : new ort.Tensor(
                'float32',
                new Float32Array(1 * 12 * 0 * 64),
                [1, 12, 0, 64],
              );
        }
        const results = await sessionRef.current.run(feeds);
        const logits = results.logits;
        if (!logits || !logits.data) {
          throw new Error('Model did not return valid logits');
        }
        const vocabSize = logits.dims[2];
        const lastTokenLogits = new Float32Array(vocabSize);
        for (let i = 0; i < vocabSize; i++) {
          lastTokenLogits[i] = logits.data[logits.data.length - vocabSize + i];
        }

        // Apply repetition penalty
        const recentTokenCount = {};
        const recentWindow = recentTokens.slice(-20);
        for (const token of recentWindow) {
          recentTokenCount[token] = (recentTokenCount[token] || 0) + 1;
        }
        for (const [tokenId, count] of Object.entries(recentTokenCount)) {
          if (count > 1) {
            const penalty = Math.pow(repetitionPenalty, count);
            const id = parseInt(tokenId);
            if (lastTokenLogits[id] > 0) {
              lastTokenLogits[id] /= penalty;
            } else {
              lastTokenLogits[id] *= penalty;
            }
          }
        }

        // Temperature scaling
        const scaledLogits = lastTokenLogits.map(
          l => l / Math.max(temperature, 1e-7),
        );
        const maxLogit = Math.max(...scaledLogits);
        const normalizedLogits = scaledLogits.map(l => l - maxLogit);
        const expLogits = normalizedLogits.map(l => Math.exp(Math.min(l, 20)));
        const sumExp = expLogits.reduce((a, b) => a + b, 0);

        let nextTokenId;
        if (!sumExp || isNaN(sumExp) || sumExp === 0) {
          console.warn('Invalid probability sum, using greedy selection');
          nextTokenId = scaledLogits.indexOf(Math.max(...scaledLogits));
        } else {
          const probs = expLogits.map(e => e / sumExp);
          const probsWithIndex = probs
            .map((prob, index) => ({ prob, index }))
            .filter(item => !isNaN(item.prob) && item.prob > 1e-8);
          if (probsWithIndex.length === 0) {
            console.warn('No valid probabilities, using greedy selection');
            nextTokenId = scaledLogits.indexOf(Math.max(...scaledLogits));
          } else {
            probsWithIndex.sort((a, b) => b.prob - a.prob);
            let filteredProbs = probsWithIndex.slice(0, topK);
            let cumSum = 0;
            let cutoffIndex = filteredProbs.length;
            for (let i = 0; i < filteredProbs.length; i++) {
              cumSum += filteredProbs[i].prob;
              if (cumSum > topP) {
                cutoffIndex = i + 1;
                break;
              }
            }
            filteredProbs = filteredProbs.slice(0, cutoffIndex);
            const filteredSum = filteredProbs.reduce(
              (sum, item) => sum + item.prob,
              0,
            );
            filteredProbs = filteredProbs.map(item => ({
              ...item,
              prob: filteredSum > 0 ? item.prob / filteredSum : item.prob,
            }));
            if (filteredProbs.length === 0) {
              console.warn(
                'Filtered probabilities empty, using greedy selection',
              );
              nextTokenId = scaledLogits.indexOf(Math.max(...scaledLogits));
            } else {
              const random = Math.random();
              let cumProb = 0;
              nextTokenId = filteredProbs[0].index;
              for (const item of filteredProbs) {
                cumProb += item.prob;
                if (random < cumProb) {
                  nextTokenId = item.index;
                  break;
                }
              }
            }
          }
        }

        generatedTokens.push(nextTokenId);
        recentTokens.push(nextTokenId);
        if (recentTokens.length > 50) recentTokens = recentTokens.slice(-40);
        const fullText = generatedTokens
          .map(id => decodeAndAppendToken(id))
          .join('')
          .trim()
          .replace(/\s+/g, ' ');
        setCurrentStreamingMessage(fullText);

        if (step === 0) {
          pastLength = currentInputIds.length;
          currentInputIds.push(nextTokenId);
        } else {
          pastLength += 1;
          currentInputIds = [nextTokenId];
        }
        pastKeyValues = {};
        for (let i = 0; i < 6; i++) {
          pastKeyValues[`key_${i}`] = results[`present.${i}.key`];
          pastKeyValues[`value_${i}`] = results[`present.${i}.value`];
        }
        if (
          generatedTokens.length >= 5 &&
          generatedTokens
            .slice(-5)
            .every(
              token => token === generatedTokens[generatedTokens.length - 1],
            )
        ) {
          break;
        }
        if (
          nextTokenId === eosTokenId ||
          generatedTokens.length >= maxNewTokens
        ) {
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      setStreamingComplete(true);
      let finalResponse = generatedTokens
        .map(id => decodeAndAppendToken(id))
        .join('')
        .trim()
        .replace(/\s+/g, ' ');
      if (!finalResponse) finalResponse = 'Model kısa yanıt üretti.';
      setCurrentStreamingMessage(finalResponse);
      await new Promise(resolve => setTimeout(resolve, 500));
      setIsStreaming(false);
      return finalResponse;
    } catch (error) {
      console.error('Generation error:', error);
      setStreamingComplete(true);
      setIsStreaming(false);
      return 'Üzgünüm, yanıt oluştururken bir hata oluştu: ' + error.message;
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!inputText.trim() || isLoading || isStreaming) return;
    if (!modelLoaded) {
      Alert.alert('Uyarı', 'Model henüz yüklenmedi. Lütfen bekleyin.');
      return;
    }
    createNewChatIfNeeded();
    const userMessage = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date(),
    };
    // Set title to first user message if this is the first message
    if (messages.length === 0) {
      const newTitle =
        inputText.slice(0, 50) + (inputText.length > 50 ? '...' : '');
      setTitle(newTitle);
      setGroups(prev =>
        prev.map(g =>
          g.id === currentGroupId
            ? {
                ...g,
                chats: g.chats.map(c =>
                  c.id === currentChatId ? { ...c, title: newTitle } : c,
                ),
              }
            : g,
        ),
      );
      saveGroups();
    }
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    streamingMessageId.current = (Date.now() + 1).toString();
    try {
      const response = await generateStreamingResponse(inputText);
      const finalMessageText = currentStreamingMessage.trim() || response;
      const aiMessage = {
        id: streamingMessageId.current,
        text: finalMessageText,
        sender: 'ai',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMessage]);
      setCurrentStreamingMessage('');
    } catch (error) {
      Alert.alert('Hata', 'Yanıt oluşturulurken bir hata oluştu.');
      setIsStreaming(false);
      setCurrentStreamingMessage('');
    }
  };

  // Ad timer
  const onTimerEnd = () => {
    setSeconds(420);
    console.log('Reklam gösteriliyor...');
    showRewardedAd();
  };

  useEffect(() => {
    const intervalId = setInterval(() => {
      setSeconds(prev => (prev <= 1 ? (onTimerEnd(), 0) : prev - 1));
    }, 1000);
    return () => clearInterval(intervalId);
  }, []);

  const formatTime = () => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  // Message bubble component
  const MessageBubble = ({ message }) => (
    <View
      style={[
        styles.messageBubble,
        message.sender === 'user' ? styles.userBubble : styles.aiBubble,
      ]}
    >
      <Text
        style={[
          styles.messageText,
          message.sender === 'user' && styles.userText,
        ]}
      >
        {message.text}
      </Text>
      <Text style={styles.timestamp}>
        {message.timestamp.toLocaleTimeString('tr-TR')}
      </Text>
    </View>
  );

  // Streaming message component
  const StreamingMessage = () => {
    if (!isStreaming) return null;
    return (
      <View
        style={[styles.messageBubble, styles.aiBubble, styles.streamingBubble]}
      >
        <Text style={styles.messageText}>
          {currentStreamingMessage}
          {!streamingComplete && <Text style={styles.cursor}>▊</Text>}
        </Text>
        {streamingComplete && (
          <View style={styles.streamingComplete}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.completingText}>Tamamlanıyor...</Text>
          </View>
        )}
      </View>
    );
  };

  useEffect(() => {
    loadModel().then(() => {
      loadVocab();
      loadGroups();
    });
    return () => {
      if (sessionRef.current) sessionRef.current.release?.();
    };
  }, []);

  useEffect(() => {
    if (messages.length > 0 || currentChatId) updateCurrentChat();
  }, [messages]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{title || 'Sohbet'}</Text>
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>{formatTime()}</Text>
          {modelLoaded ? (
            <View style={styles.statusIndicator}>
              <View style={[styles.statusDot, styles.statusDotActive]} />
              <Text style={styles.statusText}>Model Hazır</Text>
            </View>
          ) : isLoading ? (
            <View style={styles.statusIndicator}>
              <ActivityIndicator size="small" color="#007AFF" />
              <Text style={styles.statusText}>Model Yükleniyor...</Text>
            </View>
          ) : modelLoadError ? (
            <View style={styles.statusIndicator}>
              <View style={[styles.statusDot, styles.statusDotError]} />
              <Text style={styles.statusText}>Hata</Text>
            </View>
          ) : null}

          <TouchableOpacity onPress={startNewGroup}>
            <Text style={styles.headerButton}>Yeni Grup</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={isGroupNameModalVisible}
        transparent
        animationType="slide"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Grup Adını Düzenle</Text>
            <TextInput
              style={styles.modalInput}
              value={newGroupName}
              onChangeText={setNewGroupName}
              placeholder="Yeni grup adı..."
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setGroupNameModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSave]}
                onPress={updateGroupName}
              >
                <Text style={styles.modalButtonText}>Kaydet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {modelLoadError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Hata: {modelLoadError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadModel}>
            <Text style={styles.retryButtonText}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd()}
      >
        {messages.length === 0 && modelLoaded && !isStreaming && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              Merhaba! Size nasıl yardımcı olabilirim?
            </Text>
          </View>
        )}
        {messages.map(message => (
          <MessageBubble key={message.id} message={message} />
        ))}
        <StreamingMessage />
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Mesajınızı yazın..."
          placeholderTextColor="#999"
          multiline
          maxHeight={100}
          editable={modelLoaded && !isLoading && !isStreaming}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!inputText.trim() || !modelLoaded || isLoading || isStreaming) &&
              styles.sendButtonDisabled,
          ]}
          onPress={sendMessage}
          disabled={
            !inputText.trim() || !modelLoaded || isLoading || isStreaming
          }
        >
          <Text style={styles.sendButtonText}>
            {isStreaming ? 'Üretiyor...' : 'Gönder'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    backgroundColor: '#007AFF',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: 'white' },
  headerButton: { color: 'white', fontSize: 16, marginLeft: 10 },
  statusContainer: { flexDirection: 'row', alignItems: 'center' },
  statusIndicator: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 5 },
  statusDotActive: { backgroundColor: '#4CAF50' },
  statusDotError: { backgroundColor: '#F44336' },
  statusText: { color: 'white', fontSize: 12 },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 15,
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 8,
  },
  errorText: { color: '#c62828', fontSize: 14, marginBottom: 10 },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
    alignSelf: 'flex-start',
  },
  retryButtonText: { color: 'white', fontSize: 14, fontWeight: '600' },
  messagesContainer: { flex: 1 },
  messagesContent: { padding: 20 },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  emptyText: { fontSize: 16, color: '#666', textAlign: 'center' },
  messageBubble: {
    maxWidth: '80%',
    marginVertical: 5,
    padding: 12,
    borderRadius: 15,
  },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#007AFF' },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  streamingBubble: {
    borderColor: '#007AFF',
    borderWidth: 2,
    backgroundColor: '#f8f9ff',
  },
  messageText: { fontSize: 16, color: '#333' },
  userText: { color: 'white' },
  cursor: { color: '#007AFF', fontWeight: 'bold', fontSize: 18 },
  streamingComplete: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  completingText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
    fontStyle: 'italic',
  },
  timestamp: { fontSize: 11, color: '#999', marginTop: 5 },
  inputContainer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    justifyContent: 'center',
  },
  sendButtonDisabled: { backgroundColor: '#ccc' },
  sendButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '80%',
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
    fontSize: 16,
  },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end' },
  modalButton: { padding: 10, marginLeft: 10 },
  modalButtonSave: { backgroundColor: '#007AFF', borderRadius: 5 },
  modalButtonText: { color: '#007AFF', fontSize: 16, fontWeight: '600' },
});

export default Chat;
