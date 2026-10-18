import { useEffect, useRef } from "react";
export default function Hero() {
  const root = useRef<HTMLElement>(null);
  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    void import("gsap")
      .then(({ default: gsap }) => {
        if (disposed) return;
        const media = gsap.matchMedia();
        media.add("(prefers-reduced-motion: no-preference)", () => {
          const context = gsap.context(() => {
            gsap.from(".hero-copy > *", {
              opacity: 0,
              y: 14,
              duration: 0.7,
              stagger: 0.08,
              ease: "power2.out",
            });
            gsap.from(".globe-scene", {
              opacity: 0,
              scale: 0.92,
              duration: 1.2,
              ease: "power2.out",
            });
            gsap.to(".globe", {
              y: -9,
              duration: 4,
              repeat: -1,
              yoyo: true,
              ease: "sine.inOut",
            });
            gsap.to(".signal", {
              opacity: 0.3,
              scale: 0.65,
              duration: 1.8,
              repeat: -1,
              yoyo: true,
              stagger: 0.4,
              ease: "sine.inOut",
            });
          }, root);
          return () => context.revert();
        });
        cleanup = () => media.revert();
      })
      .catch(() => {
        /* Animation loading must never block navigation. */
      });
    return () => {
      disposed = true;
      cleanup?.();
    };
  }, []);
  return (
    <section ref={root} className="hero" aria-labelledby="hero-title">
      <div className="hero-copy">
        <p className="eyebrow">
          <span /> YOUR WORLD. LIVE.
        </p>
        <h1 id="hero-title">
          Good television.
          <br />
          <em>No borders.</em>
        </h1>
        <p className="intro">
          Discover live channels from around the globe.
          <br className="desktop-break" /> Find your corner of the world, and
          tune in.
        </p>
        <a className="primary-button" href="#regions">
          Explore the world <span aria-hidden="true">↗</span>
        </a>
        <p className="hero-footnote">
          Open sources <span>·</span> No subscriptions <span>·</span> Just press
          play
        </p>
      </div>
      <div className="globe-scene" aria-hidden="true">
        <div className="orbit orbit-one" />
        <div className="orbit orbit-two" />
        <div className="globe">
          <div className="meridian m1" />
          <div className="meridian m2" />
          <div className="meridian m3" />
          <div className="parallel p1" />
          <div className="parallel p2" />
          <div className="parallel p3" />
          <div className="globe-equator" />
        </div>
        <span className="signal s1" />
        <span className="signal s2" />
        <span className="signal s3" />
        <div className="floating-label">
          <i /> CONNECTED BY CURIOSITY
        </div>
      </div>
    </section>
  );
}
