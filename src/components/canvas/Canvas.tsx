"use client";

import {
  useCanRedo,
  useCanUndo,
  useHistory,
  useMutation,
  useMyPresence,
  useSelf,
  useStorage,
} from "@liveblocks/react";
import {
  colorToCss,
  findIntersectionLayersWithRectangle,
  penPointsToPathLayer,
  pointerEventToCanvasPoint,
  resizeBounds,
} from "~/utils";
import LayerComponent from "./LayerComponent";
import {
  Camera,
  CanvasMode,
  EllipseLayer,
  Layer,
  LayerType,
  Point,
  RectangleLayer,
  CanvasState,
  TextLayer,
  Side,
  XYWH,
} from "~/types";
import { nanoid } from "nanoid";
import { LiveObject } from "@liveblocks/client";
import { useCallback, useEffect, useState } from "react";
import React from "react";
import ToolsBar from "../toolsbar/ToolsBar";
import Path from "./Path";
import SelectionBox from "./SelectionBox";
import { off } from "process";
import useDeleteLayers from "~/hooks/useDeleteLayers";

const MAX_LAYERS = 100;

export default function Canvas() {
  const roomColor = useStorage((root) => root.roomColor);
  const layerIds = useStorage((root) => root.layerIds);
  const pencilDraft = useSelf((me) => me.presence.pencilDraft);
  const deleteLayers = useDeleteLayers();
  const presence = useMyPresence();
  const [canvasState, setState] = useState<CanvasState>({
    mode: CanvasMode.None,
  });
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, zoom: 1 });
  //라이브 블럭의 히스토리 및 undo, redo 기능으로 이력 관리를 쉽게 할 수 있다.
  const history = useHistory();
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();
  const selectAllLayers = useMutation(
    ({ setMyPresence }) => {
      if (layerIds) {
        setMyPresence({ selection: [...layerIds] }, { addToHistory: true });
      }
    },
    [layerIds],
  );
  // 단축키 기능
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      //포커스를 받고 있는 요소
      const activeElement = document.activeElement;
      const isInputField =
        activeElement &&
        (activeElement.tagName === "INPUT" ||
          activeElement.tagName === "TEXTAREA");

      if (isInputField) return;
      switch (e.key) {
        case "Backspace":
          deleteLayers();
          break;
        case "z":
          //ctrlKey: 컨트롤키 , metaKey: 맥 커멘드 키
          if (e.ctrlKey || e.metaKey) {
            if (e.shiftKey) {
              history.redo();
            } else {
              history.undo();
            }
          }
          break;
        case "a":
          if (e.ctrlKey || e.metaKey) {
            selectAllLayers();
            break;
          }
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [deleteLayers]);
  const onLayerPointerDown = useMutation(
    ({ self, setMyPresence }, e: React.PointerEvent, layerId: string) => {
      if (
        canvasState.mode === CanvasMode.Pencil ||
        canvasState.mode === CanvasMode.Inserting
      ) {
        return;
      }
      history.pause();
      e.stopPropagation();
      if (!self.presence.selection.includes(layerId)) {
        setMyPresence(
          {
            selection: [layerId],
          },
          { addToHistory: true },
        );
      }
      const point = pointerEventToCanvasPoint(e, camera);
      setState({ mode: CanvasMode.Trasnlating, current: point });
    },
    [canvasState.mode, camera, canvasState.mode, history],
  );
  //SelectionBox에 리사이징 영역을 클릭했을 때 Resize 상태로 변경
  //onPointerMove에 Resize로 인식될 것
  const onResizeHandlePointerDown = useCallback(
    (corner: Side, initalBounds: XYWH) => {
      history.pause();
      setState({
        mode: CanvasMode.Resizing,
        initalBounds,
        corner,
      });
    },
    [history],
  );

  const insertLayer = useMutation(
    (
      { storage, setMyPresence },
      layerType: LayerType.Ellipse | LayerType.Rectangle | LayerType.Text,
      position: Point,
    ) => {
      const liveLayers = storage.get("layers");
      if (liveLayers.size >= MAX_LAYERS) {
        return;
      }
      const liveLayerIds = storage.get("layerIds");
      const layerId = nanoid();
      let layer: LiveObject<Layer> | null = null;

      if (layerType === LayerType.Rectangle) {
        layer = new LiveObject<RectangleLayer>({
          type: LayerType.Rectangle,
          x: position.x,
          y: position.y,
          height: 100,
          width: 100,
          fill: { r: 217, g: 217, b: 217 },
          stroke: { r: 217, g: 217, b: 217 },
          opacity: 100,
        });
      } else if (layerType === LayerType.Ellipse) {
        layer = new LiveObject<EllipseLayer>({
          type: LayerType.Ellipse,
          x: position.x,
          y: position.y,
          height: 100,
          width: 100,
          fill: { r: 217, g: 217, b: 217 },
          stroke: { r: 217, g: 217, b: 217 },
          opacity: 100,
        });
      } else if (layerType === LayerType.Text) {
        layer = new LiveObject<TextLayer>({
          type: LayerType.Text,
          x: position.x,
          y: position.y,
          height: 100,
          width: 100,
          fontSize: 16,
          text: "Text",
          fontWeight: 400,
          fontFamily: "Inter",
          stroke: { r: 217, g: 217, b: 217 },
          fill: { r: 217, g: 217, b: 217 },
          opacity: 100,
        });
      }
      if (layer) {
        liveLayerIds.push(layerId);
        liveLayers.set(layerId, layer),
          setMyPresence({ selection: [layerId] }, { addToHistory: true });
      }
    },
    [],
  );
  const translateSelectedLayer = useMutation(
    ({ storage, self }, point: Point) => {
      if (canvasState.mode !== CanvasMode.Trasnlating) {
        return;
      }
      const offset = {
        x: point.x - canvasState.current.x,
        y: point.y - canvasState.current.y,
      };

      const liveLayers = storage.get("layers");
      for (const id of self.presence.selection) {
        const layer = liveLayers.get(id);
        if (layer) {
          layer.update({
            x: layer.get("x") + offset.x,
            y: layer.get("y") + offset.y,
          });
        }
      }
      setState({ mode: CanvasMode.Trasnlating, current: point });
    },
    [canvasState],
  );

  const resizeSelectedLayer = useMutation(
    ({ storage, self }, point: Point) => {
      if (canvasState.mode !== CanvasMode.Resizing) {
        return;
      }
      const bounds = resizeBounds(
        canvasState.initalBounds,
        canvasState.corner,
        point,
      );

      const liveLayers = storage.get("layers");
      if (self.presence.selection.length > 0) {
        const layer = liveLayers.get(self.presence.selection[0]!);
        if (layer) {
          layer.update(bounds);
        }
      }
      // Update layers to set the new width and height of the layer
    },
    [canvasState],
  );
  const unselectLayers = useMutation(({ self, setMyPresence }) => {
    setMyPresence({ selection: [] }, { addToHistory: true });
  }, []);
  const startDrawing = useMutation(
    ({ setMyPresence }, point: Point, pressure) => {
      setMyPresence({
        pencilDraft: [[point.x, point.y, pressure]],
        penColor: { r: 217, g: 217, b: 217 },
      });
    },
    [],
  );
  const continueDrawing = useMutation(
    ({ self, setMyPresence }, point: Point, e: React.PointerEvent) => {
      const { pencilDraft } = self.presence;
      if (
        canvasState.mode !== CanvasMode.Pencil ||
        e.buttons !== 1 ||
        pencilDraft === null
      ) {
        return;
      }
      setMyPresence({
        pencilDraft: [...pencilDraft, [point.x, point.y, e.pressure]],
        penColor: { r: 217, g: 217, b: 217 },
      });
    },
    [canvasState.mode],
  );
  const insertPath = useMutation(({ storage, self, setMyPresence }) => {
    const liveLayers = storage.get("layers");
    const { pencilDraft } = self.presence;
    if (
      pencilDraft === null ||
      pencilDraft.length < 2 ||
      liveLayers.size >= MAX_LAYERS
    ) {
      setMyPresence({ pencilDraft: null }, { addToHistory: true });
      return;
    }
    const id = nanoid();
    //라이브 블럭으로 패스 그린 것을 전송한다.
    liveLayers.set(
      id,
      new LiveObject(
        penPointsToPathLayer(pencilDraft, { r: 217, g: 217, b: 217 }),
      ),
    );

    const liveLayerIds = storage.get("layerIds");
    liveLayerIds.push(id);
    setMyPresence({ pencilDraft: null });
    setState({ mode: CanvasMode.Pencil });
  }, []);
  const onPointerDown = useMutation(
    ({}, e: React.PointerEvent) => {
      const point = pointerEventToCanvasPoint(e, camera);
      if (canvasState.mode === CanvasMode.Dragging) {
        setState({ mode: CanvasMode.Dragging, origin: point });
        return;
      }
      if (canvasState.mode === CanvasMode.Inserting) return;
      if (canvasState.mode === CanvasMode.Pencil) {
        //e.pressure -> 터치 스크린이라 스타일러스 펜에서 가하는 압력
        startDrawing(point, e.pressure);
        return;
      }
      setState({ origin: point, mode: CanvasMode.Pressing });
    },
    [camera, canvasState.mode, setState, startDrawing],
  );
  const startMultiSelection = useCallback((current: Point, origin: Point) => {
    if (Math.abs(current.x - origin.x) + Math.abs(current.y - origin.y) > 5) {
      setState({ mode: CanvasMode.SelectionNet, origin, current });
    }
  }, []);

  const updateSelectionNet = useMutation(
    ({ storage, setMyPresence }, current: Point, origin: Point) => {
      if (layerIds) {
        const layers = storage.get("layers").toImmutable();
        setState({
          mode: CanvasMode.SelectionNet,
          origin,
          current,
        });
        const ids = findIntersectionLayersWithRectangle(
          layerIds,
          layers,
          origin,
          current,
        );
        setMyPresence({ selection: ids });
      }
    },
    [layerIds],
  );
  const onPointerMove = useMutation(
    ({}, e: React.PointerEvent) => {
      const point = pointerEventToCanvasPoint(e, camera);
      if (canvasState.mode === CanvasMode.Pressing) {
        startMultiSelection(point, canvasState.origin);
      } else if (canvasState.mode === CanvasMode.SelectionNet) {
        updateSelectionNet(point, canvasState.origin);
      } else if (
        canvasState.mode === CanvasMode.Dragging &&
        canvasState.origin !== null
      ) {
        const deltaX = e.movementX;
        const deltaY = e.movementY;
        setCamera((camera) => ({
          x: camera.x + deltaX,
          y: camera.y + deltaY,
          zoom: camera.zoom,
        }));
      } else if (canvasState.mode === CanvasMode.Trasnlating) {
        translateSelectedLayer(point);
      } else if (canvasState.mode === CanvasMode.Pencil) {
        continueDrawing(point, e);
      } else if (canvasState.mode === CanvasMode.Resizing) {
        resizeSelectedLayer(point);
      }
    },
    [
      camera,
      canvasState,
      continueDrawing,
      resizeSelectedLayer,
      updateSelectionNet,
    ],
  );
  const onPointerUp = useMutation(
    ({}, e: React.PointerEvent) => {
      const point = pointerEventToCanvasPoint(e, camera);
      if (
        canvasState.mode === CanvasMode.None ||
        canvasState.mode === CanvasMode.Pressing
      ) {
        unselectLayers();
        setState({ mode: CanvasMode.None });
      } else if (canvasState.mode === CanvasMode.Inserting) {
        console.log(canvasState.layerType);
        insertLayer(canvasState.layerType, point);
      } else if (canvasState.mode === CanvasMode.Dragging) {
        setState({ mode: CanvasMode.Dragging, origin: null });
      } else if (canvasState.mode === CanvasMode.Pencil) {
        insertPath();
      } else {
        setState({ mode: CanvasMode.None });
      }
      history.resume();
    },
    [canvasState, setState, insertLayer, unselectLayers, history],
  );

  const onWheel = useCallback((e: React.WheelEvent) => {
    setCamera((camera) => ({
      x: camera.x - e.deltaX,
      y: camera.y - e.deltaY,
      zoom: camera.zoom,
    }));
  }, []);
  return (
    <div className="flex h-screen w-full">
      <main className="fixed left-0 right-0 h-screen overflow-y-auto">
        <div
          style={{
            backgroundColor: roomColor ? colorToCss(roomColor) : "#1e1e1e",
          }}
          className="h-full"
        >
          <svg
            onWheel={onWheel}
            onPointerUp={onPointerUp}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            className="h-full w-full"
          >
            <g
              style={{
                transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`,
              }}
            >
              {layerIds?.map((layerId) => (
                <LayerComponent
                  key={layerId}
                  id={layerId}
                  onLayerPointerDown={onLayerPointerDown}
                />
              ))}
              {/* 레이어 크기 조정 박스 */}
              <SelectionBox
                onResizeHandlePointerDown={onResizeHandlePointerDown}
              />
              {/* 멀티 셀렉트 (드래그) */}
              {canvasState.mode === CanvasMode.SelectionNet &&
                canvasState.current != null && (
                  <rect
                    className="fill-blue-600/5 stroke-blue-500 stroke-[0.5]"
                    x={Math.min(canvasState.origin.x, canvasState.current.x)}
                    y={Math.min(canvasState.origin.y, canvasState.current.y)}
                    width={Math.abs(
                      canvasState.origin.x - canvasState.current.x,
                    )}
                    height={Math.abs(
                      canvasState.origin.y - canvasState.current.y,
                    )}
                  />
                )}
              {pencilDraft !== null && pencilDraft.length > 0 && (
                <Path
                  x={0}
                  y={0}
                  opacity={100}
                  fill={colorToCss({ r: 217, g: 217, b: 217 })}
                  points={pencilDraft}
                />
              )}
            </g>
          </svg>
        </div>
      </main>
      <ToolsBar
        canvasState={canvasState}
        setCanvasState={(newState) => setState(newState)}
        zoomIn={() => {
          setCamera((camera) => ({ ...camera, zoom: camera.zoom + 0.1 }));
        }}
        zoomOut={() => {
          setCamera((camera) => ({ ...camera, zoom: camera.zoom - 0.1 }));
        }}
        canZoomIn={camera.zoom < 2}
        canZoomOut={camera.zoom > 0.5}
        redo={() => history.redo()}
        undo={() => history.undo()}
        canRedo={canRedo}
        canUndo={canUndo}
      />
    </div>
  );
}
