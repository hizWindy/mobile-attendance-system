import React from "react";
import { View } from "react-native";
import Svg, { Circle, Path, Text as SvgText, G } from "react-native-svg";

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
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const radius = (size - thickness) / 2;
  const cx = size / 2;
  const cy = size / 2;

  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const describeArc = (
    startAngle: number,
    endAngle: number,
  ) => {
    const start = {
      x: cx + radius * Math.cos(toRad(startAngle - 90)),
      y: cy + radius * Math.sin(toRad(startAngle - 90)),
    };
    const end = {
      x: cx + radius * Math.cos(toRad(endAngle - 90)),
      y: cy + radius * Math.sin(toRad(endAngle - 90)),
    };
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`;
  };

  let currentAngle = 0;
  const slices = data.map((d) => {
    const sliceAngle = (d.value / total) * 360;
    const path = describeArc(currentAngle, currentAngle + sliceAngle - 1);
    currentAngle += sliceAngle;
    return { ...d, path };
  });

  return (
    <View style={{ alignItems: "center" }}>
      <Svg width={size} height={size}>
        <G>
          {slices.map((slice, i) => (
            <Path
              key={i}
              d={slice.path}
              stroke={slice.color}
              strokeWidth={thickness}
              strokeLinecap="round"
              fill="none"
            />
          ))}
          {/* Center label */}
          <SvgText
            x={cx}
            y={cy - 6}
            textAnchor="middle"
            fontSize={22}
            fontWeight="bold"
            fill="#001F54"
          >
            {total}
          </SvgText>
          <SvgText
            x={cx}
            y={cy + 12}
            textAnchor="middle"
            fontSize={10}
            fill="#94a3b8"
          >
            Total
          </SvgText>
        </G>
      </Svg>
    </View>
  );
};
