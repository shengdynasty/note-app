import React, { useRef } from 'react';
import { Attachment } from '../../types';
import { v4 as uuidv4 } from 'uuid';

interface FileAttachmentsProps {
  attachments: Attachment[];
  onAdd: (attachment: Attachment) => void;
  onRemove: (id: string) => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(type: string): string {
  if (type.startsWith('image/')) return '🖼';
  if (type.startsWith('video/')) return '🎬';
  if (type.startsWith('audio/')) return '🎵';
  if (type === 'application/pdf') return '📄';
  if (type.includes('word') || type.includes('document')) return '📝';
  if (type.includes('sheet') || type.includes('excel')) return '📊';
  if (type.includes('presentation') || type.includes('powerpoint')) return '📋';
  if (type.includes('zip') || type.includes('tar') || type.includes('gzip')) return '🗜';
  if (type.startsWith('text/')) return '📃';
  return '📎';
}

function downloadAttachment(attachment: Attachment) {
  const a = document.createElement('a');
  a.href = attachment.data;
  a.download = attachment.name;
  a.click();
}

const MAX_SIZE_MB = 20;

export default function FileAttachments({ attachments, onAdd, onRemove }: FileAttachmentsProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFiles(files: FileList | null) {
    if (!files) return;
    Array.from(files).forEach(file => {
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        alert(`${file.name} exceeds ${MAX_SIZE_MB}MB limit.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = e => {
        const data = e.target?.result as string;
        const attachment: Attachment = {
          id: uuidv4(),
          name: file.name,
          type: file.type || 'application/octet-stream',
          size: file.size,
          data,
          createdAt: Date.now(),
        };
        onAdd(attachment);
      };
      reader.readAsDataURL(file);
    });
  }

  return (
    <div className="file-attachments">
      <div className="attachments-header">
        <span className="attachments-title">📎 Attachments</span>
        <button
          className="attachments-add-btn"
          onClick={() => fileRef.current?.click()}
          title="Attach file"
        >
          + Add
        </button>
        <input
          ref={fileRef}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={e => handleFiles(e.target.files)}
        />
      </div>

      {attachments.length === 0 ? (
        <div
          className="attachments-empty"
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
        >
          Drop files here or click Add
        </div>
      ) : (
        <div
          className="attachments-list"
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
        >
          {attachments.map(att => (
            <div key={att.id} className="attachment-item" title={att.name}>
              <span className="attachment-icon">{fileIcon(att.type)}</span>
              <div className="attachment-info">
                <span className="attachment-name">{att.name}</span>
                <span className="attachment-size">{formatSize(att.size)}</span>
              </div>
              <div className="attachment-actions">
                <button
                  className="attachment-download"
                  onClick={() => downloadAttachment(att)}
                  title="Download"
                >
                  ⬇
                </button>
                <button
                  className="attachment-remove"
                  onClick={() => onRemove(att.id)}
                  title="Remove"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
