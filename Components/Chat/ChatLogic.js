import { useState, useEffect, useRef, useCallback } from 'react';
import * as ort from 'onnxruntime-react-native';
import RNFS from 'react-native-fs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showRewardedAd } from '../adsService'; // Adjust path as needed

export const useChatLogic = ({ route, navigation }) => {
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
  const [seconds, setSeconds] = useState(420);

  const sessionRef = useRef(null);
  const scrollViewRef = useRef(null);
  const streamingMessageId = useRef(null);
  const saveTimeoutRef = useRef(null);

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
            const assetsList = await RNFS.readDirAssets('');
            console.log('Assets klasöründeki dosyalar:', assetsList);
            await RNFS.copyFileAssets(assetsModelPath, paths.model);
            console.log('✅ Model başarıyla kopyalandı:', paths.model);
            const copiedExists = await RNFS.exists(paths.model);
            if (!copiedExists) {
              throw new Error('Model kopyalandı ama dosya bulunamadı!');
            }
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
          const bundleExists = await RNFS.exists(bundleModelPath);
          if (!bundleExists) {
            throw new Error(
              `iOS Bundle'da model bulunamadı: ${bundleModelPath}`,
            );
          }
          await RNFS.copyFile(bundleModelPath, paths.model);
          console.log("✅ Model iOS bundle'dan kopyalandı");
          return true;
        }
      }
      console.log('✅ Model dosyası zaten mevcut:', paths.model);
      return true;
    } catch (error) {
      console.error('❌ Model kopyalama hatası:', error);
      setModelLoaded(false);
      setModelLoadError(`Model kopyalanamadı: ${error.message}`);
      return false;
    }
  };

  const loadModel = async () => {
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
          graphOptimizationLevel: 'disabled',
          enableCpuMemArena: false,
          enableMemPattern: false,
          executionMode: 'sequential',
          logSeverityLevel: 0,
          interOpNumThreads: 1,
          intraOpNumThreads: 1,
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
      console.log('✅✅ Model başarıyla yüklendi ve hazır!');
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
      console.log('Vocab başarıyla yüklendi');
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

  const testAsyncStorage = async () => {
    try {
      const testData = { test: 'Merhaba, dünya!' };
      await AsyncStorage.setItem('testKey', JSON.stringify(testData));
      const result = await AsyncStorage.getItem('testKey');
      console.log(
        'AsyncStorage testi başarılı, alınan veri:',
        JSON.parse(result),
      );
    } catch (error) {
      console.error('AsyncStorage test hatası:', error);
      Alert.alert('Hata', `AsyncStorage testi başarısız: ${error.message}`);
    }
  };

  const checkStorageSize = async () => {
    try {
      const keys = await AsyncStorage.getAllKeys();
      let totalSize = 0;
      for (const key of keys) {
        const data = await AsyncStorage.getItem(key);
        totalSize += ((data?.length || 0) * 2) / 1024;
      }
      console.log(
        `AsyncStorage kullanılan toplam boyut: ${totalSize.toFixed(2)} KB`,
      );
      if (totalSize > 5000) {
        Alert.alert(
          'Uyarı',
          'Depolama alanı dolmak üzere, eski sohbetler temizleniyor...',
        );
        await clearOldChats();
      }
    } catch (error) {
      console.error('Depolama boyutu kontrol hatası:', error);
    }
  };

  const clearOldChats = async () => {
    try {
      const savedGroups = await AsyncStorage.getItem('groups');
      if (savedGroups) {
        const parsed = JSON.parse(savedGroups);
        const updatedGroups = parsed.map(g => ({
          ...g,
          chats: g.chats.filter(c => {
            const lastOpened = new Date(c.lastOpened);
            const daysDiff = (new Date() - lastOpened) / (1000 * 60 * 60 * 24);
            return daysDiff <= 30;
          }),
        }));
        await AsyncStorage.setItem('groups', JSON.stringify(updatedGroups));
        setGroups(updatedGroups);
        console.log('Eski sohbetler temizlendi');
      }
    } catch (error) {
      console.error('Eski sohbetleri temizleme hatası:', error);
      Alert.alert('Hata', `Eski sohbetler temizlenemedi: ${error.message}`);
    }
  };

  const saveGroups = useCallback(async groupsToSave => {
    try {
      console.log(
        'saveGroups çağrıldı, kaydedilecek gruplar:',
        JSON.stringify(groupsToSave, null, 2),
      );
      const serializedGroups = groupsToSave.map(g => ({
        ...g,
        chats: g.chats.map(c => ({
          ...c,
          startDate:
            c.startDate instanceof Date
              ? c.startDate.toISOString()
              : c.startDate,
          lastOpened:
            c.lastOpened instanceof Date
              ? c.lastOpened.toISOString()
              : c.lastOpened,
          messages: c.messages.map(m => ({
            ...m,
            timestamp:
              m.timestamp instanceof Date
                ? m.timestamp.toISOString()
                : m.timestamp,
          })),
        })),
      }));
      const jsonString = JSON.stringify(serializedGroups);
      console.log('Serileştirilmiş veri uzunluğu:', jsonString.length);
      await AsyncStorage.setItem('groups', jsonString);
      console.log("✅ Gruplar başarıyla AsyncStorage'a kaydedildi");
      const verification = await AsyncStorage.getItem('groups');
      if (verification) {
        console.log(
          '✅ Doğrulama: Veriler başarıyla okundu, uzunluk:',
          verification.length,
        );
      } else {
        console.error('❌ Doğrulama hatası: Veriler okunamadı!');
      }
    } catch (error) {
      console.error('❌ Gruplar kaydetme hatası:', error);
      Alert.alert('Hata', `Gruplar kaydedilemedi: ${error.message}`);
    }
  }, []);

  const debugAsyncStorage = async () => {
    try {
      const data = await AsyncStorage.getItem('groups');
      console.log(
        '🔍 Debug AsyncStorage groups:',
        data ? JSON.parse(data) : 'null',
      );
    } catch (error) {
      console.error('🔍 Debug AsyncStorage error:', error);
    }
  };

  const loadGroups = async () => {
    try {
      console.log("loadGroups çağrıldı, AsyncStorage'dan okuma başlıyor...", {
        groupId,
        chatId,
      });
      const savedGroups = await AsyncStorage.getItem('groups');
      console.log(
        "AsyncStorage'dan alınan ham veri:",
        savedGroups ? savedGroups.substring(0, 200) + '...' : 'null',
      );
      if (savedGroups) {
        const parsed = JSON.parse(savedGroups);
        let loadedGroups = parsed.map(g => ({
          ...g,
          chats: Array.isArray(g.chats)
            ? g.chats.map(c => ({
                ...c,
                startDate: new Date(c.startDate),
                lastOpened: new Date(c.lastOpened),
                messages: Array.isArray(c.messages)
                  ? c.messages.map(m => ({
                      ...m,
                      timestamp: new Date(m.timestamp),
                    }))
                  : [],
              }))
            : [],
        }));
        console.log(
          '✅ loadGroups: Parsed groups:',
          JSON.stringify(loadedGroups, null, 2),
        );
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
              console.log(
                '✅ loadGroups: Updated groups with lastOpened:',
                JSON.stringify(updatedGroups, null, 2),
              );
              await saveGroups(updatedGroups);
            } else {
              console.warn('⚠️ loadGroups: Chat not found for chatId:', chatId);
              createNewChatIfNeeded();
            }
          } else {
            console.warn(
              '⚠️ loadGroups: Group not found for groupId:',
              groupId,
            );
            createNewChatIfNeeded();
          }
        } else {
          console.log('📌 loadGroups: No groupId or chatId, creating new chat');
          createNewChatIfNeeded();
        }
      } else {
        console.log('AsyncStorage boş, yeni default grup oluşturuluyor...');
        const defaultGroup = {
          id: Date.now().toString(),
          name: 'Genel',
          chats: [],
        };
        setGroups([defaultGroup]);
        setCurrentGroupId(defaultGroup.id);
        setCurrentGroupName(defaultGroup.name);
        await saveGroups([defaultGroup]);
        createNewChatIfNeeded();
      }
    } catch (error) {
      console.error('❌ Gruplar yükleme hatası:', error);
      Alert.alert('Hata', `Gruplar yüklenemedi: ${error.message}`);
    }
  };

  const debouncedSave = useCallback(
    groupsToSave => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        saveGroups(groupsToSave);
      }, 1000);
    },
    [saveGroups],
  );

  const updateCurrentChat = useCallback(
    currentMessages => {
      if (!currentGroupId || !currentChatId || currentMessages.length === 0)
        return null;
      let currentTitle = title;
      if (
        !currentTitle &&
        currentMessages.length > 0 &&
        currentMessages[0].sender === 'user'
      ) {
        currentTitle =
          currentMessages[0].text.slice(0, 50) +
          (currentMessages[0].text.length > 50 ? '...' : '');
      }
      return {
        id: currentChatId,
        title: currentTitle || 'Sohbet',
        startDate: startDate || new Date(),
        lastOpened: new Date(),
        messages: currentMessages,
      };
    },
    [currentGroupId, currentChatId, title, startDate],
  );

  const startNewGroup = () => {
    const updatedChat = updateCurrentChat(messages);
    let newGroups = [...groups];
    if (updatedChat) {
      newGroups = newGroups.map(g =>
        g.id === currentGroupId
          ? {
              ...g,
              chats: g.chats.map(c =>
                c.id === currentChatId ? updatedChat : c,
              ),
            }
          : g,
      );
    }
    const newGroupId = Date.now().toString();
    const newChatId = (Date.now() + 1).toString();
    const newGroup = {
      id: newGroupId,
      name: 'Genel',
      chats: [
        {
          id: newChatId,
          title: 'Sohbet',
          startDate: new Date(),
          lastOpened: new Date(),
          messages: [],
        },
      ],
    };
    newGroups = [...newGroups, newGroup];
    setGroups(newGroups);
    setCurrentGroupId(newGroupId);
    setCurrentGroupName(newGroup.name);
    setMessages([]);
    setCurrentChatId(newChatId);
    setTitle('Sohbet');
    setStartDate(new Date());
    setLastOpened(new Date());
    saveGroups(newGroups);
    navigation.setParams({ groupId: newGroupId, chatId: newChatId });
  };

  const startNewChat = () => {
    if (!currentGroupId) return;
    const updatedChat = updateCurrentChat(messages);
    let newGroups = [...groups];
    if (updatedChat) {
      newGroups = newGroups.map(g =>
        g.id === currentGroupId
          ? {
              ...g,
              chats: g.chats.map(c =>
                c.id === currentChatId ? updatedChat : c,
              ),
            }
          : g,
      );
    }
    const newChatId = Date.now().toString();
    const newChat = {
      id: newChatId,
      title: 'Sohbet',
      startDate: new Date(),
      lastOpened: new Date(),
      messages: [],
    };
    newGroups = newGroups.map(g =>
      g.id === currentGroupId ? { ...g, chats: [...g.chats, newChat] } : g,
    );
    setGroups(newGroups);
    setCurrentChatId(newChatId);
    setMessages(newChat.messages);
    setTitle(newChat.title);
    setStartDate(newChat.startDate);
    setLastOpened(newChat.lastOpened);
    saveGroups(newGroups);
    navigation.setParams({ groupId: currentGroupId, chatId: newChatId });
  };

  const createNewChatIfNeeded = () => {
    setGroups(prevGroups => {
      let newGroups = [...prevGroups];
      let needsSave = false;
      let newGroupId = currentGroupId;
      let newChatId = currentChatId;

      console.log('📌 createNewChatIfNeeded: Current state', {
        currentGroupId,
        currentChatId,
        groupsLength: newGroups.length,
      });

      if (!newGroupId) {
        newGroupId = Date.now().toString();
        const newGroup = {
          id: newGroupId,
          name: 'Genel',
          chats: [],
        };
        newGroups = [newGroup];
        setCurrentGroupId(newGroupId);
        setCurrentGroupName(newGroup.name);
        needsSave = true;
        console.log('📌 createNewChatIfNeeded: Created new group:', newGroup);
      }

      if (!newChatId) {
        newChatId = Date.now().toString();
        const newChat = {
          id: newChatId,
          title: 'Sohbet',
          startDate: new Date(),
          lastOpened: new Date(),
          messages: [],
        };
        newGroups = newGroups.map(g =>
          g.id === newGroupId ? { ...g, chats: [...g.chats, newChat] } : g,
        );
        setCurrentChatId(newChatId);
        setTitle(newChat.title);
        setStartDate(newChat.startDate);
        setLastOpened(newChat.lastOpened);
        needsSave = true;
        console.log('📌 createNewChatIfNeeded: Created new chat:', newChat);
      }

      if (needsSave) {
        console.log(
          '📌 createNewChatIfNeeded: Saving groups:',
          JSON.stringify(newGroups, null, 2),
        );
        debouncedSave(newGroups);
      }

      const group = newGroups.find(g => g.id === newGroupId);
      const chat = group?.chats.find(c => c.id === newChatId);
      console.log('📌 createNewChatIfNeeded: Verification', {
        groupExists: !!group,
        chatExists: !!chat,
        chatsCount: group?.chats.length || 0,
      });

      return newGroups;
    });
  };

  const updateGroupName = () => {
    if (!newGroupName.trim()) {
      Alert.alert('Hata', 'Grup adı boş olamaz.');
      return;
    }
    const newGroups = groups.map(g =>
      g.id === currentGroupId ? { ...g, name: newGroupName } : g,
    );
    setGroups(newGroups);
    setCurrentGroupName(newGroupName);
    setNewGroupName('');
    setGroupNameModalVisible(false);
    saveGroups(newGroups);
  };

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
        const clippedLogits = lastTokenLogits.map(l =>
          Math.max(Math.min(l, 100), -100),
        );
        const scaledLogits = clippedLogits.map(
          l => l / Math.max(temperature, 1e-7),
        );
        const maxLogit = Math.max(...scaledLogits);
        const normalizedLogits = scaledLogits.map(l => l - maxLogit);
        const expLogits = normalizedLogits.map(l => Math.exp(Math.min(l, 20)));
        const sumExp = expLogits.reduce((a, b) => a + b, 0);
        let nextTokenId;
        if (!sumExp || isNaN(sumExp) || sumExp === 0) {
          console.warn('Invalid probability sum, using greedy selection', {
            sumExp,
            expLogits: expLogits.slice(0, 10),
            normalizedLogits: normalizedLogits.slice(0, 10),
          });
          nextTokenId = scaledLogits.indexOf(Math.max(...scaledLogits));
        } else {
          const probs = expLogits.map(e => e / sumExp);
          const probsWithIndex = probs
            .map((prob, index) => ({ prob, index }))
            .filter(item => !isNaN(item.prob) && item.prob > 1e-8);
          if (probsWithIndex.length === 0) {
            console.warn('No valid probabilities, using greedy selection', {
              probs: probs.slice(0, 10),
            });
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
                { filteredProbsCount: probsWithIndex.length },
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

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading || isStreaming) return;
    if (!modelLoaded) {
      Alert.alert('Uyarı', 'Model henüz yüklenmedi. Lütfen bekleyin.');
      return;
    }
    console.log('📩 sendMessage: Starting with', {
      inputText,
      currentGroupId,
      currentChatId,
      messagesLength: messages.length,
    });
    createNewChatIfNeeded();
    if (!currentGroupId || !currentChatId) {
      console.error('❌ sendMessage: Missing group or chat ID', {
        currentGroupId,
        currentChatId,
      });
      Alert.alert('Hata', 'Grup veya sohbet ID eksik.');
      return;
    }
    const userMessage = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages(prevMessages => {
      const newMessages = [...prevMessages, userMessage];
      let newTitle = title;
      if (prevMessages.length === 0) {
        const trimmedInput = inputText.replace(/\s+/g, ' ').trim();
        newTitle =
          trimmedInput.length > 0
            ? trimmedInput.slice(0, 50) +
              (trimmedInput.length > 50 ? '...' : '')
            : 'Sohbet';
        setTitle(newTitle);
      }
      setGroups(prevGroups => {
        let updatedGroups = prevGroups.map(g =>
          g.id === currentGroupId
            ? {
                ...g,
                chats: g.chats.some(c => c.id === currentChatId)
                  ? g.chats.map(c =>
                      c.id === currentChatId
                        ? {
                            ...c,
                            title: newTitle,
                            messages: newMessages,
                            lastOpened: new Date(),
                          }
                        : c,
                    )
                  : [
                      ...g.chats,
                      {
                        id: currentChatId,
                        title: newTitle,
                        startDate: new Date(),
                        lastOpened: new Date(),
                        messages: newMessages,
                      },
                    ],
              }
            : g,
        );
        console.log(
          '📩 sendMessage: Updated groups before save:',
          JSON.stringify(updatedGroups, null, 2),
        );
        debouncedSave(updatedGroups);
        return updatedGroups;
      });
      setInputText('');
      streamingMessageId.current = (Date.now() + 1).toString();
      generateStreamingResponse(inputText)
        .then(response => {
          const finalMessageText = currentStreamingMessage.trim() || response;
          const aiMessage = {
            id: streamingMessageId.current,
            text: finalMessageText,
            sender: 'ai',
            timestamp: new Date(),
          };
          setMessages(prevMessages => {
            const finalMessages = [...prevMessages, aiMessage];
            setGroups(prevGroups => {
              const finalGroups = prevGroups.map(g =>
                g.id === currentGroupId
                  ? {
                      ...g,
                      chats: g.chats.map(c =>
                        c.id === currentChatId
                          ? {
                              ...c,
                              messages: finalMessages,
                              lastOpened: new Date(),
                            }
                          : c,
                      ),
                    }
                  : g,
              );
              console.log(
                '📩 sendMessage: Final groups after AI response:',
                JSON.stringify(finalGroups, null, 2),
              );
              saveGroups(finalGroups);
              debugAsyncStorage();
              return finalGroups;
            });
            setCurrentStreamingMessage('');
            return finalMessages;
          });
        })
        .catch(error => {
          console.error('❌ sendMessage: Error generating response:', error);
          Alert.alert('Hata', 'Yanıt oluşturulurken bir hata oluştu.');
          setIsStreaming(false);
          setCurrentStreamingMessage('');
        });
      return newMessages;
    });
  };

  const onTimerEnd = () => {
    setSeconds(420);
    console.log('Reklam gösteriliyor...');
    showRewardedAd();
  };

  const formatTime = () => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  useEffect(() => {
    const intervalId = setInterval(() => {
      setSeconds(prev => (prev <= 1 ? (onTimerEnd(), 0) : prev - 1));
    }, 1000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    loadModel().then(() => {
      loadVocab();
      testAsyncStorage();
      checkStorageSize();
    });
    return () => {
      if (sessionRef.current) sessionRef.current.release?.();
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    console.log('Route params:', route.params);
    if (route.params?.groupId && route.params?.chatId) {
      console.log('🔄 Route params changed, reloading chat...');
      loadGroups();
    } else {
      loadGroups();
    }
  }, [route.params?.groupId, route.params?.chatId]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('📱 Chat screen focused, reloading...');
      if (route.params?.groupId && route.params?.chatId) {
        loadGroups();
      }
    });
    return unsubscribe;
  }, [navigation, route.params?.groupId, route.params?.chatId]);

  useEffect(() => {
    if (currentGroupId && currentChatId) {
      console.log('📌 useEffect: Updating navigation params', {
        groupId: currentGroupId,
        chatId: currentChatId,
      });
      navigation.setParams({ groupId: currentGroupId, chatId: currentChatId });
    }
  }, [currentGroupId, currentChatId, navigation]);

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
    streamingMessageId,
    saveTimeoutRef,
    loadModel,
    startNewGroup,
    startNewChat,
    createNewChatIfNeeded,
    updateGroupName,
    sendMessage,
    formatTime,
  };
};
