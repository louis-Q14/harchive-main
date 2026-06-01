import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ZoomIn,
  ZoomOut,
  Download,
  Maximize2,
  Minimize2,
  BookmarkPlus,
  ChevronUp,
  ChevronDown } from
"lucide-react";

export default function PDFViewer({ book, onClose, isAdmin }) {
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 10, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 10, 50));

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = book.fichier_pdf_url;
    link.download = `${book.titre}.pdf`;
    link.click();
  };

  const handleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const scrollToTop = () => {
    const iframe = document.getElementById('pdf-viewer-iframe');
    if (iframe) {
      iframe.contentWindow.scrollTo(0, 0);
    }
  };

  const scrollToBottom = () => {
    const iframe = document.getElementById('pdf-viewer-iframe');
    if (iframe) {
      iframe.contentWindow.scrollTo(0, iframe.contentWindow.document.body.scrollHeight);
    }
  };

  // Utiliser Google Docs Viewer pour une meilleure compatibilité
  const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(book.fichier_pdf_url)}&embedded=true`;

  return (
    <div className={`flex flex-col ${isFullscreen ? 'fixed inset-0 z-50 bg-white' : 'h-full'}`}>
      {/* Barre d'outils */}
      <div className="flex items-center justify-between gap-2 p-4 border-b bg-gray-50">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-800 truncate max-w-md">{book.titre}</h3>
          <span className="text-sm text-gray-500">par {book.auteur}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Navigation verticale */}
          <div className="flex gap-1 border-r pr-2">
            <Button
              variant="outline"
              size="sm"
              onClick={scrollToTop}
              title="Haut de page" className="bg-[#333333] px-3 text-xs font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input shadow-sm hover:bg-accent hover:text-accent-foreground h-8">

              <ChevronUp className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={scrollToBottom}
              title="Bas de page" className="bg-[#333333] px-3 text-xs font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input shadow-sm hover:bg-accent hover:text-accent-foreground h-8">

              <ChevronDown className="w-4 h-4" />
            </Button>
          </div>

          {/* Zoom */}
          <div className="flex items-center gap-1 border-r pr-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomOut}
              disabled={zoom <= 50}
              title="Zoom arrière" className="bg-[#333333] px-3 text-xs font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input shadow-sm hover:bg-accent hover:text-accent-foreground h-8">

              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm text-gray-600 min-w-[3rem] text-center">
              {zoom}%
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomIn}
              disabled={zoom >= 200}
              title="Zoom avant" className="bg-[#333333] px-3 text-xs font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input shadow-sm hover:bg-accent hover:text-accent-foreground h-8">

              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>

          {/* Actions */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleFullscreen}
            title={isFullscreen ? "Quitter plein écran" : "Plein écran"} className="bg-[#333333] px-3 text-xs font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input shadow-sm hover:bg-accent hover:text-accent-foreground h-8">

            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>

          {isAdmin &&
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            title="Télécharger"
            className="text-blue-600">

              <Download className="w-4 h-4" />
            </Button>
          }

          {!isFullscreen &&
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}>

              Fermer
            </Button>
          }
        </div>
      </div>

      {/* Visionneuse PDF */}
      <div className="flex-1 overflow-hidden bg-gray-100">
        <iframe
          id="pdf-viewer-iframe"
          src={viewerUrl}
          className="w-full h-full border-0"
          title={book.titre}
          style={{
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'top center',
            minHeight: `${100 * 100 / zoom}%`
          }} />

      </div>

      {/* Conseils de lecture */}
      <div className="bg-gray-500 p-3 text-center border-t">
        <p className="text-slate-100 text-xs">💡 Astuce: Utilisez les flèches ↑↓ pour naviguer, Ctrl + molette pour zoomer

        </p>
      </div>
    </div>);

}