"use client";

import { useEffect, useRef, useState } from "react";
import { SOURCE_IDS } from "./data";
import {
  LEFT_IDS,
  RIGHT_IDS,
  SPINE_GAP,
  CR,
  CONVERGE_BIAS_X,
  CONVERGE_BIAS_Y,
  SAMPLE_COUNT,
} from "@/lib/constants";

interface ConnectionLinesProps {
  hoveredSource: string | null;
  gridRef: React.RefObject<HTMLDivElement>;
  coreRef: React.RefObject<HTMLDivElement>;
}

interface Particle {
  x: number;
  y: number;
  progress: number;
  speed: number;
  pathIndex: number;
}

interface Point {
  x: number;
  y: number;
}

interface NodePath {
  id: string;
  d: string;
  samples: Point[];
}

function dist(a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function qlen(a: Point, b: Point, c: Point): number {
  return dist(a, b) + dist(b, c);
}

function lineP(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function quadP(a: Point, b: Point, c: Point, t: number): Point {
  const mt = 1 - t;
  return {
    x: mt * mt * a.x + 2 * mt * t * b.x + t * t * c.x,
    y: mt * mt * a.y + 2 * mt * t * b.y + t * t * c.y,
  };
}

function buildNodePath(id: string, s: Point, c1: Point, c2: Point, e: Point): NodePath {
  const d1 = dist(c1, c2);
  const d2 = dist(c2, e);
  const isLeft = s.x < c1.x;
  const r1 = Math.min(CR, Math.abs(c1.x - s.x) / 2, d1 / 2);
  const r2 = Math.min(CR, d1 / 2, d2 / 3);
  const ux1 = d1 > 0 ? (c2.x - c1.x) / d1 : 0;
  const uy1 = d1 > 0 ? (c2.y - c1.y) / d1 : 0;
  const ux2 = d2 > 0 ? (e.x - c2.x) / d2 : 0;
  const uy2 = d2 > 0 ? (e.y - c2.y) / d2 : 0;
  const hx = isLeft ? c1.x - r1 : c1.x + r1;
  const q1x = c1.x + ux1 * r1;
  const q1y = c1.y + uy1 * r1;
  const ax = c2.x - ux1 * r2;
  const ay = c2.y - uy1 * r2;
  const q2x = c2.x + ux2 * r2;
  const q2y = c2.y + uy2 * r2;

  const d = [
    `M${s.x},${s.y}`,
    `L${hx},${s.y}`,
    `Q${c1.x},${c1.y} ${q1x},${q1y}`,
    `L${ax},${ay}`,
    `Q${c2.x},${c2.y} ${q2x},${q2y}`,
    `L${e.x},${e.y}`,
  ].join(" ");

  const segs: { type: "L" | "Q"; a: Point; b: Point; c?: Point }[] = [
    { type: "L", a: s, b: { x: hx, y: s.y } },
    { type: "Q", a: { x: hx, y: s.y }, b: c1, c: { x: q1x, y: q1y } },
    { type: "L", a: { x: q1x, y: q1y }, b: { x: ax, y: ay } },
    { type: "Q", a: { x: ax, y: ay }, b: c2, c: { x: q2x, y: q2y } },
    { type: "L", a: { x: q2x, y: q2y }, b: e },
  ];

  let tl = 0;
  for (const g of segs) tl += g.type === "L" ? dist(g.a, g.b) : qlen(g.a, g.b, g.c!);

  const samples: Point[] = [];
  for (let i = 0; i <= SAMPLE_COUNT; i++) {
    if (i === SAMPLE_COUNT) {
      samples.push(e);
      break;
    }
    const tgt = (i / SAMPLE_COUNT) * tl;
    let acc = 0;
    for (const g of segs) {
      const sl = g.type === "L" ? dist(g.a, g.b) : qlen(g.a, g.b, g.c!);
      if (acc + sl >= tgt || g === segs[segs.length - 1]) {
        const t = sl > 0 ? (tgt - acc) / sl : 0;
        if (g.type === "L") samples.push(lineP(g.a, g.b, t));
        else samples.push(quadP(g.a, g.b, g.c!, t));
        break;
      }
      acc += sl;
    }
  }

  return { id, d, samples };
}

function computePaths(
  gridRect: DOMRect,
  coreRect: DOMRect,
  nodeRects: Map<string, DOMRect>
): NodePath[] {
  const cx = coreRect.left + coreRect.width / 2 - gridRect.left;
  const cy = coreRect.top + coreRect.height / 2 - gridRect.top;

  const left: { id: string; rect: DOMRect }[] = [];
  const right: { id: string; rect: DOMRect }[] = [];
  nodeRects.forEach((rect, id) => {
    if (LEFT_IDS.has(id)) left.push({ id, rect });
    else if (RIGHT_IDS.has(id)) right.push({ id, rect });
  });
  left.sort((a, b) => a.rect.top - b.rect.top);
  right.sort((a, b) => a.rect.top - b.rect.top);

  const res: NodePath[] = [];

  if (left.length > 0) {
    const re = Math.max(...left.map((n) => n.rect.left + n.rect.width));
    const sx = re - gridRect.left + SPINE_GAP;
    const ty = left[0].rect.top + left[0].rect.height / 2 - gridRect.top;
    const by =
      left[left.length - 1].rect.top + left[left.length - 1].rect.height / 2 - gridRect.top;
    const my = ty + (by - ty) * 0.5;
    const convergeX = sx + (cx - sx) * CONVERGE_BIAS_X;
    const convergeY = my + (cy - my) * CONVERGE_BIAS_Y;
    for (const { id, rect } of left) {
      const ny = rect.top + rect.height / 2 - gridRect.top;
      res.push(
        buildNodePath(
          id,
          { x: rect.left + rect.width - gridRect.left, y: ny },
          { x: sx, y: ny },
          { x: convergeX, y: convergeY },
          { x: cx, y: cy }
        )
      );
    }
  }

  if (right.length > 0) {
    const le = Math.min(...right.map((n) => n.rect.left));
    const sx = le - gridRect.left - SPINE_GAP;
    const ty = right[0].rect.top + right[0].rect.height / 2 - gridRect.top;
    const by =
      right[right.length - 1].rect.top + right[right.length - 1].rect.height / 2 - gridRect.top;
    const my = ty + (by - ty) * 0.5;
    const convergeX = sx + (cx - sx) * CONVERGE_BIAS_X;
    const convergeY = my + (cy - my) * CONVERGE_BIAS_Y;
    for (const { id, rect } of right) {
      const ny = rect.top + rect.height / 2 - gridRect.top;
      res.push(
        buildNodePath(
          id,
          { x: rect.left - gridRect.left, y: ny },
          { x: sx, y: ny },
          { x: convergeX, y: convergeY },
          { x: cx, y: cy }
        )
      );
    }
  }

  return res;
}

export default function ConnectionLines({ hoveredSource, gridRef, coreRef }: ConnectionLinesProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const pr = useRef<Particle[]>([]);
  const raf = useRef<number>(0);
  const gr = useRef<(SVGCircleElement | null)[]>([]);
  const cr = useRef<(SVGCircleElement | null)[]>([]);
  const pathsRef = useRef<NodePath[]>([]);
  const pcRef = useRef(0);
  const nodeElsRef = useRef<Map<string, Element>>(new Map());

  const [renderPaths, setRenderPaths] = useState<NodePath[]>([]);

  useEffect(() => {
    const gridEl = gridRef.current;
    const coreEl = coreRef.current;
    if (!gridEl || !coreEl) return;

    const updatePaths = () => {
      if (nodeElsRef.current.size === 0) {
        SOURCE_IDS.forEach((id) => {
          const el = gridEl.querySelector(`[data-node-id="${id}"]`);
          if (el) nodeElsRef.current.set(id, el);
        });
      }

      const gridRect = gridEl.getBoundingClientRect();
      const coreRect = coreEl.getBoundingClientRect();
      const nodeRects = new Map<string, DOMRect>();
      nodeElsRef.current.forEach((el, id) => nodeRects.set(id, el.getBoundingClientRect()));

      const newPaths = computePaths(gridRect, coreRect, nodeRects);
      pathsRef.current = newPaths;

      const expectedLen = newPaths.length * 2;
      if (pr.current.length !== expectedLen) {
        pcRef.current = expectedLen;
        pr.current = Array.from({ length: expectedLen }, (_, i) => ({
          x: 0,
          y: 0,
          progress: (i % 2) * 0.5,
          speed: 0.002 + Math.random() * 0.001,
          pathIndex: Math.floor(i / 2),
        }));
        gr.current = new Array(expectedLen).fill(null);
        cr.current = new Array(expectedLen).fill(null);
      }

      setRenderPaths(newPaths);
    };

    updatePaths();

    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(updatePaths);
    });

    resizeObserver.observe(gridEl);
    resizeObserver.observe(coreEl);
    nodeElsRef.current.forEach((el) => {
      resizeObserver.observe(el);
    });

    window.addEventListener("resize", updatePaths);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updatePaths);
    };
  }, [gridRef, coreRef]);

  useEffect(() => {
    const frame = () => {
      const paths = pathsRef.current;
      const ps = pr.current;
      if (paths.length > 0 && ps.length > 0) {
        for (let i = 0; i < ps.length; i++) {
          const p = ps[i];
          p.progress += p.speed;
          if (p.progress > 1) p.progress -= 1;
          const np = paths[p.pathIndex];
          if (!np || !np.samples.length) continue;
          const idx = Math.floor(p.progress * (np.samples.length - 1));
          const pt = np.samples[idx];
          const ge = gr.current[i];
          const ce = cr.current[i];
          if (ge) {
            ge.setAttribute("cx", String(pt.x));
            ge.setAttribute("cy", String(pt.y));
          }
          if (ce) {
            ce.setAttribute("cx", String(pt.x));
            ce.setAttribute("cy", String(pt.y));
          }
        }
      }
      raf.current = requestAnimationFrame(frame);
    };

    raf.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf.current);
  }, []);

  const renderPc = renderPaths.length * 2;

  return (
    <svg
      ref={svgRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ position: "absolute", top: 0, left: 0 }}
    >
      <defs>
        <radialGradient id="line-grad" cx="50%" cy="50%" r="75%">
          <stop offset="0%" stopColor="hsl(199, 89%, 48%)" stopOpacity="0.6" />
          <stop offset="35%" stopColor="hsl(217, 91%, 60%)" stopOpacity="0.4" />
          <stop offset="75%" stopColor="hsl(217, 91%, 60%)" stopOpacity="0.1" />
          <stop offset="100%" stopColor="hsl(217, 91%, 60%)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {renderPaths.map((np) => {
        const ih = hoveredSource === np.id;
        const iah = hoveredSource !== null;
        return (
          <g key={np.id}>
            <path
              data-id={np.id}
              className="main"
              d={np.d}
              fill="none"
              stroke="url(#line-grad)"
              strokeWidth={2.5}
              opacity={iah ? (ih ? 0.9 : 0.15) : 0.35}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              data-id={np.id}
              className="glow"
              d={np.d}
              fill="none"
              stroke="hsl(217, 91%, 60%)"
              strokeWidth={1}
              opacity={iah ? (ih ? 0.5 : 0.08) : 0.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {ih && (
              <path
                data-id={np.id}
                className="dash"
                d={np.d}
                fill="none"
                stroke="hsl(217, 91%, 60%)"
                strokeWidth={3}
                opacity={0.5}
                strokeDasharray="6 4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </g>
        );
      })}

      {Array.from({ length: renderPc }, (_, i) => {
        const pathIdx = Math.floor(i / 2);
        const np = renderPaths[pathIdx];
        if (!np) return null;
        const ih = hoveredSource === np.id;
        const iah = hoveredSource !== null;
        const bo = iah ? (ih ? 1 : 0.2) : 0.6;
        return (
          <g key={i}>
            <circle
              ref={(el) => {
                gr.current[i] = el;
              }}
              cx={0}
              cy={0}
              r={ih ? 9 : 6}
              fill="hsl(217, 91%, 60%)"
              opacity={bo * 0.15}
            />
            <circle
              ref={(el) => {
                cr.current[i] = el;
              }}
              cx={0}
              cy={0}
              r={ih ? 3 : 2}
              fill="hsl(217, 91%, 60%)"
              opacity={bo}
            />
          </g>
        );
      })}
    </svg>
  );
}
