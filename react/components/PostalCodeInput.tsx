import React, { useMemo } from 'react'
import { Input, IconClear } from 'vtex.styleguide'
import { useCssHandles } from 'vtex.css-handles'

import '../styles.css'
import { getCountryCode } from '../utils/cookie'
import type { PostalCodeFormat } from '../utils/postalCodeFormat'
import {
  DEFAULT_FORMAT,
  applyMask,
  getPostalCodeFormat,
  sanitizeByMode,
  unmask,
} from '../utils/postalCodeFormat'

const CSS_HANDLES = [
  'postalCodeInputClearButton',
  'postalCodeInputContainer',
] as const

interface Props {
  onSubmit: (zipcode: string) => void
  onChange: (zipcode: string) => void
  zipcode: string
  errorMessage?: string
  placeholder?: string
  /** When false, Enter is not handled here (use a wrapping form onSubmit). Default true. */
  submitOnEnter?: boolean
  onClear?: () => void
  /**
   * Country override. When omitted, the active country is resolved from the
   * VTEX segment token via `getCountryCode()`. Tolerant of alpha-2 (`BR`,
   * `CA`) and alpha-3 (`BRA`, `CAN`) — see `normalizeCountry`.
   */
  country?: string
  /**
   * Per-country format override. When omitted, resolved from `country`
   * (or the segment token) against the per-country registry, falling back
   * to the permissive default (alphanumeric, no mask) for any country
   * outside the masked top-10.
   */
  format?: PostalCodeFormat
}

const postalCodeInputClearButton = {
  backgroundColor: 'unset',
}

const PostalCodeInput = ({
  zipcode,
  errorMessage,
  onSubmit,
  onChange,
  placeholder,
  submitOnEnter = true,
  onClear,
  country,
  format,
}: Props) => {
  const handles = useCssHandles(CSS_HANDLES)

  const resolvedFormat = useMemo<PostalCodeFormat>(() => {
    if (format) return format
    if (country) return getPostalCodeFormat(country)

    // Country resolution reads `window.__RUNTIME__.segmentToken` and base64
    // decodes it; on the render-server SSR pass the decoder may be missing
    // or the segment malformed. A throw here would crash the entire SSR.
    // Fall back to the permissive default — the client re-renders with the
    // real format after hydration (display value of an empty zipcode is
    // identical across formats, so no hydration mismatch).
    try {
      return getPostalCodeFormat(getCountryCode())
    } catch {
      return DEFAULT_FORMAT
    }
  }, [format, country])

  const { mode, mask } = resolvedFormat

  const displayValue = mask ? applyMask(zipcode ?? '', mask) : zipcode ?? ''

  const normalize = (raw: string): string => {
    const sanitized = sanitizeByMode(raw, mode)

    if (!mask) return sanitized

    // Apply the mask, then strip literals so the value flowing out of the
    // component (and into downstream consumers — session, cookie, Checkout,
    // IS, BFF) stays in the compact form they expect today.
    return unmask(applyMask(sanitized, mask), mask)
  }

  const effectivePlaceholder = placeholder ?? resolvedFormat.placeholder ?? mask

  return (
    <div className={`w-100 ${handles.postalCodeInputContainer}`}>
      <Input
        autFocus
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          onChange(normalize(e.target.value))
        }
        onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
          if (!submitOnEnter || e.key !== 'Enter') {
            return
          }

          e.preventDefault()
          e.stopPropagation()

          const raw =
            typeof e.currentTarget?.value === 'string'
              ? e.currentTarget.value
              : zipcode ?? ''

          onSubmit(normalize(raw))
        }}
        value={displayValue}
        errorMessage={errorMessage}
        placeholder={effectivePlaceholder}
        suffix={
          onClear ? (
            <button
              type="button"
              style={postalCodeInputClearButton}
              className={`bn pointer flex justify-center items-center pr0 ${handles.postalCodeInputClearButton}`}
              onClick={() => {
                onChange('')
                onClear?.()
              }}
            >
              <IconClear color="#727273" />
            </button>
          ) : null
        }
      />
    </div>
  )
}

export default PostalCodeInput
