import React, { useMemo } from 'react'
import { Dimensions, StyleSheet, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated'

const SCREEN_WIDTH = Dimensions.get('window').width
const BOX_WIDTH = 40
const BOX_HEIGHT = 50

export const DraggableView = React.memo(
  ({ children }: { children: React.ReactNode }) => {
    const positionX = useSharedValue(0)
    const positionY = useSharedValue(0)
    const previousPositionX = useSharedValue(0)
    const previousPositionY = useSharedValue(0)

    const panGesture = useMemo(() => {
      return Gesture.Pan()
        .hitSlop(15)
        .onUpdate((e) => {
          positionX.value = previousPositionX.value + e.translationX
          positionY.value = previousPositionY.value + e.translationY
        })
        .onEnd((e) => {
          if (e.absoluteX + BOX_WIDTH / 2 < SCREEN_WIDTH / 2) {
            const newPositionX = (SCREEN_WIDTH - BOX_WIDTH) * -1
            positionX.value = withSpring(newPositionX, { duration: 100 })
            previousPositionX.value = newPositionX
          } else {
            positionX.value = withSpring(0, { duration: 100 })
            previousPositionX.value = 0
          }
          previousPositionY.value = positionY.value
        })
    }, [])

    const style = useAnimatedStyle(() => {
      return {
        transform: [
          { translateX: positionX.value },
          { translateY: positionY.value },
        ],
      }
    })

    return (
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[style, styles.draggableBox]}>
          {children}
          <View style={styles.draggableBoxOverlay} />
        </Animated.View>
      </GestureDetector>
    )
  }
)

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
})
