import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import ChatIndex from '../Components/ChatIndex';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TITLES = [
  ['Record the dismissible tutorial 🎥'],
  ['Leave 👍🏼 to the video'],
  ['Check YouTube comments'],
  ['Subscribe to the channel 🚀'],
  ['Leave a ⭐️ on the GitHub Repo'],
];

const storeData = async value => {
  try {
    await AsyncStorage.setItem('my-key', TITLES);
  } catch (e) {
    // saving error
  }
};

const TASKS = TITLES.map((title, index) => ({ title, index }));

const BACKGROUND_COLOR = '#FAFBFF';

const Chat = ({ navigation }) => {
  const title = [
    { title: 'Record the dismissible tutorial 🎥', time: 15 },
    { title: 'Leave 👍🏼 to the video', time: 16 },
    { title: 'Check YouTube comments', time: 17 },
    { title: 'Subscribe to the channel 🚀', time: 18 },
    { title: 'Leave a ⭐️ on the GitHub Repo', time: 19 },
  ];

  const storeData = async title => {
    try {
      const jsonValue = JSON.stringify(title);
      await AsyncStorage.setItem('my-key', jsonValue);
    } catch (e) {
      // saving error
    }
  };

  const getData = async () => {
    try {
      const value = await AsyncStorage.getItem('my-key');

      if (value !== null) {
        // value previously stored
        console.log(value);
      }
    } catch (e) {
      // error reading value
    }
  };
  useEffect(() => {
    storeData(title);
  }, []);

  useEffect(() => {
    getData();
  }, []);

  const [tasks, setTasks] = useState(TASKS);
  const scrollRef = useRef(null);

  const onDismiss = useCallback(task => {
    setTasks(prevTasks => prevTasks.filter(item => item.index !== task.index));
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <Text style={styles.title}>Chats</Text>
        <ScrollView ref={scrollRef} style={styles.scrollView}>
          {tasks.map(task => (
            <ChatIndex
              key={task.index}
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

export default Chat;

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
  },
});
