import React from 'react'

export const Spinner = () =>
  React.createElement('div', { 'data-testid': 'spinner' })
export const Button = ({
  children,
  onClick,
}: {
  children?: React.ReactNode
  onClick?: () => void
}) => React.createElement('button', { onClick }, children)
export const Input = (props: Record<string, unknown>) =>
  React.createElement(
    'input',
    props as React.InputHTMLAttributes<HTMLInputElement>
  )
export const Modal = ({
  children,
  isOpen,
}: {
  children?: React.ReactNode
  isOpen?: boolean
}) =>
  isOpen
    ? React.createElement('div', { 'data-testid': 'modal' }, children)
    : null
