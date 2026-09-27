type TPrettify<T> = {
  [K in keyof T]: T[K] extends object
    ? TPrettify<T[K]>
    : T[K];
} & {}

type TIndexedObject<T = any> = Record<string, T>

type TCallbackFn<T extends unknown[] = [], R = void> = (...args: T) => R

type TFormatterFunction<T> = (row: T) => (number | string)
type TTableHeadings<T = Record<string, any>> = {
  label: string
  value: string
  sort?: boolean
  width?: number
  minWidth?: number
  fixed?: boolean | 'left' | 'right'
  align?: 'left' | 'center' | 'right'
  showOverflowTooltip?: boolean
  sortMethod?: (a: number, b: number) => number
  formatter?: (row: T) => (number | string)
}[]

// formatRange is missing from the ES2020 lib target; augmented here rather than widening lib project-wide.
declare namespace Intl {
  // eslint-disable-next-line @typescript-eslint/naming-convention -- must match the ambient `Intl.DateTimeFormat` name exactly to merge
  interface DateTimeFormat {
    formatRange: (start: Date | number, end: Date | number) => string
  }
}

