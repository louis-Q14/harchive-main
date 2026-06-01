import React, { useMemo, useEffect, useState, useCallback } from "react";
import ReactDOM from "react-dom";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import {
  X, Download, ZoomIn, ZoomOut, RotateCw,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Loader2, FileWarning
} from "lucide-react";

/* ── PDF.js worker ── */
import pdfjsWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

const CG = { fontFamily: '"Century Gothic", "AppleGothic", "Gill Sans", "Trebuchet MS", sans-serif' };

/* ── Helpers ── */
function getFileType(url) {
  if (!url) return "unknown";
  if (url.startsWith("data:image/")) return "image";
  if (url.startsWith("data:application/pdf")) return "pdf";
  const clean = url.split("?")[0].toLowerCase();
  if (/\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(clean)) return "image";
  return "pdf";
}

function isDeadUrl(url) {
  if (!url) return true;
  if (url.startsWith("blob:")) return true;
  return false;
}

function dataUrlToBlobUrl(dataUrl) {
  try {
    const [meta, base64] = dataUrl.split(",");
    const mime = meta.match(/:(.*?);/)?.[1] || "application/pdf";
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return URL.createObjectURL(new Blob([bytes], { type: mime }));
  } catch {
    return dataUrl;
  }
}

/* ══════════════════════════════════════════════════════════════
   FileViewer — lecteur PDF complet + visionneuse d'images
   ══════════════════════════════════════════════════════════════ */
