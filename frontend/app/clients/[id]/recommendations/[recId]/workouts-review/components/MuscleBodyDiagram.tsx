'use client';

import { useId } from 'react';
import type { Exercise } from '@/lib/api';
import { cn } from '@/lib/utils';
import {
  MUSCLE_CATEGORY_HEX,
  MUSCLE_CATEGORY_META,
  MUSCLE_ORDER,
  type MuscleCategory,
  muscleFocusIntensityMap,
} from '../workout-review-utils';

interface MuscleBodyDiagramProps {
  exercises: Exercise[];
  className?: string;
}

function zoneOpacity(
  intensity: Map<MuscleCategory, number>,
  primary: MuscleCategory
): number {
  const p = intensity.get(primary) ?? 0;
  const full = intensity.get('full') ?? 0;
  if (p <= 0 && full <= 0) return 0;
  const blended = Math.max(p, full * 0.88);
  return Math.min(0.92, 0.18 + 0.74 * blended);
}

function buildAriaLabel(intensity: Map<MuscleCategory, number>): string {
  const parts: string[] = [];
  for (const cat of MUSCLE_ORDER) {
    const v = intensity.get(cat);
    if (v != null && v > 0 && cat !== 'other') {
      parts.push(MUSCLE_CATEGORY_META[cat].label);
    }
  }
  const other = intensity.get('other');
  if (other != null && other > 0) {
    parts.push(MUSCLE_CATEGORY_META.other.label);
  }
  if (parts.length === 0) {
    return 'Muscle focus not classified for this session';
  }
  return `Muscle focus for this session: ${parts.join(', ')}`;
}

