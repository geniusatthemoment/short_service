import "dotenv/config";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { nanoid } from "nanoid";
import { z } from "zod";
import { query } from "./db.js";

const app = express();
const port = Number(process.env.PORT || 3000);
const reservedRoutes = new Set(["api", "health", "favicon.ico"]);

const createLinkSchema = z.object({
  url: z
    .string()
    .trim()
    .url("Введите корректный URL")
    .refine((value) => ["http:", "https:"].includes(new URL(value).protocol), {
      message: "Поддерживаются только http и https ссылки",
    }),
  customCode: z
    .string()
    .trim()
    .min(3, "Код должен быть не короче 3 символов")
    .max(32, "Код должен быть не длиннее 32 символов")
    .regex(/^[a-zA-Z0-9_-]+$/, "Используйте латиницу, цифры, дефис или подчёркивание")
    .optional()
    .or(z.literal("")),
});

app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  }),
);
app.use(express.json({ limit: "32kb" }));

function getBaseUrl(req) {
  return process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get("host")}`;
}

function formatLink(row, req) {
  return {
    id: row.id,
    url: row.original_url,
    code: row.code,
    shortUrl: `${getBaseUrl(req)}/${row.code}`,
    clicks: row.clicks,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function generateAvailableCode() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = nanoid(7);
    const existing = await query("SELECT 1 FROM links WHERE code = $1", [code]);

    if (existing.rowCount === 0) {
      return code;
    }
  }

  throw new Error("Не удалось сгенерировать уникальный код");
}

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/links", async (req, res, next) => {
  try {
    const result = await query(
      "SELECT * FROM links ORDER BY created_at DESC LIMIT 20",
    );

    res.json({ links: result.rows.map((row) => formatLink(row, req)) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/links", async (req, res, next) => {
  try {
    const payload = createLinkSchema.parse(req.body);
    const requestedCode = payload.customCode || null;
    const code = requestedCode || (await generateAvailableCode());

    if (reservedRoutes.has(code.toLowerCase())) {
      return res.status(409).json({ message: "Этот короткий код зарезервирован" });
    }

    const result = await query(
      `INSERT INTO links (original_url, code)
       VALUES ($1, $2)
       RETURNING *`,
      [payload.url, code],
    );

    res.status(201).json({ link: formatLink(result.rows[0], req) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: error.errors[0]?.message || "Некорректные данные" });
    }

    if (error.code === "23505") {
      return res.status(409).json({ message: "Такой короткий код уже занят" });
    }

    next(error);
  }
});

app.get("/api/links/:code/stats", async (req, res, next) => {
  try {
    const result = await query("SELECT * FROM links WHERE code = $1", [req.params.code]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Ссылка не найдена" });
    }

    res.json({ link: formatLink(result.rows[0], req) });
  } catch (error) {
    next(error);
  }
});

app.get("/:code", async (req, res, next) => {
  try {
    const { code } = req.params;

    if (reservedRoutes.has(code.toLowerCase())) {
      return res.status(404).json({ message: "Not found" });
    }

    const result = await query(
      `UPDATE links
       SET clicks = clicks + 1, updated_at = NOW()
       WHERE code = $1
       RETURNING original_url`,
      [code],
    );

    if (result.rowCount === 0) {
      return res.status(404).send("Ссылка не найдена");
    }

    res.redirect(302, result.rows[0].original_url);
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  const payload = { message: "Внутренняя ошибка сервера" };

  if (process.env.NODE_ENV !== "production") {
    payload.details = error?.message || "unknown error";
  }

  res.status(500).json(payload);
});

app.listen(port, () => {
  console.log(`Short service API is running on http://localhost:${port}`);
});
