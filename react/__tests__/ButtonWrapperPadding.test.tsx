import React from 'react'
import { render } from '@vtex/test-tools/react'

import ShopperLocationSetter from '../components/ShopperLocationSetter'
import PickupPointSelector from '../components/PickupPointSelector'
import ShippingMethodSelectorInner from '../components/ShippingMethodModal/ShippingMethodSelector'

jest.mock('vtex.css-handles', () => ({
  useCssHandles: (handles: readonly string[]) =>
    Object.fromEntries(handles.map((h) => [h, h])),
}))

jest.mock('@ariakit/react', () => ({
  usePopoverStore: () => ({
    toggle: jest.fn(),
    setAnchorElement: jest.fn(),
    defaultOpen: false,
  }),
  Popover: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PopoverAnchor: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}))

jest.mock('../components/ShopperLocationPopover', () => ({
  __esModule: true,
  default: () => <div data-testid="popover" />,
}))

jest.mock('../components/ShippingMethodModal/ShippingIcon', () => ({
  __esModule: true,
  default: () => <svg data-testid="shipping-icon" />,
}))

jest.mock('../components/ShippingMethodModal/PickupPointIcon', () => ({
  __esModule: true,
  default: () => <svg data-testid="pickup-icon" />,
}))

jest.mock('../components/ShippingMethodModal/DeliveryIcon', () => ({
  __esModule: true,
  default: () => <svg data-testid="delivery-icon" />,
}))

describe('Button wrapper padding — uniform on all sides', () => {
  describe('ShopperLocationSetter', () => {
    it('button wrapper does not have pl0', () => {
      const { container } = render(
        <ShopperLocationSetter
          onClick={jest.fn()}
          loading={false}
          placeholder="Enter zip"
          mode="default"
          icon={<span />}
        />
      )

      const wrapper = container.querySelector(
        '.shopperLocationSetterButtonWrapper'
      ) as HTMLElement

      expect(wrapper).toBeInTheDocument()
      expect(wrapper.className).not.toContain('pl0')
    })

    it('button wrapper has pa4 (uniform padding on all sides)', () => {
      const { container } = render(
        <ShopperLocationSetter
          onClick={jest.fn()}
          loading={false}
          placeholder="Enter zip"
          mode="default"
          icon={<span />}
        />
      )

      const wrapper = container.querySelector(
        '.shopperLocationSetterButtonWrapper'
      ) as HTMLElement

      expect(wrapper).toBeInTheDocument()
      expect(wrapper.className).toContain('pa4')
    })
  })

  describe('PickupPointSelector', () => {
    it('button wrapper does not have pl0', () => {
      const { container } = render(
        <PickupPointSelector
          onClick={jest.fn()}
          loading={false}
          placeholder="Select pickup"
          mode="default"
          icon={<span />}
        />
      )

      const wrapper = container.querySelector(
        '.pickupPointSelectorButtonWrapper'
      ) as HTMLElement

      expect(wrapper).toBeInTheDocument()
      expect(wrapper.className).not.toContain('pl0')
    })

    it('button wrapper has pa4 (uniform padding on all sides)', () => {
      const { container } = render(
        <PickupPointSelector
          onClick={jest.fn()}
          loading={false}
          placeholder="Select pickup"
          mode="default"
          icon={<span />}
        />
      )

      const wrapper = container.querySelector(
        '.pickupPointSelectorButtonWrapper'
      ) as HTMLElement

      expect(wrapper).toBeInTheDocument()
      expect(wrapper.className).toContain('pa4')
    })
  })

  describe('ShippingMethodSelector inner component — no regression', () => {
    it('button already has pa4 and does not have pl0', () => {
      const { container } = render(
        <ShippingMethodSelectorInner onClick={jest.fn()} loading={false} />
      )

      const button = container.querySelector(
        '.shippingMethodSelector'
      ) as HTMLElement

      expect(button).toBeInTheDocument()
      expect(button.className).toContain('pa4')
      expect(button.className).not.toContain('pl0')
    })
  })
})
