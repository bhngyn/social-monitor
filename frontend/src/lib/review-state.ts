"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "sm-source-reviewed";
type ReviewedMap = Record<string, string>; // sourceId -> ISO timestamp

const listeners = new Set<() => void>();
const EMPTY: ReviewedMap = {};

let cachedRaw: string | null = null;
let cachedMap: ReviewedMap = EMPTY;

function emit() { listeners.forEach((l) => l()); }

function readMap(): ReviewedMap {
  if (typeof window === "undefined") return EMPTY;
  const raw = localStorage.getItem(STORAGE_KEY) ?? "";
  if (raw === cachedRaw) return cachedMap;
  cachedRaw = raw;
  try { cachedMap = raw ? JSON.parse(raw) : EMPTY; }
  catch { cachedMap = EMPTY; }
  return cachedMap;
}

function writeMap(map: ReviewedMap) {
  const serialized = JSON.stringify(map);
  localStorage.setItem(STORAGE_KEY, serialized);
  cachedRaw = serialized;
  cachedMap = map;
  emit();
}

export function getReviewedAt(sourceId: string): Date | null {
  const m = readMap();
  const v = m[sourceId];
  return v ? new Date(v) : null;
}

export function markSourceReviewed(sourceId: string, at: Date = new Date()) {
  const m = readMap();
  m[sourceId] = at.toISOString();
  writeMap(m);
}

export function markAllReviewed(sourceIds: string[], at: Date = new Date()) {
  const m = readMap();
  for (const id of sourceIds) m[id] = at.toISOString();
  writeMap(m);
}

export function clearReviewState() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  emit();
}

export function isPostNew(
  post: { source_id: string; created_at?: string; post_timestamp?: string | null },
  reviewedMap: ReviewedMap
): boolean {
  const reviewed = reviewedMap[post.source_id];
  if (!reviewed) return true; // never reviewed -> always new
  const postTime = new Date(post.created_at || post.post_timestamp || 0).getTime();
  return postTime > new Date(reviewed).getTime();
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => { if (e.key === STORAGE_KEY) cb(); };
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
  };
}

export function useReviewState(): ReviewedMap {
  return useSyncExternalStore(subscribe, readMap, () => EMPTY);
}
