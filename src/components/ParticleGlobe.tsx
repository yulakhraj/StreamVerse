import { useEffect, useRef } from "react";

// A deterministic point cloud keeps the sphere stable across renders.
const points = Array.from({ length: 420 }, (_, i) => {
  const y = 1 - (i / 419) * 2;
  const radius = Math.sqrt(1 - y * y);
  const longitude = i * Math.PI * (3 - Math.sqrt(5));
  return {
    x: Math.cos(longitude) * radius,
    y,
    z: Math.sin(longitude) * radius,
  };
});
const orbits = [
  { tilt: -0.42, radius: 164, speed: 2 },
  { tilt: 0.9, radius: 153, speed: -3 },
];

export default function ParticleGlobe() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const phase = { angle: 0 };
    let width = 420,
      height = 300,
      accent = "#bda6ff",
      disposed = false;
    let cleanupMotion: (() => void) | undefined;
    const orbitPoint = (angle: number, tilt: number, radius: number) => {
      const x = Math.cos(angle) * radius,
        y = Math.sin(angle) * 53;
      return {
        x: x * Math.cos(tilt) - y * Math.sin(tilt),
        y: x * Math.sin(tilt) + y * Math.cos(tilt),
      };
    };
    const dot = (x: number, y: number, radius: number, opacity: number) => {
      context.globalAlpha = opacity;
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
    };
    const draw = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);
      context.translate(width / 2, height / 2 - 8);
      const scale = Math.min(width / 400, height / 290);
      context.scale(scale, scale);
      context.fillStyle = accent;
      context.strokeStyle = accent;
      // Quiet background stars and dotted satellite paths.
      for (let i = 0; i < 30; i++) {
        dot(
          Math.sin(i * 12.7) * 183,
          Math.cos(i * 8.3) * 120,
          i % 5 === 0 ? 1.3 : 0.7,
          0.15 + (0.15 * (1 + Math.sin(phase.angle * 2 + i))) / 2,
        );
      }
      for (const orbit of orbits) {
        context.globalAlpha = 0.18;
        context.lineWidth = 0.65;
        context.setLineDash([1, 5]);
        context.beginPath();
        for (let i = 0; i <= 100; i++) {
          const p = orbitPoint(
            (i / 100) * Math.PI * 2,
            orbit.tilt,
            orbit.radius,
          );
          if (i === 0) context.moveTo(p.x, p.y);
          else context.lineTo(p.x, p.y);
        }
        context.stroke();
        context.setLineDash([]);
      }
      const cos = Math.cos(phase.angle),
        sin = Math.sin(phase.angle);
      const projected = points
        .map((p) => {
          const x = p.x * cos + p.z * sin,
            z = p.z * cos - p.x * sin;
          return {
            x: (x * 0.966 - p.y * 0.259) * 103,
            y: (x * 0.259 + p.y * 0.966) * 103,
            z,
          };
        })
        .sort((a, b) => a.z - b.z);
      for (const p of projected) {
        const depth = (p.z + 1) / 2;
        dot(p.x, p.y, 0.65 + depth * 1.15, 0.12 + depth * 0.8);
      }
      // A short fading trail makes the two moving lights read as satellites.
      orbits.forEach((orbit, i) => {
        const angle = phase.angle * orbit.speed + i * 2.4;
        for (let j = 15; j >= 0; j--) {
          const p = orbitPoint(
            angle - j * 0.018 * Math.sign(orbit.speed),
            orbit.tilt,
            orbit.radius,
          );
          dot(p.x, p.y, j === 0 ? 3 : 1.6, (1 - j / 16) * 0.85);
          if (j === 0) dot(p.x, p.y, 7, 0.12);
        }
      });
      context.globalAlpha = 1;
    };
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width || 420;
      height = rect.height || 300;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      draw();
    };
    const updateColor = () => {
      accent =
        getComputedStyle(document.documentElement)
          .getPropertyValue("--accent")
          .trim() || "#bda6ff";
      draw();
    };
    updateColor();
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    const themeObserver = new MutationObserver(updateColor);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    void import("gsap")
      .then(({ default: gsap }) => {
        if (disposed) return;
        const media = gsap.matchMedia();
        media.add("(prefers-reduced-motion: no-preference)", () => {
          const tween = gsap.to(phase, {
            angle: Math.PI * 2,
            duration: 50,
            ease: "none",
            repeat: -1,
            onUpdate: draw,
          });
          let inView = true;
          const updatePlayback = () => {
            tween.paused(!inView || document.hidden);
          };
          const observer = new IntersectionObserver((entries) => {
            inView = entries[0]?.isIntersecting ?? false;
            updatePlayback();
          });
          observer.observe(canvas);
          document.addEventListener("visibilitychange", updatePlayback);
          updatePlayback();
          return () => {
            observer.disconnect();
            document.removeEventListener("visibilitychange", updatePlayback);
            tween.kill();
            draw();
          };
        });
        cleanupMotion = () => media.revert();
      })
      .catch(() => {
        /* The static point cloud remains visible if animation cannot load. */
      });
    return () => {
      disposed = true;
      cleanupMotion?.();
      resizeObserver.disconnect();
      themeObserver.disconnect();
    };
  }, []);
  return (
    <canvas ref={canvasRef} className="particle-globe" aria-hidden="true" />
  );
}
