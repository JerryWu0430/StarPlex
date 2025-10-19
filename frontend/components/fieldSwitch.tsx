import {
    Field,
    FieldContent,
    FieldDescription,
    FieldLabel,
  } from "@/components/ui/field"
  import { Switch } from "@/components/ui/switch"
  
  interface FieldSwitchProps {
    title: string
    description: string
    checked?: boolean
    onCheckedChange?: (checked: boolean) => void
  }

  export function FieldSwitch({ title, description, checked, onCheckedChange }: FieldSwitchProps) {
    return (
      <div className="w-full max-w-xs">
        <Field orientation="horizontal" className="border p-3 shadow-sm bg-card opacity-90 rounded-lg transition-all duration-200 hover:opacity-100 hover:shadow-md">
          <FieldContent>
            <FieldLabel htmlFor={title} className="text-xs sm:text-sm">{title}</FieldLabel>
            <FieldDescription className="text-[10px] sm:text-xs">
              {description}
            </FieldDescription>
          </FieldContent>
          <div className="flex items-center self-center">
            <Switch id={title} checked={checked} onCheckedChange={onCheckedChange} />
          </div>
        </Field>
      </div>
    )
  }
  