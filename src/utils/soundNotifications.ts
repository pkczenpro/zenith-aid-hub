// Sound notification utility for chat and ticket events
class SoundNotificationService {
  private audioContext: AudioContext | null = null;
  private enabled: boolean = true;
  private volume: number = 0.5;

  constructor() {
    // Initialize audio context on user interaction
    document.addEventListener('click', this.initializeAudioContext.bind(this), { once: true });
  }

  private initializeAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
  }

  private async playTone(frequency: number, duration: number = 200, volume: number = 0.5) {
    if (!this.enabled || !this.audioContext) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(volume * this.volume, this.audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration / 1000);
    
    oscillator.start(this.audioContext.currentTime);
    oscillator.stop(this.audioContext.currentTime + duration / 1000);
  }

  // Notification sounds
  async playMessageReceived() {
    // Two-tone notification sound
    await this.playTone(800, 150, 0.3);
    setTimeout(() => this.playTone(1000, 150, 0.3), 100);
  }

  async playMessageSent() {
    // Single tone confirmation
    await this.playTone(600, 100, 0.2);
  }

  async playTicketSubmitted() {
    // Success sequence: ascending tones
    await this.playTone(523, 120, 0.4); // C
    setTimeout(() => this.playTone(659, 120, 0.4), 80); // E
    setTimeout(() => this.playTone(784, 150, 0.4), 160); // G
  }

  async playTicketStatusUpdate() {
    // Status update: short beep sequence
    await this.playTone(1000, 100, 0.3);
    setTimeout(() => this.playTone(1200, 100, 0.3), 120);
  }

  async playError() {
    // Error: lower tone
    await this.playTone(300, 300, 0.4);
  }

  // Settings
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    localStorage.setItem('soundNotificationsEnabled', enabled.toString());
  }

  isEnabled(): boolean {
    const stored = localStorage.getItem('soundNotificationsEnabled');
    return stored !== null ? stored === 'true' : this.enabled;
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    localStorage.setItem('soundNotificationsVolume', this.volume.toString());
  }

  getVolume(): number {
    const stored = localStorage.getItem('soundNotificationsVolume');
    return stored !== null ? parseFloat(stored) : this.volume;
  }

  // Initialize from localStorage
  init() {
    this.enabled = this.isEnabled();
    this.volume = this.getVolume();
  }
}

// Create singleton instance
export const soundService = new SoundNotificationService();

// Initialize on import
soundService.init();