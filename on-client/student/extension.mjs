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

// ---------- 15단계 · 접속 기록·XDR 경보 목록과 상세 보기 (renderEvents) ----------
// 입력: { status: 'loading'|'ok'|'error', mode, data?, error? }
//       data: [{ id, kind, at, appId, summary, evidence:[{id,text}], rules:[{id,text}],
//                state:{ access, session, device }, supportedActions:[] }]
// 관측 범위: 앱 서버가 내 SDP 감사 기록에서 맞춰 본 "본인의 최근 기록(최대 40건)"과 서버가 이미 저장한 XDR 경보뿐입니다.
//           모든 직원의 전체 이력이나 실시간 전체 위협 탐지가 아닙니다.
// 받은 배열은 복사해서 정렬·필터링하며 원본(서버 데이터)은 바꾸지 않습니다. 서버에 다시 묻지 않습니다.
// 새 자료가 오면(다시 불러오기) 이전 목록과 상세 선택을 모두 지우고 다시 그립니다.

const EVENT_KIND_LABELS = Object.freeze({ access: '접속 기록', xdr: 'XDR 경보' });
const ACCESS_LABELS = Object.freeze({ allowed: '허용됨', denied: '거부됨', unknown: '확인 불가' });
const ALL = 'all';
const NO_APP = '';                 // appId가 없는 옛 기록을 고르는 값(실제 appId는 빈 문자열일 수 없음)
const EVENT_LIMIT_NOTE = '본인의 최근 보안 기록(최대 40건)만 표시합니다. 모든 직원의 전체 이력이나 실시간 전체 위협 탐지가 아니며, XDR 경보는 서버가 이미 저장한 경보만 나옵니다.';

function kindLabel(kind) {
  const key = textOf(kind);
  return key && Object.hasOwn(EVENT_KIND_LABELS, key) ? `${EVENT_KIND_LABELS[key]} (${key})` : `확인 불가 (${key || 'unknown'})`;
}

// state 세 값은 각각 따로, 한국어 뜻과 원래 값을 함께 보여 줍니다. 모르는 값은 확인 불가(unknown)입니다.
function eventStateText(kind, value) {
  if (kind === 'access') {
    const key = typeof value === 'string' && Object.hasOwn(ACCESS_LABELS, value) ? value : 'unknown';
    return `${ACCESS_LABELS[key]} (${key})`;
  }
  return statusLabel(kind, value).text;
}

function appText(appId) {
  return textOf(appId) || '앱 확인 불가 (appId 없음)';
}

// 복사본을 at 기준 최신순으로 정렬합니다. 시각을 읽을 수 없는 기록은 맨 뒤에 둡니다.
function sortedCopy(data) {
  const time = event => { const value = Date.parse(event && event.at); return Number.isFinite(value) ? value : -Infinity; };
  return data.slice().sort((a, b) => time(b) - time(a));
}

// 필터 선택지: 전체(all) + 받은 원래 값. kind·접속 상태는 계약에 있는 값을 항상 보여 줍니다.
function filterOptions(events, pick, fixed) {
  const values = new Set(fixed);
  for (const event of events) values.add(pick(event));
  return [ALL, ...values];
}

function selectBox(id, labelText, options, current, describe, onChange) {
  const wrap = node('div', null, { className: 'student-filter' });
  const label = node('label', labelText);
  label.htmlFor = id;
  label.style.marginRight = '0.5em';
  wrap.style.margin = '4px 0';
  const select = node('select', null, { id, 'aria-label': labelText });
  for (const value of options) {
    const option = node('option', value === ALL ? '전체 (all)' : describe(value));
    option.value = value;
    if (value === current) option.selected = true;
    select.append(option);
  }
  select.addEventListener('change', () => onChange(select.value));
  wrap.append(label, select);
  return wrap;
}

function textRows(title, rows, emptyText) {
  const section = node('div');
  section.append(node('h5', title));
  const items = Array.isArray(rows) ? rows : [];
  if (!items.length) { section.append(node('p', emptyText, { className: 'muted' })); return section; }
  const list = node('ul');
  for (const item of items) list.append(node('li', `${textOf(item && item.id) || 'ID 확인 불가'}: ${textOf(item && item.text) || '내용 확인 불가'}`));
  section.append(list);
  return section;
}

