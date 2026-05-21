import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { VariantThumbnail } from './VariantThumbnail'

describe('VariantThumbnail', () => {
  it('renders the SVG component for a known kind', () => {
    const { container } = render(<VariantThumbnail kind="killer" />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
  })

  it('applies size class', () => {
    const { container } = render(<VariantThumbnail kind="classic" className="size-20" />)
    expect(container.firstChild).toHaveClass('size-20')
  })
})
