import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Feather';

const History = ({ navigation }) => {
  const [chats, setChats] = useState([]);

  // Load all chats from AsyncStorage
  const loadChats = async () => {
    try {
      const savedGroups = await AsyncStorage.getItem('groups');
      console.log(
        'History: Loading chats from AsyncStorage at',
        new Date().toLocaleString(),
        savedGroups ? 'Data found' : 'No data',
      );
      if (savedGroups) {
        const parsedGroups = JSON.parse(savedGroups);
        const allChats = parsedGroups
          .flatMap(group =>
            group.chats.map(chat => ({
              id: chat.id,
              title: chat.title,
              preview: chat.messages[0]?.text.slice(0, 50) || 'Mesaj yok...',
              time: new Date(chat.lastOpened).toLocaleString('tr-TR'),
              groupId: group.id,
            })),
          )
          .sort((a, b) => new Date(b.time) - new Date(a.time)); // En son açılanlar önce
        setChats(allChats);
        console.log('History: Chats loaded, count:', allChats.length);
      } else {
        setChats([]);
        console.log('History: No chats found, resetting to empty');
      }
    } catch (error) {
      console.error('History: Geçmiş yükleme hatası:', error);
    }
  };

  // Delete a chat
  const deleteChat = (chatId, groupId) => {
    Alert.alert(
      'Sohbeti Sil',
      'Bu sohbeti silmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              const savedGroups = await AsyncStorage.getItem('groups');
              if (savedGroups) {
                const parsedGroups = JSON.parse(savedGroups);
                const updatedGroups = parsedGroups.map(group =>
                  group.id === groupId
                    ? {
                        ...group,
                        chats: group.chats.filter(c => c.id !== chatId),
                      }
                    : group,
                );
                setChats(prevChats =>
                  prevChats.filter(chat => chat.id !== chatId),
                );
                await AsyncStorage.setItem(
                  'groups',
                  JSON.stringify(updatedGroups),
                );
                console.log('History: Chat deleted, updating state');
                // Remove group if it has no chats
                const finalGroups = updatedGroups.filter(
                  group => group.chats.length > 0,
                );
                if (finalGroups.length !== updatedGroups.length) {
                  await AsyncStorage.setItem(
                    'groups',
                    JSON.stringify(finalGroups),
                  );
                  console.log('History: Empty group removed');
                }
              }
            } catch (error) {
              console.error('History: Sohbet silme hatası:', error);
              Alert.alert('Hata', 'Sohbet silinirken bir hata oluştu.');
            }
          },
        },
      ],
    );
  };

  // Start new chat
  const startNewChat = async () => {
    const newGroupId = Date.now().toString();
    const newChatId = (Date.now() + 1).toString();
    const newGroup = {
      id: newGroupId,
      name: 'General',
      chats: [
        {
          id: newChatId,
          title: 'New Chat',
          startDate: new Date().toISOString(),
          lastOpened: new Date().toISOString(),
          messages: [],
        },
      ],
    };
    try {
      const savedGroups = await AsyncStorage.getItem('groups');
      const groups = savedGroups ? JSON.parse(savedGroups) : [];
      const updatedGroups = [...groups, newGroup];
      await AsyncStorage.setItem('groups', JSON.stringify(updatedGroups));
      console.log(
        'History: New chat added to AsyncStorage at',
        new Date().toLocaleString(),
      );

      // Force reload to ensure latest data
      await loadChats();
      navigation.navigate('Chat', { groupId: newGroupId, chatId: newChatId });
    } catch (error) {
      console.error('History: Yeni sohbet oluşturma hatası:', error);
    }
  };

  // Refresh chats when returning to History
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('History: Screen focused at', new Date().toLocaleString());
      loadChats();
    });
    loadChats(); // Initial load
    return unsubscribe;
  }, [navigation]);

  const renderChat = ({ item }) => (
    <View style={styles.chatItem}>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => deleteChat(item.id, item.groupId)}
      >
        <Icon name="trash-2" size={20} color="#F44336" />
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.chatContent}
        onPress={() =>
          navigation.navigate('Chat', {
            groupId: item.groupId,
            chatId: item.id,
          })
        }
      >
        <View style={styles.chatCardContent}>
          <View style={styles.chatCardLeft}>
            <Text style={styles.chatTitle}>{item.title}</Text>
            <Text style={styles.chatPreview} numberOfLines={1}>
              {item.preview}
            </Text>
          </View>
          <View style={styles.chatCardRight}>
            <Text style={styles.chatTime}>{item.time}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Geçmiş</Text>
        <TouchableOpacity onPress={startNewChat} style={styles.newChatButton}>
          <Text style={styles.newChatButtonText}>Yeni Sohbet</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={chats}
        keyExtractor={item => item.id}
        renderItem={renderChat}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Geçmişte sohbet bulunmuyor.</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    backgroundColor: '#007AFF',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: 'white' },
  newChatButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
  },
  newChatButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  deleteButton: { marginRight: 10, padding: 5 },
  chatContent: { flex: 1 },
  chatCardContent: { flexDirection: 'row', justifyContent: 'space-between' },
  chatCardLeft: { flex: 1, marginRight: 12 },
  chatTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 4,
  },
  chatPreview: { fontSize: 14, color: '#6B7280' },
  chatCardRight: { justifyContent: 'flex-start' },
  chatTime: { fontSize: 12, color: '#9CA3AF' },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 50,
  },
  emptyText: { fontSize: 16, color: '#666', textAlign: 'center' },
});

export default History;
