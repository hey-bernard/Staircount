# Staircount — 나만의 AI 운동 코치

운동 기록을 자유롭게 남기고, AI 에이전트가 실제 기록과 목표를 근거로 맞춤 운동 가이드를 제공하는 개인용 피트니스 코치 앱입니다.

## 주요 기능

- **운동 기록**: 근력/유산소/스트레칭/스포츠 등 어떤 운동이든 세트·횟수·무게·시간·거리·칼로리·RPE·메모를 자유롭게 남길 수 있습니다.
- **목표 관리**: 체중 감량, 근력 향상, 지구력 향상 등 목표를 만들고 진행 상태(진행 중/달성/중단)를 관리합니다.
- **AI 운동 코치**: Claude API 기반 에이전트가 도구(tool use)를 통해 최근 운동 기록·통계·목표를 직접 조회한 뒤, 그 데이터를 근거로 대화형으로 코칭합니다. 대화 중 "오늘 스쿼트 3세트 10회 60kg 했어" 같은 말을 하면 에이전트가 알아서 운동 일지에 기록해 줍니다.
- **대시보드**: 최근 7일 운동 횟수, 누적 기록, 진행 중인 목표를 한눈에 확인합니다.

## 기술 스택

- [Next.js 16](https://nextjs.org) (App Router, Server Actions, TypeScript)
- [Prisma](https://www.prisma.io) + [Supabase](https://supabase.com) (Postgres, 배포 환경에서도 그대로 동작)
- [Anthropic SDK](https://github.com/anthropics/anthropic-sdk-typescript) (`claude-opus-5`, tool use / agentic loop)
- Tailwind CSS 4

## 시작하기 (로컬 개발)

1. [Supabase](https://supabase.com)에서 프로젝트를 만들고 **Project Settings → Database → Connection string**에서
   - `DATABASE_URL` (포트 6543, Transaction pooler)
   - `DIRECT_URL` (포트 5432, Direct connection)
   두 개를 복사합니다. (자세한 형식은 `.env.example` 참고)
2. 아래 명령을 실행합니다.

```bash
npm install        # postinstall에서 prisma generate 자동 실행
cp .env.example .env
# .env에 DATABASE_URL, DIRECT_URL, ANTHROPIC_API_KEY를 채워주세요
npx prisma migrate deploy   # 최초 1회, Supabase에 테이블 생성
npm run dev
```

[http://localhost:3000](http://localhost:3000) 에서 확인할 수 있습니다.

## Vercel 배포

1. **Supabase 프로젝트 준비**: 위 "시작하기"의 1번과 동일 (아직 안 만들었다면 [supabase.com](https://supabase.com)에서 무료로 생성, DB 비밀번호는 프로젝트 생성 시 직접 설정).
2. **Vercel에 저장소 임포트**: [vercel.com/new](https://vercel.com/new)에서 이 GitHub 저장소(`hey-bernard/Staircount`)를 선택해 Import (Framework Preset은 Next.js로 자동 인식됩니다).
3. **환경 변수 설정**: Vercel 프로젝트의 **Settings → Environment Variables**에 아래 3개를 추가합니다.
   - `DATABASE_URL` — Supabase pooled connection string (포트 6543)
   - `DIRECT_URL` — Supabase direct connection string (포트 5432)
   - `ANTHROPIC_API_KEY` — Anthropic API 키
4. **Deploy** 클릭. 빌드 시 `prisma migrate deploy`가 자동으로 실행되어 Supabase에 테이블이 생성된 뒤 앱이 빌드됩니다(`package.json`의 `build` 스크립트 참고). 이후 `main`(또는 배포 브랜치)에 푸시할 때마다 자동으로 재배포됩니다.

## 프로젝트 구조

```
prisma/schema.prisma       # WorkoutLog, Goal, CoachMessage 모델
src/lib/agent.ts           # AI 코치 에이전트 (tool use 정의 + 실행)
src/lib/prisma.ts          # Prisma Client 싱글턴
src/app/workouts/          # 운동 기록 CRUD (Server Actions)
src/app/goals/             # 목표 CRUD (Server Actions)
src/app/coach/             # AI 코치 채팅 UI
src/app/api/coach/route.ts # 채팅 API (사용자 메시지 저장 → 에이전트 실행 → 응답 저장)
```

AI 코치는 다음 도구를 사용해 실제 데이터를 조회하거나 기록합니다: `get_recent_workouts`, `get_workout_stats`, `get_goals`, `log_workout`, `create_goal` (`src/lib/agent.ts` 참고).
