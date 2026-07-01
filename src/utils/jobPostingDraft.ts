import type { JobPostingPlatform } from '../types'

export interface JobPostingDraft {
  sourceUrl?: string
  platform?: JobPostingPlatform
  company: string
  position: string
  deadline: string
  location: string
  employmentType: string
  keywords: string[]
  note: string
}

const TECH_KEYWORDS = [
  'React', 'TypeScript', 'JavaScript', 'Next.js', 'Vue', 'Node.js',
  'Firebase', 'Figma', 'UI', 'UX', '프론트엔드', '백엔드', 'PM', '기획',
  'Java', 'Spring Boot', 'Spring Data JPA', 'AWS', 'AWS ECS', 'Docker', 'Git',
  'React Native', 'HTML', 'CSS', 'ES6',
]

const ROLE_HINTS = [
  '프론트엔드', 'frontend', 'front-end', '백엔드', 'backend', 'fullstack', '풀스택',
  'developer', 'engineer', '개발자', '디자이너', 'designer', '기획자', 'pm', '마케터',
]

const COMPANY_SLUG_LABELS: Record<string, string> = {
  kdb: 'KDB',
}

const JOB_CONTENT_HINTS =
  /기업명|회사명|기관명|채용\s*직무|모집\s*직무|세부\s*업무|담당업무|기술스택|기술\s*스택|채용\s*인원|연봉|급여|고용형태|지원\s*자격|자격요건|우대사항|소재지|근무지|사업내용/

export const normalizeJobLine = (value: string) =>
  value
    .replace(/^[•▪·*ㆍ-]\s*/, '')
    .replace(/^[①②③④⑤⑥⑦⑧⑨⑩]\s*/, '')
    .replace(/^\d+[.)]\s*/, '')
    .replace(/\s+/g, ' ')
    .trim()

export const hasUsefulJobText = (text: string) =>
  normalizeJobLine(text).length > 40 && JOB_CONTENT_HINTS.test(text)

