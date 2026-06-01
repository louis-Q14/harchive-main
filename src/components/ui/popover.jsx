import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"

import { cn } from "@/lib/utils"

/** @type {React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLDivElement> & {open?: boolean, onOpenChange?: (open: boolean) => void, defaultOpen?: boolean, modal?: boolean} & React.RefAttributes<HTMLDivElement>>} */
const Popover = React.forwardRef((props, ref) => (
  <PopoverPrimitive.Root {...props}>
    {props.children}
  </PopoverPrimitive.Root>
))
Popover.displayName = "Popover"

/** @type {React.ForwardRefExoticComponent<React.ButtonHTMLAttributes<HTMLButtonElement> & {asChild?: boolean} & React.RefAttributes<HTMLButtonElement>>} */
const PopoverTrigger = React.forwardRef((props, ref) => (
  <PopoverPrimitive.Trigger ref={ref} {...props} />
))
PopoverTrigger.displayName = "PopoverTrigger"

const PopoverAnchor = PopoverPrimitive.Anchor

/** @type {React.ForwardRefExoticComponent<React.HTMLAttributes<HTMLDivElement> & React.RefAttributes<HTMLDivElement>>} */
const PopoverContent = React.forwardRef(({ className, align = "center", sideOffset = 4, style, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      style={{ ...style, background: "transparent" }}
      {...props} />
  </PopoverPrimitive.Portal>
))
PopoverContent.displayName = PopoverPrimitive.Content.displayName

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor }