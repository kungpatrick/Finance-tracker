import React from 'react';

interface ReceiptModalProps {
  url: string;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ url, onClose }) => {
  const isPdf = url.toLowerCase().endsWith('.pdf') || url.includes('pdf');

  return (
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-[2000] p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="relative bg-white dark:bg-neutral-900 rounded-2xl overflow-hidden max-w-5xl w-full max-h-[90vh] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-bold text-gray-700 dark:text-white">Receipt Preview</h3>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-500 transition-colors"
          >
            ✕
          </button>
        </div>
        
        <div className="p-2 bg-gray-50 dark:bg-black overflow-auto flex justify-center items-center min-h-[400px]">
          {isPdf ? (
            <iframe 
              src={url} 
              className="w-full h-[70vh]" 
              title="Receipt PDF"
            />
          ) : (
            <img 
              src={url} 
              alt="Receipt" 
              className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-sm" 
            />
          )}
        </div>
      </div>
    </div>
  );
};