"use client";

import { useEffect, useRef } from "react";

export type ScatterCard = {
  src: string;
  alt: string;
};

const SLOTS = [
  { stackX: -8, stackY: -10, rot: -18, tx: -20, ty: -34, w: 17, h: 22, scale: 0.9, z: 2, smX: -22, smY: -40 },
  { stackX: 14, stackY: -10, rot: 20, tx: 32, ty: -30, w: 18, h: 32, scale: 0.9, z: 3, smX: 22, smY: -40 },
  { stackX: -16, stackY: 0, rot: -4, tx: -36, ty: -2, w: 15, h: 32, scale: 0.9, z: 4, smX: -22, smY: -19 },
  { stackX: 1, stackY: -10, rot: -2, tx: 6, ty: -32, w: 25, h: 30, scale: 0.8, z: 5, smX: 22, smY: -19 },
  { stackX: 18, stackY: 1, rot: 6, tx: 37, ty: 6, w: 18, h: 32, scale: 0.8, z: 6, smX: -22, smY: 20 },
  { stackX: -6, stackY: 10, rot: 6, tx: -24, ty: 34, w: 22, h: 25, scale: 0.9, z: 7, smX: 22, smY: 20 },
  { stackX: 8, stackY: 7, rot: 3, tx: 2, ty: 36, w: 20, h: 26, scale: 0.8, z: 8, smX: -22, smY: 40 },
  { stackX: 20, stackY: 12, rot: -7, tx: 30, ty: 34, w: 16, h: 20, scale: 0.7, z: 9, smX: 22, smY: 40 },
] as const;

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export function ScatterHero({
  cards,
  logoSrc = "/brand/logo.png",
  taglineSrc = "/brand/tagline.png",
}: {
  cards: ScatterCard[];
  logoSrc?: string;
  taglineSrc?: string;
}) {
  const heroRef = useRef<HTMLElement>(null);
  const centreRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);

  const slots = SLOTS.slice(0, Math.max(cards.length, 0));

  useEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const isSmall = () => window.innerWidth < 820;

    const draw = () => {
      const total = hero.offsetHeight - window.innerHeight;
      let progress = total > 0 ? -hero.getBoundingClientRect().top / total : 0;
      progress = clamp(progress);
      const scatter = clamp((progress - 0.12) / (0.9 - 0.12));

      if (centreRef.current) {
        centreRef.current.style.opacity = String(clamp((scatter - 0.3) / 0.35));
      }
      if (hintRef.current) {
        hintRef.current.style.opacity = String(1 - Math.min(1, progress / 0.12));
      }

      slots.forEach((slot, index) => {
        const el = cardRefs.current[index];
        if (!el) return;
        const small = isSmall();
        el.style.width = (small ? 40 : slot.w) + "vw";
        el.style.height = (small ? 20 : slot.h) + "vh";
        const endX = small ? slot.smX : slot.tx;
        const endY = small ? slot.smY : slot.ty;
        const x = slot.stackX + (endX - slot.stackX) * scatter;
        const y = slot.stackY + (endY - slot.stackY) * scatter;
        const rot = reduce ? 0 : slot.rot * (1 - scatter);
        const scale = 0.82 + ((small ? 0.72 : slot.scale) - 0.82) * scatter;
        el.style.transform = `translate(calc(-50% + ${x}vw), calc(-50% + ${y}vh)) rotate(${rot}deg) scale(${scale})`;
      });
    };

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        draw();
        ticking = false;
      });
    };

    draw();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", draw);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", draw);
    };
  }, [slots.length]);

  return (
    <section ref={heroRef} className="relative h-[220vh] w-full">
      <div className="sticky top-0 h-svh w-full overflow-hidden">
        <div className="scatter-vignette pointer-events-none absolute inset-0 z-[6] bg-[radial-gradient(120%_90%_at_50%_40%,transparent_35%,var(--sg-vignette)_100%)]" />

        {cards.map((card, index) => {
          const slot = slots[index];
          if (!slot) return null;
          return (
            <div
              key={`${card.src}-${index}`}
              ref={(node) => {
                cardRefs.current[index] = node;
              }}
              className="scatter-card absolute left-1/2 top-1/2 overflow-hidden rounded-[10px] bg-panel shadow-[0_18px_40px_-18px_var(--sg-shadow)]"
              style={{
                width: `${slot.w}vw`,
                height: `${slot.h}vh`,
                zIndex: slot.z,
                transform: `translate(-50%, -50%) rotate(${slot.rot}deg) scale(0.82)`,
              }}
            >
              {/* Cropped design only — no SD number overlay in the animation. */}
              <img
                src={card.src}
                alt=""
                className="h-full w-full object-cover"
                draggable={false}
              />
            </div>
          );
        })}

        <div
          ref={centreRef}
          className="pointer-events-none absolute inset-0 z-[5] flex flex-col items-center justify-center gap-[2.2vh] px-[6vw] text-center opacity-0"
        >
          <img
            src={logoSrc}
            alt="Shagun Non-wovens Digital"
            className="w-[min(62vw,380px)]"
          />
          <img
            src={taglineSrc}
            alt="शगुन का साथ, भरोसे के साथ"
            className="brand-tagline w-[min(70vw,430px)]"
          />
        </div>

        <div
          ref={hintRef}
          className="absolute bottom-[3.4vh] left-0 right-0 z-20 flex flex-col items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-ink-400"
        >
          <a href="#designs" className="btn btn-outline !min-h-10 !px-4 normal-case tracking-normal">
            Browse designs
          </a>
          <span className="pointer-events-none">or scroll</span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="animate-bob"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>
      </div>
    </section>
  );
}
