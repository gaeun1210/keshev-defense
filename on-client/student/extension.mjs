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

// ---------- 18단계 · 근거에 연결된 AI 보안 이벤트 설명 (renderExplanation 완성) ----------
// 입력: { event, explanation: { status, mode, data?, error? }, checkedAt }
//   event: 보안 기록에서 고른 기록(15단계와 같은 모양) 또는 null
//   data: { summary, evidenceIds, proposals:[{ action, evidenceIds, reason }], requiresHumanConfirmation:true, executed:false }
// AI 설명은 해석(참고용)입니다. 사실 판단은 근거 글과 연동 시스템이 알려 준 상태로 하며, unknown은 확인 불가로 둡니다.
// 설명·제안만으로 보안 조치는 실행되지 않으며, 이 화면에는 실행 버튼이 없습니다.
// 성공 표식(data-student-explanation-event)은 현재 기록의 근거와 맞는 성공 설명에만 붙입니다.
// 매번 현재 입력으로 새 요소를 만들므로, 다른 기록 선택·다시 불러오기·실패 때 이전 설명과 성공 표식은 남지 않습니다.

// 설명 실패 코드별 실패 이유(근거 부족·근거 불일치 등)
const EXPLANATION_FAILURE_REASONS = Object.freeze({
  ON_AI_INVALID_INPUT: Object.freeze({ label: '근거 부족', reason: '설명에 필요한 기록의 근거·규칙을 확인할 수 없어 설명을 요청하지 않았습니다.' }),
  ON_AI_INVALID_OUTPUT: Object.freeze({ label: '근거·응답 형식 불일치', reason: '없는 근거 ID, 빠진 근거, 지원하지 않는 조치, 이미 실행했다고 답한 설명 등은 쓸 수 없습니다.' }),
  SUBJECT_SCOPE_UNVERIFIED: Object.freeze({ label: '기록 연결 확인 불가', reason: '현재 로그인과 이 기록의 연결을 확인할 수 없어 설명을 쓸 수 없습니다.' }),
});
const EXPLANATION_STATE_KEYS = Object.freeze([['access', '접속'], ['session', '세션'], ['device', '기기']]);
const KNOWN_STATE_VALUES = Object.freeze({
  access: ['allowed', 'denied'], session: ['active', 'expired', 'revoked'], device: ['compliant', 'noncompliant'],
});

function explanationFailure(root, code, message, eventId) {
  const group = aiErrorGroup(code);
  const specific = Object.hasOwn(EXPLANATION_FAILURE_REASONS, code) ? EXPLANATION_FAILURE_REASONS[code] : null;
  root.append(
    node('p', `AI 설명 실패: ${eventId ? `사건 ${eventId} · ` : ''}${specific ? specific.label : group.label} (${code}): ${message}`, { className: 'state state-error', role: 'alert', 'data-student-explanation-failed': code }),
    node('p', `실패 이유: ${specific ? `${specific.label} — ${specific.reason}` : group.guide}`),
    node('p', '기록은 그대로입니다. AI 설명 실패는 과제 실패나 기록 삭제·조치 실행이 아니며, 업무 앱 판정과 보안 기록 목록은 계속 동작합니다. 필요하면 「AI 설명 요청」을 직접 다시 누르세요.', { className: 'muted' }),
  );
  return root;
}

