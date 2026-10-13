import test from 'node:test';
import assert from 'node:assert/strict';
import { allowedTransition } from '../src/modules/tasks/workflow.js';
import { statusUpdate, taskCreate } from '../src/modules/tasks/schema.js';
const statuses = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'APPROVED', 'REJECTED'];
test('members can only start TODO tasks and submit IN_PROGRESS tasks', () => {
  for (const from of statuses)
    for (const to of statuses)
      assert.equal(
        allowedTransition('MEMBER', from, to),
        from === to ||
          (from === 'TODO' && to === 'IN_PROGRESS') ||
          (from === 'IN_PROGRESS' && to === 'IN_REVIEW'),
        `${from} -> ${to}`,
      );
});
test('managers can approve, reject, and reopen tasks', () => {
  for (const from of statuses)
    for (const to of statuses) assert.equal(allowedTransition('MANAGER', from, to), true);
});
test('rejections require useful feedback and reject unrecognized fields', () => {
  assert.equal(statusUpdate.safeParse({ status: 'REJECTED' }).success, false);
  assert.equal(
    statusUpdate.safeParse({ status: 'REJECTED', rejectionReason: '  ' }).success,
    false,
  );
  assert.equal(
    statusUpdate.safeParse({ status: 'REJECTED', rejectionReason: 'Use the approved typography.' })
      .success,
    true,
  );
  assert.equal(
    statusUpdate.safeParse({ status: 'APPROVED', departmentId: 'other' }).success,
    false,
  );
});
test('task creation rejects invalid dates and mass assignment', () => {
  const valid = {
    title: 'Launch assets',
    projectId: 'project',
    departmentId: 'design',
    deadline: '2026-10-20T12:00:00Z',
  };
  assert.equal(taskCreate.safeParse(valid).success, true);
  assert.equal(taskCreate.safeParse({ ...valid, deadline: 'tomorrow' }).success, false);
  assert.equal(taskCreate.safeParse({ ...valid, status: 'APPROVED' }).success, false);
});
