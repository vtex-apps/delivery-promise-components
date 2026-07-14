/**
 * Country-aware postal-code format registry + tiny mask engine.
 *
 * - Per-country `{ mode, mask }` lives in `POSTAL_CODE_FORMATS` below.
 *   `mode` decides which characters the field accepts (`numeric` ⇒ digits
 *   only; `alphanumeric` ⇒ letters + digits, uppercased). `mask` is an
 *   optional fixed-length pattern using the token language:
 *
 *     - `9` or `0` — digit `[0-9]`
 *     - `A`        — letter `[A-Za-z]` (auto-uppercased)
 *     - `*`        — alphanumeric `[A-Za-z0-9]` (auto-uppercased)
 *     - any other character — literal (space, `-`, …) inserted automatically
 *
 *   Both `9` and `0` are accepted as digit placeholders so masks can be
 *   written either way (e.g. BR `00000-000`, MX `00000`). They are
 *   functionally identical.
 *
 * - Only the top-10 countries are masked; every other country (and the
 *   unresolved-country case) uses `DEFAULT_FORMAT` (alphanumeric, no mask)
 *   so no localized market is ever hard-blocked from entering a postal
 *   code.
 */

export type PostalCodeMode = 'numeric' | 'alphanumeric'

export interface PostalCodeFormat {
  mode: PostalCodeMode
  mask?: string
  placeholder?: string
}

export type CountryKey = string

const ALPHA3_TO_ALPHA2: Record<string, string> = {
  BRA: 'BR',
  MEX: 'MX',
  ARG: 'AR',
  CHL: 'CL',
  COL: 'CO',
  PER: 'PE',
  USA: 'US',
  CAN: 'CA',
  ESP: 'ES',
  ITA: 'IT',
  FRA: 'FR',
}

const ALPHA2_RE = /^[A-Z]{2}$/
const ALPHA3_RE = /^[A-Z]{3}$/

export function normalizeCountry(input?: string): CountryKey | undefined {
  if (!input) return undefined
  const upper = String(input).trim().toUpperCase()

  if (ALPHA2_RE.test(upper)) return upper
  if (ALPHA3_RE.test(upper)) return ALPHA3_TO_ALPHA2[upper]

  return undefined
}

export const POSTAL_CODE_FORMATS: Record<CountryKey, PostalCodeFormat> = {
  BR: { mode: 'numeric', mask: '00000-000' },
  MX: { mode: 'numeric', mask: '00000' },
  AR: { mode: 'alphanumeric', mask: 'A9999AAA' },
  CL: { mode: 'numeric', mask: '0000000' },
  CO: { mode: 'numeric', mask: '000000' },
  PE: { mode: 'numeric', mask: '00000' },
  US: { mode: 'numeric', mask: '00000' },
  CA: { mode: 'alphanumeric', mask: 'A9A 9A9' },
  ES: { mode: 'numeric', mask: '00000' },
  IT: { mode: 'numeric', mask: '00000' },
  FR: { mode: 'numeric', mask: '00000' },
}

export const DEFAULT_FORMAT: PostalCodeFormat = { mode: 'alphanumeric' }

export function getPostalCodeFormat(country?: string): PostalCodeFormat {
  const key = normalizeCountry(country)
  const format = key ? POSTAL_CODE_FORMATS[key] : undefined

  return format ?? DEFAULT_FORMAT
}

const TOKEN_MATCHERS: Record<string, RegExp> = {
  '9': /[0-9]/,
  '0': /[0-9]/,
  A: /[A-Za-z]/,
  '*': /[A-Za-z0-9]/,
}

const isMaskPlaceholder = (token: string): boolean =>
  Object.prototype.hasOwnProperty.call(TOKEN_MATCHERS, token)

/**
 * The number of characters a format requires — i.e. the count of mask
 * placeholder tokens (`9`/`0`/`A`/`*`). Literals (spaces, dashes) don't count.
 * Mask-less formats (the permissive default and any country outside the
 * curated top-10) return `0`, meaning "no fixed length to enforce".
 */
export function getRequiredLength(format: PostalCodeFormat): number {
  const { mask } = format

  if (!mask) return 0

  let count = 0

  for (let i = 0; i < mask.length; i++) {
    if (isMaskPlaceholder(mask[i])) count += 1
  }

  return count
}

/**
 * Whether a compact (unmasked) postal code satisfies its format's required
 * length. Always `true` for mask-less formats, so markets outside the curated
 * registry are never blocked from submitting. The comparison strips any
 * non-alphanumeric character first, so it's agnostic to whether the caller
 * passes the masked or the compact value.
 */
export function isPostalCodeComplete(
  value: string,
  format: PostalCodeFormat
): boolean {
  const required = getRequiredLength(format)

  if (required === 0) return true

  const compact = (value ?? '').replace(/[^A-Za-z0-9]/g, '')

  return compact.length >= required
}

const tokenMatches = (char: string, token: string): boolean => {
  const matcher = TOKEN_MATCHERS[token]

  return matcher ? matcher.test(char) : false
}

const transformChar = (char: string, token: string): string =>
  token === 'A' || token === '*' ? char.toUpperCase() : char

export function sanitizeByMode(raw: string, mode: PostalCodeMode): string {
  if (!raw) return ''
  if (mode === 'numeric') return raw.replace(/[^0-9]/g, '')

  return raw.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
}

export function applyMask(raw: string, mask: string): string {
  if (!mask) return raw
  if (!raw) return ''

  let result = ''
  let rawIdx = 0

  for (let i = 0; i < mask.length; i++) {
    const token = mask[i]

    if (isMaskPlaceholder(token)) {
      while (rawIdx < raw.length && !tokenMatches(raw[rawIdx], token)) {
        rawIdx += 1
      }

      if (rawIdx >= raw.length) break
      result += transformChar(raw[rawIdx], token)
      rawIdx += 1
    } else if (rawIdx < raw.length) {
      // Literal — only emit while raw still has chars feeding subsequent
      // placeholders, so we never produce a trailing separator.
      result += token
    } else {
      break
    }
  }

  return result
}

export function unmask(value: string, mask?: string): string {
  if (!value) return ''
  if (!mask) return value.trim()

  const literals = new Set<string>()

  for (let i = 0; i < mask.length; i++) {
    const t = mask[i]

    if (!isMaskPlaceholder(t)) literals.add(t)
  }

  let result = ''

  for (let i = 0; i < value.length; i++) {
    const c = value[i]

    if (!literals.has(c)) result += c
  }

  return result
}
