'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import ProductEditor from '@/components/admin/ProductEditor';
import { adminFetch, ErrorMessage, errorCode } from '@/components/admin/AdminFields';
import type { AdminProduct } from '@/components/admin/product-types';

export default function ProductsPage() {
  const t = useTranslations('adminProducts');
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    const data = await adminFetch<{ products: AdminProduct[] }>('/api/admin/products');
    setProducts(data.products);
  }, []);
  useEffect(() => { reload().catch((error) => setError(errorCode(error))).finally(() => setLoading(false)); }, [reload]);
  return <div className="mx-auto max-w-6xl space-y-4"><h1 className="text-2xl font-bold">{t('products')}</h1><p className="text-sm text-text-secondary">{t('productsDescription')}</p><ErrorMessage error={error} />
    {loading ? <p role="status">{t('loading')}</p> : products.map((product) => <ProductEditor key={product.id} product={product} onSaved={reload} />)}
  </div>;
}
