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
  }

  export function FieldSwitch({ title, description }: FieldSwitchProps) {
    return (
      <div className="w-full max-w-xs">
        <Field orientation="horizontal" className="border p-3 shadow-sm bg-card opacity-90 items-center">
          <FieldContent>
            <FieldLabel htmlFor="2fa">{title}</FieldLabel>
            <FieldDescription>
              {description}
            </FieldDescription>
          </FieldContent>
          <Switch id="2fa" />
        </Field>
      </div>
    )
  }
  