// 현재 기록의 근거·조치와 대조합니다. 맞지 않으면 이유를 돌려주고, 맞으면 null을 돌려줍니다(없는 근거를 만들어 맞추지 않음).
function explanationMismatch(event, data) {
  const evidenceIds = new Set((Array.isArray(event.evidence) ? event.evidence : []).map(item => textOf(item && item.id)).filter(Boolean));
  const supported = new Set((Array.isArray(event.supportedActions) ? event.supportedActions : []).map(textOf).filter(Boolean));
  if (!data || typeof data !== 'object') return '설명 자료가 없습니다.';
  if (data.executed !== false) return 'AI가 이미 실행했다고 답한 설명은 쓸 수 없습니다(executed가 false가 아님).';
  if (data.requiresHumanConfirmation !== true) return '사람 확인이 필요하다는 표시가 없는 설명은 쓸 수 없습니다.';
  if (!textOf(data.summary)) return '설명 요약이 없습니다.';
  const cited = Array.isArray(data.evidenceIds) ? data.evidenceIds.map(textOf) : [];
  if (!cited.length) return '근거 부족 — 설명이 인용한 근거 ID가 없습니다.';
  const missing = cited.filter(id => !id || !evidenceIds.has(id));
  if (missing.length) return `근거가 맞지 않음 — 이 기록(${textOf(event.id)})에 없는 근거 ID: ${missing.map(id => id || '(빈 값)').join(', ')}. 다른 기록의 설명이거나 지어낸 근거일 수 있습니다.`;
  const proposals = Array.isArray(data.proposals) ? data.proposals : [];
  for (const proposal of proposals) {
    const action = textOf(proposal && proposal.action);
    if (!action || !supported.has(action)) return `연동 시스템이 지원하지 않는 조치 제안이 있습니다: ${action || '(빈 값)'}`;
    const refs = Array.isArray(proposal.evidenceIds) ? proposal.evidenceIds.map(textOf) : [];
    if (!refs.length || refs.some(id => !id || !evidenceIds.has(id))) return `조치 제안 ${action}의 근거 ID가 이 기록의 근거와 맞지 않습니다.`;
  }
  return null;
}

