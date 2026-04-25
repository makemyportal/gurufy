// Gamification utility constants and functions — no React imports
// Separated from GamificationContext to support Vite Fast Refresh

// Level thresholds
export const LEVELS = [
  { name: 'Beginner', min: 0, emoji: '🌱' },
  { name: 'Rising Star', min: 100, emoji: '⭐' },
  { name: 'Contributor', min: 300, emoji: '🔥' },
  { name: 'Expert', min: 600, emoji: '💎' },
  { name: 'Guru', min: 1000, emoji: '👑' },
  { name: 'Legend', min: 2000, emoji: '🏆' },
]

// Badge definitions
export const BADGE_DEFS = {
  first_post: { name: 'First Post', emoji: '📝', desc: 'Created your first post' },
  ten_posts: { name: '10 Posts', emoji: '✍️', desc: 'Created 10 posts' },
  first_like: { name: 'First Like', emoji: '❤️', desc: 'Received your first like' },
  hundred_likes: { name: '100 Likes', emoji: '💯', desc: 'Received 100 likes' },
  first_resource: { name: 'Contributor', emoji: '📚', desc: 'Shared your first resource' },
  ai_user: { name: 'AI Explorer', emoji: '🤖', desc: 'Used AI tools for the first time' },
  streak_7: { name: 'Week Warrior', emoji: '🔥', desc: '7-day login streak' },
  streak_30: { name: 'Monthly Master', emoji: '💪', desc: '30-day login streak' },
  social_butterfly: { name: 'Social Butterfly', emoji: '🦋', desc: 'Got 10 followers' },
  connector: { name: 'Connector', emoji: '🤝', desc: 'Following 10 people' },
  commenter: { name: 'Commenter', emoji: '💬', desc: 'Left 20 comments' },
  top_contributor: { name: 'Top Contributor', emoji: '🌟', desc: 'Consistently provides high-quality content' },
  subject_expert: { name: 'Subject Expert', emoji: '🔬', desc: 'Recognized expert in their subject' },
  verified_educator: { name: 'Verified', emoji: '✅', desc: 'Verified School Teacher' },
}

// Default XP/Coin values (overridden by Firestore platformSettings.coinConfig)
export const DEFAULT_XP_VALUES = {
  daily_login: 50,
  create_post: 10,
  receive_like: 2,
  leave_comment: 3,
  receive_comment: 2,
  share_resource: 25,
  use_ai_tool: 5,
  follow_someone: 2,
  get_followed: 3,
}

// This will be updated dynamically by GamificationContext
export let XP_VALUES = { ...DEFAULT_XP_VALUES }

export function getLevel(xp) {
  let current = LEVELS[0]
  for (const level of LEVELS) {
    if (xp >= level.min) current = level
    else break
  }
  return current
}

export function getNextLevel(xp) {
  for (const level of LEVELS) {
    if (xp < level.min) return level
  }
  return null
}

export function getLevelProgress(xp) {
  const current = getLevel(xp)
  const next = getNextLevel(xp)
  if (!next) return 100
  const range = next.min - current.min
  const progress = xp - current.min
  return Math.min(Math.round((progress / range) * 100), 100)
}
