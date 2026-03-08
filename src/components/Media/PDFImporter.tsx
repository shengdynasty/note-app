import React, { useState, useRef } from 'react';

interface PDFImporterProps {
  onImport: (pages: { imageData: string; width: number; height: number }[]) => void;
  onClose: () => void;
}

export default function PDFImporter({ onImport, onClose }: PDFImporterProps) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<string[]>([]);
  const [pages, setPages] = useState<{ imageData: string; width: number; height: number }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file.name.endsWith('.pdf')) {
      setError('Please select a PDF file.');
      return;
    }
    setLoading(true);
    setError('');
    setPreview([]);
    setPages([]);

    try {
      setProgress('Loading PDF...');

      // Dynamically import pdfjs-dist
      const pdfjsLib = await import('pdfjs-dist');
      // Set worker source
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url
      ).toString();

      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const numPages = pdf.numPages;

      const rendered: { imageData: string; width: number; height: number }[] = [];
      const previews: string[] = [];

      for (let i = 1; i <= numPages; i++) {
        setProgress(`Rendering page ${i} of ${numPages}...`);
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1.5 });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d')!;

        await page.render({ canvasContext: ctx as object, viewport } as Parameters<typeof page.render>[0]).promise;

        const dataUrl = canvas.toDataURL('image/png');
        rendered.push({ imageData: dataUrl, width: viewport.width, height: viewport.height });
        if (i <= 3) previews.push(dataUrl); // show first 3 as preview
      }

      setPages(rendered);
      setPreview(previews);
      setProgress(`${numPages} page${numPages !== 1 ? 's' : ''} ready to import`);
    } catch (e: any) {
      setError(`Failed to process PDF: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content pdf-importer-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📄 Import PDF</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="pdf-importer-body">
          <p className="transcript-hint">Import a PDF — each page becomes an annotatable note page.</p>

          <input
            ref={fileRef}
            type="file"
            accept=".pdf,application/pdf"
            style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />

          <div
            className="pdf-drop-zone"
            onClick={() => fileRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          >
            {loading ? (
              <div className="pdf-loading">
                <div className="spinner" />
                <span>{progress}</span>
              </div>
            ) : pages.length > 0 ? (
              <span className="pdf-ready">✓ {progress}</span>
            ) : (
              <>
                <span className="pdf-drop-icon">📄</span>
                <span>Click or drag a PDF here</span>
              </>
            )}
          </div>

          {error && <div className="transcript-error">{error}</div>}

          {preview.length > 0 && (
            <div className="pdf-preview-strip">
              {preview.map((src, i) => (
                <img key={i} src={src} alt={`Page ${i + 1}`} className="pdf-preview-thumb" />
              ))}
              {pages.length > 3 && (
                <div className="pdf-preview-more">+{pages.length - 3} more</div>
              )}
            </div>
          )}
        </div>

        <div className="transcript-footer">
          <button
            className="btn-primary"
            onClick={() => { onImport(pages); onClose(); }}
            disabled={pages.length === 0 || loading}
          >
            Import {pages.length > 0 ? `${pages.length} Page${pages.length !== 1 ? 's' : ''}` : 'PDF'}
          </button>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
