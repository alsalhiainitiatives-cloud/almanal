import type { amsQueue, amsWorkspace } from "./ams.functions";

export type WorkspaceData = Awaited<ReturnType<typeof amsWorkspace>>;
export type QueueRow = Awaited<ReturnType<typeof amsQueue>>[number];
export type WorkspaceChild = WorkspaceData["children"][number];
export type WorkspaceDocument = WorkspaceData["documents"][number];