export default function FileViewer({ url, title, onClose }) {
  /* shared */
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);

  /* PDF state */
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfError, setPdfError] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(true);
  const [containerWidth, setContainerWidth] = useState(null);
  const containerRef = React.useRef(null);

  const fileType = getFileType(url);

  /* Build viewable source — convert data URLs to Uint8Array for PDF */
  const viewerSrc = useMemo(() => {
    if (!url) return "";
    if (fileType === "image") return url;
    if (url.startsWith("data:")) {
      try {
        const base64 = url.split(",")[1];
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        return { data: bytes };
      } catch {
        return url;
      }
    }
    // Convert relative URLs to absolute for react-pdf worker compatibility
    if (url.startsWith("/")) return window.location.origin + url;
    return url;
  }, [url, fileType]);

  /* Measure container width for PDF sizing */
  useEffect(() => {
    const measure = () => {
      if (containerRef.current) setContainerWidth(containerRef.current.clientWidth);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  /* Close on Escape, arrow keys for PDF pages */
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
      if (fileType === "pdf" && numPages) {
        if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
          e.preventDefault();
          setPageNumber(p => Math.max(1, p - 1));
        }
        if (e.key === "ArrowRight" || e.key === "ArrowDown") {
          e.preventDefault();
          setPageNumber(p => Math.min(numPages, p + 1));
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, fileType, numPages]);

  /* PDF callbacks */
  const onDocumentLoadSuccess = useCallback(({ numPages: n }) => {
    setNumPages(n);
    setPageNumber(1);
    setPdfLoading(false);
    setPdfError(false);
  }, []);

  const onDocumentLoadError = useCallback(() => {
    setPdfLoading(false);
    setPdfError(true);
  }, []);

  const goPage = useCallback((p) => {
    setPageNumber(Math.max(1, Math.min(p, numPages || 1)));
  }, [numPages]);

  /* Zoom helpers */
  const zoomIn  = () => setZoom(z => Math.min(300, z + 25));
  const zoomOut = () => setZoom(z => Math.max(25, z - 25));

  /* Download */
  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = viewerSrc || url;
    a.download = title || "document";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const dead = isDeadUrl(url);

  if (!url) return null;

  const scale = zoom / 100;
  // Calculate page width to fill container, then apply zoom
  const pageWidth = containerWidth ? Math.min(containerWidth - 32, 900) : 800;

  /* ─── Toolbar button ─── */
  const Btn = ({ onClick, children, disabled, tip }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={tip}
      className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#474747] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
    >
      {children}
    </button>
  );

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-[9999] flex flex-col"
      style={{ backgroundColor: "rgba(0,0,0,0.92)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* ══ Header / Toolbar ══ */}
      <div
        className="flex items-center justify-between px-4 py-2 flex-shrink-0"
        style={{ backgroundColor: "#1a1a1a", borderBottom: "1px solid #3d3d3d" }}
      >
        {/* Title */}
        <span className="text-white text-sm font-semibold truncate max-w-[260px]" style={CG}>
          {title || "Aperçu du fichier"}
        </span>

        {/* Controls */}
        <div className="flex items-center gap-0.5">
          {/* ── PDF page navigation ── */}
          {fileType === "pdf" && numPages && (
            <>
              <Btn onClick={() => goPage(1)} disabled={pageNumber <= 1} tip="Première page">
                <ChevronsLeft className="w-4 h-4 text-gray-300" />
              </Btn>
              <Btn onClick={() => goPage(pageNumber - 1)} disabled={pageNumber <= 1} tip="Page précédente">
                <ChevronLeft className="w-4 h-4 text-gray-300" />
              </Btn>
              <span className="text-gray-300 text-xs px-2 select-none whitespace-nowrap" style={CG}>
                {pageNumber} / {numPages}
              </span>
              <Btn onClick={() => goPage(pageNumber + 1)} disabled={pageNumber >= numPages} tip="Page suivante">
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </Btn>
              <Btn onClick={() => goPage(numPages)} disabled={pageNumber >= numPages} tip="Dernière page">
                <ChevronsRight className="w-4 h-4 text-gray-300" />
              </Btn>
              <div className="w-px h-5 mx-1" style={{ backgroundColor: "#3d3d3d" }} />
            </>
          )}

          {/* ── Zoom ── */}
          <Btn onClick={zoomOut} disabled={zoom <= 25} tip="Zoom -">
            <ZoomOut className="w-4 h-4 text-gray-300" />
          </Btn>
          <span className="text-gray-400 text-xs w-11 text-center select-none" style={CG}>
            {zoom}%
          </span>
          <Btn onClick={zoomIn} disabled={zoom >= 300} tip="Zoom +">
            <ZoomIn className="w-4 h-4 text-gray-300" />
          </Btn>

          {/* ── Rotation (images) ── */}
          {fileType === "image" && (
            <Btn onClick={() => setRotation(r => (r + 90) % 360)} tip="Rotation">
              <RotateCw className="w-4 h-4 text-gray-300" />
            </Btn>
          )}

          <div className="w-px h-5 mx-1" style={{ backgroundColor: "#3d3d3d" }} />

          {/* ── Download ── */}
          <Btn onClick={handleDownload} tip="Télécharger">
            <Download className="w-4 h-4 text-gray-300" />
          </Btn>

          <div className="w-px h-5 mx-1" style={{ backgroundColor: "#3d3d3d" }} />

          {/* ── Close ── */}
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded transition-colors hover:bg-red-700"
            style={{ backgroundColor: "#3d3d3d" }}
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* ══ Content ══ */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-4" ref={containerRef}
        style={{ resize: 'none' }}
      >
        {dead ? (
          <div className="flex flex-col items-center gap-3 py-20">
            <FileWarning className="w-12 h-12 text-orange-400" />
            <span className="text-gray-300 text-sm text-center" style={CG}>Ce fichier n'est pas encore disponible.</span>
            <span className="text-gray-500 text-xs text-center max-w-sm" style={CG}>
              L'étudiant n'a pas encore téléversé ce document, ou le fichier a été enregistré de manière temporaire et n'est plus accessible.
            </span>
          </div>
        ) : fileType === "image" ? (
          /* ── Image viewer ── */
          <img
            src={url}
            alt={title}
            className="rounded shadow-lg"
            style={{
              maxWidth: zoom === 100 ? "100%" : "none",
              maxHeight: zoom === 100 ? "calc(100vh - 60px)" : "none",
              width: zoom !== 100 ? `${zoom}%` : undefined,
              transform: rotation ? `rotate(${rotation}deg)` : undefined,
              transition: "transform 0.3s ease",
              objectFit: "contain",
            }}
          />
        ) : (
          /* ── PDF reader (react-pdf) ── */
          <div className="flex flex-col items-center">
            {pdfLoading && (
              <div className="flex flex-col items-center gap-3 py-20">
                <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
                <span className="text-gray-400 text-sm" style={CG}>Chargement du document…</span>
              </div>
            )}
            {pdfError && (
              <div className="flex flex-col items-center gap-3 py-20">
                <FileWarning className="w-12 h-12 text-red-400" />
                <span className="text-gray-400 text-sm" style={CG}>Impossible de charger ce PDF</span>
              </div>
            )}
            <Document
              file={viewerSrc}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading=""
              error=""
            >
              {numPages && (
                <Page
                  pageNumber={pageNumber}
                  width={pageWidth * scale}
                  devicePixelRatio={Math.max(window.devicePixelRatio || 1, 2)}
                  className="shadow-2xl rounded"
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                />
              )}
            </Document>
          </div>
        )}
      </div>

      {/* ══ Bottom bar (PDF only) — keyboard hints ══ */}
      {fileType === "pdf" && numPages && (
        <div
          className="flex items-center justify-center gap-4 py-1.5 flex-shrink-0"
          style={{ backgroundColor: "#1a1a1a", borderTop: "1px solid #3d3d3d" }}
        >
          <span className="text-gray-500 text-xs" style={CG}>
            ← → Navigation pages &nbsp;|&nbsp; Échap Fermer
          </span>
        </div>
      )}
    </div>,
    document.body
  );
}