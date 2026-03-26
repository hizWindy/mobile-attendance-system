import React from "react";
import { View } from "react-native";
import Svg, { Polyline, Circle, Line, Text as SvgText, G } from "react-native-svg";

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
  const chartWidth = 320;
  const chartHeight = height;
  const paddingLeft = 28;
  const paddingBottom = 24;
  const paddingTop = 12;
  const innerHeight = chartHeight - paddingBottom - paddingTop;
  const innerWidth = chartWidth - paddingLeft - 8;
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const minVal = Math.min(...data.map((d) => d.value), 0);
  const range = maxVal - minVal || 1;

  const getX = (i: number) =>
    paddingLeft + (i / (data.length - 1)) * innerWidth;
  const getY = (v: number) =>
    paddingTop + innerHeight - ((v - minVal) / range) * innerHeight;

  const points = data.map((d, i) => `${getX(i)},${getY(d.value)}`).join(" ");

  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={chartWidth} height={chartHeight}>
        {/* Guide lines */}
        {[0, 0.5, 1].map((ratio) => {
          const y = paddingTop + innerHeight * (1 - ratio);
          const val = Math.round(minVal + range * ratio);
          return (
            <G key={ratio}>
              <Line
                x1={paddingLeft}
                y1={y}
                x2={chartWidth - 8}
                y2={y}
                stroke="#e2e8f0"
                strokeWidth={1}
                strokeDasharray="4,3"
              />
              <SvgText
                x={paddingLeft - 4}
                y={y + 4}
                fontSize={8}
                fill="#94a3b8"
                textAnchor="end"
              >
                {val}
              </SvgText>
            </G>
          );
        })}

        {/* Line */}
        <Polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Dots + labels */}
        {data.map((d, i) => (
          <G key={i}>
            <Circle
              cx={getX(i)}
              cy={getY(d.value)}
              r={4}
              fill="white"
              stroke={color}
              strokeWidth={2.5}
            />
            <SvgText
              x={getX(i)}
              y={chartHeight - 4}
              fontSize={8}
              fill="#94a3b8"
              textAnchor="middle"
            >
              {d.label}
            </SvgText>
          </G>
        ))}
      </Svg>
    </View>
  );
};
