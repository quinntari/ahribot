/**
 * @param min The minimum value
 * @param max The maximum value
 * @returns A random number (inclusive) between min and max
 */
export function getRandomInt (min: number, max: number): number {
	return Math.floor((Math.random() * (max - min + 1)) + min)
}

export function formatNumber (number: number, decimals = false): string {
	return number.toLocaleString('en', { maximumFractionDigits: decimals ? 2 : 0, minimumFractionDigits: decimals ? 2 : 0 })
}
