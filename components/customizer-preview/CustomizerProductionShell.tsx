"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import TrueAuthenticDesigner from "../true-authentic/TrueAuthenticDesigner";

function DesignerWithRequestedSize() {
  const searchParams = useSearchParams();
  const isGangSheet = searchParams?.get("transferSize") === "13x60";
  return <TrueAuthenticDesigner key={isGangSheet ? "13x60" : "default"} gangSheet={isGangSheet} />;
}

export default function CustomizerProductionShell() {
  return <Suspense fallback={<p>Loading design studio…</p>}><DesignerWithRequestedSize /></Suspense>;
}
