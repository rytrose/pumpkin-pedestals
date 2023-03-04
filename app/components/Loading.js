import { useEffect, useRef, useMemo } from "react";
import { Animated, Easing } from "react-native";
import { Svg, Path } from "react-native-svg";

const Loading = ({ width, height, className, fill = "#000000" }) => {
  const AnimatedSvg = useMemo(() => Animated.createAnimatedComponent(Svg), []);

  const rotation = useRef(new Animated.Value(0)).current;

  const interpolated = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotation, {
        duration: 1000,
        easing: Easing.linear,
        toValue: 1,
        useNativeDriver: true,
      })
    ).start();
  }, [rotation]);

  return (
    <Animated.View className={className}>
      <AnimatedSvg
        width={width}
        height={height}
        viewBox="0 0 100 100"
        style={{
          transform: [{ rotate: interpolated }, { perspective: 1000 }],
        }}
      >
        <Path
          fill={fill}
          d="M73,50c0-12.7-10.3-23-23-23S27,37.3,27,50 M30.9,50c0-10.5,8.5-19.1,19.1-19.1S69.1,39.5,69.1,50"
        />
      </AnimatedSvg>
    </Animated.View>
  );
};

export default Loading;
