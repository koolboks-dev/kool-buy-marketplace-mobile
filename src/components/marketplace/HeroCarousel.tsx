import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { FlatList, Linking, Pressable, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import { Button, Text } from '@/components/ui';
import { DEFAULT_HERO_COPY, type HeroBanner } from '@/services/catalog';
import { radius, useTheme } from '@/theme';

function openLink(url?: string) {
  if (!url) return router.push('/(tabs)/browse');
  if (/^https?:\/\//.test(url)) return Linking.openURL(url);
  if (url.startsWith('/vendors/')) {
    const id = url.split('/')[2];
    if (id) return router.push({ pathname: '/vendor/[id]', params: { id } });
  }
  if (url.startsWith('/search')) return router.push('/search');
  return router.push('/(tabs)/browse');
}

/**
 * The market page hero slider (Admin → Hero Banners): image, badge, title,
 * subtitle and the two CTAs, auto-advancing by each banner's duration.
 */
export function HeroCarousel({ banners, width }: { banners: HeroBanner[]; width: number }) {
  const { colors } = useTheme();
  const list = banners.filter((b) => b.is_active !== false);
  const [index, setIndex] = useState(0);
  const ref = useRef<FlatList<HeroBanner>>(null);
  const height = Math.round(Math.min(360, Math.max(220, width * 0.62)));

  useEffect(() => {
    if (list.length < 2) return;
    const ms = Math.max(3000, Math.min(list[index]?.duration || 5000, 20000));
    const t = setTimeout(() => {
      const next = (index + 1) % list.length;
      ref.current?.scrollToOffset({ offset: next * width, animated: true });
      setIndex(next);
    }, ms);
    return () => clearTimeout(t);
  }, [index, list, width]);

  const onEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => setIndex(Math.round(e.nativeEvent.contentOffset.x / Math.max(width, 1)));

  if (list.length === 0) {
    return (
      <View style={{ width, height, borderRadius: radius.xl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: 20, justifyContent: 'flex-end', gap: 8 }}>
        <Text variant="overline" color={colors.brandText}>
          {DEFAULT_HERO_COPY.badge}
        </Text>
        <Text variant="display">{DEFAULT_HERO_COPY.title}</Text>
        <Text variant="secondary">{DEFAULT_HERO_COPY.subtitle}</Text>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
          <Button label="Shop now" variant="primary" onPress={() => router.push('/(tabs)/browse')} />
          <Button label="Weekly spend" variant="outline" onPress={() => router.push('/search')} />
        </View>
      </View>
    );
  }

  return (
    <View>
      <FlatList
        ref={ref}
        data={list}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onEnd}
        keyExtractor={(b) => b.id}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        style={{ borderRadius: radius.xl, overflow: 'hidden' }}
        renderItem={({ item }) => {
          const s = item.text_style ?? {};
          const shade = s.shade ?? 'dark';
          const titleColor = s.title_color || (shade === 'light' ? '#0A0A0A' : '#FFFFFF');
          const subColor = s.subtitle_color || titleColor;
          return (
            <Pressable onPress={() => openLink(item.link_url)} style={{ width, height }} accessibilityRole="link" accessibilityLabel={item.title}>
              <Image source={{ uri: item.image_url }} style={{ position: 'absolute', width: '100%', height: '100%' }} contentFit="cover" transition={200} />
              {shade !== 'none' ? (
                <View style={{ position: 'absolute', inset: 0, backgroundColor: shade === 'light' ? 'rgba(255,255,255,0.45)' : 'rgba(5,7,17,0.42)' }} />
              ) : null}
              <View style={{ flex: 1, justifyContent: 'flex-end', padding: 20, gap: 6 }}>
                {s.show_badge !== false && (s.badge || DEFAULT_HERO_COPY.badge) ? (
                  <View style={{ alignSelf: 'flex-start', backgroundColor: colors.brand, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text size={11} weight="semibold" color="#FFFFFF">
                      {s.badge || DEFAULT_HERO_COPY.badge}
                    </Text>
                  </View>
                ) : null}
                {s.show_title !== false ? (
                  <Text variant="display" color={titleColor} numberOfLines={2}>
                    {item.title || DEFAULT_HERO_COPY.title}
                  </Text>
                ) : null}
                {s.show_subtitle !== false && (item.subtitle || DEFAULT_HERO_COPY.subtitle) ? (
                  <Text size={15} color={subColor} numberOfLines={2}>
                    {item.subtitle || DEFAULT_HERO_COPY.subtitle}
                  </Text>
                ) : null}
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                  <Button label="Shop now" variant="primary" onPress={() => openLink(item.link_url)} />
                </View>
              </View>
            </Pressable>
          );
        }}
      />
      {list.length > 1 ? (
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 }}>
          {list.map((b, i) => (
            <View key={b.id} style={{ width: i === index ? 18 : 6, height: 6, borderRadius: 3, backgroundColor: i === index ? colors.brand : colors.borderStrong }} />
          ))}
        </View>
      ) : null}
    </View>
  );
}
