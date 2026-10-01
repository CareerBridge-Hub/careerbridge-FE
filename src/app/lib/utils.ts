export { cn } from "cn"

/** aria attributes that tie an input to its <Field> error message. */
export const invalid = (id: string, error?: string) =>
  error ? { 'aria-invalid': true as const, 'aria-describedby': `${id}-error` } : {}
