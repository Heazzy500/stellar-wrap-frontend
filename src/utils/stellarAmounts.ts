/**
 * Stellar Amount and Stroop Utility Functions
 *
 * Stellar uses 7 decimal places of precision for XLM.
 * 1 XLM = 10,000,000 Stroops (10^7).
 *
 * All conversions use BigInt / exact integer and string manipulation to avoid
 * JavaScript IEEE-754 floating point precision errors.
 */

export const STROOPS_PER_XLM = BigInt(10_000_000);
export const STROOPS_DECIMALS = 7;
export const BASE_RESERVE_STROOPS = BigInt(5_000_000); // 0.5 XLM standard base reserve
export const DEFAULT_BASE_FEE_STROOPS = BigInt(100); // 100 stroops (0.00001 XLM)

export interface FormatStellarAmountOptions {
  /** Input type: whether the provided value is already in 'stroops' or 'xlm' */
  inputType?: 'stroops' | 'xlm';
  /** Desired output unit display ('XLM', 'stroops', or 'both') */
  unit?: 'XLM' | 'stroops' | 'both';
  /** Maximum number of decimal places to show when displaying XLM (0-7, default 7) */
  maxDecimals?: number;
  /** Minimum number of decimal places to show (0-7, default 0) */
  minDecimals?: number;
  /** Whether to append the unit string (e.g. " XLM", " stroops") */
  includeSymbol?: boolean;
  /** Use thousands separators (e.g. "1,000.5") */
  useGrouping?: boolean;
}

export interface ParsedStellarAmount {
  valid: boolean;
  stroops: bigint;
  xlm: string;
  error?: string;
}

/**
 * Converts a Stroop amount to an XLM decimal string with exact 7-decimal precision.
 * No floating point math is used.
 *
 * @param stroops - The amount in Stroops (string, number, or bigint)
 * @returns Formatted XLM string (e.g. "1.5", "0.00001", "100")
 */
export function stroopsToXlm(stroops: string | number | bigint): string {
  let stroopBigInt: bigint;
  try {
    if (typeof stroops === 'bigint') {
      stroopBigInt = stroops;
    } else if (typeof stroops === 'number') {
      if (!Number.isFinite(stroops) || !Number.isInteger(stroops)) {
        throw new Error('Stroops number must be a finite integer');
      }
      stroopBigInt = BigInt(stroops);
    } else {
      const trimmed = stroops.trim();
      if (!/^-?\d+$/.test(trimmed)) {
        throw new Error('Invalid stroops integer string');
      }
      stroopBigInt = BigInt(trimmed);
    }
  } catch (err) {
    throw new Error(`Cannot convert invalid stroops "${stroops}" to XLM: ${err instanceof Error ? err.message : String(err)}`);
  }

  const isNegative = stroopBigInt < BigInt(0);
  const absStroops = isNegative ? -stroopBigInt : stroopBigInt;

  const whole = absStroops / STROOPS_PER_XLM;
  const fraction = absStroops % STROOPS_PER_XLM;

  if (fraction === BigInt(0)) {
    return `${isNegative ? '-' : ''}${whole.toString()}`;
  }

  const fractionStr = fraction.toString().padStart(STROOPS_DECIMALS, '0').replace(/0+$/, '');
  return `${isNegative ? '-' : ''}${whole.toString()}.${fractionStr}`;
}

/**
 * Converts an XLM decimal string or number to Stroops (bigint) with exact precision.
 *
 * @param xlm - The amount in XLM (e.g. "10.5", 0.00001, "0.1234567")
 * @returns BigInt amount in Stroops
 * @throws Error if input has more than 7 decimal places or is not a valid number
 */
export function xlmToStroops(xlm: string | number): bigint {
  let str: string;
  if (typeof xlm === 'number') {
    if (!Number.isFinite(xlm)) {
      throw new Error('XLM amount must be a finite number');
    }
    // Convert number to fixed string to prevent scientific notation for small numbers
    str = xlm.toFixed(7);
  } else {
    str = xlm.trim();
  }

  if (!str) {
    throw new Error('XLM amount cannot be empty');
  }

  const isNegative = str.startsWith('-');
  const cleanStr = isNegative ? str.slice(1) : str;

  if (!/^\d+(\.\d+)?$/.test(cleanStr)) {
    throw new Error(`Invalid XLM amount format: "${xlm}"`);
  }

  const [wholeStr, fracStr = ''] = cleanStr.split('.');

  if (fracStr.length > STROOPS_DECIMALS) {
    throw new Error(`Stellar amounts exceed maximum precision of ${STROOPS_DECIMALS} decimal places: "${xlm}"`);
  }

  const paddedFrac = fracStr.padEnd(STROOPS_DECIMALS, '0');
  const wholePart = BigInt(wholeStr) * STROOPS_PER_XLM;
  const fracPart = BigInt(paddedFrac);

  const total = wholePart + fracPart;
  return isNegative ? -total : total;
}

