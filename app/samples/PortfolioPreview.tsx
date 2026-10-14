import Image from "next/image";

export default function PortfolioPreview({ file, title }: { file: string; title: string }) {
  return (
    <div className="aspect-square p-4" style={{ backgroundImage: "repeating-conic-gradient(#737373 0% 25%, #a3a3a3 0% 50%)", backgroundSize: "20px 20px" }}>
      <div className="relative h-full w-full">
        <Image
          src={`/printing-samples/${file}`}
          alt={`${title} — TRUE AUTHENTIC portfolio artwork`}
          fill
          sizes="(max-width: 639px) calc(100vw - 82px), (max-width: 1023px) calc((100vw - 140px) / 2), (max-width: 1199px) calc((100vw - 198px) / 3), 334px"
          loading="lazy"
          className="object-contain"
        />
      </div>
    </div>
  );
}
