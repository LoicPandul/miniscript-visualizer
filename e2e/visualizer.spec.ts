import { expect, test, type Page } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  // Each test starts from the default (inheritance) example. The flag keeps
  // reloads within a test from wiping state again.
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('e2e-cleared')) {
      localStorage.clear()
      sessionStorage.setItem('e2e-cleared', '1')
    }
  })
  await page.goto('/')
})

function policyBlock(page: Page) {
  return page.locator('.code-block', { hasText: 'Policy' }).locator('.code-block-body')
}

function descriptorBlock(page: Page) {
  return page.locator('.code-block', { hasText: 'Descriptor' }).locator('.code-block-body')
}

function miniscriptBlock(page: Page) {
  return page.locator('.code-block', { hasText: 'Miniscript' }).locator('.code-block-body')
}

async function openCodeTabIfMobile(page: Page) {
  const tab = page.getByRole('button', { name: 'Code', exact: true })
  if (await tab.isVisible()) await tab.click()
}

async function openBuildTabIfMobile(page: Page) {
  const tab = page.getByRole('button', { name: 'Build', exact: true })
  if (await tab.isVisible()) await tab.click()
}

test('loads the default example and compiles it', async ({ page }) => {
  await openCodeTabIfMobile(page)
  await expect(policyBlock(page)).toContainText('or(9@pk(Owner),and(pk(Heir),older(26280)))')
  await expect(page.locator('.status-chip.is-ok')).toBeVisible()
  await expect(miniscriptBlock(page)).toContainText('pk(Owner)')
  await expect(descriptorBlock(page)).toContainText(/^wsh\(/)
})

test('script context changes the descriptor wrapper', async ({ page }) => {
  await openCodeTabIfMobile(page)
  await page.getByRole('radio', { name: 'P2SH-P2WSH' }).click()
  await expect(descriptorBlock(page)).toContainText(/^sh\(wsh\(/)
  await page.getByRole('radio', { name: 'P2TR' }).click()
  await expect(descriptorBlock(page)).toContainText(/^tr\(/)
  await expect(page.locator('.status-chip.is-ok')).toBeVisible()
})

test('taproot thresholds compile to multi_a', async ({ page }) => {
  await page.getByRole('button', { name: 'Examples' }).click()
  await page.getByRole('menuitem', { name: '2-of-3 multisig' }).click()
  await page.getByRole('radio', { name: 'P2TR' }).click()
  await openCodeTabIfMobile(page)
  await expect(miniscriptBlock(page)).toContainText('multi_a(2,Alice,Bob,Carol)')
})

test('threshold stepper updates k live', async ({ page }) => {
  await page.getByRole('button', { name: 'Examples' }).click()
  await page.getByRole('menuitem', { name: '2-of-3 multisig' }).click()
  await openBuildTabIfMobile(page)
  await page.getByRole('button', { name: 'Increase threshold' }).click()
  await openCodeTabIfMobile(page)
  await expect(policyBlock(page)).toContainText('thresh(3,pk(Alice),pk(Bob),pk(Carol))')
})

test('renaming a key updates every output', async ({ page }) => {
  await openBuildTabIfMobile(page)
  await page.getByRole('button', { name: 'Owner', exact: true }).click()
  const input = page.getByLabel('Rename key Owner')
  await input.fill('Satoshi')
  await input.press('Enter')
  await openCodeTabIfMobile(page)
  await expect(policyBlock(page)).toContainText('pk(Satoshi)')
  await expect(miniscriptBlock(page)).toContainText('Satoshi')
})

test('transforming a node type rewrites the policy', async ({ page }) => {
  await page.getByRole('button', { name: 'Examples' }).click()
  await page.getByRole('menuitem', { name: 'Single key' }).click()
  await openBuildTabIfMobile(page)
  await page.locator('.node-type-select').first().selectOption('thresh')
  await openCodeTabIfMobile(page)
  await expect(policyBlock(page)).toContainText(/^thresh\(2,pk\(Alice\),pk\(/)
})

test('adding a relative timelock condition', async ({ page }) => {
  await page.getByRole('button', { name: 'Examples' }).click()
  await page.getByRole('menuitem', { name: '2-of-3 multisig' }).click()
  await openBuildTabIfMobile(page)
  await page.getByRole('button', { name: 'Add condition' }).click()
  await page.getByRole('menuitem', { name: 'Relative timelock' }).click()
  await openCodeTabIfMobile(page)
  await expect(policyBlock(page)).toContainText('older(144)')
})

test('importing a policy rebuilds the tree', async ({ page }) => {
  await page.getByRole('button', { name: 'Import' }).click()
  await page
    .getByRole('dialog')
    .locator('textarea')
    .fill('and(pk(Warden),or(pk(Backup),after(900000)))')
  await page.getByRole('dialog').getByRole('button', { name: 'Import' }).click()
  await openCodeTabIfMobile(page)
  await expect(policyBlock(page)).toContainText('and(pk(Warden),or(pk(Backup),after(900000)))')
  // The signature-less OR branch triggers an explanatory warning.
  await expect(page.locator('.status-issue').first()).toBeVisible()
})

test('rejects an invalid imported policy with an error message', async ({ page }) => {
  await page.getByRole('button', { name: 'Import' }).click()
  await page.getByRole('dialog').locator('textarea').fill('multi(2,A,B)')
  await page.getByRole('dialog').getByRole('button', { name: 'Import' }).click()
  await expect(page.locator('.modal-error')).toContainText('unknown fragment')
})

test('copy button provides feedback and fills the clipboard', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'clipboard permissions are chromium-only')
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await openCodeTabIfMobile(page)
  await page.getByRole('button', { name: 'Copy policy' }).click()
  await expect(page.getByRole('button', { name: 'Copied' }).first()).toBeVisible()
  const clipboard = await page.evaluate(() => navigator.clipboard.readText())
  expect(clipboard).toBe('or(9@pk(Owner),and(pk(Heir),older(26280)))')
})

test('breaking a policy shows errors instead of stale output', async ({ page }) => {
  await page.getByRole('button', { name: 'Examples' }).click()
  await page.getByRole('menuitem', { name: 'Hash time-locked contract' }).click()
  await openBuildTabIfMobile(page)
  const digest = page.getByLabel('Hash digest (hex)')
  await digest.fill('beef')
  await openCodeTabIfMobile(page)
  await expect(page.locator('.status-chip.is-error')).toBeVisible()
  await expect(miniscriptBlock(page)).toContainText('nothing to show')
})

test('diagram: nodes render, drag moves them, notes can be added', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'drag interactions are desktop-focused')

  const orNode = page.locator('.flow-node', { hasText: 'OR' }).first()
  await expect(orNode).toBeVisible()

  // Drag the OR node (from its center) and check it sticks.
  const before = await orNode.boundingBox()
  const center = { x: before!.x + before!.width / 2, y: before!.y + before!.height / 2 }
  await orNode.hover()
  await page.mouse.down()
  await page.mouse.move(center.x + 160, center.y + 90, { steps: 8 })
  await page.mouse.up()
  await page.waitForTimeout(200)
  const after = await orNode.boundingBox()
  expect(Math.abs(after!.x - before!.x)).toBeGreaterThan(100)

  // Add an annotation and type into it.
  await page.getByRole('button', { name: 'Note', exact: true }).click()
  const noteInput = page.getByLabel('Annotation text')
  await expect(noteInput).toBeVisible()
  await noteInput.fill('Emergency recovery path')
  await page.locator('.react-flow__pane').click({ position: { x: 40, y: 40 } })
  await expect(page.locator('.flow-note-text')).toContainText('Emergency recovery path')

  // Delete the note.
  await page.locator('.flow-note').hover()
  await page.getByRole('button', { name: 'Delete note' }).click()
  await expect(page.locator('.flow-note')).toHaveCount(0)
})

test('selection syncs from diagram to builder and code', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'panels are tabbed on mobile')
  await page.locator('.flow-node', { hasText: 'Heir' }).click()
  await expect(page.locator('.node-card.is-selected')).toHaveCount(1)
  await expect(page.locator('.tok-selected').first()).toBeVisible()
})

