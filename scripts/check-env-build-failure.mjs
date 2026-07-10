import { spawnSync } from 'node:child_process'
import path from 'node:path'

const viteBin = path.resolve('node_modules/vite/bin/vite.js')
const result = spawnSync(process.execPath, [viteBin, 'build', '--mode', 'production'], {
  cwd: process.cwd(),
  encoding: 'utf8',
  env: {
    ...process.env,
    PLANNER_TEST_EMPTY_FIREBASE_ENV: '1',
  },
})

const output = `${result.stdout ?? ''}\n${result.stderr ?? ''}`
if (result.status === 0) {
  throw new Error('Build unexpectedly succeeded without Firebase environment values.')
}
if (!output.includes('Missing required Firebase environment variables')) {
  throw new Error('Build failed for an unexpected reason while checking Firebase environment validation.')
}

console.log('Firebase-missing production build was blocked as expected.')
