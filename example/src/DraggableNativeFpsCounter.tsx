import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  FpsCounterView,
  JsFpsTracking,
} from 'react-native-performance-toolkit';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

export const ReanimatedFpsCounter = React.memo(() => {
  return (
    <DraggableView>
      <FpsCounterView
        valueBuffer={JsFpsTracking.getJsFpsBuffer()}
        updateIntervalMs={100}
        style={styles.container}
        label="JS FPS"
      />
    </DraggableView>
  );
});

const SCREEN_WIDTH = Dimensions.get('window').width;
const BOX_WIDTH = 40;
const BOX_HEIGHT = 50;

const DraggableView = React.memo(
  ({ children }: { children: React.ReactNode }) => {
    const positionX = useSharedValue(0);
    const positionY = useSharedValue(0);
    const previousPositionX = useSharedValue(0);
    const previousPositionY = useSharedValue(0);

    const panGesture = Gesture.Pan()
      .hitSlop(15)
      .onUpdate(e => {
        positionX.value = previousPositionX.value + e.translationX;
        positionY.value = previousPositionY.value + e.translationY;
      })
      .onEnd(e => {
        if (e.absoluteX + BOX_WIDTH / 2 < SCREEN_WIDTH / 2) {
          const newPositionX = (SCREEN_WIDTH - BOX_WIDTH) * -1;
          positionX.value = withSpring(newPositionX, { duration: 100 });
          previousPositionX.value = newPositionX;
        } else {
          positionX.value = withSpring(0, { duration: 100 });
          previousPositionX.value = 0;
        }
        previousPositionY.value = positionY.value;
      });

    const style = useAnimatedStyle(() => {
      return {
        transform: [
          { translateX: positionX.value },
          { translateY: positionY.value },
        ],
      };
    });

    return (
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[style, styles.draggableBox]}>
          {children}
        </Animated.View>
      </GestureDetector>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    width: BOX_WIDTH,
    height: BOX_HEIGHT,
  },
  draggableBox: {
    width: BOX_WIDTH,
    height: BOX_HEIGHT,
    position: 'absolute',
    right: 0,
    top: 100,
  },
  fpsText: {
    color: 'white',
    fontSize: 16,
  },
  jsFpsText: {
    color: 'white',
    fontSize: 10,
    textAlign: 'center',
  },
});
