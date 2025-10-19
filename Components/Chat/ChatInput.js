import React from 'react';
import { View, TextInput, TouchableOpacity, Text, Alert } from 'react-native';
import styles from './styles';

const ChatInput = ({
  inputText,
  setInputText,
  modelLoaded,
  isLoading,
  isStreaming,
  sendMessage,
}) => {
  return (
    <View style={styles.inputContainer}>
      <TextInput
        style={styles.textInput}
        value={inputText}
        onChangeText={setInputText}
        placeholder="Mesajınızı yazın..."
        placeholderTextColor="#999"
        multiline
        maxHeight={100}
        editable={modelLoaded && !isLoading && !isStreaming}
      />
      <TouchableOpacity
        style={[
          styles.sendButton,
          (!inputText.trim() || !modelLoaded || isLoading || isStreaming) &&
            styles.sendButtonDisabled,
        ]}
        onPress={sendMessage}
        disabled={!inputText.trim() || !modelLoaded || isLoading || isStreaming}
      >
        <Text style={styles.sendButtonText}>
          {isStreaming ? 'Üretiyor...' : 'Gönder'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default ChatInput;
