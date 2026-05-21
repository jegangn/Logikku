import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Markdown } from './markdown'

describe('Markdown', () => {
  it('renders paragraphs', () => {
    const { container } = render(<Markdown source={'hello\n\nworld'} />)
    const paragraphs = container.querySelectorAll('p')
    expect(paragraphs).toHaveLength(2)
    expect(paragraphs[0]?.textContent).toBe('hello')
    expect(paragraphs[1]?.textContent).toBe('world')
  })

  it('renders bulleted lists', () => {
    const { container } = render(<Markdown source={'- one\n- two\n- three'} />)
    const items = container.querySelectorAll('li')
    expect(items).toHaveLength(3)
    expect(items[1]?.textContent).toBe('two')
  })

  it('renders bold and italic inline', () => {
    const { container } = render(<Markdown source={'this is **strong** and *soft*'} />)
    expect(container.querySelector('strong')?.textContent).toBe('strong')
    expect(container.querySelector('em')?.textContent).toBe('soft')
  })

  it('renders inline code', () => {
    const { container } = render(<Markdown source={'run `bun dev` first'} />)
    expect(container.querySelector('code')?.textContent).toBe('bun dev')
  })

  it('treats raw HTML as plain text', () => {
    const { container } = render(<Markdown source={'<script>alert(1)</script>'} />)
    expect(container.querySelector('script')).toBeNull()
    expect(container.textContent).toContain('<script>')
  })

  it('handles mixed paragraphs and lists', () => {
    const { container } = render(
      <Markdown source={'Intro line.\n\n- alpha\n- beta\n\nOutro.'} />,
    )
    const paragraphs = container.querySelectorAll('p')
    const lists = container.querySelectorAll('ul')
    expect(paragraphs).toHaveLength(2)
    expect(lists).toHaveLength(1)
    expect(lists[0]?.querySelectorAll('li')).toHaveLength(2)
  })
})
