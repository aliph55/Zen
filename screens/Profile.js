import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  StatusBar,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useSelector } from 'react-redux';

const Profile = ({ navigation }) => {
  const userInfo = useSelector(state => state.userInfo.user);

  const [privacyVisible, setPrivacyVisible] = useState(false);
  const [aboutVisible, setAboutVisible] = useState(false);

  const handleLogout = () => {
    AsyncStorage.clear();
    navigation.reset({ index: 0, routes: [{ name: 'Signin' }] });
  };

  const menu = [
    {
      icon: 'verified-user',
      title: 'Privacy Policy',
      onPress: () => setPrivacyVisible(true),
    },
    {
      icon: 'favorite',
      title: 'About ZenAi',
      onPress: () => setAboutVisible(true),
    },
    {
      icon: 'logout',
      title: 'Logout',
      color: '#FF3B30',
      onPress: handleLogout,
    },
  ];

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 50 }}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.avatarBorder}>
              <Image source={{ uri: userInfo?.photo }} style={styles.avatar} />
            </View>
            <Text style={styles.name}>{userInfo?.name || 'Loak User'}</Text>
            <Text style={styles.email}>{userInfo?.email}</Text>
          </View>

          {/* Menu Cards */}
          <View style={styles.menuContainer}>
            {menu.map((item, i) => (
              <TouchableOpacity
                key={i}
                activeOpacity={0.85}
                onPress={item.onPress}
                style={styles.menuCard}
              >
                <View style={styles.menuRow}>
                  <View
                    style={[
                      styles.iconCircle,
                      item.color && { backgroundColor: '#FFEBEB' },
                    ]}
                  >
                    <MaterialIcons
                      name={item.icon}
                      size={24}
                      color={item.color || '#007AFF'}
                    />
                  </View>
                  <Text
                    style={[
                      styles.menuText,
                      item.color && { color: item.color },
                    ]}
                  >
                    {item.title}
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={28} color="#C7C7CC" />
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.version}>ZenAi v1.0 • November 2025</Text>
        </ScrollView>
      </View>

      {/* Privacy Modal – Light */}
      <Modal visible={privacyVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalLight}>
            <Text style={styles.modalTitleLight}>Privacy Policy</Text>
            <Text style={styles.modalBodyLight}>
              Loak works 100% on your phone.{'\n'}
              Nothing is saved on any server.{'\n\n'}
              Your chats, photos, voice — all stay only on your device.{'\n\n'}
              Only Google Sign-In is used (name + email + photo).{'\n'}
              We don’t collect anything else.{'\n'}
              No analytics • No ads • No cloud{'\n\n'}
              Your data never leaves your phone.
            </Text>
            <TouchableOpacity
              style={styles.closeBtnLight}
              onPress={() => setPrivacyVisible(false)}
            >
              <Text style={styles.closeBtnTextLight}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* About Modal – Light */}
      <Modal visible={aboutVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalLight}>
            <Text style={styles.modalTitleLight}>About Loak</Text>
            <Text style={styles.modalBodyLight}>
              Your 100% local AI assistant.{'\n'}
              Runs completely on-device after sign-in.{'\n\n'}
              No cloud • No data collection • No training on your conversations
              {'\n\n'}
              Built for people who want real AI without sacrificing privacy.
              {'\n\n'}Made with ❤️ by Ayhan Group{'\n'}
              ayhan.group2019@gmail.com
            </Text>
            <TouchableOpacity
              style={styles.closeBtnLight}
              onPress={() => setAboutVisible(false)}
            >
              <Text style={styles.closeBtnTextLight}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 10,
  },
  avatarBorder: {
    padding: 6,
    backgroundColor: '#007AFF',
    borderRadius: 70,
    marginBottom: 16,
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  name: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  email: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 6,
  },
  menuContainer: {
    paddingHorizontal: 20,
    paddingTop: 30,
    gap: 14,
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E5F2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuText: {
    fontSize: 17,
    color: '#1C1C1E',
    fontWeight: '500',
  },
  version: {
    textAlign: 'center',
    color: 14,
    color: '#8E8E93',
    marginTop: 40,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalLight: {
    width: '88%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
  },
  modalTitleLight: {
    fontSize: 23,
    fontWeight: '700',
    color: '#007AFF',
    textAlign: 'center',
    marginBottom: 18,
  },
  modalBodyLight: {
    fontSize: 16,
    color: '#3C3C43',
    lineHeight: 24,
  },
  closeBtnLight: {
    marginTop: 28,
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  closeBtnTextLight: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
});

export default Profile;
