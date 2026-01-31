// Components/Chat/ChatInput.js
import React from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
} from 'react-native';

const ChatInput = ({
  inputText,
  setInputText,
  modelLoaded,
  isLoading,
  isStreaming,
  sendMessage,
}) => {
  // Debug log
  const handleSend = () => {
    console.log('🔵 Send button pressed!', {
      inputText,
      inputLength: inputText?.length,
      modelLoaded,
      isLoading,
      isStreaming,
      sendMessageType: typeof sendMessage,
    });

    if (sendMessage && typeof sendMessage === 'function') {
      sendMessage();
    } else {
      console.error('❌ sendMessage is not a function!');
    }
  };

  return (
    <View style={styles.inputContainer}>
      <TextInput
        style={styles.input}
        value={inputText}
        onChangeText={setInputText}
        placeholder="Write your message..."
        placeholderTextColor="#999"
        multiline
        editable={modelLoaded && !isLoading && !isStreaming}
      />

      <TouchableOpacity
        style={[
          styles.sendButton,
          (!modelLoaded || isLoading || isStreaming || !inputText?.trim()) &&
            styles.sendButtonDisabled,
        ]}
        onPress={handleSend}
        disabled={
          !modelLoaded || isLoading || isStreaming || !inputText?.trim()
        }
      >
        <Text style={styles.sendButtonText}>Send</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ChatInput;