function eventDetail(event) {
  const id = textOf(event.id) || 'unknown';
  const detail = node('section', null, { className: 'student-event-detail', 'data-student-event-detail': id, id: `student-event-detail-${id}` });
  detail.append(node('h4', `${id} 상세`));
  const info = node('dl', null, { className: 'kv' });
  row(info, '사건 ID', id);
  row(info, '앱', appText(event.appId));
  row(info, '종류', kindLabel(event.kind));
  row(info, '시각', timeText(event.at));
  detail.append(info, textRows('근거 (evidence)', event.evidence, '근거 없음'), textRows('규칙 (rules)', event.rules, '규칙 없음'));

  const state = event.state && typeof event.state === 'object' ? event.state : {};
  detail.append(node('h5', '상태 (state)'));
  const states = node('dl', null, { className: 'kv', 'data-student-event-state': id });
  row(states, '접속 (state.access)', eventStateText('access', state.access));
  row(states, '세션 (state.session)', eventStateText('session', state.session));
  row(states, '기기 (state.device)', eventStateText('device', state.device));
  detail.append(states);

  // 16단계: 실제 조치 버튼은 만들지 않습니다. supportedActions가 비어 있으면 아무것도 추가하지 않습니다.
  // 연결되지 않은 조치가 넘어온 경우에만 「<action> 미지원」 비활성 버튼과 안내를 둡니다. 이 버튼은 어떤 요청도 보내지 않습니다.
  const actions = Array.isArray(event.supportedActions) ? event.supportedActions.map(textOf).filter(Boolean) : [];
  if (actions.length) {
    const box = node('div', null, { 'data-student-unsupported-actions': id });
    box.append(node('p', '아직 지원하지 않는 조치입니다. 조치 실행 연결은 준비 중이며, 아래 버튼은 요청을 보내지 않고 조치도 실행하지 않습니다.', { className: 'state state-empty' }));
    for (const action of actions) {
      const button = node('button', `${action} 미지원`, { type: 'button', className: 'btn', 'aria-label': `${action} 미지원`, 'data-student-unsupported-action': action });
      button.disabled = true;
      box.append(button);
    }
    detail.append(box);
  }
  return detail;
}

