import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import styles from './styles';

const StreamingMessage = ({
  isStreaming,
  currentStreamingMessage,
  streamingComplete,
}) => {
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

export default StreamingMessage;
