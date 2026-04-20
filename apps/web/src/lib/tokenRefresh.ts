import api from '@/api/axios';

const EXP_MS = parseInt(import.meta.env.VITE_ACCESS_TOKEN_EXP_MS ?? '900000');
const BUFFER_MS = 2 * 60 * 1000;
const DELAY_MS = Math.max(0, EXP_MS - BUFFER_MS);

let timerId: ReturnType<typeof setTimeout> | null = null;

async function doRefresh() {
  try {
    await api.post('/auth/refresh');
    schedule();
  } catch {
    clear();
  }
}

function schedule() {
  clear();
  timerId = setTimeout(doRefresh, DELAY_MS);
}

function clear() {
  if (timerId !== null) {
    clearTimeout(timerId);
    timerId = null;
  }
}

export { schedule as scheduleTokenRefresh, clear as clearTokenRefresh };
