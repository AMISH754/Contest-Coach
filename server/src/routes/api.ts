import { Router, Request, Response } from 'express';
import { getCodeforcesData, syncCodeforcesProblems, generatePersonalizedTasks, askAICoach } from '../services/codeforcesService';
import prisma from '../db';
import { CFProblem } from '@prisma/client';
import { fetchLeetCodeStats } from '../services/leetcodeService';
import {
  handleSchema,
  toggleTaskSchema,
  aiCoachSchema,
  linkLeetCodeSchema
} from './schemas';

const router = Router();

// Validate handle param middleware using Zod schema
router.param('handle', (req: Request, res: Response, next, handle) => {
  const result = handleSchema.safeParse(handle);
  if (!result.success) {
    res.status(400).json({
      status: 'FAILED',
      comment: result.error.issues[0].message
    });
    return;
  }
  next();
});

// GET Codeforces user data (with DB cache)
router.get('/user/:handle', async (req: Request, res: Response): Promise<void> => {
  const handle = req.params.handle as string;

  const rawCount = parseInt(req.query.count as string);
  const submissionCount = !isNaN(rawCount) ? Math.min(Math.max(rawCount, 1), 20000) : 10000;
  const force = req.query.force === 'true';

  try {
    const data = await getCodeforcesData(handle, submissionCount, force);
    res.json({ status: 'OK', result: data });
  } catch (error: any) {
    res.status(500).json({
      status: 'FAILED',
      comment: error.message || 'Server encountered an error processing Codeforces data'
    });
  }
});

// GET user tasks
router.get('/user/:handle/tasks', async (req: Request, res: Response): Promise<void> => {
  const handle = req.params.handle as string;
  const normHandle = handle.toLowerCase();

  try {
    const tasks = await prisma.coachTask.findMany({
      where: { userHandle: normHandle }
    });
    res.json({ status: 'OK', result: tasks });
  } catch (error: any) {
    res.status(500).json({ status: 'FAILED', comment: error.message });
  }
});

// POST toggle task completed status
router.post('/user/:handle/tasks/toggle', async (req: Request, res: Response): Promise<void> => {
  const handle = req.params.handle as string;
  const validated = toggleTaskSchema.safeParse(req.body);
  if (!validated.success) {
    res.status(400).json({ status: 'FAILED', comment: validated.error.issues[0].message });
    return;
  }
  const { taskId } = validated.data;

  try {
    const task = await prisma.coachTask.findUnique({ where: { id: taskId } });

    if (!task || task.userHandle !== handle.toLowerCase()) {
      res.status(404).json({ status: 'FAILED', comment: 'Task not found for this user' });
      return;
    }

    const updatedTask = await prisma.coachTask.update({
      where: { id: taskId },
      data: { completed: !task.completed }
    });

    res.json({ status: 'OK', result: updatedTask });
  } catch (error: any) {
    res.status(500).json({ status: 'FAILED', comment: error.message });
  }
});

// GET recommended problems
router.get('/user/:handle/problems/recommend', async (req: Request, res: Response): Promise<void> => {
  const handle = req.params.handle as string;
  const normHandle = handle.toLowerCase();

  try {
    const user = await prisma.user.findUnique({
      where: { handle: normHandle },
      include: { submissions: true }
    });

    if (!user) {
      res.status(404).json({ status: 'FAILED', comment: `User ${handle} not found in database` });
      return;
    }

    const currentRating = user.rating || 1200;

    const dbProblemCount = await prisma.cFProblem.count();
    if (dbProblemCount === 0) {
      console.log('[API] Problem cache is empty, triggering sync...');
      await syncCodeforcesProblems();
    }

    const solvedProblemKeys = new Set(
      user.submissions.filter(s => s.verdict === 'OK').map(s => `${s.contestId}-${s.problemIndex}`)
    );

    const tagStats: { [tag: string]: { ok: number; total: number } } = {};
    user.submissions.forEach(s => {
      const isOk = s.verdict === 'OK';
      s.problemTags.forEach(tag => {
        if (!tagStats[tag]) tagStats[tag] = { ok: 0, total: 0 };
        tagStats[tag].total += 1;
        if (isOk) tagStats[tag].ok += 1;
      });
    });

    const weakTagsList = Object.keys(tagStats)
      .map(tag => ({ tag, ratio: tagStats[tag].ok / tagStats[tag].total, total: tagStats[tag].total }))
      .filter(t => t.total >= 3 && t.ratio < 0.6)
      .sort((a, b) => a.ratio - b.ratio)
      .map(t => t.tag);

    const candidateProblems = await prisma.cFProblem.findMany({
      where: { rating: { gte: currentRating - 100, lte: currentRating + 250 } }
    });

    const recommendations = candidateProblems
      .filter((prob: CFProblem) => !solvedProblemKeys.has(`${prob.contestId}-${prob.index}`))
      .map((prob: CFProblem) => ({ ...prob, weakTagMatches: prob.tags.filter(t => weakTagsList.includes(t)).length }))
      .sort((a, b) => b.weakTagMatches - a.weakTagMatches)
      .slice(0, 10);

    res.json({ status: 'OK', result: recommendations });
  } catch (error: any) {
    res.status(500).json({ status: 'FAILED', comment: error.message });
  }
});