export function normalizeJobUrl(raw: string) {
  const value = raw.trim()
  if (!value) throw new Error('EMPTY_URL')

  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`
  const parsed = new URL(withScheme)
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('INVALID_URL')
  parsed.hash = ''
  return parsed.toString()
}

export const detectJobPlatform = (url: string): JobPostingPlatform => {
  const lower = url.toLowerCase()
  if (lower.includes('saramin.co.kr')) return 'saramin'
  if (lower.includes('jobplanet.co.kr')) return 'jobplanet'
  if (lower.includes('wanted.co.kr')) return 'wanted'
  if (lower.includes('jumpit.co.kr')) return 'jumpit'
  if (lower.includes('groupby.kr') || lower.includes('groupby.co.kr')) return 'groupby'
  if (lower.includes('incruit.com')) return 'incruit'
  if (
    lower.includes('sites.google.com') ||
    /\/(hire|recruit|career|jobs?|cor)(\/|[?#]|$)/i.test(lower) ||
    /(^|[./-])(hire|recruit|career|jobs?)[./-]/i.test(lower)
  ) return 'company'
  return 'other'
}

const cleanUrlPart = (value: string) =>
  value
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[-_+|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const decodeUrlPart = (value: string) => {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

const prettifyCompanySlug = (value: string) => {
  const cleaned = cleanUrlPart(value).replace(/\s+/g, '')
  if (!cleaned) return ''
  const lower = cleaned.toLowerCase()
  if (COMPANY_SLUG_LABELS[lower]) return COMPANY_SLUG_LABELS[lower]
  if (/^[a-z]{2,5}$/i.test(cleaned)) return cleaned.toUpperCase()
  return cleaned
}

const inferCompanyFromUrl = (parsed: URL, platform: JobPostingPlatform) => {
  const hostParts = parsed.hostname.replace(/^www\./, '').split('.').filter(Boolean)
  if (platform === 'incruit') {
    const subdomain = hostParts[0]
    if (subdomain && !['www', 'm', 'hire', 'recruit'].includes(subdomain)) {
      return prettifyCompanySlug(subdomain)
    }
  }

  const pathParts = parsed.pathname.split('/').map(part => cleanUrlPart(decodeUrlPart(part))).filter(Boolean)
  const hostnameCandidate = hostParts.find(part => !['m', 'www', 'hire', 'recruit', 'career', 'jobs'].includes(part))
  return hostnameCandidate ? prettifyCompanySlug(hostnameCandidate) : ''
}

const inferFromUrl = (url: string) => {
  const normalizedUrl = normalizeJobUrl(url)
  const parsed = new URL(normalizedUrl)
  const platform = detectJobPlatform(normalizedUrl)
  const urlText = [
    parsed.hostname.replace(/^www\./, ''),
    ...parsed.pathname.split('/'),
    ...Array.from(parsed.searchParams.values()),
  ]
    .map(part => cleanUrlPart(decodeUrlPart(part)))
    .filter(part => part && !/^\d+$/.test(part))
    .join('\n')
  const lines = urlText.split(/\n+/).map(line => line.trim()).filter(Boolean)
  const position = lines.find(line =>
    line.length <= 70 && ROLE_HINTS.some(hint => line.toLowerCase().includes(hint)),
  ) ?? ''
  return {
    normalizedUrl,
    platform,
    company: inferCompanyFromUrl(parsed, platform),
    position,
    keywords: inferKeywords(urlText),
  }
}

const inferDate = (text: string) => {
  const match = text.match(/(20\d{2})[.\-/년\s]*(\d{1,2})[.\-/월\s]*(\d{1,2})/)
    ?? text.match(/(\d{1,2})[.\-/월\s]*(\d{1,2})[일]?/)
  if (!match) return ''
  const now = new Date()
  const year = match.length === 4 ? Number(match[1]) : now.getFullYear()
  const month = Number(match[match.length === 4 ? 2 : 1])
  const day = Number(match[match.length === 4 ? 3 : 2])
  if (!month || !day) return ''
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

const inferKeywords = (text: string) =>
  TECH_KEYWORDS.filter(keyword => text.toLowerCase().includes(keyword.toLowerCase()))

const stripFieldLabel = (value: string) => {
  const stripped = value.replace(
    /^(기업명|회사명|기관명|소재지|주소|근무지|근무\s*지역|사업내용|홈페이지|연혁|재직\s*인원|채용\s*직무\s*\/?\s*분야|모집\s*직무|포지션|직무|분야|세부\s*업무\s*내용\s*및\s*기술스택|세부\s*업무|담당업무|기술스택|기술\s*스택|채용\s*인원|모집\s*인원|연봉|급여|고용형태|근무형태|채용\s*우대사항|우대사항|지원\s*자격|자격요건|복리후생|기업문화)(?:\s*\([^)]*\))?\s*[:：-]?\s*/i,
    '',
  ).trim()
  return /^\([^)]{1,30}\)$/.test(stripped) ? '' : stripped
}

const extractCompanyName = (line: string) => {
  const stripped = stripFieldLabel(line)
  const candidates = stripped
    .split(/\s[-–—]\s/)
    .map(part => part.trim())
    .filter(Boolean)
    .reverse()
  const picked = candidates.find(candidate => /주식회사|\(주\)|㈜/.test(candidate) && candidate.length <= 60)
  if (picked) return picked
  return /주식회사|\(주\)|㈜/.test(stripped) && stripped.length <= 60 ? stripped : ''
}

const findLabeledValue = (lines: string[], labelPattern: RegExp) => {
  for (let index = 0; index < lines.length; index += 1) {
    labelPattern.lastIndex = 0
    if (!labelPattern.test(lines[index])) continue
    const sameLine = stripFieldLabel(normalizeJobLine(lines[index]))
    if (sameLine && sameLine !== lines[index]) return sameLine
    return stripFieldLabel(normalizeJobLine(lines[index + 1] ?? ''))
  }
  return ''
}

const SECTION_HEADING = /^(기업명|회사명|기관명|소재지|사업내용|홈페이지|연혁|재직\s*인원|채용\s*직무|모집\s*직무|세부\s*업무|담당업무|기술스택|기술\s*스택|채용\s*인원|연봉|급여|고용형태|채용\s*우대사항|우대사항|지원\s*자격|자격요건|복리후생|기업문화)/i

const getSectionLines = (lines: string[], labelPattern: RegExp, maxLines = 8) => {
  const start = lines.findIndex(line => {
    labelPattern.lastIndex = 0
    return labelPattern.test(line)
  })
  if (start < 0) return []
  const results: string[] = []
  for (let index = start + 1; index < lines.length && results.length < maxLines; index += 1) {
    const line = normalizeJobLine(lines[index])
    if (!line) continue
    if (SECTION_HEADING.test(line) && results.length > 0) break
    results.push(stripFieldLabel(line))
  }
  return results.filter(Boolean)
}

const findSectionValue = (lines: string[], labelPattern: RegExp) =>
  getSectionLines(lines, labelPattern, 2)[0] ?? ''

const findSectionSummary = (lines: string[], labelPattern: RegExp, maxLines = 3) =>
  getSectionLines(lines, labelPattern, maxLines).join(' / ')

const isRoleLine = (line: string) => {
  const lower = line.toLowerCase()
  if (/사업내용|담당업무|기술스택|지원\s*자격|복리후생|홈페이지|소재지|연봉|인원/.test(line)) return false
  if (/개발\s*및\s*공급업/.test(line)) return false
  return line.length <= 80 && (ROLE_HINTS.some(hint => lower.includes(hint)) || /웹\s*\((백엔드|프론트엔드)\)/.test(line))
}

export const inferJobPostingFromText = (text: string): JobPostingDraft => {
  const lines = text.split(/\n+/).map(line => normalizeJobLine(line)).filter(Boolean)
  const deadline = inferDate(text)
  const keywords = inferKeywords(text)
  const company =
    findLabeledValue(lines, /기업명|회사명|기관명/) ||
    lines.map(extractCompanyName).find(Boolean) ||
    ''
  const positionSection = getSectionLines(lines, /채용\s*직무\s*\/?\s*분야|모집\s*직무|직무\s*\/?\s*분야/, 6)
  const positions = (positionSection.length ? positionSection : lines.map(stripFieldLabel))
    .filter(isRoleLine)
    .slice(0, 3)
  const location = findLabeledValue(lines, /소재지|주소|근무지|근무\s*지역/)
  const employmentType = findLabeledValue(lines, /고용형태|근무형태/) || findSectionValue(lines, /고용형태|근무형태/)
  const business = findLabeledValue(lines, /사업내용/)
  const headcount = findLabeledValue(lines, /채용\s*인원|모집\s*인원/) || findSectionSummary(lines, /채용\s*인원|모집\s*인원/, 3)
  const salary = findLabeledValue(lines, /연봉|급여/) || findSectionValue(lines, /연봉|급여/)
  const requirements = findLabeledValue(lines, /지원\s*자격|자격요건/) || findSectionValue(lines, /지원\s*자격|자격요건/)
  const preference = findLabeledValue(lines, /채용\s*우대사항|우대사항/) || findSectionValue(lines, /채용\s*우대사항|우대사항/)
  const note = [
    business ? `사업내용: ${business}` : '',
    headcount ? `채용 인원: ${headcount}` : '',
    salary ? `연봉/급여: ${salary}` : '',
    requirements ? `지원 자격: ${requirements}` : '',
    preference ? `우대사항: ${preference}` : '',
  ].filter(Boolean).join('\n')
  return {
    company,
    position: positions.join(' / '),
    deadline,
    location,
    employmentType,
    keywords,
    note,
  }
}

export const buildJobPostingLinkDraft = (url: string, text = ''): JobPostingDraft => {
  const urlDraft = inferFromUrl(url)
  const textDraft = text.trim()
    ? inferJobPostingFromText(text)
    : { company: '', position: '', deadline: '', location: '', employmentType: '', keywords: [], note: '' }
  const isGoogleSitesCompanyPage = urlDraft.normalizedUrl.includes('sites.google.com')
  const allowUrlCompanyFallback =
    urlDraft.platform !== 'company' ||
    (!isGoogleSitesCompanyPage && !/\/cor\//i.test(urlDraft.normalizedUrl))
  return {
    sourceUrl: urlDraft.normalizedUrl,
    platform: urlDraft.platform,
    company: textDraft.company || (allowUrlCompanyFallback ? urlDraft.company : ''),
    position: textDraft.position || urlDraft.position,
    deadline: textDraft.deadline,
    location: textDraft.location,
    employmentType: textDraft.employmentType,
    keywords: mergeTokenLists(urlDraft.keywords, textDraft.keywords),
    note: textDraft.note,
  }
}

export const mergeTokenLists = (current: string[] | undefined, next: string[]) =>
  Array.from(new Set([...(current ?? []), ...next].map(item => item.trim()).filter(Boolean)))
