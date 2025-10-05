import React from 'react';

interface PDFViewerProps {
  url: string;
  title?: string;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ url, title }) => {
  return (
    <div className="w-full h-full">
      <iframe
        src={url}
        className="w-full h-full border-0"
        title={title || 'PDF Document'}
        style={{ minHeight: '100%' }}
      />
    </div>
  );
};

export default PDFViewer;
