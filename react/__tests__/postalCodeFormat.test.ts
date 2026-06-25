import {
  DEFAULT_FORMAT,
  POSTAL_CODE_FORMATS,
  applyMask,
  getPostalCodeFormat,
  normalizeCountry,
  sanitizeByMode,
  unmask,
} from '../utils/postalCodeFormat'

describe('postalCodeFormat — normalizeCountry', () => {
  it('returns uppercase alpha-2 for alpha-2 input (any case)', () => {
    expect(normalizeCountry('br')).toBe('BR')
    expect(normalizeCountry('BR')).toBe('BR')
    expect(normalizeCountry('ca')).toBe('CA')
  })

  it('folds known alpha-3 codes to alpha-2', () => {
    expect(normalizeCountry('BRA')).toBe('BR')
    expect(normalizeCountry('CAN')).toBe('CA')
    expect(normalizeCountry('ARG')).toBe('AR')
    expect(normalizeCountry('MEX')).toBe('MX')
    expect(normalizeCountry('USA')).toBe('US')
    expect(normalizeCountry('ESP')).toBe('ES')
    expect(normalizeCountry('ITA')).toBe('IT')
    expect(normalizeCountry('CHL')).toBe('CL')
    expect(normalizeCountry('COL')).toBe('CO')
    expect(normalizeCountry('PER')).toBe('PE')
  })

  it('trims surrounding whitespace before normalizing', () => {
    expect(normalizeCountry(' br ')).toBe('BR')
  })

  it('returns undefined for empty, falsy, or unrecognized input', () => {
    expect(normalizeCountry('')).toBeUndefined()
    expect(normalizeCountry(undefined)).toBeUndefined()
    expect(normalizeCountry('XYZ')).toBeUndefined()
    expect(normalizeCountry('ZZ')).toBeUndefined()
    expect(normalizeCountry('B1')).toBeUndefined()
    expect(normalizeCountry('123')).toBeUndefined()
    expect(normalizeCountry('Brazil')).toBeUndefined()
  })
})

describe('postalCodeFormat — POSTAL_CODE_FORMATS registry', () => {
  it('contains exactly the top-10 country entries', () => {
    const compare = (a: string, b: string) => a.localeCompare(b)
    const expected = [
      'AR',
      'BR',
      'CA',
      'CL',
      'CO',
      'ES',
      'IT',
      'MX',
      'PE',
      'US',
    ]

    expect([...Object.keys(POSTAL_CODE_FORMATS)].sort(compare)).toEqual(
      [...expected].sort(compare)
    )
  })

  it.each([
    ['BR', 'numeric', '00000-000'],
    ['MX', 'numeric', '00000'],
    ['AR', 'alphanumeric', 'A9999AAA'],
    ['CL', 'numeric', '0000000'],
    ['CO', 'numeric', '000000'],
    ['PE', 'numeric', '00000'],
    ['US', 'numeric', '00000'],
    ['CA', 'alphanumeric', 'A9A 9A9'],
    ['ES', 'numeric', '00000'],
    ['IT', 'numeric', '00000'],
  ])('declares %s as { mode: %s, mask: %s }', (country, mode, mask) => {
    expect(POSTAL_CODE_FORMATS[country]).toEqual(
      expect.objectContaining({ mode, mask })
    )
  })
})

describe('postalCodeFormat — getPostalCodeFormat', () => {
  it('returns the registry entry for a top-10 country', () => {
    expect(getPostalCodeFormat('BR')).toEqual(POSTAL_CODE_FORMATS.BR)
    expect(getPostalCodeFormat('CAN')).toEqual(POSTAL_CODE_FORMATS.CA)
    expect(getPostalCodeFormat('ar')).toEqual(POSTAL_CODE_FORMATS.AR)
  })

  it('returns the permissive default for a non-top-10 country', () => {
    expect(getPostalCodeFormat('NL')).toBe(DEFAULT_FORMAT)
    expect(getPostalCodeFormat('DE')).toBe(DEFAULT_FORMAT)
    expect(getPostalCodeFormat('JP')).toBe(DEFAULT_FORMAT)
  })

  it('returns the permissive default for unresolved/unknown country', () => {
    expect(getPostalCodeFormat(undefined)).toBe(DEFAULT_FORMAT)
    expect(getPostalCodeFormat('')).toBe(DEFAULT_FORMAT)
    expect(getPostalCodeFormat('XYZ')).toBe(DEFAULT_FORMAT)
  })

  it('uses an alphanumeric, mask-less default', () => {
    expect(DEFAULT_FORMAT).toEqual({ mode: 'alphanumeric' })
    expect(DEFAULT_FORMAT.mask).toBeUndefined()
  })
})