function renderExplanation(input) {
  const { event, explanation, checkedAt } = input || {};
  const eventId = textOf(event && event.id);
  const status = explanation && explanation.status;
  const root = node('section', null, { className: 'student-explanation', 'data-state': status || 'unknown' });
  root.append(node('h3', '선택한 사건의 AI 설명'));

  // 1) 실패는 event가 없어도 먼저 보여 줍니다.
  if (status === 'error') {
    const error = explanation.error || {};
    return explanationFailure(root, safeCode(error.code), safeText(error.message, '서버 메시지 없음'), eventId);
  }
  // 오류 없이 기록이 없으면 기록 선택을 먼저 안내합니다.
  if (!event || !eventId) {
    root.append(node('p', '보안 기록에서 기록을 먼저 고르세요. 기록 상세의 「AI 설명 요청」을 누르면 여기에 설명이 표시됩니다.', { className: 'state state-empty', role: 'status', 'data-student-explanation-state': 'no-event' }));
    return root;
  }
  if (status === 'loading') {
    root.append(node('p', `설명 요청 중 — 사건 ${eventId}. 아직 설명을 받지 않았습니다.`, { className: 'state state-loading', role: 'status', 'data-student-explanation-state': 'loading' }));
    return root;
  }
  if (status !== 'ok') {
    root.append(node('p', `AI 설명 전 — 사건 ${eventId}. 기록 상세의 「AI 설명 요청」을 직접 누르면 설명을 요청합니다.`, { className: 'state state-empty', role: 'status', 'data-student-explanation-state': 'idle' }));
    return root;
  }

  // 2) 성공 응답이라도 현재 기록의 근거와 맞지 않으면 쓰지 않습니다(성공 표식 없음).
  const data = explanation.data;
  const mismatch = explanationMismatch(event, data);
  if (mismatch) {
    root.append(
      node('p', `이 설명은 쓸 수 없습니다 (EVIDENCE_MISMATCH): ${mismatch}`, { className: 'state state-error', role: 'alert', 'data-student-explanation-failed': 'EVIDENCE_MISMATCH' }),
      node('p', '내용을 지어내거나 근거를 맞춰 넣지 않았습니다. 기록은 그대로입니다. 필요하면 「AI 설명 요청」을 직접 다시 누르세요.', { className: 'muted' }),
    );
    return root;
  }

  root.setAttribute('data-student-explanation-event', eventId);
  const evidenceById = new Map(event.evidence.map(item => [textOf(item && item.id), textOf(item && item.text) || '근거 글 없음']));

  // 사건 ID와 참고용 AI 요약
  root.append(node('h4', 'AI 설명(참고용)'));
  const head = node('dl', null, { className: 'kv' });
  row(head, '사건 ID', eventId);
  row(head, 'AI 요약', safeText(data.summary, '설명 요약 없음'));
  row(head, '설명 시각', timeText(checkedAt));
  root.append(head, node('p', 'AI 설명은 해석입니다. 사실 판단은 아래 근거 글과 연동 시스템이 알려 준 상태로 하세요.', { className: 'muted' }));

  // 3) 인용한 근거: 근거 ID — 근거 글
  root.append(node('h4', '인용한 근거'));
  const evidenceList = node('ul', null, { 'data-student-explanation-evidence': eventId });
  for (const id of data.evidenceIds.map(textOf)) evidenceList.append(node('li', `${id} — ${evidenceById.get(id)}`, { 'data-evidence-id': id }));
  root.append(evidenceList);

  // 규칙: 규칙 ID — 규칙 글
  root.append(node('h4', '규칙'));
  const rules = Array.isArray(event.rules) ? event.rules : [];
  if (rules.length) {
    const ruleList = node('ul');
    for (const rule of rules) ruleList.append(node('li', `${textOf(rule && rule.id) || 'ID 확인 불가'} — ${textOf(rule && rule.text) || '규칙 글 없음'}`));
    root.append(ruleList);
  } else root.append(node('p', '규칙 없음', { className: 'muted' }));

  // 4) 확인 불가 상태: 접속·세션·기기별로 나눠 원래 값과 함께
  root.append(node('h4', '확인 불가 상태'));
  const state = event.state && typeof event.state === 'object' ? event.state : {};
  const unknowns = EXPLANATION_STATE_KEYS.filter(([key]) => !KNOWN_STATE_VALUES[key].includes(state[key]));
  if (unknowns.length) {
    const unknownList = node('ul', null, { 'data-student-explanation-unknown': eventId });
    for (const [key, label] of unknowns) unknownList.append(node('li', `${label}: 확인 불가(${textOf(state[key]) || 'unknown'}) — 정상·안전으로 보지 않습니다.`));
    root.append(unknownList);
  } else root.append(node('p', '없음'));

  // 제안: 없으면 없는 까닭, 있으면 이유와 미실행 상태(실행 버튼 없음)
  root.append(node('h4', '조치 제안'));
  const proposals = Array.isArray(data.proposals) ? data.proposals : [];
  const supported = (Array.isArray(event.supportedActions) ? event.supportedActions : []).filter(Boolean);
  if (!proposals.length) {
    root.append(node('p', supported.length
      ? 'AI가 제안한 조치가 없습니다. 연동 시스템이 지원하는 조치는 있지만 이 설명에는 제안이 포함되지 않았습니다.'
      : '연동 시스템이 지원하는 조치가 없어 제안이 없습니다(정상).', { 'data-student-explanation-proposals': '0' }));
  } else {
    const proposalList = node('ul', null, { 'data-student-explanation-proposals': String(proposals.length) });
    for (const proposal of proposals) {
      proposalList.append(node('li', `${textOf(proposal.action)} — ${safeText(proposal.reason, '이유 없음')} (근거: ${proposal.evidenceIds.map(textOf).join(', ')}) · 사람 확인이 필요하며 실행되지 않았습니다.`));
    }
    root.append(proposalList);
  }
  root.append(node('p', '설명·제안만으로 보안 조치는 실행되지 않습니다(executed: false). 실행하려면 사람 확인이 필요합니다.', { className: 'muted' }));
  return root;
}

