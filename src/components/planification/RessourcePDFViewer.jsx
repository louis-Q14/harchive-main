import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  ZoomIn,
  ZoomOut,
  Download,
  Maximize2,
  Minimize2,
  X,
  RefreshCw,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

export default function RessourcePDFViewer({ ressource, isOpen, onClose }) {
  const [scale, setScale] = useState(1.3);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const containerRef = useRef(null);
  const pdfDocRef = useRef(null);
  const renderTasksRef = useRef([]);

  const isPDF = ressource?.fichier_url?.toLowerCase().includes(".pdf");
  const fileUrl = ressource?.fichier_url || "";

  const renderAllPages = useCallback(async (pdf, currentScale) => {
    const container = containerRef.current;
    if (!container || !pdf) return;

    // Cancel any ongoing render tasks
    for (const task of renderTasksRef.current) {
      try { task.cancel(); } catch (_) {}
    }
    renderTasksRef.current = [];

    // Clear container
    container.innerHTML = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: currentScale });

      const wrapper = document.createElement("div");
      wrapper.style.margin = "8px auto";
      wrapper.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
      wrapper.style.background = "#fff";
      wrapper.style.width = viewport.width + "px";

      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.display = "block";

      wrapper.appendChild(canvas);
      container.appendChild(wrapper);

      const ctx = canvas.getContext("2d");
      const renderTask = page.render({ canvasContext: ctx, viewport });
      renderTasksRef.current.push(renderTask);

      try {
        await renderTask.promise;
      } catch (err) {
        if (err.name !== "RenderingCancelledException") {
          console.error("Page render error:", err);
        }
      }
    }
  }, []);

  // Load PDF when dialog opens
  useEffect(() => {
    if (!isOpen || !isPDF || !fileUrl) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setCurrentPage(1);

    const loadPdf = async () => {
      try {
        // Cleanup previous
        if (pdfDocRef.current) {
          await pdfDocRef.current.destroy();
          pdfDocRef.current = null;
        }

        // Use dedicated PDF streaming endpoint to avoid static-file/CORS/caching issues
        const pdfApiUrl = `/api/pdf-view?file=${encodeURIComponent(fileUrl)}`;
        console.log('[PDFViewer] Loading PDF via:', pdfApiUrl);
        
        const response = await fetch(pdfApiUrl);
        console.log('[PDFViewer] Response status:', response.status, 'type:', response.headers.get('content-type'), 'length:', response.headers.get('content-length'));
        
        if (!response.ok) {
          throw new Error(`Erreur serveur: HTTP ${response.status}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        console.log('[PDFViewer] Received', arrayBuffer.byteLength, 'bytes');
        
        if (cancelled) return;
        if (!arrayBuffer.byteLength) {
          throw new Error('Le fichier PDF est vide.');
        }

        const typedArray = new Uint8Array(arrayBuffer);
        const pdf = await pdfjsLib.getDocument({ data: typedArray.slice() }).promise;
        if (cancelled) {
          pdf.destroy();
          return;
        }

        pdfDocRef.current = pdf;
        setNumPages(pdf.numPages);
        await renderAllPages(pdf, scale);
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          console.error("PDF load error:", err);
          setError(err.message || "Impossible de charger le PDF");
          setLoading(false);
        }
      }
    };

    loadPdf();

    return () => {
      cancelled = true;
    };
  }, [isOpen, fileUrl, isPDF]);

  // Re-render when scale changes
  useEffect(() => {
    if (pdfDocRef.current && !loading && isOpen) {
      renderAllPages(pdfDocRef.current, scale);
    }
  }, [scale]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      for (const task of renderTasksRef.current) {
        try { task.cancel(); } catch (_) {}
      }
      if (pdfDocRef.current) {
        pdfDocRef.current.destroy();
        pdfDocRef.current = null;
      }
    };
  }, []);

  // Track current page on scroll
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const children = container.children;
    const scrollTop = container.scrollTop;
    const containerHeight = container.clientHeight;

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const childTop = child.offsetTop - container.offsetTop;
      const childBottom = childTop + child.offsetHeight;

      if (childTop <= scrollTop + containerHeight / 2 && childBottom > scrollTop) {
        setCurrentPage(i + 1);
        break;
      }
    }
  }, []);

  if (!ressource) return null;

  const zoomPercent = Math.round(scale * 100);
  const handleZoomIn = () => setScale((s) => Math.min(s + 0.2, 3));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.2, 0.5));

  const handleRefresh = async () => {
    if (pdfDocRef.current) {
      await pdfDocRef.current.destroy();
      pdfDocRef.current = null;
    }
    setLoading(true);
    setError(null);
    try {
      const pdfApiUrl = `/api/pdf-view?file=${encodeURIComponent(fileUrl)}`;
      const response = await fetch(pdfApiUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();
      if (!arrayBuffer.byteLength) throw new Error('Le fichier PDF est vide.');

      const typedArray = new Uint8Array(arrayBuffer);
      const pdf = await pdfjsLib.getDocument({ data: typedArray.slice() }).promise;
      pdfDocRef.current = pdf;
      setNumPages(pdf.numPages);
      await renderAllPages(pdf, scale);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = `${ressource.titre}.pdf`;
    link.click();
  };

  const goToPage = (pageNum) => {
    const container = containerRef.current;
    if (!container) return;
    const child = container.children[pageNum - 1];
    if (child) {
      child.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-6xl h-[90vh] p-0"
        style={{ backgroundColor: "#3d3d3d" }}
      >
        <div
          className={`flex flex-col h-full ${isFullscreen ? "fixed inset-0 z-50" : ""}`}
          style={{ backgroundColor: "#3d3d3d" }}
        >
          {/* Barre d'outils */}
          <div
            className="flex items-center justify-between gap-2 p-3 border-b"
            style={{ backgroundColor: "#2d2d2d", borderColor: "#4d4d4d" }}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm">📄</span>
              </div>
              <div>
                <h3 className="font-semibold text-white truncate max-w-sm text-sm">
                  {ressource.titre}
                </h3>
                <p className="text-xs text-gray-400">{ressource.type}</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {isPDF && (
                <>
                  {/* Pagination */}
                  {numPages > 1 && (
                    <div className="flex items-center gap-1 border-r pr-2 mr-1" style={{ borderColor: "#4d4d4d" }}>
                      <Button variant="ghost" size="sm" onClick={() => goToPage(Math.max(1, currentPage - 1))} disabled={currentPage <= 1} className="text-gray-300 hover:text-white h-7 w-7 p-0">
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <span className="text-xs text-gray-400 min-w-[4rem] text-center">
                        {currentPage} / {numPages}
                      </span>
                      <Button variant="ghost" size="sm" onClick={() => goToPage(Math.min(numPages, currentPage + 1))} disabled={currentPage >= numPages} className="text-gray-300 hover:text-white h-7 w-7 p-0">
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  )}

                  {/* Zoom */}
                  <div className="flex items-center gap-1 border-r pr-2 mr-1" style={{ borderColor: "#4d4d4d" }}>
                    <Button variant="outline" size="sm" onClick={handleZoomOut} disabled={scale <= 0.5} className="text-black h-7 w-7 p-0">
                      <ZoomOut className="w-3.5 h-3.5" />
                    </Button>
                    <span className="text-xs text-gray-400 min-w-[3rem] text-center">
                      {zoomPercent}%
                    </span>
                    <Button variant="outline" size="sm" onClick={handleZoomIn} disabled={scale >= 3} className="text-black h-7 w-7 p-0">
                      <ZoomIn className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  <Button variant="outline" size="sm" onClick={handleRefresh} title="Actualiser" className="text-black h-7 w-7 p-0">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setIsFullscreen(!isFullscreen)} title={isFullscreen ? "Quitter plein écran" : "Plein écran"} className="text-black h-7 w-7 p-0">
                    {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownload} title="Télécharger" className="text-black h-7 w-7 p-0">
                    <Download className="w-3.5 h-3.5" />
                  </Button>
                </>
              )}
              <Button variant="outline" size="sm" onClick={onClose} className="text-black h-7 w-7 p-0">
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Zone de rendu PDF */}
          <div className="flex-1 overflow-hidden" style={{ backgroundColor: "#525659" }}>
            {isPDF && fileUrl ? (
              loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                  <span className="ml-3 text-gray-300">
                    Chargement du PDF...
                  </span>
                </div>
              ) : error ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center space-y-4">
                    <p className="text-red-400">Erreur: {error}</p>
                    <Button onClick={handleRefresh} className="bg-purple-600 hover:bg-purple-700">
                      <RefreshCw className="w-4 h-4 mr-2" /> Réessayer
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  ref={containerRef}
                  onScroll={handleScroll}
                  className="h-full overflow-auto"
                  style={{ padding: "8px 0" }}
                />
              )
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-4">
                  <p className="text-gray-400">Aperçu non disponible</p>
                  <Button onClick={handleDownload} className="bg-purple-600 hover:bg-purple-700">
                    <Download className="w-4 h-4 mr-2" />
                    Télécharger le fichier
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}