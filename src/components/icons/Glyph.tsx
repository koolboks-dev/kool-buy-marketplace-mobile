import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { FILL_OPACITY, GLYPHS, type GlyphName, type GlyphPart } from './glyph-data';

export type { GlyphName };

/**
 * <Glyph name="cart" size={20} color={colors.text} />
 * Plain line icons in the KoolBuy house style. `filled` tints every closed
 * shape (used for the active tab and "saved" hearts).
 */
export function Glyph({
  name,
  size = 20,
  color = '#050711',
  strokeWidth = 1.8,
  filled = false,
}: {
  name: GlyphName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  filled?: boolean;
}) {
  const parts: readonly GlyphPart[] = GLYPHS[name] ?? GLYPHS.info;
  const s = { stroke: color, strokeWidth, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {parts.map((p, i) => {
        const wantsFill = filled || ('fill' in p && p.fill);
        const fill = wantsFill ? color : 'none';
        const fillOpacity = wantsFill ? (filled && !('fill' in p && p.fill) ? 0.14 : FILL_OPACITY) : 0;
        if ('circle' in p) {
          const [cx, cy, r] = p.circle;
          if ('solid' in p && p.solid) return <Circle key={i} cx={cx} cy={cy} r={r + 0.4} fill={color} />;
          return <Circle key={i} cx={cx} cy={cy} r={r} {...s} fill={fill} fillOpacity={fillOpacity} />;
        }
        if ('rect' in p) {
          const [x, y, w, h, r] = p.rect;
          return <Rect key={i} x={x} y={y} width={w} height={h} rx={r} {...s} fill={fill} fillOpacity={fillOpacity} />;
        }
        return <Path key={i} d={p.d} {...s} fill={fill} fillOpacity={fillOpacity} />;
      })}
    </Svg>
  );
}

/** Filled rating star (amber-400) — the one place yellow is used. */
export function StarIcon({ size = 14, color = '#FFB020', empty = false, emptyColor = '#DEE2E6' }: { size?: number; color?: string; empty?: boolean; emptyColor?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 3.2l2.7 5.6 6.1.8-4.5 4.2 1.2 6L12 16.9l-5.5 2.9 1.2-6-4.5-4.2 6.1-.8L12 3.2Z" fill={empty ? emptyColor : color} />
    </Svg>
  );
}
