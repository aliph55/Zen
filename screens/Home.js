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
  const userInfo = useSelector(state => state.userInfo.user); // Get the full userInfo object
  const userName = userInfo?.givenName; // Safely access givenName

  // Load recent chats from AsyncStorage
  const loadRecentChats = async () => {
    try {
      const savedGroups = await AsyncStorage.getItem('groups');
      console.log(
        'Home: Loading recent chats from AsyncStorage at',
        new Date().toLocaleString(),
        savedGroups ? 'Data found' : 'No data',
      );
      if (savedGroups) {
        const parsedGroups = JSON.parse(savedGroups);
        const chats = parsedGroups
          .flatMap(group =>
            group.chats.map(chat => ({
              id: chat.id,
              title: chat.title,
              time: new Date(chat.lastOpened).toLocaleString(),
              preview: chat.messages[0]?.text.slice(0, 50) || 'Mesaj yok...',
              groupId: group.id,
            })),
          )
          .sort((a, b) => new Date(b.time) - new Date(a.time))
          .slice(0, 4); // Son 4 sohbet
        setRecentChats(chats);
        console.log('Home: Recent chats loaded, count:', chats.length);
      } else {
        setRecentChats([]);
        console.log('Home: No chats found, resetting to empty');
      }
    } catch (error) {
      console.error('Home: Recent chats yükleme hatası:', error);
    }
  };

  // Start new chat and update immediately
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
        'Home: New chat added to AsyncStorage at',
        new Date().toLocaleString(),
      );

      // Force reload to ensure latest data
      await loadRecentChats();
      navigation.navigate('Chat', { groupId: newGroupId, chatId: newChatId });
    } catch (error) {
      console.error('Home: Yeni grup oluşturma hatası:', error);
    }
  };

  // Refresh chats when returning to Home
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('Home: Screen focused at', new Date().toLocaleString());
      loadRecentChats();
    });
    loadRecentChats(); // Initial load
    return unsubscribe;
  }, [navigation]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.fixedHeader}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.menuButton}>
            <Icon name="menu" size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>AI Assistant</Text>
          <TouchableOpacity style={styles.notificationButton}>
            <Icon name="bell" size={24} color="#374151" />
            <View style={styles.notificationDot} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <LinearGradient
          colors={['#3B82F6', '#A855F7']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.welcomeCard}
        >
          <Text style={styles.welcomeTitle}>Hello! 👋 {userName}</Text>
          <Text style={styles.welcomeSubtitle}>
            How can I assist you today?
          </Text>
          <TouchableOpacity
            style={styles.newChatButton}
            activeOpacity={0.8}
            onPress={startNewChat}
          >
            <View style={styles.newChatButtonContent}>
              <Icon name="plus" size={20} color="#FFFFFF" />
              <Text style={styles.newChatButtonText}>Start New Chat</Text>
            </View>
            <Icon name="chevron-right" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </LinearGradient>

        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{recentChats.length}</Text>
            <Text style={styles.statLabel}>Total Chats</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Answered Questions</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Daily Streak</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Chats</Text>
            <TouchableOpacity onPress={() => navigation.navigate('History')}>
              <Text style={styles.seeAllButton}>See All</Text>
            </TouchableOpacity>
          </View>

          {recentChats.map(chat => (
            <TouchableOpacity
              key={chat.id}
              style={styles.chatCard}
              activeOpacity={0.7}
              onPress={() =>
                navigation.navigate('Chat', {
                  groupId: chat.groupId,
                  chatId: chat.id,
                })
              }
            >
              <View style={styles.chatCardContent}>
                <View style={styles.chatCardLeft}>
                  <Text style={styles.chatTitle}>{chat.title}</Text>
                  <Text style={styles.chatPreview} numberOfLines={1}>
                    {chat.preview}
                  </Text>
                </View>
                <View style={styles.chatCardRight}>
                  <View style={styles.timeContainer}>
                    <Icon name="clock" size={12} color="#9CA3AF" />
                    <Text style={styles.chatTime}>{chat.time}</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tabItem}>
          <View style={styles.activeTabIcon}>
            <Icon name="home" size={20} color="#FFFFFF" />
          </View>
          <Text style={styles.activeTabLabel}>Home</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation.navigate('Chat')}
          style={styles.tabItem}
        >
          <Icon name="message-square" size={24} color="#9CA3AF" />
          <Text style={styles.tabLabel}>Chat</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation.navigate('History')}
          style={styles.tabItem}
        >
          <Icon name="clock" size={24} color="#9CA3AF" />
          <Text style={styles.tabLabel}>History</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation.navigate('Profile')}
          style={styles.tabItem}
        >
          <Icon name="user" size={24} color="#9CA3AF" />
          <Text style={styles.tabLabel}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  fixedHeader: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 4,
    zIndex: 1000,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  menuButton: { padding: 4 },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
    textAlign: 'center',
  },
  notificationButton: { position: 'relative', padding: 4 },
  notificationDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    backgroundColor: '#EF4444',
    borderRadius: 4,
  },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 80 },
  welcomeCard: { margin: 20, padding: 20, borderRadius: 16 },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 16,
  },
  newChatButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  newChatButtonContent: { flexDirection: 'row', alignItems: 'center' },
  newChatButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 24,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  statItem: { alignItems: 'center', flex: 1 },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  statLabel: { fontSize: 11, color: '#6B7280' },
  statDivider: { width: 1, backgroundColor: '#E5E7EB' },
  section: { paddingHorizontal: 20, marginTop: 24 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  seeAllButton: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  chatCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
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
  timeContainer: { flexDirection: 'row', alignItems: 'center' },
  chatTime: { fontSize: 12, color: '#9CA3AF', marginLeft: 4 },
  tabBar: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    paddingVertical: 8,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 8,
  },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  activeTabIcon: {
    backgroundColor: '#3B82F6',
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  tabLabel: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
  activeTabLabel: {
    fontSize: 11,
    color: '#3B82F6',
    fontWeight: '500',
  },
});

export default Home;
