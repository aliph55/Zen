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
      <Text style={styles.headerTitle}>{title || 'Sohbet'}</Text>
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>{formatTime()}</Text>
        {modelLoaded ? (
          <View style={styles.statusIndicator}>
            <View style={[styles.statusDot, styles.statusDotActive]} />
            <Text style={styles.statusText}>Model Hazır</Text>
          </View>
        ) : isLoading ? (
          <View style={styles.statusIndicator}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.statusText}>Model Yükleniyor...</Text>
          </View>
        ) : modelLoadError ? (
          <View style={styles.statusIndicator}>
            <View style={[styles.statusDot, styles.statusDotError]} />
            <Text style={styles.statusText}>Hata</Text>
          </View>
        ) : null}
        <TouchableOpacity onPress={startNewGroup}>
          <Text style={styles.headerButton}>Yeni Grup</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ChatHeader;
