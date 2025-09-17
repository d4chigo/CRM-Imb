import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "placeholder:text-muted-foreground dark:bg-input/30 border-input flex min-h-[80px] w-full rounded-lg border bg-white px-3 py-2 text-sm shadow-sm transition-all duration-200 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:shadow-md disabled:cursor-not-allowed disabled:opacity-50 hover:border-foreground/20 hover:shadow-sm resize-y",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