// ---------- 19단계 · 보안 조치 요청 상태와 실제 결과 구분 (renderAction) ----------
// 입력: { status, event, actionId, target, receipt, observation, message, confirmationExpiresAt?, error? }
//   status: idle·loading·executing·prepared·pending·succeeded·denied·failed·unknown·error·expired
//   target: { id, generation } 또는 null · receipt: { requestId, receiptId, eventId, actionId, status, version, replayed, superseded? }
//   observation: { observedAt, effectApplied } 또는 null
// 구분: AI 제안(실행 아님) → 사람 확인(제공 화면 버튼) → 서버 접수(ACK, 효과 아님) → 연동 시스템 효과 관측(effectApplied: true).
// 학생 함수는 조치 버튼·POST 요청·확인 티켓을 만들거나 저장하지 않습니다. 집행·재조회·취소는 제공 화면 버튼만 씁니다.
// 매번 현재 입력으로 새 요소를 만들므로, 새 값·다시 불러오기·다른 기록 선택 뒤 이전 대상·요청·결과는 남지 않습니다.

const ACTION_STATUS_INFO = Object.freeze({
  idle: Object.freeze({ label: '아직 미실행 (idle)', tone: 'empty', note: '조치 제안은 아직 실행되지 않았습니다. 현재 기록은 연동 시스템이 지원하는 조치가 없어(supportedActions 빈 배열) 조치 준비 버튼이 나오지 않는 것이 정상입니다.' }),
  loading: Object.freeze({ label: '조치 준비 또는 결과 조회 중 (loading)', tone: 'loading', note: '아직 미실행이거나 결과를 조회하는 중입니다. 효과가 확인된 상태가 아닙니다.' }),
  prepared: Object.freeze({ label: '준비됨·미실행 (prepared)', tone: 'empty', note: '조치를 준비만 했습니다. 아직 서버에 전달하지 않았습니다. 실제 대상과 조치를 확인한 뒤 확인 기한 안에 제공 화면의 「대상과 조치를 확인했으며 집행합니다」를 직접 눌러야 전달됩니다.' }),
  executing: Object.freeze({ label: '서버에 전달 중 (executing)', tone: 'loading', note: '사람 확인 뒤 서버에 전달하는 중입니다. 결과가 아직 없으며 완료 아님입니다.' }),
  pending: Object.freeze({ label: '서버 접수·처리 중 (pending)', tone: 'loading', note: '서버가 요청을 받았다는 응답(ACK)만 있습니다. 접수는 효과가 아니며, 연동 시스템의 효과는 아직 확인되지 않았습니다(완료 아님). 제공 화면의 「연동 시스템 결과만 재조회」로 결과를 직접 확인하세요.' }),
  succeeded: Object.freeze({ label: '효과 확인 (succeeded)', tone: 'ok', note: '연동 시스템이 효과를 관측했습니다(effectApplied: true).' }),
  denied: Object.freeze({ label: '거절 (denied)', tone: 'error', note: '연동 시스템이 이 조치를 거절했습니다. 효과는 적용되지 않았습니다.' }),
  failed: Object.freeze({ label: '실패 (failed)', tone: 'error', note: '연동 시스템이 이 조치를 처리하지 못했습니다.' }),
  unknown: Object.freeze({ label: '결과 불명 (unknown)', tone: 'empty', note: '성공으로도, 효과 없음으로도 판단하지 마세요. 다시 집행하지 말고 제공 화면의 「연동 시스템 결과만 재조회」로 결과만 직접 다시 조회하세요.' }),
  expired: Object.freeze({ label: '확인 기한 지남 (expired)', tone: 'empty', note: '확인 기한이 지나 이 준비로는 집행할 수 없습니다. 현재 기록에서 조치를 다시 준비하세요.' }),
  error: Object.freeze({ label: '요청 처리 안 됨 (error)', tone: 'error', note: '요청이 처리되지 않았습니다. 성공이나 효과로 보지 마세요.' }),
});

