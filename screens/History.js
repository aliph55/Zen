import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';

const { width } = Dimensions.get('window');

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
            messageCount: chat.messages.length,
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
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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

  const renderItem = ({ item, index }) => (
    <TouchableOpacity
      style={styles.chatCard}
      activeOpacity={0.7}
      onPress={() =>
        navigation.navigate('Chat', {
          groupId: item.groupId,
          chatId: item.id,
        })
      }
    >
      <LinearGradient
        colors={
          index % 3 === 0
            ? ['rgba(139, 92, 246, 0.15)', 'rgba(139, 92, 246, 0.05)']
            : index % 3 === 1
            ? ['rgba(236, 72, 153, 0.15)', 'rgba(236, 72, 153, 0.05)']
            : ['rgba(59, 130, 246, 0.15)', 'rgba(59, 130, 246, 0.05)']
        }
        style={styles.chatGradient}
      >
        <View style={styles.chatIconWrapper}>
          <LinearGradient
            colors={
              index % 3 === 0
                ? ['#8B5CF6', '#7C3AED']
                : index % 3 === 1
                ? ['#EC4899', '#DB2777']
                : ['#3B82F6', '#2563EB']
            }
            style={styles.chatIcon}
          >
            <Icon name="message-circle" size={20} color="#fff" />
          </LinearGradient>
        </View>

        <View style={styles.chatContent}>
          <Text style={styles.chatTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.chatPreview} numberOfLines={1}>
            {item.preview}
          </Text>
          <View style={styles.chatMeta}>
            <Text style={styles.chatTime}>{item.time}</Text>
            <View style={styles.messageBadge}>
              <Icon name="message-square" size={10} color="#64748B" />
              <Text style={styles.messageCount}>{item.messageCount}</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteChat(item.id, item.groupId)}
        >
          <Icon name="trash-2" size={18} color="#EF4444" />
        </TouchableOpacity>
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <LinearGradient
      colors={['#0F172A', '#1E293B', '#0F172A']}
      style={styles.container}
    >
      {/* Decorative Blobs */}
      <View style={styles.blob1} />
      <View style={styles.blob2} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>History</Text>
          <Text style={styles.headerSubtitle}>
            {chats.length} {chats.length === 1 ? 'chat' : 'chats'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.newChatButton}
          onPress={startNewChat}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={['#8B5CF6', '#7C3AED']}
            style={styles.newChatGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Icon name="plus" size={20} color="#fff" />
            <Text style={styles.newChatText}>New</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Chat List */}
      <FlatList
        data={chats}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.emptyIconWrapper}>
              <LinearGradient
                colors={['rgba(139, 92, 246, 0.2)', 'rgba(139, 92, 246, 0.05)']}
                style={styles.emptyIconGradient}
              >
                <Icon name="message-square" size={64} color="#8B5CF6" />
              </LinearGradient>
            </View>

            <Text style={styles.emptyTitle}>No conversations yet</Text>
            <Text style={styles.emptySubtitle}>
              Start your first chat with ZenAI
            </Text>

            <TouchableOpacity
              style={styles.emptyButton}
              onPress={startNewChat}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#8B5CF6', '#7C3AED']}
                style={styles.emptyButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Icon name="plus-circle" size={22} color="#fff" />
                <Text style={styles.emptyButtonText}>Start Chatting</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        }
      />
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Decorative Blobs
  blob1: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    top: -100,
    right: -80,
  },
  blob2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(236, 72, 153, 0.08)',
    bottom: 100,
    left: -60,
  },

  // Header
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 24,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -1,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748B',
    letterSpacing: 0.3,
  },
  newChatButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  newChatGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  newChatText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },

  // List
  listContent: {
    padding: 20,
    paddingTop: 8,
  },

  // Chat Card
  chatCard: {
    marginBottom: 12,
    borderRadius: 20,
    overflow: 'hidden',
  },
  chatGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
  },
  chatIconWrapper: {
    marginRight: 14,
  },
  chatIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  chatContent: {
    flex: 1,
    marginRight: 12,
  },
  chatTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  chatPreview: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 8,
    lineHeight: 18,
  },
  chatMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  chatTime: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  messageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(100, 116, 139, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  messageCount: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
  },
  deleteButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },

  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyIconWrapper: {
    marginBottom: 32,
    borderRadius: 80,
    overflow: 'hidden',
  },
  emptyIconGradient: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
  },
  emptyTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
    fontWeight: '500',
  },
  emptyButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  emptyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    gap: 12,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});

export default History;
