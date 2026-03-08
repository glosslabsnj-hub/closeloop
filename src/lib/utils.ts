import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Returns "an" if word starts with a vowel sound, "a" otherwise. */
export function indefiniteArticle(word: string): string {
  if (!word) return "a";
  return /^[aeiou]/i.test(word.trim()) ? "an" : "a";
}
