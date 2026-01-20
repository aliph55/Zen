import React from 'react';
import { View, TextInput, TouchableOpacity, Text } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import styles from './styles';

const ChatInput = ({
  inputText,
  setInputText,
  modelLoaded,
  isLoading,
  isStreaming,
  sendMessage,
}) => {
  const handleSend = () => {
    if (sendMessage && typeof sendMessage === 'function') {
      sendMessage();
    } else {
      console.error('❌ sendMessage is not a function!');
    }
  };

  const canSend =
    modelLoaded && !isLoading && !isStreaming && inputText?.trim();

  return (
    <View style={styles.inputContainer}>
      <TextInput
        style={styles.textInput}
        value={inputText}
        onChangeText={setInputText}
        placeholder="Type your message..."
        placeholderTextColor="#64748B"
        multiline
        editable={modelLoaded && !isLoading && !isStreaming}
      />

      <TouchableOpacity
        style={[styles.sendButton, !canSend && styles.sendButtonDisabled]}
        onPress={handleSend}
        disabled={!canSend}
        activeOpacity={0.8}
      >
        <Icon name="send" size={20} color={canSend ? '#fff' : '#64748B'} />
      </TouchableOpacity>
    </View>
  );
};

export default ChatInput;