describe('postalCodeFormat — sanitizeByMode', () => {
  it('numeric mode strips every non-digit', () => {
    expect(sanitizeByMode('abc01310def100', 'numeric')).toBe('01310100')
    expect(sanitizeByMode('K1A 0B1', 'numeric')).toBe('101')
    expect(sanitizeByMode('', 'numeric')).toBe('')
  })

  it('alphanumeric mode keeps letters + digits and uppercases letters', () => {
    expect(sanitizeByMode('k1a 0b1', 'alphanumeric')).toBe('K1A0B1')
    expect(sanitizeByMode('c1425dkg', 'alphanumeric')).toBe('C1425DKG')
    expect(sanitizeByMode('A-B*C 1!2@3', 'alphanumeric')).toBe('ABC123')
    expect(sanitizeByMode('', 'alphanumeric')).toBe('')
  })
})

describe('postalCodeFormat — applyMask', () => {
  it('returns the raw value unchanged when mask is empty', () => {
    expect(applyMask('01310100', '')).toBe('01310100')
  })

  it('formats BR `00000-000` (treats 0 as digit placeholder)', () => {
    expect(applyMask('0', '00000-000')).toBe('0')
    expect(applyMask('01310', '00000-000')).toBe('01310')
    expect(applyMask('013101', '00000-000')).toBe('01310-1')
    expect(applyMask('01310100', '00000-000')).toBe('01310-100')
  })

  it('formats CA `A9A 9A9` with auto-inserted space and uppercases letters', () => {
    expect(applyMask('K', 'A9A 9A9')).toBe('K')
    expect(applyMask('K1A', 'A9A 9A9')).toBe('K1A')
    expect(applyMask('k1a0b1', 'A9A 9A9')).toBe('K1A 0B1')
    expect(applyMask('K1A0B1', 'A9A 9A9')).toBe('K1A 0B1')
  })

  it('formats AR `A9999AAA` with uppercasing', () => {
    expect(applyMask('c1425dkg', 'A9999AAA')).toBe('C1425DKG')
  })

  it('rejects characters that do not fit the current mask token', () => {
    // CA: position 1 is a digit; a letter there is skipped past.
    expect(applyMask('KKK', 'A9A 9A9')).toBe('K')
    // BR: any letter is rejected at every digit position.
    expect(applyMask('abc', '00000-000')).toBe('')
  })

  it('does not emit trailing literal separators', () => {
    expect(applyMask('01310', '00000-000')).toBe('01310')
    expect(applyMask('K1A', 'A9A 9A9')).toBe('K1A')
  })

  it('treats `9` and `0` as digit placeholders interchangeably', () => {
    expect(applyMask('12345', '99999')).toBe('12345')
    expect(applyMask('12345', '00000')).toBe('12345')
  })
})

describe('postalCodeFormat — unmask', () => {
  it('returns input unchanged when no mask is provided', () => {
    expect(unmask('K1A0B1')).toBe('K1A0B1')
    expect(unmask('  K1A 0B1  ')).toBe('K1A 0B1')
  })

  it('strips mask literals from a masked value', () => {
    expect(unmask('01310-100', '00000-000')).toBe('01310100')
    expect(unmask('K1A 0B1', 'A9A 9A9')).toBe('K1A0B1')
    expect(unmask('C1425DKG', 'A9999AAA')).toBe('C1425DKG')
  })

  it('returns empty string for empty input', () => {
    expect(unmask('')).toBe('')
    expect(unmask('', '00000-000')).toBe('')
  })
})
