"use client";

import { useEffect, useRef, useState } from "react";

export type InstrumentSkill = {
  key: "reading" | "listening" | "writing" | "speaking";
  label: string;
  /** Measured level on the 0–4 SLP scale, or null when the backend has none. */
  level: number | null;
};

const RING_RGB: Record<InstrumentSkill["key"], [number, number, number]> = {
  reading: [192, 138, 74],
  listening: [74, 158, 192],
  writing: [106, 168, 126],
  speaking: [155, 138, 212],
};

type V3 = { x: number; y: number; z: number };

/**
 * The readiness instrument — a real 3D object.
 *
 * Four rings suspended at different depths inside one volume, each
 * showing a skill's measured level on the shared 0–4 SLP scale. This runs
 * a genuine 3D pipeline: every point is rotated on two axes, projected
 * through a perspective divide, and the rings are drawn back-to-front
 * with depth-derived opacity and stroke width — so a ring that swings
 * behind the stack is actually occluded and dimmed, not merely squashed.
 *
 * It is data, not decoration:
 *   - each ring's sweep is that skill's measured level / 4
 *   - a skill the backend has not measured draws only its empty track,
 *     never a zeroed arc that could be misread as a score of nothing
 *   - the dashed plane is the learner's real target level, cut through
 *     the whole volume
 *
 * Canvas 2D rather than WebGL: the pipeline is a few dozen lines of
 * maths, there is no shader compilation or context-loss handling to own,
 * and it adds no dependency. It idles on a slow drift, leans toward the
 * pointer, and renders exactly one static frame under
 * prefers-reduced-motion.
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
  const raf = useRef(0);
  const pointer = useRef({ x: 0, y: 0, tx: 0, ty: 0 });
  const clock = useRef(0);
  const intro = useRef(0);
  // A ref, not state: the draw loop reads this every frame without
  // needing to re-run the setup effect. `hoverKey` (state, below) exists
  // only so the legend's own DOM can show which entry is highlighted.
  const highlightRef = useRef<InstrumentSkill["key"] | null>(null);
  const highlightAmt = useRef(0);
  const [hoverKey, setHoverKey] = useState<InstrumentSkill["key"] | null>(null);
  useEffect(() => {
    highlightRef.current = hoverKey;
  }, [hoverKey]);

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
    const FOCAL = 820;
    const START = Math.PI * 0.75;
    const SWEEP = Math.PI * 1.5;
    const GAP = 26;
    const RADIUS = 128;

    function onMove(e: PointerEvent) {
      const b = wrap!.getBoundingClientRect();
      pointer.current.tx = ((e.clientX - b.left) / b.width - 0.5) * 2;
      pointer.current.ty = ((e.clientY - b.top) / b.height - 0.5) * 2;
    }
    function onLeave() {
      pointer.current.tx = 0;
      pointer.current.ty = 0;
    }

    /** Rotate X then Y, then perspective-divide. */
    function project(p: V3, rx: number, ry: number) {
      const cx1 = Math.cos(rx), sx1 = Math.sin(rx);
      const y1 = p.y * cx1 - p.z * sx1;
      const z1 = p.y * sx1 + p.z * cx1;
      const cy1 = Math.cos(ry), sy1 = Math.sin(ry);
      const x2 = p.x * cy1 + z1 * sy1;
      const z2 = -p.x * sy1 + z1 * cy1;
      const s = FOCAL / (FOCAL + z2);
      return { x: cx + x2 * s, y: cy + y1 * s, z: z2, s };
    }

    function strokeArc(
      depth: number,
      from: number,
      to: number,
      rx: number,
      ry: number,
      rgb: [number, number, number],
      alpha: number,
      width: number,
      glow: boolean
    ) {
      const steps = 72;
      let prev: ReturnType<typeof project> | null = null;
      let last: ReturnType<typeof project> | null = null;
      ctx!.lineCap = "round";
      for (let i = 0; i <= steps; i++) {
        const a = from + ((to - from) * i) / steps;
        const pt = project({ x: Math.cos(a) * RADIUS, y: Math.sin(a) * RADIUS, z: depth }, rx, ry);
        if (prev) {
          // Depth shading. Segments further from the camera dim and thin —
          // this is what makes the stack read as a volume rather than as
          // four flat rings drawn on top of each other.
          const t = Math.max(0, Math.min(1, (pt.s - 0.74) / 0.46));
          ctx!.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${(alpha * (0.3 + t * 0.7)).toFixed(3)})`;
          ctx!.lineWidth = Math.max(0.6, width * pt.s);
          if (glow) {
            ctx!.shadowColor = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.5)`;
            ctx!.shadowBlur = 15 * pt.s;
          }
          ctx!.beginPath();
          ctx!.moveTo(prev.x, prev.y);
          ctx!.lineTo(pt.x, pt.y);
          ctx!.stroke();
          if (glow) ctx!.shadowBlur = 0;
        }
        prev = pt;
        last = pt;
      }
      return last;
    }

    function draw(now: number) {
      const p = pointer.current;
      p.x += (p.tx - p.x) * 0.055;
      p.y += (p.ty - p.y) * 0.055;
      if (!reduced) clock.current = now / 1000;
      if (intro.current < 1) intro.current = Math.min(1, intro.current + 0.013);
      const ease = 1 - Math.pow(1 - intro.current, 3);

      // Idle drift plus pointer lean. The drift is what makes it read as an
      // object sitting in space rather than a chart that happens to tilt.
      const rx = 0.46 + Math.sin(clock.current * 0.27) * 0.04 + p.y * 0.2;
      const ry = Math.sin(clock.current * 0.19) * 0.085 + p.x * 0.3;

      const cs = getComputedStyle(wrap!);
      const tickRgb = cs.getPropertyValue("--inst-tick-rgb").trim() || "255,255,255";
      const trackRgb = cs.getPropertyValue("--inst-track-rgb").trim() || "255,255,255";
      const trackA = Number(cs.getPropertyValue("--inst-track-a").trim() || 0.1);
      const targetCol = cs.getPropertyValue("--inst-target").trim() || "#c8942a";

      ctx!.clearRect(0, 0, size, size);

      // Scale ticks, on the mid plane so they read as the shared frame.
      for (let i = 0; i <= 4; i++) {
        const a = START + (SWEEP * i) / 4;
        const inner = project({ x: Math.cos(a) * 104, y: Math.sin(a) * 104, z: 0 }, rx, ry);
        const outer = project(
          { x: Math.cos(a) * (i % 2 === 0 ? 166 : 158), y: Math.sin(a) * (i % 2 === 0 ? 166 : 158), z: 0 },
          rx,
          ry
        );
        ctx!.strokeStyle = `rgba(${tickRgb},${i % 2 === 0 ? 0.3 : 0.15})`;
        ctx!.lineWidth = 1;
        ctx!.beginPath();
        ctx!.moveTo(inner.x, inner.y);
        ctx!.lineTo(outer.x, outer.y);
        ctx!.stroke();
      }

      // Painter's algorithm — furthest ring first, so nearer rings occlude.
      const planes = skills.map((skill, i) => ({
        skill,
        depth: (i - (skills.length - 1) / 2) * GAP,
      }));
      planes.sort(
        (a, b) => project({ x: 0, y: 0, z: b.depth }, rx, ry).z - project({ x: 0, y: 0, z: a.depth }, rx, ry).z
      );

      // Hovering a legend entry isolates its ring — the one interaction
      // this instrument has, and it exists to answer a real question a
      // static 4-ring stack cannot: "which ring is my reading level?"
      // Eased rather than snapped so the isolation reads as a focus
      // pull, not a toggle.
      const highlightTarget = highlightRef.current;
      highlightAmt.current += ((highlightTarget ? 1 : 0) - highlightAmt.current) * 0.16;
      const h = highlightAmt.current;

      for (const { skill, depth } of planes) {
        const isTarget = highlightTarget === skill.key;
        const dim = highlightTarget ? 1 - h * (isTarget ? 0 : 0.72) : 1;
        strokeArc(depth, START, START + SWEEP, rx, ry, trackRgb.split(",").map(Number) as [number, number, number], trackA * dim, 5, false);
        const raw = skill.level;
        if (raw == null || !Number.isFinite(raw) || raw <= 0) continue;
        const value = Math.max(0, Math.min(4, raw));
        const rgb = RING_RGB[skill.key];
        const end = START + SWEEP * (value / 4) * ease;
        const widthBoost = isTarget ? 1 + h * 0.5 : 1;
        const head = strokeArc(depth, START, end, rx, ry, rgb, dim, 10 * widthBoost, true);
        if (head) {
          ctx!.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${dim.toFixed(3)})`;
          ctx!.shadowColor = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${(0.85 * dim).toFixed(3)})`;
          ctx!.shadowBlur = (isTarget ? 22 : 15) * head.s;
          ctx!.beginPath();
          ctx!.arc(head.x, head.y, (isTarget ? 5.6 : 4.6) * widthBoost * head.s, 0, Math.PI * 2);
          ctx!.fill();
          ctx!.shadowBlur = 0;
        }
      }

      // Target plane — the real objective, cut through the whole volume.
      if (target != null && Number.isFinite(target)) {
        const a = START + SWEEP * (Math.max(0, Math.min(4, target)) / 4);
        const zHalf = ((skills.length - 1) / 2) * GAP;
        const from = project({ x: Math.cos(a) * 104, y: Math.sin(a) * 104, z: -zHalf }, rx, ry);
        const to = project({ x: Math.cos(a) * 172, y: Math.sin(a) * 172, z: zHalf }, rx, ry);
        ctx!.strokeStyle = targetCol;
        ctx!.globalAlpha = 0.8;
        ctx!.lineWidth = 1.5;
        ctx!.setLineDash([5, 5]);
        ctx!.beginPath();
        ctx!.moveTo(from.x, from.y);
        ctx!.lineTo(to.x, to.y);
        ctx!.stroke();
        ctx!.setLineDash([]);
        ctx!.globalAlpha = 1;
      }

      if (!reduced) raf.current = requestAnimationFrame(draw);
    }

    if (reduced) {
      intro.current = 1;
      draw(0);
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
          <li
            key={s.key}
            className={hoverKey === s.key ? "is-hover" : undefined}
            tabIndex={0}
            onMouseEnter={() => setHoverKey(s.key)}
            onMouseLeave={() => setHoverKey((k) => (k === s.key ? null : k))}
            onFocus={() => setHoverKey(s.key)}
            onBlur={() => setHoverKey((k) => (k === s.key ? null : k))}
          >
            <i style={{ background: `rgb(${RING_RGB[s.key].join(",")})` }} aria-hidden="true" />
            <span>{s.label}</span>
            <b className="p-num">{s.level == null ? "—" : s.level}</b>
          </li>
        ))}
      </ul>
    </div>
  );
}
