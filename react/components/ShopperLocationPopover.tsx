import React, { useEffect, useRef, useState } from 'react'
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
  onClearZipcode?: () => void
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
  onClearZipcode,
  isLoading,
  inputErrorMessage,
  popoverStore,
  selectedZipcode,
  showLocationDetectorButton,
}: ShopperLocationPopoverProps) => {
  const [zipcode, setZipcode] = useState<string>('')
  const [alreadyOpen, setAlreadyOpen] = useState<boolean>(false)
  const submitInFlightRef = useRef(false)
  const sawLoadingRef = useRef(false)
  const lastSubmittedZipRef = useRef<string | null>(null)
  const handles = useCssHandles(CSS_HANDLES)
  const intl = useIntl()

  const isFirstLoading = !zipcode && isLoading

  const openPopover = !isFirstLoading && !selectedZipcode && !alreadyOpen

  useEffect(() => setZipcode(selectedZipcode ?? ''), [selectedZipcode])

  useEffect(() => {
    if (openPopover) {
      popoverStore.setOpen(true)
      setAlreadyOpen(true)
    }
  }, [openPopover, popoverStore])

  useEffect(() => {
    if (variant !== 'popover-input' || !submitInFlightRef.current) {
      return
    }

    if (isLoading) {
      sawLoadingRef.current = true

      return
    }

    if (inputErrorMessage) {
      popoverStore.setOpen(true)
      submitInFlightRef.current = false
      sawLoadingRef.current = false
      lastSubmittedZipRef.current = null

      return
    }

    if (
      sawLoadingRef.current &&
      !isLoading &&
      !inputErrorMessage &&
      selectedZipcode &&
      lastSubmittedZipRef.current != null &&
      selectedZipcode === lastSubmittedZipRef.current
    ) {
      submitInFlightRef.current = false
      sawLoadingRef.current = false
      lastSubmittedZipRef.current = null
    }
  }, [isLoading, inputErrorMessage, selectedZipcode, variant, popoverStore])

  const handleZipSubmit = (zipCode: string) => {
    if (variant !== 'popover-input') {
      onSubmit(zipCode)

      return
    }

    popoverStore.setOpen(false)
    submitInFlightRef.current = true
    sawLoadingRef.current = false
    lastSubmittedZipRef.current = zipCode
    onSubmit(zipCode)
  }

  const handleClearZipcode = () => {
    if (variant === 'popover-input') {
      popoverStore.setOpen(false)
    }

    onClearZipcode?.()
  }

  const handlePopoverClick = () => {
    onClick()
    popoverStore.setOpen(false)
  }

  return (
    <Popover
      className={handles.shopperLocationPopover}
      hideOnInteractOutside
      autoFocusOnShow={false}
      autoFocusOnHide={false}
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
        <form
          className={`${handles.shopperLocationPopoverInputContainer} flex`}
          onSubmit={(e) => {
            e.preventDefault()
            e.stopPropagation()
            handleZipSubmit(zipcode)
          }}
        >
          <PostalCodeInput
            onChange={(value: string) => setZipcode(value)}
            zipcode={zipcode}
            onSubmit={handleZipSubmit}
            errorMessage={inputErrorMessage}
            submitOnEnter={false}
            onClear={selectedZipcode ? handleClearZipcode : undefined}
            placeholder={intl.formatMessage(
              messages.shopperLocationPopoverPostalCodePlaceholder
            )}
          />
          <Button
            type="button"
            isLoading={isLoading}
            onClick={(e: React.MouseEvent) => {
              e.preventDefault()
              handleZipSubmit(zipcode)
            }}
          >
            {intl.formatMessage(
              messages.shopperLocationPopoverSubmitButtonLabel
            )}
          </Button>
        </form>
      )}

      {showLocationDetectorButton && <ShopperLocationDetectorButton />}

      <PopoverArrow className={handles.shopperLocationPopoverArrow} />
    </Popover>
  )
}

export default ShopperLocationPopover