function createEventsRenderer() {
  let filters = { kind: ALL, app: ALL, access: ALL };
  let selectedId = null;
  let lastSignature = null;

  const resetView = () => { selectedId = null; lastSignature = null; };

  return function renderEvents(input) {
    const { status, mode, data, error } = input || {};
    const modeInfo = modeLabel(mode);
    const root = node('section', null, { className: 'student-events', 'data-student': 'events', 'data-state': status || 'unknown' });
    root.append(node('h3', '내 접속 기록과 XDR 경보'), node('p', EVENT_LIMIT_NOTE, { className: 'muted', 'data-student-event-scope': 'self-recent-40' }),
      node('p', `자료 출처: ${modeInfo.text}`, { className: 'muted', 'data-mode': modeInfo.key }));

    // 불러오는 중·실패·확인 불가에서는 이전 목록과 상세를 지우고 상태만 보여 줍니다.
    if (status === 'loading') {
      resetView();
      root.append(node('p', '기록을 불러오는 중', { className: 'state state-loading', role: 'status', 'data-student-events': 'loading' }));
      return root;
    }
    if (status === 'error') {
      resetView();
      const code = textOf(error && error.code);
      const message = textOf(error && error.message) || '서버 메시지 없음';
      if (code === 'CONTRACT_MISMATCH') {
        root.append(node('p', `확인 불가: 기록 응답 형식을 확인할 수 없어 이전 목록을 지웠습니다. ${message}`, { className: 'state state-error', role: 'alert', 'data-student-events': 'unverified' }));
      } else {
        root.append(node('p', `기록을 불러오지 못했습니다: ${message}`, { className: 'state state-error', role: 'alert', 'data-student-events': 'error' }));
      }
      return root;
    }
    if (status !== 'ok' || !Array.isArray(data)) {
      resetView();
      root.append(node('p', '확인 불가: 기록 상태를 확인할 수 없습니다.', { className: 'state state-empty', 'data-student-events': 'unknown' }));
      return root;
    }
    if (!data.length) {
      resetView();
      root.append(node('p', '표시할 기록이 없습니다.', { className: 'state state-empty', role: 'status', 'data-student-events': 'empty' }));
      return root;
    }

    // 새 자료(다시 불러오기)면 이전 상세 선택을 초기화합니다.
    const events = sortedCopy(data);
    const signature = JSON.stringify(events.map(event => [event && event.id, event && event.at]));
    if (signature !== lastSignature) { selectedId = null; lastSignature = signature; }

    const kindOptions = filterOptions(events, event => textOf(event && event.kind) || 'unknown', ['access', 'xdr']);
    const appOptions = filterOptions(events, event => textOf(event && event.appId) || NO_APP, []);
    const accessOptions = filterOptions(events, event => textOf(event && event.state && event.state.access) || 'unknown', ['allowed', 'denied', 'unknown']);
    // 새 자료에 없는 필터 값은 전체(all)로 되돌립니다.
    if (!kindOptions.includes(filters.kind)) filters.kind = ALL;
    if (!appOptions.includes(filters.app)) filters.app = ALL;
    if (!accessOptions.includes(filters.access)) filters.access = ALL;

    const listArea = node('div', null, { 'data-student-events': 'list' });
    const draw = () => {
      // 받은 배열 안에서만 거릅니다(서버에 다시 묻지 않음).
      const shown = events.filter(event =>
        (filters.kind === ALL || (textOf(event && event.kind) || 'unknown') === filters.kind)
        && (filters.app === ALL || (textOf(event && event.appId) || NO_APP) === filters.app)
        && (filters.access === ALL || (textOf(event && event.state && event.state.access) || 'unknown') === filters.access));
      if (selectedId !== null && !shown.some(event => event.id === selectedId)) selectedId = null;

      const children = [node('p', `표시 ${shown.length}건 / 받은 기록 ${events.length}건 (최신순)`, { role: 'status', 'data-student-event-count': String(shown.length) })];
      if (!shown.length) children.push(node('p', '선택한 조건에 맞는 기록이 없습니다. 필터를 전체(all)로 바꿔 보세요.', { className: 'state state-empty' }));
      const list = node('ul', null, { className: 'student-event-list' });
      for (const event of shown) {
        const id = textOf(event.id) || 'unknown';
        const item = node('li', null, { 'data-student-event-id': id });
        item.append(
          node('p', `[${kindLabel(event.kind)}] ${timeText(event.at)}`),
          node('p', `사건 ID: ${id} · 앱: ${appText(event.appId)}`),
          node('p', `요약: ${textOf(event.summary) || '요약 없음'}`),
        );
        const open = selectedId === id;
        const button = node('button', `${id} 상세`, { type: 'button', className: 'btn', 'aria-label': `${id} 상세`, 'aria-expanded': open ? 'true' : 'false', 'aria-controls': `student-event-detail-${id}` });
        button.addEventListener('click', () => {
          selectedId = open ? null : id;
          draw();
          // 다시 그린 뒤에도 키보드 포커스를 같은 기록의 상세 버튼에 둡니다.
          const again = [...listArea.querySelectorAll('button')].find(b => b.getAttribute('aria-controls') === `student-event-detail-${id}`);
          if (again) again.focus();
        });
        item.append(button);
        if (open) item.append(eventDetail(event));
        list.append(item);
      }
      if (shown.length) children.push(list);
      listArea.replaceChildren(...children);
    };

    const filterBar = node('div', null, { className: 'student-event-filters' });
    filterBar.append(
      selectBox('student-events-filter-kind', '기록 종류', kindOptions, filters.kind, kindLabel, value => { filters.kind = value; draw(); }),
      selectBox('student-events-filter-app', '업무 앱', appOptions, filters.app, value => (value === NO_APP ? '앱 확인 불가 (appId 없음)' : value), value => { filters.app = value; draw(); }),
      selectBox('student-events-filter-access', '접속 상태', accessOptions, filters.access, value => eventStateText('access', value), value => { filters.access = value; draw(); }),
    );
    root.append(filterBar, listArea);
    draw();
    return root;
  };
}

