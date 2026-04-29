export type JobPhase =
  | "pending"
  | "fetching-list"
  | "fetching-bodies"
  | "building-excel"
  | "done"
  | "error";

export interface Job {
  id: string;
  status: "running" | "done" | "error";
  phase: JobPhase;
  fetched: number;
  bodiesDone: number;
  total: number;
  buffer?: Buffer;
  error?: string;
  createdAt: number;
}

const jobs = new Map<string, Job>();

export function createJob(): Job {
  const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
  const job: Job = {
    id,
    status: "running",
    phase: "pending",
    fetched: 0,
    bodiesDone: 0,
    total: 0,
    createdAt: Date.now(),
  };
  jobs.set(id, job);
  return job;
}

export function getJob(id: string): Job | null {
  return jobs.get(id) ?? null;
}

export function updateJob(id: string, update: Partial<Job>) {
  const job = jobs.get(id);
  if (job) jobs.set(id, { ...job, ...update });
}

export function deleteJob(id: string) {
  jobs.delete(id);
}

// Clean up completed jobs older than 15 minutes
setInterval(() => {
  const cutoff = Date.now() - 15 * 60 * 1000;
  Array.from(jobs.entries()).forEach(([id, job]) => {
    if (job.createdAt < cutoff) jobs.delete(id);
  });
}, 60000);
