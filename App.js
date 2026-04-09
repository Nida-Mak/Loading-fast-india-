import React from 'react';
import { StyleSheet, Text, View, StatusBar } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.title}>Loading Fast India</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.welcome}>स्वागत है!</Text>
        <Text style={styles.text}>आपका लॉजिस्टिक्स ऐप सेटअप हो रहा है।</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    marginTop: 60,
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    color: '#F8FAFC',
    fontWeight: 'bold',
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  welcome: {
    fontSize: 22,
    color: '#38BDF8',
    marginBottom: 10,
  },
  text: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
  },
});
    
