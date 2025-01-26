import { CanvasMode, CanvasState } from "~/types";
import SelectionButton from "./SelectionButton";

export default function ToolsBar({
  canvasState,
  setCanvasState,
}: {
  canvasState: CanvasState;
  setCanvasState: (newState: CanvasState) => void;
}) {
  return (
    <div className="fixed bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center justify-center rounded-lg bg-white p-1 shadow-[0_0_3px_rgba(0,0,0,0,18)]">
      <div className="flex justify-center gap-3">
        <SelectionButton
          isActive={canvasState.mode === CanvasMode.None}
          canvasMode={canvasState.mode}
          onClick={(canvasMode) => setCanvasState({ mode: canvasMode })}
        />
      </div>
    </div>
  );
}
