"use client";

import { useEffect, useState } from "react";

export default function ProductSelector({ onSelect }) {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetch("/api/products")
      .then(res => res.json())
      .then(data => setProducts(data))
      .catch(err => console.error(err));
  }, []);

  return (
    <div>
      <h3>Select Product</h3>

      {products.length === 0 && <p>Loading products...</p>}

      {products.map((p, i) => (
        <div key={i}>
          <strong>{p.node.title}</strong>

          {p.node.variants.edges.map((v, j) => (
            <button
              key={j}
              onClick={() => onSelect(v.node.id)}
            >
              {v.node.title}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
