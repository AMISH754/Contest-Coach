import axios from 'axios';
import dotenv from 'dotenv';
import prisma from '../db';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const cacheTTL = parseInt(process.env.CACHE_TTL_SECONDS || '600', 10);

export interface CFUserInfo {
  handle: string;
  rating?: number;
  maxRating?: number;
  rank?: string;
  maxRank?: string;
  avatar?: string;
  titlePhoto?: string;
  organization?: string;
  country?: string;
  contribution?: number;
  friendOfCount?: number;
  leetcodeHandle?: string;
  leetcodeEasy?: number;
  leetcodeMedium?: number;
  leetcodeHard?: number;
  leetcodeRating?: number;
  leetcodeContests?: number;
}

export interface CFRatingChange {
  contestId: number;
  contestName: string;
  handle: string;
  rank: number;
  ratingUpdateTimeSeconds: number;
  oldRating: number;
  newRating: number;
}

export interface CFProblem {
  contestId?: number;
  index: string;
  name: string;
  type: string;
  points?: number;
  rating?: number;
  tags: string[];
}

export interface CFSubmission {
  id: number;
  contestId?: number;
  creationTimeSeconds: number;
  relativeTimeSeconds: number;
  problem: CFProblem;
  programmingLanguage: string;
  verdict?: string;
  timeConsumedMillis?: number;
  memoryConsumedBytes?: number;
}

// Generate realistic mock data for fallback/demo
export const getMockData = (handle: string) => {
  const seed = handle.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  // 1. Mock User Info
  const curRating = 1350 + (seed % 600);
  const maxRating = curRating + 120;
  
  const getRank = (r: number) => {
    if (r < 1200) return 'Newbie';
    if (r < 1400) return 'Pupil';
    if (r < 1600) return 'Specialist';
    if (r < 1900) return 'Expert';
    if (r < 2100) return 'Candidate Master';
    if (r < 2300) return 'Master';
    return 'Grandmaster';
  };

  const userInfo: CFUserInfo = {
    handle,
    rating: curRating,
    maxRating: maxRating,
    rank: getRank(curRating),
    maxRank: getRank(maxRating),
    avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${handle}`,
    titlePhoto: `https://api.dicebear.com/7.x/identicon/svg?seed=${handle}`,
    organization: "Global Competitive Programming Academy",
    country: "United States",
    contribution: seed % 50,
    friendOfCount: seed % 200,
  };

  // 2. Mock Rating History
  const ratingHistory: CFRatingChange[] = [];
  let rating = 1000;
  const startSec = 1704067200; // Jan 1 2024
  for (let i = 1; i <= 12; i++) {
    const change = -30 + (seed * i) % 150;
    const oldRating = rating;
    rating += change;
    ratingHistory.push({
      contestId: 1900 + i,
      contestName: `Codeforces Round #9${i} (Div. ${rating > 1600 ? 2 : 3})`,
      handle,
      rank: 200 + (seed * 7) % 800 - i * 15,
      ratingUpdateTimeSeconds: startSec + i * 30 * 24 * 3600,
      oldRating,
      newRating: rating,
    });
  }

  // 3. Mock Submissions
  const submissionTags = ['implementation', 'math', 'dp', 'greedy', 'sortings', 'graphs', 'binary search', 'trees', 'strings', 'data structures'];
  const submissions: CFSubmission[] = [];
  const startSubSec = startSec + 12 * 30 * 24 * 3600;
  
  for (let i = 0; i < 180; i++) {
    const isOk = (seed + i) % 10 < 6;
    const verdict = isOk ? 'OK' : ((seed + i) % 10 < 8 ? 'WRONG_ANSWER' : 'TIME_LIMIT_EXCEEDED');
    const tagIndex = (seed * i) % submissionTags.length;
    const tag2Index = (seed * i + 3) % submissionTags.length;
    const tags = [submissionTags[tagIndex]];
    if (i % 3 === 0) tags.push(submissionTags[tag2Index]);

    const probRating = 800 + Math.floor((curRating - 200 + ((seed + i) % 8) * 100) / 100) * 100;

    submissions.push({
      id: 9900000 + i,
      contestId: 1900 + (i % 12),
      creationTimeSeconds: startSubSec - i * 4 * 3600,
      relativeTimeSeconds: i * 120,
      problem: {
        contestId: 1900 + (i % 12),
        index: String.fromCharCode(65 + (i % 5)),
        name: `Problem ${String.fromCharCode(65 + (i % 5))}${i}`,
        type: 'PROGRAMMING',
        rating: probRating,
        tags,
      },
      programmingLanguage: 'C++20 (GCC 13-64)',
      verdict,
      timeConsumedMillis: isOk ? 15 + (seed * i) % 100 : 2000,
      memoryConsumedBytes: 1024 * (16 + (seed * i) % 64),
    });
  }

  return { userInfo, ratingHistory, submissions };
};