// ---------- 16단계 · 알림·빈 상태·오류·진단 정보 정리 (renderStatus) ----------
// 입력: { devices, sessions, notifications, diagnostics, mode }
//   devices·sessions·diagnostics: { status: 'idle'|'loading'|'ok'|'error', mode, data?, error? }
//   notifications: [{ resource, code, message }] — 제공 화면이 모아 준 알림
// 진단 정보는 제공 화면이 조회해 전달한 값만 씁니다. 학생 코드는 /api/diagnostics를 직접 호출하지 않습니다.
// 다시 시도는 사용자가 위쪽 「다시 불러오기」 버튼을 직접 누르는 것뿐이며, 자동으로 다시 요청하지 않습니다.
// 매번 현재 입력으로 새 DOM을 만들므로, 다시 불러와 성공하면 이전 실패 안내는 사라집니다.

const RESOURCE_LABELS = Object.freeze({
  me: '로그인 정보', apps: '업무 앱', events: '보안 기록', devices: '기기', sessions: '세션', access: '접속 판정', diagnostics: '도움정보',
});
const TIMEOUT_CODES = Object.freeze(['TIMEOUT', 'ENGINE_TIMEOUT', 'REQUEST_TIMEOUT']);
const RETRY_NOTE = '다시 시도는 위쪽 「다시 불러오기」 버튼을 직접 누르세요. 자동으로 다시 요청하지 않습니다.';
// 도움정보 중 화면 표시·복사를 허용하는 값만 고릅니다(그 밖의 값은 쓰지 않음).
const DIAGNOSTIC_FIELDS = Object.freeze(['requestId', 'component', 'version', 'checkedAt', 'engine.mode', 'engine.code']);

function resourceLabel(resource) {
  const key = textOf(resource);
  return key && Object.hasOwn(RESOURCE_LABELS, key) ? `${RESOURCE_LABELS[key]} (${key})` : `확인 불가 (${key || 'unknown'})`;
}

// 실패 문구: 무엇을 불러오지 못했는지 + 시간 초과 여부 + 서버 message + 다시 시도 방법
function failureBox(what, error, retryNote) {
  const code = textOf(error && error.code) || 'UNKNOWN';
  const message = textOf(error && error.message) || '서버 메시지 없음';
  const timeout = TIMEOUT_CODES.includes(code);
  const box = node('div', null, { 'data-student-status-error': what });
  box.append(
    node('p', `${what}: 불러오지 못했습니다${timeout ? ' — 시간 초과' : ''} (${code}): ${message}`, { className: 'state state-error', role: 'alert' }),
    node('p', retryNote, { className: 'muted' }),
  );
  return box;
}

function statusListSection(title, name, resource, emptyText, drawItem, note) {
  const status = resource && resource.status;
  const modeInfo = modeLabel(resource && resource.mode);
  const section = node('section', null, { 'data-student-status-part': name, 'data-state': status || 'unknown' });
  section.append(node('h4', title), node('p', `자료 출처: ${modeInfo.text}`, { className: 'muted', 'data-mode': modeInfo.key }));
  if (note) section.append(node('p', note, { className: 'muted' }));
  if (status === 'loading') { section.append(node('p', `${title}: 불러오는 중`, { className: 'state state-loading', role: 'status' })); return section; }
  if (status === 'error') { section.append(failureBox(title, resource.error, RETRY_NOTE)); return section; }
  if (status !== 'ok' || !Array.isArray(resource.data)) {
    section.append(node('p', `${title}: 확인 불가 — 아직 결과가 없습니다. ${RETRY_NOTE}`, { className: 'state state-empty' }));
    return section;
  }
  if (!resource.data.length) { section.append(node('p', emptyText, { className: 'state state-empty', role: 'status' })); return section; }
  const list = node('ul');
  for (const item of resource.data) list.append(drawItem(item || {}));
  section.append(list);
  return section;
}

function notificationsSection(notifications) {
  const section = node('section', null, { 'data-student-status-part': 'notifications' });
  section.append(node('h4', '알림'));
  if (!Array.isArray(notifications)) {
    section.append(node('p', '알림: 확인 불가 — 알림 목록을 받지 못했습니다.', { className: 'state state-empty' }));
    return section;
  }
  if (!notifications.length) {
    section.append(node('p', '주의할 알림이 없습니다.', { className: 'state state-ok', role: 'status', 'data-student-notifications': '0' }));
    return section;
  }
  section.append(node('p', `주의할 알림 ${notifications.length}건`, { 'data-student-notifications': String(notifications.length) }));
  const list = node('ul');
  for (const item of notifications) {
    list.append(node('li', `[${resourceLabel(item && item.resource)}] ${textOf(item && item.code) || 'UNKNOWN'}: ${textOf(item && item.message) || '메시지 없음'}`,
      { 'data-student-notification-resource': textOf(item && item.resource) || 'unknown' }));
  }
  section.append(list);
  return section;
}

