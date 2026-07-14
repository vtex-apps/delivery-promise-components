import React, { useState } from 'react'
import { render, fireEvent } from '@vtex/test-tools/react'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — test-only helper exported by the manual render-runtime mock
import { setMockCountry } from 'vtex.render-runtime'

import PostalCodeInput from '../components/PostalCodeInput'

interface HarnessProps {
  country?: string
  submitOnEnter?: boolean
  initial?: string
  onSubmit?: (zipcode: string) => void
  onChange?: (zipcode: string) => void
}

const Harness = ({
  country,
  submitOnEnter,
  initial = '',
  onSubmit = jest.fn(),
  onChange,
}: HarnessProps) => {
  const [zipcode, setZipcode] = useState(initial)

  return (
    <PostalCodeInput
      country={country}
      zipcode={zipcode}
      onSubmit={onSubmit}
      submitOnEnter={submitOnEnter}
      onChange={(next) => {
        setZipcode(next)
        onChange?.(next)
      }}
    />
  )
}

const getInput = (container: HTMLElement): HTMLInputElement => {
  const input = container.querySelector('input')

  if (!input) throw new Error('PostalCodeInput did not render an <input>')

  return input as HTMLInputElement
}

beforeEach(() => {
  setMockCountry(undefined)
})

describe('PostalCodeInput — Brazil (US-3, current behavior preserved)', () => {
  it('strips letters and formats the displayed value to 00000-000', () => {
    const onChange = jest.fn()
    const { container } = render(<Harness country="BR" onChange={onChange} />)

    const input = getInput(container)

    fireEvent.change(input, { target: { value: 'abc01310def100' } })

    expect(input.value).toBe('01310-100')
    expect(onChange).toHaveBeenLastCalledWith('01310100')
  })

  it('submits digits-only (no separator) on Enter', () => {
    const onSubmit = jest.fn()
    const { container } = render(
      <Harness country="BR" onSubmit={onSubmit} initial="01310100" />
    )

    const input = getInput(container)

    expect(input.value).toBe('01310-100')

    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onSubmit).toHaveBeenCalledWith('01310100')
  })

  it('rejects letters typed at Enter time too (digits-only contract)', () => {
    const onSubmit = jest.fn()
    const { container } = render(<Harness country="BRA" onSubmit={onSubmit} />)
    const input = getInput(container)

    fireEvent.change(input, { target: { value: 'abc01310def100' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onSubmit).toHaveBeenCalledWith('01310100')
  })
})

describe('PostalCodeInput — Canada (US-1, alphanumeric masked)', () => {
  it('uppercases and formats lowercase input to K1A 0B1', () => {
    const onChange = jest.fn()
    const { container } = render(<Harness country="CA" onChange={onChange} />)

    const input = getInput(container)

    fireEvent.change(input, { target: { value: 'k1a0b1' } })

    expect(input.value).toBe('K1A 0B1')
    expect(onChange).toHaveBeenLastCalledWith('K1A0B1')
  })

  it('rejects characters that do not fit the current mask token', () => {
    const onChange = jest.fn()
    const { container } = render(<Harness country="CAN" onChange={onChange} />)

    const input = getInput(container)

    fireEvent.change(input, { target: { value: 'KKK' } })

    expect(input.value).toBe('K')
    expect(onChange).toHaveBeenLastCalledWith('K')
  })

  it('submitted value on Enter retains alphanumeric characters (compact)', () => {
    const onSubmit = jest.fn()
    const { container } = render(
      <Harness country="CA" onSubmit={onSubmit} initial="K1A0B1" />
    )

    const input = getInput(container)

    expect(input.value).toBe('K1A 0B1')

    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onSubmit).toHaveBeenCalledWith('K1A0B1')
  })
})

describe('PostalCodeInput — France (numeric, 5 digits)', () => {
  it('keeps digits, strips letters, and submits a 5-digit code', () => {
    const onChange = jest.fn()
    const onSubmit = jest.fn()
    const { container } = render(
      <Harness country="FR" onChange={onChange} onSubmit={onSubmit} />
    )

    const input = getInput(container)

    fireEvent.change(input, { target: { value: 'paris75001' } })

    expect(input.value).toBe('75001')
    expect(onChange).toHaveBeenLastCalledWith('75001')

    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onSubmit).toHaveBeenCalledWith('75001')
  })

  it('accepts the alpha-3 `FRA` country resolution', () => {
    const onChange = jest.fn()
    const { container } = render(<Harness country="FRA" onChange={onChange} />)

    const input = getInput(container)

    fireEvent.change(input, { target: { value: '13001' } })

    expect(input.value).toBe('13001')
    expect(onChange).toHaveBeenLastCalledWith('13001')
  })
})

