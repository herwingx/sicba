/**
 * Componente UI Primitivo: separator
 * Basado en shadcn/ui y Radix UI Primitives.
 * Utiliza la utilidad `cn()` para la fusión segura de clases Tailwind CSS.
 * Mantiene la accesibilidad web (WAI-ARIA) por defecto.
 */

import { Separator as SeparatorPrimitive } from "@base-ui/react/separator"
import { cn } from "cn"

function Separator({
  className,
  orientation = "horizontal",
  ...props
}: SeparatorPrimitive.Props) {
  return (
    <SeparatorPrimitive
      data-slot="separator"
      orientation={orientation}
      className={cn(
        "shrink-0 bg-border data-horizontal:h-px data-horizontal:w-full data-vertical:w-px data-vertical:self-stretch",
        className
      )}
      {...props}
    />
  )
}

export { Separator }