function renderAction(input) {
  const { status: rawStatus, event, actionId, target, receipt, observation, message, confirmationExpiresAt, error } = input || {};
  const eventId = textOf(event && event.id);
  const action = textOf(actionId);
  const rec = receipt && typeof receipt === 'object' ? receipt : null;
  const obs = observation && typeof observation === 'object' ? observation : null;
  let status = typeof rawStatus === 'string' && Object.hasOwn(ACTION_STATUS_INFO, rawStatus) ? rawStatus : 'unknown';
  const notes = [];

  // 현재 의도와 결과가 같은 사건·조치인지 다시 대조합니다. 다르면 결과 불명으로 둡니다.
  const bound = !rec || ((!rec.eventId || rec.eventId === eventId) && (!rec.actionId || rec.actionId === action));
  if (!bound) { status = 'unknown'; notes.push('받은 결과가 현재 사건·조치와 맞지 않아 이 결과를 현재 결과로 쓰지 않습니다.'); }
  // 효과 관측(effectApplied === true)이 없으면 succeeded라도 효과 확인으로 표시하지 않습니다.
  if (status === 'succeeded' && !(obs && obs.effectApplied === true && textOf(obs.observedAt))) {
    status = 'unknown';
    notes.push('succeeded가 왔지만 연동 시스템의 효과 관측(effectApplied: true)이 없어 결과 불명으로 처리했습니다.');
  }
  if (rawStatus && !Object.hasOwn(ACTION_STATUS_INFO, rawStatus)) notes.push(`알 수 없는 상태 값(${textOf(rawStatus) || '없음'})이라 결과 불명으로 처리했습니다.`);

  const info = ACTION_STATUS_INFO[status];
  const root = node('section', null, { className: 'student-action', 'data-student': 'action', 'data-state': status });
  if (eventId && bound) root.setAttribute('data-student-action-event', eventId);
  if (rec && textOf(rec.requestId) && bound) root.setAttribute('data-student-action-request', textOf(rec.requestId));

  root.append(node('h3', '보안 조치 요청 상태'),
    node('p', `상태: ${info.label}`, { className: `state state-${info.tone}`, role: info.tone === 'error' ? 'alert' : 'status', 'data-action-status': status }),
    node('p', info.note));
  for (const text of notes) root.append(node('p', text, { className: 'state state-empty' }));
  if (status === 'error' || status === 'expired' || (status === 'unknown' && error)) {
    root.append(node('p', `오류 (${safeCode(error && error.code)}): ${safeText(error && error.message, '서버 메시지 없음')}`, { className: 'state state-error', role: 'alert' }));
  }
  if ((status === 'denied' || status === 'failed') && textOf(message)) root.append(node('p', `연동 시스템 메시지: ${safeText(message, '')}`));
  else if (textOf(message)) root.append(node('p', `제공 화면 안내: ${safeText(message, '')}`, { className: 'muted' }));

  // 받은 범위에서만 현재 사건·조치·대상·요청 정보를 글자로 보여 줍니다(없는 값은 만들지 않음).
  const list = node('dl', null, { className: 'kv' });
  const add = (term, value) => { if (value !== undefined && value !== null && String(value) !== '') row(list, term, String(value)); };
  add('사건 ID (event.id)', eventId);
  const evidence = event && Array.isArray(event.evidence) ? event.evidence.map(item => textOf(item && item.id)).filter(Boolean) : [];
  if (evidence.length) add('근거 ID', evidence.join(', '));
  add('조치 (actionId)', action);
  if (target && typeof target === 'object') {
    add('실제 대상 (target.id)', textOf(target.id));
    add('대상 세대 (target.generation)', Number.isSafeInteger(target.generation) ? target.generation : '');
  }
  if (status === 'prepared') add('확인 기한 (confirmationExpiresAt)', confirmationExpiresAt ? timeText(confirmationExpiresAt) : '확인 불가');
  // 현재 사건·조치와 맞지 않는 결과의 요청·접수 정보는 현재 화면에 쓰지 않습니다.
  if (rec && bound) {
    add('요청 번호 (requestId)', textOf(rec.requestId));
    add('접수 번호 (receiptId)', textOf(rec.receiptId));
    add('버전 (version)', Number.isSafeInteger(rec.version) ? rec.version : '');
    if (typeof rec.replayed === 'boolean') add('중복 요청 여부 (replayed)', rec.replayed
      ? 'true — 같은 요청 번호의 요청이 다시 와서 서버가 새로 처리하지 않고 이전 결과를 돌려줬습니다(중복 집행 없음).'
      : 'false — 이 요청 번호로 처음 처리한 결과입니다.');
    if (rec.superseded === true) add('대체 여부 (superseded)', 'true — 새 요청으로 대체됐습니다. 이 결과는 현재 결과가 아닙니다.');
  }
  if (status === 'succeeded') {
    add('효과 관측 시각 (observedAt)', timeText(obs.observedAt));
    add('효과 적용 (effectApplied)', 'true');
  }
  if (list.childElementCount) root.append(list);

  root.append(node('p', '이 칸은 상태만 보여 줍니다. 조치 준비·집행·결과 재조회·취소는 제공 화면의 버튼을 직접 누르세요. 같은 요청 번호로는 서버가 한 번만 처리하며, 이 칸은 요청을 보내지 않습니다. 「조치 화면 취소」는 이미 서버에 전달된 조치의 효과를 되돌리지 않습니다.', { className: 'muted' }));
  return root;
}