describe('PostalCodeInput — Argentina (US-2, alphanumeric masked)', () => {
  it('uppercases and formats c1425dkg to C1425DKG', () => {
    const onChange = jest.fn()
    const onSubmit = jest.fn()
    const { container } = render(
      <Harness country="AR" onChange={onChange} onSubmit={onSubmit} />
    )

    const input = getInput(container)

    fireEvent.change(input, { target: { value: 'c1425dkg' } })

    expect(input.value).toBe('C1425DKG')
    expect(onChange).toHaveBeenLastCalledWith('C1425DKG')

    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onSubmit).toHaveBeenCalledWith('C1425DKG')
  })
})

describe('PostalCodeInput — permissive default (US-5)', () => {
  it('country with no registry entry: alphanumeric, no mask, not blocked', () => {
    const onChange = jest.fn()
    const onSubmit = jest.fn()
    const { container } = render(
      <Harness country="NL" onChange={onChange} onSubmit={onSubmit} />
    )

    const input = getInput(container)

    fireEvent.change(input, { target: { value: '1234 AB' } })

    expect(input.value).toBe('1234AB')
    expect(onChange).toHaveBeenLastCalledWith('1234AB')

    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onSubmit).toHaveBeenCalledWith('1234AB')
  })

  it('unresolved country: same permissive default', () => {
    setMockCountry(undefined)
    const onChange = jest.fn()
    const { container } = render(<Harness onChange={onChange} />)
    const input = getInput(container)

    fireEvent.change(input, { target: { value: 'x9z-1' } })

    expect(input.value).toBe('X9Z1')
    expect(onChange).toHaveBeenLastCalledWith('X9Z1')
  })
})

describe('PostalCodeInput — country resolution fallback (no `country` prop)', () => {
  it('uses the culture country when the country prop is omitted', () => {
    setMockCountry('CAN')

    const onChange = jest.fn()
    const { container } = render(<Harness onChange={onChange} />)
    const input = getInput(container)

    fireEvent.change(input, { target: { value: 'k1a0b1' } })

    expect(input.value).toBe('K1A 0B1')
    expect(onChange).toHaveBeenLastCalledWith('K1A0B1')
  })

  it('explicit `country` prop overrides the culture country', () => {
    setMockCountry('BR')

    const onChange = jest.fn()
    const { container } = render(<Harness country="CA" onChange={onChange} />)

    const input = getInput(container)

    fireEvent.change(input, { target: { value: 'k1a0b1' } })

    expect(input.value).toBe('K1A 0B1')
    expect(onChange).toHaveBeenLastCalledWith('K1A0B1')
  })
})

describe('PostalCodeInput — SSR / country-resolution safety', () => {
  it('renders with the permissive default when culture country is absent (SSR)', () => {
    // On SSR (or an account without a resolved culture) culture.country may be
    // undefined; getPostalCodeFormat then yields the permissive default.
    setMockCountry(undefined)

    const onChange = jest.fn()
    const { container } = render(<Harness onChange={onChange} />)
    const input = getInput(container)

    fireEvent.change(input, { target: { value: 'k1a0b1' } })

    // Permissive default: alphanumeric, no mask. Letters survive and are uppercased.
    expect(input.value).toBe('K1A0B1')
    expect(onChange).toHaveBeenLastCalledWith('K1A0B1')
  })
})

describe('PostalCodeInput — Enter behavior (submitOnEnter flag)', () => {
  it('does not call onSubmit when submitOnEnter is false', () => {
    const onSubmit = jest.fn()
    const { container } = render(
      <Harness
        country="BR"
        submitOnEnter={false}
        onSubmit={onSubmit}
        initial="01310100"
      />
    )

    const input = getInput(container)

    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('does not call onSubmit for non-Enter keys', () => {
    const onSubmit = jest.fn()
    const { container } = render(
      <Harness country="BR" onSubmit={onSubmit} initial="01310100" />
    )

    const input = getInput(container)

    fireEvent.keyDown(input, { key: 'Tab' })

    expect(onSubmit).not.toHaveBeenCalled()
  })
})
