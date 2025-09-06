import React from 'react'

interface LineTypePillProps {
  isMainline: boolean
  className?: string
}

// Simple pill that matches existing style-pill design exactly
export const LineTypePill: React.FC<LineTypePillProps> = ({ isMainline, className = '' }) => {
  const label = isMainline ? 'Mainline' : 'Variation'
  const title = isMainline ? 'ECO root line (canonical main reference)' : 'Derived variation of a mainline'

  return (
    <span
      className={`style-pill ${className}`.trim()}
      title={title}
    >
      {label}
    </span>
  )
}

export default LineTypePill
