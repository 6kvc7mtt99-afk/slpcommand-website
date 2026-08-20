"use client";

import { useEffect, useRef } from "react";

export type InstrumentSkill = {
  key: "reading" | "listening" | "writing" | "speaking";
  label: string;
  /** Measured level on the 0–4 SLP scale, or null when the backend has none. */
  level: number | null;
};

const RING_COLOR: Record<InstrumentSkill["key"], string> = {
  reading: "#c08a4a",
  listening: "#4a9ec0",
  writing: "#6aa87e",
  speaking: "#9b8ad4",
};

/**
 * The readiness instrument.
 *
 * A single object that states, at a glance, where the learner stands
 * across all four skills against their target. Four concentric arcs on a
 * shared 0–4 SLP scale, drawn on a tilted plane so the thing reads as a
 * physical gauge rather than a chart. The tilt tracks the pointer, which
 * is what makes it feel like an object with a surface.
 *
 * It is data, not decoration:
 *   - each arc's sweep is that skill's measured level / 4
 *   - a skill the backend has not measured draws only its empty track,
 *     never a zeroed arc that could be misread as a score of nothing
 *   - the target ring is the learner's real targetLevel
 *
 * Canvas 2D with hand-rolled perspective rather than a WebGL dependency:
 * the whole thing is a few hundred bytes of maths, runs on the GPU-backed
 * 2D context, and degrades to a static frame under reduced motion.
 */
