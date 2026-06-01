import React, { useState, useMemo, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import pdfjsWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

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

export default function PdfThumbnail({ url, width = 90, height = 90, className = "" }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const fileSrc = useMemo(() => {
    if (!url) return null;
    if (url.startsWith("data:")) {
      // Convert data URL to Uint8Array for react-pdf (avoids blob URL issues with worker)
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
  }, [url]);

  if (!url || error) {
    return (
      <div
        className={`flex flex-col items-center justify-center rounded gap-1 ${className}`}
        style={{ width, height, backgroundColor: "#2d2d2d", border: "1px solid #4d4d4d", flexShrink: 0 }}
      >
        <div
          className="flex items-center justify-center rounded-sm"
          style={{ width: 32, height: 38, backgroundColor: "#ef4444" }}
        >
          <span className="text-white font-black" style={{ fontSize: 8 }}>PDF</span>
        </div>
        <span style={{ fontSize: 8, color: "#b0b0b0" }}>Non disponible</span>
      </div>
    );
  }

  return (
    <div
      className={`rounded overflow-hidden ${className}`}
      style={{
        width,
        height,
        position: "relative",
        backgroundColor: "#ffffff",
        flexShrink: 0,
      }}
    >
      {!loaded && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#2d2d2d",
            zIndex: 2,
          }}
        >
          <div
            style={{
              width: 16,
              height: 16,
              border: "2px solid #4d4d4d",
              borderTop: "2px solid #60a5fa",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      <Document
        file={fileSrc}
        onLoadSuccess={() => setLoaded(true)}
        onLoadError={() => setError(true)}
        loading=""
        error=""
      >
        <Page
          pageNumber={1}
          width={width}
          renderTextLayer={false}
          renderAnnotationLayer={false}
        />
      </Document>
    </div>
  );
}