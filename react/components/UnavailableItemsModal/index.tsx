/* eslint-disable no-restricted-globals */
import React, { useEffect, useState } from 'react'
import { Button } from 'vtex.styleguide'
import { useCssHandles } from 'vtex.css-handles'
import { useIntl } from 'react-intl'

import Modal from '../Modal'
import ProductItem from './ProductItem'
import messages from '../../messages'

const CSS_HANDLES = [
  'unavailableItemsModalContainer',
  'unavailableItemsModalMessage',
  'unavailableItemsModalList',
  'unavailableItemsModalRemoveButtonContainer',
  'unavailableItemsModalRetryButtonContainer',
] as const

export type CartProduct = { id: string; name: string; imageUrl: string }

export type CartItem = {
  cartItemIndex: number
  product: CartProduct
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onTryAgain: () => void
  onRemoveItems: () => void
  unavailableCartItems: CartItem[]
  unavailabilityMessage?: string
}

const UnavailableItemsModal = ({
  isOpen,
  onClose,
  onTryAgain,
  onRemoveItems,
  unavailableCartItems,
  unavailabilityMessage,
}: Props) => {
  const intl = useIntl()
  const handles = useCssHandles(CSS_HANDLES)

  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setIsLoading(false)
    }
  }, [isOpen])

  const handleRemoveItemsClick = async () => {
    setIsLoading(true)

    try {
      await onRemoveItems()
      onClose()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Modal
      showArrowBack={false}
      isTopCloseButton={false}
      title={intl.formatMessage(messages.unavailableItemsModalTitle)}
      isOpen={isOpen}
      onClose={onClose}
      nonDismissible
      overlayZIndex={100000}
    >
      <div
        className={`flex-auto flex flex-column justify-between mt0 ${handles.unavailableItemsModalContainer}`}
      >
        <p className={`mid-gray ma0 ${handles.unavailableItemsModalMessage}`}>
          {unavailabilityMessage}
        </p>
        <div
          className={`mv7 overflow-auto ${handles.unavailableItemsModalList}`}
        >
          {unavailableCartItems.map(({ product }) => (
            <ProductItem
              key={product.id}
              imageUrl={product.imageUrl}
              productName={product.name}
            />
          ))}
        </div>
        <div style={{ gap: '.75rem' }} className="flex flex-column">
          <div
            className={`mb3 ${handles.unavailableItemsModalRemoveButtonContainer}`}
          >
            <Button
              block
              isLoading={isLoading}
              onClick={handleRemoveItemsClick}
            >
              {intl.formatMessage(
                messages.unavailableItemsModalRemoveButtonLabel
              )}
            </Button>
          </div>
          <div className={handles.unavailableItemsModalRetryButtonContainer}>
            <Button
              block
              isLoading={isLoading}
              variation="secondary"
              onClick={onTryAgain}
            >
              {intl.formatMessage(
                messages.unavailableItemsModalRetryButtonLabel
              )}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

export default UnavailableItemsModal
