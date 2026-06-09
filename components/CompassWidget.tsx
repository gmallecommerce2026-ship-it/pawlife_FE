import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, {
    Circle,
    G,
    Line,
    Polygon,
    Text as SvgText,
} from 'react-native-svg';

const SIZE = 40;
const CX = SIZE / 2;
const CY = SIZE / 2;
const OUTER_R = SIZE / 2 - 1;
const TICK_OUTER_R = OUTER_R - 1;

function generateTicks() {
  const ticks = [];
  for (let i = 0; i < 72; i++) {
    const deg = i * 5;
    const rad = ((deg - 90) * Math.PI) / 180;
    const isMajor = deg % 90 === 0;
    const isMid = deg % 45 === 0 && !isMajor;
    const len = isMajor ? 5 : isMid ? 3.5 : 2;
    const r1 = TICK_OUTER_R - len;
    const r2 = TICK_OUTER_R;
    ticks.push({
      x1: CX + r1 * Math.cos(rad),
      y1: CY + r1 * Math.sin(rad),
      x2: CX + r2 * Math.cos(rad),
      y2: CY + r2 * Math.sin(rad),
      stroke: isMajor ? '#94A3B8' : '#D1D5DB',
      strokeWidth: isMajor ? 1.2 : 0.6,
      key: i,
    });
  }
  return ticks;
}

const TICKS = generateTicks();

// Tọa độ cardinal labels (cách tâm)
const CARD_R = OUTER_R - 9;
const cardinals = [
  { label: 'N', deg: 0, color: '#EF4444', fontSize: 7, fontWeight: '800' },
  { label: 'E', deg: 90, color: '#64748B', fontSize: 6, fontWeight: '700' },
  { label: 'S', deg: 180, color: '#64748B', fontSize: 6, fontWeight: '700' },
  { label: 'W', deg: 270, color: '#64748B', fontSize: 6, fontWeight: '700' },
];

interface CompassWidgetProps {
  heading: number; // góc từ bắc, tính theo chiều kim đồng hồ
}

export default function CompassWidget({ heading }: CompassWidgetProps) {
  const rotAnim = useRef(new Animated.Value(0)).current;
  const prevHeading = useRef(heading);

  useEffect(() => {
    // Tính delta ngắn nhất để kim không quay lòng vòng
    let delta = heading - prevHeading.current;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;

    const target = (rotAnim as any)._value + delta;
    prevHeading.current = heading;

    Animated.timing(rotAnim, {
      toValue: target,
      duration: 250,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [heading]);

  // La bàn thật: dial xoay, kim cố định hướng lên
  const dialRotate = rotAnim.interpolate({
    inputRange: [-360, 360],
    outputRange: ['360deg', '-360deg'],
    extrapolate: 'extend',
  });

  return (
    <View style={{ width: SIZE, height: SIZE }}>
      {/* Dial xoay (vành chia độ + nhãn) */}
      <Animated.View
        style={{
          position: 'absolute',
          width: SIZE,
          height: SIZE,
          transform: [{ rotate: dialRotate }],
        }}
      >
        <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          {/* Nền */}
          <Circle cx={CX} cy={CY} r={OUTER_R} fill="#F8FAFC" stroke="#E2E8F0" strokeWidth={0.8} />
          {/* Vòng trong */}
          <Circle cx={CX} cy={CY} r={OUTER_R - 6} fill="none" stroke="#F1F5F9" strokeWidth={0.4} />

          {/* Ticks */}
          {TICKS.map((t) => (
            <Line
              key={t.key}
              x1={t.x1} y1={t.y1}
              x2={t.x2} y2={t.y2}
              stroke={t.stroke}
              strokeWidth={t.strokeWidth}
              strokeLinecap="round"
            />
          ))}

          {/* Cardinal labels */}
          {cardinals.map(({ label, deg, color, fontSize, fontWeight }) => {
            const rad = ((deg - 90) * Math.PI) / 180;
            return (
              <SvgText
                key={label}
                x={CX + CARD_R * Math.cos(rad)}
                y={CY + CARD_R * Math.sin(rad)}
                textAnchor="middle"
                alignmentBaseline="central"
                fontSize={fontSize}
                fontWeight={fontWeight}
                fill={color}
              >
                {label}
              </SvgText>
            );
          })}
        </Svg>
      </Animated.View>

      {/* Kim cố định (không xoay) */}
      <Svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        style={{ position: 'absolute' }}
      >
        <G>
          {/* Nửa đỏ (Bắc) */}
          <Polygon
            points={`${CX},${CY - 11} ${CX - 3},${CY + 1} ${CX + 3},${CY + 1}`}
            fill="#EF4444"
          />
          {/* Nửa xám (Nam) */}
          <Polygon
            points={`${CX},${CY + 11} ${CX - 3},${CY - 1} ${CX + 3},${CY - 1}`}
            fill="#94A3B8"
          />
          {/* Trục */}
          <Circle cx={CX} cy={CY} r={2.5} fill="#FFFFFF" stroke="#CBD5E1" strokeWidth={0.8} />
          <Circle cx={CX} cy={CY} r={1} fill="#64748B" />
        </G>
      </Svg>
    </View>
  );
}