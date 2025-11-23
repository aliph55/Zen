import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Feather';

const History = ({ navigation }) => {
  const [chats, setChats] = useState([]);

  const loadChats = async () => {
    try {
      const savedGroups = await AsyncStorage.getItem('groups');
      if (!savedGroups) {
        setChats([]);
        return;
      }

      const parsedGroups = JSON.parse(savedGroups);
      const allChats = parsedGroups
        .flatMap(group =>
          group.chats.map(chat => ({
            id: chat.id,
            title: chat.title || 'New Chat',
            preview: chat.messages[0]?.text?.slice(0, 60) || 'No messages yet',
            time: formatDate(chat.lastOpened),
            groupId: group.id,
          })),
        )
        .sort((a, b) => new Date(b.time) - new Date(a.time));

      setChats(allChats);
    } catch (error) {
      console.error('Failed to load history:', error);
    }
  };

  const formatDate = isoString => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US');
  };

  const deleteChat = (chatId, groupId) => {
    Alert.alert('Delete Chat', 'This chat will be permanently deleted.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const saved = await AsyncStorage.getItem('groups');
            if (!saved) return;

            let groups = JSON.parse(saved);
            groups = groups.map(g =>
              g.id === groupId
                ? { ...g, chats: g.chats.filter(c => c.id !== chatId) }
                : g,
            );

            // Clean empty groups
            groups = groups.filter(g => g.chats.length > 0);

            await AsyncStorage.setItem('groups', JSON.stringify(groups));
            setChats(prev => prev.filter(c => c.id !== chatId));
          } catch (err) {
            Alert.alert('Error', 'Chat could not be deleted.');
          }
        },
      },
    ]);
  };

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
      const existing = await AsyncStorage.getItem('groups');
      const groups = existing ? JSON.parse(existing) : [];
      await AsyncStorage.setItem(
        'groups',
        JSON.stringify([...groups, newGroup]),
      );
      loadChats();
      navigation.navigate('Chat', { groupId: newGroupId, chatId: newChatId });
    } catch (err) {
      console.error('Failed to create new chat:', err);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadChats);
    loadChats();
    return unsubscribe;
  }, [navigation]);

  const renderItem = ({ item }) => (
    <View style={styles.chatCard}>
      <TouchableOpacity
        style={styles.deleteBtn}
        onPress={() => deleteChat(item.id, item.groupId)}
      >
        <View style={styles.deleteBtnCircle}>
          <Icon name="trash-2" size={18} color="#ef4444" />
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.chatTouchable}
        onPress={() =>
          navigation.navigate('Chat', {
            groupId: item.groupId,
            chatId: item.id,
          })
        }
      >
        <View style={styles.chatIconContainer}>
          <View style={styles.chatIcon}>
            <Icon name="message-circle" size={20} color="#6366f1" />
          </View>
        </View>

        <View style={styles.chatContent}>
          <Text style={styles.title} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.preview} numberOfLines={1}>
            {item.preview}
          </Text>
          <Text style={styles.time}>{item.time}</Text>
        </View>

        <View style={styles.chevronContainer}>
          <Icon name="chevron-right" size={20} color="#cbd5e1" />
        </View>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>History</Text>
          <Text style={styles.headerSubtitle}>
            {chats.length}{' '}
            {chats.length === 1 ? 'conversation' : 'conversations'}
          </Text>
        </View>
        <TouchableOpacity onPress={startNewChat} style={styles.newChatBtn}>
          <Icon name="plus" size={22} color="#FFFFFF" />
          <Text style={styles.newChatText}>New</Text>
        </TouchableOpacity>
      </View>

      {/* Chat List */}
      <FlatList
        data={chats}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Icon name="message-square" size={64} color="#cbd5e1" />
            </View>
            <Text style={styles.emptyTitle}>No chats yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap the "New" button to start your first conversation
            </Text>
            <TouchableOpacity style={styles.emptyButton} onPress={startNewChat}>
              <Icon name="plus" size={20} color="#FFFFFF" />
              <Text style={styles.emptyButtonText}>Start Chatting</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fd',
  },
  header: {
    backgroundColor: '#6366f1',
    paddingTop: Platform.OS === 'ios' ? 40 : 20,
    paddingBottom: 24,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 0.3,
  },
  newChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  newChatText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  listContainer: {
    padding: 20,
    paddingTop: 16,
  },
  chatCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingLeft: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  deleteBtn: {
    padding: 4,
    marginRight: 4,
  },
  deleteBtnCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatTouchable: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 4,
  },
  chatIconContainer: {
    marginRight: 12,
  },
  chatIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#eef2ff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  chatContent: {
    flex: 1,
    paddingVertical: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  preview: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 6,
    lineHeight: 18,
  },
  time: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  chevronContainer: {
    marginLeft: 8,
  },

  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 120,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    fontWeight: '500',
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 24,
    gap: 10,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

export default History;
