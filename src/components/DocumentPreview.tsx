import React, { useState } from 'react';
import { X, Download, PenLine } from 'lucide-react';
import { Button } from './ui/Button';
import { SignaturePad } from './SignaturePad';

const API_URL = import.meta.env.VITE_API_URL;

export interface DocumentItem {
  _id: string;
  title: string;
  fileUrl: string;
  fileType: 'pdf' | 'image';
  originalName: string;
  size: number;
  status: 'unsigned' | 'signed';
  uploadedBy: { _id: string; name: string; email: string; role: string };
  sharedWith: { _id: string; name: string; email: string; role: string }[];
  signature?: {
    signedBy?: { _id: string; name: string } | null;
    signatureImage?: string | null;
    signedAt?: string | null;
  };
  createdAt: string;
}

interface DocumentPreviewProps {
  document: DocumentItem;
  onClose: () => void;
  onDocumentUpdate?: (updatedDocument: DocumentItem) => void;
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({ document, onClose, onDocumentUpdate }) => {
  const [currentDoc, setCurrentDoc] = useState(document);
  const [isSigningOpen, setIsSigningOpen] = useState(false);
  const fullFileUrl = `${API_URL}${currentDoc.fileUrl}`;

  const handleSigned = (updatedDocument: DocumentItem) => {
    setCurrentDoc(updatedDocument);
    setIsSigningOpen(false);
    onDocumentUpdate?.(updatedDocument);
  };

  const handleDownload = async () => {
    try {
      const res = await fetch(fullFileUrl);
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = blobUrl;
      link.download = currentDoc.originalName;
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      alert('Could not download file. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-gray-900 truncate">{currentDoc.title}</h2>
            <p className="text-sm text-gray-500">
              Uploaded by {currentDoc.uploadedBy?.name} &middot;{' '}
              {new Date(currentDoc.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <Button variant="outline" size="sm" leftIcon={<Download size={16} />} onClick={handleDownload}>
              Download
            </Button>
            <button
              onClick={onClose}
              aria-label="Close preview"
              className="p-2 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Preview body */}
        <div className="flex-1 overflow-auto bg-gray-100 flex items-center justify-center p-4">
          {currentDoc.fileType === 'pdf' ? (
            <iframe
              src={fullFileUrl}
              title={currentDoc.title}
              className="w-full h-[65vh] rounded-md bg-white border border-gray-200"
            />
          ) : (
            <img
              src={fullFileUrl}
              alt={currentDoc.title}
              className="max-w-full max-h-[65vh] object-contain rounded-md"
            />
          )}
        </div>

        {/* Signature status footer */}
        <div className="px-5 py-4 border-t border-gray-200 bg-gray-50">
          {currentDoc.status === 'signed' ? (
            <div className="flex items-center gap-3">
              {currentDoc.signature?.signatureImage && (
                <img
                  src={currentDoc.signature.signatureImage}
                  alt="Signature"
                  className="h-10 border border-gray-200 rounded bg-white px-2"
                />
              )}
              <p className="text-sm text-gray-700">
                Signed by <span className="font-medium">{currentDoc.signature?.signedBy?.name}</span>{' '}
                {currentDoc.signature?.signedAt &&
                  `on ${new Date(currentDoc.signature.signedAt).toLocaleDateString()}`}
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">This document has not been signed yet.</p>
              <Button size="sm" leftIcon={<PenLine size={16} />} onClick={() => setIsSigningOpen(true)}>
                Sign this document
              </Button>
            </div>
          )}
        </div>
      </div>

      {isSigningOpen && (
        <SignaturePad
          documentId={currentDoc._id}
          onClose={() => setIsSigningOpen(false)}
          onSigned={handleSigned}
        />
      )}
    </div>
  );
};