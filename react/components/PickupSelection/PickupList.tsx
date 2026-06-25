import React, { useEffect, useState } from 'react'
import { useIntl } from 'react-intl'
import { Button } from 'vtex.styleguide'
import { useCssHandles } from 'vtex.css-handles'

import messages from '../../messages'
import PickupItem from './PickupItem'

const CSS_HANDLES = ['updateButtonContainer', 'clearButtonContainer'] as const

interface Props {
  pickups: Pickup[]
  selectedPickup?: Pickup
  onSelectPickup: (pickup: Pickup, shouldPersistFacet?: boolean) => void
  canUnselect?: boolean
}

const PickupList = ({
  pickups,
  selectedPickup,
  onSelectPickup,
  canUnselect = false,
}: Props) => {
  const handle = useCssHandles(CSS_HANDLES)
  const intl = useIntl()
  const [highlightedPickup, setHighlightedPickup] = useState<Pickup>()

  useEffect(() => {
    if (selectedPickup) {
      setHighlightedPickup(selectedPickup)
    }
  }, [selectedPickup])

  const showUpdateButton =
    !!selectedPickup &&
    !!highlightedPickup &&
    highlightedPickup.pickupPoint.id !== selectedPickup.pickupPoint.id

  const showClearButton = canUnselect && !!selectedPickup

  const handleClickItem = (pickup: Pickup) => {
    setHighlightedPickup(pickup)

    // Clicking the already-selected pickup is a no-op: the shopper only
    // unselects through the explicit Clear button. The first selection (when
    // nothing is selected yet) still applies immediately.
    if (!selectedPickup) {
      onSelectPickup(pickup)
    }
  }

  const handleClear = () => {
    if (selectedPickup) {
      onSelectPickup(selectedPickup)
    }
  }

  return (
    <>
      <div className="m-100 flex flex-column justify-center">
        {pickups.map((currentPickup) => (
          <PickupItem
            key={currentPickup.pickupPoint.id}
            selected={
              !!highlightedPickup &&
              highlightedPickup.pickupPoint.id === currentPickup.pickupPoint.id
            }
            onClick={() => handleClickItem(currentPickup)}
            pickup={currentPickup}
          />
        ))}
      </div>
      {(showUpdateButton || showClearButton) && (
        <div
          style={{ bottom: '-30px' }}
          className="sticky left-0 bottom-0 w-100 flex items-center"
        >
          {showClearButton && (
            <div
              className={`${showUpdateButton ? 'w-50 pr3' : 'w-100'} ${
                handle.clearButtonContainer
              }`}
            >
              <Button block variation="danger-tertiary" onClick={handleClear}>
                {intl.formatMessage(messages.pickupPointListClearButtonLabel)}
              </Button>
            </div>
          )}
          {showUpdateButton && (
            <div
              className={`${showClearButton ? 'w-50 pl3' : 'w-100'} ${
                handle.updateButtonContainer
              }`}
            >
              <Button
                block
                onClick={() => {
                  onSelectPickup(highlightedPickup as Pickup)
                }}
              >
                {intl.formatMessage(messages.pickupPointListUpdateButtonLabel)}
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  )
}

export default PickupList
