# 케셰브 최종 재현·릴리스 기록 (RELEASE_RECORD)

학생이 작성한 22단계 기록입니다. 실행 방법과 구성도는 [STUDENT_RUNBOOK.md](STUDENT_RUNBOOK.md)를 따릅니다.

> **이 버전의 상태: 검증 중인 버전(학습용 수료본)입니다.** 실제 운영 인증이나 v1.0 인증이 아닙니다. 실제 SDP·AI 연결과 보안 조치 실집행(19단계)은 아직 연결·확인되지 않았습니다(8장).

---

## 1. 릴리스 정보

| 항목 | 값 |
|---|---|
| 앱 | 케셰브 (KESHEV) — ZTNA & XDR 보안 Agent |
| 시작 틀 | `alekov-client-starter` 0.2.11 (`on-client/package.json`) |
| 저장소 | `https://github.com/gaeun1210/keshev-defense` (공개) |
| 브랜치 | `master` |
| 재현한 커밋 | `126e662326c63488aaf055ce721842a6b269c220` (「보안 Agent 21단계」) |
| 최종 제출 커밋 | 이 문서를 추가한 「보안 Agent 22단계」 커밋 |
| 재현 커밋과 최종 커밋의 차이 | `on-client/docs/RELEASE_RECORD.md` 추가뿐입니다. 코드(`student/extension.mjs`)·실행 도구·설정 견본은 같습니다. 대조 명령: `git diff --stat 126e662 HEAD` |
| 학생 작성 파일 | `on-client/student/extension.mjs`, `on-client/docs/STUDENT_RUNBOOK.md`, `on-client/docs/RELEASE_RECORD.md` |

---

## 2. 재현 환경 (학생 PC에서 확인)

| 항목 | 값 |
|---|---|
| 운영체제 | Windows (학원 PC) |
| Node.js | `v24.22.0` (실행 도구 안내: "수업 기준은 v24.19.0", 22~24 허용 범위라 정상 실행) |
| Git | `git version 2.56.0.windows.2` |
| npm 의존성 | 없음 (`package-lock.json` 없음, 설치 단계 없음) |
| 실행 모드 | `-Demo` (예제 데이터) |
| 원래 작업 폴더 | `%LOCALAPPDATA%\ALEPH\Workbench\projects\케셰브-방어전` — 건드리지 않음 |
| 재현용 새 폴더 | `%USERPROFILE%\keshev-repro\keshev-defense` — 빈 폴더에 새로 받음 |
| 기존 인증·설정 파일 복사 | 하지 않음 (`.env`, 연결 설정 파일 모두 없음) |

---

## 3. 재현 절차 (실제로 입력한 명령)

새 Windows PowerShell 창에서:

```powershell
[Console]::OutputEncoding = [Text.Encoding]::UTF8; $OutputEncoding = [Text.Encoding]::UTF8
mkdir "$env:USERPROFILE\keshev-repro"
cd "$env:USERPROFILE\keshev-repro"
git clone https://github.com/gaeun1210/keshev-defense.git
cd keshev-defense
git checkout 126e662326c63488aaf055ce721842a6b269c220
git rev-parse HEAD
git status --short
cd on-client
node -v
node --check .\student\extension.mjs
powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\start-alekov.ps1 -Demo
```

이후 브라우저에서 `http://127.0.0.1:5189` 확인 → 앱 창 `Ctrl+C`로 종료 → 주소 접속 불가 확인 → 같은 실행 명령으로 재실행 → F5.

---

## 4. 재현 관찰 결과 (학생 진술, 2026-10-26 14:30~14:45 KST 무렵 · 화면 확인 시각 표시 14:32~14:42)

