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
  showClearButton?: boolean
  placeholder?: string
  /** When false, Enter is not handled here (use a wrapping form onSubmit). Default true. */
  submitOnEnter?: boolean
}

const postalCodeInputClearButton = {
  backgroundColor: 'unset',
  width: '32px',
  height: '32px',
}

const PostalCodeInput = ({
  zipcode,
  errorMessage,
  onSubmit,
  onChange,
  showClearButton = false,
  placeholder,
  submitOnEnter = true,
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
          showClearButton ? (
            <button
              style={postalCodeInputClearButton}
              className={`bn pointer flex justify-center items-center pa3 ${handles.postalCodeInputClearButton}`}
              onClick={() => {
                onChange('')
              }}
            >
              <IconClear />
            </button>
          ) : null
        }
      />
    </div>
  )
}

export default PostalCodeInput
