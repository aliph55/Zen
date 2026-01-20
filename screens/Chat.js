// Chat.js with Ad Timer
import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
} from 'react-native';
import { useChatLogic } from '../Components/Chat/ChatLogic';
import { useAds } from '../contexts/adsContext';
import Icon from 'react-native-vector-icons/Feather';

import ChatHeader from '../Components/Chat/ChatHeader';
import MessageList from '../Components/Chat/MessageList';
import ChatInput from '../Components/Chat/ChatInput';
import GroupNameModal from '../Components/Chat/GroupNameModal';
import styles from '../Components/Chat/styles';

const AD_INTERVAL = 7 * 60; // 7 minutes in seconds (420 seconds)

const Chat = ({ route, navigation }) => {
  const {
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
  } = useChatLogic({ route, navigation });

  const { showRewardedAd, adsStatus } = useAds();

  // ⏱️ Ad Timer State
  const [timeRemaining, setTimeRemaining] = useState(AD_INTERVAL);
  const [showAdNotification, setShowAdNotification] = useState(false);

  // ⏱️ Timer Effect
  useEffect(() => {
    // Start countdown when component mounts
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // Time's up! Show ad
          handleShowAd();
          return AD_INTERVAL; // Reset timer
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // 📺 Show Ad Function
  const handleShowAd = async () => {
    console.log('⏰ 7 minutes passed, showing rewarded ad...');

    setShowAdNotification(true);

    try {
      const result = await showRewardedAd();

      if (result.watched) {
        console.log('✅ User watched the ad');
        Alert.alert(
          '🎉 Thank You!',
          'Thanks for watching! You can continue using the app.',
          [{ text: 'Continue', onPress: () => setShowAdNotification(false) }],
        );
      } else {
        console.log('⏭️ User skipped the ad');
        setShowAdNotification(false);
      }
    } catch (error) {
      console.error('❌ Ad error:', error);
      setShowAdNotification(false);
    }
  };

  // 🕐 Format Time (MM:SS)
  const formatTimer = seconds => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <KeyboardAvoidingView
      style={chatStyles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ChatHeader
        title={title}
        formatTime={formatTime}
        modelLoaded={modelLoaded}
        isLoading={isLoading}
        modelLoadError={modelLoadError}
        startNewGroup={startNewGroup}
      />

      {/* ⏱️ Ad Timer Badge */}
      <View style={chatStyles.timerContainer}>
        <View style={chatStyles.timerBadge}>
          <Icon name="clock" size={14} color="#94A3B8" />
          <Text style={chatStyles.timerText}>
            Next ad in {formatTimer(timeRemaining)}
          </Text>
        </View>
        {timeRemaining <= 30 && (
          <View style={chatStyles.timerWarning}>
            <Icon name="tv" size={12} color="#F59E0B" />
            <Text style={chatStyles.timerWarningText}>Ad coming soon</Text>
          </View>
        )}
      </View>

      {/* 📺 Ad Notification Overlay */}
      {showAdNotification && (
        <View style={chatStyles.adOverlay}>
          <View style={chatStyles.adNotification}>
            <View style={chatStyles.adIcon}>
              <Icon name="tv" size={32} color="#6366F1" />
            </View>
            <Text style={chatStyles.adTitle}>Time for a quick ad!</Text>
            <Text style={chatStyles.adSubtitle}>
              Watch to continue using ZenAI
            </Text>
          </View>
        </View>
      )}

      {modelLoadError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: {modelLoadError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadModel}>
            <Text style={styles.retryButtonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      )}

      <MessageList
        messages={messages}
        modelLoaded={modelLoaded}
        isStreaming={isStreaming}
        scrollViewRef={scrollViewRef}
        currentStreamingMessage={currentStreamingMessage}
        streamingComplete={streamingComplete}
        formatTime={formatTime}
      />

      <ChatInput
        inputText={inputText}
        setInputText={setInputText}
        modelLoaded={modelLoaded}
        isLoading={isLoading}
        isStreaming={isStreaming}
        sendMessage={sendMessage}
      />

      <GroupNameModal
        isGroupNameModalVisible={isGroupNameModalVisible}
        setGroupNameModalVisible={setGroupNameModalVisible}
        newGroupName={newGroupName}
        setNewGroupName={setNewGroupName}
        updateGroupName={updateGroupName}
      />
    </KeyboardAvoidingView>
  );
};

const chatStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },

  // ⏱️ Timer Styles
  timerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  timerText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  timerWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  timerWarningText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // 📺 Ad Notification Overlay
  adOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  adNotification: {
    backgroundColor: '#1E293B',
    borderRadius: 28,
    padding: 40,
    alignItems: 'center',
    width: '85%',
    maxWidth: 360,
    borderWidth: 1,
    borderColor: '#334155',
  },
  adIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#6366F1',
  },
  adTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  adSubtitle: {
    fontSize: 15,
    color: '#94A3B8',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 22,
  },
});

export default Chat;
