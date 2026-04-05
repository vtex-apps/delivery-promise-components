import React from 'react'
import { render } from '@vtex/test-tools/react'

import * as useDeliveryPromise from '../context/useDeliveryPromise'
import * as DeliveryPromiseProviderCore from '../context/DeliveryPromiseProviderCore'
import { DeliveryPromiseProvider } from '../context/DeliveryPromiseContext'

jest.mock('../components/UnavailableItemsModal', () => ({
  __esModule: true,
  default: () => null,
}))

describe('DeliveryPromiseContext should render its children even when', () => {
  it('useDeliveryPromise throws an error', () => {
    jest
      .spyOn(useDeliveryPromise, 'useDeliveryPromise')
      .mockImplementation(() => {
        throw new Error('Test error in useDeliveryPromise')
      })

    const { getByText } = render(
      <DeliveryPromiseProvider>
        <div>child</div>
      </DeliveryPromiseProvider>
    )

    expect(getByText('child')).toBeTruthy()
  })

  it('DeliveryPromiseProviderCore throws an error', () => {
    jest
      .spyOn(DeliveryPromiseProviderCore, 'DeliveryPromiseProviderCore')
      .mockImplementation(() => {
        throw new Error('Test error in DeliveryPromiseProviderCore')
      })

    const { getByText } = render(
      <DeliveryPromiseProvider>
        <div>child</div>
      </DeliveryPromiseProvider>
    )

    expect(getByText('child')).toBeTruthy()
  })
})
