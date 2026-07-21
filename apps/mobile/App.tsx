import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { BoardCanvasNative } from './src/components/BoardCanvasNative';

export default function App() {
  return (
    <View style={styles.container}>
      <BoardCanvasNative />
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
