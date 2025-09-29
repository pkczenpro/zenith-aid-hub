import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Volume2, VolumeX } from 'lucide-react';
import { soundService } from '@/utils/soundNotifications';

const SoundControls = () => {
  const [enabled, setEnabled] = useState(soundService.isEnabled());
  const [volume, setVolume] = useState(soundService.getVolume());

  useEffect(() => {
    setEnabled(soundService.isEnabled());
    setVolume(soundService.getVolume());
  }, []);

  const toggleEnabled = () => {
    const newEnabled = !enabled;
    setEnabled(newEnabled);
    soundService.setEnabled(newEnabled);
    
    // Play test sound when enabling
    if (newEnabled) {
      soundService.playMessageReceived();
    }
  };

  const handleVolumeChange = (newVolume: number[]) => {
    const vol = newVolume[0];
    setVolume(vol);
    soundService.setVolume(vol);
  };

  const testSound = () => {
    soundService.playMessageReceived();
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          {enabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Sound Notifications</span>
            <Button
              variant={enabled ? "default" : "outline"}
              size="sm"
              onClick={toggleEnabled}
              className="h-7"
            >
              {enabled ? 'On' : 'Off'}
            </Button>
          </div>
          
          {enabled && (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Volume</span>
                  <span className="text-xs text-muted-foreground">{Math.round(volume * 100)}%</span>
                </div>
                <Slider
                  value={[volume]}
                  onValueChange={handleVolumeChange}
                  max={1}
                  min={0}
                  step={0.1}
                  className="w-full"
                />
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={testSound}
                className="w-full h-7"
              >
                Test Sound
              </Button>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default SoundControls;