/**
 * Parses and validates an arbitrary Stellar amount string (can be XLM or Stroops).
 *
 * @param input - The amount string to parse
 * @param inputType - Whether the input is in 'xlm' or 'stroops' (default 'xlm')
 */
export function parseStellarAmount(
  input: string,
  inputType: 'xlm' | 'stroops' = 'xlm',
): ParsedStellarAmount {
  try {
    const trimmed = input.trim();
    if (!trimmed) {
      return { valid: false, stroops: BigInt(0), xlm: '0', error: 'Amount cannot be empty' };
    }

    if (inputType === 'stroops') {
      if (!/^-?\d+$/.test(trimmed)) {
        return { valid: false, stroops: BigInt(0), xlm: '0', error: 'Stroops amount must be an integer' };
      }
      const stroops = BigInt(trimmed);
      const xlm = stroopsToXlm(stroops);
      return { valid: true, stroops, xlm };
    }

    // XLM input
    const stroops = xlmToStroops(trimmed);
    const xlm = stroopsToXlm(stroops);
    return { valid: true, stroops, xlm };
  } catch (err) {
    return {
      valid: false,
      stroops: BigInt(0),
      xlm: '0',
      error: err instanceof Error ? err.message : 'Invalid Stellar amount',
    };
  }
}

/**
 * Formats a Stellar amount for display in UI components.
 *
 * @param amount - Amount in stroops or XLM
 * @param options - Formatting configuration
 * @returns Human-readable formatted string
 */
export function formatStellarAmount(
  amount: string | number | bigint,
  options: FormatStellarAmountOptions = {},
): string {
  const {
    inputType = 'stroops',
    unit = 'XLM',
    maxDecimals = STROOPS_DECIMALS,
    minDecimals = 0,
    includeSymbol = true,
    useGrouping = true,
  } = options;

  let stroopBigInt: bigint;
  let xlmString: string;

  try {
    if (inputType === 'stroops') {
      if (typeof amount === 'bigint') {
        stroopBigInt = amount;
      } else if (typeof amount === 'number') {
        stroopBigInt = BigInt(Math.round(amount));
      } else {
        stroopBigInt = BigInt(amount.trim());
      }
      xlmString = stroopsToXlm(stroopBigInt);
    } else {
      if (typeof amount === 'bigint') {
        stroopBigInt = amount * STROOPS_PER_XLM;
        xlmString = amount.toString();
      } else {
        stroopBigInt = xlmToStroops(amount);
        xlmString = stroopsToXlm(stroopBigInt);
      }
    }
  } catch {
    return '0';
  }

  if (unit === 'stroops') {
    const stroopStr = stroopBigInt.toString();
    const formatted = useGrouping
      ? stroopStr.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
      : stroopStr;
    return includeSymbol ? `${formatted} stroops` : formatted;
  }

  // Format XLM string
  const [wholeStr, rawFracStr = ''] = xlmString.split('.');
  const wholeFormatted = useGrouping
    ? wholeStr.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    : wholeStr;

  let fracFormatted = rawFracStr.slice(0, Math.max(0, maxDecimals));
  if (fracFormatted.length < minDecimals) {
    fracFormatted = fracFormatted.padEnd(minDecimals, '0');
  } else {
    // Trim trailing zeroes down to minDecimals
    while (fracFormatted.length > minDecimals && fracFormatted.endsWith('0')) {
      fracFormatted = fracFormatted.slice(0, -1);
    }
  }

  const resultXlm = fracFormatted.length > 0
    ? `${wholeFormatted}.${fracFormatted}`
    : wholeFormatted;

  if (unit === 'both') {
    const stroopPart = useGrouping
      ? stroopBigInt.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
      : stroopBigInt.toString();
    return `${resultXlm} XLM (${stroopPart} stroops)`;
  }

  return includeSymbol ? `${resultXlm} XLM` : resultXlm;
}

/**
 * Validates whether a given string is a valid Stellar amount.
 */
export function isValidStellarAmount(amount: string, allowZero = true): boolean {
  try {
    const parsed = parseStellarAmount(amount, 'xlm');
    if (!parsed.valid) return false;
    if (!allowZero && parsed.stroops === BigInt(0)) return false;
    return parsed.stroops >= BigInt(0);
  } catch {
    return false;
  }
}
