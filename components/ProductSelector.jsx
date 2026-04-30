"use client";
import { useState, useEffect } from 'react';

function extractNumericId(gid) {
  return Number(gid.split('/').pop());
}

export default function ProductSelector({ onVariantSelect }) {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);

  useEffect(() => {
    const fetchProducts = async () => {
      const res = await fetch(
        `https://${process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN}/api/2024-01/graphql.json`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Storefront-Access-Token':
              process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN,
          },
          body: JSON.stringify({
            query: `{
              products(first: 20) {
                edges {
                  node {
                    id
                    title
                    variants(first: 10) {
                      edges {
                        node {
                          id
                          title
                          price { amount currencyCode }
                          availableForSale
                        }
                      }
                    }
                  }
                }
              }
            }`,
          }),
        }
      );

      const { data } = await res.json();
      const parsed = data.products.edges.map(({ node }) => ({
        id: node.id,
        title: node.title,
        variants: node.variants.edges.map(({ node: v }) => ({
          id: extractNumericId(v.id),
          gid: v.id,
          title: v.title,
          price: v.price.amount,
          available: v.availableForSale,
        })),
      }));

      setProducts(parsed);
    };

    fetchProducts();
  }, []);

  const handleProductChange = (e) => {
    const product = products.find((p) => p.id === e.target.value);
    setSelectedProduct(product);
    setSelectedVariant(null);
    onVariantSelect(null);
  };

  const handleVariantChange = (e) => {
    const variant = selectedProduct.variants.find(
      (v) => v.id === Number(e.target.value)
    );
    setSelectedVariant(variant);
    onVariantSelect(variant.id);
  };

  return (
    <div className="product-selector">
      <select onChange={handleProductChange} defaultValue="">
        <option value="" disabled>Select a product</option>
        {products.map((p) => (
          <option key={p.id} value={p.id}>{p.title}</option>
        ))}
      </select>

      {selectedProduct && (
        <select onChange={handleVariantChange} defaultValue="">
          <option value="" disabled>Select a variant</option>
          {selectedProduct.variants.map((v) => (
            <option key={v.id} value={v.id} disabled={!v.available}>
              {v.title} — ${v.price} {!v.available && '(Out of stock)'}
            </option>
          ))}
        </select>
      )}

      {selectedVariant && (
        <p>✅ {selectedProduct.title} / {selectedVariant.title}</p>
      )}
    </div>
  );
}
