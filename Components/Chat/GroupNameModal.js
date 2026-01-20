import React from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import styles from './styles';

const GroupNameModal = ({
  isGroupNameModalVisible,
  setGroupNameModalVisible,
  newGroupName,
  setNewGroupName,
  updateGroupName,
}) => {
  return (
    <Modal
      visible={isGroupNameModalVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setGroupNameModalVisible(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Icon name="edit-2" size={24} color="#6366F1" />
            <Text style={styles.modalTitle}>Rename Chat</Text>
          </View>

          <TextInput
            style={styles.modalInput}
            placeholder="Enter chat name..."
            placeholderTextColor="#64748B"
            value={newGroupName}
            onChangeText={setNewGroupName}
            autoFocus
          />

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => {
                setGroupNameModalVisible(false);
                setNewGroupName('');
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonSave]}
              onPress={updateGroupName}
              activeOpacity={0.8}
            >
              <Text style={styles.modalButtonSaveText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default GroupNameModal;
