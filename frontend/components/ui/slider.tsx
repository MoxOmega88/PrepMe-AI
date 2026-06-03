"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"
import { cn } from "@/lib/utils"

type SliderProps = React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> & {
  fillColor?: string
}

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  SliderProps
>(({ className, fillColor, ...props }, ref) => {
  const color = fillColor ?? "#4A6FA5"
  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn("relative flex w-full touch-none select-none items-center cursor-pointer", className)}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-3 w-full grow overflow-hidden rounded-none bg-[#2A2A3A] border border-[#3A3A4A] shadow-inner">
        <SliderPrimitive.Range
          className="absolute h-full transition-colors duration-500"
          style={{ backgroundColor: color }}
        />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        className="block h-7 w-4 rounded-sm border-[1.5px] bg-[#1A1A2E] transition-all duration-500 focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 hover:scale-110 active:scale-95 cursor-grab active:cursor-grabbing z-10"
        style={{ borderColor: color, ["--tw-ring-color" as string]: color }}
      />
    </SliderPrimitive.Root>
  )
})
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