// 허용한 여섯 값만 뽑습니다. 값이 없으면 확인 불가로 둡니다.
function safeDiagnostics(data) {
  const source = data && typeof data === 'object' ? data : {};
  const engine = source.engine && typeof source.engine === 'object' ? source.engine : {};
  const pick = value => (typeof value === 'string' || typeof value === 'number' ? String(value) : '확인 불가');
  return {
    requestId: pick(source.requestId), component: pick(source.component), version: pick(source.version),
    checkedAt: pick(source.checkedAt), 'engine.mode': pick(engine.mode), 'engine.code': pick(engine.code),
  };
}

function diagnosticsSection(diagnostics) {
  const status = diagnostics && diagnostics.status;
  const section = node('section', null, { 'data-student-status-part': 'diagnostics', 'data-state': status || 'unknown' });
  section.append(node('h4', '도움정보 (연결 점검)'),
    node('p', '도움 요청 때 담당자에게 전달할 수 있도록, 비밀이 없는 점검 값만 복사합니다. 복사 버튼을 누르기 전에는 어디에도 복사·전송하지 않습니다.', { className: 'muted' }));

  const copy = node('button', '도움정보 복사', { type: 'button', className: 'btn', 'aria-label': '도움정보 복사', 'data-student-diagnostics-copy': 'true' });
  const result = node('p', '', { className: 'muted', role: 'status' });
  copy.disabled = true;

  if (status === 'loading') section.append(node('p', '도움정보: 불러오는 중', { className: 'state state-loading', role: 'status' }));
  else if (status === 'error') section.append(failureBox('도움정보', diagnostics.error, '다시 시도는 도움정보 칸의 「도움정보 불러오기」 버튼을 직접 누르세요. 자동으로 다시 요청하지 않습니다.'));
  else if (status !== 'ok') section.append(node('p', '도움정보를 아직 불러오지 않았습니다. 도움정보 칸의 「도움정보 불러오기」 버튼을 직접 누르면 여기에 표시됩니다.', { className: 'state state-empty' }));
  else {
    const safe = safeDiagnostics(diagnostics.data);
    const list = node('dl', null, { className: 'kv' });
    for (const field of DIAGNOSTIC_FIELDS) row(list, field, safe[field]);
    section.append(list, node('p', `위 값은 ${safe.checkedAt} 시각에 점검한 결과입니다. 최신 점검이 필요하면 「도움정보 불러오기」를 직접 다시 누르세요.`, { className: 'muted' }));
    copy.disabled = false;
    // 사용자가 누를 때만, 위 여섯 값만 복사합니다.
    copy.addEventListener('click', async () => {
      const text = DIAGNOSTIC_FIELDS.map(field => `${field}: ${safe[field]}`).join('\n');
      try {
        if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') throw new Error('clipboard');
        await navigator.clipboard.writeText(text);
        result.textContent = '도움정보 6개 값을 복사했습니다. 붙여 넣기 전에 내용을 직접 확인하세요.';
      } catch {
        result.textContent = '복사하지 못했습니다. 위 값을 직접 확인해 옮겨 적으세요.';
      }
    });
  }
  section.append(copy, result);
  return section;
}

function renderStatus(input) {
  const { devices, sessions, notifications, diagnostics, mode } = input || {};
  const modeInfo = modeLabel(mode);
  const root = node('section', null, { className: 'student-status', 'data-student': 'status' });
  root.append(
    node('h3', '기기·세션·알림·도움정보'),
    node('p', `현재 자료 출처: ${modeInfo.text}`, { className: 'muted', 'data-mode': modeInfo.key }),
    statusListSection('등록 기기', 'devices', devices, '등록된 기기가 없습니다.',
      item => { const li = node('li', `${textOf(item.label) || '이름 확인 불가'} (${textOf(item.id) || 'ID 확인 불가'}) `); li.append(statusBadge('device', item.status)); return li; },
      '내 이름으로 등록되고 회수되지 않은 기기입니다(최대 100개, 지금 쓰는 기기가 맨 앞).'),
    statusListSection('현재 세션', 'sessions', sessions, '현재 연결 없음 — 검증된 세션이 없습니다.',
      item => { const li = node('li', `${textOf(item.id) || 'ID 확인 불가'} `); li.append(statusBadge('session', item.status)); return li; },
      '세션은 지금 검증된 연결 하나만 표시합니다. 지난 세션 목록이 아닙니다.'),
    notificationsSection(notifications),
    diagnosticsSection(diagnostics),
  );
  return root;
}

