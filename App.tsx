
import React, { useState, useRef } from 'react';
import { FilterParams, ProcessingState } from './types';
import { extractRGB, combineRGB, applyMutualStructureFilter } from './services/filters';
import { GeminiService } from './services/geminiService';
import ImagePicker from './components/ImagePicker';
import ImageSlider from './components/ImageSlider';

const App: React.FC = () => {
  const [targetImage, setTargetImage] = useState<string | null>(null);
  const [guidanceImage, setGuidanceImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [params, setParams] = useState<FilterParams>({
    radius: 4,
    epsilon: 0.005,
    iterations: 3,
    weight: 1
  });
  const [status, setStatus] = useState<ProcessingState>({
    isProcessing: false,
    progress: 0,
    error: null
  });
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);

  const handleProcess = async () => {
    if (!targetImage || !guidanceImage) {
      setStatus({ ...status, error: "Please select both images." });
      return;
    }

    setStatus({ isProcessing: true, progress: 0, error: null });

    try {
      const targetImg = new Image();
      const guidanceImg = new Image();
      
      const loadImg = (img: HTMLImageElement, src: string) => new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = src;
      });

      await Promise.all([
        loadImg(targetImg, targetImage),
        loadImg(guidanceImg, guidanceImage)
      ]);

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error("Could not get canvas context");

      // Dimensions based on target image
      canvas.width = targetImg.width;
      canvas.height = targetImg.height;
      
      // Step 1: Get Target RGB
      ctx.drawImage(targetImg, 0, 0);
      const targetData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const targetRGB = extractRGB(targetData);

      // Step 2: Get Guidance RGB (scaled to match target)
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(guidanceImg, 0, 0, canvas.width, canvas.height);
      const guidanceData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const guidanceRGB = extractRGB(guidanceData);

      // Step 3: Run algorithm
      const resultRGB = await applyMutualStructureFilter(targetRGB, guidanceRGB, params, (p) => {
        setStatus(prev => ({ ...prev, progress: p }));
      });

      // Step 4: Combine back
      const resultData = combineRGB(resultRGB);
      ctx.putImageData(resultData, 0, 0);
      setResultImage(canvas.toDataURL('image/png'));
      setStatus({ isProcessing: false, progress: 100, error: null });

      // Step 5: AI Explanation (Optional)
      try {
        const gemini = new GeminiService();
        const explanation = await gemini.explainMutualStructure(
          "Image targeted for texture filtering",
          "Reference image for joint-structure extraction"
        );
        setAiExplanation(explanation);
      } catch (e) {
        console.warn("AI explanation failed", e);
      }

    } catch (err) {
      console.error(err);
      setStatus({ isProcessing: false, progress: 0, error: "Image processing failed. Ensure images are valid." });
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 lg:p-12 space-y-8">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <i className="fa-solid fa-layer-group text-white text-xl"></i>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
              Mutual Structure <span className="text-blue-500">Filter</span>
            </h1>
          </div>
          <p className="text-gray-500 max-w-xl text-sm md:text-base">
            Isolate and preserve structural edges shared between two images while smoothing textures.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            disabled={status.isProcessing}
            onClick={() => {
              setTargetImage(null);
              setGuidanceImage(null);
              setResultImage(null);
              setAiExplanation(null);
              setStatus({ isProcessing: false, progress: 0, error: null });
            }}
            className="px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-white hover:bg-gray-800 transition-all border border-gray-800"
          >
            Reset Session
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Controls Panel */}
        <div className="lg:col-span-4 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <ImagePicker 
              label="Target" 
              image={targetImage} 
              onImageChange={(img) => { setTargetImage(img); setResultImage(null); }}
              description="Texture to filter"
            />
            <ImagePicker 
              label="Guidance" 
              image={guidanceImage} 
              onImageChange={(img) => { setGuidanceImage(img); setResultImage(null); }}
              description="Structure reference"
            />
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-[10px] font-black uppercase text-gray-500 tracking-[0.2em] flex items-center gap-2">
                <i className="fa-solid fa-sliders text-blue-500"></i> Parameters
              </h2>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-gray-300">Radius</label>
                  <span className="text-xs font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">{params.radius}px</span>
                </div>
                <input 
                  type="range" min="1" max="20" step="1"
                  value={params.radius}
                  onChange={(e) => setParams({...params, radius: parseInt(e.target.value)})}
                  className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-gray-300">Smoothness</label>
                  <span className="text-xs font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">{params.epsilon.toFixed(4)}</span>
                </div>
                <input 
                  type="range" min="0.0001" max="0.05" step="0.0001"
                  value={params.epsilon}
                  onChange={(e) => setParams({...params, epsilon: parseFloat(e.target.value)})}
                  className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-gray-300">Iterations</label>
                  <span className="text-xs font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">{params.iterations}</span>
                </div>
                <input 
                  type="range" min="1" max="15" step="1"
                  value={params.iterations}
                  onChange={(e) => setParams({...params, iterations: parseInt(e.target.value)})}
                  className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>
            </div>

            <button
              onClick={handleProcess}
              disabled={status.isProcessing || !targetImage || !guidanceImage}
              className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                status.isProcessing 
                ? 'bg-gray-800 text-gray-600' 
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-xl shadow-blue-900/20 active:scale-[0.97]'
              }`}
            >
              {status.isProcessing ? (
                <span className="flex items-center justify-center gap-3">
                  <i className="fa-solid fa-compact-disc animate-spin"></i> Processing...
                </span>
              ) : "Apply Mutual Filter"}
            </button>
          </div>

          {status.error && (
            <div className="bg-red-900/20 border border-red-500/30 p-4 rounded-xl flex items-start gap-3 text-red-400 text-xs">
              <i className="fa-solid fa-circle-exclamation mt-0.5"></i>
              <p>{status.error}</p>
            </div>
          )}

          {aiExplanation && (
            <div className="bg-indigo-950/20 p-5 rounded-2xl border border-indigo-500/10">
              <h4 className="text-indigo-400 text-[9px] font-black uppercase mb-3 tracking-widest flex items-center gap-2">
                <i className="fa-solid fa-sparkles"></i> AI Context
              </h4>
              <p className="text-xs text-gray-400 leading-relaxed font-light italic">
                "{aiExplanation}"
              </p>
            </div>
          )}
        </div>

        {/* Result Viewport */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          <div className="relative bg-black rounded-3xl border border-gray-800 overflow-hidden min-h-[500px] lg:h-[700px] flex shadow-2xl group">
            {resultImage && targetImage ? (
              <div className="flex-1 flex flex-col relative">
                <div className="flex-1 bg-gray-950">
                  <ImageSlider before={targetImage} after={resultImage} />
                </div>
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/80 backdrop-blur-xl rounded-full border border-white/10 text-[9px] text-gray-400 pointer-events-none flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <i className="fa-solid fa-left-right text-blue-500 animate-pulse"></i>
                  DRAG SLIDER TO COMPARE
                </div>
                <div className="p-3 bg-gray-950 border-t border-gray-800 flex justify-between items-center px-6">
                   <div className="flex items-center gap-4">
                     <div className="flex items-center gap-1.5">
                       <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                       <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Active Result</span>
                     </div>
                     <span className="text-[9px] text-gray-700 font-mono">2048x2048 Virtual Space</span>
                   </div>
                   <a 
                    href={resultImage} 
                    download="ms_filtered_result.png"
                    className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-white text-[10px] font-black uppercase tracking-tighter transition-all shadow-lg shadow-blue-900/40"
                  >
                    <i className="fa-solid fa-download"></i> Save PNG
                  </a>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-500/5 blur-[100px] rounded-full"></div>
                  <div className="relative w-32 h-32 rounded-[2.5rem] bg-gray-900 flex items-center justify-center border border-gray-800 shadow-2xl overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <i className="fa-solid fa-photo-film text-gray-700 text-5xl group-hover:text-blue-500/50 transition-colors"></i>
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-gray-300">Viewport Standby</h3>
                  <p className="text-sm text-gray-600 max-w-xs leading-relaxed">
                    Once processing starts, the interactive comparison workbench will appear here.
                  </p>
                </div>
              </div>
            )}

            {/* Global Loader Overlay */}
            {status.isProcessing && (
              <div className="absolute inset-0 bg-gray-950/90 backdrop-blur-sm flex flex-col items-center justify-center gap-10 p-8 z-50">
                <div className="relative w-32 h-32">
                  <svg className="w-full h-full -rotate-90">
                    <circle
                      cx="64" cy="64" r="58"
                      className="fill-none stroke-gray-900 stroke-[8px]"
                    />
                    <circle
                      cx="64" cy="64" r="58"
                      className="fill-none stroke-blue-600 stroke-[8px] transition-all duration-500"
                      strokeDasharray={364.4}
                      strokeDashoffset={364.4 - (364.4 * status.progress) / 100}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black text-white">{status.progress.toFixed(0)}%</span>
                  </div>
                </div>
                <div className="text-center space-y-3">
                  <div className="flex items-center justify-center gap-3">
                    <div className="flex gap-1">
                      <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce"></div>
                      <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                      <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                    </div>
                    <p className="text-white text-xs font-black uppercase tracking-[0.3em]">Processing Layers</p>
                  </div>
                  <p className="text-gray-500 text-[10px] uppercase font-bold tracking-widest">Applying Joint Static and Dynamic Filtering</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
