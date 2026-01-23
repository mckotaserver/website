import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import {
  articleRevisions,
  articles,
  categories,
  images,
  users,
} from "./schema";

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;

export type Category = InferSelectModel<typeof categories>;
export type NewCategory = InferInsertModel<typeof categories>;

export type Article = InferSelectModel<typeof articles>;
export type NewArticle = InferInsertModel<typeof articles>;

export type ArticleRevision = InferSelectModel<typeof articleRevisions>;
export type NewArticleRevision = InferInsertModel<typeof articleRevisions>;

export type Image = InferSelectModel<typeof images>;
export type NewImage = InferInsertModel<typeof images>;
