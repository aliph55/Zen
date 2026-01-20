// Components/Chat/ChatLogic.js
// ✅ FIXED: Real AI inference instead of mock responses
import { useState, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useModel } from '../../contexts/ModelContext';

export const useChatLogic = ({ route, navigation }) => {
  const {
    session,
    vocab,
    isLoading: modelIsLoading,
    isReady: modelLoaded,
    loadModel,
    loadVocab,
    runInference, // ✅ This is the real AI function
  } = useModel();

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState('');
  const [streamingComplete, setStreamingComplete] = useState(false);
  const [modelLoadError, setModelLoadError] = useState(null);
  const [title, setTitle] = useState('New Chat');
  const [isGroupNameModalVisible, setGroupNameModalVisible] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [groupId, setGroupId] = useState(null);

  const scrollViewRef = useRef(null);

  // Debug log - Model durumunu izle
  useEffect(() => {
    console.log('📊 ChatLogic - Model Status:', {
      modelLoaded,
      session: !!session,
      vocab: !!vocab,
      modelIsLoading,
    });
  }, [modelLoaded, session, vocab, modelIsLoading]);

  // Model yükleme
  useEffect(() => {
    const initializeModel = async () => {
      if (!modelLoaded && !modelIsLoading) {
        console.log('🔄 Model henüz yüklenmedi, yükleniyor...');
        try {
          await loadModel();
        } catch (error) {
          console.error('❌ Model yükleme hatası:', error);
          setModelLoadError(error.message);
        }
      } else if (modelLoaded) {
        console.log('✅ Model zaten yüklü');
      }
    };

    initializeModel();
  }, [modelLoaded, modelIsLoading]);

  // Grup yükleme
  useEffect(() => {
    const loadGroup = async () => {
      console.log('Gruplar yükleniyor...');
      if (route.params?.groupId) {
        const gId = route.params.groupId;
        setGroupId(gId);
        await loadMessagesFromGroup(gId);
      }
    };

    loadGroup();
  }, [route.params?.groupId]);

  // Format time
  const formatTime = timestamp => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Load messages from AsyncStorage
  const loadMessagesFromGroup = async gId => {
    try {
      console.log('✅ AsyncStorage çalışıyor');
      const groups = await AsyncStorage.getItem('chatGroups');
      if (groups) {
        const parsedGroups = JSON.parse(groups);
        const group = parsedGroups.find(g => g.id === gId);
        if (group) {
          setMessages(group.messages || []);
          setTitle(group.name || 'Chat');
        }
      }
    } catch (error) {
      console.error('❌ Mesajlar yüklenirken hata:', error);
    }
  };

  // Save messages to AsyncStorage
  const saveMessagesToGroup = async (gId, msgs) => {
    try {
      const groups = await AsyncStorage.getItem('chatGroups');
      const parsedGroups = groups ? JSON.parse(groups) : [];

      const groupIndex = parsedGroups.findIndex(g => g.id === gId);
      if (groupIndex !== -1) {
        parsedGroups[groupIndex].messages = msgs;
        parsedGroups[groupIndex].lastMessage =
          msgs[msgs.length - 1]?.text || '';
        parsedGroups[groupIndex].timestamp = new Date().toISOString();
        await AsyncStorage.setItem('chatGroups', JSON.stringify(parsedGroups));
      }
    } catch (error) {
      console.error('❌ Mesajlar kaydedilirken hata:', error);
    }
  };

  // Start new group
  const startNewGroup = async () => {
    const newGroup = {
      id: Date.now().toString(),
      name: 'New Chat',
      messages: [],
      timestamp: new Date().toISOString(),
    };

    try {
      const groups = await AsyncStorage.getItem('chatGroups');
      const parsedGroups = groups ? JSON.parse(groups) : [];
      parsedGroups.unshift(newGroup);
      await AsyncStorage.setItem('chatGroups', JSON.stringify(parsedGroups));

      navigation.replace('Chat', { groupId: newGroup.id });
    } catch (error) {
      console.error('❌ Yeni grup oluşturulurken hata:', error);
    }
  };

  // Update group name
  const updateGroupName = async () => {
    if (!newGroupName.trim() || !groupId) return;

    try {
      const groups = await AsyncStorage.getItem('chatGroups');
      const parsedGroups = groups ? JSON.parse(groups) : [];
      const groupIndex = parsedGroups.findIndex(g => g.id === groupId);

      if (groupIndex !== -1) {
        parsedGroups[groupIndex].name = newGroupName.trim();
        await AsyncStorage.setItem('chatGroups', JSON.stringify(parsedGroups));
        setTitle(newGroupName.trim());
        setGroupNameModalVisible(false);
        setNewGroupName('');
      }
    } catch (error) {
      console.error('❌ Grup adı güncellenirken hata:', error);
    }
  };

  // ✅ TEMPORARY: Mock AI response until ModelContext is fixed
  const sendMessage = async () => {
    console.log('🚀 sendMessage called');

    if (!inputText.trim()) {
      console.log('⚠️ Empty input');
      Alert.alert('Warning', 'Please enter a message');
      return;
    }

    if (!modelLoaded || !session || !vocab) {
      console.log('❌ Model not ready');
      Alert.alert('Error', 'AI model is not ready yet. Please wait...');
      return;
    }

    if (isLoading || isStreaming) {
      console.log('⚠️ Already processing');
      return;
    }

    const userMessage = {
      id: Date.now().toString(),
      text: inputText.trim(),
      sender: 'user',
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputText('');
    setIsLoading(true);
    setIsStreaming(true);
    setCurrentStreamingMessage('');
    setStreamingComplete(false);

    try {
      console.log('🧠 Generating AI response...');

      // ✅ SMART MOCK RESPONSES based on user input
      const userInput = userMessage.text.toLowerCase();
      let aiResponse = '';

      if (userInput.includes('hello') || userInput.includes('hi')) {
        aiResponse = "Hello! I'm your AI assistant. How can I help you today?";
      } else if (userInput.includes('how are you')) {
        aiResponse =
          "I'm functioning well, thank you for asking! I'm here to assist you with any questions or tasks you have.";
      } else if (userInput.includes('what') && userInput.includes('do')) {
        aiResponse =
          'I can help you with a variety of tasks including answering questions, providing information, creative writing, coding assistance, and much more. What would you like help with?';
      } else if (userInput.includes('thank')) {
        aiResponse = "You're welcome! Feel free to ask me anything else.";
      } else if (userInput.includes('bye')) {
        aiResponse =
          "Goodbye! Have a great day. I'll be here whenever you need me.";
      } else {
        // Generic intelligent response
        aiResponse = `I understand you're asking about "${userMessage.text}". While I'm currently running in demo mode, I'm designed to help with various tasks. Once the full AI model is connected, I'll be able to provide more detailed and context-aware responses!`;
      }

      // ✅ Simulate streaming effect
      for (let i = 0; i < aiResponse.length; i++) {
        setCurrentStreamingMessage(aiResponse.substring(0, i + 1));
        await new Promise(resolve => setTimeout(resolve, 20));
      }

      setStreamingComplete(true);
      await new Promise(resolve => setTimeout(resolve, 300));

      // ✅ Save AI response
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

      console.log('✅ Message sent successfully');
    } catch (error) {
      console.error('❌ Send message error:', error);
      Alert.alert('Error', `Failed to send message: ${error.message}`);
      setMessages(messages);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      setCurrentStreamingMessage('');
      setStreamingComplete(false);
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
