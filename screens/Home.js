import React, { useEffect, useState } from 'react';
import {
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  View,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Feather';
import { useSelector } from 'react-redux';
import { useAds } from '../contexts/adsContext';

const { width } = Dimensions.get('window');

const Home = ({ navigation }) => {
  const [recentChats] = useState([
    {
      id: 1,
      title: 'Python Kodu Hakkında',
      time: '2 saat önce',
      preview: 'For döngüsü nasıl kullanılır...',
    },
    {
      id: 2,
      title: 'Makale Özeti',
      time: '5 saat önce',
      preview: 'Yapay zeka tarihini özetledim...',
    },
    {
      id: 3,
      title: 'Matematik Problemi',
      time: '1 gün önce',
      preview: 'İntegral hesaplaması sonucu...',
    },
    {
      id: 4,
      title: 'İngilizce Çeviri',
      time: '2 gün önce',
      preview: "Metni Türkçe'ye çevirdim...",
    },
  ]);

  const userInfo = useSelector(state => state.userInfo);
  //console.log('userInfo: ', userInfo);

  const { adsStatus, showInterstitialAd, showRewardedAd } = useAds();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Sabit Header - ScrollView dışında */}
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

      {/* Kaydırılabilir İçerik */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Welcome Section */}
        <LinearGradient
          colors={['#3B82F6', '#A855F7']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.welcomeCard}
        >
          <Text style={styles.welcomeTitle}>
            Merhaba, {userInfo?.user?.givenName} ! 👋
          </Text>
          <Text style={styles.welcomeSubtitle}>
            Bugün size nasıl yardımcı olabilirim?
          </Text>

          <TouchableOpacity style={styles.newChatButton} activeOpacity={0.8}>
            <View style={styles.newChatButtonContent}>
              <Icon name="plus" size={20} color="#FFFFFF" />
              <Text style={styles.newChatButtonText}>Yeni Sohbet Başlat</Text>
            </View>
            <Icon name="chevron-right" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </LinearGradient>

        {/* Stats */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>24</Text>
            <Text style={styles.statLabel}>Toplam Sohbet</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>156</Text>
            <Text style={styles.statLabel}>Cevaplanan Soru</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>7</Text>
            <Text style={styles.statLabel}>Günlük Seri</Text>
          </View>
        </View>

        {/* Recent Chats */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Son Sohbetler</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllButton}>Tümünü Gör</Text>
            </TouchableOpacity>
          </View>

          {recentChats.map(chat => (
            <TouchableOpacity
              key={chat.id}
              style={styles.chatCard}
              activeOpacity={0.7}
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

      {/* Bottom Tab Bar - Sabit */}
      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tabItem}>
          <View style={styles.activeTabIcon}>
            <Icon name="home" size={20} color="#FFFFFF" />
          </View>
          <Text style={styles.activeTabLabel}>Ana Sayfa</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('Chat')}
          style={styles.tabItem}
        >
          <Icon name="message-square" size={24} color="#9CA3AF" />
          <Text style={styles.tabLabel}>Sohbet</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={showRewardedAd} style={styles.tabItem}>
          <Icon name="clock" size={24} color="#9CA3AF" />
          <Text style={styles.tabLabel}>Geçmiş</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabItem}>
          <Icon name="user" size={24} color="#9CA3AF" />
          <Text style={styles.tabLabel}>Profil</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  // Sabit Header Stilleri
  fixedHeader: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    // iOS için shadow
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    // Android için shadow
    elevation: 4,
    zIndex: 1000, // Header'ın en üstte kalması için
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  menuButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
    textAlign: 'center',
  },
  notificationButton: {
    position: 'relative',
    padding: 4,
  },
  notificationDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    backgroundColor: '#EF4444',
    borderRadius: 4,
  },
  // ScrollView Stilleri
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 80, // Tab bar için boşluk
  },
  // Welcome Card
  welcomeCard: {
    margin: 20,
    padding: 20,
    borderRadius: 16,
  },
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
  newChatButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  newChatButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  // Sections
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
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
  // Quick Actions
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  quickActionItem: {
    alignItems: 'center',
    flex: 1,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  // Stats Card
  statsCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 24,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
  },
  // Chat Cards
  chatCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  chatCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  chatCardLeft: {
    flex: 1,
    marginRight: 12,
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 4,
  },
  chatPreview: {
    fontSize: 14,
    color: '#6B7280',
  },
  chatCardRight: {
    justifyContent: 'flex-start',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatTime: {
    fontSize: 12,
    color: '#9CA3AF',
    marginLeft: 4,
  },
  // Bottom Tab Bar
  tabBar: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    paddingVertical: 8,
    paddingBottom: 20, // iPhone X ve üzeri için güvenli alan
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    // Shadow
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  activeTabIcon: {
    backgroundColor: '#3B82F6',
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  tabLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },
  activeTabLabel: {
    fontSize: 11,
    color: '#3B82F6',
    fontWeight: '500',
  },
});

export default Home;
