export interface CalculatorState { display: string; accumulator: number | null; operator: string | null; replace: boolean }
export const initialCalculator: CalculatorState = { display: '0', accumulator: null, operator: null, replace: true };

function compute(a: number, b: number, operator: string): number {
  if (operator === '+') return a + b;
  if (operator === '−') return a - b;
  if (operator === '×') return a * b;
  return b === 0 ? NaN : a / b;
}

// Faqat tugmalardagi amallar bajariladi: foydalanuvchi matnini kod sifatida ishlatmaymiz.
export function calculatorStep(previous: CalculatorState, key: string): CalculatorState {
  let { display, accumulator, operator, replace } = previous;
  if (/^\d$/.test(key)) { display = replace || display === '0' ? key : display + key; replace = false; }
  else if (key === '.') { if (replace) { display = '0.'; replace = false; } else if (!display.includes('.')) display += '.'; }
  else if (key === 'C') return { ...initialCalculator };
  else if (key === '⌫') { display = display.slice(0, -1) || '0'; replace = false; }
  else if (['√', 'x²', '±', 'π', '%', '1/x'].includes(key)) {
    const value = Number(display);
    const result = key === '√' ? Math.sqrt(value) : key === 'x²' ? value * value : key === '±' ? -value : key === 'π' ? Math.PI : key === '%' ? value / 100 : value === 0 ? NaN : 1 / value;
    display = String(result); replace = true;
  } else if (key === '=') {
    if (accumulator !== null && operator) display = String(compute(accumulator, Number(display), operator));
    accumulator = null; operator = null; replace = true;
  } else if (['+', '−', '×', '÷'].includes(key)) {
    if (accumulator !== null && operator && !replace) display = String(compute(accumulator, Number(display), operator));
    accumulator = Number(display); operator = key; replace = true;
  }
  if (!Number.isFinite(Number(display))) return { ...initialCalculator, display: 'error' };
  if (display.length > 18 && !display.endsWith('.')) display = String(Number(Number(display).toPrecision(12)));
  return { display, accumulator, operator, replace };
}
