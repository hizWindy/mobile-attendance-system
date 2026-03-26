import React from "react";
import { View, Text } from "react-native";
import Svg, { Rect, Text as SvgText, G, Line } from "react-native-svg";

interface BarData {
  label: string;
  value: number;
}

interface BarChartProps {
  data: BarData[];
  color?: string;
  maxValue?: number;
  height?: number;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  color = "#001F54",
  height = 160,
}) => {
  const chartWidth = 320;
  const chartHeight = height;
  const paddingLeft = 28;
  const paddingBottom = 28;
  const innerHeight = chartHeight - paddingBottom;
  const innerWidth = chartWidth - paddingLeft;
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const barWidth = (innerWidth / data.length) * 0.55;
  const gap = (innerWidth / data.length) * 0.45;

  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={chartWidth} height={chartHeight}>
        {/* Horizontal guide lines */}
        {[0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = innerHeight - ratio * innerHeight;
          return (
            <G key={ratio}>
              <Line
                x1={paddingLeft}
                y1={y}
                x2={chartWidth}
                y2={y}
                stroke="#e2e8f0"
                strokeWidth={1}
                strokeDasharray="4,4"
              />
              <SvgText
                x={paddingLeft - 4}
                y={y + 4}
                fontSize={8}
                fill="#94a3b8"
                textAnchor="end"
              >
                {Math.round(maxVal * ratio)}
              </SvgText>
            </G>
          );
        })}

        {data.map((d, i) => {
          const barH = (d.value / maxVal) * innerHeight;
          const x = paddingLeft + i * (barWidth + gap) + gap / 2;
          const y = innerHeight - barH;

          return (
            <G key={i}>
              {/* Bar */}
              <Rect
                x={x}
                y={y}
                width={barWidth}
                height={barH}
                rx={5}
                ry={5}
                fill={color}
                opacity={0.9}
              />
              {/* Value label on top */}
              <SvgText
                x={x + barWidth / 2}
                y={y - 4}
                fontSize={8}
                fill={color}
                textAnchor="middle"
                fontWeight="bold"
              >
                {d.value}
              </SvgText>
              {/* X label */}
              <SvgText
                x={x + barWidth / 2}
                y={chartHeight - 4}
                fontSize={8}
                fill="#94a3b8"
                textAnchor="middle"
              >
                {d.label}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    </View>
  );
};
