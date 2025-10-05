import React from 'react';

interface PDFViewerProps {
  url: string;
  title?: string;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ url, title }) => {
  return (
    <div className="w-full h-full flex items-center justify-center bg-muted/10">
      <object
        data={url}
        type="application/pdf"
        className="w-full h-full"
        style={{ minHeight: '100%' }}
      >
        <embed
          src={url}
          type="application/pdf"
          className="w-full h-full"
          style={{ minHeight: '100%' }}
        />
        <div className="p-8 text-center">
          <p className="text-muted-foreground mb-4">
            Unable to display PDF. Your browser doesn't support embedded PDFs.
          </p>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Click here to download the PDF
          </a>
        </div>
      </object>
    </div>
  );
};

export default PDFViewer;
