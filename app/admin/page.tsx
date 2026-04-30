"use client";
const ShopifyOrderFulfillmentManager = dynamic(() => import("./ShopifyOrderFulfillmentManager"), { ssr: false });
const ShopifyCustomerManager = dynamic(() => import("./ShopifyCustomerManager"), { ssr: false });
const ShopifyProductImageManager = dynamic(() => import("./ShopifyProductImageManager"), { ssr: false });
const ShopifyProductVariantManager = dynamic(() => import("./ShopifyProductVariantManager"), { ssr: false });
import React from "react";
import dynamic from "next/dynamic";

const ShopifyProductList = dynamic(() => import("./ShopifyProductList"), { ssr: false });
const ShopifyProductCreate = dynamic(() => import("./ShopifyProductCreate"), { ssr: false });
const ShopifyProductEditor = dynamic(() => import("./ShopifyProductEditor"), { ssr: false });
const ShopifyProductDelete = dynamic(() => import("./ShopifyProductDelete"), { ssr: false });
const ShopifyOrderList = dynamic(() => import("./ShopifyOrderList"), { ssr: false });
const ShopifyCollectionList = dynamic(() => import("./ShopifyCollectionList"), { ssr: false });

export default function AdminPage() {
  return (
    <main style={{ padding: 32 }}>
      <h1>Admin Dashboard</h1>
      <p>Welcome to the admin panel. Here you can manage Shopify integration, products, and app settings.</p>
      <ShopifyProductList />
      <ShopifyProductCreate />
      <ShopifyProductEditor />
      <ShopifyProductDelete />
      <ShopifyProductImageManager />
      <ShopifyProductVariantManager />
      <ShopifyOrderList />
      <ShopifyCollectionList />
      <ShopifyOrderFulfillmentManager />
      <ShopifyCustomerManager />
    </main>
  );
}
