export interface ActivityContext {
  id: string;
  topicId?: number;
  /** Save a finished attempt through the storage adapter. */
  save: (score: number, max: number, details?: Record<string, unknown>) => Promise<void>;
}

export type ActivityCleanup = (() => void) | void;

export interface ActivityModule {
  mount: (el: HTMLElement, ctx: ActivityContext, param?: string) => ActivityCleanup;
}