| 순서 | 관찰한 결과 | 판단 |
|---|---|---|
| 새 폴더 받기 | `git clone` 성공(114개 객체), `git checkout` 뒤 "HEAD is now at 126e662 보안 Agent 21단계" | 일치 |
| 커밋 확인 | `git rev-parse HEAD` → `126e662326c63488aaf055ce721842a6b269c220` | 재현 커밋과 일치 |
| 작업 트리 | `git status --short` → 출력 없음 | 받은 파일이 커밋과 같음 |
| 런타임 | `node -v` → `v24.22.0` | 지원 범위 |
| 실행 | "참고: 지금 Node.js 는 v24.22.0 입니다. 수업 기준은 v24.19.0 입니다." / "케셰브 예제: http://127.0.0.1:5189" / "케셰브가 켜졌습니다. 브라우저에서 http://127.0.0.1:5189/ 을 여세요." / "서버가 응답한 것만 확인했습니다. …" / "끄려면 이 창에서 Ctrl+C 를 누르세요." | STUDENT_RUNBOOK 4-1의 정상 시작 신호와 일치 |
| 브라우저 확인 | 배지 「예제 데이터(demo) · 실제 연결 아님」. 보호 현황 학생 칸: 연습 사용자·연습 PC 「주의 · 확인 불가 (unknown)」·practice-session 「정상 · 활성 (active)」 / 「AI 연결 점검」 → 「AI 연결 점검 실패 — 권한 준비 중·확인 불가 (ON_AI_PROVISIONING_PENDING)」 / 「설치 패키지 조회」 → `PROJECT_NOT_CONFIGURED` / 업무 앱: library 「접근 허용 (allow)」, repository 「접근 거부 (deny)」, approval 「추가 인증 또는 확인 필요 (challenge)」와 판정 이유·시각 / 보안 기록: 「event-01 상세」(e-01, rule-01, 접속 거부됨·세션 활성·기기 확인 불가), 「AI 설명 요청」 → AI 설명 실패(권한 준비 중). 학생이 화면을 캡처해 확인 | 예제 모드 기준 일치 |
| 종료 | `Ctrl+C` 뒤 새 탭에서 주소를 열면 「연결할 수 없습니다」 | 종료 확인 |
| 재실행 | 같은 명령으로 다시 켠 뒤 F5 → 정상 표시 | 재실행 확인 |
| 원래 폴더 보존 (확인 1) | 원래 폴더에서 `git log --oneline -3` → `126e662 (HEAD -> master, origin/master) 보안 Agent 21단계`, `af4d038 보안 Agent 20단계`, `5c6a1a3 보안 Agent 19단계` / `git status --short` → 출력 없음 | 기존 폴더·기록 보존 |
| 문법 검사 | `node --check .\student\extension.mjs` → 출력 없음(오류 없음) | 통과 |

이 결과는 **예제(demo) 모드**의 결과입니다. 실제 SDP·AI 연결 결과가 아닙니다.

---

## 5. 보조 확인 (학생 진술 아님)

수업 보조 AI 도구가 자기 클라우드 환경(Linux, Node v22.22.0)에서 같은 커밋 `126e662`를 빈 폴더에 `git clone`해 확인한 결과입니다. Windows 학생 PC 재현을 대신하지 않습니다.

- `git rev-parse HEAD` 일치, `git status --short` 빈 출력, `.env` 없음
- `node --check student/extension.mjs` 통과
- `node src/server.mjs --demo` → "케셰브 예제: http://127.0.0.1:5189", 배지 「예제 데이터(demo) · 실제 연결 아님」, 학생 칸 「연습 사용자」
- 종료 뒤 접속 불가, 재실행 뒤 정상

---

## 6. 13~21단계 기능·결과 표

- **ALEPH 판정**은 각 단계를 제출한 그 커밋의 원문을 서버 AI가 읽고 내린 결과입니다(코드를 실행한 검증이 아님). 서로 다른 커밋의 판정을 합쳐 최종 버전 전체의 실행 성공으로 보지 않습니다.
- 최종 커밋에는 13~21단계 코드가 모두 누적되어 있고, 4장의 예제 모드 재현은 그 최종 코드로 다시 확인한 것입니다.

| 단계 | 기능 (학생 함수) | 제출 커밋 · 시각(KST) | ALEPH 판정(원문 검토) | 학생이 실제 PC에서 본 것 | 모의 데이터로만 확인 | 미확인과 원인 |
|---|---|---|---|---|---|---|
| 13 | 사용자·기기·세션 (`renderIdentity`) | `f875543` · 10-19 15:45 | 통과 | 예제 표시, 다시 불러오기, 서버 끈 뒤 연결 실패·옛 사용자 제거 | — | 실제 계정 자료: SDP 설정 없음 |
| 14 | 업무 앱 접근 판정 (`renderDecision`) | `326a041` · 10-19 16:16 | 통과 | allow·deny·challenge, 이유·시각 | unknown, 요청 실패 | 실제 정책 판정: SDP 설정 없음 |
| 15 | 접속 기록·XDR 경보 (`renderEvents`) | `6587206` · 10-19 17:10 | 통과 | event-01, 필터, 상세, 다시 불러오기 뒤 상세 초기화 | 여러 건 정렬, xdr 기록, 빈 목록 | 실제 감사 기록: SDP 설정 없음 |
| 16 | 기기·세션·알림·도움정보 (`renderStatus`, 15단계 상세 미지원 조치) | `ca5326a` · 10-19 17:26 | 통과 | 표시, 도움정보 복사 6개 값(비밀 없음) | 미지원 조치 비활성 버튼, 시간 초과 문구 | 실제 기기 목록 |
| 17 | 앱 내부 AI 연결 점검 (`renderAiConnection`) | `085e0db` · 10-26 10:16 | 통과 | 권한 준비 중(`ON_AI_PROVISIONING_PENDING`) 실패 화면 | ok(test/verified), 오류 8분류 | 실제 연결: `NATIVE_HOST_DISABLED`(설정 파일 미발급) |
| 18 | 근거 기반 AI 설명 (`renderExplanation`) | `b7b98ff` · 10-26 10:32 | 통과 | 설명 실패 화면, 실패 중에도 기록·판정 정상 | 성공 설명, 근거 불일치 거부 | 실제 AI 설명 성공: 위와 같음 |
| 19 | 조치 요청 상태 (`renderAction`) | `5c6a1a3` · 10-26 11:21 | 통과 | idle(조치 준비 버튼 없음이 정상) | prepared~error 상태 전체 | 실집행: 연동 시스템 미연결 |
| 20 | 패키지 버전·OSV (`renderVulnerabilities`) | `af4d038` · 10-26 11:40 | 통과 | not_configured | complete·partial 표, 범위 버전 거부 | 실제 OSV 표: 프로젝트 설정·승인 패키지 미준비 |
| 21 | 실행 설명서·구성도 (`docs/STUDENT_RUNBOOK.md`) | `126e662` · 10-26 12:40 | 통과 | 이 문서 4장의 재현 절차가 설명서대로 동작 | — | Windows 외 환경 |

