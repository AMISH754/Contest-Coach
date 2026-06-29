import axios from 'axios';

export interface LeetCodeStats {
  easy: number;
  medium: number;
  hard: number;
  rating: number;
  contests: number;
}

/**
 * Fetch LeetCode statistics (problems solved counts and contest rating)
 * using LeetCode's public GraphQL endpoint.
 */
export const fetchLeetCodeStats = async (username: string): Promise<LeetCodeStats> => {
  const normalizedUsername = username.trim();

  // If the username is a simulation handle, return mock data
  if (normalizedUsername.toLowerCase() === 'demo' || normalizedUsername.toLowerCase() === 'tourist_coach') {
    return {
      easy: 120,
      medium: 185,
      hard: 45,
      rating: 1782.5,
      contests: 18
    };
  }

  const query = `
    query userCombinedStats($username: String!) {
      matchedUser(username: $username) {
        submitStats {
          acSubmissionNum {
            difficulty
            count
          }
        }
      }
      userContestRanking(username: $username) {
        attendedContestsCount
        rating
      }
    }
  `;

  try {
    const response = await axios.post(
      'https://leetcode.com/graphql',
      {
        query,
        variables: { username: normalizedUsername },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        timeout: 8000,
      }
    );

    const matchedUser = response.data?.data?.matchedUser;
    if (!matchedUser) {
      throw new Error(`LeetCode user "${username}" not found.`);
    }

    const acSubmissions = matchedUser.submitStats?.acSubmissionNum || [];
    const easyCount = acSubmissions.find((s: any) => s.difficulty === 'Easy')?.count || 0;
    const mediumCount = acSubmissions.find((s: any) => s.difficulty === 'Medium')?.count || 0;
    const hardCount = acSubmissions.find((s: any) => s.difficulty === 'Hard')?.count || 0;

    const contestRanking = response.data?.data?.userContestRanking;
    const ratingVal = contestRanking?.rating ? Math.round(contestRanking.rating) : 0;
    const contestsCount = contestRanking?.attendedContestsCount || 0;

    return {
      easy: easyCount,
      medium: mediumCount,
      hard: hardCount,
      rating: ratingVal,
      contests: contestsCount
    };
  } catch (err: any) {
    console.error(`[LeetCode Fetch Error] Failed for ${username}:`, err.message);
    throw new Error(err.message || 'Error fetching LeetCode profile');
  }
};
