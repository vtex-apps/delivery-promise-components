import React from 'react'
import { useCssHandles } from 'vtex.css-handles'

interface Props {
  onClick: () => void
  icon: React.ReactNode
  label: string
  isSelected: boolean
}

const CSS_HANDLES = [
  'shippingMethodOptionButton',
  'shippingMethodOptionButtonSelected',
]

const ShippingMethodOptionButton = ({
  icon,
  label,
  onClick,
  isSelected,
}: Props) => {
  const handles = useCssHandles(CSS_HANDLES)

  return (
    <button
      onClick={onClick}
      className={`br2 w-100 ${handles.shippingMethodOptionButton} ${
        isSelected ? handles.shippingMethodOptionButtonSelected : ''
      }`}
    >
      <div className="flex items-center">
        {icon}
        <p className="f3 ml4 mt0 mb0 tc">{label}</p>
      </div>
    </button>
  )
}

export default ShippingMethodOptionButton