export function MuscleBodyDiagram({
  exercises,
  className,
}: MuscleBodyDiagramProps) {
  const intensity = muscleFocusIntensityMap(exercises);
  const svgTitleId = useId().replace(/:/g, '');
  const filterId = `${svgTitleId}-glow`;

  const op = (cat: MuscleCategory) => zoneOpacity(intensity, cat);
  const chest = op('chest');
  const back = op('back');
  const shoulders = op('shoulders');
  const arms = op('arms');
  const legs = op('legs');
  const glutes = op('glutes');
  const core = op('core');
  const other = op('other');
  const fullIntensity = intensity.get('full') ?? 0;
  const showFullRing = fullIntensity > 0;

  const hasLegend = MUSCLE_ORDER.some((cat) => (intensity.get(cat) ?? 0) > 0);

  return (
    <div
      className={cn(
        'flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4',
        className
      )}
    >
      <div className="relative shrink-0 text-muted-foreground">
        <svg
          viewBox="0 0 280 168"
          className="h-[7.5rem] w-auto max-w-full sm:h-[8.25rem]"
          role="img"
          aria-labelledby={svgTitleId}
        >
          <title id={svgTitleId}>{buildAriaLabel(intensity)}</title>
          <defs>
            <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1.2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Labels */}
          <text
            x={70}
            y={164}
            textAnchor="middle"
            className="fill-muted-foreground text-[9px] font-medium"
          >
            Front
          </text>
          <text
            x={210}
            y={164}
            textAnchor="middle"
            className="fill-muted-foreground text-[9px] font-medium"
          >
            Back
          </text>

          {/* —— Front figure (center x ≈ 70) —— */}
          <g opacity={0.95}>
            {/* Other / unspecified (behind specific muscles) */}
            <ellipse
              cx={70}
              cy={72}
              rx={22}
              ry={28}
              fill={MUSCLE_CATEGORY_HEX.other}
              opacity={other * 0.5}
            />
            <ellipse
              cx={70}
              cy={56}
              rx={26}
              ry={13}
              fill={MUSCLE_CATEGORY_HEX.chest}
              opacity={chest}
            />
            <ellipse
              cx={48}
              cy={46}
              rx={9}
              ry={7}
              fill={MUSCLE_CATEGORY_HEX.shoulders}
              opacity={shoulders}
            />
            <ellipse
              cx={92}
              cy={46}
              rx={9}
              ry={7}
              fill={MUSCLE_CATEGORY_HEX.shoulders}
              opacity={shoulders}
            />
            <ellipse
              cx={40}
              cy={74}
              rx={7}
              ry={19}
              fill={MUSCLE_CATEGORY_HEX.arms}
              opacity={arms}
            />
            <ellipse
              cx={100}
              cy={74}
              rx={7}
              ry={19}
              fill={MUSCLE_CATEGORY_HEX.arms}
              opacity={arms}
            />
            <ellipse
              cx={70}
              cy={80}
              rx={15}
              ry={11}
              fill={MUSCLE_CATEGORY_HEX.core}
              opacity={core}
            />
            <ellipse
              cx={58}
              cy={126}
              rx={10}
              ry={23}
              fill={MUSCLE_CATEGORY_HEX.legs}
              opacity={legs}
            />
            <ellipse
              cx={82}
              cy={126}
              rx={10}
              ry={23}
              fill={MUSCLE_CATEGORY_HEX.legs}
              opacity={legs}
            />

            {/* Stick outline */}
            <g
              fill="none"
              stroke="currentColor"
              strokeWidth={1.35}
              strokeLinecap="round"
              className="text-foreground/55"
            >
              <circle cx={70} cy={24} r={13} />
              <path d="M 70 37 L 70 98" />
              <path d="M 70 46 L 42 74" />
              <path d="M 70 46 L 98 74" />
              <path d="M 70 98 L 56 152" />
              <path d="M 70 98 L 84 152" />
            </g>
          </g>

          {/* —— Back figure (center x ≈ 210) —— */}
          <g opacity={0.95}>
            <ellipse
              cx={210}
              cy={72}
              rx={22}
              ry={30}
              fill={MUSCLE_CATEGORY_HEX.other}
              opacity={other * 0.45}
            />
            <ellipse
              cx={210}
              cy={58}
              rx={28}
              ry={16}
              fill={MUSCLE_CATEGORY_HEX.back}
              opacity={back}
            />
            <ellipse
              cx={188}
              cy={46}
              rx={9}
              ry={7}
              fill={MUSCLE_CATEGORY_HEX.shoulders}
              opacity={shoulders}
            />
            <ellipse
              cx={232}
              cy={46}
              rx={9}
              ry={7}
              fill={MUSCLE_CATEGORY_HEX.shoulders}
              opacity={shoulders}
            />
            <ellipse
              cx={180}
              cy={74}
              rx={7}
              ry={19}
              fill={MUSCLE_CATEGORY_HEX.arms}
              opacity={arms}
            />
            <ellipse
              cx={240}
              cy={74}
              rx={7}
              ry={19}
              fill={MUSCLE_CATEGORY_HEX.arms}
              opacity={arms}
            />
            <ellipse
              cx={210}
              cy={78}
              rx={14}
              ry={9}
              fill={MUSCLE_CATEGORY_HEX.core}
              opacity={core * 0.9}
            />
            <ellipse
              cx={210}
              cy={100}
              rx={19}
              ry={9}
              fill={MUSCLE_CATEGORY_HEX.glutes}
              opacity={glutes}
            />
            <ellipse
              cx={198}
              cy={126}
              rx={9}
              ry={23}
              fill={MUSCLE_CATEGORY_HEX.legs}
              opacity={legs}
            />
            <ellipse
              cx={222}
              cy={126}
              rx={9}
              ry={23}
              fill={MUSCLE_CATEGORY_HEX.legs}
              opacity={legs}
            />

            <g
              fill="none"
              stroke="currentColor"
              strokeWidth={1.35}
              strokeLinecap="round"
              className="text-foreground/55"
            >
              <circle cx={210} cy={24} r={13} />
              <path d="M 210 37 L 210 98" />
              <path d="M 210 46 L 182 74" />
              <path d="M 210 46 L 238 74" />
              <path d="M 210 98 L 196 152" />
              <path d="M 210 98 L 224 152" />
            </g>
          </g>

          {showFullRing ? (
            <ellipse
              cx={70}
              cy={88}
              rx={44}
              ry={72}
              fill="none"
              stroke={MUSCLE_CATEGORY_HEX.full}
              strokeWidth={1.5}
              opacity={Math.min(0.55, 0.22 + fullIntensity * 0.38)}
              filter={`url(#${filterId})`}
            />
          ) : null}
          {showFullRing ? (
            <ellipse
              cx={210}
              cy={88}
              rx={44}
              ry={72}
              fill="none"
              stroke={MUSCLE_CATEGORY_HEX.full}
              strokeWidth={1.5}
              opacity={Math.min(0.55, 0.22 + fullIntensity * 0.38)}
              filter={`url(#${filterId})`}
            />
          ) : null}
        </svg>
      </div>

      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-[11px] font-medium text-muted-foreground">
          Session muscle focus
        </p>
        {hasLegend ? (
          <ul className="flex flex-wrap gap-x-3 gap-y-1">
            {MUSCLE_ORDER.map((cat) => {
              const v = intensity.get(cat);
              if (v == null || v <= 0) return null;
              const meta = MUSCLE_CATEGORY_META[cat];
              return (
                <li
                  key={cat}
                  className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground"
                >
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: MUSCLE_CATEGORY_HEX[cat] }}
                    aria-hidden
                  />
                  {meta.label}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-[11px] text-muted-foreground">
            No muscle groups could be inferred from exercise names or library
            metadata.
          </p>
        )}
      </div>
    </div>
  );
}
