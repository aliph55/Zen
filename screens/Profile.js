import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const Profile = ({ navigation, route }) => {
  const [user, setUser] = useState({
    name: 'Ali Kemal',
    email: 'ali.kemal@example.com',
    phone: '+90 555 123 4567',
    bio: 'React Native Developer | Coffee Enthusiast | Tech Lover',
    avatar: 'https://i.pravatar.cc/300',
    joinDate: 'January 2024',
    location: 'Istanbul, Turkey',
  });

  const [stats, setStats] = useState({
    posts: 42,
    followers: 1234,
    following: 567,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Menu öğeleri
  const menuItems = [
    {
      id: 1,
      title: 'Edit Profile',
      icon: 'edit',
      iconType: 'MaterialIcons',
      onPress: () => navigation.navigate('EditProfile'),
    },
    {
      id: 2,
      title: 'Settings',
      icon: 'settings',
      iconType: 'MaterialIcons',
      onPress: () => navigation.navigate('Settings'),
    },
    {
      id: 3,
      title: 'Privacy',
      icon: 'lock',
      iconType: 'MaterialIcons',
      onPress: () => navigation.navigate('Privacy'),
    },
    {
      id: 4,
      title: 'Notifications',
      icon: 'notifications',
      iconType: 'MaterialIcons',
      onPress: () => navigation.navigate('Notifications'),
    },
    {
      id: 5,
      title: 'Help & Support',
      icon: 'help-outline',
      iconType: 'MaterialIcons',
      onPress: () => navigation.navigate('Support'),
    },
    {
      id: 6,
      title: 'About',
      icon: 'info-outline',
      iconType: 'MaterialIcons',
      onPress: () => navigation.navigate('About'),
    },
    {
      id: 7,
      title: 'Logout',
      icon: 'logout',
      iconType: 'MaterialIcons',
      color: '#FF3B30',
      onPress: handleLogout,
    },
  ];

  // Kullanıcı verilerini yükle
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    setIsLoading(true);
    try {
      // AsyncStorage'dan kullanıcı verilerini al
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        setUser(JSON.parse(userData));
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // Verileri yenile
    setTimeout(() => {
      loadUserData();
      setRefreshing(false);
    }, 1500);
  }, []);

  // Çıkış işlemi
  async function handleLogout() {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              // Login sayfasına yönlendir
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              console.error('Logout error:', error);
            }
          },
          style: 'destructive',
        },
      ],
      { cancelable: true },
    );
  }

  // Stat Card Komponenti
  const StatCard = ({ label, value }) => (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  // Menu Item Komponenti
  const MenuItem = ({ item }) => (
    <TouchableOpacity
      style={styles.menuItem}
      onPress={item.onPress}
      activeOpacity={0.7}
    >
      <View style={styles.menuItemLeft}>
        <MaterialIcons
          name={item.icon}
          size={24}
          color={item.color || '#333'}
        />
        <Text
          style={[styles.menuItemText, item.color && { color: item.color }]}
        >
          {item.title}
        </Text>
      </View>
      <MaterialIcons name="chevron-right" size={24} color="#C7C7CC" />
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity onPress={() => navigation.navigate('EditProfile')}>
            <MaterialIcons name="edit" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>

        {/* Profile Info */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <Image source={{ uri: user.avatar }} style={styles.avatar} />
            <TouchableOpacity style={styles.cameraButton}>
              <FontAwesome5 name="camera" size={16} color="#FFF" />
            </TouchableOpacity>
          </View>

          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userBio}>{user.bio}</Text>

          <View style={styles.userInfo}>
            <View style={styles.infoRow}>
              <MaterialIcons name="email" size={16} color="#8E8E93" />
              <Text style={styles.infoText}>{user.email}</Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialIcons name="location-on" size={16} color="#8E8E93" />
              <Text style={styles.infoText}>{user.location}</Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialIcons name="calendar-today" size={16} color="#8E8E93" />
              <Text style={styles.infoText}>Joined {user.joinDate}</Text>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <StatCard label="Posts" value={stats.posts} />
          <View style={styles.statDivider} />
          <StatCard label="Followers" value={stats.followers} />
          <View style={styles.statDivider} />
          <StatCard label="Following" value={stats.following} />
        </View>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          {menuItems.map(item => (
            <MenuItem key={item.id} item={item} />
          ))}
        </View>

        {/* Version Info */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>Version 1.0.0</Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
  },
  profileSection: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#007AFF',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#007AFF',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  userName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  userBio: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 40,
    lineHeight: 20,
  },
  userInfo: {
    width: '100%',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    justifyContent: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 20,
    marginBottom: 10,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#8E8E93',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E5EA',
  },
  menuContainer: {
    backgroundColor: '#FFFFFF',
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 16,
    color: '#000',
    marginLeft: 15,
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  versionText: {
    fontSize: 12,
    color: '#8E8E93',
  },
});

export default Profile;
