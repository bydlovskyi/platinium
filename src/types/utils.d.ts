// formatRange is missing from the ES2020 lib target; augmented here rather than widening lib project-wide.
declare namespace Intl {
  // eslint-disable-next-line @typescript-eslint/naming-convention -- must match the ambient `Intl.DateTimeFormat` name exactly to merge
  interface DateTimeFormat {
    formatRange: (start: Date | number, end: Date | number) => string
  }
}
