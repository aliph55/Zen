import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  View,
  TouchableOpacity,
  Text,
} from 'react-native';
import { useChatLogic } from '../Components/Chat/ChatLogic';

import ChatHeader from '../Components/Chat/ChatHeader';
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

  return (
    <KeyboardAvoidingView
      style={styles.container}
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
