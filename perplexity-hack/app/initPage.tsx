"use client"

import { Particles } from "@/components/ui/particles"
import { Globe } from "@/components/ui/globe"
import { OrbInput } from "@/components/ui/animated-input"

export default function InitPage() {
  return (
    <div className="relative h-screen w-full overflow-hidden bg-black">
      {/* Particles background - full screen */}
      <Particles
        className="absolute inset-0"
        quantity={200}
        ease={80}
        color="#ffffff"
        refresh={false}
      />
      
      {/* Centered OrbInput - smaller */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="scale-100 opacity-100">
          <OrbInput />
        </div>
      </div>

      {/* Globe footer at bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-[10px] flex items-end justify-center pb-8">
        <Globe
          className="opacity-80 scale-220"
          config={{
            width: 600,
            height: 600,
            onRender: () => {},
            devicePixelRatio: 2,
            phi: 0,
            theta: 0.3,
            dark: 1,
            diffuse: 1.2,
            mapSamples: 16000,
            mapBrightness: 6,
            baseColor: [0.3, 0.3, 0.3],
            markerColor: [0.9, 0.9, 0.9],
            glowColor: [0.7, 0.7, 0.7],
            markers: [
              { location: [14.5995, 120.9842], size: 0.03 },
              { location: [19.076, 72.8777], size: 0.1 },
              { location: [23.8103, 90.4125], size: 0.05 },
              { location: [30.0444, 31.2357], size: 0.07 },
              { location: [39.9042, 116.4074], size: 0.08 },
              { location: [-23.5505, -46.6333], size: 0.1 },
              { location: [19.4326, -99.1332], size: 0.1 },
              { location: [40.7128, -74.006], size: 0.1 },
              { location: [34.6937, 135.5022], size: 0.05 },
              { location: [41.0082, 28.9784], size: 0.06 },
            ],
          }}
        />
      </div>
    </div>
  );
}