// 文件名: lib/utils.ts
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Merges Tailwind CSS classes using clsx and tailwind-merge.
 * Handles conditional classes and prevents style conflicts.
 * @param inputs - Class values to merge (strings, objects, arrays).
 * @returns A string of combined and optimized class names.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 格式化数字，使用千位分隔符。
 * @param num - 要格式化的数字。
 * @returns 格式化后的字符串，例如 "1,234,567"，如果输入无效则返回 "-"。
 */
export const formatNumber = (num: number): string => {
  if (isNaN(num) || num === null || num === undefined) return "-";
  return num.toLocaleString(); // 使用 localeString 实现千位分隔符
};

/**
 * 将数字格式化为紧凑形式（B, M, K）。
 * @param num - 要格式化的数字。
 * @returns 紧凑格式的字符串，例如 "1.2B", "3.5M", "1.0K"，如果输入无效则返回 "-"。
 */
export const formatNumberCompact = (num: number): string => {
  if (isNaN(num) || num === null || num === undefined) return "-";
  // 使用下划线提高可读性
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(2) + "B";
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(2) + "K";
  return num.toString();
};

/**
 * 格式化时间（秒），保留两位小数并添加 "s" 后缀。
 * @param seconds - 时间，单位为秒。
 * @returns 格式化后的时间字符串，例如 "1.23s"，如果输入无效则返回 "-"。
 */
export const formatTime = (seconds: number): string => {
  // Check for undefined as well
  if (isNaN(seconds) || seconds === null || seconds === undefined) return "-";
  return seconds.toFixed(2) + "s";
};

/**
 * 格式化成功率，转换为百分比并保留两位小数，添加 "%" 后缀。
 * @param rate - 成功率（0到1之间的小数）。
 * @returns 格式化后的百分比字符串，例如 "95.50%"，如果输入无效则返回 "-"。
 */
export const formatPercent = (rate: number): string => {
  // Check for undefined as well
  if (isNaN(rate) || rate === null || rate === undefined) return "-";
  return (rate * 100).toFixed(2) + "%";
};

/**
 * 根据成功率获取对应的 Tailwind CSS 文本颜色类。
 * @param rate - 成功率（0到1之间的小数）。
 * @returns Tailwind CSS 颜色类字符串。
 */
export const getSuccessRateColor = (rate: number): string => {
  // Check for undefined as well
  if (isNaN(rate) || rate === null || rate === undefined) return "text-muted-foreground";
  if (rate >= 0.95) return "text-green-600";
  if (rate >= 0.8) return "text-yellow-600";
  return "text-red-600";
};