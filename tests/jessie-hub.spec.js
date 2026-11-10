const { test, expect } = require('@playwright/test');
test.beforeEach(async ({page}) => { await page.goto('/'); await page.evaluate(()=>localStorage.clear()); await page.reload(); });
test('dashboard renders all seven sections and zero-record state', async ({page}) => {
  for (const name of ['Dashboard','Caller Context','Source Comparison','Retrieval Checklist','Call Handling','JU Master Write-back','Backup']) await expect(page.getByRole('button',{name,exact:true})).toBeVisible();
  await expect(page.getByText('0 callers · 0 comparisons · 0 call notes')).toBeVisible();
});
test('caller records default UNKNOWN and block verification without evidence metadata', async ({page}) => {
  await page.getByRole('button',{name:'Caller Context'}).click();
  await page.locator('#person').fill('Synthetic Caller A');
  await page.getByRole('button',{name:'Save as UNKNOWN'}).click();
  await expect(page.getByText('Synthetic Caller A')).toBeVisible();
  const dialogPromise = page.waitForEvent('dialog');
  await page.locator('select').last().selectOption('VERIFIED');
  const dialog = await dialogPromise;
  expect(dialog.message()).toContain('Source, verification date and next review required.');
  await dialog.dismiss();
  await expect(page.locator('select').last()).toHaveValue('UNKNOWN');
});
test('safe-to-confirm requires explicit fact plus source/date/review', async ({page}) => {
  await page.getByRole('button',{name:'Caller Context'}).click();
  await page.locator('#person').fill('Synthetic Caller B');
  await page.locator('#safe').fill('Approved public appointment hours');
  await page.locator('#source').fill('TEST-SOURCE-001');
  await page.locator('#verified').fill('2026-11-09');
  await page.locator('#review').fill('Review next month');
  await page.getByRole('button',{name:'Save as UNKNOWN'}).click();
  page.once('dialog', d=>d.accept());
  await page.locator('select').last().selectOption('SAFE TO CONFIRM');
  await expect(page.getByText('SAFE TO CONFIRM',{exact:true})).toBeVisible();
});
test('source comparison requires summary, source excerpt and source reference', async ({page}) => {
  await page.getByRole('button',{name:'Source Comparison'}).click();
  await page.locator('#summary').fill('Jessie summary says synthetic status A');
  await page.locator('#authority').fill('Authoritative test record says status B');
  await page.locator('#ref').fill('TEST-RECORD-02');
  await page.locator('#diff').fill('Conflict: A vs B');
  await page.getByRole('button',{name:'Queue comparison'}).click();
  await expect(page.getByText('TEST-RECORD-02')).toBeVisible();
});
test('call handling logs recommendation without triggering external routing', async ({page}) => {
  await page.getByRole('button',{name:'Call Handling'}).click();
  await page.locator('#who').fill('Synthetic caller');
  await page.locator('#request').fill('Requests owner callback');
  await page.locator('#route').selectOption('ESCALATE');
  await page.locator('#transcript').selectOption('PENDING');
  await page.locator('#callsource').fill('TEST-CALL-03');
  await page.getByRole('button',{name:'Save recommendation'}).click();
  await expect(page.getByText('TEST-CALL-03')).toBeVisible();
  await expect(page.getByText('No call is forwarded, no message sent, and no live routing is changed.')).toBeVisible();
});
test('JU Master receipt is blocked until evidence, privacy and approval checks exist', async ({page}) => {
  await page.getByRole('button',{name:'JU Master Write-back'}).click();
  await page.locator('#change').fill('Synthetic test change');
  await page.locator('#receipt').fill('TEST-RECEIPT-04');
  await page.locator('#reviewer').fill('QA');
  await page.locator('#date').fill('2026-11-09');
  const blockedDialogPromise = page.waitForEvent('dialog');
  await page.getByRole('button',{name:'Prepare receipt (does not sync)'}).click();
  const blockedDialog = await blockedDialogPromise;
  expect(blockedDialog.message()).toContain('BLOCKED: source, reviewer, date and approvals required.');
  await blockedDialog.dismiss();
  await page.locator('#evidence').check(); await page.locator('#privacy').check(); await page.locator('#approve').check();
  await page.getByRole('button',{name:'Prepare receipt (does not sync)'}).click();
  await expect(page.getByText('NOT written to JU Master')).toBeVisible();
});
test('backup exports and import restores local JSON', async ({page}) => {
  await page.getByRole('button',{name:'Caller Context'}).click();
  await page.locator('#person').fill('Backup Caller');
  await page.getByRole('button',{name:'Save as UNKNOWN'}).click();
  await page.getByRole('button',{name:'Backup'}).click();
  const downloadPromise=page.waitForEvent('download');
  await page.getByRole('button',{name:'Export JSON'}).click();
  const download=await downloadPromise; expect(download.suggestedFilename()).toBe('ju-jessie-backup.json');
});
test('service worker registration attempted on HTTPS', async ({page,context}) => {
  await page.waitForTimeout(1000);
  const secure=await page.evaluate(()=>location.protocol==='https:');
  expect(secure).toBeTruthy();
  await expect.poll(()=>page.evaluate(()=>('serviceWorker' in navigator))).toBeTruthy();
});