---

## 7. 데이터 보존 계획

| 데이터 | 위치 | 보존·백업 | 복원 | 제한 |
|---|---|---|---|---|
| 학생 코드·문서 | 원래 작업 폴더의 Git 저장소 | 단계마다 커밋하고 `git push`로 GitHub에 백업(13~21단계 커밋 9개 올라가 있음) | 3장처럼 빈 폴더에 `git clone` 후 `git checkout <커밋>` | 커밋하지 않은 변경은 백업되지 않음. `git reset --hard`는 쓰지 않음 |
| 앱 실행 중 화면 상태 | 브라우저 메모리 | 저장하지 않음(localStorage 사용 안 함) | 다시 실행 후 「다시 불러오기」 | 새로고침하면 사라지는 것이 정상 |
| 조치 기록 DB(SQLite) | 운영자가 `sdpActionStartup.databasePath`로 지정한 경우에만 존재 | 운영자 관리 | 운영자 관리 | 기본 실행에서는 만들어지지 않음, 학생이 만들거나 옮기지 않음 |
| 계정 연결·AI 앱 승인 정보 | `-NativeHostConfig` 사용 시 프로젝트 밖 호스트 보관함 | 운영자 관리, 저장소에 넣지 않음 | 설정을 다시 받아 계정 연결을 다시 진행 | 이번 버전은 설정 파일이 없어 해당 없음 |
| 비밀값(키·토큰·비밀번호) | 저장소에 없음 | `.env` 등 제출에서 빠지는 파일에만 둠 | — | 문서·커밋·도움정보에 적지 않음 |
| 워크벤치 대화 기록 | 학생 PC의 워크벤치 저장 위치 | 워크벤치가 PC에 저장 | 같은 PC에서 프로젝트 선택 | 다른 PC로 옮겨지지 않음 |

이동할 때 필요한 것: Node.js 22~24(권장 24.19.0), Git, 저장소 주소와 커밋 번호. 프로젝트는 로컬 절대경로나 비밀값에 의존하지 않으며(`.env.example`은 비밀 없는 견본), 실제 연결이 필요하면 담당자에게 새 환경용 설정 파일을 받습니다.

---

## 8. 버전·지원 범위·미해결 사항

**지원 범위(확인함)**: Windows + Node.js v24.22.0 + Git 2.56.0에서 `-Demo` 모드 실행, 기본 모드의 「연결 없음」 표시, 13~21단계 학생 표시 기능.

**미해결·미확인 (검증 중인 버전인 이유)**

| 항목 | 상태 | 원인 |
|---|---|---|
| 실제 SDP(접근 제어·XDR) 연결 | 미확인 | `-SdpHostConfig` 설정 파일 미발급 |
| 계정 연결·AI 앱 승인·AI 연결 점검 성공 | 미확인 | `-NativeHostConfig` 설정 파일 미발급(`NATIVE_HOST_DISABLED`) |
| 실제 AI 사건 설명 성공 | 미확인 | 위와 같음, 유료 요청 반복하지 않음 |
| 보안 조치 실집행·효과 관측 | 미완료 | 연동 시스템 집행기 미연결(19단계), 현재 기록 supportedActions 빈 배열 |
| OSV 실제 패키지 표 | 미확인 | 프로젝트 설정·승인 패키지 미준비(not_configured) |
| 패키지 조회 중 취소 | 미확인 | 예제 응답이 즉시 끝남 |
| Windows 외 운영체제에서 `start-alekov.ps1` | 미지원·미확인 | 실행 도구가 PowerShell 전용 |

**증거의 종류 구분**

| 종류 | 이 문서에서 해당하는 것 | 뜻하지 않는 것 |
|---|---|---|
| 학생 진술(직접 실행) | 4장 재현 관찰 결과 | 서버가 새 환경에서 실행했다는 뜻이 아님 |
| 예제(demo) 시연 | 4장 브라우저 확인, 6장 "실제 PC에서 본 것" | 실제 연결 성공이 아님 |
| 모의 데이터 점검 | 6장 "모의 데이터로만 확인" | 실제 시스템 동작이 아님 |
| 원문 확인(ALEPH AI 판정) | 6장 "ALEPH 판정" | 실행 성공 증명이 아님 |
| 실제 실행 검증(실제 연결) | 없음 | — |
