import React, { useState } from "react";
import { View, Text } from "react-native";
import Svg, {
  Polyline,
  Circle,
  Line,
  Text as SvgText,
  G,
  Rect,
  Defs,
  LinearGradient,
  Stop,
  Path,
} from "react-native-svg";

interface LinePoint {
  label: string;
  value: number;
}

interface LineChartProps {
  data: LinePoint[];
  color?: string;
  height?: number;
}

export const LineChart: React.FC<LineChartProps> = ({
  data,
  color = "#2563eb",
  height = 140,
}) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const chartWidth = 320;
  const chartHeight = height;
  const paddingLeft = 28;
  const paddingBottom = 24;
  const paddingTop = 16;
  const innerHeight = chartHeight - paddingBottom - paddingTop;
  const innerWidth = chartWidth - paddingLeft - 8;
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const minVal = Math.min(...data.map((d) => d.value), 0);
  const range = maxVal - minVal || 1;

  const getX = (i: number) => paddingLeft + (i / (data.length - 1)) * innerWidth;
  const getY = (v: number) => paddingTop + innerHeight - ((v - minVal) / range) * innerHeight;

  const points = data.map((d, i) => `${getX(i)},${getY(d.value)}`).join(" ");

  // Fill path for area under the line
  const firstX = getX(0);
  const lastX = getX(data.length - 1);
  const baseY = paddingTop + innerHeight;
  const areaPath =
    `M ${firstX},${baseY} ` +
    data.map((d, i) => `L ${getX(i)},${getY(d.value)}`).join(" ") +
    ` L ${lastX},${baseY} Z`;

  return (
    <View>
      {/* Tooltip */}
      {activeIndex !== null && (
        <View className="items-center mb-2">
          <View className="bg-[#2563eb] px-3 py-1.5 rounded-xl flex-row items-center">
            <Text className="text-white text-xs font-bold">
              {data[activeIndex].label}: {" "}
              <Text className="text-blue-200">{data[activeIndex].value}</Text>
            </Text>
          </View>
        </View>
      )}

      <Svg width={chartWidth} height={chartHeight}>
        <Defs>
          <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.18" />
            <Stop offset="1" stopColor={color} stopOpacity="0" />
          </LinearGradient>
        </Defs>

        {/* Guide lines */}
        {[0, 0.5, 1].map((ratio) => {
          const y = paddingTop + innerHeight * (1 - ratio);
          const val = Math.round(minVal + range * ratio);
          return (
            <G key={ratio}>
              <Line x1={paddingLeft} y1={y} x2={chartWidth - 8} y2={y}
                stroke="#e2e8f0" strokeWidth={1} strokeDasharray="4,3" />
              <SvgText x={paddingLeft - 4} y={y + 4} fontSize={8} fill="#94a3b8" textAnchor="end">
                {val}
              </SvgText>
            </G>
          );
        })}

        {/* Area fill */}
        <Path d={areaPath} fill="url(#areaGrad)" />

        {/* Main line */}
        <Polyline points={points} fill="none" stroke={color}
          strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />

        {/* Invisible hit areas per point */}
        {data.map((d, i) => (
          <Rect
            key={`hit-${i}`}
            x={getX(i) - 18}
            y={0}
            width={36}
            height={chartHeight}
            fill="transparent"
            onPress={() => setActiveIndex(activeIndex === i ? null : i)}
          />
        ))}

        {/* Dots */}
        {data.map((d, i) => {
          const isActive = activeIndex === i;
          return (
            <G key={i}>
              {/* Outer glow ring when active */}
              {isActive && (
                <Circle cx={getX(i)} cy={getY(d.value)} r={8}
                  fill={color} opacity={0.15} />
              )}
              <Circle
                cx={getX(i)} cy={getY(d.value)}
                r={isActive ? 5.5 : 4}
                fill="white"
                stroke={color}
                strokeWidth={isActive ? 3 : 2.5}
              />
              {/* X label */}
              <SvgText x={getX(i)} y={chartHeight - 4} fontSize={8}
                fill={isActive ? color : "#94a3b8"} textAnchor="middle"
                fontWeight={isActive ? "bold" : "normal"}>
                {d.label}
              </SvgText>
            </G>
          );
        })}
      </Svg>

      <Text className="text-center text-slate-400 text-[9px] mt-1">
        Tap a point to inspect
      </Text>
    </View>
  );
};
