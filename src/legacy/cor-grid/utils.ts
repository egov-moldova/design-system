import { GridSize, ResolvedGridSize } from './cor-grid.enums';

const BREAKPOINTS = ['xs', 'sm', 'md', 'lg', 'xl'] as const;

// type BreakpointKey = (typeof BREAKPOINTS)[number];

const clampSpan = (n: number) => {
  if (!Number.isFinite(n)) return undefined;
  return Math.min(12, Math.max(1, Math.round(n)));
};

export const parseSize = (size?: GridSize): ResolvedGridSize => {
  if (size == null) return {};

  // Normalize input → object
  let source: Record<string, unknown> | null = null;

  if (typeof size === 'number') {
    source = { all: size };
  } else if (typeof size === 'string') {
    const trimmed = size.trim();

    if (/^\d+$/.test(trimmed)) {
      source = { all: Number(trimmed) };
    } else if (trimmed.startsWith('{')) {
      try {
        source = JSON.parse(trimmed);
      } catch {
        return {};
      }
    }
  } else {
    source = size;
  }

  if (!source || typeof source !== 'object') return {};

  // Extract & clamp
  const out: ResolvedGridSize = {};

  if ('all' in source) {
    const v = clampSpan(Number(source.all));
    if (v) out.all = v;
  }

  for (const bp of BREAKPOINTS) {
    if (bp in source) {
      const v = clampSpan(Number((source as Record<string, unknown>)[bp]));
      if (v) out[bp] = v;
    }
  }

  return out;
};
