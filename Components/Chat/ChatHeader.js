import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import styles from './styles';

const ChatHeader = ({
  title,
  formatTime,
  modelLoaded,
  isLoading,
  modelLoadError,
  startNewGroup,
}) => {
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>

        <View style={styles.statusContainer}>
          <View style={styles.statusIndicator}>
            <View
              style={[
                styles.statusDot,
                modelLoaded && !modelLoadError
                  ? styles.statusDotActive
                  : styles.statusDotError,
              ]}
            />
            <Text style={styles.statusText}>
              {modelLoaded ? 'Ready' : isLoading ? 'Loading...' : 'Error'}
            </Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={styles.newChatButton}
        onPress={startNewGroup}
        activeOpacity={0.8}
      >
        <Icon name="plus-circle" size={24} color="#6366F1" />
      </TouchableOpacity>
    </View>
  );
};

export default ChatHeader;
