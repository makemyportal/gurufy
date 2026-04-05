/**
 * Live Feed Service — Fetches real-time education news from free RSS/API sources
 * Uses rss2json.com as a CORS-friendly RSS proxy (free tier: no key needed)
 * Falls back to hardcoded autoFeedData if APIs fail
 */

import { ALL_AUTO_FEED, getAutoFeedItems, getItemsByCategory, getTickerItems } from './autoFeedData'

// ─── RSS Feed Sources ───
const RSS_SOURCES = {
  news: [
    {
      url: 'https://news.google.com/rss/search?q=education+india+school+teacher&hl=en-IN&gl=IN&ceid=IN:en',
      name: 'Google News',
      category: 'news',
    },
    {
      url: 'https://news.google.com/rss/search?q=CBSE+NCERT+NEP+education+policy&hl=en-IN&gl=IN&ceid=IN:en',
      name: 'Education Policy',
      category: 'news',
    },
  ],
  job: [
    {
      url: 'https://news.google.com/rss/search?q=teacher+recruitment+vacancy+india+2026&hl=en-IN&gl=IN&ceid=IN:en',
      name: 'Teacher Jobs',
      category: 'job',
    },
    {
      url: 'https://news.google.com/rss/search?q=sarkari+naukri+teacher+TGT+PGT&hl=en-IN&gl=IN&ceid=IN:en',
      name: 'Sarkari Naukri',
      category: 'job',
    },
  ],
  exam: [
    {
      url: 'https://news.google.com/rss/search?q=CTET+UGC+NET+UPTET+exam+result+2026&hl=en-IN&gl=IN&ceid=IN:en',
      name: 'Exam Updates',
      category: 'exam',
    },
  ],
  scheme: [
    {
      url: 'https://news.google.com/rss/search?q=government+scheme+education+teacher+india&hl=en-IN&gl=IN&ceid=IN:en',
      name: 'Govt Schemes',
      category: 'scheme',
    },
  ],
}

// ─── Cache Configuration ───
const CACHE_KEY = 'ldms_live_feed_cache'
const CACHE_DURATION = 15 * 60 * 1000 // 15 minutes

// ─── Category Styling Maps ───
const CATEGORY_STYLES = {
  news: {
    tag: 'Education News',
    tagColor: 'from-blue-500 to-indigo-600',
    icons: ['📰', '🏛️', '📚', '💡', '🎓', '🌐'],
  },
  job: {
    tag: 'Naukri Alert',
    tagColor: 'from-emerald-500 to-green-600',
    icons: ['💼', '📋', '🏫', '📝', '🎒', '🖥️'],
  },
  exam: {
    tag: 'Exam Update',
    tagColor: 'from-rose-500 to-pink-600',
    icons: ['✏️', '📝', '🎉', '📖', '🏆', '📊'],
  },
  scheme: {
    tag: 'Govt Scheme',
    tagColor: 'from-amber-500 to-orange-600',
    icons: ['🇮🇳', '📱', '🏆', '💰', '🎯', '🏗️'],
  },
}

// ─── Utility: Time ago from date string ───
function getTimeAgo(dateStr) {
  try {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  } catch {
    return 'Recently'
  }
}

// ─── Utility: Clean HTML from text ───
function stripHtml(html) {
  if (!html) return ''
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return tmp.textContent || tmp.innerText || ''
}

// ─── Utility: Extract source domain ───
function extractSource(url) {
  try {
    const hostname = new URL(url).hostname.replace('www.', '')
    // Map known domains to clean names
    const sourceMap = {
      'timesofindia.indiatimes.com': 'Times of India',
      'ndtv.com': 'NDTV',
      'thehindu.com': 'The Hindu',
      'indianexpress.com': 'Indian Express',
      'hindustantimes.com': 'Hindustan Times',
      'livemint.com': 'Mint',
      'news18.com': 'News18',
      'aajtak.in': 'Aaj Tak',
      'amarujala.com': 'Amar Ujala',
      'dainikbhaskar.com': 'Dainik Bhaskar',
      'jagran.com': 'Dainik Jagran',
      'zeenews.india.com': 'Zee News',
      'economictimes.indiatimes.com': 'Economic Times',
      'business-standard.com': 'Business Standard',
      'telegraphindia.com': 'The Telegraph',
      'deccanherald.com': 'Deccan Herald',
      'scroll.in': 'Scroll',
      'thewire.in': 'The Wire',
      'firstpost.com': 'Firstpost',
      'moneycontrol.com': 'Moneycontrol',
      'jagranjosh.com': 'Jagran Josh',
      'shiksha.com': 'Shiksha',
      'careers360.com': 'Careers360',
      'education.gov.in': 'Ministry of Education',
      'ugc.gov.in': 'UGC',
      'cbse.gov.in': 'CBSE',
      'ncert.nic.in': 'NCERT',
    }
    return sourceMap[hostname] || hostname.split('.')[0].charAt(0).toUpperCase() + hostname.split('.')[0].slice(1)
  } catch {
    return 'News Source'
  }
}

// ─── Generate realistic engagement numbers ───
function generateEngagement() {
  const likes = Math.floor(Math.random() * 4000) + 200
  const comments = Math.floor(Math.random() * 300) + 20
  return {
    likes: likes >= 1000 ? `${(likes / 1000).toFixed(1)}K` : likes.toString(),
    comments: comments.toString(),
  }
}

