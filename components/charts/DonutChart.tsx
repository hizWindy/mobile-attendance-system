import React, { useState } from "react";
import { View, Text } from "react-native";
import Svg, { Path, Text as SvgText, G, Circle } from "react-native-svg";

interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutSlice[];
  size?: number;
  thickness?: number;
}

export const DonutChart: React.FC<DonutChartProps> = ({
  data,
  size = 160,
  thickness = 30,
}) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const baseRadius = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;

  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const describeArc = (
    startAngle: number,
    endAngle: number,
    r: number,
  ) => {
    const start = {
      x: cx + r * Math.cos(toRad(startAngle - 90)),
      y: cy + r * Math.sin(toRad(startAngle - 90)),
    };
    const end = {
      x: cx + r * Math.cos(toRad(endAngle - 90)),
      y: cy + r * Math.sin(toRad(endAngle - 90)),
    };
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
  };

  let currentAngle = 0;
  const slices = data.map((d, i) => {
    const sliceAngle = (d.value / total) * 360;
    const midAngle = currentAngle + sliceAngle / 2;
    // Offset active slice outward
    const isActive = activeIndex === i;
    const offsetR = 4;
    const offsetX = isActive ? offsetR * Math.cos(toRad(midAngle - 90)) : 0;
    const offsetY = isActive ? offsetR * Math.sin(toRad(midAngle - 90)) : 0;

    const r = baseRadius;
    const startA = currentAngle + 1;
    const endA = currentAngle + sliceAngle - 1;
    const path = describeArc(startA, endA, r);
    currentAngle += sliceAngle;
    return { ...d, path, isActive, offsetX, offsetY, midAngle, sliceAngle };
  });

  const activeSlice = activeIndex !== null ? slices[activeIndex] : null;

  return (
    <View style={{ alignItems: "center" }}>
      {/* Tooltip above */}
      {activeSlice && (
        <View className="mb-2">
          <View
            className="px-3 py-1.5 rounded-xl flex-row items-center"
            style={{ backgroundColor: activeSlice.color }}
          >
            <Text className="text-white text-xs font-bold">
              {activeSlice.label}: {activeSlice.value}{" "}
              <Text style={{ opacity: 0.75 }}>
                ({Math.round((activeSlice.value / total) * 100)}%)
              </Text>
            </Text>
          </View>
        </View>
      )}

      <Svg width={size} height={size}>
        {slices.map((slice, i) => (
          <G key={i} translateX={slice.offsetX} translateY={slice.offsetY}>
            <Path
              d={slice.path}
              stroke={slice.color}
              strokeWidth={slice.isActive ? thickness + 4 : thickness}
              strokeLinecap="round"
              fill="none"
              opacity={activeIndex !== null && !slice.isActive ? 0.3 : 1}
              onPress={() => setActiveIndex(activeIndex === i ? null : i)}
            />
          </G>
        ))}

        {/* Center: show active or total */}
        {activeSlice ? (
          <G>
            <SvgText x={cx} y={cy - 8} textAnchor="middle"
              fontSize={20} fontWeight="bold" fill={activeSlice.color}>
              {activeSlice.value}
            </SvgText>
            <SvgText x={cx} y={cy + 8} textAnchor="middle"
              fontSize={9} fill="#94a3b8">
              {activeSlice.label}
            </SvgText>
            <SvgText x={cx} y={cy + 20} textAnchor="middle"
              fontSize={9} fill={activeSlice.color} fontWeight="bold">
              {Math.round((activeSlice.value / total) * 100)}%
            </SvgText>
          </G>
        ) : (
          <G>
            <SvgText x={cx} y={cy - 6} textAnchor="middle"
              fontSize={22} fontWeight="bold" fill="#001F54">
              {total}
            </SvgText>
            <SvgText x={cx} y={cy + 12} textAnchor="middle"
              fontSize={10} fill="#94a3b8">
              Total
            </SvgText>
          </G>
        )}
      </Svg>

      <Text className="text-center text-slate-400 text-[9px] mt-1">
        Tap a segment to inspect
      </Text>
    </View>
  );
};
