import React, { useState, useEffect } from 'react';
import {
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Feather';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSelector } from 'react-redux';

const Home = ({ navigation }) => {
  const [recentChats, setRecentChats] = useState([]);
  const userInfo = useSelector(state => state.userInfo.user);
  const userName = userInfo?.givenName || 'there';

  const loadRecentChats = async () => {
    try {
      const saved = await AsyncStorage.getItem('groups');
      if (!saved) {
        setRecentChats([]);
        return;
      }
      const groups = JSON.parse(saved);
      const chats = groups
        .flatMap(group =>
          group.chats.map(chat => ({
            id: chat.id,
            title: chat.title || 'New Chat',
            preview: chat.messages[0]?.text?.slice(0, 60) || 'No messages yet',
            time: new Date(chat.lastOpened).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
            date: new Date(chat.lastOpened).toLocaleDateString(),
            groupId: group.id,
          })),
        )
        .sort(
          (a, b) =>
            new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time),
        )
        .slice(0, 6);

      setRecentChats(chats);
    } catch (e) {
      console.error('Error loading chats:', e);
    }
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
      loadRecentChats();
      navigation.navigate('Chat', { groupId: newGroupId, chatId: newChatId });
    } catch (e) {
      console.error('Error creating new chat:', e);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadRecentChats);
    loadRecentChats();
    return unsubscribe;
  }, [navigation]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ZenAi</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero Section */}
        <LinearGradient colors={['#6366F1', '#8B5CF6']} style={styles.heroCard}>
          <Text style={styles.greeting}>Hey {userName} 👋</Text>
          <Text style={styles.subtitle}>
            What would you like to explore today?
          </Text>

          <TouchableOpacity style={styles.primaryButton} onPress={startNewChat}>
            <Icon name="plus" size={22} color="#fff" />
            <Text style={styles.primaryButtonText}>Start a New Chat</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* Recent Chats */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Chats</Text>
            {recentChats.length > 0 && (
              <TouchableOpacity onPress={() => navigation.navigate('History')}>
                <Text style={styles.seeAll}>See all</Text>
              </TouchableOpacity>
            )}
          </View>

          {recentChats.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="message-square" size={48} color="#D1D5DB" />
              <Text style={styles.emptyText}>No chats yet</Text>
              <Text style={styles.emptySubtext}>
                Start a conversation to see it here
              </Text>
            </View>
          ) : (
            recentChats.map(chat => (
              <TouchableOpacity
                key={chat.id}
                style={styles.chatItem}
                activeOpacity={0.7}
                onPress={() =>
                  navigation.navigate('Chat', {
                    groupId: chat.groupId,
                    chatId: chat.id,
                  })
                }
              >
                <View style={styles.chatIcon}>
                  <Icon name="message-circle" size={20} color="#6366F1" />
                </View>
                <View style={styles.chatContent}>
                  <Text style={styles.chatTitle}>{chat.title}</Text>
                  <Text style={styles.chatPreview} numberOfLines={1}>
                    {chat.preview}
                  </Text>
                </View>
                <Text style={styles.chatTime}>{chat.time}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Modern Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItemActive}>
          <Icon name="home" size={24} color="#6366F1" />
          <Text style={styles.navLabelActive}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate('History')}
        >
          <Icon name="clock" size={24} color="#9CA3AF" />
          <Text style={styles.navLabel}>History</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => navigation.navigate('Profile')}
        >
          <Icon name="user" size={24} color="#9CA3AF" />
          <Text style={styles.navLabel}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 24,
  },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#1E293B' },
  scrollContent: { paddingBottom: 100 },
  heroCard: { margin: 20, borderRadius: 24, padding: 28 },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: { fontSize: 16, color: '#E0E7FF', marginBottom: 24 },
  primaryButton: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 10,
  },
  section: { paddingHorizontal: 20 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#1E293B' },
  seeAll: { fontSize: 15, color: '#6366F1', fontWeight: '500' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: {
    fontSize: 18,
    color: '#64748B',
    marginTop: 16,
    fontWeight: '600',
  },
  emptySubtext: { fontSize: 14, color: '#94A3B8', marginTop: 8 },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  chatIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  chatContent: { flex: 1 },
  chatTitle: { fontSize: 16, fontWeight: '600', color: '#1E293B' },
  chatPreview: { fontSize: 14, color: '#64748B', marginTop: 4 },
  chatTime: { fontSize: 12, color: '#94A3B8' },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  navItem: { flex: 1, alignItems: 'center' },
  navItemActive: { flex: 1, alignItems: 'center' },
  navLabel: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
  navLabelActive: {
    fontSize: 11,
    color: '#6366F1',
    fontWeight: '600',
    marginTop: 4,
  },
});

export default Home;
