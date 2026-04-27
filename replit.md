# The Occult - 失败实验分享平台

## Overview

**The Occult** is a darkly-humorous failed experiment sharing platform for graduate students and researchers. Platform slogan: "失败是成功TA妈，我来帮你避坑".

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite + TailwindCSS (at `/`)
- **API framework**: Express 5 (at `/api`)
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Auth**: Cookie sessions via `cookie-session`
- **Build**: esbuild (CJS bundle)
- **File storage**: Replit Object Storage (GCS-backed, presigned URL flow)

## Artifacts

- `artifacts/the-occult` — React + Vite frontend at `/`
- `artifacts/api-server` — Express API server at `/api`

## Key Pages

- `/` — Home feed with stats and trending experiments
- `/auth` — VOID_TERMINAL AI conversational login/register
- `/wall` — Personal failure library (requires login): shows only the current user's own failure stories as cards with "查看详情" and "删除" actions, plus paginated browsing and submit modal (image upload, video upload/URL, AI title+description suggestions)
- `/wall/:id` — Individual failure story detail page with comments
- `/experiments/:id` — Full experiment detail with comments
- `/submit` — Submit new failed experiment
- `/admin` — Admin-only control panel (isAdmin=true required): platform stats, user management (promote/demote/delete), failure story moderation, experiment moderation, comment moderation, report handling
- `/users/:id` — Public user profile page (experiments / comments / bookmarks tabs)
- `/explore` — Browse all experiments with filters + tag cloud sidebar

## DB Schema

- `users` — user accounts with research field info; `isAdmin` boolean flag (default false) controls admin access
- `experiments` — failed experiment records (includes `image_paths TEXT[]`, `video_urls TEXT[]`)
- `comments` — comments on experiments
- `comment_votes` — per-user up/downvote on comments (composite unique: comment_id + user_id, vote: 1 or -1)
- `likes` — like/unlike experiments (unique per user+experiment)
- `user_collections` — bookmarked experiments (userId+experimentId PK, createdAt)
- `notifications` — notifications for comment replies, likes, etc.
- `tags` — global tag registry (id, name unique, createdAt)
- `experiment_tags` — experiment↔tag many-to-many (experimentId+tagId composite PK)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## API Routes

All routes under `/api`:
- `POST /auth/register` — register new user
- `POST /auth/login` — login
- `POST /auth/logout` — logout
- `GET /auth/me` — get current user
- `GET /experiments` — list experiments (pagination, filter, sort)
- `POST /experiments` — create experiment (auth required)
- `GET /experiments/trending` — get top liked experiments
- `GET /experiments/:id` — get experiment detail with comments
- `PATCH /experiments/:id` — update experiment (author only)
- `DELETE /experiments/:id` — delete experiment (author only)
- `POST /experiments/:id/like` — toggle like
- `GET /experiments/:id/comments` — list comments
- `POST /experiments/:id/comments` — add comment (auth required)
- `POST /comments/:id/vote` — toggle up/downvote on comment (auth required, body: `{ voteType: 1 | -1 }`)
- `GET /stats/overview` — platform stats
- `GET /stats/failure-reasons` — failure reason counts
- `GET /stats/categories` — category counts
- `GET /users/:id` — public user profile (displayName, bio, researchField, experimentCount, totalLikes)
- `GET /users/:id/experiments` — user's experiments (ordered by newest)
- `GET /users/:id/comments` — user's comments with experiment title context (limit 50)
- `GET /users/:id/collections` — user's collected experiments (newest first)
- `POST /comments/:id/reply` — reply to a comment (auth required, creates child comment with parentId)
- `POST /experiments/:id/collect` — toggle collect on (auth required)
- `DELETE /experiments/:id/collect` — remove collect (auth required)

- `GET /failures?mine=true&page&limit` — returns only the current user's failures (personal library, requires auth)
- `DELETE /failures/:id` — delete own failure post (owner or admin only, requires auth)

### Admin API Routes (require isAdmin session)

- `GET /admin/stats` — platform-wide counts (users, experiments, failures, comments, reports)
- `GET /admin/users?page&search` — paginated user list with search
- `PATCH /admin/users/:id` — toggle isAdmin flag `{ isAdmin: boolean }`
- `DELETE /admin/users/:id` — delete user (cannot delete self)
- `GET /admin/failures?page&search` — paginated failure wall posts
- `DELETE /admin/failures/:id` — delete failure post
- `GET /admin/experiments?page&search` — paginated experiments
- `DELETE /admin/experiments/:id` — delete experiment
- `GET /admin/comments?page` — paginated failure comments
- `DELETE /admin/comments/:id` — delete comment
- `GET /admin/reports?page` — paginated comment reports
- `DELETE /admin/reports/:id` — dismiss report (keeps comment)
- `DELETE /admin/reports/:id/comment` — delete the reported comment (and report)

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
