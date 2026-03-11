import { useState, useEffect } from 'react';
import GpuFuRing from '../components/GpuFuRing';
import { Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Zap, Disc, Wind, ShieldAlert } from 'lucide-react';

export default function GpuFuRingPage() {
  const [signals, setSignals] = useState([0.8, 0.2, 0.5, 0.1, 0.9, 0.3, 0.4, 0.7, 0.6, 0.2, 0.1, 0.5]);
  const [spike, setSpike] = useState(0);
  const [color, setColor] = useState('#D4AF37');
  const [fps, setFps] = useState(0);

  // FPS Counter
  useEffect(() => {
    let lastTime = performance.now();
    let frames = 0;
    let raf: number;
    const loop = () => {
      frames++;
      const now = performance.now();
      if (now >= lastTime + 1000) {
        setFps(Math.round((frames * 1000) / (now - lastTime)));
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
    <div className="min-h-screen bg-[#000] text-white font-sans selection:bg-[#D4AF37]/30 overflow-hidden">
      {/* Cinematic Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#0a1520_0%,_#000_70%)] opacity-50 pointer-events-none" />
      
      <header className="relative z-20 p-8 max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/fu-ring" className="flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-white/30 hover:text-[#D4AF37] transition-all">
          <ArrowLeft className="w-4 h-4" /> System Hub
        </Link>
        <div className="text-right">
          <h1 className="text-2xl font-serif tracking-[0.1em] text-[#D4AF37]">The Rehoboam Entity</h1>
          <p className="text-[10px] uppercase tracking-[0.5em] text-white/20">GPGPU Swarm Intelligence v1.0</p>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 p-8 h-[calc(100vh-160px)] items-center">
        
        {/* Left: Swarm Visualizer */}
        <div className="lg:col-span-8 flex flex-col items-center justify-center relative">
          <div className="relative group cursor-crosshair">
            {/* Core Entity */}
            <GpuFuRing signals={signals} size={650} spikeIntensity={spike} color={color} />
            
            {/* Scanlines Overlay */}
            <div className="absolute inset-0 pointer-events-none rounded-full border border-white/5 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(255,255,255,0.02)_3px)]" />
            
            {/* Real-time Telemetry */}
            <div className="absolute -top-12 -left-12 space-y-1 font-mono text-[10px] text-[#D4AF37]/40 uppercase">
              <div>Telemetry: active</div>
              <div>Buffer: FBO_PING_PONG</div>
              <div>Particles: 65,536</div>
            </div>

            <div className="absolute -bottom-12 -right-12 space-y-1 font-mono text-[10px] text-green-500/40 text-right uppercase">
              <div>Framerate: {fps} FPS</div>
              <div>GPU Load: optimal</div>
              <div>State: coherent</div>
            </div>
          </div>
        </div>

        {/* Right: Intervention Controls */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-white/[0.02] backdrop-blur-3xl p-8 rounded-[40px] border border-white/10 space-y-10">
            <div>
              <h2 className="text-[10px] uppercase tracking-[0.4em] text-white/30 mb-8 font-black">Intervention Triggers</h2>
              
              <div className="space-y-4">
                {/* Randomize Field */}
                <button 
                  onClick={randomize}
                  className="w-full group flex items-center justify-between p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-[#D4AF37]/30 transition-all"
                >
                  <div className="flex items-center gap-4 text-left">
                    <div className="p-3 rounded-xl bg-[#D4AF37]/10 text-[#D4AF37]">
                      <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-700" />
                    </div>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider">Re-Align Field</div>
                      <div className="text-[10px] opacity-40">Shuffle astrological signals</div>
                    </div>
                  </div>
                </button>

                {/* Divergence Spike */}
                <button 
                  onMouseDown={() => setSpike(1)}
                  onMouseUp={() => setSpike(0)}
                  onMouseLeave={() => setSpike(0)}
                  className="w-full group flex items-center justify-between p-5 rounded-2xl bg-red-500/5 border border-red-500/10 hover:bg-red-500/10 hover:border-red-500/30 transition-all active:scale-95"
                >
                  <div className="flex items-center gap-4 text-left text-red-400">
                    <div className="p-3 rounded-xl bg-red-500/20">
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider">Trigger Divergence</div>
                      <div className="text-[10px] opacity-40">Fracture swarm coherence (Hold)</div>
                    </div>
                  </div>
                </button>

                {/* Color Shift */}
                <div className="grid grid-cols-3 gap-2 mt-6">
                  {['#D4AF37', '#48BFE3', '#E63946'].map((c) => (
                    <button 
                      key={c}
                      onClick={() => setColor(c)}
                      className={`h-12 rounded-xl border-2 transition-all ${color === c ? 'border-white' : 'border-transparent opacity-40'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-white/5 space-y-6">
              <h2 className="text-[10px] uppercase tracking-[0.4em] text-white/30 font-black">System Architecture</h2>
              <div className="space-y-4 text-[10px] leading-relaxed text-white/40 font-mono uppercase tracking-wider">
                <div className="flex justify-between"><span>Kernel:</span> <span className="text-white/60">GPGPU_FBO_v8</span></div>
                <div className="flex justify-between"><span>Swarm:</span> <span className="text-white/60">Dynamic Attraction</span></div>
                <div className="flex justify-between"><span>Noise:</span> <span className="text-white/60">Perlin Octaves</span></div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
