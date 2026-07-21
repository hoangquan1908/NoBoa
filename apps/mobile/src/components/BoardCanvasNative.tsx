import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { Canvas, Path, Box, BoxShadow, rrect, rect, Skia } from '@shopify/react-native-skia';
import { useBoardStore } from '@note-board-app/shared';
// Cần import type nếu cần
// import type { Board } from '@note-board-app/shared';

// Giả lập 1 board để load
const MOCK_BOARD_ID = 'mobile-board-1';

function pointsToSkiaPath(points: { x: number; y: number }[]) {
  const path = Skia.Path.Make();
  if (points.length === 0) return path;
  path.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) path.lineTo(points[i].x, points[i].y);
  return path;
}

export function BoardCanvasNative() {
  const store = useBoardStore();
  const [boardLoaded, setBoardLoaded] = useState(false);

  useEffect(() => {
    // Load board ở localStore, nếu chưa có thì load 1 board trống và gọi loadBoard
    store.loadBoardFromCache(MOCK_BOARD_ID).then(() => {
      // Nếu không có, khởi tạo board trống
      if (!useBoardStore.getState().board) {
        useBoardStore.getState().loadBoard({
          id: MOCK_BOARD_ID,
          name: 'Mobile Board',
          snapshot: { items: [], connections: [], strokes: [] },
          history: [{ items: [], connections: [], strokes: [] }],
          historyIndex: 0
        });
      }
      setBoardLoaded(true);
    });
  }, []);

  // Gesture cho viewport (Pan + Zoom)
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = savedScale.value * e.scale;
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const composed = Gesture.Simultaneous(pinch, pan);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  if (!boardLoaded) return <View style={styles.container} />;

  return (
    <GestureHandlerRootView style={styles.container}>
      <GestureDetector gesture={composed}>
        <Animated.View style={[styles.canvasWrapper, animatedStyle]}>
          <Canvas style={styles.skiaCanvas}>
            {/* TODO: Tái tạo StringLinks.tsx và DrawingLayer.tsx từ web sang đây dùng Canvas/Path của Skia */}
            {store.board?.snapshot.strokes?.map((stroke, index) => {
              const pathData = pointsToSkiaPath(stroke.points);
              return (
                <Path
                  key={stroke.id || index}
                  path={pathData}
                  color={stroke.color}
                  style="stroke"
                  strokeWidth={stroke.width}
                />
              );
            })}
          </Canvas>

          {/* TODO: Render Box / View cho các loại Items (Sticky, Text, Image...) */}
          {store.board?.snapshot.items.map((item) => {
             // Đặt item dưới dạng Animated.View hoặc View thuần tuỳ ý
             // để tái hiện thẻ ghi chú, image... 
             return (
                <View 
                  key={item.id}
                  style={{
                    position: 'absolute',
                    left: item.x,
                    top: item.y,
                    width: 'w' in item ? item.w : 200, 
                    height: 'h' in item ? item.h : 'auto' as any,
                    backgroundColor: ('color' in item ? item.color : undefined) || '#FDE68A',
                    padding: 10,
                    borderRadius: 8,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                  }}
                />
             )
          })}
        </Animated.View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  canvasWrapper: {
    flex: 1,
  },
  skiaCanvas: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  }
});
