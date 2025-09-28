import React, { useState } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';

interface VideoPlayerProps {
  src: string;
  className?: string;
  controls?: boolean;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ 
  src, 
  className = "w-full h-auto rounded-lg", 
  controls = true 
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState(false);

  const handleVideoError = () => {
    console.error('Video failed to load:', src);
    setError(true);
  };

  const handleVideoLoad = () => {
    setError(false);
  };

  if (error) {
    return (
      <div className="relative w-full aspect-video bg-muted border border-border rounded-lg flex items-center justify-center">
        <div className="text-center p-6">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Play className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">Video Player</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Click below to open the video in a new window
          </p>
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            <Play className="w-4 h-4 mr-2" />
            Play Video
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <video
        className={className}
        controls={controls}
        preload="metadata"
        onError={handleVideoError}
        onLoadStart={handleVideoLoad}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        crossOrigin="anonymous"
      >
        <source src={src} type="video/mp4" />
        <source src={src} type="video/webm" />
        <source src={src} type="video/ogg" />
        <p className="text-muted-foreground">
          Your browser doesn't support the video tag. 
          <a 
            href={src} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary hover:underline ml-1"
          >
            Open video in new window
          </a>
        </p>
      </video>
    </div>
  );
};

export default VideoPlayer;