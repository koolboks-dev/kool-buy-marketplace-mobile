import Svg, { Circle, Path, Rect, type SvgProps } from 'react-native-svg';

/**
 * Tab bar icons, drawn exactly like the Kool Logistics set
 * (kool-logistics_mobile/src/components/icons): 24×24 grid, 1.8 stroke, round
 * caps, and an `active` state that fills the main shape at 16%.
 * Home and User are the same paths as Kool Logistics.
 */
export interface TabIconProps extends SvgProps {
  size?: number;
  color?: string;
  active?: boolean;
}

const base = (size: number) => ({ width: size, height: size, viewBox: '0 0 24 24', fill: 'none' });
const stroke = (color: string) => ({ stroke: color, strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const });
const fill = (color: string, active?: boolean) => ({ fill: active ? color : 'none', fillOpacity: active ? 0.16 : 0 });

export function HomeIcon({ size = 24, color = '#000', active, ...rest }: TabIconProps) {
  return (
    <Svg {...base(size)} {...rest}>
      <Path d="M3.6 10.7 12 4.2l8.4 6.5V19a2 2 0 0 1-2 2h-3.6v-5.4H9.2V21H5.6a2 2 0 0 1-2-2z" {...stroke(color)} {...fill(color, active)} />
    </Svg>
  );
}

export function SearchIcon({ size = 24, color = '#000', active, ...rest }: TabIconProps) {
  return (
    <Svg {...base(size)} {...rest}>
      <Circle cx={10.8} cy={10.8} r={6.6} {...stroke(color)} {...fill(color, active)} />
      <Path d="m15.8 15.8 4.6 4.6" {...stroke(color)} />
    </Svg>
  );
}

export function CartIcon({ size = 24, color = '#000', active, ...rest }: TabIconProps) {
  return (
    <Svg {...base(size)} {...rest}>
      <Path d="M6.3 7.4h14l-1.6 7.3a1.8 1.8 0 0 1-1.8 1.4H9.4a1.8 1.8 0 0 1-1.8-1.4z" {...stroke(color)} {...fill(color, active)} />
      <Path d="M3.4 3.9h2.1l.8 3.5" {...stroke(color)} />
      <Circle cx={9.8} cy={19.6} r={1.2} {...stroke(color)} />
      <Circle cx={16.8} cy={19.6} r={1.2} {...stroke(color)} />
    </Svg>
  );
}

export function LayersIcon({ size = 24, color = '#000', active, ...rest }: TabIconProps) {
  return (
    <Svg {...base(size)} {...rest}>
      <Path d="M12 3.6 20.4 8 12 12.4 3.6 8z" {...stroke(color)} {...fill(color, active)} />
      <Path d="m3.6 12 8.4 4.4 8.4-4.4" {...stroke(color)} />
      <Path d="m3.6 16 8.4 4.4 8.4-4.4" {...stroke(color)} strokeOpacity={0.55} />
    </Svg>
  );
}

export function UserIcon({ size = 24, color = '#000', active, ...rest }: TabIconProps) {
  return (
    <Svg {...base(size)} {...rest}>
      <Circle cx={12} cy={8.2} r={3.7} {...stroke(color)} {...fill(color, active)} />
      <Path d="M4.9 20.4a7.3 7.3 0 0 1 14.2 0" {...stroke(color)} />
    </Svg>
  );
}

export function StoreIcon({ size = 24, color = '#000', active, ...rest }: TabIconProps) {
  return (
    <Svg {...base(size)} {...rest}>
      <Path d="M5.2 11v8.2a1.8 1.8 0 0 0 1.8 1.8h10a1.8 1.8 0 0 0 1.8-1.8V11" {...stroke(color)} {...fill(color, active)} />
      <Path d="M3.6 8.6 5.4 4h13.2l1.8 4.6a2.8 2.8 0 0 1-5.6 0 2.8 2.8 0 0 1-5.6 0 2.8 2.8 0 0 1-5.6 0z" {...stroke(color)} />
      <Path d="M10 21v-4.6h4V21" {...stroke(color)} strokeOpacity={0.55} />
    </Svg>
  );
}

export function GridIcon({ size = 24, color = '#000', active, ...rest }: TabIconProps) {
  return (
    <Svg {...base(size)} {...rest}>
      <Rect x={3.8} y={3.8} width={7} height={7} rx={1.8} {...stroke(color)} {...fill(color, active)} />
      <Rect x={13.2} y={3.8} width={7} height={7} rx={1.8} {...stroke(color)} />
      <Rect x={3.8} y={13.2} width={7} height={7} rx={1.8} {...stroke(color)} />
      <Rect x={13.2} y={13.2} width={7} height={7} rx={1.8} {...stroke(color)} {...fill(color, active)} />
    </Svg>
  );
}

export const TabIcons = {
  home: HomeIcon,
  search: SearchIcon,
  cart: CartIcon,
  layers: LayersIcon,
  user: UserIcon,
  store: StoreIcon,
  grid: GridIcon,
};

export type TabIconName = keyof typeof TabIcons;
