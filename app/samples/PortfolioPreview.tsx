"use client";
import { useState } from "react";

export default function PortfolioPreview({ file, title }: { file: string; title: string }) {
  const [failed, setFailed] = useState(false);
  return <div className="flex aspect-square items-center justify-center bg-neutral-800 p-4">
    {failed ? <div className="text-center"><p className="text-lg font-bold text-gray-200">{title}</p><p className="mt-3 text-sm text-gray-400">Artwork preview being prepared</p></div> :
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`/printing-samples/${file}`} alt={title + " — TRUE AUTHENTIC portfolio artwork"} loading="lazy" onError={() => setFailed(true)} className="h-full w-full object-contain" />}
  </div>;
}