test('clicking another node moves the selection in one click', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'panels are tabbed on mobile')
  // Select a deep node first, then its ancestor: the batch of select/deselect
  // changes must not cancel itself out (regression test).
  await page.locator('.flow-node', { hasText: 'Heir' }).click()
  await page.locator('.flow-node', { hasText: 'OR' }).click()
  await expect(page.locator('.node-card.is-selected')).toHaveCount(1)
  await expect(page.locator('.node-card.is-selected .node-type-select').first()).toHaveValue('or')
})

test('the root node cannot be deleted from the canvas', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'mobile', 'keyboard delete is desktop-focused')
  const count = await page.locator('.flow-node').count()
  await page.locator('.flow-node', { hasText: 'OR' }).click()
  await page.keyboard.press('Delete')
  await expect(page.locator('.flow-node')).toHaveCount(count)
})

test('mobile: tabs switch between panels', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'mobile only')
  await expect(page.locator('.builder')).toBeInViewport()
  await page.getByRole('button', { name: 'Diagram', exact: true }).click()
  await expect(page.locator('.flow-node').first()).toBeInViewport()
  await page.getByRole('button', { name: 'Code', exact: true }).click()
  await expect(policyBlock(page)).toBeInViewport()
})

test('state persists across a reload', async ({ page }) => {
  await openBuildTabIfMobile(page)
  await page.getByRole('button', { name: 'Owner', exact: true }).click()
  const input = page.getByLabel('Rename key Owner')
  await input.fill('Persisted')
  await input.press('Enter')
  await page.reload()
  await openCodeTabIfMobile(page)
  await expect(policyBlock(page)).toContainText('pk(Persisted)')
})
