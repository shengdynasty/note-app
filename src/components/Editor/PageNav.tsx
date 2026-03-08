import React, { useState } from 'react';
import { Page, PageBackground } from '../../types';

interface PageNavProps {
  pages: Page[];
  currentPage: number;
  onPageChange: (index: number) => void;
  onAddPage: (bg: PageBackground) => void;
  onDeletePage: (index: number) => void;
  onToggleBookmark: (index: number) => void;
  onReorderPage: (from: number, to: number) => void;
}

export default function PageNav({
  pages, currentPage, onPageChange, onAddPage, onDeletePage, onToggleBookmark, onReorderPage,
}: PageNavProps) {
  const [dragging, setDragging] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; pageIndex: number } | null>(null);

  return (
    <div className="page-nav" onClick={() => setContextMenu(null)}>
      <div className="page-nav-header">
        <span>Pages</span>
        <span className="page-count">{pages.length}</span>
      </div>

      <div className="page-thumbnails">
        {pages.map((page, i) => (
          <div
            key={page.id}
            className={`page-thumb ${currentPage === i ? 'active' : ''} ${dragging === i ? 'dragging' : ''}`}
            draggable
            onClick={() => onPageChange(i)}
            onContextMenu={e => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, pageIndex: i }); }}
            onDragStart={() => setDragging(i)}
            onDragOver={e => { e.preventDefault(); }}
            onDrop={() => {
              if (dragging !== null && dragging !== i) onReorderPage(dragging, i);
              setDragging(null);
            }}
            onDragEnd={() => setDragging(null)}
          >
            <div className={`page-thumb-preview bg-${page.background}`}>
              {/* Mini background preview */}
              {page.background === 'ruled' && Array.from({ length: 6 }).map((_, li) => (
                <div key={li} className="thumb-line" style={{ top: 12 + li * 10 }} />
              ))}
              {page.background === 'grid' && (
                <div className="thumb-grid" />
              )}
              {page.background === 'dotted' && (
                <div className="thumb-dots" />
              )}
            </div>
            <div className="page-thumb-footer">
              <span className="page-num">{i + 1}</span>
              {page.bookmarked && <span className="page-bookmark">🔖</span>}
            </div>
          </div>
        ))}
      </div>

      <div className="page-nav-actions">
        <button
          className="add-page-btn"
          onClick={() => onAddPage('ruled')}
          title="Add page"
        >
          + Page
        </button>
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={e => e.stopPropagation()}
        >
          <button onClick={() => { onToggleBookmark(contextMenu.pageIndex); setContextMenu(null); }}>
            {pages[contextMenu.pageIndex]?.bookmarked ? '🔖 Remove bookmark' : '🔖 Bookmark'}
          </button>
          <button onClick={() => { onAddPage('ruled'); setContextMenu(null); }}>Insert page after</button>
          <button className="danger" onClick={() => {
            if (pages.length > 1) onDeletePage(contextMenu.pageIndex);
            setContextMenu(null);
          }} disabled={pages.length <= 1}>
            Delete page
          </button>
        </div>
      )}
    </div>
  );
}
