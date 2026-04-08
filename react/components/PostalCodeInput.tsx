import React from 'react'
import { Input, IconClear } from 'vtex.styleguide'
import { useCssHandles } from 'vtex.css-handles'

import '../styles.css'

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
}: Props) => {
  const handles = useCssHandles(CSS_HANDLES)

  return (
    <div className={`w-100 ${handles.postalCodeInputContainer}`}>
      <Input
        autFocus
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          onChange(e.target.value.replace(/[^0-9]/g, ''))
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

          onSubmit(raw.replace(/[^0-9]/g, ''))
        }}
        value={zipcode}
        errorMessage={errorMessage}
        placeholder={placeholder}
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
