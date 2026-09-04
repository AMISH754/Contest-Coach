import { z } from 'zod';

export const handleSchema = z.string()
  .min(1, 'Handle is required')
  .max(50, 'Handle must be under 50 characters')
  .regex(/^[a-zA-Z0-9_\-.]{1,50}$/, 'Invalid handle format. Use 1-50 alphanumeric characters, underscores, hyphens, or dots.');



export const toggleTaskSchema = z.object({
  taskId: z.string().min(1, 'taskId is required')
});

export const aiCoachSchema = z.object({
  message: z.string().min(1, 'message is required'),
  history: z.array(
    z.object({
      role: z.enum(['user', 'model']),
      parts: z.array(
        z.object({
          text: z.string()
        })
      )
    })
  ).optional()
});

export const linkLeetCodeSchema = z.object({
  leetcodeHandle: z.string().regex(/^[a-zA-Z0-9_\-.]{1,50}$/, 'Invalid LeetCode handle format. Use 1-50 alphanumeric characters, underscores, hyphens, or dots.')
});
