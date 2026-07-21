import { execFileSync } from 'node:child_process'
import { mkdtempSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const tmp = mkdtempSync(join(tmpdir(), 'planner-weather-service-'))

const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

const findFile = (dir, fileName) => {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    const stat = statSync(path)
    if (stat.isDirectory()) {
      const found = findFile(path, fileName)
      if (found) return found
    } else if (entry === fileName) {
      return path
    }
  }
  return null
}

try {
  writeFileSync(join(tmp, 'package.json'), '{"type":"module"}\n')
  execFileSync(
    process.platform === 'win32' ? 'node_modules/.bin/tsc.cmd' : './node_modules/.bin/tsc',
    [
      'src/utils/weatherForecast.ts',
      '--target', 'ES2020',
      '--module', 'ES2020',
      '--moduleResolution', 'bundler',
      '--skipLibCheck',
      '--strict',
      '--ignoreConfig',
      '--outDir', tmp,
    ],
    { cwd: root, stdio: 'pipe' },
  )

  const compiledPath = findFile(tmp, 'weatherForecast.js')
  assert(compiledPath, 'compiled weather utility was not found')

  const { mergeDayForecasts, parseOpenMeteoForecast, wmoCodeToSkyPty } = await import(pathToFileURL(compiledPath).href)

  assert(wmoCodeToSkyPty(0).sky === 1, 'clear WMO code should map to sunny sky')
  assert(wmoCodeToSkyPty(63).pty === 1, 'rain WMO code should map to rain')
  assert(wmoCodeToSkyPty(75).pty === 3, 'snow WMO code should map to snow')

  const fallback = parseOpenMeteoForecast({
    time: ['2026-07-21', '2026-07-22', 'invalid-date'],
    weather_code: [63, 0, 0],
    temperature_2m_max: [26.2, 30.8, 99],
    temperature_2m_min: [24.4, 23.1, 99],
    precipitation_probability_max: [100, 120, 0],
  })

  assert(fallback.length === 2, 'invalid Open-Meteo dates should be ignored')
  assert(fallback[0].date === '20260721', 'ISO date should convert to widget date format')
  assert(fallback[0].high === 26 && fallback[0].low === 24, 'temperatures should be rounded')
  assert(fallback[1].pop === 100, 'precipitation probability should stay within 0-100')

  const kmaDay = { ...fallback[0], high: 28, pop: 70 }
  const merged = mergeDayForecasts([kmaDay], fallback, 14)
  assert(merged.length === 2, 'fallback days should fill dates missing from the primary forecast')
  assert(merged[0].high === 28 && merged[0].pop === 70, 'KMA data should win when both providers contain the same date')

  console.log('Weather service checks passed.')
} finally {
  rmSync(tmp, { recursive: true, force: true })
}
