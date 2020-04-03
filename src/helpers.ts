export function ParseLootString(loot: string, removeBrackets = false): string {
    if (removeBrackets) {
        return loot.substring(loot.indexOf("[") + 1, loot.lastIndexOf("]"))
    }
    return loot.substring(loot.indexOf("["), loot.lastIndexOf("]") + 1)
}