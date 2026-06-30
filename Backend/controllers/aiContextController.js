const crypto = require("crypto");
const User = require("../models/Auth/user");
const AIUsage = require("../models/AI/AIUsageModel");
const AIExplanationCache = require("../models/AI/AIExplanationCacheModel");

const PREMIUM_MONTHLY_LIMIT = Number(process.env.AI_PREMIUM_MONTHLY_LIMIT || 200);
const PREMIUM_YEARLY_LIMIT = Number(process.env.AI_PREMIUM_YEARLY_LIMIT || 300);
const INTERNAL_LIMIT = Number(process.env.AI_INTERNAL_LIMIT || 1000000);
const CACHE_TTL_DAYS = Number(process.env.AI_EXPLANATION_CACHE_DAYS || 30);

function currentPeriod(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function nextPeriodStart(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1, 0, 0, 0));
}

function estimateTokens(text) {
  return Math.ceil((text || "").length / 4);
}

function hashText(text) {
  return crypto.createHash("sha256").update(text || "").digest("hex");
}

function buildCacheKey({ selectedText, context, targetLanguage }) {
  const normalizedSelected = selectedText.trim().toLowerCase();
  const contextHash = hashText((context || "").trim().toLowerCase());
  const raw = `${targetLanguage || "vi"}:${normalizedSelected}:${contextHash}`;
  return {
    cacheKey: hashText(raw),
    contextHash,
  };
}

async function getUserAccess(userId) {
  const user = await User.findById(userId).select("isPremium premiumExpiresAt role").lean();
  if (!user) return { found: false };

  if (user.role === "admin" || user.role === "tester") {
    return { found: true, premium: true, role: user.role, limit: INTERNAL_LIMIT };
  }

  const now = new Date();
  const premium = Boolean(user.isPremium && (user.premiumExpiresAt === null || user.premiumExpiresAt > now));
  return {
    found: true,
    premium,
    role: user.role || "user",
    limit: premium ? PREMIUM_MONTHLY_LIMIT : 0,
  };
}

async function getUsageDocument(userId, period = currentPeriod()) {
  return AIUsage.findOneAndUpdate(
    { userId, period },
    { $setOnInsert: { userId, period } },
    { upsert: true, new: true }
  );
}

function usagePayload({ access, usage, period = currentPeriod() }) {
  const used = usage?.requestCount || 0;
  const limit = access.limit;
  return {
    premium: Boolean(access.premium),
    used,
    limit,
    remaining: Math.max(0, limit - used),
    resetsAt: nextPeriodStart().toISOString(),
    period,
  };
}

function fallbackExplanation({ selectedText, context }) {
  const clean = selectedText.trim();
  const contextHint = context?.trim()
    ? "Nghĩa chính xác phụ thuộc vào câu xung quanh. Hãy đọc cụm này cùng đoạn văn để chọn nghĩa tự nhiên nhất."
    : "Chưa có ngữ cảnh đi kèm, nên đây là giải thích học tập ở mức tổng quát.";

  return {
    selectedText: clean,
    simpleMeaningVi: clean,
    contextMeaningVi: contextHint,
    wordType: clean.includes(" ") ? "phrase" : "word",
    breakdown: clean.split(/\s+/).slice(0, 8).map((part) => ({
      part,
      meaningVi: "Cần ngữ cảnh hoặc dictionary để chọn nghĩa chính xác.",
    })),
    example: context?.trim() || `Try to use "${clean}" in your own sentence.`,
    saveSuggestion: {
      term: clean,
      meaning: clean,
    },
  };
}

