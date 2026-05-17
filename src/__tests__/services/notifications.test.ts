import { describe, it, expect } from 'vitest'
import { renderTemplate } from '@/services/notifications'

describe('12. Notification logs & templating', () => {
  it('renderTemplate substitutes variables in template', () => {
    const template = 'Hi {customer_name}, your booking on {booking_date} at {booking_time} is confirmed.'
    const result = renderTemplate(template, {
      customer_name: 'John',
      booking_date: '2026-06-01',
      booking_time: '10:00',
    })
    expect(result).toBe('Hi John, your booking on 2026-06-01 at 10:00 is confirmed.')
  })

  it('renderTemplate leaves unknown variables unchanged', () => {
    const template = 'Hello {customer_name}, {unknown_var}'
    const result = renderTemplate(template, { customer_name: 'John' })
    expect(result).toBe('Hello John, {unknown_var}')
  })

  it('renderTemplate handles empty template', () => {
    expect(renderTemplate('', {})).toBe('')
  })

  it('renderTemplate handles templates with no variables', () => {
    const template = 'Plain text message'
    const result = renderTemplate(template, { any: 'value' })
    expect(result).toBe('Plain text message')
  })

  it('renderTemplate handles special characters in variables', () => {
    const template = 'Hi {name}!'
    const result = renderTemplate(template, { name: 'John & Jane' })
    expect(result).toBe('Hi John & Jane!')
  })
})