// ---------- 20단계 · 설치 패키지 버전과 알려진 취약점 조회 결과 (renderVulnerabilities) ----------
// 입력: { status: 'idle'|'loading'|'error'|'ok', mode, data?, error? }
//   data.status: complete · partial · not_checked · not_configured · unverifiable
//   data: { lockfileVersion?, lockfileHash?, checkedAt, code?, excluded?, packages:[{ name, version, status, vulnerabilities:[{ id, modified }], source, checkedAt }] }
// 결과는 package-lock.json과 설치된 node_modules 메타데이터를 대조한 정확한 설치 버전을 OSV에 조회한 값입니다(^1.2.0 같은 범위가 아님).
// 조회 실패·미조회는 "취약점 없음"이 아닙니다. 일부 조회 실패에서도 이미 받은 취약점 ID는 지우지 않습니다.
// 매번 현재 입력으로 새 요소를 만들므로, 조회 중·오류·취소 때 이전 표를 현재 결과처럼 남기지 않습니다.
// 늦게 온 응답은 제공 화면이 세대 번호로 버리고, 학생 함수는 전달된 현재 입력만 그립니다. 자동 재조회는 하지 않습니다.

const SCAN_STATUS_INFO = Object.freeze({
  complete: Object.freeze({ label: '모두 조회 (complete)', tone: 'ok', note: '조회 대상 패키지를 모두 OSV와 대조했습니다.' }),
  partial: Object.freeze({ label: '일부 조회 실패 (partial)', tone: 'error', note: '일부 패키지는 조회를 확인할 수 없습니다. 이미 받은 취약점 ID는 그대로 표시합니다. 조회 실패는 취약점 없음이 아닙니다.' }),
  not_checked: Object.freeze({ label: '아직 조회 안 함 (not_checked)', tone: 'empty', note: '승인된 공개 조회 대상 패키지가 없어 OSV에 조회하지 않았습니다. 미조회는 취약점 없음이 아닙니다. 허용 패키지는 운영자가 준비하며 학생이 설정을 바꾸지 않습니다.' }),
  not_configured: Object.freeze({ label: '조회 준비 미완료 (not_configured)', tone: 'empty', note: '조회 대상 프로젝트 설정이 필요합니다. 대상 경로는 운영자가 준비하며 학생이 설정을 바꾸지 않습니다. 미조회는 취약점 없음이 아닙니다.' }),
  unverifiable: Object.freeze({ label: 'lock 파일 확인 불가 (unverifiable)', tone: 'error', note: 'package-lock.json을 확인할 수 없어 설치 버전을 조회하지 않았습니다. 취약점 없음이 아닙니다.' }),
});
const PACKAGE_STATUS_LABELS = Object.freeze({
  known_vulnerabilities: '알려진 항목 있음 (known_vulnerabilities)',
  none_found: '알려진 항목 없음 (none_found) — 이 버전을 OSV에서 조회한 범위에 알려진 항목이 없다는 뜻이며, 안전을 보장하지 않습니다',
  unverifiable: '조회 확인 불가 (unverifiable) — 취약점 없음이 아닙니다',
});
// 정확한 설치 버전(semver)만 버전으로 씁니다. ^·~·범위·x 같은 값은 설치 버전으로 표시하지 않습니다.
const EXACT_VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