// ---------- 17단계 · 앱 내부 AI 연결 상태 표시 (renderAiConnection, renderExplanation 기초) ----------
// 앱은 앱 서버를 통해서만 수업용 AI에 연결합니다. 학생 코드는 주소·열쇠를 입력받거나 직접 요청하지 않습니다.
// renderAiConnection 입력: { status: 'idle'|'loading'|'ok'|'error', mode, data?, error?, checkedAt, explanationAccepted:false }
//   data: { transportChecked:true, audienceAuthorization:'test'|'verified', modelCount, help }
// 모델 목록 응답(연결 점검)은 사건 설명 실행이 아닙니다. 사건 설명은 보안 기록에서 따로 요청하고 확인합니다.
// 매번 현재 입력으로 새 DOM을 만들므로, 다시 점검해 성공하거나 idle로 돌아오면 이전 결과·오류는 남지 않습니다.
// 자동으로 다시 점검하지 않습니다. 다시 점검은 사용자가 「AI 연결 점검」 버튼을 직접 누르는 것입니다.

// 오류 code → 원인 구분과 사용자 안내. 모르는 code는 확인 불가로 둡니다.
const AI_ERROR_GROUPS = Object.freeze([
  Object.freeze({ key: 'provisioning', label: '권한 준비 중·확인 불가', guide: '학생 잘못이 아닙니다. 담당자에게 계정 연결과 앱 권한 발급 상태를 확인해 달라고 요청하세요.',
    codes: ['ON_AI_PROVISIONING_PENDING', 'AI_REQUEST_UNVERIFIED', 'ON_AI_INVALID_OUTPUT', 'ON_AI_INVALID_INPUT'] }),
  Object.freeze({ key: 'auth', label: '인증 실패', guide: '보호 현황의 계정 연결 확인을 다시 진행하고, 계속되면 담당자에게 확인하세요. 열쇠를 복사해 붙이지 마세요.',
    codes: ['WB_CLCO_AUTH_REQUIRED', 'ON_AI_AUTHORIZATION_CHANGED', 'SUBJECT_SCOPE_UNVERIFIED'] }),
  Object.freeze({ key: 'access', label: '접근 제한', guide: '학생 앱의 이용 권한이 허용되지 않았습니다. 계정 연결을 다시 확인하고 담당자에게 확인하세요.',
    codes: ['WB_CLCO_ACCESS_BLOCKED'] }),
  Object.freeze({ key: 'limit', label: '반 사용량·이용 한도', guide: '사용량이나 한도에 도달했습니다. 담당자에게 확인하세요.',
    codes: ['WB_CLCO_COHORT_BUDGET_EXHAUSTED', 'WB_CLCO_LIMIT_REACHED'] }),
  Object.freeze({ key: 'hours', label: '이용 시간 아님', guide: '지금은 AI 이용 시간이 아닙니다. 이용 시간을 확인하세요.',
    codes: ['WB_CLCO_SESSION_CLOSED'] }),
  Object.freeze({ key: 'retry', label: '요청 제한·시간 초과·네트워크', guide: '잠시 뒤 「AI 연결 점검」 버튼을 직접 다시 누르세요. 자동으로 다시 점검하지 않습니다.',
    codes: ['WB_CLCO_RATE_LIMITED', 'WB_CLCO_TIMEOUT', 'REQUEST_TIMEOUT', 'ENGINE_TIMEOUT', 'TIMEOUT', 'NETWORK_ERROR'] }),
  Object.freeze({ key: 'cancelled', label: '취소', guide: '점검을 취소했습니다. 이전 점검 결과는 현재 결과가 아닙니다. 필요하면 직접 다시 점검하세요.',
    codes: ['WB_CLCO_CANCELLED', 'CANCELLED', 'REQUEST_CANCELLED'] }),
  Object.freeze({ key: 'no-model', label: '쓸 수 있는 모델 없음', guide: '담당자에게 이 앱 권한의 모델 허용 설정을 확인해 달라고 요청하세요. 임의 모델을 추가하지 마세요.',
    codes: ['ON_AI_MODEL_LIST_EMPTY', 'MODEL_NOT_CONFIGURED'] }),
]);

