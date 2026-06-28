import { Router, Request, Response } from 'express';
import { getCodeforcesData, syncCodeforcesProblems, generatePersonalizedTasks, askAICoach } from '../services/codeforcesService';
import prisma from '../db';
import { CFProblem } from '@prisma/client';

const router = Router();

router.get('/user/:handle', async (req: Request, res: Response): Promise<void> => {
  const { handle } = req.params;

  if (typeof handle !== 'string') {
    res.status(400).json({ status: 'FAILED', comment: 'Handle parameter is required and must be a string' });
    return;
  }

  try {
    const data = await getCodeforcesData(handle);
    res.json({
      status: 'OK',
      result: data
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'FAILED',
      comment: error.message || 'Server encountered an error processing Codeforces data'
    });
  }
});

// GET user tasks
router.get('/user/:handle/tasks', async (req: Request, res: Response): Promise<void> => {
  const { handle } = req.params;

  if (typeof handle !== 'string') {
    res.status(400).json({ status: 'FAILED', comment: 'Handle parameter must be a string' });
    return;
  }

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
  const { handle } = req.params;
  const { taskId } = req.body;

  if (typeof handle !== 'string') {
    res.status(400).json({ status: 'FAILED', comment: 'Handle parameter must be a string' });
    return;
  }

  if (!taskId) {
    res.status(400).json({ status: 'FAILED', comment: 'taskId is required in request body' });
    return;
  }

  try {
    const task = await prisma.coachTask.findUnique({
      where: { id: taskId }
    });

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

// GET user recommended problems
router.get('/user/:handle/problems/recommend', async (req: Request, res: Response): Promise<void> => {
  const { handle } = req.params;

  if (typeof handle !== 'string') {
    res.status(400).json({ status: 'FAILED', comment: 'Handle parameter must be a string' });
    return;
  }

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

    // Check if problems cache is empty
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
      .map(tag => ({
        tag,
        ratio: tagStats[tag].ok / tagStats[tag].total,
        total: tagStats[tag].total
      }))
      .filter(t => t.total >= 3 && t.ratio < 0.6)
      .sort((a, b) => a.ratio - b.ratio)
      .map(t => t.tag);

    const minRating = currentRating - 100;
    const maxRating = currentRating + 250;

    const candidateProblems = await prisma.cFProblem.findMany({
      where: {
        rating: {
          gte: minRating,
          lte: maxRating
        }
      }
    });

    const recommendations = candidateProblems
      .filter((prob: CFProblem) => !solvedProblemKeys.has(`${prob.contestId}-${prob.index}`))
      .map((prob: CFProblem) => {
        const weakTagMatches = prob.tags.filter(t => weakTagsList.includes(t)).length;
        return { ...prob, weakTagMatches };
      })
      .sort((a, b) => b.weakTagMatches - a.weakTagMatches)
      .slice(0, 10);

    res.json({ status: 'OK', result: recommendations });
  } catch (error: any) {
    res.status(500).json({ status: 'FAILED', comment: error.message });
  }
});

// POST regenerate user roadmap tasks
router.post('/user/:handle/tasks/regenerate', async (req: Request, res: Response): Promise<void> => {
  const { handle } = req.params;

  if (typeof handle !== 'string') {
    res.status(400).json({ status: 'FAILED', comment: 'Handle parameter must be a string' });
    return;
  }

  try {
    const updatedTasks = await generatePersonalizedTasks(handle);
    res.json({ status: 'OK', result: updatedTasks });
  } catch (error: any) {
    res.status(500).json({ status: 'FAILED', comment: error.message });
  }
});

// POST send message to Gemini AI Coach
router.post('/user/:handle/ai-coach', async (req: Request, res: Response): Promise<void> => {
  const { handle } = req.params;
  const { message, history } = req.body;

  if (typeof handle !== 'string') {
    res.status(400).json({ status: 'FAILED', comment: 'Handle parameter must be a string' });
    return;
  }

  if (!message || typeof message !== 'string') {
    res.status(400).json({ status: 'FAILED', comment: 'message is required and must be a string' });
    return;
  }

  try {
    const aiResponse = await askAICoach(handle, message, history || []);
    res.json({ status: 'OK', result: aiResponse });
  } catch (error: any) {
    res.status(500).json({ status: 'FAILED', comment: error.message });
  }
});

export default router;
