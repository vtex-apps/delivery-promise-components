import React, { useMemo } from 'react'
import { Input, IconClear } from 'vtex.styleguide'
import { useCssHandles } from 'vtex.css-handles'
import { useRuntime } from 'vtex.render-runtime'

import '../styles.css'
import { getCountryCodeFromToken } from '../utils/cookie'
import type { PostalCodeFormat } from '../utils/postalCodeFormat'
import {
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
   * VTEX segment token exposed by `useRuntime().segmentToken`. Tolerant of
   * alpha-2 (`BR`, `CA`) and alpha-3 (`BRA`, `CAN`) — see `normalizeCountry`.
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
  const { segmentToken } = useRuntime()

  const resolvedFormat = useMemo<PostalCodeFormat>(() => {
    if (format) return format
    if (country) return getPostalCodeFormat(country)

    // Country is resolved from the VTEX segment token sourced via
    // render-runtime, so the value stays inside React's render cycle and the
    // memo recomputes whenever the runtime provides a new token — no reading
    // of the `window.__RUNTIME__` global. `getCountryCodeFromToken` tolerates
    // an absent/malformed token (incl. the SSR/vm2 case where no base64
    // decoder exists) by returning `undefined`, and `getPostalCodeFormat`
    // then falls back to the permissive default. The display value of an empty
    // zipcode is identical across formats, so there's no hydration mismatch.
    return getPostalCodeFormat(getCountryCodeFromToken(segmentToken))
  }, [format, country, segmentToken])

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
