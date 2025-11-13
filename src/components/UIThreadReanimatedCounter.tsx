import React from 'react'
import { StyleSheet, Text, TextInput } from 'react-native'
import Animated, {
  interpolateColor,
  setNativeProps,
  useAnimatedReaction,
  useAnimatedRef,
  useAnimatedStyle,
} from 'react-native-reanimated'
import { useCounterSharedValue } from '../hooks/uiThreadHooks'

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput)

type UIThreadReanimatedCounterProps = {
  label: string
  type: 'js' | 'ui' | 'cpu' | 'memory'
}

export const UIThreadReanimatedCounter = React.memo(
  ({ label, type }: UIThreadReanimatedCounterProps) => {
    const counterValue = useCounterSharedValue(type)
    const inputRef = useAnimatedRef<TextInput>()

    useAnimatedReaction(
      () => counterValue.value.toString(),
      (value) => {
        setNativeProps(inputRef, { text: value })
      },
      [counterValue]
    )

    const animatedBackgroundColor = useAnimatedStyle(() => {
      if (type === 'js' || type === 'ui') {
        return {
          backgroundColor: interpolateColor(
            counterValue.value,
            [0, 60],
            ['red', 'green']
          ),
        }
      }
      return {
        backgroundColor: 'gray',
      }
    }, [type])

    return (
      <Animated.View style={[animatedBackgroundColor, styles.container]}>
        <AnimatedTextInput
          ref={inputRef}
          style={styles.fpsText}
          editable={false}
          verticalAlign="middle"
          textAlign="center"
        />
        {label && <Text style={styles.label}>{label}</Text>}
      </Animated.View>
    )
  }
)

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  fpsText: {
    color: 'white',
    fontSize: 16,
    padding: 0,
    width: '100%',
  },
  label: {
    color: 'white',
    fontSize: 10,
    textAlign: 'center',
  },
})
