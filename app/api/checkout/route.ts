import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const rawVariantId = body.variantId;
    const quantity = body.quantity || 1;
    const customAttributes = body.customAttributes || [];

    if (!rawVariantId) {
      return NextResponse.json(
        { error: "Missing variantId" },
        { status: 400 }
      );
    }

    const shopDomain = process.env.SHOPIFY_STORE_DOMAIN;
    const token = process.env.SHOPIFY_STOREFRONT_TOKEN;

    if (!shopDomain || !token) {
      return NextResponse.json(
        { error: "Missing Shopify environment variables" },
        { status: 500 }
      );
    }

    // Accept either numeric or GID variantId
    const merchandiseId = rawVariantId.startsWith("gid://")
      ? rawVariantId
      : `gid://shopify/ProductVariant/${rawVariantId}`;

    const response = await fetch(
      `https://${shopDomain}/api/2024-10/graphql.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Storefront-Access-Token": token,
        },
        body: JSON.stringify({
          query: `
            mutation cartCreate($input: CartInput!) {
              cartCreate(input: $input) {
                cart {
                  id
                  checkoutUrl
                }
                userErrors {
                  field
                  message
                }
              }
            }
          `,
          variables: {
            input: {
              lines: [
                {
                  merchandiseId,
                  quantity,
                  attributes: customAttributes,
                },
              ],
            },
          },
        }),
      }
    );

    const data = await response.json();

    const errors = data?.data?.cartCreate?.userErrors;

    if (errors?.length) {
      return NextResponse.json(
        { error: "Shopify cartCreate error", details: errors },
        { status: 400 }
      );
    }

    const checkoutUrl = data?.data?.cartCreate?.cart?.checkoutUrl;

    if (!checkoutUrl) {
      return NextResponse.json(
        { error: "No checkout URL returned", raw: data },
        { status: 500 }
      );
    }

    return NextResponse.json({ checkoutUrl });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Checkout route failed" },
      { status: 500 }
    );
  }
}
