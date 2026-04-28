"use client"

import { Slider as SliderPrimitive } from "radix-ui";
import * as React from "react";

import { cn } from "@/lib/utils";

interface FaderSliderProps extends React.ComponentProps<typeof SliderPrimitive.Root> {
  iconBackground: string;
}

function FaderSlider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 120,
  iconBackground,
  ...props
}: FaderSliderProps) {
  const _values = React.useMemo(
    () =>
      Array.isArray(value)
        ? value
        : Array.isArray(defaultValue)
          ? defaultValue
          : [min, max],
    [value, defaultValue, min, max]
  )

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(
        "relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-vertical:h-full data-vertical:min-h-40 data-vertical:w-auto data-vertical:flex-col",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className="relative grow overflow-hidden rounded-md bg-muted data-horizontal:h-1 data-horizontal:w-full data-vertical:h-full data-vertical:w-1"
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className="absolute bg-primary select-none data-horizontal:h-full data-vertical:w-full"
        />
      </SliderPrimitive.Track>
      {Array.from({ length: _values.length }, (_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={index}
          className={"relative block size-9 shrink-0 rounded-md transition-[color,box-shadow] select-none after:absolute after:-inset-2 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50" + (props.orientation == "vertical" ? '' : ' rotate-90')}
        >
          <svg 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="1.5" 
              className={`h-full w-full text-foreground ${iconBackground}`}
          >
              {/* Outer Shell */}
              <rect x="5" y="2" width="14" height="20" rx="1" fill="currentColor" fillOpacity="0.1" />
              
              {/* Grip Lines (Top) */}
              <line x1="8" y1="6" x2="16" y2="6" strokeOpacity="0.5" />
              <line x1="8" y1="8" x2="16" y2="8" strokeOpacity="0.5" />
              
              {/* Center Indicator Line (Heavier) */}
              <line x1="5" y1="12" x2="19" y2="12" strokeWidth="2.5" />
              
              {/* Grip Lines (Bottom) */}
              <line x1="8" y1="16" x2="16" y2="16" strokeOpacity="0.5" />
              <line x1="8" y1="18" x2="16" y2="18" strokeOpacity="0.5" />
          </svg>
        </SliderPrimitive.Thumb>
      ))}
    </SliderPrimitive.Root>
  )
}

export { FaderSlider };
