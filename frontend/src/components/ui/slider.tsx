import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SliderProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  valueLabel?: string;
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, label, valueLabel, value, onChange, ...props }, ref) => {
    const numericValue =
      typeof value === 'string' ? parseInt(value, 10) : value || 0;

    return (
      <div className="space-y-3">
        {label && (
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium leading-none">{label}</label>
            <span className="text-sm font-semibold text-primary min-w-[2rem] text-right">
              {valueLabel || numericValue}
            </span>
          </div>
        )}
        <input
          type="range"
          className={cn(
            'w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer',
            '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md',
            '[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0',
            className
          )}
          ref={ref}
          value={value}
          onChange={onChange}
          {...props}
        />
        <div className="flex justify-between text-xs text-muted-foreground px-1">
          <span>1 = {props.min === 1 ? 'Low' : 'Not at all'}</span>
          <span>10 = {props.max === 10 ? 'High' : 'Very much'}</span>
        </div>
      </div>
    );
  }
);
Slider.displayName = 'Slider';

export { Slider };
