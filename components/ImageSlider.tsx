
import React, { useState, useRef, useEffect } from 'react';

interface ImageSliderProps {
  before: string;
  after: string;
}

const ImageSlider: React.FC<ImageSliderProps> = ({ before, after }) => {
  const [sliderPos, setSliderPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = (e: MouseEvent | TouchEvent) => {
    if (!isDragging || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const position = ((x - rect.left) / rect.width) * 100;
    
    setSliderPos(Math.min(Math.max(position, 0), 100));
  };

  useEffect(() => {
    const onUp = () => setIsDragging(false);
    const onMove = (e: MouseEvent | TouchEvent) => handleMove(e);

    if (isDragging) {
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      window.addEventListener('touchmove', onMove);
      window.addEventListener('touchend', onUp);
    }

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
  }, [isDragging]);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full select-none overflow-hidden cursor-col-resize bg-gray-900 rounded-xl"
      onMouseDown={() => setIsDragging(true)}
      onTouchStart={() => setIsDragging(true)}
    >
      {/* Container to maintain aspect ratio logic if needed, but here we use absolute fill */}
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Before Image (Original) - Stays in background */}
        <img 
          src={before} 
          alt="Original" 
          className="absolute max-w-full max-h-full object-contain"
          draggable={false}
          style={{ width: '100%', height: '100%' }}
        />

        {/* After Image (Filtered) - Clipped on top */}
        <div 
          className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none"
          style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
        >
          <img 
            src={after} 
            alt="Filtered" 
            className="absolute max-w-full max-h-full object-contain"
            draggable={false}
            style={{ width: '100%', height: '100%' }}
          />
        </div>
      </div>

      {/* Slider Line & Handle */}
      <div 
        className="absolute inset-y-0 z-20 w-0.5 bg-white/80 shadow-[0_0_10px_rgba(255,255,255,0.8)] pointer-events-none"
        style={{ left: `${sliderPos}%` }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-2xl flex items-center justify-center border-2 border-blue-600 pointer-events-auto">
          <i className="fa-solid fa-grip-lines-vertical text-blue-600 text-xs"></i>
        </div>
      </div>

      {/* Tags */}
      <div className="absolute top-4 left-4 z-30 pointer-events-none flex gap-2">
        <div className={`px-2 py-1 bg-blue-600/80 backdrop-blur rounded text-[9px] font-bold text-white uppercase tracking-tighter transition-opacity ${isDragging ? 'opacity-20' : 'opacity-100'}`}>
          Result
        </div>
      </div>
      <div className="absolute top-4 right-4 z-30 pointer-events-none flex gap-2">
        <div className={`px-2 py-1 bg-gray-800/80 backdrop-blur rounded text-[9px] font-bold text-white uppercase tracking-tighter transition-opacity ${isDragging ? 'opacity-20' : 'opacity-100'}`}>
          Original
        </div>
      </div>
    </div>
  );
};

export default ImageSlider;
