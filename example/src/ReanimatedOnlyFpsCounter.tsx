import React, { useCallback, useEffect } from 'react';
import { Dimensions, StyleSheet, TextInput, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { BoxedJsFpsTracking } from 'react-native-performance-toolkit';
import Animated, {
  interpolateColor,
  setNativeProps,
  useAnimatedRef,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnUI,
} from 'react-native-reanimated';
import { getRuntimeKind, scheduleOnUI } from 'react-native-worklets';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

export const ReanimatedOnlyFpsCounter = React.memo(() => {
  const fpsValue = useSharedValue(0);
  const internvalId = useSharedValue<ReturnType<typeof setInterval> | null>(
    null,
  );
  const inputRef = useAnimatedRef<TextInput>();

  const updateFps = useCallback(() => {
    'worklet';
    const unboxedJsFps = BoxedJsFpsTracking.unbox();
    const buffer = unboxedJsFps.getJsFpsBuffer();
    const view = new Int32Array(buffer);
    fpsValue.value = view[0];
    setNativeProps(inputRef, { text: fpsValue.value.toString() });
  }, []);

  const startUpdateFpsLoop = useCallback(() => {
    'worklet';
    internvalId.value = setInterval(updateFps, 1000);
  }, [updateFps]);

  const stopUpdateFpsLoop = useCallback(() => {
    'worklet';
    if (internvalId.value) {
      clearInterval(internvalId.value);
    }
    internvalId.value = null;
  }, [internvalId]);

  useEffect(() => {
    if (internvalId.value) return;
    scheduleOnUI(startUpdateFpsLoop);
    return () => {
      scheduleOnUI(stopUpdateFpsLoop);
    };
  }, [startUpdateFpsLoop, stopUpdateFpsLoop]);

  const animatedBackgroundColor = useAnimatedStyle(() => {
    return {
      backgroundColor: interpolateColor(
        fpsValue.value,
        [0, 60],
        ['red', 'green'],
      ),
    };
  });

  return (
    <DraggableView>
      <Animated.View
        style={[animatedBackgroundColor, { width: '100%', height: '100%' }]}
      >
        <AnimatedTextInput
          ref={inputRef}
          style={styles.fpsText}
          editable={false}
          verticalAlign="middle"
          textAlign="center"
        />
      </Animated.View>
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
          <View style={styles.draggableBoxOverlay} />
        </Animated.View>
      </GestureDetector>
    );
  },
);

const styles = StyleSheet.create({
  draggableBox: {
    width: BOX_WIDTH,
    height: BOX_HEIGHT,
    position: 'absolute',
    right: 0,
    top: 100,
  },
  // Pan gesture doesn't work on TextInput so we overlay it with empty view
  draggableBoxOverlay: {
    width: BOX_WIDTH,
    height: BOX_HEIGHT,
    position: 'absolute',
    left: 0,
    top: 0,
    zIndex: 2,
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
