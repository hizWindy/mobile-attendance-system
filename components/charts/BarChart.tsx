import React, { useState } from "react";
import { Text, View } from "react-native";
import Svg, {
  Defs,
  G,
  Line,
  LinearGradient,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";

interface BarData {
  label: string;
  value: number;
}

interface BarChartProps {
  data: BarData[];
  color?: string;
  activeColor?: string;
  height?: number;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  color = "#001F54",
  activeColor = "#2563eb",
  height = 180,
}) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const chartWidth = 320;
  const chartHeight = height;
  const paddingLeft = 28;
  const paddingTop = 36; // extra room for in-SVG tooltip
  const paddingBottom = 28;
  const innerHeight = chartHeight - paddingBottom - paddingTop;
  const innerWidth = chartWidth - paddingLeft - 8;
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const barWidth = (innerWidth / data.length) * 0.55;
  const gap = (innerWidth / data.length) * 0.45;

  const getBarX = (i: number) => paddingLeft + i * (barWidth + gap) + gap / 2;
  const getBarY = (v: number) =>
    paddingTop + innerHeight - (v / maxVal) * innerHeight;

  return (
    <View>
      <Svg width={chartWidth} height={chartHeight}>
        <Defs>
          <LinearGradient id="barGradActive" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={activeColor} stopOpacity="1" />
            <Stop offset="1" stopColor={color} stopOpacity="0.85" />
          </LinearGradient>
        </Defs>

        {/* Guide lines */}
        {[0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = paddingTop + innerHeight - ratio * innerHeight;
          return (
            <G key={ratio}>
              <Line
                x1={paddingLeft} y1={y} x2={chartWidth - 8} y2={y}
                stroke="#e2e8f0" strokeWidth={1} strokeDasharray="4,4"
              />
              <SvgText x={paddingLeft - 4} y={y + 4} fontSize={8}
                fill="#94a3b8" textAnchor="end">
                {Math.round(maxVal * ratio)}
              </SvgText>
            </G>
          );
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const barH = Math.max((d.value / maxVal) * innerHeight, 2);
          const x = getBarX(i);
          const y = getBarY(d.value);
          const isActive = activeIndex === i;

          return (
            <G key={i}>
              {/* Invisible press area */}
              <Rect
                x={x - 6} y={paddingTop} width={barWidth + 12}
                height={innerHeight + paddingBottom}
                fill="transparent"
                onPress={() => setActiveIndex(isActive ? null : i)}
              />
              {/* Bar */}
              <Rect
                x={x} y={y} width={barWidth} height={barH}
                rx={5} ry={5}
                fill={isActive ? "url(#barGradActive)" : color}
                opacity={activeIndex !== null && !isActive ? 0.25 : 0.9}
              />
              {/* Glow ring */}
              {isActive && (
                <Rect
                  x={x - 2} y={y - 1} width={barWidth + 4} height={barH + 1}
                  rx={6} ry={6} fill="none"
                  stroke={activeColor} strokeWidth={1.5} opacity={0.5}
                />
              )}
              {/* X-axis label */}
              <SvgText
                x={x + barWidth / 2} y={chartHeight - 6} fontSize={8}
                fill={isActive ? activeColor : "#94a3b8"} textAnchor="middle"
                fontWeight={isActive ? "bold" : "normal"}
              >
                {d.label}
              </SvgText>
            </G>
          );
        })}

        {/* In-SVG Tooltip — appears inside paddingTop area, never clips */}
        {activeIndex !== null && (() => {
          const d = data[activeIndex];
          const x = getBarX(activeIndex);
          const tooltipW = 72;
          const tooltipX = Math.min(
            Math.max(x + barWidth / 2 - tooltipW / 2, paddingLeft),
            chartWidth - tooltipW - 4
          );
          return (
            <G>
              <Rect
                x={tooltipX} y={4} width={tooltipW} height={22}
                rx={8} ry={8} fill="#001F54"
              />
              {/* Small arrow */}
              <Rect
                x={tooltipX + tooltipW / 2 - 5} y={22}
                width={10} height={8} rx={2} fill="#001F54"
                rotation={45}
                origin={`${tooltipX + tooltipW / 2}, 26`}
              />
              <SvgText
                x={tooltipX + tooltipW / 2} y={19} fontSize={9}
                fill="white" textAnchor="middle" fontWeight="bold"
              >
                {d.label}: {d.value}
              </SvgText>
            </G>
          );
        })()}
      </Svg>

      <Text className="text-center text-slate-400 text-[9px] -mt-1">
        Tap a bar to inspect
      </Text>
    </View>
  );
};
