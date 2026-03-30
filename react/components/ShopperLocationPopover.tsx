import React, { useEffect, useState } from 'react'
import type { PopoverStore } from '@ariakit/react'
import { Popover, PopoverArrow } from '@ariakit/react'
import { useIntl } from 'react-intl'
import { Button } from 'vtex.styleguide'
import { useCssHandles } from 'vtex.css-handles'

import PostalCodeInput from './PostalCodeInput'
import messages from '../messages'
import PostalCodeHelpLink from './PostalCodeHelpLink'
import ShopperLocationDetectorButton from './ShopperLocationDetectorButton'

const CSS_HANDLES = [
  'shopperLocationPopover',
  'shopperLocationPopoverText',
  'shopperLocationPopoverArrow',
  'shopperLocationPopoverInputContainer',
] as const

interface ShopperLocationPopoverProps {
  onClick: () => void
  variant?: 'popover-button' | 'popover-input'
  onSubmit: (zipcode: string) => void
  isLoading?: boolean
  inputErrorMessage?: string
  popoverStore: PopoverStore
  selectedZipcode?: string
  showLocationDetectorButton?: boolean
}

const ShopperLocationPopover = ({
  onClick,
  variant = 'popover-input',
  onSubmit,
  isLoading,
  inputErrorMessage,
  popoverStore,
  selectedZipcode,
  showLocationDetectorButton,
}: ShopperLocationPopoverProps) => {
  const [zipcode, setZipcode] = useState<string>('')
  const [alreadyOpen, setAlreadyOpen] = useState<boolean>(false)
  const handles = useCssHandles(CSS_HANDLES)
  const intl = useIntl()

  const isFirstLoading = !zipcode && isLoading

  const openPopover = !isFirstLoading && !selectedZipcode && !alreadyOpen

  useEffect(() => {
    if (openPopover) {
      popoverStore.setOpen(true)
      setAlreadyOpen(true)
    }
  }, [openPopover, popoverStore])

  const handlePopoverClick = () => {
    onClick()
    popoverStore.setOpen(false)
  }

  return (
    <Popover
      className={handles.shopperLocationPopover}
      hideOnInteractOutside
      autoFocusOnShow={false}
      store={popoverStore}
    >
      <p className={`${handles.shopperLocationPopoverText} ma0`}>
        {`${intl.formatMessage(messages.shopperLocationPopoverDescription)} `}
        <PostalCodeHelpLink />
      </p>

      {variant === 'popover-button' ? (
        <Button onClick={handlePopoverClick}>
          {intl.formatMessage(messages.shopperLocationPopoverButtonLabel)}
        </Button>
      ) : (
        <div className={`${handles.shopperLocationPopoverInputContainer} flex`}>
          <PostalCodeInput
            onChange={(value: string) => setZipcode(value)}
            zipcode={zipcode}
            onSubmit={onSubmit}
            errorMessage={inputErrorMessage}
            showClearButton={false}
            placeholder={intl.formatMessage(
              messages.shopperLocationPopoverPostalCodePlaceholder
            )}
          />
          <Button isLoading={isLoading} onClick={() => onSubmit(zipcode)}>
            {intl.formatMessage(
              messages.shopperLocationPopoverSubmitButtonLabel
            )}
          </Button>
        </div>
      )}

      {showLocationDetectorButton && <ShopperLocationDetectorButton />}

      <PopoverArrow className={handles.shopperLocationPopoverArrow} />
    </Popover>
  )
}

export default ShopperLocationPopover
