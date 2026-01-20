import React from 'react';
import { View, Text } from 'react-native';
import styles from './styles';

const MessageBubble = ({ message, formatTime }) => (
  <View
    style={[
      styles.messageBubble,
      message.sender === 'user' ? styles.userBubble : styles.aiBubble,
    ]}
  >
    <Text
      style={[styles.messageText, message.sender === 'user' && styles.userText]}
    >
      {message.text}
    </Text>
    {/* ✅ FIX: Use formatTime function instead of raw object */}
    <Text style={styles.timestamp}>
      {formatTime
        ? formatTime(message.timestamp)
        : new Date(message.timestamp).toLocaleTimeString()}
    </Text>
  </View>
);

export default MessageBubble;
