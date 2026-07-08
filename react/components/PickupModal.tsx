import React from 'react'
import { useIntl } from 'react-intl'

import Modal from './Modal'
import messages from '../messages'
import PickupSelection from './PickupSelection'

interface Props {
  isOpen: boolean
  onClose: () => void
  pickupProps: React.ComponentProps<typeof PickupSelection>
}

const PickupModal = ({ isOpen, onClose, pickupProps }: Props) => {
  const intl = useIntl()

  const {
    onSelectPickup,
    onClearPickup,
    onSubmit,
    pickups,
    inputErrorMessage,
    selectedPickup,
    selectedZipcode,
    isLoading,
    canUnselect,
  } = pickupProps

  return (
    <Modal
      showArrowBack={false}
      isTopCloseButton={false}
      title={intl.formatMessage(messages.shopperLocationButtonPlaceholder)}
      isOpen={isOpen}
      onClose={onClose}
    >
      <PickupSelection
        onSelectPickup={onSelectPickup}
        onClearPickup={onClearPickup}
        onSubmit={onSubmit}
        pickups={pickups}
        inputErrorMessage={inputErrorMessage}
        selectedPickup={selectedPickup}
        selectedZipcode={selectedZipcode}
        isLoading={isLoading}
        canUnselect={canUnselect}
      />
    </Modal>
  )
}

export default PickupModal
