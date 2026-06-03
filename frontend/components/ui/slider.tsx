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
        className="flex items-center justify-center h-8 w-6 rounded-none border-[3px] border-[#1c1f3a] bg-[#fdfcf9] shadow-[2px_2px_0_#1c1f3a] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 hover:scale-110 active:scale-95 cursor-grab active:cursor-grabbing z-10"
        style={{ ["--tw-ring-color" as string]: color }}
      >
        <div className="flex flex-col gap-0.5 opacity-50">
          <div className="w-2 h-0.5 bg-[#1c1f3a]" />
          <div className="w-2 h-0.5 bg-[#1c1f3a]" />
          <div className="w-2 h-0.5 bg-[#1c1f3a]" />
        </div>
      </SliderPrimitive.Thumb>
    </SliderPrimitive.Root>
  )
})
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
