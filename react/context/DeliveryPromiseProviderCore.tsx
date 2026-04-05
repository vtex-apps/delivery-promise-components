import type { ReactNode } from 'react'
import React from 'react'

import UnavailableItemsModal from '../components/UnavailableItemsModal'
import {
  DeliveryPromiseDispatchContext,
  DeliveryPromiseStateContext,
} from './DeliveryPromiseContext'
import { useDeliveryPromise } from './useDeliveryPromise'

interface Props {
  children?: ReactNode
}

export const DeliveryPromiseProviderCore = ({ children }: Props) => {
  const { dispatch, state } = useDeliveryPromise()

  const {
    areThereUnavailableCartItems,
    unavailableCartItems,
    unavailabilityMessage,
  } = state

  const onAbortUnavailableItemsAction = () => {
    dispatch({
      type: 'ABORT_UNAVAILABLE_ITEMS_ACTION',
    })
  }

  const onContinueUnavailableItemsAction = () => {
    dispatch({
      type: 'CONTINUE_UNAVAILABLE_ITEMS_ACTION',
    })
  }

  return (
    <DeliveryPromiseStateContext.Provider value={state}>
      <DeliveryPromiseDispatchContext.Provider value={dispatch}>
        {children}
        <UnavailableItemsModal
          isOpen={areThereUnavailableCartItems}
          onClose={onAbortUnavailableItemsAction}
          onTryAgain={onAbortUnavailableItemsAction}
          onRemoveItems={onContinueUnavailableItemsAction}
          unavailableCartItems={unavailableCartItems}
          unavailabilityMessage={unavailabilityMessage}
        />
      </DeliveryPromiseDispatchContext.Provider>
    </DeliveryPromiseStateContext.Provider>
  )
}
