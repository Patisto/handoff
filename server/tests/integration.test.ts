import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import request from 'supertest';

test(
  'PostgreSQL RLS, API workflow, file versions, and refresh rotation',
  { skip: process.env.RUN_DB_TESTS !== '1', timeout: 90000 },
  async (t) => {
    assert.ok(process.env.DATABASE_URL, 'Set DATABASE_URL to the non-bypass runtime role');
    assert.ok(process.env.DIRECT_URL, 'Set DIRECT_URL to the migration administrator');
    const { app } = await import('../src/app.js');
    const { db, setIdentity, verifyRuntimeRole } = await import('../src/config/db.js');
    const { storage } = await import('../src/config/storage.js');
    const admin = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
    const suffix = randomUUID();
    const password = 'integration-password-123';
    const passwordHash = await bcrypt.hash(password, 10);
    const userIds: string[] = [];
    const departmentIds: string[] = [];
    const projectIds: string[] = [];
    try {
      await verifyRuntimeRole();
      const manager = await admin.user.create({
        data: {
          name: 'Test Manager',
          email: `manager-${suffix}@test.invalid`,
          passwordHash,
          role: 'MANAGER',
        },
      });
      userIds.push(manager.id);
      const design = await admin.department.create({ data: { name: `Design ${suffix}` } });
      departmentIds.push(design.id);
      const video = await admin.department.create({ data: { name: `Video ${suffix}` } });
      departmentIds.push(video.id);
      const member = await admin.user.create({
        data: {
          name: 'Test Designer',
          email: `design-${suffix}@test.invalid`,
          passwordHash,
          role: 'MEMBER',
          departments: { create: { departmentId: design.id } },
        },
      });
      userIds.push(member.id);
      const other = await admin.user.create({
        data: {
          name: 'Test Editor',
          email: `video-${suffix}@test.invalid`,
          passwordHash,
          role: 'MEMBER',
          departments: { create: { departmentId: video.id } },
        },
      });
      userIds.push(other.id);
      const managerLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: manager.email, password })
        .expect(200);
      const memberLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: member.email, password })
        .expect(200);
      const managerToken = managerLogin.body.data.accessToken as string;
      const memberToken = memberLogin.body.data.accessToken as string;
      const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
      const projectResult = await request(app)
        .post('/api/projects')
        .set(auth(managerToken))
        .send({
          name: 'Integration campaign',
          clientName: 'Test client',
          brief: 'Exercise the full workflow.',
          deadline: new Date(Date.now() + 86400000).toISOString(),
        })
        .expect(201);
      const projectId = projectResult.body.data.id as string;
      projectIds.push(projectId);
      const hidden = await admin.project.create({
        data: {
          name: 'Other department only',
          clientName: 'Private',
          deadline: new Date(),
          createdById: manager.id,
        },
      });
      projectIds.push(hidden.id);
      const createTask = async (departmentId: string, project: string, title: string) => {
        const res = await request(app)
          .post('/api/tasks')
          .set(auth(managerToken))
          .send({
            title,
            projectId: project,
            departmentId,
            deadline: new Date(Date.now() + 3600000).toISOString(),
          })
          .expect(201);
        return res.body.data.id as string;
      };
      const ownId = await createTask(design.id, projectId, 'Design draft');
      const foreignId = await createTask(video.id, projectId, 'Confidential edit');
      const hiddenId = await createTask(video.id, hidden.id, 'Private project edit');
      const foreignComment = await admin.comment.create({
        data: { taskId: foreignId, userId: other.id, body: 'Private feedback' },
      });
      const foreignFile = await admin.file.create({
        data: {
          taskId: foreignId,
          uploaderId: other.id,
          path: randomUUID(),
          originalName: 'private.txt',
          mimeType: 'text/plain',
          size: 1,
        },
      });
      await admin.activity.create({
        data: {
          taskId: foreignId,
          projectId,
          actorId: other.id,
          action: 'private.activity',
          meta: {},
        },
      });
      const inbox = await admin.notification.create({
        data: {
          userId: other.id,
          type: 'PRIVATE',
          payload: { title: 'Private', body: 'No access' },
        },
      });
      await t.test('direct database reads enforce RLS without API filters', async () => {
        await db.$transaction(async (tx) => {
          await setIdentity(tx, { id: member.id, role: 'MEMBER' });
          const visible = await tx.task.findMany({
            where: { id: { in: [ownId, foreignId, hiddenId] } },
          });
          assert.deepEqual(
            visible.map((t) => t.id),
            [ownId],
          );
          assert.equal(await tx.task.findUnique({ where: { id: foreignId } }), null);
          assert.equal(await tx.project.findUnique({ where: { id: hidden.id } }), null);
          assert.ok(await tx.project.findUnique({ where: { id: projectId } }));
          assert.equal(await tx.comment.findUnique({ where: { id: foreignComment.id } }), null);
          assert.equal(await tx.file.findUnique({ where: { id: foreignFile.id } }), null);
          assert.equal(await tx.notification.findUnique({ where: { id: inbox.id } }), null);
          assert.equal(await tx.activity.count({ where: { taskId: foreignId } }), 0);
          const write = await tx.task.updateMany({
            where: { id: foreignId },
            data: { status: 'IN_REVIEW' },
          });
          assert.equal(write.count, 0);
        });
        assert.equal(
          await db.task.count(),
          0,
          'transaction identity must not leak to pooled requests',
        );
        await db.$transaction(async (tx) => {
          await setIdentity(tx, { id: manager.id, role: 'MANAGER' });
          assert.equal(
            await tx.task.count({ where: { id: { in: [ownId, foreignId, hiddenId] } } }),
            3,
          );
        });
      });
      await t.test('API denies cross-department and manager-only access', async () => {
        await request(app).get(`/api/tasks/${foreignId}`).set(auth(memberToken)).expect(404);
        await request(app)
          .get(`/api/tasks/${foreignId}/comments`)
          .set(auth(memberToken))
          .expect(404);
        await request(app)
          .get(`/api/files/${foreignFile.id}/download`)
          .set(auth(memberToken))
          .expect(404);
        await request(app).get('/api/users').set(auth(memberToken)).expect(403);
        await request(app).post('/api/projects').set(auth(memberToken)).send({}).expect(403);
        await request(app)
          .patch(`/api/tasks/${ownId}`)
          .set(auth(memberToken))
          .send({ departmentId: video.id })
          .expect(403);
      });
      await t.test('member submits, manager reviews, and rejection needs a reason', async () => {
        await request(app)
          .patch(`/api/tasks/${ownId}/status`)
          .set(auth(memberToken))
          .send({ status: 'APPROVED' })
          .expect(403);
        await request(app)
          .patch(`/api/tasks/${ownId}/status`)
          .set(auth(memberToken))
          .send({ status: 'IN_PROGRESS', expectedStatus: 'TODO' })
          .expect(200);
        await request(app)
          .post(`/api/tasks/${ownId}/comments`)
          .set(auth(memberToken))
          .send({ body: 'Ready for a first look.' })
          .expect(201);
        const uploaded = await request(app)
          .post('/api/files')
          .set(auth(memberToken))
          .field('taskId', ownId)
          .attach('file', Buffer.from('draft one'), 'draft.txt')
          .expect(201);
        const uploadedAgain = await request(app)
          .post('/api/files')
          .set(auth(memberToken))
          .field('taskId', ownId)
          .attach('file', Buffer.from('draft two'), 'draft.txt')
          .expect(201);
        assert.equal(uploadedAgain.body.data.version, uploaded.body.data.version + 1);
        await request(app)
          .get(`/api/files/${uploaded.body.data.id}/download`)
          .set(auth(memberToken))
          .expect(200);
        await request(app)
          .patch(`/api/tasks/${ownId}/status`)
          .set(auth(memberToken))
          .send({ status: 'IN_REVIEW', expectedStatus: 'IN_PROGRESS' })
          .expect(200);
        assert.ok(
          await admin.notification.findFirst({
            where: {
              userId: manager.id,
              type: 'TASK_STATUS',
              payload: { path: ['taskId'], equals: ownId },
            },
          }),
        );
        await request(app)
          .patch(`/api/tasks/${ownId}/status`)
          .set(auth(managerToken))
          .send({ status: 'REJECTED' })
          .expect(422);
        await request(app)
          .patch(`/api/tasks/${ownId}/status`)
          .set(auth(managerToken))
          .send({ status: 'REJECTED', rejectionReason: 'Use the final brand colors.' })
          .expect(200);
        await request(app)
          .patch(`/api/tasks/${ownId}/status`)
          .set(auth(memberToken))
          .send({ status: 'IN_PROGRESS' })
          .expect(403);
        await request(app)
          .patch(`/api/tasks/${ownId}/status`)
          .set(auth(managerToken))
          .send({ status: 'TODO' })
          .expect(200);
        await request(app)
          .patch(`/api/tasks/${ownId}/status`)
          .set(auth(memberToken))
          .send({ status: 'IN_PROGRESS' })
          .expect(200);
        await request(app)
          .patch(`/api/tasks/${ownId}/status`)
          .set(auth(memberToken))
          .send({ status: 'IN_REVIEW' })
          .expect(200);
        await request(app)
          .patch(`/api/tasks/${ownId}/status`)
          .set(auth(managerToken))
          .send({ status: 'APPROVED' })
          .expect(200);
      });
      await t.test(
        'refresh cookies rotate, replay fails, and logout revokes the session',
        async () => {
          const rawCookie = managerLogin.headers['set-cookie'] as unknown as string[];
          const cookie = rawCookie.map((c) => c.split(';')[0]).join('; ');
          const refreshed = await request(app)
            .post('/api/auth/refresh')
            .set('Cookie', cookie)
            .expect(200);
          await request(app).post('/api/auth/refresh').set('Cookie', cookie).expect(401);
          const freshCookie = (refreshed.headers['set-cookie'] as unknown as string[])
            .map((c) => c.split(';')[0])
            .join('; ');
          await request(app).post('/api/auth/logout').set('Cookie', freshCookie).expect(200);
          await request(app).post('/api/auth/refresh').set('Cookie', freshCookie).expect(401);
        },
      );
    } finally {
      const files = await admin.file.findMany({ where: { uploaderId: { in: userIds } } });
      await Promise.allSettled(files.map((f) => storage.delete(f.path)));
      if (projectIds.length)
        await admin.notification.deleteMany({
          where: {
            OR: projectIds.map((projectId) => ({
              payload: { path: ['projectId'], equals: projectId },
            })),
          },
        });
      await admin.project.deleteMany({ where: { id: { in: projectIds } } });
      await admin.department.deleteMany({ where: { id: { in: departmentIds } } });
      await admin.user.deleteMany({ where: { id: { in: userIds } } });
      await admin.$disconnect();
      await db.$disconnect();
    }
  },
);