// ─── Parse RSS via rss2json.com ───
async function fetchRSSFeed(rssUrl) {
  const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}&count=10`
  
  const response = await fetch(proxyUrl, {
    signal: AbortSignal.timeout(8000), // 8 second timeout
  })
  
  if (!response.ok) throw new Error(`RSS fetch failed: ${response.status}`)
  
  const data = await response.json()
  
  if (data.status !== 'ok' || !data.items) {
    throw new Error('RSS parse failed')
  }
  
  return data.items
}

// ─── Transform RSS item to feed card format ───
function transformRSSItem(item, category) {
  const styles = CATEGORY_STYLES[category] || CATEGORY_STYLES.news
  const engagement = generateEngagement()
  const icon = styles.icons[Math.floor(Math.random() * styles.icons.length)]
  
  // Try to extract image from enclosure or content
  let image = null
  if (item.enclosure?.link) {
    image = item.enclosure.link
  } else if (item.thumbnail) {
    image = item.thumbnail
  }
  
  // Clean summary
  let summary = stripHtml(item.description || item.content || '')
  if (summary.length > 200) summary = summary.substring(0, 200) + '...'
  
  // Clean title
  let title = stripHtml(item.title || '')
  // Remove source suffix like " - Times of India" or " | NDTV"
  title = title.replace(/\s*[-|–]\s*[^-|–]*$/, '').trim()
  if (title.length > 120) title = title.substring(0, 120) + '...'
  
  return {
    category,
    tag: styles.tag,
    tagColor: styles.tagColor,
    title,
    summary,
    source: extractSource(item.link || ''),
    url: item.link || '',
    author: category === 'job' ? 'Careers Desk' : category === 'exam' ? 'Exam Desk' : category === 'scheme' ? 'Policy Desk' : 'Education Desk',
    authorRole: category === 'job' ? 'LDMS Jobs' : category === 'exam' ? 'LDMS Exams' : category === 'scheme' ? 'LDMS Gov' : 'LDMS News',
    likes: engagement.likes,
    comments: engagement.comments,
    time: getTimeAgo(item.pubDate),
    icon,
    image,
    isLive: true, // flag to indicate this is live data
    pubDate: item.pubDate, // keep original date for sorting
  }
}

// ─── Cache Utilities ───
function getCachedData() {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (!cached) return null
    
    const { data, timestamp } = JSON.parse(cached)
    const age = Date.now() - timestamp
    
    if (age > CACHE_DURATION) {
      localStorage.removeItem(CACHE_KEY)
      return null
    }
    
    return data
  } catch {
    return null
  }
}

function setCachedData(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data,
      timestamp: Date.now(),
    }))
  } catch {
    // localStorage full or unavailable
  }
}

// ─── Main: Fetch Live Feed ───
export async function fetchLiveFeed() {
  // Check cache first
  const cached = getCachedData()
  if (cached) {
    console.log('📡 Using cached live feed data')
    return cached
  }

  console.log('🔄 Fetching live feed from RSS sources...')
  
  const allItems = []
  const fetchPromises = []

  // Fetch from all RSS sources
  for (const [category, sources] of Object.entries(RSS_SOURCES)) {
    for (const source of sources) {
      fetchPromises.push(
        fetchRSSFeed(source.url)
          .then(items => {
            const transformed = items.map(item => transformRSSItem(item, category))
            allItems.push(...transformed)
            console.log(`✅ ${source.name}: ${items.length} items`)
          })
          .catch(err => {
            console.warn(`⚠️ ${source.name} failed:`, err.message)
          })
      )
    }
  }

  // Wait for all to settle (don't fail if some sources fail)
  await Promise.allSettled(fetchPromises)

  if (allItems.length === 0) {
    console.warn('❌ All live sources failed, using fallback data')
    return null // Signal to use fallback
  }

  // Sort by date (newest first) and deduplicate by title similarity
  const seen = new Set()
  const unique = allItems.filter(item => {
    const key = item.title.toLowerCase().substring(0, 50)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  }).sort((a, b) => {
    try {
      return new Date(b.pubDate) - new Date(a.pubDate)
    } catch {
      return 0
    }
  })

  console.log(`📡 Live feed ready: ${unique.length} unique items`)
  
  // Cache the results
  setCachedData(unique)
  
  return unique
}

// ─── Get live feed by category ───
export function filterLiveByCategory(liveItems, category) {
  if (!liveItems || !Array.isArray(liveItems)) return []
  return liveItems.filter(item => item.category === category)
}

// ─── Get mixed feed (live + hardcoded fallback) ───
export function getMixedFeed(liveItems, count = 15) {
  if (!liveItems || liveItems.length === 0) {
    return getAutoFeedItems(count)
  }
  
  // Mix live items with some hardcoded items for variety
  const live = [...liveItems].sort(() => Math.random() - 0.5).slice(0, Math.ceil(count * 0.7))
  const hardcoded = getAutoFeedItems(Math.floor(count * 0.3))
  
  // Interleave them
  const mixed = []
  let lIdx = 0, hIdx = 0
  for (let i = 0; i < count; i++) {
    if (i % 3 === 2 && hIdx < hardcoded.length) {
      mixed.push(hardcoded[hIdx++])
    } else if (lIdx < live.length) {
      mixed.push(live[lIdx++])
    } else if (hIdx < hardcoded.length) {
      mixed.push(hardcoded[hIdx++])
    }
  }
  
  return mixed
}

// ─── Get ticker items from live feed ───
export function getLiveTickerItems(liveItems, count = 6) {
  if (!liveItems || liveItems.length === 0) {
    // Use imported fallback
    return getTickerItems(count)
  }
  
  return liveItems
    .filter(item => item.category === 'news' || item.category === 'job' || item.category === 'exam')
    .sort(() => Math.random() - 0.5)
    .slice(0, count)
}

// ─── Force refresh cache ───
export function clearFeedCache() {
  localStorage.removeItem(CACHE_KEY)
  console.log('🗑️ Feed cache cleared')
}
