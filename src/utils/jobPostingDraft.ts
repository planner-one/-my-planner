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

const KEYWORD_MATCHERS: Array<[string, RegExp]> = [
  ['React Native', /\breact\s+native\b/i],
  ['React Query', /\breact\s+query\b|\btanstack\s+query\b/i],
  ['React', /\breact\b/i],
  ['TypeScript', /\btype\s*script\b|\btypescript\b|\bts\b/i],
  ['JavaScript', /\bjava\s*script\b|\bjavascript\b|\bjs\b/i],
  ['Next.js', /\bnext\.?\s*js\b/i],
  ['Vue', /\bvue\b|\bvue\.js\b/i],
  ['Angular', /\bangular\b/i],
  ['Node.js', /\bnode\.?\s*js\b/i],
  ['NestJS', /\bnest\.?\s*js\b|\bnestjs\b/i],
  ['Express', /\bexpress\b/i],
  ['Firebase', /\bfirebase\b/i],
  ['Figma', /\bfigma\b|피그마/i],
  ['UI/UX', /ui\s*\/\s*ux|ux\s*\/\s*ui/i],
  ['UI', /\bui\b|사용자\s*인터페이스/i],
  ['UX', /\bux\b|사용자\s*경험/i],
  ['프론트엔드', /프론트\s*엔드|프론트엔드|\bfrontend\b|\bfront-end\b/i],
  ['백엔드', /백\s*엔드|백엔드|\bbackend\b|\bback-end\b/i],
  ['풀스택', /풀\s*스택|풀스택|\bfull\s*stack\b|\bfullstack\b/i],
  ['PM', /\bpm\b|프로덕트\s*매니저|프로젝트\s*매니저/i],
  ['기획', /서비스\s*기획|프로덕트\s*기획|기획자|기획/i],
  ['Java', /\bjava\b/i],
  ['Kotlin', /\bkotlin\b/i],
  ['Python', /\bpython\b/i],
  ['FastAPI', /\bfast\s*api\b|\bfastapi\b/i],
  ['Django', /\bdjango\b/i],
  ['Go', /\bgolang\b|\bgo\b/i],
  ['Rust', /\brust\b/i],
  ['Spring Boot', /\bspring\s+boot\b/i],
  ['Spring Security', /\bspring\s+security\b/i],
  ['Spring Data JPA', /\bspring\s+data\s+jpa\b/i],
  ['JPA', /\bjpa\b/i],
  ['QueryDSL', /\bquerydsl\b/i],
  ['MyBatis', /\bmybatis\b/i],
  ['REST API', /\brest\s*api\b/i],
  ['GraphQL', /\bgraphql\b/i],
  ['MySQL', /\bmysql\b/i],
  ['PostgreSQL', /\bpostgresql\b|\bpostgres\b/i],
  ['MariaDB', /\bmariadb\b/i],
  ['Oracle', /\boracle\b/i],
  ['MongoDB', /\bmongodb\b/i],
  ['Redis', /\bredis\b/i],
  ['Kafka', /\bkafka\b/i],
  ['AWS ECS', /\baws\s+ecs\b/i],
  ['AWS', /\baws\b/i],
  ['GCP', /\bgcp\b|\bgoogle\s+cloud\b/i],
  ['Azure', /\bazure\b/i],
  ['Docker', /\bdocker\b/i],
  ['Kubernetes', /\bkubernetes\b|\bk8s\b/i],
  ['CI/CD', /\bci\s*\/\s*cd\b|\bcicd\b/i],
  ['GitHub Actions', /\bgithub\s+actions\b/i],
  ['Git', /\bgit\b/i],
  ['Linux', /\blinux\b/i],
  ['HTML', /\bhtml\b/i],
  ['CSS', /\bcss\b/i],
  ['Sass/SCSS', /\bsass\b|\bscss\b/i],
  ['Tailwind', /\btailwind\b/i],
  ['Vite', /\bvite\b/i],
  ['ES6', /\bes6\b/i],
  ['AI', /\bai\b|인공지능|머신러닝|딥러닝/i],
  ['블록체인', /블록체인|block\s*chain|blockchain/i],
  ['Wallet', /\bwallet\b|월렛/i],
  ['Security', /\bsecurity\b|보안/i],
  ['암호학', /암호학|cryptography|암호화|전자서명/i],
  ['HSM', /\bhsm\b/i],
  ['MPC', /\bmpc\b/i],
  ['Secure SDLC', /\bsecure\s+sdlc\b/i],
  ['Threat Modeling', /\bthreat\s+modeling\b|위협\s*모델링/i],
  ['OAuth', /\boauth\b/i],
  ['JWT', /\bjwt\b/i],
  ['신입', /신입/i],
]

