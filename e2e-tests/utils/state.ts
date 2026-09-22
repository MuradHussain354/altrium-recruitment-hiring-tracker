import fs from 'fs';
import path from 'path';

/**
 * The suite's stages are not independent — a candidate can't apply to a
 * position that a later HR test hasn't created yet — so state produced by
 * one spec file (position id, application id, credentials...) is persisted
 * here for the next spec file to read. Playwright runs test files as
 * separate processes/workers, so an in-memory module singleton would not
 * survive between files; a small JSON file on disk does.
 */
const STATE_FILE = path.resolve(__dirname, '../.state/run-state.json');

export interface RunState {
  managerEmail?: string;
  managerPassword?: string;
  hrEmail?: string;
  hrPassword?: string;
  hrUserId?: string;
  tlEmail?: string;
  tlPassword?: string;
  tlUserId?: string;
  positionId?: string;
  positionTitle?: string;
  candidateName?: string;
  candidateEmail?: string;
  applicationId?: string;
  applicationUrl?: string;
}

export function readState(): RunState {
  if (!fs.existsSync(STATE_FILE)) return {};
  return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
}

export function writeState(patch: Partial<RunState>): RunState {
  const current = readState();
  const next = { ...current, ...patch };
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(next, null, 2));
  return next;
}

export function resetState(): void {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify({}, null, 2));
}
