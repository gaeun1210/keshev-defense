// 이 파일은 학생이 같은 프로젝트에서 이어서 구현합니다.
// 제공 UI를 받은 것만으로 단계 완료를 인정하지 않습니다.

// ---------- 13단계 · 로그인 사용자·기기·세션 표시 (renderIdentity) ----------
// 입력: { me, devices, sessions } — 각각 { status: 'loading'|'ok'|'error', mode, data?, error? }
// 출력: 매번 새로 만든 DOM 요소 하나. 제공 UI(public/app.js)가 학생 칸의 자식을 이 요소로 통째로 바꾸므로
//       다시 불러오기로 새 입력이 오면 이전 사용자·기기·세션 DOM은 남지 않고 교체됩니다.
// HTML 문자열 해석 없이 document.createElement와 textContent만 씁니다.

const DEVICE_LABELS = Object.freeze({ compliant: '보안 기준 충족', noncompliant: '보안 기준 미충족', unknown: '확인 불가' });
const SESSION_LABELS = Object.freeze({ active: '활성', expired: '만료', revoked: '철회됨', unknown: '확인 불가' });
const MODE_LABELS = Object.freeze({ demo: '예제 자료', disconnected: '연결 없음', unknown: '확인 불가', connected: '실제 연결' });
// 정상으로 볼 수 있는 상태는 이것뿐입니다. 나머지(미충족·만료·철회됨·확인 불가)는 경고로 표시합니다.
const NORMAL = Object.freeze({ device: 'compliant', session: 'active' });

function node(tag, text, attrs = {}) {
  const element = document.createElement(tag);
  if (text !== undefined && text !== null) element.textContent = String(text);
  for (const [name, value] of Object.entries(attrs)) {
    if (name === 'className') element.className = value;
    else element.setAttribute(name, String(value));
  }
  return element;
}

const textOf = value => (typeof value === 'string' && value.trim() ? value : null);

// 모르는 값은 정상으로 바꾸지 않고 확인 불가로 표시합니다.
function statusLabel(kind, value) {
  const labels = kind === 'device' ? DEVICE_LABELS : SESSION_LABELS;
  const key = Object.hasOwn(labels, value) ? value : 'unknown';
  return { key, text: `${labels[key]} (${key})`, normal: key === NORMAL[kind] };
}

function modeLabel(mode) {
  const key = typeof mode === 'string' && Object.hasOwn(MODE_LABELS, mode) ? mode : 'unknown';
  return { key, text: MODE_LABELS[key] };
}

// 상태 배지: 색상뿐 아니라 글자(정상 / 주의)로도 구분합니다.
function statusBadge(kind, value) {
  const label = statusLabel(kind, value);
  return node('span', `${label.normal ? '정상' : '주의'} · ${label.text}`, {
    className: `state ${label.normal ? 'state-ok' : 'state-error'}`,
    'data-status': label.key,
    'data-normal': label.normal ? 'true' : 'false',
  });
}

function modeLine(name, resource) {
  const mode = modeLabel(resource && resource.mode);
  return node('p', `${name} 자료 출처: ${mode.text}`, { className: 'muted', 'data-mode': mode.key });
}

// loading·error는 데이터를 하나도 보여 주지 않고 상태 문구와 mode 안내만 보여 줍니다.
function pendingOrFailure(name, resource) {
  const status = resource && resource.status;
  if (status === 'loading') return node('p', `${name}: 불러오는 중`, { className: 'state state-loading', role: 'status', 'data-state': 'loading' });
  if (status === 'error') {
    const message = textOf(resource.error && resource.error.message) || '서버 메시지 없음';
    return node('p', `${name}: 연결 실패: ${message}`, { className: 'state state-error', role: 'alert', 'data-state': 'error' });
  }
  if (status !== 'ok') return node('p', `${name}: 확인 불가`, { className: 'state state-empty', 'data-state': 'unknown' });
  return null;
}

function row(list, term, value) {
  list.append(node('dt', term));
  const dd = node('dd');
  if (value instanceof Element) dd.append(value); else dd.textContent = value;
  list.append(dd);
}

