/**
 * Evaluates a calculator expression containing only digits, whitespace,
 * parentheses, and the four basic operators. The regex gate makes the
 * Function constructor safe here.
 */
export function safeEvaluate(expr: string): number {
  const clean = expr.replace(/\s+/g, "");
  if (!/^[\d+\-*/.()]+$/.test(clean)) throw new Error("Invalid input");
  return new Function(`return (${clean})`)() as number;
}
