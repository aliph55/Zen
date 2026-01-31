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
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useSelector } from 'react-redux';

const Profile = ({ navigation, route }) => {
  const userInfo = useSelector(state => state.userInfo.user); // Get the full userInfo object
  console.log('Profile: userInfo from Redux:', userInfo);

  const [user, setUser] = useState({
    name: userInfo?.givenName || '',
    email: userInfo?.email || '',
    id: userInfo?.id || '',
    photo: userInfo?.photo || '',
    familyName: userInfo?.familyName || '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);
  const [supportModalVisible, setSupportModalVisible] = useState(false);

  // Menu items
  const menuItems = [
    {
      id: 3,
      title: 'Privacy',
      icon: 'lock',
      iconType: 'MaterialIcons',
      onPress: () => setPrivacyModalVisible(true),
    },
    {
      id: 5,
      title: 'Help & Support',
      icon: 'help-outline',
      iconType: 'MaterialIcons',
      onPress: () => setSupportModalVisible(true),
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

  // Load user data
  useEffect(() => {
    loadUserData();
  }, [userInfo]); // Re-run when userInfo changes

  const loadUserData = async () => {
    setIsLoading(true);
    try {
      const userData = await AsyncStorage.getItem('userInfo');
      if (userData) {
        setUser(JSON.parse(userData));
      } else if (userInfo) {
        setUser(userInfo); // Use Redux data if AsyncStorage is empty
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      loadUserData();
      setRefreshing(false);
    }, 1500);
  }, []);

  // Logout function
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
              navigation.reset({
                index: 0,
                routes: [{ name: 'Signin' }],
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
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <Image source={{ uri: userInfo?.photo }} style={styles.avatar} />
          </View>

          <Text style={styles.userName}>{userInfo?.name}</Text>
          <Text style={styles.userBio}>{userInfo?.familyName}</Text>

          <View style={styles.userInfo}>
            <View style={styles.infoRow}>
              <MaterialIcons name="email" size={16} color="#8E8E93" />
              <Text style={styles.infoText}>{userInfo?.email}</Text>
            </View>
          </View>
        </View>

        <View style={styles.menuContainer}>
          {menuItems.map(item => (
            <MenuItem key={item.id} item={item} />
          ))}
        </View>

        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>Version 1.0.0</Text>
        </View>
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={privacyModalVisible}
        onRequestClose={() => setPrivacyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeader}>Privacy Policy</Text>
            <Text style={styles.modalText}>
              xAI collects user data (e.g., name, email) to provide Grok 3
              services. Data is used to enhance your experience, secured with
              encryption, and not shared with third parties unless required by
              law. You can request data access or deletion via support@xa.com.
              Last updated: October 07, 2025.
            </Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setPrivacyModalVisible(false)}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={supportModalVisible}
        onRequestClose={() => setSupportModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeader}>Help & Support</Text>
            <Text style={styles.modalText}>
              Contact support@xa.com for assistance with Grok 3. Response time
              is within 24 hours. Visit our FAQ page for common issues. Live
              support coming soon. Last updated: October 07, 2025.
            </Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setSupportModalVisible(false)}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    width: '100',
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 10,
    width: '80%',
    maxHeight: '70%',
  },
  modalHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 10,
  },
  modalText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 15,
    lineHeight: 20,
  },
  modalCloseButton: {
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  modalCloseText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default Profile;
