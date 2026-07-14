import React, { useMemo } from 'react'
import { Input, IconClear } from 'vtex.styleguide'
import { useCssHandles } from 'vtex.css-handles'
import { useRuntime } from 'vtex.render-runtime'

import '../styles.css'
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
   * Country override. When omitted, the active country falls back to the
   * storefront culture/binding country from `useRuntime().culture.country`.
   * Tolerant of alpha-2 (`BR`, `CA`) and alpha-3 (`BRA`, `CAN`) — see
   * `normalizeCountry`.
   */
  country?: string
  /**
   * Per-country format override. When omitted, resolved from `country`
   * (or the culture country) against the per-country registry, falling back
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
  const { culture } = useRuntime()

  const resolvedFormat = useMemo<PostalCodeFormat>(() => {
    if (format) return format
    if (country) return getPostalCodeFormat(country)

    // Country falls back to the storefront culture/binding country exposed by
    // render-runtime (`useRuntime().culture.country`). Unlike the segment
    // token, this field is actually surfaced by the hook, so it stays inside
    // React's render cycle (reactive, SSR-safe) without touching the
    // `window.__RUNTIME__` global. `getPostalCodeFormat` falls back to the
    // permissive default for an absent/uncurated country, so markets outside
    // the masked top-10 are never blocked.
    return getPostalCodeFormat(culture?.country)
  }, [format, country, culture?.country])

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