function aiErrorGroup(code) {
  return AI_ERROR_GROUPS.find(group => group.codes.includes(code))
    || { key: 'unknown', label: '확인 불가', guide: 'AI 연결 상태를 확인할 수 없습니다. 연결 완료로 보지 말고, 필요하면 직접 다시 점검하거나 담당자에게 확인하세요.' };
}

// 화면에 쓰기 전 비밀처럼 보이는 값(열쇠·토큰 형태)은 가립니다. 열쇠·원문 오류는 표시하지 않습니다.
const SECRET_PATTERN = /(sk-[A-Za-z0-9_-]{8,}|github_pat_|gh[pousr]_[A-Za-z0-9]{8,}|bearer\s+\S+|api[_-]?key|token\s*[:=]|password\s*[:=]|[A-Za-z0-9+/_-]{32,})/i;
function safeText(value, fallback) {
  const text = textOf(value);
  if (!text) return fallback;
  if (SECRET_PATTERN.test(text)) return '(비밀로 보이는 값이 있어 표시하지 않음)';
  return text.length > 300 ? `${text.slice(0, 300)}…` : text;
}
function safeCode(value) {
  const code = textOf(value);
  return code && /^[A-Z0-9_]{1,64}$/.test(code) ? code : 'UNKNOWN';
}

function renderAiConnection(input) {
  const { status, mode, data, error, checkedAt, explanationAccepted } = input || {};
  const modeInfo = modeLabel(mode);
  const root = node('section', null, { className: 'student-ai-connection', 'data-student': 'ai-connection', 'data-state': status || 'unknown' });
  root.append(node('h3', '앱 내부 AI 연결 점검'),
    node('p', '이 점검은 앱 서버를 거쳐 수업용 AI의 모델 응답만 확인합니다. 사건 설명 실행과는 별개입니다.', { className: 'muted' }));

  if (status === 'idle') {
    root.append(node('p', 'AI 연결 점검 전 — 아직 점검하지 않았습니다. 「AI 연결 점검」 버튼을 직접 누르면 점검합니다.', { className: 'state state-empty', role: 'status', 'data-ai-check': 'idle' }));
    return root;
  }
  if (status === 'loading') {
    root.append(node('p', 'AI 연결 점검 중 — 결과가 오기 전입니다. 취소하면 늦게 온 응답은 표시하지 않습니다.', { className: 'state state-loading', role: 'status', 'data-ai-check': 'loading' }));
    return root;
  }
  if (status === 'error') {
    const code = safeCode(error && error.code);
    const group = aiErrorGroup(code);
    root.append(
      node('p', `AI 연결 점검 실패 — ${group.label} (${code}): ${safeText(error && error.message, '서버 메시지 없음')}`, { className: 'state state-error', role: 'alert', 'data-ai-check': 'error', 'data-ai-error-group': group.key }),
      node('p', group.guide),
      node('p', '연결 완료가 아니며, 사건 설명도 실행되지 않았습니다. 자동으로 다시 점검하지 않습니다.', { className: 'muted' }),
    );
    return root;
  }
  if (status === 'ok' && data && typeof data === 'object') {
    const audience = data.audienceAuthorization === 'verified' ? 'verified' : data.audienceAuthorization === 'test' ? 'test' : 'unknown';
    const audienceText = audience === 'verified' ? '앱 권한 확인 후 점검(verified) — 그 시각 기준 앱 권한 확인과 모델 응답'
      : audience === 'test' ? '시험 연결 점검(test) — 시험 연결만 확인했으며 앱 권한 확인은 아님' : '확인 불가(unknown) — 점검 종류를 확인할 수 없습니다';
    root.append(node('p', `AI 연결 점검 결과: ${audienceText}`, { className: `state ${audience === 'unknown' ? 'state-empty' : 'state-ok'}`, role: 'status', 'data-ai-check': 'ok', 'data-ai-audience': audience }));
    const list = node('dl', null, { className: 'kv' });
    row(list, '전송 확인 (transportChecked)', data.transportChecked === true ? '확인됨 (true)' : '확인 불가');
    row(list, '응답 모델 수 (modelCount)', Number.isInteger(data.modelCount) ? String(data.modelCount) : '확인 불가');
    row(list, '점검 시각 (checkedAt)', timeText(checkedAt));
    row(list, '자료 출처', modeInfo.text);
    root.append(list,
      node('p', `사건 설명은 아직 실행하지 않았습니다${explanationAccepted === true ? '' : ' (explanationAccepted: false)'}. 모델 목록 응답은 사건 설명이 아닙니다. 사건 설명은 보안 기록에서 「AI 설명 요청」으로 따로 요청하고 확인하세요.`,
        { className: 'state state-empty', 'data-ai-explanation-accepted': 'false' }),
      node('p', '다시 점검은 「AI 연결 점검」 버튼을 직접 누르세요. 자동으로 다시 점검하지 않습니다.', { className: 'muted' }));
    return root;
  }
  root.append(node('p', '확인 불가 — AI 연결 상태를 확인할 수 없습니다. 연결 완료로 보지 마세요.', { className: 'state state-empty', 'data-ai-check': 'unknown' }));
  return root;
}

