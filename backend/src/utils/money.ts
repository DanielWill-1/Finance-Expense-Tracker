/** Round a finite major-unit amount to the product's two-decimal storage policy. */
export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) throw new TypeError('Money values must be finite');
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
