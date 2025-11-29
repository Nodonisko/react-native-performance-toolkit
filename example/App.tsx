import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import {
  useFpsUi,
  useCpuUsage,
  useMemoryUsage,
  useFpsJs,
  getDeviceMaxRefreshRate,
  getDeviceCurrentRefreshRate,
} from 'react-native-performance-toolkit';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  JSFpsCounter,
  UIFpsCounter,
  CpuUsageCounter,
  MemoryUsageCounter,
} from 'react-native-performance-toolkit/reanimated';

function formatValue(value: number): string {
  return Number.isFinite(value) ? value.toFixed(0) : '0';
}

const sleepAsync = (ms: number) =>
  new Promise<void>(resolve => setTimeout(() => resolve(), ms));

const JSThreadReanimatedCounter = () => {
  const fps = useFpsJs();
  return <Text style={styles.stat}>JS FPS: {formatValue(fps)}</Text>;
};

const UIFpsCounterJSThread = () => {
  const fps = useFpsUi();
  return <Text style={styles.stat}>UI FPS: {formatValue(fps)}</Text>;
};

const CpuUsageCounterJSThread = () => {
  const cpuUsage = useCpuUsage();
  return <Text style={styles.stat}>CPU (%): {formatValue(cpuUsage)}</Text>;
};

const MemoryUsageCounterJSThread = () => {
  const memoryUsage = useMemoryUsage();
  return <Text style={styles.stat}>RAM (MB): {formatValue(memoryUsage)}</Text>;
};

function App(): React.JSX.Element {
  const blockJSThread = (blockTime: number = 500) => {
    console.log(`Blocking JS thread for ${blockTime} milliseconds...`);
    const start = Date.now();
    // Heavy synchronous computation to block the JS thread
    let result = 0;
    while (Date.now() - start < blockTime) {
      // Simulate heavy work
      for (let i = 0; i < 100000; i++) {
        result += Math.sqrt(i) * Math.random();
      }
    }
    console.log('JS thread unblocked', result);
  };

  const blockTo30FpsFor5Seconds = async () => {
    console.log('Blocking JS thread to 30 FPS for 10 seconds...');
    for (let i = 0; i < 20; i++) {
      if (i % 2 === 0) {
        blockJSThread();
      } else {
        await sleepAsync(500);
      }
    }
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <Text style={styles.title}>Performance Toolkit</Text>
      <Text style={styles.subtitle}>Buffer-based API</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => blockJSThread(5000)}
      >
        <Text style={styles.buttonText}>Block JS Thread (5s)</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={blockTo30FpsFor5Seconds}>
        <Text style={styles.buttonText}>
          Block JS Thread to 30 FPS for 10seconds
        </Text>
      </TouchableOpacity>

      <View>
        <Text style={styles.subtitle}>
          Device Max Refresh Rate: {getDeviceMaxRefreshRate()} Hz
        </Text>
        <Text style={styles.subtitle}>
          Device Current Refresh Rate: {getDeviceCurrentRefreshRate()} Hz
        </Text>
      </View>

      <View>
        <Text style={styles.subtitle}>JS Thread updated values</Text>
      </View>
      <View style={styles.statsContainer}>
        <JSThreadReanimatedCounter />
        <UIFpsCounterJSThread />
        <CpuUsageCounterJSThread />
        <MemoryUsageCounterJSThread />
      </View>

      <View>
        <Text style={styles.subtitle}>UI Thread updated values</Text>
      </View>
      <View style={styles.componentsStackContainer}>
        <View style={{ height: 100, width: 100 }}>
          <JSFpsCounter />
        </View>
        <View style={{ height: 100, width: 100 }}>
          <UIFpsCounter />
        </View>
      </View>
      <View style={styles.componentsStackContainer}>
        <View style={{ height: 100, width: 100 }}>
          <CpuUsageCounter />
        </View>
        <View style={{ height: 100, width: 100 }}>
          <MemoryUsageCounter />
        </View>
      </View>

      {/* <View style={styles.nativeViewContainer}>
        <Text style={styles.nativeViewLabel}>Native FpsCounterView:</Text>
        <FpsCounterView
          valueBuffer={JsFpsTracking.getJsFpsBuffer()}
          updateIntervalMs={100}
          label="JS FPS"
          style={styles.fpsCounterView}
        />
      </View> */}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0d1117',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#f0f6fc',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#8b949e',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#f85149',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  statsContainer: {
    alignSelf: 'stretch',
    backgroundColor: '#161b22',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  componentsStackContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  stat: {
    fontSize: 16,
    color: '#f0f6fc',
    marginBottom: 4,
  },
  nativeViewContainer: {
    alignItems: 'center',
  },
  nativeViewLabel: {
    fontSize: 14,
    color: '#8b949e',
    marginBottom: 8,
  },
  fpsCounterView: {
    width: 100,
    height: 100,
    borderWidth: 1,
    borderColor: '#f85149',
    borderRadius: 8,
  },
});

export default App;
