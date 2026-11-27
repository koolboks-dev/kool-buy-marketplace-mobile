/**
 * Dashboard kit for mobile — KpiTile, AreaChart, BarChart, Donut — after the
 * web's components/dashboard/kit.tsx: one measure over time is Koolboks
 * orange; categorical breakdowns use the SERIES palette.
 */
import { useState, type ReactNode } from 'react';
import { Pressable, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Line, Path, Rect, Stop } from 'react-native-svg';

import { Glyph, type GlyphName } from '@/components/icons/Glyph';
import { radius, SERIES, useTheme } from '@/theme';

import { Text } from './Text';

export function pctChange(value: number, previous: number): number | null {
  if (!previous) return value ? null : 0;
  return ((value - previous) / Math.abs(previous)) * 100;
}

function Sparkline({ data, width, height, color }: { data: number[]; width: number; height: number; color: string }) {
  if (data.length < 2 || width <= 0) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const step = width / (data.length - 1);
  const y = (v: number) => height - ((v - min) / (max - min || 1)) * (height - 2) - 1;
  const d = data.map((v, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  return (
    <Svg width={width} height={height}>
      <Path d={d} stroke={color} strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Number, ▲/▼ vs the previous period, hint and an orange sparkline. */
export function KpiTile({
  label,
  value,
  previous,
  current,
  hint,
  icon,
  spark,
  invert,
  onPress,
}: {
  label: string;
  value: string;
  current?: number;
  previous?: number;
  hint?: string;
  icon?: GlyphName;
  spark?: number[];
  invert?: boolean;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  const [w, setW] = useState(0);
  const change = current != null && previous != null ? pctChange(current, previous) : null;
  const up = (change ?? 0) >= 0;
  const good = invert ? !up : up;
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}
      style={{ flex: 1, minWidth: 150, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 14, gap: 6 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <Text variant="caption" weight="medium" numberOfLines={1} style={{ flex: 1 }}>
          {label}
        </Text>
        {icon ? (
          <View style={{ width: 30, height: 30, borderRadius: radius.md, backgroundColor: colors.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Glyph name={icon} size={16} color={colors.brand} />
          </View>
        ) : null}
      </View>
      <Text variant="title" size={22} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 16 }}>
        {change != null ? (
          <Text size={12} weight="semibold" color={good ? colors.successText : colors.dangerText}>
            {up ? '▲' : '▼'} {Math.abs(change).toFixed(1)}%
          </Text>
        ) : null}
        {hint ? (
          <Text variant="caption" numberOfLines={1} style={{ flex: 1 }}>
            {hint}
          </Text>
        ) : null}
      </View>
      {spark && spark.length > 1 && w > 0 ? <Sparkline data={spark} width={w - 28} height={26} color={colors.brand} /> : null}
    </Pressable>
  );
}

/** Small "label / value" stat tile (no chart). */
export function StatTile({ label, value, icon, tone }: { label: string; value: string | number; icon?: GlyphName; tone?: 'brand' | 'neutral' }) {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, minWidth: 140, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 14, gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        {icon ? (
          <View style={{ width: 28, height: 28, borderRadius: radius.md, backgroundColor: tone === 'neutral' ? colors.muted : colors.brandSoft, alignItems: 'center', justifyContent: 'center' }}>
            <Glyph name={icon} size={15} color={tone === 'neutral' ? colors.text : colors.brand} />
          </View>
        ) : null}
        <Text variant="caption" weight="medium" numberOfLines={1} style={{ flex: 1 }}>
          {label}
        </Text>
      </View>
      <Text variant="title" size={20} numberOfLines={1} adjustsFontSizeToFit>
        {String(value)}
      </Text>
    </View>
  );
}

/** One measure over time: orange area chart with a soft fill. */
export function AreaChart({ data, height = 160, labels }: { data: number[]; height?: number; labels?: string[] }) {
  const { colors } = useTheme();
  const [w, setW] = useState(0);
  const pad = 4;
  const max = Math.max(...data, 1);
  const step = data.length > 1 ? (w - pad * 2) / (data.length - 1) : 0;
  const y = (v: number) => pad + (height - pad * 2) * (1 - v / max);
  const line = data.map((v, i) => `${i === 0 ? 'M' : 'L'}${(pad + i * step).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = data.length > 1 ? `${line} L${(pad + (data.length - 1) * step).toFixed(1)},${height - pad} L${pad},${height - pad} Z` : '';
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w > 0 && data.length > 1 ? (
        <Svg width={w} height={height}>
          <Defs>
            <LinearGradient id="kbArea" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.brand} stopOpacity={0.22} />
              <Stop offset="1" stopColor={colors.brand} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          {[0.25, 0.5, 0.75].map((f) => (
            <Line key={f} x1={0} x2={w} y1={height * f} y2={height * f} stroke={colors.border} strokeDasharray="3 4" />
          ))}
          <Path d={area} fill="url(#kbArea)" />
          <Path d={line} stroke={colors.brand} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        </Svg>
      ) : (
        <View style={{ height, alignItems: 'center', justifyContent: 'center' }}>
          <Text variant="caption">Not enough data yet</Text>
        </View>
      )}
      {labels && labels.length > 1 ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
          <Text variant="caption">{labels[0]}</Text>
          <Text variant="caption">{labels[Math.floor(labels.length / 2)]}</Text>
          <Text variant="caption">{labels[labels.length - 1]}</Text>
        </View>
      ) : null}
    </View>
  );
}

/** Vertical bars (monthly revenue). */
export function BarChart({ data, height = 150, color }: { data: { label: string; value: number }[]; height?: number; color?: string }) {
  const { colors } = useTheme();
  const [w, setW] = useState(0);
  const max = Math.max(...data.map((d) => d.value), 1);
  const gap = 6;
  const bw = data.length ? Math.max(4, (w - gap * (data.length - 1)) / data.length) : 0;
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w > 0 ? (
        <Svg width={w} height={height}>
          {data.map((d, i) => {
            const h = Math.max(2, (d.value / max) * (height - 4));
            return <Rect key={i} x={i * (bw + gap)} y={height - h} width={bw} height={h} rx={3} fill={color ?? colors.brand} opacity={d.value ? 1 : 0.25} />;
          })}
        </Svg>
      ) : (
        <View style={{ height }} />
      )}
      <View style={{ flexDirection: 'row', marginTop: 6 }}>
        {data.map((d, i) => (
          <Text key={i} variant="caption" size={10} align="center" style={{ width: bw, marginRight: i === data.length - 1 ? 0 : gap }} numberOfLines={1}>
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

/** Categorical breakdown: donut + legend. */
export function Donut({ data, size = 132, centerLabel, centerValue }: { data: { label: string; value: number; color?: string }[]; size?: number; centerLabel?: string; centerValue?: string }) {
  const { colors } = useTheme();
  const total = data.reduce((s, d) => s + d.value, 0);
  const r = size / 2 - 10;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
            <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.mutedStrong} strokeWidth={16} fill="none" />
            {total > 0
              ? data.map((d, i) => {
                  const len = (d.value / total) * c;
                  const el = (
                    <Circle
                      key={i}
                      cx={size / 2}
                      cy={size / 2}
                      r={r}
                      stroke={d.color ?? SERIES[i % SERIES.length]}
                      strokeWidth={16}
                      fill="none"
                      strokeDasharray={`${len} ${c - len}`}
                      strokeDashoffset={-offset}
                    />
                  );
                  offset += len;
                  return el;
                })
              : null}
          </G>
        </Svg>
        <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
          <Text variant="subtitle">{centerValue ?? String(total)}</Text>
          {centerLabel ? <Text variant="caption">{centerLabel}</Text> : null}
        </View>
      </View>
      <View style={{ flex: 1, minWidth: 140, gap: 6 }}>
        {data.map((d, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: d.color ?? SERIES[i % SERIES.length] }} />
            <Text size={13} style={{ flex: 1 }} numberOfLines={1}>
              {d.label}
            </Text>
            <Text size={13} weight="semibold" color={colors.text}>
              {d.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Chart card: title + optional right control + chart body. */
export function ChartCard({ title, subtitle, right, children }: { title: string; subtitle?: string; right?: ReactNode; children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, padding: 16, gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Text variant="subtitle">{title}</Text>
          {subtitle ? <Text variant="caption">{subtitle}</Text> : null}
        </View>
        {right}
      </View>
      {children}
    </View>
  );
}
