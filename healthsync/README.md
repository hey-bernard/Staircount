# 건강 앱 연동 (단축어 + 웹훅 브릿지)

Mac/Xcode 없이, 브라우저와 아이폰만으로 Apple Health의 **"오른 층수"** 를 Staircount에 자동으로 채워 넣는 방법입니다.

⚠️ **Apple Health는 내려간 층수를 기록하지 않습니다.** 이 연동은 오르기(층수)만 자동으로 가져오고, 내리기는 계속 앱에서 수동으로 기록해야 합니다.

전체 흐름: `아이폰 Health 앱 → 단축어 자동화 → Cloudflare Worker(중계 서버) → Staircount 웹앱이 조회`

---

## 1단계 — Cloudflare Worker 배포 (브라우저에서만, 5분)

1. https://dash.cloudflare.com 에서 무료 계정 생성/로그인
2. 왼쪽 메뉴 **Workers & Pages** → **Create** → **Create Worker** 선택, 이름은 원하는 대로 (예: `staircount-healthsync`)
3. 배포되면 **Edit code** (Quick edit) 버튼을 눌러 온라인 에디터를 엽니다
4. 이 저장소의 `healthsync/worker.js` 내용을 전부 복사해서 붙여넣고 **Deploy**
5. **Settings → Variables and Secrets** 로 이동해 두 가지를 추가:
   - **KV Namespace 바인딩**: `Settings → Bindings → Add → KV Namespace` — Variable name은 정확히 `HEALTH_KV`, 네임스페이스는 새로 만들기 (예: `staircount-health`)
   - **Secret 변수**: `SYNC_TOKEN` 이름으로, 아무 임의의 긴 문자열(비밀번호처럼) 하나 생성해서 저장 — 이 값은 나중에 단축어와 앱 양쪽에 똑같이 입력해야 합니다
6. 저장하면 Worker 주소가 `https://staircount-healthsync.<your-subdomain>.workers.dev` 형태로 생깁니다 — 이 URL을 기억해두세요

## 2단계 — 아이폰 단축어 자동화 만들기

1. **단축어(Shortcuts) 앱** 실행 → **자동화** 탭 → **+** → **개인 자동화 생성**
2. 트리거는 원하는 대로 선택 (예: **시간** — 매일 아침, 또는 **앱** — Staircount를 열 때마다 실행되도록 "Safari 앱 시작 시" 등). "실행 전 확인" 옵션은 꺼두면 자동으로 조용히 실행됩니다
3. **동작 추가**:
   - **"건강 표본 가져오기"** (또는 "Get Health Sample") → 종류: **오른 계단 수(Flights Climbed)**, 기간: **오늘**
   - **"건강 표본 가져오기"** 한 번 더 추가 → 종류: **걸음 수(Steps)**, 기간: **오늘** (선택 사항)
   - **"사전(Dictionary)"** 동작 추가 → 키 3개 구성:
     - `flightsClimbed` : 첫 번째 건강 표본 결과
     - `steps` : 두 번째 건강 표본 결과
     - `date` : 오늘 날짜를 `YYYY-MM-DD` 형식으로 (텍스트 동작 + 서식 지정 날짜 활용)
   - **"URL의 콘텐츠 가져오기"** (Get Contents of URL) 동작 추가:
     - URL: `https://<1단계에서 만든 Worker 주소>/sync`
     - 메서드: **POST**
     - 헤더: `X-Sync-Token` = 1단계에서 만든 `SYNC_TOKEN` 값
     - 요청 본문: **JSON**, 위에서 만든 사전을 그대로 전달
4. 저장. 이제 자동화가 실행될 때마다 오늘의 "오른 층수"가 Worker로 전송됩니다

## 3단계 — Staircount 앱에서 연결

1. Staircount 앱 ⚙️ 설정 → **건강 앱 연동** 항목에 Worker URL과 SYNC_TOKEN 입력
2. **지금 동기화** 버튼으로 즉시 테스트, 혹은 앱을 열 때마다 자동으로 최신 값을 불러옵니다
3. 홈 화면의 "건강 앱 연동" 카드에 오늘 오른 층수·걸음 수·마지막 동기화 시각이 표시됩니다

## 참고

- 무료 Cloudflare Workers 플랜은 하루 요청 10만 건까지 무료라 이 용도로는 비용이 들지 않습니다
- `SYNC_TOKEN`은 비밀번호이므로 타인과 공유하지 마세요 — 유출되면 누구든 해당 Worker에 값을 덮어쓸 수 있습니다
- 앱의 "오늘 오른 계단"(수동 탭 기반, 개별 계단 칸수)과 "건강 앱 오른 층수"(Health 기준, 약 10피트=1개 층)는 단위가 달라 서로 합산하지 않고 별도로 표시됩니다

---

# 실시간 센서 스트림 (Sensor Logger 앱, 베타)

단축어 브릿지는 하루 한 번 정도 동기화하는 용도예요. **운동하는 동안 실시간으로**, 그것도 **오르기·내리기 둘 다** 잡고 싶다면 무료 앱 **"Sensor Logger"**(개발자: tszheichoi/Kelvin Choi, App Store)를 쓰는 방법이 있습니다. 이 앱은 백그라운드에서 가속도계·자이로·**기압계(고도)**·걸음수를 계속 기록하고, 지정한 서버로 실시간 HTTP 전송(Push)까지 지원합니다 — Apple Health의 "오른 층수"보다 데이터 소스가 좋습니다 (기압계는 내려가는 것도 잡히니까요).

⚠️ **베타 단계입니다.** 앱마다/기기마다 정확히 어떤 필드명으로 데이터가 오는지 아직 실기기로 확인 전이라, 지금은 **원본 값을 그대로 보여주기만** 합니다. 정확한 층수 자동 계산 로직은 실제 값을 확인한 뒤 추가할 예정이에요.

## 설정 방법

1. App Store에서 **"Sensor Logger"** 검색해 설치 (무료)
2. 앱에서 **Pedometer**, **Barometer** 센서를 켜기
3. 설정에서 **HTTP Push** (또는 Data Streaming) 기능을 켜고:
   - URL: `https://<위에서 만든 Worker 주소>/sensorpush?token=<SYNC_TOKEN>`
   - Batch 주기(배치 간격): **15~30초 권장** — 너무 짧게 하면 Cloudflare 무료 플랜의 하루 쓰기 한도(1,000건)를 금방 소진합니다
4. 기록 시작
5. Staircount 앱의 "실시간 센서 스트림" 카드에서 **지금 확인** 또는 **5초마다 자동 갱신**으로 들어오는 원본 값을 확인

## 확인해주시면 좋은 것

실제로 받은 값을 보고 다음을 알려주시면 정확한 층수 계산 로직을 만들어드릴게요:
- Pedometer 값에 `floorsAscended`/`floorsDescended` 같은 필드가 있는지, 아니면 `steps`만 오는지
- Barometer 값에 `altitude`(또는 `relativeAltitude`)가 어떤 단위로, 얼마나 자주 오는지
- 화면을 끄거나 다른 앱으로 전환해도 Push가 계속되는지 (진짜 백그라운드 동작 여부)
