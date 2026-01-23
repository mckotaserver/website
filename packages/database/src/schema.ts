import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

const timestampColumns = {
  createdAt: text("created_at").notNull().default("(unixepoch())"),
  updatedAt: text("updated_at").notNull().default("(unixepoch())"),
};

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["admin", "moderator", "editor"] })
    .notNull()
    .default("editor"),
  ...timestampColumns,
});

export const categories = sqliteTable("categories", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestampColumns,
});

export const articles = sqliteTable("articles", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  categoryId: text("category_id").references(() => categories.id, {
    onDelete: "set null",
  }),
  status: text("status", { enum: ["draft", "published", "archived"] })
    .notNull()
    .default("draft"),
  authorId: text("author_id").references(() => users.id, {
    onDelete: "set null",
  }),
  publishedAt: text("published_at"),
  ...timestampColumns,
});

export const articleRevisions = sqliteTable("article_revisions", {
  id: text("id").primaryKey(),
  articleId: text("article_id")
    .notNull()
    .references(() => articles.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  editorId: text("editor_id").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: text("created_at").notNull().default("(unixepoch())"),
});

export const images = sqliteTable("images", {
  id: text("id").primaryKey(),
  filename: text("filename").notNull(),
  r2Key: text("r2_key").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  uploaderId: text("uploader_id").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: text("created_at").notNull().default("(unixepoch())"),
});
