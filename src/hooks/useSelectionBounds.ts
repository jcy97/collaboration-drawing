import { shallow, useSelf, useStorage } from "@liveblocks/react";
import { Layer, XYWH } from "~/types";

function boundingBox(layers: Layer[]): XYWH | null {
  if (layers.length === 0) return null;
  // 첫 번째로 선택된 레이어를 기준으로 그 이후에 선택된 것들과 비교해서
  // 전체 선택 박스를 값을 만든다.
  const first = layers[0];
  if (!first) return null;
  let left = first.x;
  let right = first.x + first.width;
  let top = first.y;
  let bottom = first.y + first.height;
  // 선택한 레이어들을 반복비교하면서 상하좌우에 가장 끝부분을 찾는다.
  for (let i = 1; i < layers.length; i++) {
    const { x, y, width, height } = layers[i]!;
    if (left > x) {
      left = x;
    }
    if (right < x + width) {
      right = x + width;
    }
    //top이 작을 수록 위에 있는 거니까.. 이렇게 비교합니다.
    if (top > y) {
      top = y;
    }
    if (bottom < y + height) {
      bottom = y + height;
    }
  }
  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
}

export default function useSelectionBounds() {
  const selection = useSelf((me) => me.presence.selection);
  return useStorage((root) => {
    const selectedLayers = selection
      ?.map((layerId) => root.layers.get(layerId))
      .filter((layer): layer is Layer => layer !== undefined);

    return boundingBox(selectedLayers ?? []);
  }, shallow);
}
