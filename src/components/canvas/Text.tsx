import { useMutation } from "@liveblocks/react";
import { useEffect, useRef, useState } from "react";
import { TextLayer } from "~/types";
import { colorToCss } from "~/utils";

export default function Text({ id, layer }: { id: string; layer: TextLayer }) {
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
    <g onDoubleClick={handleDoubleClick}>
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
        <text
          x={x}
          y={y + fontSize}
          fontWeight={fontWeight}
          fontFamily={fontFamily}
          fill={colorToCss(fill)}
          stroke={colorToCss(stroke)}
          opacity={`${opacity}%`}
        >
          {text}
        </text>
      )}
    </g>
  );
}