export const getCodeforcesData = async (handle: string) => {
  const normHandle = handle.trim().toLowerCase();
  
  // 1. Check if "demo" handle is requested
  if (normHandle === 'demo' || normHandle === 'tourist_coach') {
    return { ...getMockData('tourist_coach'), isSimulated: true };
  }

  // 2. Query PostgreSQL Database first
  try {
    const dbUser = await prisma.user.findUnique({
      where: { handle: normHandle },
      include: {
        submissions: true,
        ratingChanges: true
      }
    });

    if (dbUser) {
      const dbAgeSeconds = (Date.now() - dbUser.updatedAt.getTime()) / 1000;
      if (dbAgeSeconds < cacheTTL) {
        console.log(`[DB Hit] Serving cached profile from PostgreSQL for: ${handle}`);
        
        // Format submissions back to nest the problem object
        const formattedSubmissions = dbUser.submissions.map((s: any): CFSubmission => ({
          id: s.id,
          contestId: s.contestId || undefined,
          creationTimeSeconds: s.creationTimeSeconds,
          relativeTimeSeconds: s.relativeTimeSeconds,
          problem: {
            contestId: s.contestId || undefined,
            index: s.problemIndex,
            name: s.problemName,
            type: s.problemType,
            rating: s.problemRating || undefined,
            tags: s.problemTags
          },
          programmingLanguage: s.programmingLanguage,
          verdict: s.verdict || undefined,
          timeConsumedMillis: s.timeConsumedMillis || undefined,
          memoryConsumedBytes: s.memoryConsumedBytes || undefined
        }));

        // Format rating changes to match type
        const formattedRatingChanges = dbUser.ratingChanges.map((c: any): CFRatingChange => ({
          contestId: c.contestId,
          contestName: c.contestName,
          handle: c.handle,
          rank: c.rank,
          ratingUpdateTimeSeconds: c.ratingUpdateTimeSeconds,
          oldRating: c.oldRating,
          newRating: c.newRating
        }));

        return {
          userInfo: {
            handle: dbUser.handle,
            rating: dbUser.rating || undefined,
            maxRating: dbUser.maxRating || undefined,
            rank: dbUser.rank || undefined,
            maxRank: dbUser.maxRank || undefined,
            avatar: dbUser.avatar || undefined,
            titlePhoto: dbUser.titlePhoto || undefined,
            organization: dbUser.organization || undefined,
            country: dbUser.country || undefined,
            contribution: dbUser.contribution || undefined,
            friendOfCount: dbUser.friendOfCount || undefined,
            leetcodeHandle: dbUser.leetcodeHandle || undefined,
            leetcodeEasy: dbUser.leetcodeEasy,
            leetcodeMedium: dbUser.leetcodeMedium,
            leetcodeHard: dbUser.leetcodeHard,
            leetcodeRating: dbUser.leetcodeRating,
            leetcodeContests: dbUser.leetcodeContests,
          },
          ratingHistory: formattedRatingChanges,
          submissions: formattedSubmissions,
          isSimulated: false
        };
      }
      console.log(`[DB Stale] PostgreSQL data is ${Math.round(dbAgeSeconds)}s old. Re-fetching for: ${handle}`);
    }
  } catch (err) {
    console.warn(`[DB Error] Failed to read from database for ${handle}. Querying Codeforces API directly. Error:`, err);
  }

  console.log(`[Cache Miss] Fetching live data for: ${handle}`);

  try {
    const infoUrl = `https://codeforces.com/api/user.info?handles=${handle}`;
    const ratingUrl = `https://codeforces.com/api/user.rating?handle=${handle}`;
    const statusUrl = `https://codeforces.com/api/user.status?handle=${handle}&from=1&count=1000`;

    const [infoRes, ratingRes, statusRes] = await Promise.all([
      axios.get(infoUrl, { timeout: 8000 }).then(r => r.data),
      axios.get(ratingUrl, { timeout: 8000 }).then(r => r.data).catch(() => ({ status: 'FAILED', result: [] })),
      axios.get(statusUrl, { timeout: 8000 }).then(r => r.data).catch(() => ({ status: 'FAILED', result: [] }))
    ]);

    if (infoRes.status !== 'OK' || !infoRes.result || infoRes.result.length === 0) {
      throw new Error(infoRes.comment || 'Failed to fetch user info from Codeforces API');
    }

    const first = infoRes.result[0];
    const userInfo: CFUserInfo = {
      handle: first.handle,
      rating: first.rating,
      maxRating: first.maxRating,
      rank: first.rank,
      maxRank: first.maxRank,
      avatar: first.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${first.handle}`,
      titlePhoto: first.titlePhoto,
      organization: first.organization,
      country: first.country,
      contribution: first.contribution,
      friendOfCount: first.friendOfCount,
    };

    const ratingHistory: CFRatingChange[] = ratingRes.status === 'OK' ? ratingRes.result : [];
    const submissions: CFSubmission[] = statusRes.status === 'OK' ? statusRes.result : [];

    let dbUser: any = null;
    // Save/Sync to PostgreSQL Database in background
    try {
      dbUser = await prisma.user.upsert({
        where: { handle: userInfo.handle.toLowerCase() },
        update: {
          rating: userInfo.rating,
          maxRating: userInfo.maxRating,
          rank: userInfo.rank,
          maxRank: userInfo.maxRank,
          avatar: userInfo.avatar,
          titlePhoto: userInfo.titlePhoto,
          organization: userInfo.organization,
          country: userInfo.country,
          contribution: userInfo.contribution,
          friendOfCount: userInfo.friendOfCount,
        },
        create: {
          handle: userInfo.handle.toLowerCase(),
          rating: userInfo.rating,
          maxRating: userInfo.maxRating,
          rank: userInfo.rank,
          maxRank: userInfo.maxRank,
          avatar: userInfo.avatar,
          titlePhoto: userInfo.titlePhoto,
          organization: userInfo.organization,
          country: userInfo.country,
          contribution: userInfo.contribution,
          friendOfCount: userInfo.friendOfCount,
        }
      });

      // Save submissions in bulk (ignore duplicates)
      if (submissions.length > 0) {
        const subData = submissions.map(s => ({
          id: s.id,
          contestId: s.contestId || null,
          creationTimeSeconds: s.creationTimeSeconds,
          relativeTimeSeconds: s.relativeTimeSeconds,
          problemIndex: s.problem.index,
          problemName: s.problem.name,
          problemType: s.problem.type,
          problemRating: s.problem.rating || null,
          problemTags: s.problem.tags,
          programmingLanguage: s.programmingLanguage,
          verdict: s.verdict || null,
          timeConsumedMillis: s.timeConsumedMillis || null,
          memoryConsumedBytes: s.memoryConsumedBytes || null,
          userHandle: dbUser.handle
        }));

        await prisma.cFSubmission.createMany({
          data: subData,
          skipDuplicates: true
        });
      }

      // Save rating history in bulk
      if (ratingHistory.length > 0) {
        const ratingData = ratingHistory.map(c => ({
          contestId: c.contestId,
          contestName: c.contestName,
          handle: dbUser.handle,
          rank: c.rank,
          ratingUpdateTimeSeconds: c.ratingUpdateTimeSeconds,
          oldRating: c.oldRating,
          newRating: c.newRating
        }));

        await prisma.cFRatingChange.createMany({
          data: ratingData,
          skipDuplicates: true
        });
      }

      // Initialize dynamic practice coach tasks if user has none
      const taskCount = await prisma.coachTask.count({ where: { userHandle: dbUser.handle } });
      if (taskCount === 0) {
        try {
          await generatePersonalizedTasks(dbUser.handle);
        } catch (taskErr) {
          console.warn('[Dynamic Task Init Error] Failed to generate dynamic tasks:', taskErr);
        }
      }

      console.log(`[DB Sync] Synchronized database records for: ${handle}`);
    } catch (dbErr) {
      console.warn(`[DB Sync Error] Failed to sync Codeforces data to PostgreSQL:`, dbErr);
    }

    return {
      userInfo: {
        ...userInfo,
        leetcodeHandle: dbUser?.leetcodeHandle || undefined,
        leetcodeEasy: dbUser?.leetcodeEasy || 0,
        leetcodeMedium: dbUser?.leetcodeMedium || 0,
        leetcodeHard: dbUser?.leetcodeHard || 0,
        leetcodeRating: dbUser?.leetcodeRating || 0,
        leetcodeContests: dbUser?.leetcodeContests || 0,
      },
      ratingHistory,
      submissions,
      isSimulated: false
    };
  } catch (error: any) {
    console.warn(`[API Fallback] Codeforces API failed for ${handle}, serving simulated data. Error:`, error.message);
    return { ...getMockData(handle), isSimulated: true };
  }
};

// 1. Sync Codeforces Problemset to DB
export const syncCodeforcesProblems = async () => {
  console.log('[Sync Problems] Fetching from Codeforces...');
  try {
    const res = await axios.get('https://codeforces.com/api/problemset.problems', { timeout: 25000 });
    if (res.data.status !== 'OK' || !res.data.result || !res.data.result.problems) {
      throw new Error('Invalid response structure from Codeforces API');
    }
    const problems = res.data.result.problems;
    const filteredProblems = problems
      .filter((p: any) => p.contestId !== undefined && p.index !== undefined)
      .map((p: any) => ({
        id: `${p.contestId}-${p.index}`,
        contestId: p.contestId,
        index: p.index,
        name: p.name,
        type: p.type,
        rating: p.rating || null,
        tags: p.tags || []
      }));
    
    console.log(`[Sync Problems] Saving ${filteredProblems.length} problems to database...`);
    const batchSize = 1000;
    for (let i = 0; i < filteredProblems.length; i += batchSize) {
      const batch = filteredProblems.slice(i, i + batchSize);
      await prisma.cFProblem.createMany({
        data: batch,
        skipDuplicates: true
      });
    }
    console.log(`[Sync Problems] DB sync completed!`);
    return { success: true, count: filteredProblems.length };
  } catch (err: any) {
    console.error('[Sync Problems Error] Failed to sync Codeforces problems:', err.message);
    throw err;
  }
};

// 2. Generate Customized Weekly CP Checklist
export const generatePersonalizedTasks = async (handle: string) => {
  const normHandle = handle.toLowerCase();
  
  const dbUser = await prisma.user.findUnique({
    where: { handle: normHandle },
    include: { submissions: true }
  });

  if (!dbUser) {
    throw new Error(`User ${handle} not found in database`);
  }

  const currentRating = dbUser.rating || 1200;

  // Identify weak areas
  const tagStats: { [tag: string]: { ok: number; total: number } } = {};
  dbUser.submissions.forEach(s => {
    const isOk = s.verdict === 'OK';
    s.problemTags.forEach(tag => {
      if (!tagStats[tag]) tagStats[tag] = { ok: 0, total: 0 };
      tagStats[tag].total += 1;
      if (isOk) tagStats[tag].ok += 1;
    });
  });

  const weakTopics = Object.keys(tagStats)
    .map(tag => ({
      tag,
      ratio: tagStats[tag].ok / tagStats[tag].total,
      total: tagStats[tag].total
    }))
    .filter(t => t.total >= 3 && t.ratio < 0.6)
    .sort((a, b) => a.ratio - b.ratio);

  const weakTopic1 = weakTopics[0]?.tag || 'greedy';
  const weakTopic2 = weakTopics[1]?.tag || 'dynamic programming';

  // Clear existing tasks
  await prisma.coachTask.deleteMany({
    where: { userHandle: normHandle }
  });

  const startRating = currentRating;
  const tasksToCreate = [
    {
      title: `Master ${weakTopic1.charAt(0).toUpperCase() + weakTopic1.slice(1)} Problems`,
      category: weakTopic1.charAt(0).toUpperCase() + weakTopic1.slice(1),
      difficulty: startRating + 100,
      completed: false,
      desc: `Solve 2 problems of rating ${startRating + 100} to ${startRating + 200} tagged with "${weakTopic1}". Prove correctness on paper before writing code.`,
      userHandle: normHandle
    },
    {
      title: `Target Weak Topic: ${weakTopic2.charAt(0).toUpperCase() + weakTopic2.slice(1)}`,
      category: weakTopic2.charAt(0).toUpperCase() + weakTopic2.slice(1),
      difficulty: startRating + 50,
      completed: false,
      desc: `Solve 2 problems of rating ${startRating} to ${startRating + 100} featuring the "${weakTopic2}" tag. Focus on understanding states & transitions.`,
      userHandle: normHandle
    },
    {
      title: 'Post-Contest Upsolving',
      category: 'Upsolving',
      difficulty: startRating + 150,
      completed: false,
      desc: 'Find the first problem you failed to solve in your last round. Analyze why it failed (TLE, WA, logic bug) and get it Accepted within 48 hours.',
      userHandle: normHandle
    },
    {
      title: 'Speed & Accuracy Sprint',
      category: 'Implementation',
      difficulty: Math.max(800, startRating - 200),
      completed: false,
      desc: `Solve 3 easy problems of rating ${Math.max(800, startRating - 200)} with exactly 0 wrong submissions. Target speed and clean code templates.`,
      userHandle: normHandle
    }
  ];

  await prisma.coachTask.createMany({
    data: tasksToCreate
  });

  return prisma.coachTask.findMany({
    where: { userHandle: normHandle }
  });
};

// 3. Query Gemini for AI Advice
export const askAICoach = async (handle: string, userMessage: string, chatHistory: { role: 'user' | 'model', parts: string }[] = []) => {
  const normHandle = handle.toLowerCase();

  const dbUser = await prisma.user.findUnique({
    where: { handle: normHandle },
    include: {
      submissions: { take: 100, orderBy: { creationTimeSeconds: 'desc' } },
      ratingChanges: { orderBy: { ratingUpdateTimeSeconds: 'asc' } }
    }
  });

  if (!dbUser) {
    throw new Error(`User ${handle} not found in database`);
  }

  const currentRating = dbUser.rating || 1200;
  const maxRating = dbUser.maxRating || 1200;
  const rank = dbUser.rank || 'Pupil';
  const totalSubmissions = dbUser.submissions.length;
  const okSubmissions = dbUser.submissions.filter(s => s.verdict === 'OK');
  const successRate = totalSubmissions > 0 ? ((okSubmissions.length / totalSubmissions) * 100).toFixed(1) : '0';

  const tagStats: { [tag: string]: { ok: number; total: number } } = {};
  dbUser.submissions.forEach(s => {
    const isOk = s.verdict === 'OK';
    s.problemTags.forEach(tag => {
      if (!tagStats[tag]) tagStats[tag] = { ok: 0, total: 0 };
      tagStats[tag].total += 1;
      if (isOk) tagStats[tag].ok += 1;
    });
  });

  const weakTopics = Object.keys(tagStats)
    .map(tag => ({
      tag,
      ratio: tagStats[tag].ok / tagStats[tag].total,
      total: tagStats[tag].total
    }))
    .filter(t => t.total >= 3 && t.ratio < 0.6)
    .sort((a, b) => a.ratio - b.ratio)
    .slice(0, 3)
    .map(t => `${t.tag} (accuracy: ${(t.ratio * 100).toFixed(0)}%, attempts: ${t.total})`)
    .join(', ');

  const ratingChangeStr = dbUser.ratingChanges
    .slice(-5)
    .map(c => `${c.contestName}: rank ${c.rank}, rating change: ${c.newRating - c.oldRating} (current rating: ${c.newRating})`)
    .join('\n');

  const leetcodeStatsStr = dbUser.leetcodeHandle
    ? `- **LeetCode Username**: ${dbUser.leetcodeHandle}\n- **LeetCode Problems Solved**: ${dbUser.leetcodeEasy} Easy, ${dbUser.leetcodeMedium} Medium, ${dbUser.leetcodeHard} Hard (total: ${dbUser.leetcodeEasy + dbUser.leetcodeMedium + dbUser.leetcodeHard})\n- **LeetCode Contest Rating**: ${dbUser.leetcodeRating > 0 ? Math.round(dbUser.leetcodeRating) : 'N/A'}\n- **LeetCode Contests Attended**: ${dbUser.leetcodeContests}`
    : `- **LeetCode**: No LeetCode account linked.`;

  const systemPrompt = `You are the Contest Coach AI, an expert agentic AI coach for competitive programmers practicing on Codeforces and LeetCode.
Your goal is to provide highly actionable, context-aware competitive programming advice.

Here is the profile context for the user you are coaching:
- **Handle**: ${dbUser.handle}
- **Current Rating**: ${currentRating}
- **Peak Rating**: ${maxRating}
- **Current Rank**: ${rank}
- **Recent Submissions Success Rate**: ${successRate}% (total parsed: ${totalSubmissions})
- **Weak Topics (Identified gaps)**: ${weakTopics || 'None identified yet (need more attempts)'}
${leetcodeStatsStr}
- **Recent Contest Performance History**:
${ratingChangeStr || 'No recent contest history found.'}

Use this profile context to give personalized answers. If they ask for a plan, reference their weak topics or LeetCode counts. If they ask about their performance, reference their actual contest trajectory.
Structure your answers in markdown. Keep advice practical (e.g. solve problems rated rating+100, analyze time constraints, prove greedy strategies before coding, learn specific algorithms).
Be encouraging but realistic.`;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not defined in the backend environment variables');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: systemPrompt
  });

  const contents = chatHistory.map(h => ({
    role: h.role,
    parts: [{ text: h.parts }]
  }));

  const chat = model.startChat({
    history: contents
  });

  const result = await chat.sendMessage(userMessage);
  const response = await result.response;
  return response.text();
};