const ROLE_HINTS = [
  '프론트엔드', 'frontend', 'front-end', '백엔드', 'backend', 'back-end', 'fullstack', 'full stack', '풀스택',
  'developer', 'engineer', '개발자', '디자이너', 'designer', '기획자', 'pm', '마케터',
  'security', '보안', 'blockchain', '블록체인', 'wallet', '월렛', 'ai', '인공지능',
]

const COMPANY_SLUG_LABELS: Record<string, string> = {
  kdb: 'KDB',
}

const JOB_CONTENT_HINTS =
  /기업명|회사명|기관명|채용\s*직무|담당\s*직무|모집\s*직무|모집\s*부문|포지션|주요\s*업무|세부\s*업무|담당업무|기술스택|기술\s*스택|스킬|채용\s*인원|채용예정인원|연봉|급여|보수\s*수준|고용형태|근무형태|채용\s*구분|지원\s*자격|자격요건|응시\s*자격|우대사항|소재지|근무지|근\s*무\s*지|근무\s*지역|사업내용|핵심\s*정보|접수\s*기간|지원서\s*접수|마감일|채용\s*일정|원티드|사람인|블록체인|보안|프론트엔드|백엔드|개발자|엔지니어|engineer|developer/i

export const normalizeJobLine = (value: string) =>
  value
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s*/, '')
    .replace(/^[•▪·*ㆍ-]\s*/, '')
    .replace(/^[①②③④⑤⑥⑦⑧⑨⑩]\s*/, '')
    .replace(/^\d+[.)]\s*/, '')
    .replace(/\*\*/g, ' ')
    .replace(/([가-힣A-Za-z])#/g, '$1 ')
    .replace(
      /(경력|학력|근무형태|근무\s*형태|채용\s*구분|우대사항|급여|보수\s*수준|근무일시|근무지역|근무\s*지역|근무지|근\s*무\s*지|시작일|마감일|지원방법|접수양식|대표자명|기업형태|업종|사원수|설립일|홈페이지|기업주소|채용\s*직무|담당\s*직무|모집\s*직무|모집\s*부문|주요업무|주요\s*업무|자격요건|응시\s*자격|기술스택|기술\s*스택|포지션|근무지위치|접수기간|지원서\s*접수|채용\s*일정)/g,
      ' $1 ',
    )
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

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const isBoilerplateLine = (value: string) =>
  /개인정보|채용과정에서\s*수집|합격률|서류합격|사람인\s*(양식|공식)|URL\/파일\s*이력서|스토어\s*바로가기|취업꿀템|자소서|학업계획서|모의면접|경력기술서|본\s*채용정보|무단전재|재배포|재가공|저작권자|원티드랩|이용약관|개인정보\s*처리방침|회원가입|로그인|광고문의|고객센터|대표이사|사업자등록번호|통신판매번호|유료직업소개|경쟁자들\s*대비|경쟁력\s*분석|지원자\s*통계|이력서에\s*활용하기|상품은\s*어때요|기업정보\s*전체보기|정확한\s*정보는\s*기업공시/i.test(value)

const cleanInfoValue = (value: string, maxLength = 180) => {
  const cleaned = stripFieldLabel(normalizeJobLine(value))
    .replace(/^[*:：\-\s]+/, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!cleaned || isBoilerplateLine(cleaned)) return ''
  return cleaned.length > maxLength ? cleaned.slice(0, maxLength).trim() : cleaned
}

const inferCompanyFromUrl = (parsed: URL, platform: JobPostingPlatform) => {
  const hostParts = parsed.hostname.replace(/^www\./, '').split('.').filter(Boolean)
  if (platform === 'incruit') {
    const subdomain = hostParts[0]
    if (subdomain && !['www', 'm', 'hire', 'recruit'].includes(subdomain)) {
      return prettifyCompanySlug(subdomain)
    }
  }

  if (['saramin', 'wanted', 'jobplanet', 'jumpit', 'groupby'].includes(platform)) return ''

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

const formatDate = (year: number, month: number, day: number) => {
  const now = new Date()
  const safeYear = year || now.getFullYear()
  if (!month || !day || month < 1 || month > 12 || day < 1 || day > 31) return ''
  return `${safeYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

const parseDates = (text: string) => {
  const dates: string[] = []
  let lastYear = new Date().getFullYear()
  for (const match of text.matchAll(/(?:(20\d{2})[.\-/년\s]*)?(\d{1,2})[.\-/월\s]+(\d{1,2})[일]?/g)) {
    if (match[1]) lastYear = Number(match[1])
    const parsed = formatDate(lastYear, Number(match[2]), Number(match[3]))
    if (parsed) dates.push(parsed)
  }
  return dates
}

const parseDate = (text: string) =>
  parseDates(text)[0] ?? ''

const inferDeadline = (text: string) => {
  const lines = text.split(/\n+/).map(line => normalizeJobLine(line)).filter(Boolean)
  const deadlineLabel = /마감|접수\s*기간|지원서\s*접수|지원\s*기간|모집\s*기간|서류\s*접수|채용\s*기간|공고\s*기간|신청\s*기간/i
  for (const line of lines) {
    const match = line.match(/마감일?|마감\s*기한/i)
    if (!match || match.index === undefined) continue
    const parsed = parseDate(line.slice(match.index))
    if (parsed) return parsed
  }
  for (let index = 0; index < lines.length; index += 1) {
    if (!deadlineLabel.test(lines[index])) continue
    const nearby = [lines[index], lines[index + 1] ?? '', lines[index + 2] ?? ''].join(' ')
    const sameLineDates = parseDates(lines[index])
    const dates = sameLineDates.length ? sameLineDates : parseDates(nearby)
    const parsed = /접수\s*기간|지원서\s*접수|지원\s*기간|모집\s*기간|서류\s*접수|채용\s*기간|공고\s*기간|신청\s*기간/i.test(nearby)
      ? dates[dates.length - 1]
      : dates[0]
    if (parsed) return parsed
  }
  return ''
}

const inferKeywords = (text: string) =>
  KEYWORD_MATCHERS
    .filter(([, matcher]) => matcher.test(text))
    .map(([keyword]) => keyword)
    .slice(0, 28)

const stripFieldLabel = (value: string) => {
  const stripped = value.replace(
    /^(Title|기업명|회사명|기관명|소재지|주소|근무지|근\s*무\s*지|근무\s*지역|근무지역|지역|사업내용|홈페이지|연혁|재직\s*인원|채용\s*직무\s*\/?\s*분야|담당\s*직무|모집\s*직무|모집\s*부문|모집\s*분야|포지션명|포지션|직무명|직무|분야|주요업무|주요\s*업무|세부\s*업무\s*내용\s*및\s*기술스택|세부\s*업무|담당업무|기술스택|기술\s*스택|스킬|Skill|채용\s*인원|채용예정인원|모집\s*인원|연봉|급여|보수\s*수준|고용형태|근무형태|채용\s*구분|채용\s*우대사항|우대사항|지원\s*자격|자격요건|응시\s*자격|복리후생|기업문화|근무지위치|접수기간\s*및\s*방법|접수기간|지원서\s*접수|채용\s*일정)(?:\s*\([^)]*\))?\s*[:：-]?\s*/i,
    '',
  ).trim()
  return /^\([^)]{1,30}\)$/.test(stripped) ? '' : stripped
}

const extractCompanyName = (line: string) => {
  const stripped = stripFieldLabel(line)
  const bracketed = stripped.match(/^\[([^\]]{2,50})\]/)
  if (bracketed && !/(공통|백엔드|프론트엔드|개발자|engineer|developer|채용|모집|보안|블록체인)/i.test(bracketed[1])) {
    return bracketed[1].trim()
  }
  const candidates = stripped
    .replace(/\|\s*(사람인|원티드|잡플래닛|점핏).*$/i, '')
    .split(/\s[-–—]\s/)
    .map(part => part.trim())
    .filter(Boolean)
    .reverse()
  const picked = candidates.find(candidate => /주식회사|\(주\)|㈜/.test(candidate) && candidate.length <= 60)
  if (picked) return picked
  const titleCompany = stripped.match(/^([가-힣A-Za-z0-9().&\s]{2,40})\s+채용정보$/)
  if (titleCompany) return titleCompany[1].trim()
  const wantedLine = stripped.match(/^([가-힣A-Za-z0-9().&\s]{2,40})\s*[∙·]\s*(서울|경기|인천|부산|대구|광주|대전|울산|세종|강원|충북|충남|전북|전남|경북|경남|제주|해외)/)
  if (wantedLine) return wantedLine[1].trim()
  return /주식회사|\(주\)|㈜/.test(stripped) && stripped.length <= 60 ? stripped : ''
}

const findLabeledValue = (lines: string[], labelPattern: RegExp) => {
  for (let index = 0; index < lines.length; index += 1) {
    labelPattern.lastIndex = 0
    if (!labelPattern.test(lines[index])) continue
    const sameLine = stripFieldLabel(normalizeJobLine(lines[index]))
    if (sameLine && sameLine !== lines[index]) {
      const cleaned = cleanInfoValue(sameLine)
      if (cleaned) return cleaned
    }
    for (let offset = 1; offset <= 3; offset += 1) {
      const cleaned = cleanInfoValue(lines[index + offset] ?? '')
      if (cleaned) return cleaned
    }
  }
  return ''
}

const findInlineValue = (lines: string[], labelPattern: RegExp, stopPattern?: RegExp) => {
  for (const line of lines) {
    const match = line.match(labelPattern)
    if (!match || match.index === undefined) continue
    const afterLabel = line.slice(match.index + match[0].length)
    const stopIndex = stopPattern ? afterLabel.search(stopPattern) : -1
    const value = stopIndex >= 0 ? afterLabel.slice(0, stopIndex) : afterLabel
    const cleaned = cleanInfoValue(value)
    if (cleaned) return cleaned
  }
  return ''
}

const cleanLocation = (value: string) => {
  const cleaned = cleanInfoValue(value, 120)
    .replace(/^\(?\d{5}\)?\s*/, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!cleaned || cleaned.length < 2 || cleaned === '역' || /^[가-힣]역$/.test(cleaned)) return ''
  if (!/(서울|경기|인천|부산|대구|광주|대전|울산|세종|강원|충북|충남|전북|전남|경북|경남|제주|해외|재택|원격|remote|본점|지점|digital|square|시|군|구|동|읍|면|로|길|타워|빌딩|전체)/i.test(cleaned)) return ''
  return cleaned
}

const findLocationValue = (lines: string[]) => {
  const candidates = [
    findInlineValue(lines, /근무\s*지역|근무지역/, /경력|학력|근무형태|우대사항|급여|근무일시|복리후생|접수기간|AI\s*서류|마감일/),
    findLabeledValue(lines, /소재지|주소|근무지|근\s*무\s*지|근무\s*지역|근무지역/),
    ...getSectionLines(lines, /근무지위치|근무지|근\s*무\s*지|근무\s*지역|근무지역|지역/, 5),
  ]
  return candidates.map(cleanLocation).find(Boolean) ?? ''
}

const SECTION_HEADING = /^(\[?(기업명|회사명|기관명|소재지|주소|근무지|근\s*무\s*지|근무\s*지역|근무지역|지역|사업내용|홈페이지|연혁|재직\s*인원|채용\s*직무|담당\s*직무|모집\s*직무|모집\s*부문|모집\s*분야|포지션명|직무명|세부\s*업무|주요업무|주요\s*업무|담당업무|기술스택|기술\s*스택|기술스택\s*및\s*역량|스킬|Skill|채용\s*인원|채용예정인원|모집\s*인원|연봉|급여|보수\s*수준|고용형태|근무형태|채용\s*구분|채용\s*우대사항|우대사항|지원\s*자격|자격요건|응시\s*자격|복리후생|기업문화|핵심\s*정보|근무지위치|접수기간|지원서\s*접수|채용\s*일정)\]?)/i

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
    const cleaned = cleanInfoValue(line)
    if (cleaned) results.push(cleaned)
  }
  return results.filter(Boolean)
}

const getAllSectionLines = (lines: string[], labelPattern: RegExp, maxLinesPerSection = 8, maxTotal = 12) => {
  const results: string[] = []
  for (let start = 0; start < lines.length && results.length < maxTotal; start += 1) {
    labelPattern.lastIndex = 0
    if (!labelPattern.test(lines[start])) continue
    let collected = 0
    for (let index = start + 1; index < lines.length && collected < maxLinesPerSection && results.length < maxTotal; index += 1) {
      const line = normalizeJobLine(lines[index])
      if (!line) continue
      if (SECTION_HEADING.test(line) && collected > 0) break
      const stripped = cleanInfoValue(line)
      if (!stripped || SECTION_HEADING.test(stripped)) continue
      results.push(stripped)
      collected += 1
    }
  }
  return results
}

const findSectionValue = (lines: string[], labelPattern: RegExp) =>
  getSectionLines(lines, labelPattern, 2)[0] ?? ''

const findSectionSummary = (lines: string[], labelPattern: RegExp, maxLines = 3) =>
  getSectionLines(lines, labelPattern, maxLines).join(' / ')

const inferDutySummary = (lines: string[]) => {
  const dutyPattern = /개발|유지보수|운영|설계|분석|구현|관리|리딩|협업|개선|최적화|리팩터링|연동|보안|아키텍처|모델링|탐지|대응|자동화|검증|제안|리드/i
  const skipPattern = /사업내용|홈페이지|소재지|재직\s*인원|채용\s*인원|연봉|고용형태|지원\s*자격|자격요건|우대사항|복리후생|기술스택|채용\s*직무|서비스업|공급업|사육업|참여\s*기업|마감일|근무지역/
  const dutySectionLines = getAllSectionLines(lines, /담당업무|주요업무|주요\s*업무/, 8, 10)
  const candidates = dutySectionLines.length ? dutySectionLines : lines
  return candidates
    .map(line => cleanInfoValue(line, 160))
    .filter(line =>
      line.length >= 8 &&
      line.length <= 160 &&
      dutyPattern.test(line) &&
      !skipPattern.test(line),
    )
    .slice(0, 6)
    .join(' / ')
}

const isRoleLine = (line: string) => {
  const lower = line.toLowerCase()
  if (/^Title\s*:|사업내용|담당업무|담당\s*직무|주요업무|기술스택|지원\s*자격|자격요건|응시\s*자격|복리후생|홈페이지|소재지|근무지역|연봉|인원|마감일|접수기간|지원서\s*접수|저작권|개인정보|사람인|원티드/.test(line)) return false
  if (/개발\s*및\s*공급업/.test(line)) return false
  if (/기반|유지보수|신규\s*기능|애플리케이션|컴포넌트\s*구조|아키텍처|보안\s*수준|시스템을/.test(line)) return false
  return line.length <= 80 && (ROLE_HINTS.some(hint => lower.includes(hint)) || /웹\s*\((백엔드|프론트엔드)\)/.test(line))
}

const cleanTitlePosition = (line: string, company: string) => {
  let title = normalizeJobLine(line)
    .replace(/^Title\s*:\s*/i, '')
    .replace(/\|\s*(사람인|원티드|잡플래닛|점핏|그룹바이).*$/i, '')
    .replace(/\s[-–—]\s*(사람인|원티드|잡플래닛|점핏|그룹바이).*$/i, '')
    .replace(/\s*채용\s*공고\s*$/i, '')
    .replace(/\s*채용정보\s*$/i, '')
    .trim()
  if (company) title = title.replace(new RegExp(escapeRegExp(company), 'gi'), ' ')
  title = title
    .replace(/^(?:\[[^\]]*]\s*)+/, '')
    .replace(/^(에서\s*)?채용공고가\s*시작되면.*$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!title || title.length < 3 || title.length > 90 || isBoilerplateLine(title)) return ''
  return title
}

const inferPositionFromTitle = (lines: string[], company: string) => {
  for (const line of lines) {
    if (!/(^Title\s*:|채용\s*공고\s*\||-\s*사람인|-\s*원티드|사람인$|원티드$)/i.test(line)) continue
    const title = cleanTitlePosition(line, company)
    if (title && (isRoleLine(title) || /사람인|원티드|잡플래닛|점핏|그룹바이/i.test(line))) return title
  }
  return ''
}

const cleanPositionValue = (value: string) =>
  cleanInfoValue(value, 90)
    .replace(/\s*[:：-]\s*\d+\s*명.*$/, '')
    .replace(/웹\s*\((백엔드|프론트엔드)\)/g, '웹 ($1)')
    .replace(/\s+/g, ' ')
    .trim()

export const inferJobPostingFromText = (text: string): JobPostingDraft => {
  const lines = text
    .split(/\n+/)
    .map(line => normalizeJobLine(line))
    .filter(line => line && !isBoilerplateLine(line))
  const deadline = inferDeadline(text)
  const keywords = inferKeywords(text)
  const company =
    findLabeledValue(lines, /기업명|회사명|기관명/) ||
    lines.map(extractCompanyName).find(Boolean) ||
    ''
  const titlePosition = inferPositionFromTitle(lines, company)
  const labeledPosition = findLabeledValue(lines, /채용\s*직무\s*\/?\s*분야|담당\s*직무|모집\s*직무|모집\s*부문|모집\s*분야|직무명|포지션명|직무\s*\/?\s*분야/)
  const positionSection = labeledPosition
    ? []
    : getSectionLines(lines, /채용\s*직무\s*\/?\s*분야|담당\s*직무|모집\s*직무|모집\s*부문|모집\s*분야|직무명|포지션명|직무\s*\/?\s*분야/, 6)
  const roleLines = lines.map(stripFieldLabel).filter(isRoleLine)
  const positions = Array.from(new Set([
    titlePosition,
    labeledPosition,
    ...positionSection.filter(line => line.length <= 90),
    ...roleLines,
  ].map(cleanPositionValue).filter(Boolean)))
    .slice(0, 3)
  const location = findLocationValue(lines)
  const employmentType =
    findInlineValue(lines, /근무형태|근무\s*형태/, /경력|학력|우대사항|급여|근무일시|근무지역|근무\s*지역|복리후생/) ||
    findLabeledValue(lines, /고용형태|근무형태|근무\s*형태|채용\s*구분/) ||
    findSectionValue(lines, /고용형태|근무형태|근무\s*형태|채용\s*구분/)
  const business = findLabeledValue(lines, /사업내용/) || findInlineValue(lines, /사업내용|업종/, /홈페이지|기업주소|사원수|설립일|매출액|대표자명/)
  const headcount =
    findLabeledValue(lines, /채용\s*인원|채용예정인원|모집\s*인원/) ||
    findInlineValue(lines, /채용\s*인원|채용예정인원|모집\s*인원/, /연봉|급여|보수\s*수준|고용형태|근무형태|채용\s*구분|지원\s*자격|자격요건|응시\s*자격/) ||
    findSectionSummary(lines, /채용\s*인원|채용예정인원|모집\s*인원/, 3)
  const salary =
    findLabeledValue(lines, /연봉|급여|보수\s*수준/) ||
    findInlineValue(lines, /연봉|급여|보수\s*수준/, /근무일시|근무지역|근무\s*지역|근\s*무\s*지|복리후생|접수기간|지원방법|고용형태|채용\s*구분/) ||
    findSectionValue(lines, /연봉|급여|보수\s*수준/)
  const requirements = findLabeledValue(lines, /지원\s*자격|자격요건|응시\s*자격/) || findSectionValue(lines, /지원\s*자격|자격요건|응시\s*자격/)
  const preference = findLabeledValue(lines, /채용\s*우대사항|우대사항/) || findSectionValue(lines, /채용\s*우대사항|우대사항/)
  const dutySummary = inferDutySummary(lines)
  const positionSummary = positions.join(' / ')
  const note = [
    business ? `사업내용: ${business}` : '',
    positionSummary ? `채용 직무: ${positionSummary}` : '',
    dutySummary ? `주요 업무: ${dutySummary}` : '',
    keywords.length ? `기술스택: ${keywords.join(', ')}` : '',
    location ? `소재지: ${location}` : '',
    employmentType ? `고용형태: ${employmentType}` : '',
    headcount ? `채용 인원: ${headcount}` : '',
    salary ? `연봉/급여: ${salary}` : '',
    requirements ? `지원 자격: ${requirements}` : '',
    preference ? `우대사항: ${preference}` : '',
  ].filter(Boolean).join('\n')
  return {
    company,
    position: positionSummary,
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
