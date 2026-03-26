import type { ReactNode } from 'react'
import React from 'react'

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

  return (
    <DeliveryPromiseStateContext.Provider value={state}>
      <DeliveryPromiseDispatchContext.Provider value={dispatch}>
        {children}
      </DeliveryPromiseDispatchContext.Provider>
    </DeliveryPromiseStateContext.Provider>
  )
}
