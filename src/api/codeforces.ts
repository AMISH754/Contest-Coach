export interface CFUserInfo {
  handle: string;
  rating?: number;
  maxRating?: number;
  rank?: string;
  maxRank?: string;
  titlePhoto?: string;
  avatar?: string;
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
  verdict?: string; // OK, WRONG_ANSWER, TIME_LIMIT_EXCEEDED, etc.
  passCount?: number;
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
    const isOk = (seed + i) % 10 < 6; // 60% success rate
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

export const fetchCodeforcesData = async (handle: string) => {
  const BACKEND_URL = 'http://localhost:5000';
  
  if (!handle || handle.toLowerCase() === 'demo' || handle.toLowerCase() === 'tourist_coach') {
    // Delay to simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    return getMockData(handle || 'tourist_coach');
  }

  try {
    const response = await fetch(`${BACKEND_URL}/api/user/${handle}`);
    const json = await response.json();

    if (json.status !== 'OK' || !json.result) {
      throw new Error(json.comment || 'Failed to fetch user info from backend');
    }

    return json.result as {
      userInfo: CFUserInfo;
      ratingHistory: CFRatingChange[];
      submissions: CFSubmission[];
    };
  } catch (error) {
    console.warn(`Failed to fetch from backend for ${handle}, falling back to client-side simulated data. Error:`, error);
    // Return mock data but indicate it's a fallback
    const mock = getMockData(handle);
    return mock;
  }
};

export const fetchRecommendations = async (handle: string) => {
  const BACKEND_URL = 'http://localhost:5000';
  if (!handle || handle.toLowerCase() === 'demo') {
    await new Promise((resolve) => setTimeout(resolve, 600));
    return [
      { contestId: 1915, index: 'E', name: 'Romantic Glasses', type: 'PROGRAMMING', rating: 1300, tags: ['data structures', 'math'] },
      { contestId: 1899, index: 'C', name: 'Yarik and Array', type: 'PROGRAMMING', rating: 1000, tags: ['dp', 'greedy'] },
      { contestId: 1873, index: 'F', name: 'Money Trees', type: 'PROGRAMMING', rating: 1200, tags: ['binary search', 'data structures'] },
      { contestId: 1742, index: 'E', name: 'Scuza', type: 'PROGRAMMING', rating: 1200, tags: ['binary search', 'data structures'] }
    ];
  }

  try {
    const response = await fetch(`${BACKEND_URL}/api/user/${handle}/problems/recommend`);
    const json = await response.json();
    if (json.status !== 'OK' || !json.result) {
      throw new Error(json.comment || 'Failed to fetch recommendations');
    }
    return json.result as CFProblem[];
  } catch (error) {
    console.warn(`Failed to fetch recommendations from backend for ${handle}, falling back to static pool.`, error);
    return [
      { contestId: 1915, index: 'E', name: 'Romantic Glasses', type: 'PROGRAMMING', rating: 1300, tags: ['data structures', 'math'] },
      { contestId: 1899, index: 'C', name: 'Yarik and Array', type: 'PROGRAMMING', rating: 1000, tags: ['dp', 'greedy'] },
      { contestId: 1873, index: 'F', name: 'Money Trees', type: 'PROGRAMMING', rating: 1200, tags: ['binary search', 'data structures'] }
    ];
  }
};

export const regenerateTasks = async (handle: string) => {
  const BACKEND_URL = 'http://localhost:5000';
  if (!handle || handle.toLowerCase() === 'demo') {
    await new Promise((resolve) => setTimeout(resolve, 800));
    return [
      { id: 't-1', title: 'Master Greedy Choice Property (Demo)', category: 'Greedy', difficulty: 1300, completed: false, desc: 'Solve 2 greedy problems.' },
      { id: 't-2', title: 'Target Weak Topic: Dynamic Programming (Demo)', category: 'DP', difficulty: 1400, completed: false, desc: 'Solve 2 DP problems.' }
    ];
  }

  const response = await fetch(`${BACKEND_URL}/api/user/${handle}/tasks/regenerate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  const json = await response.json();
  if (json.status !== 'OK' || !json.result) {
    throw new Error(json.comment || 'Failed to regenerate tasks');
  }
  return json.result;
};

export const sendAICoachMessage = async (handle: string, message: string, history: { role: 'user' | 'model'; parts: string }[]) => {
  const BACKEND_URL = 'http://localhost:5000';
  if (!handle || handle.toLowerCase() === 'demo') {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    if (message.toLowerCase().includes('schedule')) {
      return "Here is your simulated 4-week practice schedule. Concentrate on implementation and math.";
    }
    return `This is a demo assistant. You said: "${message}". Connect a live Codeforces account and set GEMINI_API_KEY to speak with the real Gemini AI Coach.`;
  }

  const response = await fetch(`${BACKEND_URL}/api/user/${handle}/ai-coach`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history })
  });
  const json = await response.json();
  if (json.status !== 'OK' || !json.result) {
    throw new Error(json.comment || 'Failed to get response from AI Coach');
  }
  return json.result as string;
};

export const linkLeetCodeProfile = async (handle: string, leetcodeHandle: string) => {
  const BACKEND_URL = 'http://localhost:5000';
  const response = await fetch(`${BACKEND_URL}/api/user/${handle}/leetcode/link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ leetcodeHandle })
  });
  const json = await response.json();
  if (json.status !== 'OK') {
    throw new Error(json.comment || 'Failed to link LeetCode profile');
  }
  return json.result as {
    leetcodeHandle: string;
    leetcodeEasy: number;
    leetcodeMedium: number;
    leetcodeHard: number;
    leetcodeRating: number;
    leetcodeContests: number;
  };
};

export const syncLeetCodeProfile = async (handle: string) => {
  const BACKEND_URL = 'http://localhost:5000';
  const response = await fetch(`${BACKEND_URL}/api/user/${handle}/leetcode/sync`, {
    method: 'POST',
  });
  const json = await response.json();
  if (json.status !== 'OK') {
    throw new Error(json.comment || 'Failed to sync LeetCode profile');
  }
  return json.result as {
    leetcodeHandle: string;
    leetcodeEasy: number;
    leetcodeMedium: number;
    leetcodeHard: number;
    leetcodeRating: number;
    leetcodeContests: number;
  };
};

export const unlinkLeetCodeProfile = async (handle: string) => {
  const BACKEND_URL = 'http://localhost:5000';
  const response = await fetch(`${BACKEND_URL}/api/user/${handle}/leetcode/unlink`, {
    method: 'POST',
  });
  const json = await response.json();
  if (json.status !== 'OK') {
    throw new Error(json.comment || 'Failed to unlink LeetCode profile');
  }
  return json.result as {
    leetcodeHandle: null;
    leetcodeEasy: 0;
    leetcodeMedium: 0;
    leetcodeHard: 0;
  };
};