export function ReadinessInstrument({
  skills,
  overall,
  target,
  size = 460,
}: {
  skills: InstrumentSkill[];
  overall: number | null;
  target: number | null;
  size?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const raf = useRef<number>(0);
  const pointer = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const intro = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const START = Math.PI * 0.75;
    const SWEEP = Math.PI * 1.5;

    function onMove(event: PointerEvent) {
      const box = wrap!.getBoundingClientRect();
      pointer.current.tx = ((event.clientX - box.left) / box.width - 0.5) * 2;
      pointer.current.ty = ((event.clientY - box.top) / box.height - 0.5) * 2;
    }
    function onLeave() {
      pointer.current.tx = 0;
      pointer.current.ty = 0;
    }

    /** Project a point on the instrument plane through the current tilt. */
    function project(x: number, y: number, tiltX: number, tiltY: number) {
      const dx = x - cx;
      const dy = y - cy;
      const ry = dy * Math.cos(tiltX);
      const depth = dy * Math.sin(tiltX) + dx * Math.sin(tiltY);
      const scale = 1 + depth / (size * 2.6);
      return { x: cx + dx * Math.cos(tiltY) * scale, y: cy + ry * scale };
    }

    function arc(radius: number, from: number, to: number, tiltX: number, tiltY: number) {
      const steps = 56;
      ctx!.beginPath();
      for (let i = 0; i <= steps; i++) {
        const a = from + ((to - from) * i) / steps;
        const p = project(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius, tiltX, tiltY);
        if (i === 0) ctx!.moveTo(p.x, p.y);
        else ctx!.lineTo(p.x, p.y);
      }
      ctx!.stroke();
    }

    function draw() {
      const p = pointer.current;
      p.x += (p.tx - p.x) * 0.06;
      p.y += (p.ty - p.y) * 0.06;
      const tiltX = 0.42 + p.y * 0.13;
      const tiltY = p.x * 0.16;

      if (intro.current < 1) intro.current = Math.min(1, intro.current + 0.018);
      const ease = 1 - Math.pow(1 - intro.current, 3);

      const styles = getComputedStyle(wrap!);
      const track = styles.getPropertyValue("--inst-track").trim() || "rgba(255,255,255,0.10)";
      const tick = styles.getPropertyValue("--inst-tick").trim() || "rgba(255,255,255,0.22)";
      const targetCol = styles.getPropertyValue("--inst-target").trim() || "#c8942a";

      ctx!.clearRect(0, 0, size, size);
      ctx!.lineCap = "round";

      // Scale ticks — 0 to 4, the frame the arcs are read against.
      ctx!.strokeStyle = tick;
      ctx!.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const a = START + (SWEEP * i) / 4;
        const inner = project(cx + Math.cos(a) * 88, cy + Math.sin(a) * 88, tiltX, tiltY);
        const outer = project(cx + Math.cos(a) * (i % 2 === 0 ? 162 : 155), cy + Math.sin(a) * (i % 2 === 0 ? 162 : 155), tiltX, tiltY);
        ctx!.beginPath();
        ctx!.moveTo(inner.x, inner.y);
        ctx!.lineTo(outer.x, outer.y);
        ctx!.stroke();
      }

      skills.forEach((skill, i) => {
        const radius = 138 - i * 17;

        ctx!.strokeStyle = track;
        ctx!.lineWidth = 9;
        arc(radius, START, START + SWEEP, tiltX, tiltY);

        if (skill.level == null || !Number.isFinite(skill.level)) return;
        const value = Math.max(0, Math.min(4, skill.level));
        if (value <= 0) return;

        const end = START + SWEEP * (value / 4) * ease;
        ctx!.strokeStyle = RING_COLOR[skill.key];
        ctx!.lineWidth = 9;
        ctx!.shadowColor = RING_COLOR[skill.key];
        ctx!.shadowBlur = 14;
        arc(radius, START, end, tiltX, tiltY);
        ctx!.shadowBlur = 0;

        // Head of the arc — the reading point.
        const head = project(cx + Math.cos(end) * radius, cy + Math.sin(end) * radius, tiltX, tiltY);
        ctx!.fillStyle = RING_COLOR[skill.key];
        ctx!.beginPath();
        ctx!.arc(head.x, head.y, 4.2, 0, Math.PI * 2);
        ctx!.fill();
      });

      // Target ring — the learner's real objective, drawn across the stack.
      if (target != null && Number.isFinite(target)) {
        const a = START + SWEEP * (Math.max(0, Math.min(4, target)) / 4);
        const from = project(cx + Math.cos(a) * 56, cy + Math.sin(a) * 56, tiltX, tiltY);
        const to = project(cx + Math.cos(a) * 172, cy + Math.sin(a) * 172, tiltX, tiltY);
        ctx!.strokeStyle = targetCol;
        ctx!.lineWidth = 1.5;
        ctx!.setLineDash([4, 4]);
        ctx!.beginPath();
        ctx!.moveTo(from.x, from.y);
        ctx!.lineTo(to.x, to.y);
        ctx!.stroke();
        ctx!.setLineDash([]);
      }

      if (!reduced) raf.current = requestAnimationFrame(draw);
    }

    if (reduced) {
      intro.current = 1;
      draw();
    } else {
      wrap.addEventListener("pointermove", onMove);
      wrap.addEventListener("pointerleave", onLeave);
      raf.current = requestAnimationFrame(draw);
    }

    return () => {
      cancelAnimationFrame(raf.current);
      wrap.removeEventListener("pointermove", onMove);
      wrap.removeEventListener("pointerleave", onLeave);
    };
  }, [skills, target, size]);

  return (
    // The canvas keeps drawing in `size` logical units and CSS scales the
    // element down on narrow viewports, so the instrument stays crisp
    // (the backing store is still DPR-scaled) without overflowing a phone.
    <div className="inst" ref={wrapRef} style={{ maxWidth: size }}>
      <canvas ref={canvasRef} aria-hidden="true" />
      <div className="inst-core">
        {overall != null ? (
          <>
            <span className="inst-core-label">Estimated</span>
            <b className="inst-core-value">{overall}</b>
            <span className="inst-core-scale">SLP{target != null ? ` · target ${target}` : ""}</span>
          </>
        ) : (
          <>
            <b className="inst-core-empty">No estimate</b>
            <span className="inst-core-scale">Train to set a baseline</span>
          </>
        )}
      </div>
      <ul className="inst-legend">
        {skills.map((s) => (
          <li key={s.key}>
            <i style={{ background: RING_COLOR[s.key] }} aria-hidden="true" />
            <span>{s.label}</span>
            <b className="p-num">{s.level == null ? "—" : s.level}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}