async function callAIProvider(payload) {
  const providerUrl = process.env.AI_CONTEXT_API_URL;
  const providerKey = process.env.AI_CONTEXT_API_KEY;

  if (!providerUrl || typeof fetch !== "function") {
    return fallbackExplanation(payload);
  }

  const response = await fetch(providerUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(providerKey ? { Authorization: `Bearer ${providerKey}` } : {}),
    },
    body: JSON.stringify({
      task: "context_explanation",
      selectedText: payload.selectedText,
      context: payload.context,
      targetLanguage: payload.targetLanguage || "vi",
      responseFormat: {
        selectedText: "string",
        simpleMeaningVi: "string",
        contextMeaningVi: "string",
        wordType: "string",
        breakdown: [{ part: "string", meaningVi: "string" }],
        example: "string",
        saveSuggestion: { term: "string", meaning: "string" },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`AI provider failed with ${response.status}`);
  }

  const json = await response.json();
  return {
    selectedText: json.selectedText || payload.selectedText,
    simpleMeaningVi: json.simpleMeaningVi || payload.selectedText,
    contextMeaningVi: json.contextMeaningVi || "",
    wordType: json.wordType || "phrase",
    breakdown: Array.isArray(json.breakdown) ? json.breakdown : [],
    example: json.example || payload.context || "",
    saveSuggestion: json.saveSuggestion || {
      term: payload.selectedText,
      meaning: json.simpleMeaningVi || payload.selectedText,
    },
  };
}

const getAIUsage = async (req, res) => {
  try {
    const access = await getUserAccess(req.userId);
    if (!access.found) return res.status(404).json({ message: "User not found" });

    const period = currentPeriod();
    const usage = await getUsageDocument(req.userId, period);
    return res.status(200).json(usagePayload({ access, usage, period }));
  } catch (error) {
    console.error("[getAIUsage] Error:", error);
    return res.status(500).json({ message: "Failed to fetch AI usage" });
  }
};

const explainInContext = async (req, res) => {
  try {
    const access = await getUserAccess(req.userId);
    if (!access.found) return res.status(404).json({ message: "User not found" });
    if (!access.premium) return res.status(403).json({ message: "Premium is required for AI Context Help" });

    const selectedText = String(req.body.selectedText || "").trim();
    const context = String(req.body.context || "").trim();
    const source = String(req.body.source || "unknown").trim();
    const sourceId = req.body.sourceId ? String(req.body.sourceId).trim() : null;
    const targetLanguage = String(req.body.targetLanguage || "vi").trim() || "vi";

    if (!selectedText) return res.status(400).json({ message: "selectedText is required" });
    if (selectedText.length > 120) return res.status(400).json({ message: "selectedText must be 120 characters or fewer" });
    if (context.length > 1500) return res.status(400).json({ message: "context must be 1500 characters or fewer" });

    const { cacheKey, contextHash } = buildCacheKey({ selectedText, context, targetLanguage });
    const cached = await AIExplanationCache.findOne({ cacheKey }).lean();
    const period = currentPeriod();
    const usage = await getUsageDocument(req.userId, period);

    if (cached) {
      return res.status(200).json({
        ...cached.response,
        cached: true,
        usage: usagePayload({ access, usage, period }),
      });
    }

    if (usage.requestCount >= access.limit) {
      return res.status(429).json({
        message: "AI quota reached for this month",
        usage: usagePayload({ access, usage, period }),
      });
    }

    const explanation = await callAIProvider({ selectedText, context, source, sourceId, targetLanguage });
    const inputTokens = estimateTokens(`${selectedText}\n${context}`);
    const outputTokens = estimateTokens(JSON.stringify(explanation));

    usage.requestCount += 1;
    usage.inputTokens += inputTokens;
    usage.outputTokens += outputTokens;
    usage.lastUsedAt = new Date();
    await usage.save();

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + CACHE_TTL_DAYS);
    await AIExplanationCache.findOneAndUpdate(
      { cacheKey },
      {
        cacheKey,
        selectedText,
        contextHash,
        targetLanguage,
        response: explanation,
        expiresAt,
      },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      ...explanation,
      cached: false,
      usage: usagePayload({ access, usage, period }),
    });
  } catch (error) {
    console.error("[explainInContext] Error:", error);
    return res.status(500).json({ message: "Failed to explain selected text" });
  }
};

module.exports = {
  getAIUsage,
  explainInContext,
};
