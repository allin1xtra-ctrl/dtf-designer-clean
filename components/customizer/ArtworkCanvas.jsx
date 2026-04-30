import { useRef, useState, useCallback, useEffect } from 'react'

export default function ArtworkCanvas({ mockupUrl, printArea, view, onArtworkReady }) {
  const [artwork, setArtwork] = useState(null)
  const [artPos, setArtPos] = useState({ x: 0, y: 0, width: 150, height: 150 })
  const prevArtworkUrl = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [resizing, setResizing] = useState(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 })

  // Constrain artwork inside print area
  const constrain = useCallback((x, y, w, h) => {
    const cx = Math.max(printArea.x, Math.min(x, printArea.x + printArea.width - w))
    const cy = Math.max(printArea.y, Math.min(y, printArea.y + printArea.height - h))
    const cw = Math.min(w, printArea.width)
    const ch = Math.min(h, printArea.height)
    return { x: cx, y: cy, width: cw, height: ch }
  }, [printArea])

  // Upload handler
  const handleUpload = (e) => {
    // Prevent multiple uploads
    if (artwork) return
    const file = e.target.files[0]
    if (!file) return
    // Revoke previous artwork URL to avoid memory leaks
    if (prevArtworkUrl.current) {
      URL.revokeObjectURL(prevArtworkUrl.current)
    }
    const url = URL.createObjectURL(file)
    prevArtworkUrl.current = url
    setArtwork(url)
    // Reset position and size to defaults (centered)
    const centered = constrain(
      printArea.x + (printArea.width - 150) / 2,
      printArea.y + (printArea.height - 150) / 2,
      150, 150
    )
    setArtPos(centered)
    if (onArtworkReady) {
      console.log('[ArtworkCanvas] Artwork uploaded:', url)
      onArtworkReady(url)
    }
    // Reset file input value so same file can be uploaded again if removed
    e.target.value = ''
  }

  // Remove artwork handler
  const handleRemoveArtwork = () => {
    if (prevArtworkUrl.current) {
      URL.revokeObjectURL(prevArtworkUrl.current)
    }
    setArtwork(null)
    setArtPos({ x: 0, y: 0, width: 150, height: 150 })
    if (onArtworkReady) onArtworkReady(null)
  }

  useEffect(() => {
    return () => {
      if (prevArtworkUrl.current) {
        URL.revokeObjectURL(prevArtworkUrl.current)
      }
    }
  }, [])

  // --- MOUSE events ---
  const onMouseDown = (e) => {
    e.preventDefault()
    setDragging(true)
    dragOffset.current = { x: e.clientX - artPos.x, y: e.clientY - artPos.y }
  }

  const onMouseMove = useCallback((e) => {
    if (!dragging) return
    const pos = constrain(
      e.clientX - dragOffset.current.x,
      e.clientY - dragOffset.current.y,
      artPos.width, artPos.height
    )
    setArtPos(prev => ({ ...prev, ...pos }))
  }, [dragging, artPos.width, artPos.height, constrain])

  const onMouseUp = () => setDragging(false)

  // Resize via mouse
  const onResizeMouseDown = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setResizing(true)
    resizeStart.current = { x: e.clientX, y: e.clientY, w: artPos.width, h: artPos.height }
  }

  const onResizeMouseMove = useCallback((e) => {
    if (!resizing) return
    const dx = e.clientX - resizeStart.current.x
    const newW = Math.max(40, resizeStart.current.w + dx)
    const newH = Math.max(40, resizeStart.current.h + dx) // maintain aspect ratio
    const pos = constrain(artPos.x, artPos.y, newW, newH)
    setArtPos(prev => ({ ...prev, width: pos.width, height: pos.height }))
  }, [resizing, artPos.x, artPos.y, constrain])

  const onResizeMouseUp = () => setResizing(false)

  // --- TOUCH events ---
  const getTouch = (e) => e.touches[0] || e.changedTouches[0]

  const onTouchStart = (e) => {
    e.preventDefault()
    const t = getTouch(e)
    setDragging(true)
    dragOffset.current = { x: t.clientX - artPos.x, y: t.clientY - artPos.y }
  }

  const onTouchMove = useCallback((e) => {
    e.preventDefault()
    if (!dragging) return
    const t = getTouch(e)
    const pos = constrain(
      t.clientX - dragOffset.current.x,
      t.clientY - dragOffset.current.y,
      artPos.width, artPos.height
    )
    setArtPos(prev => ({ ...prev, ...pos }))
  }, [dragging, artPos.width, artPos.height, constrain])

  const onTouchEnd = () => setDragging(false)

  // Resize via touch (pinch-to-scale using two fingers)
  const lastPinchDist = useRef(null)

  const onArtTouchStart = (e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      lastPinchDist.current = Math.sqrt(dx * dx + dy * dy)
    } else {
      onTouchStart(e)
    }
  }

  const onArtTouchMove = (e) => {
    e.preventDefault()
    if (e.touches.length === 2 && lastPinchDist.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.sqrt(dx * dx + dy * dy)
      const scale = dist / lastPinchDist.current
      lastPinchDist.current = dist
      setArtPos(prev => {
        const newW = Math.max(40, Math.min(prev.width * scale, printArea.width))
        const newH = Math.max(40, Math.min(prev.height * scale, printArea.height))
        return constrain(prev.x, prev.y, newW, newH)
      })
    } else {
      onTouchMove(e)
    }
  }

  const onArtTouchEnd = () => {
    lastPinchDist.current = null
    onTouchEnd()
  }

  return (
    <div
      style={{ position: 'relative', display: 'inline-block', userSelect: 'none' }}
      onMouseMove={dragging ? onMouseMove : resizing ? onResizeMouseMove : undefined}
      onMouseUp={dragging ? onMouseUp : resizing ? onResizeMouseUp : undefined}
      onMouseLeave={dragging ? onMouseUp : resizing ? onResizeMouseUp : undefined}
    >
      {/* Mockup base */}
      <img
        src={mockupUrl}
        alt={view ? `${view} product mockup` : 'Product mockup'}
        draggable={false}
        style={{ display: 'block', width: '100%', pointerEvents: 'none' }}
      />

      {/* Print area boundary */}
      <div style={{
        position: 'absolute',
        left: printArea.x,
        top: printArea.y,
        width: printArea.width,
        height: printArea.height,
        border: '2px dashed rgba(0,212,255,0.7)',
        boxShadow: '0 0 8px rgba(0,212,255,0.4)',
        boxSizing: 'border-box',
        pointerEvents: 'none',
        borderRadius: 4
      }} />

      {/* Print area label */}
      <div style={{
        position: 'absolute',
        left: printArea.x,
        top: printArea.y - 22,
        fontSize: 11,
        color: '#00d4ff',
        fontWeight: 700,
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        pointerEvents: 'none'
      }}>
        Print Area
      </div>

      {/* Draggable + resizable artwork */}
      {artwork && (
        <>
          <div
            style={{
              position: 'absolute',
              left: artPos.x,
              top: artPos.y,
              width: artPos.width,
              height: artPos.height,
              cursor: dragging ? 'grabbing' : 'grab',
              touchAction: 'none'
            }}
            onMouseDown={onMouseDown}
            onTouchStart={onArtTouchStart}
            onTouchMove={onArtTouchMove}
            onTouchEnd={onArtTouchEnd}
          >
            <img
              src={artwork}
              alt="Your uploaded artwork"
              draggable={false}
              style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }}
            />
            {/* Resize handle — bottom right corner */}
            <div
              onMouseDown={onResizeMouseDown}
              style={{
                position: 'absolute',
                bottom: -6,
                right: -6,
                width: 16,
                height: 16,
                background: '#ff2d78',
                borderRadius: '50%',
                cursor: 'se-resize',
                boxShadow: '0 0 6px #ff2d78',
                zIndex: 10
              }}
            />
            {/* Artwork border */}
            <div style={{
              position: 'absolute',
              inset: 0,
              border: '1px solid rgba(255,45,120,0.6)',
              borderRadius: 2,
              pointerEvents: 'none'
            }} />
          </div>
          {/* Remove artwork button */}
          <button
            type="button"
            onClick={handleRemoveArtwork}
            style={{
              position: 'absolute',
              top: 12,
              right: 12,
              background: '#fff',
              color: '#ff2d78',
              border: '2px solid #ff2d78',
              borderRadius: 6,
              fontWeight: 700,
              padding: '6px 16px',
              zIndex: 50,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(255,45,120,0.12)'
            }}
          >
            Remove Artwork
          </button>
        </>
      )}
      {/* Upload button (disabled if artwork present) */}
      {!artwork && (
        <label style={{
          position: 'absolute',
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#ff2d78',
          color: '#fff',
          padding: '12px 28px',
          borderRadius: 6,
          fontWeight: 900,
          cursor: 'pointer',
          boxShadow: '0 0 14px #ff2d78',
          fontSize: '0.9rem',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          whiteSpace: 'nowrap',
          zIndex: 20,
          overflow: 'hidden',
          display: 'inline-block',
        }}>
          <span role="img" aria-label="Upload Artwork">📁</span> Upload Artwork
          <input
            type="file"
            accept="image/*"
            aria-label="Upload artwork image"
            onChange={handleUpload}
            tabIndex={0}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: '100%',
              height: '100%',
              opacity: 0,
              cursor: 'pointer',
              zIndex: 30,
              border: 'none',
            }}
          />
        </label>
      )}
    </div>
  )
}
