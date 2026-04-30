"use client";
import { useState, useEffect } from 'react';

export default function CartIntegration({ artworkUrl, variantId, printWidth, printHeight }) {
  const [status, setStatus] = useState('idle');

  const handleAddToCart = () => {
    if (!artworkUrl || !variantId) {
      setStatus('error');
      return;
    }

    setStatus('loading');

    window.parent.postMessage(
      {
        type: 'DTF_ADD_TO_CART',
        payload: {
          variantId,
          quantity: 1,
          properties: {
            _artwork_url: artworkUrl,
            _print_width: printWidth || '',
            _print_height: printHeight || '',
            _dpi: '300',
          },
        },
      },
      'https://yourdtfplug.com'
    );
  };

  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data?.type === 'DTF_CART_RESULT') {
        setStatus(event.data.success ? 'success' : 'error');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div>
      <button onClick={handleAddToCart} disabled={status === 'loading'}>
        {status === 'loading' ? 'Adding...' : 'Add to Cart'}
      </button>
      {status === 'success' && <p>✅ Added to cart!</p>}
      {status === 'error' && <p>❌ Something went wrong. Try again.</p>}
    </div>
  );
}
