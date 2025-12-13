import React from 'react';
import { View, Text } from 'react-native';
import styles from './styles';

const MessageBubble = ({ message }) => (
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
    <Text style={styles.timestamp}>
      {message.timestamp.toLocaleTimeString('tr-TR')}
    </Text>
  </View>
);

export default MessageBubble;