// POST regenerate user roadmap tasks
router.post('/user/:handle/tasks/regenerate', async (req: Request, res: Response): Promise<void> => {
  const handle = req.params.handle as string;

  try {
    const updatedTasks = await generatePersonalizedTasks(handle);
    res.json({ status: 'OK', result: updatedTasks });
  } catch (error: any) {
    res.status(500).json({ status: 'FAILED', comment: error.message });
  }
});

// POST send message to Gemini AI Coach
router.post('/user/:handle/ai-coach', async (req: Request, res: Response): Promise<void> => {
  const handle = req.params.handle as string;
  const validated = aiCoachSchema.safeParse(req.body);
  if (!validated.success) {
    res.status(400).json({ status: 'FAILED', comment: validated.error.issues[0].message });
    return;
  }
  const { message, history } = validated.data;

  try {
    const aiResponse = await askAICoach(handle, message, history || []);
    res.json({ status: 'OK', result: aiResponse });
  } catch (error: any) {
    res.status(500).json({ status: 'FAILED', comment: error.message });
  }
});

// POST link LeetCode handle
router.post('/user/:handle/leetcode/link', async (req: Request, res: Response): Promise<void> => {
  const handle = req.params.handle as string;
  const validated = linkLeetCodeSchema.safeParse(req.body);
  if (!validated.success) {
    res.status(400).json({ status: 'FAILED', comment: validated.error.issues[0].message });
    return;
  }
  const { leetcodeHandle } = validated.data;
  const normHandle = handle.toLowerCase();

  try {
    // Ensure user exists in DB (upsert so no prior load is required)
    await prisma.user.upsert({
      where: { handle: normHandle },
      update: {},
      create: { handle: normHandle }
    });

    console.log(`[LeetCode Link] Verifying handle "${leetcodeHandle}"...`);
    const stats = await fetchLeetCodeStats(leetcodeHandle);

    const updatedUser = await prisma.user.update({
      where: { handle: normHandle },
      data: {
        leetcodeHandle: leetcodeHandle.trim(),
        leetcodeEasy: stats.easy,
        leetcodeMedium: stats.medium,
        leetcodeHard: stats.hard,
        leetcodeRating: stats.rating,
        leetcodeContests: stats.contests
      }
    });

    res.json({
      status: 'OK',
      result: {
        leetcodeHandle: updatedUser.leetcodeHandle,
        leetcodeEasy: updatedUser.leetcodeEasy,
        leetcodeMedium: updatedUser.leetcodeMedium,
        leetcodeHard: updatedUser.leetcodeHard,
        leetcodeRating: updatedUser.leetcodeRating,
        leetcodeContests: updatedUser.leetcodeContests
      }
    });
  } catch (error: any) {
    res.status(500).json({ status: 'FAILED', comment: error.message });
  }
});

// POST sync LeetCode stats
router.post('/user/:handle/leetcode/sync', async (req: Request, res: Response): Promise<void> => {
  const handle = req.params.handle as string;
  const normHandle = handle.toLowerCase();

  try {
    const dbUser = await prisma.user.findUnique({ where: { handle: normHandle } });

    if (!dbUser || !dbUser.leetcodeHandle) {
      res.status(400).json({ status: 'FAILED', comment: 'No LeetCode handle linked for this user' });
      return;
    }

    console.log(`[LeetCode Sync] Syncing stats for "${dbUser.leetcodeHandle}"...`);
    const stats = await fetchLeetCodeStats(dbUser.leetcodeHandle);

    const updatedUser = await prisma.user.update({
      where: { handle: normHandle },
      data: {
        leetcodeEasy: stats.easy,
        leetcodeMedium: stats.medium,
        leetcodeHard: stats.hard,
        leetcodeRating: stats.rating,
        leetcodeContests: stats.contests
      }
    });

    res.json({
      status: 'OK',
      result: {
        leetcodeHandle: updatedUser.leetcodeHandle,
        leetcodeEasy: updatedUser.leetcodeEasy,
        leetcodeMedium: updatedUser.leetcodeMedium,
        leetcodeHard: updatedUser.leetcodeHard,
        leetcodeRating: updatedUser.leetcodeRating,
        leetcodeContests: updatedUser.leetcodeContests
      }
    });
  } catch (error: any) {
    res.status(500).json({ status: 'FAILED', comment: error.message });
  }
});

// POST unlink LeetCode handle
router.post('/user/:handle/leetcode/unlink', async (req: Request, res: Response): Promise<void> => {
  const handle = req.params.handle as string;
  const normHandle = handle.toLowerCase();

  try {
    await prisma.user.update({
      where: { handle: normHandle },
      data: {
        leetcodeHandle: null,
        leetcodeEasy: 0,
        leetcodeMedium: 0,
        leetcodeHard: 0,
        leetcodeRating: 0.0,
        leetcodeContests: 0
      }
    });

    res.json({ status: 'OK', result: { leetcodeHandle: null, leetcodeEasy: 0, leetcodeMedium: 0, leetcodeHard: 0 } });
  } catch (error: any) {
    res.status(500).json({ status: 'FAILED', comment: error.message });
  }
});

export default router;
