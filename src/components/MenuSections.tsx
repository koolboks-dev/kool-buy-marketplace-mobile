import { router } from 'expo-router';
import { View } from 'react-native';

import { Card, ListRow, Text } from '@/components/ui';
import { groupBySection, type MenuItem } from '@/lib/nav';

/** A sidebar config rendered as grouped cards of rows (mobile side nav). */
export function MenuSections({ items }: { items: MenuItem[] }) {
  return (
    <View style={{ gap: 16 }}>
      {groupBySection(items).map((g, gi) => (
        <View key={g.section ?? `g${gi}`} style={{ gap: 8 }}>
          {g.section ? <Text variant="overline">{g.section}</Text> : null}
          <Card padding={0} style={{ overflow: 'hidden' }}>
            {g.items.map((item, i) => (
              <ListRow key={item.href + item.label} icon={item.icon} title={item.label} subtitle={item.subtitle} onPress={() => router.push(item.href as never)} last={i === g.items.length - 1} />
            ))}
          </Card>
        </View>
      ))}
    </View>
  );
}
