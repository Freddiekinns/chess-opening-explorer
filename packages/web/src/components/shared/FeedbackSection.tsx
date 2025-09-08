import React from 'react'

interface FeedbackSectionProps { source?: string }

// Simplified feedback component with inline link
export const FeedbackSection: React.FC<FeedbackSectionProps> = ({ source }) => {
  const baseUrl = 'https://forms.gle/3DfV8NpbhapzyTi26'
  const href = source ? `${baseUrl}?src=${encodeURIComponent(source)}` : baseUrl
  return (
    <div style={{ margin: '3rem 0', textAlign: 'center' }}>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: 'var(--color-text-accent)', textDecoration: 'underline', fontWeight: 600 }}
      >
        Help Us Improve Opening Book
      </a>
    </div>
  )
}

export default FeedbackSection
