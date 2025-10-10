import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import {
  PerformanceToolkit,
  JsFpsTracking,
  PerformanceStats,
} from 'react-native-performance-toolkit';

function formatValue(value: number): string {
  return Number.isFinite(value) ? value.toFixed(1) : '0.0';
}

const sleepAsync = (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms));

function App(): React.JSX.Element {
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [jsFps, setJsFps] = useState<number>(0);
  const [isTracking, setIsTracking] = useState(false);

  const blockJSThread = () => {
    const blockTime = 100;
    console.log(`Blocking JS thread for ${blockTime} miliseconds...`);
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
    console.log('Blocking JS thread to 10 FPS for 5 seconds...');
    for (let i = 0; i < 100; i++) {
      if (i % 2 === 0 || i % 3 === 0 || i % 5 === 0 || i % 7 === 0) {
        blockJSThread();
      } else {
        await sleepAsync(100);
      }
    }
  };

  useEffect(() => {
    const handleUpdate = (next: PerformanceStats) => {
      console.log('[PerformanceStats]', JSON.stringify(next));
      setStats(next);
    };

    // Start PerformanceToolkit first to initialize RuntimeBridge
    PerformanceToolkit.startTracking(handleUpdate, {
      withCpu: true,
      updateIntervalMs: 500,
    });

    // Small delay to ensure RuntimeBridge is initialized
    setTimeout(() => {
      // Start C++ JS FPS tracking
      JsFpsTracking.startTracking(fps => {
        console.log('[JsFps C++]', fps);
        setJsFps(fps);
      });
    }, 100);

    setIsTracking(true);

    // Cleanup on unmount
    return () => {
      PerformanceToolkit.stopTracking();
      JsFpsTracking.stopTracking();
      setIsTracking(false);
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Performance Toolkit</Text>
      <Text style={styles.status}>
        Status: {isTracking ? 'Tracking' : 'Stopped'}
      </Text>

      <TouchableOpacity style={styles.button} onPress={blockJSThread}>
        <Text style={styles.buttonText}>Block JS Thread (2s)</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={blockTo30FpsFor5Seconds}>
        <Text style={styles.buttonText}>
          Block JS Thread to 30 FPS for 5 seconds
        </Text>
      </TouchableOpacity>

      {stats ? (
        <View style={styles.statsContainer}>
          <Text style={styles.stat}>UI FPS: {formatValue(stats.uiFps)}</Text>
          <Text style={styles.stat}>JS FPS: {formatValue(jsFps)}</Text>
          <Text style={styles.stat}>Frames Dropped: {stats.framesDropped}</Text>
          <Text style={styles.stat}>Stutters: {stats.stutters}</Text>
          <Text style={styles.stat}>
            RAM (MB): {formatValue(stats.usedRam)}
          </Text>
          <Text style={styles.stat}>CPU (%): {formatValue(stats.usedCpu)}</Text>
        </View>
      ) : (
        <Text style={styles.placeholder}>Waiting for stats…</Text>
      )}
    </View>
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
    marginBottom: 8,
  },
  status: {
    fontSize: 16,
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
  },
  stat: {
    fontSize: 16,
    color: '#f0f6fc',
    marginBottom: 4,
  },
  placeholder: {
    fontSize: 16,
    color: '#8b949e',
  },
});

export default App;
