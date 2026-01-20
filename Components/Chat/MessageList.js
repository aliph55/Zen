import React, { useEffect } from 'react';
import { ScrollView, View, Text } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import MessageBubble from './MessageBubble';
import StreamingMessage from './StreamingMessage';
import styles from './styles';

const MessageList = ({
  messages,
  modelLoaded,
  isStreaming,
  scrollViewRef,
  currentStreamingMessage,
  streamingComplete,
  formatTime,
}) => {
  // Auto scroll to bottom
  useEffect(() => {
    if (scrollViewRef?.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, currentStreamingMessage, isStreaming]);

  console.log('📊 MessageList render:', {
    messageCount: messages.length,
    isStreaming,
    hasStreamingMessage: !!currentStreamingMessage,
  });

  return (
    <ScrollView
      ref={scrollViewRef}
      style={styles.messagesContainer}
      contentContainerStyle={styles.messagesContent}
      showsVerticalScrollIndicator={false}
    >
      {messages.length === 0 && modelLoaded && !isStreaming && (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Icon name="message-circle" size={64} color="#334155" />
          </View>
          <Text style={styles.emptyText}>
            Start a conversation{'\n'}Your AI assistant is ready
          </Text>
          <Text style={styles.emptySubtext}>
            Ask me anything, I'm here to help!
          </Text>
        </View>
      )}

      {messages.map((message, index) => {
        console.log(`📝 Rendering message ${index}:`, {
          id: message.id,
          sender: message.sender,
          textLength: message.text?.length,
        });
        return (
          <MessageBubble
            key={message.id}
            message={message}
            formatTime={formatTime}
          />
        );
      })}

      <StreamingMessage
        isStreaming={isStreaming}
        currentStreamingMessage={currentStreamingMessage}
        streamingComplete={streamingComplete}
      />
    </ScrollView>
  );
};

export default MessageList;