function meSection(me) {
  const section = node('section', null, { 'data-part': 'me', 'data-state': (me && me.status) || 'unknown' });
  section.append(node('h3', '현재 로그인'), modeLine('로그인', me));
  const notReady = pendingOrFailure('로그인 정보', me);
  // 오류·불러오는 중일 때는 이전 사용자 이름을 현재 값처럼 남기지 않습니다(이 요소에는 사용자 값이 없음).
  if (notReady) { section.append(notReady); return section; }

  const data = me.data || {};
  const user = data.user || {}, device = data.device || {}, session = data.session || {};
  const list = node('dl', null, { className: 'kv' });
  row(list, '사용자', textOf(user.label) || '확인 불가');
  row(list, '사용자 ID', textOf(user.id) || '확인 불가');
  row(list, '현재 기기', textOf(device.label) || '확인 불가');
  row(list, '기기 ID', textOf(device.id) || '확인 불가');
  row(list, '기기 보안 상태', statusBadge('device', device.status));
  row(list, '세션 ID', textOf(session.id) || '확인 불가');
  row(list, '세션 상태', statusBadge('session', session.status));
  section.append(list);

  const warnings = [];
  if (!statusLabel('device', device.status).normal) warnings.push(`현재 기기: ${statusLabel('device', device.status).text}`);
  if (!statusLabel('session', session.status).normal) warnings.push(`현재 세션: ${statusLabel('session', session.status).text}`);
  if (warnings.length) section.append(node('p', `주의 — 정상 상태가 아닙니다. ${warnings.join(' · ')}`, { className: 'state state-error', role: 'alert' }));
  section.append(node('p', '기기 보안 상태 표시는 악성코드 검사나 치료 기능이 아닙니다.', { className: 'muted' }));
  return section;
}

function listSection(title, name, resource, kind) {
  const section = node('section', null, { 'data-part': kind === 'device' ? 'devices' : 'sessions', 'data-state': (resource && resource.status) || 'unknown' });
  section.append(node('h3', title), modeLine(name, resource));
  const notReady = pendingOrFailure(name, resource);
  if (notReady) { section.append(notReady); return section; }

  const items = Array.isArray(resource.data) ? resource.data : [];
  if (!items.length) { section.append(node('p', `${name}: 표시할 항목 없음`, { className: 'state state-empty' })); return section; }
  const list = node('ul');
  for (const item of items) {
    const entry = node('li', null, { 'data-id': textOf(item && item.id) || 'unknown' });
    const label = kind === 'device'
      ? `${textOf(item && item.label) || '이름 확인 불가'} (${textOf(item && item.id) || 'ID 확인 불가'}) `
      : `${textOf(item && item.id) || 'ID 확인 불가'} `;
    entry.append(node('span', label), statusBadge(kind, item && item.status));
    list.append(entry);
  }
  section.append(list);
  return section;
}

function renderIdentity(input) {
  const { me, devices, sessions } = input || {};
  const root = node('div', null, { className: 'student-identity', 'data-student': 'identity' });
  root.append(
    meSection(me),
    listSection('내 기기 목록', '기기 목록', devices, 'device'),
    listSection('내 로그인 세션', '세션 목록', sessions, 'session'),
  );
  return root;
}

// ---------- 14단계 · 업무 앱 접근 요청 결과 표시 (renderDecision) ----------
// 입력: { status: 'idle'|'loading'|'ok'|'error', mode, data?, error?, appId }
//       data: { appId, decision: 'allow'|'deny'|'challenge'|'unknown', reason, checkedAt }
// 판정(ok)과 요청 실패(error)는 서로 다른 화면입니다. 요청 실패는 거부 판정이 아니며,
// unknown·목록에 없는 값·요청 실패는 어느 것도 허용처럼 보이지 않게 합니다.
// allow는 정책상 접근 허용이라는 뜻이며 실제 앱 접속 성공을 보장하지 않습니다.

const DECISION_INFO = Object.freeze({
  allow: Object.freeze({ label: '접근 허용', tone: 'ok', note: '정책상 이 앱 접근이 허용됐습니다. 실제 앱 접속 성공을 뜻하지는 않습니다.' }),
  deny: Object.freeze({ label: '접근 거부', tone: 'error', note: '정책상 이 앱 접근이 거부됐습니다.' }),
  challenge: Object.freeze({ label: '추가 인증 또는 확인 필요', tone: 'loading', note: '접근 전에 추가 인증 또는 확인이 필요합니다. 아직 허용되지 않았으며, 케셰브가 확인 절차를 대신 수행하지 않습니다.' }),
  unknown: Object.freeze({ label: '판정 확인 불가', tone: 'empty', note: '판정을 확인할 수 없습니다. 허용되지 않은 것으로 다루고 허용으로 간주하지 마세요.' }),
});

// 네 값 이외의 decision은 모두 unknown(판정 확인 불가)으로 처리합니다.
function decisionOf(value) {
  return typeof value === 'string' && Object.hasOwn(DECISION_INFO, value) ? value : 'unknown';
}

