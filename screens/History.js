import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HistoryIndex from '../Components/HistoryIndex';

const BACKGROUND_COLOR = '#FAFBFF';

// chatDate'i üstte tanımla
const chatDate = new Date().toISOString();

// title array'ini chatDate tanımlandıktan sonra oluştur
const title = [
  {
    title: 'Record the dismissible tutorial 🎥',
    chatId: 15,
    time: chatDate,
    chat: [
      { message: 'Hello', sender: 'user' },
      { message: 'Hi', sender: 'bot' },
      { message: 'How are you?', sender: 'user' },
      { message: "I'm good, thank you!", sender: 'bot' },
      { message: 'What about you?', sender: 'bot' },
      { message: "I'm doing well, thanks for asking.", sender: 'user' },
      { message: "That's great to hear!", sender: 'bot' },
    ],
  },
  {
    title: 'Leave 👍🏼 to the video',
    chatId: 16,
    time: chatDate,
    chat: [
      { message: 'Hello', sender: 'user' },
      { message: 'Hi', sender: 'bot' },
      { message: 'How are you?', sender: 'user' },
      { message: "I'm good, thank you!", sender: 'bot' },
      { message: 'What about you?', sender: 'bot' },
      { message: "I'm doing well, thanks for asking.", sender: 'user' },
      { message: "That's great to hear!", sender: 'bot' },
    ],
  },
  {
    title: 'Check YouTube comments',
    chatId: 17,
    time: chatDate,
    chat: [
      { message: 'Hello', sender: 'user' },
      { message: 'Hi', sender: 'bot' },
      { message: 'How are you?', sender: 'user' },
      { message: "I'm good, thank you!", sender: 'bot' },
      { message: 'What about you?', sender: 'bot' },
      { message: "I'm doing well, thanks for asking.", sender: 'user' },
      { message: "That's great to hear!", sender: 'bot' },
    ],
  },
  {
    title: 'Subscribe to the channel 🚀',
    chatId: 18,
    time: chatDate,
    chat: [
      { message: 'Hello', sender: 'user' },
      { message: 'Hi', sender: 'bot' },
      { message: 'How are you?', sender: 'user' },
      { message: "I'm good, thank you!", sender: 'bot' },
      { message: 'What about you?', sender: 'bot' },
      { message: "I'm doing well, thanks for asking.", sender: 'user' },
      { message: "That's great to hear!", sender: 'bot' },
    ],
  },
  {
    title: 'Leave a ⭐️ on the GitHub Repo',
    chatId: 19, // Düzeltildi: 18'den 19'a
    time: chatDate,
    chat: [
      { message: 'Hello', sender: 'user' },
      { message: 'Hi', sender: 'bot' },
      { message: 'How are you?', sender: 'user' },
      { message: "I'm good, thank you!", sender: 'bot' },
      { message: 'What about you?', sender: 'bot' },
      { message: "I'm doing well, thanks for asking.", sender: 'user' },
      { message: "That's great to hear!", sender: 'bot' },
    ],
  },
];

// TASKS'ı doğru şekilde map et
const TASKS = title.map((item, index) => ({
  title: item.title,
  chatId: item.chatId,
  time: item.time,
  chat: item.chat,
  index: index,
}));

const History = ({ navigation }) => {
  const [tasks, setTasks] = useState(TASKS);
  const scrollRef = useRef(null);

  // storeData fonksiyonu
  const storeData = async data => {
    try {
      const jsonValue = JSON.stringify(data);
      await AsyncStorage.setItem('chat-history', jsonValue);
      console.log('Data stored successfully');
    } catch (e) {
      console.error('Error storing data:', e);
    }
  };

  // getData fonksiyonu
  const getData = async () => {
    try {
      const value = await AsyncStorage.getItem('chat-history');
      if (value !== null) {
        const parsedValue = JSON.parse(value);
        console.log('Retrieved data:', parsedValue);
        // İsterseniz tasks state'ini güncelleyebilirsiniz
        // setTasks(parsedValue);
        return parsedValue;
      }
    } catch (e) {
      console.error('Error reading data:', e);
    }
  };

  // Component mount olduğunda veriyi kaydet
  useEffect(() => {
    storeData(TASKS);
  }, []);

  // Component mount olduğunda veriyi oku
  useEffect(() => {
    getData();
  }, []);

  // onDismiss callback
  const onDismiss = useCallback(task => {
    setTasks(prevTasks => {
      const updatedTasks = prevTasks.filter(item => item.index !== task.index);
      // Güncellenmiş listeyi AsyncStorage'a kaydet
      storeData(updatedTasks);
      return updatedTasks;
    });
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <Text style={styles.title}>Chats History</Text>
        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          {tasks.map(task => (
            <HistoryIndex
              key={task.chatId} // index yerine chatId kullan
              simultaneousHandlers={scrollRef}
              task={task}
              onDismiss={onDismiss}
              onTap={() => navigation.navigate('Chat', { task })}
            />
          ))}
        </ScrollView>
      </View>
    </GestureHandlerRootView>
  );
};

export default History;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BACKGROUND_COLOR,
  },
  scrollView: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 20,
    marginLeft: 20,
    color: '#1a1a1a',
  },
});
