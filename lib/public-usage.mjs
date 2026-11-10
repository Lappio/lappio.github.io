// Public snapshots use an explicit allowlist so future private metadata cannot slip through.
const totalFields = ["tokens", "requests", "cost", "newInputTokens", "outputTokens",
  "cacheReadTokens", "cacheCreationTokens", "cacheHitRate"];
const dayFields = ["tokens", "requests", "cost", "newInputTokens"];

function requireKeys(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || Object.keys(value).sort().join(",") !== [...keys].sort().join(",")) {
    throw new Error(`公开数据无效：${label} 字段不符合白名单。`);
  }
}

function requireDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)
    || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) {
    throw new Error(`公开数据无效：日期 ${value}。`);
  }
}

function requireStatistics(value, fields, label) {
  requireKeys(value, fields, label);
  for (const key of fields) {
    const number = value[key];
    if (!Number.isFinite(number) || number < 0
      || (key === "cacheHitRate" && number > 1)
      || (!["cost", "cacheHitRate"].includes(key) && !Number.isSafeInteger(number))) {
      throw new Error(`公开数据无效：${label}.${key} 必须是有效的非负统计值。`);
    }
  }
}

export function validatePublicUsage(data) {
  requireKeys(data, ["generatedAt", "range", "totals", "days"], "snapshot");
  if (typeof data.generatedAt !== "string" || !Number.isFinite(Date.parse(data.generatedAt))) {
    throw new Error("公开数据无效：generatedAt 不是时间戳。");
  }
  requireKeys(data.range, ["start", "end"], "range");
  requireStatistics(data.totals, totalFields, "totals");
  if (!data.days || typeof data.days !== "object" || Array.isArray(data.days)) {
    throw new Error("公开数据无效：days 不是日期映射。");
  }
  const dates = Object.keys(data.days).sort();
  for (const date of dates) {
    requireDate(date);
    requireStatistics(data.days[date], dayFields, `days.${date}`);
  }
  if (data.range.start !== (dates[0] ?? null) || data.range.end !== (dates.at(-1) ?? null)) {
    throw new Error("公开数据无效：range 与 days 不一致。");
  }
  return data;
}
