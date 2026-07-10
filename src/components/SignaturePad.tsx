import React, { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { X, RotateCcw, Loader2 } from 'lucide-react';
import { Button } from './ui/Button';

const TOKEN_KEY = 'business_nexus_token';
const API_URL = import.meta.env.VITE_API_URL;

interface SignaturePadProps {
  documentId: string;
  onClose: () => void;
  onSigned: (updatedDocument: any) => void;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({ documentId, onClose, onSigned }) => {
  const sigCanvasRef = useRef<SignatureCanvas>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClear = () => {
    sigCanvasRef.current?.clear();
    setIsEmpty(true);
  };

  const handleSave = async () => {
    if (!sigCanvasRef.current || sigCanvasRef.current.isEmpty()) {
      setError('Please draw your signature first.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const signatureImage = sigCanvasRef.current.getCanvas().toDataURL('image/png');
      const token = localStorage.getItem(TOKEN_KEY);

      const res = await fetch(`${API_URL}/api/documents/${documentId}/sign`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ signatureImage })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.message || 'Failed to save signature.');
      }

      const updatedDocument = await res.json();
      onSigned(updatedDocument);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save signature.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Sign Document</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-5 py-4">
          <p className="text-sm text-gray-500 mb-2">Draw your signature in the box below.</p>
          <div className="border-2 border-dashed border-gray-300 rounded-lg overflow-hidden bg-gray-50">
            <SignatureCanvas
              ref={sigCanvasRef}
              penColor="#1e293b"
              canvasProps={{ className: 'w-full h-48' }}
              onEnd={() => setIsEmpty(false)}
            />
          </div>
          <button
            onClick={handleClear}
            className="mt-2 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <RotateCcw size={14} /> Clear
          </button>

          {error && <p className="text-sm text-error-600 mt-2">{error}</p>}
        </div>

        <div className="px-5 py-4 border-t border-gray-200 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isEmpty}>
            {isSaving ? (
              <span className="flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" /> Saving...
              </span>
            ) : (
              'Save Signature'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};