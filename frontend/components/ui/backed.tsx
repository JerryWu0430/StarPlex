import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

export const Component = () => {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const el = hostRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <div className="w-full flex items-center justify-center ">
      <div
        ref={hostRef}
        className={cn(
          "relative inline-flex items-center justify-center rounded-full",
          "px-2 py-2 isolate select-none"
        )}
        style={
          {
            ["--mx" as any]: "50%",
            ["--my" as any]: "50%",
          } as React.CSSProperties
        }
      >
        {/* Subtle moving glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full"
        >
          <div
            className={cn(
              "absolute inset-0 rounded-full",
              "bg-[radial-gradient(160px_80px_at_var(--mx)_var(--my),rgba(0, 0, 0, 0),transparent_70%)]",
              "blur-2xl"
            )}
          />
        </div>

        {/* Glass pill */}
        <div
          className={cn(
            "relative z-10 rounded-full px-4 py-2",
            "backdrop-blur-xl",
            "bg-white/15",
            "ring-1 ring-black/5 dark:ring-white/10",
            "shadow-[0_8px_32px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
          )}
        >
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "h-6 w-6 shrink-0 rounded-md grid place-items-center",
                "bg-[#000000]",
                "shadow-[0_2px_10px_rgba(0,0,0,0.55)]"
              )}
              aria-hidden="true"
            >
              <PerplexityMonogram className="h-4 w-4 text-white" />
            </span>
            <span className="text-sm md:text-base font-medium tracking-wide text-neutral-800 dark:text-white">
              Backed by Perplexity
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

function PerplexityMonogram(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <title>Perplexity</title>
      <path 
        d="M19.785 0v7.272H22.5V17.62h-2.935V24l-7.037-6.194v6.145h-1.091v-6.152L4.392 24v-6.465H1.5V7.188h2.884V0l7.053 6.494V.19h1.09v6.49L19.786 0zm-7.257 9.044v7.319l5.946 5.234V14.44l-5.946-5.397zm-1.099-.08l-5.946 5.398v7.235l5.946-5.234V8.965zm8.136 7.58h1.844V8.349H13.46l6.105 5.54v2.655zm-8.982-8.28H2.59v8.195h1.8v-2.576l6.192-5.62zM5.475 2.476v4.71h5.115l-5.115-4.71zm13.219 0l-5.115 4.71h5.115v-4.71z" 
        fill="#22B8CD" 
        fillRule="nonzero"
      />
    </svg>
  );
}