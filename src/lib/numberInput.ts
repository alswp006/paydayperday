/** 숫자 이외 문자를 모두 지우고(부호·통화·구분자·소수점 포함) 앞의 0을 제거한 뒤 maxDigits로 자른다. 0이면 빈 문자열 */
export function normalizeDigits(raw: string, maxDigits: number): string {
  const digits = String(raw ?? '')
    .replace(/\D/g, '')
    .replace(/^0+/, '')
    .slice(0, maxDigits);
  return digits;
}

export function toIntOrNull(s: string): number | null {
  const digits = normalizeDigits(s, Infinity);
  if (!digits) return null;
  const n = Number(digits);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

/** 입력 문자열을 정수로 정규화한다 ('1,234' → 1234). 숫자가 없거나 유효하지 않으면 0 */
export function normalizeNumberInput(input: string): number {
  return toIntOrNull(input) ?? 0;
}
