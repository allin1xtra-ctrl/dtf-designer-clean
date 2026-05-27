import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Auth guard
  const adminToken = request.headers.get('x-admin-token')
    || request.headers.get('authorization')?.replace('Bearer ', '');

  if (adminToken !== process.env.ADMIN_PANEL_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = process.env.ADMIN_API_ACCESS_TOKEN;
  const shop = process.env.SHOPIFY_STORE_DOMAIN;
  const version = process.env.SHOPIFY_ADMIN_API_VERSION || '2024-10';

  const response = await fetch(`https://${shop}/admin/api/${version}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': token!,
    },
    body: JSON.stringify({ query: `{ products(first: 10) { edges { node { id title handle } } } }` }),
  });

  const data = await response.json();
  const products = data?.data?.products?.edges?.map((e: any) => e.node) || [];
  return NextResponse.json({ products });
}
