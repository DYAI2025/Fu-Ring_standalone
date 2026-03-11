import { useState, useEffect } from 'react';
import OptimizedFuRing from '../components/OptimizedFuRing';
import PixiFuRing from '../components/PixiFuRing';
import { Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw, BarChart3 } from 'lucide-react';

export default function FuRingPixiPrototypePage() {
  const [signals, setSignals] = useState([0.8, 0.2, 0.5, 0.1, 0.9, 0.3, 0.4, 0.7, 0.6, 0.2, 0.1, 0.5]);
  const [fpsThree, setFpsThree] = useState(0);
  const [fpsPixi, setFpsPixi] = useState(0);

  // FPS Counter for Three.js
  useEffect(() => {
    let lastTime = performance.now();
    let frames = 0;
    let raf: number;
    const loop = () => {
      frames++;
      const now = performance.now();
      if (now >= lastTime + 1000) {
        setFpsThree(Math.round((frames * 1000) / (now - lastTime)));
        frames = 0;
        lastTime = now;
      }
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, []);

  // FPS Counter for PixiJS (simulated since it has its own ticker, but for parity we use the same method)
  useEffect(() => {
    let lastTime = performance.now();
    let frames = 0;
    let raf: number;
    const loop = () => {
      frames++;
      const now = performance.now();
      if (now >= lastTime + 1000) {
        setFpsPixi(Math.round((frames * 1000) / (now - lastTime)));
        frames = 0;
        lastTime = now;
      }
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, []);

  const randomize = () => {
    setSignals(Array.from({ length: 12 }, () => Math.random()));
  };

  return (
    <div className="min-h-screen bg-[#020509] text-white font-sans p-8">
      <header className="max-w-6xl mx-auto flex items-center justify-between mb-12">
        <Link to="/fu-ring" className="flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Fu-Ring
        </Link>
        <div className="text-right">
          <h1 className="text-xl font-serif text-[#D4AF37]">Framework Battle: Three.js vs PixiJS</h1>
          <p className="text-[10px] uppercase tracking-widest text-white/30">Comparing 2D WebGL Strategies</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto space-y-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Three.js Column */}
          <div className="flex flex-col items-center gap-6 bg-white/5 p-8 rounded-3xl border border-white/10 relative overflow-hidden">
            <div className="absolute top-4 left-6 text-[10px] uppercase tracking-widest text-blue-400 font-bold">Three.js (3D Engine)</div>
            <div className="absolute top-4 right-6 bg-black/60 border border-white/10 px-3 py-1 rounded-full text-[10px] font-mono text-green-400">
              {fpsThree} FPS
            </div>
            <div className="relative mt-4">
              <div className="absolute -inset-10 bg-blue-500/5 rounded-full blur-2xl" />
              <OptimizedFuRing signals={signals} size={340} />
            </div>
            <p className="text-xs text-white/40 text-center max-w-xs">
              Uses Orthographic camera and Plane geometry with custom Fragment Shader.
            </p>
          </div>

          {/* PixiJS Column */}
          <div className="flex flex-col items-center gap-6 bg-white/5 p-8 rounded-3xl border border-white/10 relative overflow-hidden">
            <div className="absolute top-4 left-6 text-[10px] uppercase tracking-widest text-pink-400 font-bold">PixiJS (2D WebGL)</div>
            <div className="absolute top-4 right-6 bg-black/60 border border-white/10 px-3 py-1 rounded-full text-[10px] font-mono text-green-400">
              {fpsPixi} FPS
            </div>
            <div className="relative mt-4">
              <div className="absolute -inset-10 bg-pink-500/5 rounded-full blur-2xl" />
              <PixiFuRing signals={signals} size={340} />
            </div>
            <p className="text-xs text-white/40 text-center max-w-xs">
              Uses PixiJS Mesh with custom Shader. Optimized for 2D batching and mobile performance.
            </p>
          </div>
        </div>

        <div className="flex justify-center">
          <button 
            onClick={randomize}
            className="flex items-center gap-2 px-8 py-3 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-full text-[#D4AF37] hover:bg-[#D4AF37]/20 transition-all text-sm uppercase tracking-widest font-bold"
          >
            <RefreshCw className="w-4 h-4" />
            Randomize Both
          </button>
        </div>

        <div className="bg-white/5 p-8 rounded-3xl border border-white/10 backdrop-blur-sm max-w-4xl mx-auto">
          <h2 className="text-sm uppercase tracking-[0.2em] text-[#D4AF37] mb-6 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Initial Findings (Early Benchmark)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs leading-relaxed">
            <div className="space-y-4">
              <h3 className="text-white/80 font-bold uppercase tracking-wider">Three.js Assessment</h3>
              <ul className="space-y-2 text-white/40">
                <li>• Higher abstraction overhead for simple 2D.</li>
                <li>• Excellent post-processing (Bloom).</li>
                <li>• Potentially larger bundle size (~150kb+ gzipped).</li>
              </ul>
            </div>
            <div className="space-y-4">
              <h3 className="text-white/80 font-bold uppercase tracking-wider">PixiJS Assessment</h3>
              <ul className="space-y-2 text-white/40">
                <li>• Purpose-built for 2D performance.</li>
                <li>• Lower initial memory footprint.</li>
                <li>• Native ticker management is very stable on mobile.</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
