import { useRef, useImperativeHandle, forwardRef } from 'react';

const ArtworkCanvas = forwardRef(({ printWidth, printHeight }, ref) => {
  const canvasRef = useRef(null);

  useImperativeHandle(ref, () => ({
    async exportArtwork() {
      const canvas = canvasRef.current;
      if (!canvas) throw new Error('Canvas not ready');

      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, 'image/png', 1.0)
      );

      const formData = new FormData();
      formData.append('file', blob);
      formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET);

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: 'POST', body: formData }
      );

      const data = await res.json();
      if (!data.secure_url) throw new Error('Cloudinary upload failed');

      return data.secure_url;
    },
  }));

  return <canvas ref={canvasRef} width={printWidth} height={printHeight} />;
});

export default ArtworkCanvas;
