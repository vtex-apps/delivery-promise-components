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
        onKeyDown={(e: { key: string }) => {
          if (e.key === 'Enter') {
            onSubmit(zipcode ?? '')
          }
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
              <IconClear color="#727273"/>
            </button>
          ) : null
        }
      />
    </div>
  )
}

export default PostalCodeInput
