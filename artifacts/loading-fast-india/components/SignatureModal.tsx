import React, { useRef, useState } from "react";
import {
  Dimensions,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";

import Colors from "@/constants/colors";

const { width: SCREEN_W } = Dimensions.get("window");
const PAD_W = SCREEN_W - 48;
const PAD_H = 220;

interface Point {
  x: number;
  y: number;
}

interface SignatureModalProps {
  visible: boolean;
  onConfirm: (svgPath: string) => void;
  onCancel: () => void;
}

function pointsToPath(points: Point[]): string {
  if (points.length === 0) return "";
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x.toFixed(1)} ${points[i].y.toFixed(1)}`;
  }
  return d;
}

export default function SignatureModal({
  visible,
  onConfirm,
  onCancel,
}: SignatureModalProps) {
  const [strokes, setStrokes] = useState<Point[][]>([]);
  const currentStroke = useRef<Point[]>([]);
  const padOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { pageX, pageY } = evt.nativeEvent;
        const localX = pageX - padOffset.current.x;
        const localY = pageY - padOffset.current.y;
        const clamped = {
          x: Math.max(0, Math.min(PAD_W, localX)),
          y: Math.max(0, Math.min(PAD_H, localY)),
        };
        currentStroke.current = [clamped];
      },
      onPanResponderMove: (evt) => {
        const { pageX, pageY } = evt.nativeEvent;
        const localX = pageX - padOffset.current.x;
        const localY = pageY - padOffset.current.y;
        const clamped = {
          x: Math.max(0, Math.min(PAD_W, localX)),
          y: Math.max(0, Math.min(PAD_H, localY)),
        };
        currentStroke.current = [...currentStroke.current, clamped];
        setStrokes((prev) => {
          const next = [...prev];
          next[next.length === 0 ? 0 : next.length] = currentStroke.current;
          return next.length > 0
            ? [...prev.slice(0, -1), [...currentStroke.current]]
            : [[...currentStroke.current]];
        });
      },
      onPanResponderRelease: () => {
        if (currentStroke.current.length > 0) {
          setStrokes((prev) => [...prev.slice(0, -1), [...currentStroke.current]]);
          setStrokes((prev) => {
            const finished = [...currentStroke.current];
            currentStroke.current = [];
            return [...prev.slice(0, -1), finished];
          });
        }
      },
    })
  ).current;

  const handleClear = () => {
    setStrokes([]);
    currentStroke.current = [];
  };

  const handleConfirm = () => {
    if (strokes.length === 0) return;
    const allPaths = strokes
      .filter((s) => s.length > 0)
      .map((s) => pointsToPath(s))
      .join("|");
    setStrokes([]);
    currentStroke.current = [];
    onConfirm(allPaths);
  };

  const hasSignature = strokes.some((s) => s.length > 0);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>✍️ Vyapari Ka Hastakshar</Text>
          <Text style={styles.subtitle}>
            Maal ki delivery confirm karne ke liye vyapari yahan sign karein
          </Text>
          <Text style={styles.legalNote}>
            🔒 Yeh sign digital proof hai — IPC 420/406 ke tahat court mein manyata yogya hai
          </Text>

          <View
            style={styles.padContainer}
            onLayout={(e) => {
              e.target.measure((_fx, _fy, _w, _h, px, py) => {
                padOffset.current = { x: px, y: py };
              });
            }}
            {...panResponder.panHandlers}
          >
            <Svg width={PAD_W} height={PAD_H} style={styles.svg}>
              {strokes.map((stroke, i) =>
                stroke.length > 1 ? (
                  <Path
                    key={i}
                    d={pointsToPath(stroke)}
                    stroke="#1a1a2e"
                    strokeWidth={2.5}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : stroke.length === 1 ? (
                  <Path
                    key={i}
                    d={`M ${stroke[0].x} ${stroke[0].y} L ${stroke[0].x + 0.1} ${stroke[0].y}`}
                    stroke="#1a1a2e"
                    strokeWidth={3}
                    fill="none"
                    strokeLinecap="round"
                  />
                ) : null
              )}
            </Svg>
            {!hasSignature && (
              <View style={styles.placeholder} pointerEvents="none">
                <Text style={styles.placeholderText}>Yahan sign karein →</Text>
              </View>
            )}
          </View>

          <View style={styles.btnRow}>
            <Pressable style={styles.clearBtn} onPress={handleClear}>
              <Text style={styles.clearBtnText}>Mita Do</Text>
            </Pressable>
            <Pressable style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelBtnText}>Wapas</Text>
            </Pressable>
            <Pressable
              style={[styles.confirmBtn, !hasSignature && styles.confirmBtnDisabled]}
              onPress={handleConfirm}
              disabled={!hasSignature}
            >
              <Text style={styles.confirmBtnText}>Confirm ✓</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 32,
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textMuted,
    textAlign: "center",
  },
  legalNote: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#f0a500",
    textAlign: "center",
    backgroundColor: "rgba(240,165,0,0.08)",
    borderRadius: 8,
    padding: 8,
  },
  padContainer: {
    width: PAD_W,
    height: PAD_H,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: Colors.primary,
    alignSelf: "center",
    position: "relative",
  },
  svg: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  placeholder: {
    position: "absolute",
    bottom: 12,
    left: 16,
  },
  placeholderText: {
    fontSize: 14,
    color: "#c0c0c0",
    fontStyle: "italic",
  },
  btnRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  clearBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#2a2a3e",
    alignItems: "center",
  },
  clearBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textMuted,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "#2a2a3e",
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textMuted,
  },
  confirmBtn: {
    flex: 1.5,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.success,
    alignItems: "center",
  },
  confirmBtnDisabled: {
    opacity: 0.4,
  },
  confirmBtnText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
});
