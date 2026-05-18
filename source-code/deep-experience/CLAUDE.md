# DeepExperience - Claude Code Instructions

## Project Overview
訪日観光客向け即時ツアー予約サービス（Uberのツアー版）

## Tech Stack
- **Monorepo**: pnpm workspaces + Turborepo
- **Backend**: Next.js (App Router) on port 8001
- **Mobile**: React Native (Expo Managed workflow, Expo Go for testing)
- **DB**: Prisma + SQLite (dev) / PostgreSQL (prod)
- **Auth**: JWT (Guide/Admin), Guest (Traveler)
- **Shared types**: `packages/shared-types`

## Development Commands
```bash
pnpm dev:backend          # Start backend (port 8001)
pnpm dev:mobile           # Start Expo mobile app
pnpm --filter backend prisma:studio  # Open Prisma Studio
pnpm --filter backend prisma:seed   # Seed database
```

## Constraints
- No Xcode locally — use Expo Go for iOS testing
- If native build needed, use EAS Build (cloud)
- Phase 0: No payment, no auto-matching, English UI only


## PieceDev接続

PieceDev URL（https://www.piecedev.com/projects/...）を渡された場合、以下のDevice Authフローで接続する:

1. URLからprojectIdを抽出
2. 認証開始:
   curl -s -X POST https://www.piecedev.com/api/device-auth/start \\
     -H "Content-Type: application/json" \\
     -d '{"projectId":"<projectId>"}'
   → deviceCode, userCode が返る
3. ユーザーにuserCode（6桁）を伝え、/device で入力してもらう
4. 重要: すぐにポーリングしない。ユーザーに「認証が完了したら教えてください」と伝え、返答を待つ
5. ユーザーの返答後、3秒間隔でpoll:
   curl -s -X POST https://www.piecedev.com/api/device-auth/poll \\
     -H "Content-Type: application/json" \\
     -d '{"deviceCode":"<deviceCode>"}'
   → status: "approved" → apiKey が返る
6. APIキーをBearerトークンとしてMCP APIを呼び出す:
   curl -s -X POST https://www.piecedev.com/api/mcp/streamable \\
     -H "Authorization: Bearer <apiKey>" \\
     -H "Content-Type: application/json" \\
     -H "Accept: application/json, text/event-stream" \\
     -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"<tool>","arguments":{...}},"id":1}'