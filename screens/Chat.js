import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  View,
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from 'react-native';
import { useChatLogic } from '../Components/Chat/ChatLogic';

import MessageList from '../Components/Chat/MessageList';
import ChatInput from '../Components/Chat/ChatInput';
import GroupNameModal from '../Components/Chat/GroupNameModal';
import styles from '../Components/Chat/styles';

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

  // Navigation header'ı yapılandır
  React.useLayoutEffect(() => {
    const timeString = formatTime();
    const timeMatch = timeString.match(/(\d+):(\d+)/);
    let remainingSeconds = 0;

    if (timeMatch) {
      const minutes = parseInt(timeMatch[1]);
      const seconds = parseInt(timeMatch[2]);
      remainingSeconds = minutes * 60 + seconds;
    }

    const showAdWarning = remainingSeconds > 0 && remainingSeconds <= 30;

    navigation.setOptions({
      headerTitle: () => (
        <View style={styles.navigationHeaderTitle}>
          <Text style={styles.navigationTitle}>{title || 'Chat'}</Text>
          <Text style={styles.navigationTime}>{timeString}</Text>
          {showAdWarning && (
            <View style={styles.navigationAdWarning}>
              <Text style={styles.navigationAdWarningText}>
                Ad in {remainingSeconds}s
              </Text>
            </View>
          )}
        </View>
      ),
      headerRight: () => (
        <View style={styles.navigationHeaderRight}>
          {modelLoaded ? (
            <View style={styles.navigationStatusBadge}>
              <View
                style={[
                  styles.navigationStatusDot,
                  styles.navigationStatusDotActive,
                ]}
              />
              <Text style={styles.navigationStatusText}>Ready</Text>
            </View>
          ) : isLoading ? (
            <View style={styles.navigationStatusBadge}>
              <ActivityIndicator size="small" color="#10b981" />
              <Text style={styles.navigationStatusText}>Loading...</Text>
            </View>
          ) : modelLoadError ? (
            <View
              style={[
                styles.navigationStatusBadge,
                styles.navigationStatusBadgeError,
              ]}
            >
              <View
                style={[
                  styles.navigationStatusDot,
                  styles.navigationStatusDotError,
                ]}
              />
              <Text style={styles.navigationStatusText}>Error</Text>
            </View>
          ) : null}
          <TouchableOpacity
            style={styles.navigationNewButton}
            onPress={startNewGroup}
          >
            <Text style={styles.navigationNewButtonText}>+ New</Text>
          </TouchableOpacity>
        </View>
      ),
    });
  }, [
    navigation,
    title,
    formatTime,
    modelLoaded,
    isLoading,
    modelLoadError,
    startNewGroup,
  ]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {modelLoadError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Hata: {modelLoadError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadModel}>
            <Text style={styles.retryButtonText}>Tekrar Dene</Text>
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

export default Chat;