// renderExplanation 입력: { event, explanation: { status, mode, data?, error? }, checkedAt }
// 17단계 기초: ok면 바깥 요소에 data-student-explanation-event로 사건 ID를 붙이고 사건 ID와 설명 요약을 보여 줍니다.
// 실패 화면에는 data-student-explanation-event를 붙이지 않습니다. 조치 제안은 자동 실행하지 않습니다.
function renderExplanation(input) {
  const { event, explanation, checkedAt } = input || {};
  const eventId = textOf(event && event.id);
  const status = explanation && explanation.status;
  const root = node('section', null, { className: 'student-explanation', 'data-state': status || 'unknown' });
  root.append(node('h3', '선택한 사건의 AI 설명'));

  if (status === 'ok' && eventId) {
    root.setAttribute('data-student-explanation-event', eventId);
    const data = explanation.data && typeof explanation.data === 'object' ? explanation.data : {};
    const list = node('dl', null, { className: 'kv' });
    row(list, '사건 ID', eventId);
    row(list, 'AI 설명 요약', safeText(data.summary, '설명 요약 없음'));
    row(list, '설명 시각', timeText(checkedAt));
    root.append(list, node('p', 'AI 설명은 참고용입니다. 조치 제안은 자동으로 실행되지 않으며(executed: false), 실행하려면 사람 확인이 필요합니다.', { className: 'muted' }));
    return root;
  }
  if (status === 'error') {
    const code = safeCode(explanation.error && explanation.error.code);
    root.append(
      node('p', `AI 설명 실패${eventId ? ` (사건 ${eventId})` : ''} — ${aiErrorGroup(code).label} (${code}): ${safeText(explanation.error && explanation.error.message, '서버 메시지 없음')}`, { className: 'state state-error', role: 'alert' }),
      node('p', '보안 기록은 그대로 유지됩니다. AI 설명 실패는 기록 삭제나 조치 실행이 아닙니다. 필요하면 직접 다시 요청하세요.', { className: 'muted' }),
    );
    return root;
  }
  if (status === 'loading') {
    root.append(node('p', `AI 설명 요청 중${eventId ? ` (사건 ${eventId})` : ''} — 아직 설명을 받지 않았습니다.`, { className: 'state state-loading', role: 'status' }));
    return root;
  }
  root.append(node('p', 'AI 설명 전 — 보안 기록에서 사건의 「AI 설명 요청」을 직접 누르면 여기에 설명이 표시됩니다.', { className: 'state state-empty', role: 'status' }));
  return root;
}

export function createStudentView() {
  return {
    renderIdentity,
    renderDecision,
    renderEvents: createEventsRenderer(),
    renderStatus,
    renderVulnerabilities() { return '학생 구현 대기: 정확한 설치 버전·OSV 출처·조회 시각·부분 결과·조회 실패를 구분하세요.'; },
    renderAiConnection,
    renderExplanation,
    renderAction() { return '학생 구현 대기: 현재 사건·조치·실제 대상·사람 확인·ACK와 원천 효과·unknown을 구분하세요.'; },
  };
}
