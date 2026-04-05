import React, { useEffect, useRef } from 'react'
import { useCssHandles } from 'vtex.css-handles'
import { Spinner } from 'vtex.styleguide'
import { usePopoverStore } from '@ariakit/react'

import ShopperLocationPopover from './ShopperLocationPopover'

const CSS_HANDLES = [
  'shopperLocationSetterButtonWrapper',
  'shopperLocationSetterButtonLabel',
  'shopperLocationSetterButtonValue',
  'shopperLocationSetterContainer',
] as const

interface ShopperLocationSetterProps {
  onClick: () => void
  loading: boolean
  placeholder: string
  value?: React.ReactNode
  selectedZipcode?: string
  onSubmit?: (zipCode: string) => void
  inputErrorMessage?: string
  callToAction?: CallToAction
  mode: Mode
  icon: React.ReactNode
  showLocationDetectorButton?: boolean
}

const ShopperLocationSetter = ({
  onClick,
  loading,
  value,
  placeholder,
  selectedZipcode,
  onSubmit,
  inputErrorMessage,
  callToAction,
  mode,
  icon,
  showLocationDetectorButton,
}: ShopperLocationSetterProps) => {
  const handles = useCssHandles(CSS_HANDLES)
  const popoverStore = usePopoverStore({ defaultOpen: false })
  const anchorRef = useRef(null)

  const popoverOverlay =
    callToAction === 'popover-button' || callToAction === 'popover-input'
      ? callToAction
      : undefined

  const handleAnchorClick = () => {
    if (popoverOverlay) {
      popoverStore.toggle()

      return
    }

    onClick()
  }

  useEffect(() => {
    if (anchorRef.current) {
      popoverStore.setAnchorElement(anchorRef.current)
    }
  }, [popoverStore])

  return (
    <div
      className={`${handles.shopperLocationSetterContainer} flex items-center h-100`}
    >
      <button
        ref={anchorRef}
        onClick={handleAnchorClick}
        className={`${handles.shopperLocationSetterButtonWrapper} flex items-center br3 pt4 pr4 pb4 pl0 b--none`}
      >
        {loading ? (
          <div className="ml4">
            <Spinner size={14} />
          </div>
        ) : mode === 'default' ? (
          <p
            className={`${handles.shopperLocationSetterButtonValue} ma0 f6 fw6 c-action-primary`}
          >
            {value ?? placeholder}
          </p>
        ) : (
          icon
        )}
      </button>
      {popoverOverlay && (
        <ShopperLocationPopover
          onClick={onClick}
          onSubmit={onSubmit ?? (() => {})}
          isLoading={loading}
          inputErrorMessage={inputErrorMessage}
          selectedZipcode={selectedZipcode}
          variant={popoverOverlay}
          popoverStore={popoverStore}
          showLocationDetectorButton={showLocationDetectorButton}
        />
      )}
    </div>
  )
}

export default ShopperLocationSetter
