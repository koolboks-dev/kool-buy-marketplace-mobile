import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Card, Input, Screen, Select, SmartImage, SwitchRow, Text, useToast } from '@/components/ui';
import { useAsync } from '@/hooks/useAsync';
import { errorMessage } from '@/lib/api';
import { listProductCategories, listTemperatureTypes } from '@/services/catalog';
import { createProducts, listMyProducts, productImage, updateMyProduct } from '@/services/seller';
import type { SellerProduct } from '@/services/types';
import { getCached } from '@/store/cache';
import { radius, useTheme } from '@/theme';

const UNITS = ['kg', 'g', 'litre', 'crate', 'bag', 'block', 'pack', 'dozen', 'piece', 'carton', 'carcass', 'tuber'];

interface Form {
  name: string;
  description: string;
  category: string;
  otherLabel: string;
  temp: string;
  unit: string;
  price: string;
  shipping: string;
  stock: string;
  imageUrl: string;
  inStock: boolean;
  fresh: boolean;
  active: boolean;
}

const BLANK: Form = { name: '', description: '', category: '', otherLabel: '', temp: '', unit: 'kg', price: '', shipping: '', stock: '', imageUrl: '', inStock: true, fresh: true, active: true };

function fromProduct(p: SellerProduct | null | undefined): Form {
  if (!p) return BLANK;
  return {
    name: p.name,
    description: p.description ?? '',
    category: p.category?.value ?? '',
    otherLabel: '',
    temp: p.product_type?.value ?? '',
    unit: p.unit || 'kg',
    price: String(p.price ?? ''),
    shipping: p.shipping_fee != null ? String(p.shipping_fee) : '',
    stock: p.stock_quantity != null ? String(p.stock_quantity) : '',
    imageUrl: productImage(p),
    inStock: p.in_stock,
    fresh: p.fresh_stock,
    active: p.is_active,
  };
}

/** Add or edit a product (web Add Product modal / product edit). */
export default function SellerProductEdit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';
  const { colors } = useTheme();
  const toast = useToast();
  const cats = useAsync(() => listProductCategories().then((r) => r.items ?? []), []);
  const temps = useAsync(() => listTemperatureTypes().then((r) => r.items ?? []), []);
  const existing = useAsync<SellerProduct | null>(
    async () => {
      if (isNew) return null;
      const c = getCached<SellerProduct>('seller-product', id);
      if (c) return c;
      const r = await listMyProducts(1, 200);
      return r.items.find((p) => p.id === id) ?? null;
    },
    [id],
  );

  const [edits, setEdits] = useState<Partial<Form>>({});
  const [saving, setSaving] = useState(false);
  const f: Form = { ...fromProduct(existing.data), ...edits };
  const set = <K extends keyof Form>(k: K) => (v: Form[K]) => setEdits((e) => ({ ...e, [k]: v }));

  const save = async () => {
    if (!f.name.trim()) return toast.show('Enter a product name.', 'error');
    if (!f.category) return toast.show('Choose a category.', 'error');
    if (f.category === 'others' && !f.otherLabel.trim()) return toast.show('Describe the product for “Others”.', 'error');
    if (!f.temp) return toast.show('Choose a temperature type.', 'error');
    const priceNum = Number(f.price);
    if (!Number.isFinite(priceNum) || priceNum <= 0) return toast.show('Enter a valid price.', 'error');
    setSaving(true);
    const body = {
      name: f.name.trim(),
      description: f.description.trim() || undefined,
      category: f.category,
      other_label: f.category === 'others' ? f.otherLabel.trim() : undefined,
      temperature_type: f.temp,
      unit: f.unit,
      price: priceNum.toFixed(2),
      shipping_fee: f.shipping ? Number(f.shipping).toFixed(2) : undefined,
      image_url: f.imageUrl.trim() || undefined,
      in_stock: f.inStock,
      fresh_stock: f.fresh,
      stock_quantity: f.stock === '' ? null : Number(f.stock),
    };
    try {
      if (isNew) await createProducts([body]);
      else await updateMyProduct(id, { ...body, is_active: f.active });
      toast.show(isNew ? 'Product added' : 'Product saved', 'success');
      router.back();
    } catch (err) {
      toast.show(errorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen title={isNew ? 'Add product' : 'Edit product'} subtitle={existing.data?.name} narrow footer={<Button label={isNew ? 'Add product' : 'Save changes'} variant="ink" full loading={saving} onPress={save} />}>
      <Card style={{ gap: 12 }}>
        {f.imageUrl ? <SmartImage uri={f.imageUrl} category={f.category} style={{ width: '100%', height: 180, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border }} /> : null}
        <Input label="Image URL" value={f.imageUrl} onChangeText={set('imageUrl')} autoCapitalize="none" placeholder="https://…" hint="Paste an image link, or upload photos from the web dashboard." icon="image" />
        <Input label="Product name" value={f.name} onChangeText={set('name')} placeholder="e.g. Frozen Titus fish (carton)" />
        <Input label="Description" value={f.description} onChangeText={set('description')} multiline />
        <Select label="Category" value={f.category} options={cats.data ?? []} onChange={set('category')} placeholder="Choose a category" />
        {f.category === 'others' ? <Input label="What is it?" value={f.otherLabel} onChangeText={set('otherLabel')} /> : null}
        <Select label="Temperature" value={f.temp} options={temps.data ?? []} onChange={set('temp')} placeholder="Frozen, chilled, ambient…" />
      </Card>
      <Card style={{ gap: 12 }}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Input label="Price" value={f.price} onChangeText={(t) => set('price')(t.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad" icon="money" />
          </View>
          <View style={{ flex: 1 }}>
            <Select label="Unit" value={f.unit} options={UNITS.map((u) => ({ value: u, label: u }))} onChange={set('unit')} />
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Input label="Stock quantity" value={f.stock} onChangeText={(t) => set('stock')(t.replace(/\D/g, ''))} keyboardType="number-pad" hint="Leave empty to not track" />
          </View>
          <View style={{ flex: 1 }}>
            <Input label="Shipping fee" value={f.shipping} onChangeText={(t) => set('shipping')(t.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad" hint="Per order line" />
          </View>
        </View>
      </Card>
      <Card padding={14}>
        <SwitchRow label="In stock" value={f.inStock} onValueChange={set('inStock')} />
        <SwitchRow label="Fresh stock" description="Recently received" value={f.fresh} onValueChange={set('fresh')} last={isNew} />
        {!isNew ? <SwitchRow label="Visible to buyers" value={f.active} onValueChange={set('active')} last /> : null}
      </Card>
      <Text variant="caption" align="center">
        Prices you set are your selling price; marketplace pricing rules may apply.
      </Text>
    </Screen>
  );
}
