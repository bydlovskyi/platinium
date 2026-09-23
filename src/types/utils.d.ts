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

/**
 * `Intl.DateTimeFormat.prototype.formatRange` is well-supported at runtime
 * (Baseline since 2021) but missing from this project's `ES2020` `lib`
 * target (tsconfig.json), which only ships the constructor/format/
 * resolvedOptions surface. Augmenting the `Intl` namespace's `DateTimeFormat`
 * interface locally rather than widening `lib` project-wide, since this is
 * the one method `filters.formatDateRange` uses. The interface name is fixed
 * by TypeScript's declaration merging (it must match the ambient
 * `Intl.DateTimeFormat` exactly) and cannot take this repo's `IPrefix`
 * convention.
 */
declare namespace Intl {
  // eslint-disable-next-line @typescript-eslint/naming-convention -- must match the ambient `Intl.DateTimeFormat` name exactly to merge
  interface DateTimeFormat {
    formatRange: (start: Date | number, end: Date | number) => string
  }
}

