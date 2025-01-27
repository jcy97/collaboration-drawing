import { useMutation } from "@liveblocks/react";
import { useEffect, useRef, useState } from "react";
import { TextLayer } from "~/types";
import { colorToCss } from "~/utils";

export default function Text({
  id,
  layer,
  onPointerDown,
}: {
  id: string;
  layer: TextLayer;

  onPointerDown: (e: React.PointerEvent, layerId: string) => void;
}) {
  const {
    x,
    y,
    width,
    height,
    text,
    fontSize,
    fontFamily,
    fontWeight,
    fill,
    stroke,
    opacity,
  } = layer;
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(text);
  const inputRef = useRef<HTMLInputElement>(null);

  const updateText = useMutation(
    ({ storage }, newText: string) => {
      const liveLayers = storage.get("layers");
      const layer = liveLayers.get(id);
      if (layer) {
        layer.update({ text: newText });
      }
    },
    [id],
  );
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };
  const handleBlur = () => {
    setIsEditing(false);
    updateText(inputValue);
  };
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      setIsEditing(false);
      updateText(inputValue);
    }
  };

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);
  return (
    <g className="group" onDoubleClick={handleDoubleClick}>
      {isEditing ? (
        <foreignObject x={x} y={y} width={width} height={height}>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            style={{
              fontSize: `${fontSize}px`,
              color: colorToCss(fill),
              width: "100%",
              border: "none",
              outline: "none",
              background: "transparent",
            }}
          />
        </foreignObject>
      ) : (
        <>
          <rect
            style={{ transform: `translate(${x}px, ${y}px)` }}
            width={width}
            height={height}
            fill="none"
            stroke="#0b99ff"
            strokeWidth="4"
            className="pointer-events-none opacity-0 group-hover:opacity-100"
          />
          <text
            onPointerDown={(e) => onPointerDown(e, id)}
            x={x}
            y={y + fontSize}
            fontSize={fontSize}
            fontWeight={fontWeight}
            fontFamily={fontFamily}
            fill={colorToCss(fill)}
            stroke={colorToCss(stroke)}
            opacity={`${opacity}%`}
          >
            {text}
          </text>
        </>
      )}
    </g>
  );
}