// checkedAt은 원래 값과 읽기 쉬운 현지 시각을 함께 보여 줍니다. 읽을 수 없으면 확인 불가로 둡니다.
function timeText(value) {
  const text = textOf(value);
  if (!text) return '확인 불가';
  const time = Date.parse(text);
  return Number.isFinite(time) ? `${new Date(time).toLocaleString('ko-KR')} (${text})` : `확인 불가 (${text})`;
}

function renderDecision(input) {
  const { status, mode, data, error, appId } = input || {};
  const modeInfo = modeLabel(mode);
  const root = node('section', null, { className: 'student-decision', 'data-student': 'decision', 'data-state': status || 'unknown' });
  root.append(node('h3', '업무 앱 접근 판정'));
  const requestedApp = textOf(appId) || textOf(data && data.appId);
  if (requestedApp) root.append(node('p', `요청한 앱: ${requestedApp}`, { 'data-app-id': requestedApp }));
  root.append(node('p', `자료 출처: ${modeInfo.text}`, { className: 'muted', 'data-mode': modeInfo.key }));

  // 요청 전(idle)
  if (status === 'idle') {
    root.append(node('p', '앱을 골라 접속을 요청하세요. 아직 요청한 앱이 없어 판정이 없습니다.', { className: 'state state-empty', role: 'status', 'data-decision': 'none' }));
    return root;
  }
  // 요청 중(loading)
  if (status === 'loading') {
    root.append(node('p', '판정 확인 중 — 아직 판정을 받지 않았습니다.', { className: 'state state-loading', role: 'status', 'data-decision': 'pending' }));
    return root;
  }
  // 요청 실패(error): 서버의 판정이 아니므로 거부·허용과 다른 문구로 표시합니다.
  if (status === 'error') {
    const message = textOf(error && error.message) || '서버 메시지 없음';
    root.append(
      node('p', `요청 실패: ${message}`, { className: 'state state-error', role: 'alert', 'data-decision': 'request-failed' }),
      node('p', '요청 실패는 접근 거부 판정이 아닙니다. 판정을 받지 못했으므로 허용되지 않은 상태로 다루고, 필요하면 다시 요청하세요.', { className: 'muted' }),
    );
    return root;
  }
  // 판정 수신(ok)
  if (status === 'ok') {
    const raw = data ? data.decision : undefined;
    const key = decisionOf(raw);
    const info = DECISION_INFO[key];
    root.append(node('p', `판정: ${info.label} (${key})`, {
      className: `state state-${info.tone}`, role: key === 'allow' ? 'status' : 'alert', 'data-decision': key,
    }));
    if (key === 'unknown' && raw !== 'unknown') {
      root.append(node('p', `서버가 보낸 판정 값(${textOf(raw) || '없음'})은 정의된 값이 아니어서 확인 불가로 처리했습니다.`, { className: 'muted' }));
    }
    root.append(node('p', info.note));
    const list = node('dl', null, { className: 'kv' });
    row(list, '판정 이유', textOf(data && data.reason) || '판정 이유 확인 불가');
    row(list, '판정 시각', timeText(data && data.checkedAt));
    root.append(list);
    return root;
  }
  // 알 수 없는 상태: 허용으로 보이지 않게 확인 불가로 둡니다.
  root.append(node('p', '판정 확인 불가 (unknown) — 요청 상태를 확인할 수 없습니다.', { className: 'state state-empty', 'data-decision': 'unknown' }));
  return root;
}

export function createStudentView() {
  return {
    renderIdentity,
    renderDecision,
    renderEvents() { return '학생 구현 대기: 본인 접속·XDR 기록을 연결하세요.'; },
    renderStatus() { return '학생 구현 대기: 기기·세션·알림과 연결 점검 상태를 구분하세요.'; },
    renderVulnerabilities() { return '학생 구현 대기: 정확한 설치 버전·OSV 출처·조회 시각·부분 결과·조회 실패를 구분하세요.'; },
    renderAiConnection() { return '학생 구현 대기: 모델 응답 점검과 실제 사건 설명을 구분하고 AI 오류·취소·수동 복구를 안내하세요.'; },
    renderExplanation() { return '학생 구현 대기: 선택한 사건의 근거·규칙·현재 상태와 AI 설명을 연결하세요. 제안은 자동 실행하지 않습니다.'; },
    renderAction() { return '학생 구현 대기: 현재 사건·조치·실제 대상·사람 확인·ACK와 원천 효과·unknown을 구분하세요.'; },
  };
}
