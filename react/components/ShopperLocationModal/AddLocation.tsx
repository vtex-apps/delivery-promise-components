import React from 'react'
import { Button } from 'vtex.styleguide'
import { useCssHandles } from 'vtex.css-handles'
import { useIntl } from 'react-intl'

import PostalCodeInput from '../PostalCodeInput'
import messages from '../../messages'
import PostalCodeHelpLink from '../PostalCodeHelpLink'
import ShopperLocationDetectorButton from '../ShopperLocationDetectorButton'

const CSS_HANDLES = [
  'shopperLocationModalContainer',
  'shopperLocationModalDescription',
  'shopperLocationModalSubmitButtonContainer',
] as const

interface AddLocationProps {
  onSubmit: (zipcode: string) => void
  onChange: (zipCode: string) => void
  zipcode: string
  isLoading?: boolean
  inputErrorMessage?: string
  showLocationDetectorButton?: boolean
}

const AddLocation = ({
  onSubmit,
  onChange,
  zipcode,
  isLoading,
  inputErrorMessage,
  showLocationDetectorButton,
}: AddLocationProps) => {
  const intl = useIntl()
  const handles = useCssHandles(CSS_HANDLES)

  return (
    <div
      className={`flex-auto flex flex-column justify-between mt0 ${handles.shopperLocationModalContainer}`}
    >
      <p className={`mid-gray ma0 ${handles.shopperLocationModalDescription}`}>
        {intl.formatMessage(messages.shopperLocationModalDescription)}
      </p>

      <div>
        <PostalCodeInput
          onChange={(value: string) => onChange(value)}
          zipcode={zipcode}
          onSubmit={onSubmit}
          errorMessage={inputErrorMessage}
          placeholder={intl.formatMessage(
            messages.shopperLocationPopoverPostalCodePlaceholder
          )}
        />
        <div className="mt3">
          <PostalCodeHelpLink />
        </div>
      </div>

      <div className={handles.shopperLocationModalSubmitButtonContainer}>
        <Button block isLoading={isLoading} onClick={() => onSubmit(zipcode)}>
          {intl.formatMessage(messages.shopperLocationPopoverSubmitButtonLabel)}
        </Button>
      </div>
      {showLocationDetectorButton && <ShopperLocationDetectorButton />}
    </div>
  )
}

export default AddLocation
