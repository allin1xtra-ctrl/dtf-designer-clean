import { Rnd } from "react-rnd";

export default function PrintAreaBox({ box, setBox }) {
  return (
    <div className="relative w-[400px] h-[500px] bg-gray-100 border mb-4">
      <Rnd
        size={{ width: box.width, height: box.height }}
        position={{ x: box.x, y: box.y }}
        onDragStop={(e, d) => setBox({ ...box, x: d.x, y: d.y })}
        onResizeStop={(e, direction, ref, delta, position) => {
          setBox({
            ...box,
            width: parseInt(ref.style.width),
            height: parseInt(ref.style.height),
            x: position.x,
            y: position.y,
          });
        }}
        bounds="parent"
        style={{ border: "2px dashed #39f", background: "rgba(57,153,255,0.1)" }}
      >
        <div className="w-full h-full flex items-center justify-center text-xs text-blue-700">
          Print Area
        </div>
      </Rnd>
    </div>
  );
}
