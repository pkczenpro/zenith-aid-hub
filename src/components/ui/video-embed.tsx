import React from 'react';

interface VideoEmbedProps {
  url: string;
  className?: string;
}

const VideoEmbed: React.FC<VideoEmbedProps> = ({ url, className = '' }) => {
  const renderVideo = () => {
    // YouTube
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)?.[1];
      if (videoId) {
        return (
          <div className="relative w-full aspect-video rounded-lg overflow-hidden shadow-lg">
            <iframe
              src={`https://www.youtube.com/embed/${videoId}`}
              className="absolute inset-0 w-full h-full"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              title="YouTube Video"
            />
          </div>
        );
      }
    }
    
    // Vimeo
    if (url.includes('vimeo.com')) {
      const videoId = url.match(/vimeo\.com\/(\d+)/)?.[1];
      if (videoId) {
        return (
          <div className="relative w-full aspect-video rounded-lg overflow-hidden shadow-lg">
            <iframe
              src={`https://player.vimeo.com/video/${videoId}`}
              className="absolute inset-0 w-full h-full"
              frameBorder="0"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              title="Vimeo Video"
            />
          </div>
        );
      }
    }
    
    // Loom
    if (url.includes('loom.com')) {
      const videoId = url.match(/loom\.com\/share\/([a-f0-9]+)/)?.[1] || url.split('/').pop();
      if (videoId) {
        return (
          <div className="relative w-full aspect-video rounded-lg overflow-hidden shadow-lg">
            <iframe
              src={`https://www.loom.com/embed/${videoId}`}
              className="absolute inset-0 w-full h-full"
              frameBorder="0"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              title="Loom Video"
            />
          </div>
        );
      }
    }
    
    // HeyGen
    if (url.includes('heygen.com')) {
      let videoId = '';
      if (url.includes('/share/')) {
        videoId = url.match(/\/share\/([^/?#]+)/)?.[1];
      } else if (url.includes('share-prod.heygen.com')) {
        videoId = url.split('/').pop()?.split('?')[0];
      }
      
      if (videoId) {
        return (
          <div className="relative w-full aspect-video rounded-lg overflow-hidden shadow-lg">
            <iframe
              src={`https://share-prod.heygen.com/${videoId}`}
              className="absolute inset-0 w-full h-full"
              frameBorder="0"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              title="HeyGen Video"
            />
          </div>
        );
      }
    }
    
    // Direct video files
    if (url.match(/\.(mp4|webm|ogg|mov|avi|mkv)$/i)) {
      return (
        <video 
          controls 
          preload="metadata" 
          className="w-full h-auto rounded-lg shadow-lg"
          crossOrigin="anonymous"
        >
          <source src={url} type="video/mp4" />
          <source src={url} type="video/webm" />
          <source src={url} type="video/ogg" />
          <p>Your browser doesn&apos;t support the video tag. <a href={url} target="_blank" rel="noopener noreferrer">Open video</a></p>
        </video>
      );
    }
    
    // Fallback iframe
    return (
      <div className="relative w-full aspect-video rounded-lg overflow-hidden shadow-lg">
        <iframe
          src={url}
          className="absolute inset-0 w-full h-full"
          frameBorder="0"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          title="Embedded Video"
        />
      </div>
    );
  };

  return (
    <div className={`w-full my-4 ${className}`}>
      {renderVideo()}
    </div>
  );
};

export default VideoEmbed;