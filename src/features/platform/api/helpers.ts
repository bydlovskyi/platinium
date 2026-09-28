// Replaces `{key}` placeholders in a path with the given values; unknown placeholders are left as they are.
export function parseDynamicKeys (url: string, dynamicKeys?: Record<string, string | number>): string {
  return url.replace(/\{([^}]+)\}/g, (match: string, key: string) => {
    const value = dynamicKeys?.[key]

    return value === undefined ? match : encodeURIComponent(String(value))
  })
}