function packageStatusText(pkg, findings) {
  if (pkg.status === 'unverifiable' && findings.length) return '일부 확인·전체 조회 확인 불가 (unverifiable) — 받은 취약점 ID는 유지합니다';
  return PACKAGE_STATUS_LABELS[pkg.status] || `확인 불가 (${textOf(pkg.status) || 'unknown'})`;
}

function renderVulnerabilities(input) {
  const { status, mode, data, error } = input || {};
  const modeInfo = modeLabel(mode);
  const root = node('section', null, { className: 'student-vulnerabilities', 'data-student': 'vulnerabilities', 'data-state': status || 'unknown' });
  root.append(node('h3', '설치 패키지 버전과 알려진 취약점(OSV)'),
    node('p', `자료 출처: ${modeInfo.text}`, { className: 'muted', 'data-mode': modeInfo.key }));
  const footer = () => node('p', 'OSV는 알려진 취약점 데이터베이스입니다. 조회 결과가 없다는 사실만으로 패키지나 앱 전체가 안전하다고 보장할 수 없습니다. 취약점을 확인하려고 의존성을 임의로 바꾸지 마세요.', { className: 'muted' });

  if (status === 'idle') {
    root.append(node('p', '조회 전 — 「설치 패키지 조회」 버튼을 직접 누르면 조회합니다.', { className: 'state state-empty', role: 'status', 'data-student-scan': 'idle' }), footer());
    return root;
  }
  if (status === 'loading') {
    root.append(node('p', '조회 중 — 결과가 오기 전입니다. 이전 표는 현재 결과가 아니어서 표시하지 않습니다.', { className: 'state state-loading', role: 'status', 'data-student-scan': 'loading' }));
    return root;
  }
  if (status === 'error') {
    const code = safeCode(error && error.code);
    const cancelled = ['CANCELLED', 'REQUEST_CANCELLED'].includes(code);
    root.append(
      node('p', `${cancelled ? '조회 취소' : '조회 실패'} (${code}): ${safeText(error && error.message, '서버 메시지 없음')}`, { className: 'state state-error', role: 'alert', 'data-student-scan': cancelled ? 'cancelled' : 'error' }),
      node('p', '조회 실패·취소는 "취약점 없음"이 아닙니다. 이전 결과는 현재 확인 결과가 아니어서 표시하지 않습니다. 다시 조회는 「설치 패키지 조회」 버튼을 직접 누르세요(자동으로 다시 조회하지 않음).'),
      footer());
    return root;
  }
  if (status !== 'ok' || !data || typeof data !== 'object' || !Object.hasOwn(SCAN_STATUS_INFO, data.status)) {
    root.append(node('p', '확인 불가 — 조회 결과 형식을 확인할 수 없어 표시하지 않습니다. 취약점 없음이 아닙니다.', { className: 'state state-empty', 'data-student-scan': 'unknown' }), footer());
    return root;
  }

  // 전체 조회 상태: 원래 값과 한국어 설명
  const info = SCAN_STATUS_INFO[data.status];
  root.append(node('p', `전체 조회 상태: ${info.label}`, { className: `state state-${info.tone}`, role: 'status', 'data-student-scan': data.status }), node('p', info.note));

  // 전체 결과 정보: 전달된 값만 표시
  const summary = node('dl', null, { className: 'kv' });
  if (textOf(data.code)) row(summary, '상태 코드', textOf(data.code));
  if (Number.isSafeInteger(data.lockfileVersion)) row(summary, 'lock 파일 버전 (lockfileVersion)', String(data.lockfileVersion));
  if (textOf(data.lockfileHash)) row(summary, 'lock 파일 해시 (lockfileHash)', textOf(data.lockfileHash));
  row(summary, '조회 시각 (checkedAt)', timeText(data.checkedAt));
  if (data.excluded && Number.isSafeInteger(data.excluded.count)) row(summary, '조회에서 제외한 패키지 수', `${data.excluded.count}개 (승인되지 않았거나 공개 조회 대상이 아닌 패키지는 밖으로 보내지 않음)`);
  root.append(summary);
  if (textOf(data.lockfileHash)) root.append(node('p', '버전은 package-lock.json과 설치된 node_modules 메타데이터를 대조한 정확한 설치 버전입니다. 패키지를 바꾼 뒤 다시 조회하면 새 lockfileHash로 바뀝니다.', { className: 'muted' }));

  const packages = Array.isArray(data.packages) ? data.packages : [];
  if (!packages.length) {
    root.append(node('p', data.status === 'complete' || data.status === 'partial'
      ? '조회 대상 패키지가 없습니다.'
      : '표시할 패키지 행이 없습니다(미조회 상태). 취약점 없음이 아닙니다.', { className: 'state state-empty' }), footer());
    return root;
  }

  // 패키지 표: 행마다 data-student-package-name·data-student-package-version
  const table = node('table', null, { className: 'student-package-table' });
  table.append(node('caption', `패키지 ${packages.length}개 (정확한 설치 버전 기준)`));
  const head = node('tr');
  for (const title of ['패키지 (name)', '설치 버전 (version)', '조회 결과 (status)', '취약점 ID · 수정 시각 (modified)', '출처 (source)', '조회 시각 (checkedAt)']) head.append(node('th', title, { scope: 'col' }));
  const thead = node('thead'); thead.append(head);
  const tbody = node('tbody');
  for (const item of packages) {
    const pkg = item && typeof item === 'object' ? item : {};
    const name = textOf(pkg.name) || '이름 확인 불가';
    const version = textOf(pkg.version);
    const exact = version && EXACT_VERSION.test(version) ? version : null;
    const findings = Array.isArray(pkg.vulnerabilities) ? pkg.vulnerabilities.filter(v => v && textOf(v.id)) : [];
    const tr = node('tr', null, { 'data-student-package-name': name, 'data-student-package-version': exact || 'unverifiable', 'data-student-package-status': textOf(pkg.status) || 'unknown' });
    const findingCell = node('td');
    if (findings.length) {
      const list = node('ul');
      for (const finding of findings) list.append(node('li', `${textOf(finding.id)} · 수정 시각 ${timeText(finding.modified)}`, { 'data-student-vulnerability-id': textOf(finding.id) }));
      findingCell.append(list);
    } else findingCell.textContent = pkg.status === 'none_found' ? '없음 (조회 범위 기준)' : '받은 항목 없음 — 조회 확인 불가';
    tr.append(
      node('th', name, { scope: 'row' }),
      node('td', exact || `정확한 버전 확인 불가 (${version || '값 없음'})`),
      node('td', packageStatusText(pkg, findings)),
      findingCell,
      node('td', textOf(pkg.source) || '출처 확인 불가'),
      node('td', timeText(pkg.checkedAt)),
    );
    tbody.append(tr);
  }
  table.append(thead, tbody);
  root.append(table, footer());
  return root;
}

export function createStudentView() {
  return {
    renderIdentity,
    renderDecision,
    renderEvents: createEventsRenderer(),
    renderStatus,
    renderVulnerabilities,
    renderAiConnection,
    renderExplanation,
    renderAction,
  };
}
