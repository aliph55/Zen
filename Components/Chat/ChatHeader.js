import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
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
      <Text style={styles.headerTitle}>{title || ''}</Text>
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>{formatTime()}</Text>
        {modelLoaded ? (
          <View style={styles.statusIndicator}>
            <View style={[styles.statusDot, styles.statusDotActive]} />
            <Text style={styles.statusText}>Model Ready</Text>
          </View>
        ) : isLoading ? (
          <View style={styles.statusIndicator}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.statusText}>Loading Model...</Text>
          </View>
        ) : modelLoadError ? (
          <View style={styles.statusIndicator}>
            <View style={[styles.statusDot, styles.statusDotError]} />
            <Text style={styles.statusText}>Error</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
};

export default ChatHeader;
