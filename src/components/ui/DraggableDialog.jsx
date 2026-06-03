import React, { useState, useRef, useEffect, useCallback } from "react";
import ReactDOM from "react-dom";
import { X } from "lucide-react";

// @ts-nocheck
export function DraggableDialog({ open, onOpenChange, title, children, maxWidth = "max-w-2xl", resizable = true, onResize }) {
  const [pos, setPos] = useState({ x: null, y: null });
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [height, setHeight] = useState(null);
  const offset = useRef({ x: 0, y: 0 });
  const resizeStart = useRef({ y: 0, h: 0 });
  const dialogRef = useRef(null);

  useEffect(() => {
    if (open) {
      setPos({ x: null, y: null });
      setHeight(null);
    }
  }, [open]);

  const onMouseDown = useCallback((e) => {
    if (e.target.closest("button")) return;
    setDragging(true);
    const rect = dialogRef.current?.getBoundingClientRect();
    if (rect) {
      offset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
  }, []);

  const onMouseMove = useCallback((e) => {
    if (dragging) {
      setPos({ x: e.clientX - offset.current.x, y: e.clientY - offset.current.y });
    } else if (resizing) {
      const newH = Math.max(150, resizeStart.current.h + (e.clientY - resizeStart.current.y));
      setHeight(newH);
      onResize?.(newH);
    }
  }, [dragging, resizing, onResize]);

  const onMouseUp = useCallback(() => {
    setDragging(false);
    setResizing(false);
  }, []);

  useEffect(() => {
    if (dragging || resizing) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [dragging, resizing, onMouseMove, onMouseUp]);

  const onResizeMouseDown = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setResizing(true);
    const rect = dialogRef.current?.getBoundingClientRect();
    resizeStart.current = { y: e.clientY, h: rect?.height || 400 };
  }, []);

  if (!open) return null;

  const isPositioned = pos.x !== null && pos.y !== null;
  const style = isPositioned
    ? { position: "fixed", left: pos.x, top: pos.y, transform: "none", zIndex: 50 }
    : { position: "fixed", left: "50%", top: "50%", transform: "translate(-50%, -50%)", zIndex: 50 };

  return ReactDOM.createPortal(
    <>
      {/* Overlay léger - ne bloque pas le flou du dialog */}
      <div
        className="fixed inset-0"
        style={{ backgroundColor: "rgba(0,0,0,0.25)", zIndex: 49 }}
        onClick={() => onOpenChange(false)}
      />

      {/* Dialog glassmorphism */}
      <div
        ref={dialogRef}
        className={`w-full ${maxWidth} rounded-2xl border flex flex-col`}
        style={{
          ...style,
          height: height || undefined,
          maxHeight: height ? undefined : "85vh",
          background: "rgba(18, 18, 28, 0.25)",
          backdropFilter: "blur(28px) saturate(180%)",
          WebkitBackdropFilter: "blur(28px) saturate(180%)",
          border: "1px solid rgba(255,255,255,0.12)",
          boxShadow: "0 8px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)",
          overflow: "hidden"
        }}
      >
        {/* Header draggable */}
        <div
          onMouseDown={onMouseDown}
          className="flex items-center gap-3 px-6 py-4 rounded-t-xl border-b select-none flex-shrink-0"
          style={{ borderColor: "rgba(255,255,255,0.10)", cursor: dragging ? "grabbing" : "grab", background: "rgba(255,255,255,0.05)" }}
        >
          <div className="flex-1 min-w-0">{title}</div>
          <button
            onClick={() => onOpenChange(false)}
            className="flex-shrink-0 text-gray-400 hover:text-white transition-colors p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenu - remplit l'espace restant */}
        <div className="flex-1 overflow-y-auto flex flex-col min-h-0" style={{ borderRadius: "0 0 1rem 1rem" }}>
          {children}
        </div>


      </div>
    </>,
    document.body
  );
}

export function DraggableDialogBody({ children, style = {}, className = '' }) {
  return <div className={`px-6 py-4 ${className}`} style={style}>{children}</div>;
}

export function DraggableDialogFooter({ children }) {
  return (
    <div className="flex justify-end gap-3 px-6 py-4 border-t flex-shrink-0" style={{ borderColor: "#4d4d4d" }}>
      {children}
    </div>
  );
}