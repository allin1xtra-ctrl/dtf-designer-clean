// This file wires up the new product page for Your Favorite DTF Plug
import Head from "next/head";
import CustomProductMain from "../components/CustomProductMain";

export default function ProductPage() {
  return (
    <>
      <Head>
        <title>Custom T-Shirt — Upload & Customize | Your Favorite DTF Plug</title>
        <meta
          name="description"
          content="Upload artwork and customize a premium t-shirt with full-color DTF printing, fast turnaround, and secure checkout."
        />
      </Head>
      <CustomProductMain />
    </>
  );
}
