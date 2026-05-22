'use client';

import { ChangeEvent, useMemo, useState } from 'react';

type Placement = 'front' | 'back' | 'left_sleeve' | 'right_sleeve' | 'neck_tag';

type PlacementState = {
  imageUrl: string | null;
  fileName: string | null;
};

const PLACEMENTS: Placement[] = ['front', 'back', 'left_sleeve', 'right_sleeve', 'neck_tag'];

const LABELS: Record<Placement, string> = {
  front: 'Front',
  back: 'Back',
  left_sleeve: 'Left Sleeve',
  right_sleeve: 'Right Sleeve',
  neck_tag: 'Neck Tag',
};

const EMPTY_STATE: PlacementState = { imageUrl: null, fileName: null };

export default function CustomizerPage() {
  const [selectedPlacement, setSelectedPlacement] = useState<Placement>('front');
  const [designStateByPlacement, setDesignStateByPlacement] = useState<Record<Placement, PlacementState>>({
    front: EMPTY_STATE,
    back: EMPTY_STATE,
    left_sleeve: EMPTY_STATE,
    right_sleeve: EMPTY_STATE,
    neck_tag: EMPTY_STATE,
  });

  const activePlacementState = designStateByPlacement[selectedPlacement] ?? EMPTY_STATE;

  const hasDesignForPlacement = useMemo(
    () => Boolean(activePlacementState.imageUrl),
    [activePlacementState.imageUrl],
  );

  const serializeCurrentPlacementState = () => {
    setDesignStateByPlacement((prev) => ({
      ...prev,
      [selectedPlacement]: {
        imageUrl: prev[selectedPlacement]?.imageUrl ?? null,
        fileName: prev[selectedPlacement]?.fileName ?? null,
      },
    }));
  };

  const handlePlacementSwitch = (nextPlacement: Placement) => {
    if (nextPlacement === selectedPlacement) return;
    serializeCurrentPlacementState();
    setSelectedPlacement(nextPlacement);
  };

  const handleUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const fileUrl = URL.createObjectURL(file);

    setDesignStateByPlacement((prev) => ({
      ...prev,
      [selectedPlacement]: {
        imageUrl: fileUrl,
        fileName: file.name,
      },
    }));

    event.target.value = '';
  };

  const handleRemoveArtwork = () => {
    setDesignStateByPlacement((prev) => ({
      ...prev,
      [selectedPlacement]: EMPTY_STATE,
    }));
  };

  return (
    <div className="min-h-screen bg-[#0e0e0e] p-6 text-white">
      <h1 className="mb-2 text-2xl font-bold">DTF Designer Pro</h1>
      <p className="mb-6 text-sm text-gray-300">Placement-specific artwork state now persists across view switches.</p>

      <div className="mb-4 flex flex-wrap gap-2">
        {PLACEMENTS.map((placement) => (
          <button
            key={placement}
            type="button"
            onClick={() => handlePlacementSwitch(placement)}
            className={`rounded border px-3 py-2 text-sm ${selectedPlacement === placement ? 'border-cyan-400 bg-cyan-500/20' : 'border-gray-600 bg-black/30'}`}
          >
            {LABELS[placement]}
          </button>
        ))}
      </div>

      <div className="mb-4 flex items-center gap-3">
        <label className="cursor-pointer rounded bg-cyan-600 px-3 py-2 text-sm font-medium hover:bg-cyan-500">
          Upload Artwork
          <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
        </label>
        <button
          type="button"
          onClick={handleRemoveArtwork}
          className="rounded border border-red-400 px-3 py-2 text-sm text-red-300 hover:bg-red-500/10"
        >
          Remove Artwork
        </button>
        {activePlacementState.fileName ? <span className="text-xs text-gray-400">{activePlacementState.fileName}</span> : null}
      </div>

      <div className="relative h-[520px] w-full max-w-[520px] overflow-hidden rounded border border-gray-700 bg-[#1a1a1a]">
        {hasDesignForPlacement ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={activePlacementState.imageUrl ?? ''}
            alt={`${LABELS[selectedPlacement]} artwork`}
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="grid h-full place-items-center text-sm text-gray-400">
            Blank canvas for {LABELS[selectedPlacement]}.
          </div>
        )}
      </div>
    </div>
  );
}
