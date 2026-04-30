"use client";
import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

export function useShopifyContext() {
  const [shopifyContext, setShopifyContext] = useState(null)
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const handler = async (event) => {
      if (event.data?.type !== 'dtf:shopify-context') return

      const ctx = event.data
      setShopifyContext(ctx)

      // Load matching product from Supabase by name match or shopify_product_id
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .or(`shopify_product_id.eq.${ctx.productId},name.ilike.%${ctx.productTitle}%`)
        .single()

      if (!error && data) {
        setProduct(data)
      }
      setLoading(false)
    }

    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [])

  return { shopifyContext, product, loading }
}
