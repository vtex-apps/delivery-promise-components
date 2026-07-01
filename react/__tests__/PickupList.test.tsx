import React from 'react'
import { render, fireEvent } from '@vtex/test-tools/react'

import PickupList from '../components/PickupSelection/PickupList'

const makePickup = (id: string): Pickup => ({
  distance: 1.2,
  pickupPoint: {
    id,
    friendlyName: `Store ${id}`,
    isActive: true,
    address: {
      neighborhood: 'Hood',
      street: 'Main St',
      postalCode: '12345',
      city: 'City',
      number: '100',
      state: 'ST',
    },
  },
})

const pickupA = makePickup('A')
const pickupB = makePickup('B')

const getRow = (getByText: (text: string) => HTMLElement, id: string) =>
  getByText(`Store ${id}`).closest('button') as HTMLButtonElement

describe('PickupList', () => {
  it('does nothing when clicking the already-selected pickup', () => {
    const onSelectPickup = jest.fn()

    const { getByText, queryByText } = render(
      <PickupList
        pickups={[pickupA, pickupB]}
        selectedPickup={pickupA}
        onSelectPickup={onSelectPickup}
        canUnselect
      />
    )

    fireEvent.click(getRow(getByText, 'A'))

    expect(onSelectPickup).not.toHaveBeenCalled()
    expect(queryByText('Update')).toBeNull()
  })

  it('auto-selects on click when nothing is selected yet', () => {
    const onSelectPickup = jest.fn()

    const { getByText } = render(
      <PickupList
        pickups={[pickupA, pickupB]}
        selectedPickup={undefined}
        onSelectPickup={onSelectPickup}
        canUnselect
      />
    )

    fireEvent.click(getRow(getByText, 'A'))

    expect(onSelectPickup).toHaveBeenCalledTimes(1)
    expect(onSelectPickup).toHaveBeenCalledWith(pickupA)
  })

  it('shows the Clear button when a pickup is selected and unselecting is allowed', () => {
    const { getByText } = render(
      <PickupList
        pickups={[pickupA, pickupB]}
        selectedPickup={pickupA}
        onSelectPickup={jest.fn()}
        canUnselect
      />
    )

    expect(getByText('Clear')).toBeTruthy()
  })

  it('hides the Clear button when unselecting is not allowed', () => {
    const { queryByText } = render(
      <PickupList
        pickups={[pickupA, pickupB]}
        selectedPickup={pickupA}
        onSelectPickup={jest.fn()}
        canUnselect={false}
      />
    )

    expect(queryByText('Clear')).toBeNull()
  })

  it('hides the Clear button when no pickup is selected', () => {
    const { queryByText } = render(
      <PickupList
        pickups={[pickupA, pickupB]}
        selectedPickup={undefined}
        onSelectPickup={jest.fn()}
        canUnselect
      />
    )

    expect(queryByText('Clear')).toBeNull()
  })

  it('falls back to re-selecting the current pickup when Clear is clicked without onClearPickup', () => {
    const onSelectPickup = jest.fn()

    const { getByText } = render(
      <PickupList
        pickups={[pickupA, pickupB]}
        selectedPickup={pickupA}
        onSelectPickup={onSelectPickup}
        canUnselect
      />
    )

    fireEvent.click(getByText('Clear'))

    expect(onSelectPickup).toHaveBeenCalledTimes(1)
    expect(onSelectPickup).toHaveBeenCalledWith(pickupA)
  })

  it('prefers onClearPickup over onSelectPickup when Clear is clicked', () => {
    const onSelectPickup = jest.fn()
    const onClearPickup = jest.fn()

    const { getByText } = render(
      <PickupList
        pickups={[pickupA, pickupB]}
        selectedPickup={pickupA}
        onSelectPickup={onSelectPickup}
        onClearPickup={onClearPickup}
        canUnselect
      />
    )

    fireEvent.click(getByText('Clear'))

    expect(onClearPickup).toHaveBeenCalledTimes(1)
    expect(onSelectPickup).not.toHaveBeenCalled()
  })

  it('shows Update and Clear together when a different pickup is highlighted', () => {
    const onSelectPickup = jest.fn()

    const { getByText } = render(
      <PickupList
        pickups={[pickupA, pickupB]}
        selectedPickup={pickupA}
        onSelectPickup={onSelectPickup}
        canUnselect
      />
    )

    fireEvent.click(getRow(getByText, 'B'))

    // Highlighting a different pickup must not select it immediately.
    expect(onSelectPickup).not.toHaveBeenCalled()

    expect(getByText('Update')).toBeTruthy()
    expect(getByText('Clear')).toBeTruthy()

    fireEvent.click(getByText('Update'))

    expect(onSelectPickup).toHaveBeenCalledTimes(1)
    expect(onSelectPickup).toHaveBeenCalledWith(pickupB)
  })
})
