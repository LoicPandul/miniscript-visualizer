import type { KeyboardEvent } from 'react'

/**
 * Arrow-key handling for role="radiogroup" containers: moves focus AND
 * selection to the previous/next radio, as the ARIA pattern prescribes.
 * Pair with a roving tabindex (checked radio gets 0, others -1).
 */
export function handleRadioGroupKeys(e: KeyboardEvent<HTMLElement>): void {
  const forward = e.key === 'ArrowRight' || e.key === 'ArrowDown'
  const backward = e.key === 'ArrowLeft' || e.key === 'ArrowUp'
  if (!forward && !backward) return
  const radios = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]'))
  if (radios.length === 0) return
  const current = radios.findIndex((r) => r.getAttribute('aria-checked') === 'true')
  const next = (current + (forward ? 1 : -1) + radios.length) % radios.length
  e.preventDefault()
  radios[next].focus()
  radios[next].click()
}

const MENU_ITEMS = '[role="menuitem"], [role="menuitemradio"]'

/** Arrow/Home/End navigation between menu item children. */
export function handleMenuKeys(e: KeyboardEvent<HTMLElement>): void {
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return
  const items = Array.from(
    e.currentTarget.querySelectorAll<HTMLButtonElement>(MENU_ITEMS),
  ).filter((el) => !el.disabled)
  if (items.length === 0) return
  const active = items.indexOf(document.activeElement as HTMLButtonElement)
  let next = 0
  if (e.key === 'ArrowDown') next = active < 0 ? 0 : (active + 1) % items.length
  else if (e.key === 'ArrowUp') next = active < 0 ? items.length - 1 : (active - 1 + items.length) % items.length
  else if (e.key === 'End') next = items.length - 1
  e.preventDefault()
  items[next].focus()
}

/** Focuses the first (or checked) item of a just-opened menu. */
export function focusFirstMenuItem(menu: HTMLElement | null): void {
  requestAnimationFrame(() => {
    if (!menu) return
    const checked = menu.querySelector<HTMLButtonElement>('[role="menuitemradio"][aria-checked="true"]')
    const first = menu.querySelector<HTMLButtonElement>(MENU_ITEMS)
    ;(checked ?? first)?.focus()
  })
}
