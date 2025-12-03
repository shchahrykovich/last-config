/**
 * Parse config value based on its type
 */
export function parseConfigValue(value: string, type: string): string | number | boolean {
    if (type === 'number') {
        const parsed = Number(value)
        return isNaN(parsed) ? value : parsed
    }

    if (type === 'boolean') {
        const lowerValue = value.toLowerCase().trim()
        if (lowerValue === 'true') return true
        if (lowerValue === 'false') return false
        // If not a valid boolean string, return as-is
        return value
    }

    // Default: return as string
    return value
}