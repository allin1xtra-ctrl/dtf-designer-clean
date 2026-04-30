import { useRef, useState } from 'react';
import ArtworkCanvas from '../../components/ArtworkCanvas';
import CartIntegration from '../../components/CartIntegration';
import ProductSelector from '../../components/ProductSelector';

export default function CustomizerApp() {
  const canvasRef = useRef(null);
  const [artworkUrl, setArtworkUrl] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState(null);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const url = await canvasRef.current.exportArtwork();
      setArtworkUrl(url);
    } catch (err) {
      console.error('[DTF Export] Failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div>
      <ProductSelector onVariantSelect={setSelectedVariantId} />

      <ArtworkCanvas
        ref={canvasRef}
        printWidth={1200}
        printHeight={1200}
      />

      <button onClick={handleExport} disabled={isExporting}>
        {isExporting ? 'Exporting...' : 'Preview & Add to Cart'}
      </button>

      {artworkUrl && selectedVariantId && (
        <CartIntegration
          artworkUrl={artworkUrl}
          variantId={selectedVariantId}
          printWidth="12"
          printHeight="12"
        />
      )}
    </div>
  );
}
