import 'dotenv/config';
import { PrismaClient, TaskStatus, Priority } from '@prisma/client';
import bcrypt from 'bcryptjs';
if (!process.env.DIRECT_URL) throw new Error('DIRECT_URL is required for seed');
const db = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
const days = (n: number) => new Date(Date.now() + n * 86400000);
async function main() {
  const passwordHash = await bcrypt.hash('password123', 12);
  await db.$transaction(async (tx) => {
    const users = [
      ['seed-manager', 'Alex Morgan', 'manager@handoff.dev', 'MANAGER'],
      ['seed-design1', 'Jordan Lee', 'design1@handoff.dev', 'MEMBER'],
      ['seed-design2', 'Sam Rivera', 'design2@handoff.dev', 'MEMBER'],
      ['seed-video1', 'Taylor Chen', 'video1@handoff.dev', 'MEMBER'],
      ['seed-copy1', 'Riley Parker', 'copy1@handoff.dev', 'MEMBER'],
    ] as const;
    for (const [id, name, email, role] of users)
      await tx.user.upsert({
        where: { id },
        create: { id, name, email, role, passwordHash },
        update: {},
      });
    for (const name of ['Design', 'Video', 'Copy'])
      await tx.department.upsert({
        where: { id: `seed-${name.toLowerCase()}` },
        create: { id: `seed-${name.toLowerCase()}`, name },
        update: {},
      });
    for (const [userId, departmentId] of [
      ['seed-design1', 'seed-design'],
      ['seed-design2', 'seed-design'],
      ['seed-video1', 'seed-video'],
      ['seed-copy1', 'seed-copy'],
    ])
      await tx.userDepartment.upsert({
        where: { userId_departmentId: { userId, departmentId } },
        create: { userId, departmentId },
        update: {},
      });
    const projects = [
      [
        'seed-nike',
        'Nike Q3 Campaign',
        'Nike',
        'A movement-first campaign for the next generation of runners. Build a cohesive visual system across social, motion, and launch copy.',
        14,
      ],
      [
        'seed-coffee',
        'Local Coffee Rebrand',
        'Common Ground Coffee',
        'A warm, distinctive identity for the neighborhood’s favorite coffee shop. Keep it human, tactile, and welcoming.',
        7,
      ],
      [
        'seed-fintech',
        'Fintech App Launch',
        'Forma Financial',
        'Launch a calmer way to manage money. Clear storytelling and confident visuals for the product launch.',
        21,
      ],
    ] as const;
    for (const [id, name, clientName, brief, deadline] of projects)
      await tx.project.upsert({
        where: { id },
        create: {
          id,
          name,
          clientName,
          brief,
          deadline: days(deadline),
          createdById: 'seed-manager',
        },
        update: {},
      });
    const tasks: [string, string, string, string, string, TaskStatus, Priority, number][] = [
      [
        'seed-task1',
        'seed-nike',
        'Campaign visual direction',
        'seed-design',
        'seed-design1',
        'IN_REVIEW',
        'HIGH',
        2,
      ],
      [
        'seed-task2',
        'seed-nike',
        'Hero campaign film · 30s',
        'seed-video',
        'seed-video1',
        'IN_PROGRESS',
        'URGENT',
        1,
      ],
      [
        'seed-task3',
        'seed-nike',
        'Social launch copy',
        'seed-copy',
        'seed-copy1',
        'TODO',
        'NORMAL',
        3,
      ],
      [
        'seed-task4',
        'seed-coffee',
        'Brand identity exploration',
        'seed-design',
        'seed-design2',
        'REJECTED',
        'HIGH',
        -1,
      ],
      [
        'seed-task5',
        'seed-coffee',
        'Founder story edit',
        'seed-video',
        'seed-video1',
        'TODO',
        'NORMAL',
        5,
      ],
      [
        'seed-task6',
        'seed-coffee',
        'Brand voice guidelines',
        'seed-copy',
        'seed-copy1',
        'APPROVED',
        'LOW',
        -2,
      ],
      [
        'seed-task7',
        'seed-fintech',
        'App store screenshots',
        'seed-design',
        'seed-design1',
        'TODO',
        'NORMAL',
        7,
      ],
      [
        'seed-task8',
        'seed-fintech',
        'Product walkthrough',
        'seed-video',
        'seed-video1',
        'IN_REVIEW',
        'HIGH',
        0.2,
      ],
      [
        'seed-task9',
        'seed-fintech',
        'Landing page messaging',
        'seed-copy',
        'seed-copy1',
        'IN_PROGRESS',
        'HIGH',
        0.1,
      ],
      [
        'seed-task10',
        'seed-nike',
        'Social carousel templates',
        'seed-design',
        'seed-design2',
        'APPROVED',
        'NORMAL',
        4,
      ],
    ];
    for (const [
      id,
      projectId,
      title,
      departmentId,
      assigneeId,
      status,
      priority,
      deadline,
    ] of tasks) {
      await tx.task.upsert({
        where: { id },
        create: {
          id,
          projectId,
          title,
          departmentId,
          assigneeId,
          status,
          priority,
          deadline: days(deadline),
          description: `Create ${title.toLowerCase()} aligned with the project brief. Include working files and a final export. Submit for review when ready.`,
          rejectionReason:
            status === 'REJECTED'
              ? 'The direction feels too corporate. Explore warmer colors and more organic typography.'
              : null,
          createdById: 'seed-manager',
        },
        update: {},
      });
      await tx.activity.upsert({
        where: { id: `activity-${id}` },
        create: {
          id: `activity-${id}`,
          projectId,
          taskId: id,
          actorId: 'seed-manager',
          action: 'task.created',
          meta: { title },
        },
        update: {},
      });
    }
    for (const [id, taskId, userId, body] of [
      [
        'seed-comment1',
        'seed-task1',
        'seed-design1',
        'First direction is ready. I leaned into bold typography and a quieter color palette.',
      ],
      [
        'seed-comment2',
        'seed-task1',
        'seed-manager',
        'Love the direction. Let’s check the mobile crops before we approve.',
      ],
      [
        'seed-comment3',
        'seed-task4',
        'seed-manager',
        'Please bring back some warmth. The client loved the hand-drawn references.',
      ],
    ])
      await tx.comment.upsert({ where: { id }, create: { id, taskId, userId, body }, update: {} });
    for (const taskId of ['seed-task1', 'seed-task8'])
      await tx.notification.upsert({
        where: { id: `notification-${taskId}` },
        create: {
          id: `notification-${taskId}`,
          userId: 'seed-manager',
          type: 'TASK_STATUS',
          payload: {
            title: 'Ready for review',
            body: tasks.find((t) => t[0] === taskId)![2],
            taskId,
          },
        },
        update: {},
      });
  });
  console.log('Seed ready: manager@handoff.dev / password123');
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
