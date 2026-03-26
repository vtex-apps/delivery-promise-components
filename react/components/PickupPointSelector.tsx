import React from 'react'
import { useCssHandles } from 'vtex.css-handles'
import { Spinner } from 'vtex.styleguide'

const CSS_HANDLES = [
  'pickupPointSelectorButtonWrapper',
  'pickupPointSelectorButtonValue',
  'pickupPointSelectorContainer',
] as const

interface PickupPointSelectorProps {
  onClick: () => void
  loading: boolean
  placeholder: string
  value?: React.ReactNode
  mode: Mode
  icon: React.ReactNode
}

const PickupPointSelector = ({
  onClick,
  loading,
  value,
  placeholder,
  mode,
  icon,
}: PickupPointSelectorProps) => {
  const handles = useCssHandles(CSS_HANDLES)

  return (
    <div
      className={`${handles.pickupPointSelectorContainer} flex items-center h-100`}
    >
      <button
        onClick={onClick}
        className={`${handles.pickupPointSelectorButtonWrapper} flex items-center br3 pt4 pr4 pb4 pl0 b--none`}
      >
        {loading ? (
          <div className="ml4">
            <Spinner size={14} />
          </div>
        ) : mode === 'default' ? (
          <p
            className={`${handles.pickupPointSelectorButtonValue} ma0 f6 fw6 c-action-primary`}
          >
            {value ?? placeholder}
          </p>
        ) : (
          icon
        )}
      </button>
    </div>
  )
}

export default PickupPointSelector
