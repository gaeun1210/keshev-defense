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

// ---------- 총공세 2일차 · 내 PC 관제 대시보드 (renderStatus 맨 위) ----------
// 측정은 제공 기능입니다: 서버 src/pc-status.mjs가 일반 권한으로 읽고, 제공 카드 「내 PC 상태」와 같은 실측을
//   학생 통로 api.get('/api/pc/status')로 돌려줍니다. 학생 코드는 측정을 다시 구현하지 않습니다.
// 내가 더한 부분: 상태 카드 4개 요약, 직전 조회 대비 변화(추이 비교), 최근 조회 목록, 확인 불가·오래됨·실패 구분.
// 원칙: 사용자가 「다시 조회」를 누를 때만 읽고 자동 반복하지 않습니다. 예시 숫자를 쓰지 않습니다.
//       조회 기록은 앱 메모리에만 두며(최대 20회) 새로고침하면 비워집니다. 실패·조회 중에는 이전 값을 현재 값처럼 보여 주지 않습니다.

const PC_PATH = '/api/pc/status';
const PC_SCHEMA = 'aleph.on.pc-status.v1';
const PC_HISTORY_LIMIT = 20;
const PC_STALE_MS = 60000;
const GIB = 1024 ** 3;
const PC_REASONS = Object.freeze({
  permission_denied: '읽기 권한이 없습니다. 관리자 권한으로 바꾸지 말고 담당자에게 확인하세요.',
  unsupported: '이 운영체제에서는 이 항목을 조회하지 않습니다.',
  timeout: '조회 시간이 초과됐습니다. 잠시 뒤 「다시 조회」를 누르세요.',
  cancelled: '조회가 취소됐습니다. 「다시 조회」를 누르세요.',
  invalid_sample: 'CPU 표본이 올바르지 않아 계산하지 못했습니다. 「다시 조회」를 누르세요.',
  invalid_response: '값이나 단위를 확인할 수 없습니다. 정상으로 판단하지 마세요.',
  query_failed: '이번 조회에서 값을 읽지 못했습니다. 「다시 조회」를 누르세요.',
});
const PC_CARDS = Object.freeze([['cpu', 'CPU 사용률'], ['memory', '메모리 사용량'], ['disk', '디스크 남은 공간'], ['firewall', 'Windows 방화벽']]);

const isNum = n => typeof n === 'number' && Number.isFinite(n) && n >= 0;
const gb = n => `${(n / GIB).toFixed(1)} GB`;
// 표시 자릿수보다 작은 변화는 「변화 거의 없음」으로 적습니다(+0.00 같은 표시 방지).
const signed = (n, digits, unit) => (Math.abs(n) < 0.5 * 10 ** -digits ? `변화 거의 없음(${(10 ** -digits).toFixed(digits)}${unit} 미만)` : `${n > 0 ? '+' : '−'}${Math.abs(n).toFixed(digits)}${unit}`);
const clockText = ms => new Date(ms).toLocaleTimeString('ko-KR');

// 지표 하나를 해석합니다. 계약에 맞지 않으면 확인 불가로 둡니다(0이나 정상으로 바꾸지 않음).
function readPcMetric(key, metric) {
  if (!metric || metric.state !== 'ok') {
    const reason = textOf(metric && metric.reason) || 'invalid_response';
    return { ok: false, reason, text: '이번 조회에서 읽지 못함', note: PC_REASONS[reason] || PC_REASONS.invalid_response };
  }
  if (key === 'cpu' && isNum(metric.usagePercent) && metric.usagePercent <= 100) {
    return { ok: true, number: metric.usagePercent, pct: metric.usagePercent, text: `${metric.usagePercent.toFixed(1)} %`, note: `${isNum(metric.sampleMs) ? metric.sampleMs : 200}ms 동안 잰 순간값이라 작업 관리자와 조금 다를 수 있습니다.`, caution: metric.usagePercent >= 90 };
  }
  if (key === 'memory' && isNum(metric.usedBytes) && isNum(metric.totalBytes) && metric.totalBytes > 0 && metric.usedBytes <= metric.totalBytes) {
    const ratio = metric.usedBytes / metric.totalBytes;
    return { ok: true, number: metric.usedBytes / GIB, pct: ratio * 100, text: `${gb(metric.usedBytes)} / ${gb(metric.totalBytes)} (${(ratio * 100).toFixed(0)} %)`, note: '사용 중 / 전체 메모리 (1 GB = 1024³ 바이트)', caution: ratio >= 0.85 };
  }
  if (key === 'disk' && isNum(metric.freeBytes) && isNum(metric.totalBytes) && metric.totalBytes > 0 && metric.freeBytes <= metric.totalBytes) {
    const ratio = metric.freeBytes / metric.totalBytes;
    return { ok: true, number: metric.freeBytes / GIB, pct: ratio * 100, text: `${gb(metric.freeBytes)} 여유 / ${gb(metric.totalBytes)} (${(ratio * 100).toFixed(1)} %)`, note: '이 앱이 있는 드라이브의 여유 / 전체 공간 (1 GB = 1024³ 바이트)', caution: ratio < 0.1 };
  }
  if (key === 'firewall' && Array.isArray(metric.profiles) && metric.profiles.length === 3
      && ['Domain', 'Private', 'Public'].every(name => metric.profiles.some(p => p && p.name === name && typeof p.enabled === 'boolean'))) {
    const off = metric.profiles.filter(p => !p.enabled).map(p => p.name);
    return { ok: true, text: metric.profiles.map(p => `${p.name} ${p.enabled ? '켜짐' : '꺼짐'}`).join(' · '), note: '설정을 읽기만 했습니다. 앱은 방화벽 설정을 바꾸지 않으며, 보호 전체의 안전 판정이 아닙니다.', caution: off.length > 0, signature: metric.profiles.map(p => `${p.name}:${p.enabled}`).join(',') };
  }
  return { ok: false, reason: 'invalid_response', text: '이번 조회에서 읽지 못함', note: PC_REASONS.invalid_response };
}

// 직전 조회 대비 변화: 두 조회 모두 그 지표를 읽었을 때만 계산합니다.
function pcDelta(key, now, before) {
  if (!before) return '직전 조회 없음 (첫 조회)';
  if (!now.ok || !before.ok) return '직전 대비 비교 불가 (어느 한쪽이 확인 불가)';
  if (key === 'cpu') return `직전 대비 ${signed(now.number - before.number, 1, '%p')}`;
  if (key === 'memory') return `직전 대비 사용량 ${signed(now.number - before.number, 2, ' GB')}`;
  if (key === 'disk') return `직전 대비 여유 ${signed(now.number - before.number, 2, ' GB')}`;
  if (key === 'firewall') return now.signature === before.signature ? '직전과 같음' : '직전과 달라짐 — 설정 변경을 확인하세요';
  return '';
}

// ---------- 총공세 3일차: 연결과 기록(네트워크 구성·Windows 기록 건수·SDP 서버 연결) ----------
// 네트워크·기록 건수는 제공 PC 조회(같은 /api/pc/status 응답)의 값을 읽기만 합니다.
// SDP 연결은 PC 조회와 다른 응답(/api/me)의 서버 연결 상태(meta.mode)로 따로 판단해, PC 조회 성공과 섞지 않습니다.
const SDP_PATH = '/api/me';
const LOCAL_FAILURE_CODES = new Set(['NETWORK_ERROR', 'TIMEOUT', 'CANCELLED', 'INVALID_RESPONSE', 'NOT_ALLOWED', 'REQUEST_FAILED']);
const PC_CONN = Object.freeze([['network', '네트워크 구성'], ['events', 'Windows 기록 경고·오류']]);
const isCount = n => Number.isInteger(n) && n >= 0;

function readPcConn(key, metric) {
  if (!metric || metric.state !== 'ok') {
    const reason = textOf(metric && metric.reason) || 'invalid_response';
    return { ok: false, reason, text: '이번 조회에서 읽지 못함', note: PC_REASONS[reason] || PC_REASONS.invalid_response };
  }
  if (key === 'network' && isCount(metric.interfaceCount) && isCount(metric.ipv4Count)) {
    return {
      ok: true, interfaces: metric.interfaceCount, ipv4: metric.ipv4Count,
      text: metric.interfaceCount ? `연결된 어댑터 ${metric.interfaceCount}개 · IPv4 주소 ${metric.ipv4Count}개` : '외부와 연결된 어댑터 없음 (0개)',
      note: '개수만 읽고 IP 주소는 받지 않습니다. 가상 어댑터(VMware 등)도 셉니다. 인터넷 연결 여부나 연결 품질을 뜻하지 않습니다.',
      caution: metric.interfaceCount === 0,
    };
  }
  const since = metric && typeof metric.since === 'string' ? Date.parse(metric.since) : NaN;
  if (key === 'events' && isCount(metric.warningCount) && isCount(metric.errorCount) && typeof metric.truncated === 'boolean' && Number.isFinite(since)) {
    return {
      ok: true, warning: metric.warningCount, error: metric.errorCount, truncated: metric.truncated, since,
      text: `경고 ${metric.warningCount.toLocaleString("ko-KR")}건 · 오류 ${metric.errorCount.toLocaleString("ko-KR")}건${metric.truncated ? ` (${(isCount(metric.sampleLimit) ? metric.sampleLimit : 5000).toLocaleString("ko-KR")}건이 넘어 최근 것만 셈)` : ''}`,
      note: `최근 24시간(${new Date(since).toLocaleString('ko-KR')}부터) System·Application 기록의 경고·오류 건수입니다. 이 건수는 침해나 공격 탐지 결과가 아닙니다.`,
    };
  }
  return { ok: false, reason: 'invalid_response', text: '이번 조회에서 읽지 못함', note: PC_REASONS.invalid_response };
}

function pcConnDelta(key, now, before) {
  if (!before) return '직전 조회 없음 (첫 조회)';
  if (!now.ok || !before.ok) return '직전 대비 비교 불가 (어느 한쪽이 확인 불가)';
  if (key === 'network') return now.interfaces === before.interfaces && now.ipv4 === before.ipv4 ? '직전과 같음' : `직전과 달라짐 (어댑터 ${before.interfaces}→${now.interfaces}개, IPv4 ${before.ipv4}→${now.ipv4}개)`;
  if (key === 'events') {
    const d = n => (n === 0 ? '변화 없음' : `${n > 0 ? '+' : '−'}${Math.abs(n)}건`);
    return `직전 대비 경고 ${d(now.warning - before.warning)} · 오류 ${d(now.error - before.error)} (24시간 범위가 함께 움직이므로 새로 생긴 건수와 같지 않음)`;
  }
  return '';
}

// SDP 서버 연결 상태. 서버가 직접 보낸 연결 상태(mode)와 확인 시각이 있을 때만 연결·미연결을 말합니다.
function readSdp(result) {
  const meta = result && result.meta && typeof result.meta === 'object' ? result.meta : null;
  const checkedAt = meta && typeof meta.checkedAt === 'string' && Number.isFinite(Date.parse(meta.checkedAt)) ? Date.parse(meta.checkedAt) : null;
  const code = safeCode(result && result.error && result.error.code) || null;
  if (!result || (result.ok !== true && (!code || LOCAL_FAILURE_CODES.has(code))) || checkedAt === null) {
    return { kind: 'unknown', label: '확인 불가', text: `SDP 연결 여부를 확인하지 못했습니다${code ? ` (${code})` : ''}.`, note: '앱 서버가 응답하지 않았거나 응답을 확인할 수 없습니다. 미연결로 단정하지 않습니다. 「다시 조회」를 누르세요.', checkedAt };
  }
  if (meta.mode === 'demo') return { kind: 'off', label: 'SDP 미연결', text: '예제 모드로 실행 중이라 SDP 서버에 연결하지 않았습니다.', note: '기기·세션·알림 칸은 예제 자료입니다. PC 조회 결과(위 카드)는 이와 별개인 이 PC의 실측입니다.', checkedAt };
  if (meta.mode === 'disconnected') return { kind: 'off', label: 'SDP 미연결', text: `앱 서버가 SDP 서버 연결 없이 실행 중입니다${code ? ` (${code})` : ''}.`, note: 'PC 조회 결과(위 카드)는 SDP 연결과 별개인 이 PC의 실측입니다.', checkedAt };
  if (meta.mode === 'connected' && result.ok === true) return { kind: 'on', label: 'SDP 연결됨', text: '앱 서버가 SDP 서버 연결 설정으로 실행 중이며, 이번 확인에서 내 정보 응답을 받았습니다.', note: '연결 상태일 뿐 접근 허용이나 안전 판정이 아닙니다.', checkedAt };
  if (meta.mode === 'connected') return { kind: 'unknown', label: '확인 불가', text: `SDP 서버 연결 설정은 있지만 이번 확인에 실패했습니다 (${code || 'UNKNOWN'}).`, note: '연결됨으로 표시하지 않습니다. 잠시 뒤 「다시 조회」를 누르세요.', checkedAt };
  return { kind: 'unknown', label: '확인 불가', text: '서버가 알 수 없는 연결 상태를 보냈습니다.', note: '미연결로 단정하지 않습니다.', checkedAt };
}

// ---------- 총공세 추가: 한눈 요약·점검 결과 복사 ----------
// 한 번의 조회를 항목별 상태로 분류합니다. 4일차 「최근 기록」 필터(전체/주의/확인 불가)도 이 기준을 그대로 씁니다.
//   caution(주의): 기준을 넘은 실측값 / unavailable(확인 불가): 이유가 있는 미측정 / stale(오래됨) / measured(실측 정상)
// Windows 기록 경고·오류 건수는 침해 판정이 아니므로 주의로 세지 않습니다.
const PC_ITEMS = Object.freeze([...PC_CARDS, ...PC_CONN]);
function classifyPcEntry(entry) {
  return PC_ITEMS.map(([key, title]) => {
    const info = key in entry.metrics ? entry.metrics[key] : entry.conn && entry.conn[key];
    const kind = !info || !info.ok ? 'unavailable' : entry.stale ? 'stale' : info.caution ? 'caution' : 'measured';
    return { key, title, kind, info };
  });
}
const PC_KIND_LABEL = Object.freeze({ caution: '주의', unavailable: '확인 불가', stale: '오래됨', measured: '실측' });

// 담당자에게 넘길 점검 결과 글. 제공 응답에 있는 값·이유만 담고, IP 주소·컴퓨터 이름·사용자 이름·토큰은 담지 않습니다.
function buildPcReport(entry, previous, sdp) {
  const at = new Date(entry.measuredAt);
  const lines = [
    '[케셰브 내 PC 점검 결과]',
    `잰 시각: ${at.toLocaleString('ko-KR')} (${at.toISOString()}) · 출처: 이 PC(local-pc), 일반 권한 읽기 전용${entry.stale ? ' · 오래됨(잰 지 60초 넘음)' : ''}`,
  ];
  const items = classifyPcEntry(entry);
  const count = kind => items.filter(item => item.kind === kind).length;
  lines.push(`요약: 주의 ${count('caution')} · 확인 불가 ${count('unavailable')} · 오래됨 ${count('stale')} · 실측 ${count('measured')}`);
  for (const item of items) {
    const before = previous ? (item.key in previous.metrics ? previous.metrics[item.key] : previous.conn && previous.conn[item.key]) : null;
    const delta = item.key in entry.metrics ? pcDelta(item.key, item.info, before) : pcConnDelta(item.key, item.info, before);
    const detail = item.info && item.info.ok ? item.info.text : `이번 조회에서 읽지 못함 — 이유: ${item.info ? item.info.note : PC_REASONS.invalid_response}`;
    lines.push(`- ${item.title}: [${PC_KIND_LABEL[item.kind]}] ${detail} · ${delta}`);
  }
  lines.push(`- SDP 서버 연결: [${sdp ? sdp.label : '확인 불가'}] ${sdp ? sdp.text : '확인하지 못했습니다.'} (PC 조회 결과와 별개)`);
  lines.push('참고: Windows 기록 경고·오류 건수는 침해나 공격 탐지 결과가 아닙니다. 앱은 설정을 바꾸지 않았습니다.');
  lines.push('이 글에는 IP 주소·컴퓨터 이름·사용자 이름·비밀번호·토큰이 들어 있지 않습니다.');
  return lines.join('\n');
}

// ---------- 총공세 4일차: 화면 정리(핵심 3가지 먼저)·추이 그래프·최근 기록 타임라인·오류 화면 ----------
const PC_TIMELINE_LIMIT = 50;
const PC_FILTERS = Object.freeze([['all', '전체'], ['caution', '주의'], ['unavailable', '확인 불가']]);
const PC_DARK = Object.freeze({
  '--bg': '#0f1b2d', '--surface': '#16263d', '--border': '#2b4263', '--text': '#e6edf6', '--muted': '#a9b8cc',
  '--accent': '#2dd4bf', '--accent-soft': '#123a3a', '--on-accent': '#0f1b2d',
  '--allow': '#86efac', '--allow-soft': '#12402c', '--deny': '#fca5a5', '--deny-soft': '#4a1a22',
  '--unknown': '#c3cfdf', '--unknown-soft': '#26354a', '--challenge': '#fcd34d', '--challenge-soft': '#3d3112',
});
const PC_CRITERIA = Object.freeze({ cpu: '주의 기준 90 % 이상', memory: '주의 기준 85 % 이상', disk: '주의 기준 여유 10 % 미만', firewall: '주의 기준: 꺼진 프로필', network: '주의 기준: 연결된 어댑터 0개' });
const PC_TRENDS = Object.freeze([
  ['cpu', 'CPU 사용률', '%', 90, '주의 기준 90 % 이상'],
  ['memory', '메모리 사용률', '%', 85, '주의 기준 85 % 이상'],
  ['disk', '디스크 남은 공간', '%', 10, '주의 기준 10 % 미만'],
]);
// 실패 코드별 「다음에 할 일」. 예시 값이나 이전 값을 대신 보여 주지 않고, 사람이 직접 할 일만 적습니다.
const PC_FAILURE_STEPS = Object.freeze({
  NETWORK_ERROR: ['앱 실행 창(PowerShell)이 켜져 있는지 확인하세요.', '꺼졌으면 on-client 폴더에서 실행 명령으로 앱을 다시 켜세요.', '「다시 조회」를 누르세요.'],
  TIMEOUT: ['PC가 바쁠 수 있으니 10초쯤 기다리세요.', '「다시 조회」를 누르세요.', '계속되면 앱을 껐다 켠 뒤 다시 조회하세요.'],
  CANCELLED: ['조회가 중간에 취소됐습니다. 「다시 조회」를 누르세요.'],
  NOT_ALLOWED: ['시작 틀이 0.2.21 이상인지 확인하세요(docs/STARTER_UPDATE.md).', '그동안은 위쪽 제공 카드 「내 PC 상태」를 쓰세요.'],
  INVALID_RESPONSE: ['이 결과를 정상으로 판단하지 마세요.', '앱을 껐다 켠 뒤 「다시 조회」를 누르세요.', '계속되면 「점검 결과 복사」 대신 오류 코드와 시각을 담당자에게 전달하세요.'],
});
const PC_FAILURE_DEFAULT = Object.freeze(['「다시 조회」를 누르세요.', '계속되면 오류 코드와 시각을 담당자에게 전달하세요.']);
const SVG_NS = 'http://www.w3.org/2000/svg';
function svg(tag, attrs = {}, text) {
  const element = document.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attrs)) element.setAttribute(name, String(value));
  if (text !== undefined) element.textContent = String(text);
  return element;
}

// 직전 성공 조회와 비교해 바뀐 점을 사건으로 만듭니다(설정 변화 감지). 두 조회 모두 읽은 값끼리만 비교합니다.
function pcChangeEvents(entry, before) {
  if (!before) return [];
  const events = [];
  const now = classifyPcEntry(entry), was = classifyPcEntry(before);
  now.forEach((item, i) => {
    const prev = was[i];
    if (item.kind === prev.kind || item.kind === 'stale' || prev.kind === 'stale') return;
    // 방화벽·네트워크는 두 조회 모두 읽었으면 아래 「설정 변화」 한 줄로만 남깁니다(같은 일을 두 번 적지 않음).
    if ((item.key === 'firewall' || item.key === 'network') && item.info && item.info.ok && prev.info && prev.info.ok) return;
    if (item.kind === 'caution') events.push({ flags: { caution: true }, text: `주의 발생: ${item.title} — ${item.info.text}` });
    else if (item.kind === 'unavailable') events.push({ flags: { unavailable: true }, text: `확인 불가로 바뀜: ${item.title} — ${item.info ? item.info.note : PC_REASONS.invalid_response}` });
    else if (prev.kind === 'caution') events.push({ flags: {}, text: `주의 해소: ${item.title} — ${item.info.text}` });
    else if (prev.kind === 'unavailable') events.push({ flags: {}, text: `다시 읽힘: ${item.title} — ${item.info.text}` });
  });
  const fw = entry.metrics.firewall, fwBefore = before.metrics.firewall;
  if (fw.ok && fwBefore.ok && fw.signature !== fwBefore.signature) events.push({ flags: { caution: fw.caution }, text: `방화벽 설정 변화: ${fwBefore.text} → ${fw.text} (앱은 읽기만 했습니다)` });
  const net = entry.conn.network, netBefore = before.conn.network;
  if (net.ok && netBefore.ok && (net.interfaces !== netBefore.interfaces || net.ipv4 !== netBefore.ipv4)) events.push({ flags: { caution: net.caution }, text: `네트워크 구성 변화: 어댑터 ${netBefore.interfaces}→${net.interfaces}개, IPv4 ${netBefore.ipv4}→${net.ipv4}개` });
  if (entry.sdp && before.sdp && entry.sdp.kind !== before.sdp.kind) events.push({ flags: { unavailable: entry.sdp.kind === 'unknown' }, text: `SDP 연결 상태 변화: ${before.sdp.label} → ${entry.sdp.label} (PC 조회와 별개)` });
  return events;
}

// 지표 하나의 추이를 작은 꺾은선 그래프로 그립니다. 읽은 조회만 점으로 찍고, 확인 불가 조회에서는 선을 끊습니다.
function renderTrendChart(entries, [key, title, unit, limit, limitText]) {
  const W = 260, H = 120, L = 30, R = 8, T = 10, B = 22;
  const points = entries.map((entry, i) => ({ entry, i, info: entry.metrics[key] }));
  const ok = points.filter(p => p.info.ok);
  const x = i => (entries.length === 1 ? L + (W - L - R) / 2 : L + (i * (W - L - R)) / (entries.length - 1));
  const y = v => T + ((100 - Math.max(0, Math.min(100, v))) * (H - T - B)) / 100;
  const box = node('figure', null, { className: 'student-pc-trend', 'data-student-pc-trend': key });
  Object.assign(box.style, { margin: '0', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px', background: 'var(--surface)' });
  const last = ok.length ? ok[ok.length - 1].info.pct : null;
  const caption = node('figcaption', null);
  caption.append(node('strong', title), node('span', last === null ? ' · 읽은 값 없음' : ` · 마지막 성공 조회 ${last.toFixed(1)} ${unit}`, { className: 'muted' }));
  // 주의 기준은 선 위가 아니라 제목 아래 글로 적어, 값 선과 겹치지 않게 합니다.
  box.append(caption, node('p', `빨간 점선: ${limitText}`, { className: 'muted' }));
  const values = ok.map(p => p.info.pct);
  const label = ok.length
    ? `${title} 추이: 최근 ${entries.length}회 조회 중 ${ok.length}회 읽음, 최저 ${Math.min(...values).toFixed(1)}${unit}, 최고 ${Math.max(...values).toFixed(1)}${unit}, 마지막 ${last.toFixed(1)}${unit}. ${limitText}.`
    : `${title} 추이: 읽은 값이 없습니다.`;
  const chart = svg('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': label, width: '100%' });
  chart.style.display = 'block';
  for (const v of [0, 50, 100]) {
    chart.append(svg('line', { x1: L, x2: W - R, y1: y(v), y2: y(v), stroke: 'var(--border)', 'stroke-width': 1 }));
    chart.append(svg('text', { x: L - 4, y: y(v) + 3, 'text-anchor': 'end', 'font-size': 9, fill: 'var(--muted)' }, `${v}%`));
  }
  chart.append(svg('line', { x1: L, x2: W - R, y1: y(limit), y2: y(limit), stroke: 'var(--deny)', 'stroke-width': 1, 'stroke-dasharray': '4 3' }));
  // 확인 불가 조회에서 선을 끊어, 읽지 못한 구간을 이어 그리지 않습니다.
  let segment = [];
  const flush = () => { if (segment.length > 1) chart.append(svg('polyline', { points: segment.join(' '), fill: 'none', stroke: 'var(--accent)', 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' })); segment = []; };
  for (const p of points) { if (p.info.ok) segment.push(`${x(p.i).toFixed(1)},${y(p.info.pct).toFixed(1)}`); else flush(); }
  flush();
  for (const p of points) {
    if (!p.info.ok) {
      chart.append(svg('text', { x: x(p.i), y: H - B - 4, 'text-anchor': 'middle', 'font-size': 10, fill: 'var(--muted)' }, '×'));
      continue;
    }
    const dot = svg('circle', { cx: x(p.i), cy: y(p.info.pct), r: 4, fill: p.entry.stale ? 'var(--surface)' : p.info.caution ? 'var(--deny)' : 'var(--accent)', stroke: p.info.caution ? 'var(--deny)' : 'var(--accent)', 'stroke-width': 2 });
    dot.append(svg('title', {}, `${clockText(p.entry.measuredAt)} · ${p.info.pct.toFixed(1)} ${unit}${p.info.caution ? ' · 주의' : ''}${p.entry.stale ? ' · 오래됨' : ''}`));
    chart.append(dot);
  }
  chart.append(svg('text', { x: L, y: H - 6, 'font-size': 9, fill: 'var(--muted)' }, clockText(entries[0].measuredAt)));
  if (entries.length > 1) chart.append(svg('text', { x: W - R, y: H - 6, 'text-anchor': 'end', 'font-size': 9, fill: 'var(--muted)' }, clockText(entries[entries.length - 1].measuredAt)));
  box.append(chart);
  if (points.some(p => !p.info.ok)) box.append(node('p', '× 표시는 그 조회에서 읽지 못한 지점입니다(선을 잇지 않음).', { className: 'muted' }));
  return box;
}

function createPcDashboard({ api, onChange }) {
  const state = { status: 'idle', error: null, history: [], sdp: null, copy: null, focusSel: null, loadingSince: null, timeline: [], filter: 'all', open: { table: false, about: false }, theme: 'light' };
  const hasApi = !!(api && typeof api.get === 'function');
  const redraw = () => { if (typeof onChange === 'function') onChange(); };
  const addTimeline = (at, flags, text, kind) => {
    state.timeline.unshift({ at, flags, text, kind });
    state.timeline.length = Math.min(state.timeline.length, PC_TIMELINE_LIMIT);
  };

  async function refresh() {
    if (state.status === 'loading' || !hasApi) return;
    state.status = 'loading'; state.error = null; state.copy = null; state.loadingSince = Date.now();
    state.focusSel = '[data-student-pc-refresh]'; redraw();
    const failed = { ok: false, error: { code: 'REQUEST_FAILED', message: '조회 요청을 처리하지 못했습니다.' } };
    // PC 조회와 SDP 연결 확인은 서로 다른 요청이며, 한쪽이 실패해도 다른 쪽은 따로 표시합니다.
    const [result, sdpResult] = await Promise.all([
      Promise.resolve().then(() => api.get(PC_PATH)).catch(() => failed),
      Promise.resolve().then(() => api.get(SDP_PATH)).catch(() => failed),
    ]);
    state.sdp = readSdp(sdpResult);
    const data = result && result.ok === true ? result.data : null;
    const measured = data && typeof data.measuredAt === 'string' ? Date.parse(data.measuredAt) : NaN;
    if (!data || data.schema !== PC_SCHEMA || data.source !== 'local-pc' || !Number.isFinite(measured) || !data.metrics || typeof data.metrics !== 'object') {
      const code = safeCode(result && result.error && result.error.code) || 'INVALID_RESPONSE';
      state.status = 'error';
      state.error = code === 'NOT_ALLOWED'
        ? { code, message: '이 앱 판은 학생 코드의 내 PC 조회를 지원하지 않습니다(지원 없음). 위쪽 제공 카드 「내 PC 상태」를 확인하세요.' }
        : { code: data ? 'INVALID_RESPONSE' : code, message: data ? '응답 형식(schema·source·잰 시각)을 확인할 수 없습니다. 정상으로 판단하지 마세요.' : safeText(result && result.error && result.error.message, '조회에 실패했습니다.') };
      state.error.at = Date.now();
      addTimeline(state.error.at, { unavailable: true }, `조회 실패 (${state.error.code}) — PC 항목 ${PC_ITEMS.length}개를 읽지 못함 · SDP: ${state.sdp.label}`, 'fail');
    } else {
      const receivedAt = Date.now();
      const metrics = Object.fromEntries(PC_CARDS.map(([key]) => [key, readPcMetric(key, data.metrics[key])]));
      const conn = Object.fromEntries(PC_CONN.map(([key]) => [key, readPcConn(key, data.metrics[key])]));
      const entry = { measuredAt: measured, receivedAt, stale: Math.abs(receivedAt - measured) > PC_STALE_MS, metrics, conn, sdp: state.sdp };
      const items = classifyPcEntry(entry);
      const names = kind => items.filter(item => item.kind === kind).map(item => item.title);
      const caution = names('caution'), unavailable = names('unavailable');
      addTimeline(measured, { caution: caution.length > 0, unavailable: unavailable.length > 0 || state.sdp.kind === 'unknown' },
        `조회 성공${entry.stale ? ' (오래됨)' : ''} · 주의 ${caution.length}${caution.length ? `(${caution.join(', ')})` : ''} · 확인 불가 ${unavailable.length}${unavailable.length ? `(${unavailable.join(', ')})` : ''} · SDP: ${state.sdp.label}`, 'ok');
      for (const event of pcChangeEvents(entry, state.history[0])) addTimeline(measured, event.flags, event.text, 'change');
      state.history.unshift(entry);
      state.history.length = Math.min(state.history.length, PC_HISTORY_LIMIT);
      state.status = 'ok';
    }
    state.loadingSince = null;
    redraw();
  }

  const section = (title, attrs = {}) => {
    const box = node('section', null, attrs);
    Object.assign(box.style, { margin: '16px 0 0' });
    const heading = node('h4', title);
    Object.assign(heading.style, { fontSize: '1.05rem', margin: '0 0 8px' });
    box.append(heading);
    return box;
  };
  const details = (key, summaryText) => {
    const element = node('details', null, { 'data-student-pc-details': key });
    element.open = !!state.open[key];
    element.addEventListener('toggle', () => { state.open[key] = element.open; });
    element.append(node('summary', summaryText));
    return element;
  };

  function render() {
    const latest = state.status === 'ok' ? state.history[0] : null;
    const previous = state.history[1] || null;
    const root = node('section', null, { className: 'student-pc-dashboard', 'data-student-pc': state.status, 'aria-busy': state.status === 'loading' ? 'true' : 'false' });
    // 아래 제공 순서의 다음 제목(기기·세션·알림)과 붙지 않게 여백과 구분선을 둡니다.
    Object.assign(root.style, { paddingBottom: '16px', marginBottom: '16px', borderBottom: '2px solid var(--border)' });

    // 어두운 화면은 이 대시보드 안에서만 색 변수를 바꿉니다(제공 화면 색은 그대로). 모든 글자 대비 4.5:1 이상.
    if (state.theme === 'dark') {
      for (const [name, value] of Object.entries(PC_DARK)) root.style.setProperty(name, value);
      Object.assign(root.style, { background: 'var(--bg)', color: 'var(--text)', borderRadius: '12px', padding: '16px' });
    }
    const head = node('div', null, { className: 'student-pc-head' });
    Object.assign(head.style, { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', margin: '0 0 4px' });
    const title = node('h3', '내 PC 관제 대시보드');
    Object.assign(title.style, { fontSize: '1.35rem', margin: '0' });
    const tag = node('span', '이 PC 실측 · 예시 값 없음', { title: '이 PC에서 일반 권한으로 읽기만 한 실측값입니다. 예시 값은 쓰지 않습니다.' });
    Object.assign(tag.style, { fontSize: '0.75rem', fontWeight: '700', borderRadius: '999px', padding: '2px 8px', background: 'var(--allow-soft)', color: 'var(--allow)' });
    const themes = node('div', null, { role: 'group', 'aria-label': '대시보드 화면 밝기' });
    Object.assign(themes.style, { marginLeft: 'auto', display: 'inline-flex', border: '1px solid var(--border)', borderRadius: '999px', overflow: 'hidden' });
    for (const [key, label] of [['light', '밝게'], ['dark', '어둡게']]) {
      const on = state.theme === key;
      const b = node('button', label, { type: 'button', 'aria-pressed': on ? 'true' : 'false', 'data-student-pc-theme': key });
      Object.assign(b.style, { border: 'none', padding: '4px 12px', fontWeight: '700', cursor: 'pointer', background: on ? 'var(--accent)' : 'var(--surface)', color: on ? 'var(--on-accent, #fff)' : 'var(--text)' });
      b.addEventListener('click', () => { state.theme = key; state.focusSel = `[data-student-pc-theme="${key}"]`; redraw(); });
      themes.append(b);
    }
    head.append(title, tag, themes);
    root.append(head);

    // 다시 조회 + 대기 표시
    const bar = node('div', null, { className: 'student-pc-toolbar' });
    Object.assign(bar.style, { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', margin: '8px 0' });
    const button = node('button', state.status === 'loading' ? '읽는 중…' : '다시 조회', { type: 'button', className: 'btn', 'data-student-pc-refresh': 'true', 'aria-label': state.status === 'loading' ? '내 PC 읽는 중' : '내 PC 다시 조회' });
    Object.assign(button.style, { fontWeight: '700', padding: '8px 18px', background: 'var(--accent)', color: 'var(--on-accent, #fff)', borderColor: 'var(--accent)', borderRadius: '8px' });
    button.disabled = state.status === 'loading' || !hasApi;
    button.addEventListener('click', () => { void refresh(); });
    const lastText = state.status === 'loading' ? `이 PC에서 읽는 중… (${clockText(state.loadingSince)} 시작) 이전 값은 현재 값으로 보여 주지 않습니다.`
      : latest ? `마지막 성공 조회 ${clockText(latest.measuredAt)} · 출처: 이 PC(local-pc)`
      : state.status === 'error' ? `마지막 조회 실패 ${clockText(state.error.at)}` : '아직 조회하지 않았습니다. 「다시 조회」를 누르면 한 번 읽습니다(자동 반복 없음).';
    bar.append(button, node('span', lastText, { className: state.status === 'loading' ? 'state state-loading' : 'muted', role: 'status', 'data-student-pc-progress': state.status }));
    root.append(bar);
    if (!hasApi) {
      root.append(node('p', '확인 불가 — 제공 화면이 학생 조회 통로(api)를 넘겨주지 않았습니다.', { className: 'state state-empty' }));
      return root;
    }
    if (latest) root.append(renderBanner(latest));
    root.append(...renderSummaryAndCopy());

    // 오류 화면: 실패한 항목과 다음 할 일. 예시·이전 값은 카드에 보여 주지 않습니다.
    if (state.status === 'error') root.append(renderFailure());

    // ① 상태 카드
    const cards = section('① 상태 카드', { 'data-student-pc-section': 'cards' });
    if (latest) {
      cards.append(node('p', `${latest.stale ? '오래됨 — ' : ''}실측 · 잰 시각 ${clockText(latest.measuredAt)} (${new Date(latest.measuredAt).toISOString()})`,
        { className: latest.stale ? 'state state-empty' : 'muted', 'data-student-pc-measured-at': new Date(latest.measuredAt).toISOString() }));
      const grid = node('div', null, { className: 'student-pc-cards' });
      // 제공 화면 CSP가 style 속성 문자열을 막으므로, CSSOM 속성으로 배치를 지정합니다.
      Object.assign(grid.style, { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', margin: '8px 0' });
      for (const [key, cardTitle] of PC_CARDS) grid.append(renderKpiCard(key, cardTitle, latest, previous));
      cards.append(grid);
    } else {
      cards.append(node('p', state.status === 'error' ? '이번 조회가 실패해 카드에 값을 보여 주지 않습니다. 위의 「다음에 할 일」을 따라 주세요.'
        : state.status === 'loading' ? '읽는 중…' : '「다시 조회」를 누르면 CPU·메모리·디스크·방화벽 카드가 나타납니다.', { className: 'state state-empty' }));
    }
    root.append(cards);

    // ② 추이 그래프
    const trend = section('② 추이 (성공한 조회만, 최근 20회)', { 'data-student-pc-section': 'trend' });
    const chronological = [...state.history].reverse();
    if (state.status === 'error' && state.history.length) trend.append(node('p', '이번 조회는 실패해 그래프에 넣지 않았습니다. 아래 그래프의 값은 모두 이전에 성공한 조회의 과거 값입니다.', { className: 'state state-empty', 'data-student-pc-trend-past': 'true' }));
    if (chronological.length < 2) {
      trend.append(node('p', `조회가 2번 이상 성공하면 추이를 그립니다 (지금 ${chronological.length}번). 「다시 조회」를 몇 번 눌러 보세요.`, { className: 'muted' }));
    } else {
      const charts = node('div', null, { className: 'student-pc-trends' });
      Object.assign(charts.style, { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '8px' });
      for (const spec of PC_TRENDS) charts.append(renderTrendChart(chronological, spec));
      trend.append(charts, node('p', '세로축은 모두 0~100 %입니다. 빨간 점선은 주의 기준, 빨간 점은 주의, 속이 빈 점은 오래된 값입니다. 점에 마우스를 올리면 시각과 값이 보입니다.', { className: 'muted' }));
    }
    if (state.history.length) {
      const tableBox = details('table', '표로 보기 (그래프와 같은 값)');
      tableBox.append(renderHistoryTable());
      trend.append(tableBox);
    }
    root.append(trend);

    // ③ 최근 기록 타임라인 + 필터
    const records = section('③ 최근 기록', { 'data-student-pc-section': 'timeline' });
    const filterBar = node('div', null, { role: 'group', 'aria-label': '최근 기록 필터' });
    Object.assign(filterBar.style, { display: 'flex', gap: '6px', flexWrap: 'wrap', margin: '0 0 8px' });
    const counts = { all: state.timeline.length, caution: state.timeline.filter(e => e.flags.caution).length, unavailable: state.timeline.filter(e => e.flags.unavailable).length };
    for (const [key, label] of PC_FILTERS) {
      const pressed = state.filter === key;
      const filterButton = node('button', `${label} ${counts[key]}`, { type: 'button', className: 'btn', 'aria-pressed': pressed ? 'true' : 'false', 'data-student-pc-filter': key });
      if (pressed) Object.assign(filterButton.style, { borderColor: 'var(--accent)', color: 'var(--accent)', fontWeight: '600', background: 'var(--accent-soft)' });
      filterButton.addEventListener('click', () => { state.filter = key; state.focusSel = `[data-student-pc-filter="${key}"]`; redraw(); });
      filterBar.append(filterButton);
    }
    records.append(filterBar);
    const shown = state.timeline.filter(e => state.filter === 'all' || e.flags[state.filter]);
    records.append(node('p', `보는 중: ${PC_FILTERS.find(([key]) => key === state.filter)[1]} ${shown.length}건 / 전체 ${state.timeline.length}건 · 앱 메모리에만 최대 ${PC_TIMELINE_LIMIT}건 보관(새로고침하면 비워짐)`, { className: 'muted', role: 'status' }));
    if (!shown.length) {
      records.append(node('p', state.timeline.length ? '이 필터에 해당하는 기록이 없습니다.' : '아직 기록이 없습니다. 조회·실패·설정 변화가 여기에 시간순으로 쌓입니다.', { className: 'state state-empty' }));
    } else {
      const list = node('ol', null, { className: 'student-pc-timeline' });
      Object.assign(list.style, { listStyle: 'none', padding: '0', margin: '0', borderLeft: '2px solid var(--border)' });
      for (const event of shown) {
        const item = node('li', null, { 'data-student-pc-event': event.kind, 'data-flags': Object.keys(event.flags).filter(k => event.flags[k]).join(' ') || 'none' });
        Object.assign(item.style, { padding: '4px 0 4px 12px', margin: '0 0 2px' });
        const tag = event.flags.caution ? ['주의', 'state-error'] : event.flags.unavailable ? ['확인 불가', 'state-empty'] : event.kind === 'change' ? ['변화', 'state-loading'] : ['정상 조회', 'state-ok'];
        const badge = node('span', tag[0], { className: `state ${tag[1]}` });
        Object.assign(badge.style, { display: 'inline-block', padding: '0 6px', marginRight: '6px' });
        item.append(node('time', clockText(event.at), { datetime: new Date(event.at).toISOString() }), node('span', ' '), badge, node('span', event.text));
        list.append(item);
      }
      records.append(list);
    }
    root.append(records);

    // 연결과 기록(3일차)
    if (state.status === 'ok' || state.status === 'error') root.append(renderConnection(latest, previous));

    // 접어 둔 설명
    const about = details('about', '이 대시보드에 대해 (값의 종류 · 제공 기능과 내가 만든 부분)');
    about.append(
      node('p', '값의 종류: 실측(잰 시각 표시) · 확인 불가(이유 표시) · 오래됨(잰 지 60초 넘음) · 주의(기준을 넘은 실측값). 이 대시보드에는 예시 값을 쓰지 않습니다.', { className: 'muted' }),
      node('p', '제공 기능: 측정(src/pc-status.mjs, 위쪽 「내 PC 상태」 카드와 같은 실측, 일반 권한 읽기 전용)과 학생 조회 통로. 내가 만든 부분: 한눈 요약, 점검 결과 복사, 상태 카드, 직전 대비 변화, 추이 그래프, 최근 기록 타임라인·필터·설정 변화 감지, 연결과 기록(SDP 구분), 오류 화면.', { className: 'muted' }),
      node('p', 'Windows 기록 경고·오류 건수는 침해나 공격 탐지 결과가 아닙니다. 앱은 방화벽·보안 설정을 바꾸지 않습니다.', { className: 'muted' }),
    );
    root.append(about);
    return root;
  }

  // 시안 C: 주의가 있을 때만 「지금 확인할 것」 배너를 맨 위에 둡니다. 주의가 없으면 작은 확인 줄만 보여 줍니다.
  function renderBanner(latest) {
    const items = classifyPcEntry(latest);
    const caution = items.filter(item => item.kind === 'caution');
    const unavailable = items.filter(item => item.kind === 'unavailable').length;
    const at = `실측 ${clockText(latest.measuredAt)}`;
    if (!caution.length) {
      const line = node('p', `이번 조회에서 주의 없음 · 확인 불가 ${unavailable} · ${at}${latest.stale ? ' · 오래됨' : ''}`, { className: 'state state-ok', role: 'status', 'data-student-pc-banner': 'clear' });
      Object.assign(line.style, { margin: '8px 0', fontWeight: '600' });
      return line;
    }
    const box = node('section', null, { className: 'student-pc-banner', role: 'status', 'aria-label': '지금 확인할 것', 'data-student-pc-banner': String(caution.length) });
    Object.assign(box.style, { margin: '10px 0', padding: '12px 16px', borderRadius: '12px', border: '2px solid var(--deny)', background: 'var(--deny-soft)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px 18px' });
    const left = node('div');
    const label = node('p', `지금 확인할 것 · ${at}${latest.stale ? ' · 오래됨' : ''}`);
    Object.assign(label.style, { margin: '0', color: 'var(--deny)', fontWeight: '700', fontSize: '0.8rem' });
    const count = node('p', `주의 ${caution.length}건`);
    Object.assign(count.style, { margin: '0', color: 'var(--deny)', fontWeight: '900', fontSize: '1.7rem', lineHeight: '1.2', whiteSpace: 'nowrap' });
    left.append(label, count);
    const middle = node('div');
    Object.assign(middle.style, { flex: '1 1 320px', minWidth: '0' });
    for (const item of caution) {
      const row = node('p', `${item.title} — ${item.info.text} · ${PC_CRITERIA[item.key] || '기준을 넘음'}`);
      Object.assign(row.style, { margin: '2px 0', fontWeight: '700' });
      middle.append(row);
    }
    middle.append(node('p', '앱은 읽기만 합니다. 정리·설정 변경 여부는 사용자가 판단합니다. 예시 값이 아니라 이 PC에서 잰 값입니다.', { className: 'muted' }));
    box.append(left, middle);
    return box;
  }

  // 시안 B: 큰 숫자 + 단위 + 진행 막대 + 위쪽 색 띠. 상태 이름(실측·주의·확인 불가·오래됨)과 잰 시각은 그대로 글로 둡니다.
  function renderKpiCard(key, cardTitle, latest, previous) {
    const info = latest.metrics[key];
    const kind = !info.ok ? 'unavailable' : latest.stale ? 'stale' : info.caution ? 'caution' : 'measured';
    const tone = { unavailable: 'var(--unknown)', stale: 'var(--unknown)', caution: 'var(--deny)', measured: 'var(--accent)' }[kind];
    const card = node('article', null, { className: 'student-pc-card', 'data-student-pc-metric': key, 'data-state': kind === 'caution' ? 'measured' : kind, tabindex: '-1' });
    Object.assign(card.style, { border: '1px solid var(--border)', borderTop: `4px solid ${tone}`, borderRadius: '10px', padding: '12px', background: 'var(--surface)' });
    const head = node('div');
    Object.assign(head.style, { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' });
    const title = node('h5', cardTitle);
    Object.assign(title.style, { margin: '0', fontSize: '0.85rem', color: 'var(--muted)', fontWeight: '600' });
    const badge = node('span', { unavailable: '확인 불가', stale: '오래됨', caution: '주의 · 실측', measured: '실측' }[kind], { className: `state ${kind === 'caution' ? 'state-error' : kind === 'measured' ? 'state-ok' : 'state-empty'}` });
    Object.assign(badge.style, { display: 'inline-block', padding: '1px 8px', borderRadius: '999px', fontWeight: '600', fontSize: '0.8rem' });
    head.append(title, badge);
    card.append(head);
    if (!info.ok) {
      const value = node('p', '이번 조회에서 읽지 못함', { className: 'student-pc-value' });
      Object.assign(value.style, { fontSize: '1.05rem', fontWeight: '700', margin: '8px 0 4px' });
      card.append(value, node('p', `이유: ${info.note}`, { className: 'muted' }));
      card.append(node('p', pcDelta(key, info, previous && previous.metrics[key]), { 'data-student-pc-delta': key, className: 'muted' }));
      return card;
    }
    const on = key === 'firewall' ? (info.signature.match(/:true/g) || []).length : 0;
    const [big, unit, pct, sub] = key === 'cpu' ? [info.pct.toFixed(1), '%', info.pct, '200ms 순간값']
      : key === 'memory' ? [info.pct.toFixed(0), '% 사용', info.pct, info.text.replace(/ \([^)]*\)$/, '')]
      : key === 'disk' ? [info.pct.toFixed(1), '% 여유', info.pct, info.text.replace(/ \([^)]*\)$/, '')]
      : [String(on), '/ 3 프로필 켜짐', (on / 3) * 100, info.text];
    const value = node('p', null, { className: 'student-pc-value', 'aria-label': `${cardTitle} ${info.text}` });
    Object.assign(value.style, { margin: '6px 0 2px' });
    const number = node('span', big); Object.assign(number.style, { fontSize: '1.9rem', fontWeight: '800', letterSpacing: '-0.5px' });
    const unitText = node('span', ` ${unit}`); Object.assign(unitText.style, { color: 'var(--muted)', fontSize: '0.9rem' });
    value.append(number, unitText);
    const bar = node('div', null, { 'aria-hidden': 'true' });
    Object.assign(bar.style, { height: '6px', borderRadius: '3px', background: 'var(--unknown-soft)', overflow: 'hidden', margin: '6px 0' });
    const fill = node('div'); Object.assign(fill.style, { height: '100%', width: `${Math.max(2, Math.min(100, pct))}%`, background: tone, borderRadius: '3px' });
    bar.append(fill);
    card.append(value, bar, node('p', sub, { className: 'muted' }), node('p', `잰 시각 ${clockText(latest.measuredAt)} · ${PC_CRITERIA[key]}`, { className: 'muted' }));
    const delta = node('p', pcDelta(key, info, previous && previous.metrics[key]), { 'data-student-pc-delta': key });
    Object.assign(delta.style, { margin: '4px 0 0', fontSize: '0.85rem' });
    card.append(delta);
    return card;
  }

  function renderFailure() {
    const box = node('section', null, { className: 'student-pc-failure', role: 'alert', 'data-student-pc-failure': state.error.code });
    Object.assign(box.style, { border: '2px solid var(--deny)', borderRadius: '8px', padding: '10px 12px', margin: '8px 0', background: 'var(--deny-soft)' });
    const heading = node('h4', `이번 조회 실패 (${state.error.code})`);
    Object.assign(heading.style, { color: 'var(--deny)', margin: '0 0 4px' });
    box.append(heading, node('p', state.error.message));
    const failedList = node('ul', null, { 'data-student-pc-failed-items': 'true' });
    failedList.append(node('li', `PC 조회: ${PC_ITEMS.map(([, t]) => t).join(' · ')} — ${PC_ITEMS.length}개 모두 읽지 못함`));
    failedList.append(node('li', state.sdp && state.sdp.kind !== 'unknown' ? `SDP 확인: 따로 확인됨 — ${state.sdp.label} (PC 조회와 별개)` : `SDP 확인: 확인 불가 — ${state.sdp ? state.sdp.text : '확인하지 못했습니다.'}`));
    box.append(node('p', '실패한 항목'), failedList, node('p', '다음에 할 일'));
    const steps = node('ol', null, { 'data-student-pc-next-steps': state.error.code });
    for (const step of PC_FAILURE_STEPS[state.error.code] || PC_FAILURE_DEFAULT) steps.append(node('li', step));
    box.append(steps, node('p', '이전 값과 예시 값은 현재 상태가 아니어서 카드·요약에 보여 주지 않습니다. 이전 성공 조회는 추이와 최근 기록에 과거 값으로만 남습니다.', { className: 'muted' }));
    return box;
  }

  function renderHistoryTable() {
    const table = node('table', null, { className: 'student-pc-history' });
    Object.assign(table.style, { width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginTop: '6px' });
    const caption = node('caption', '앱을 켠 뒤 성공한 조회만(최신순, 최대 20회) 앱 메모리에 보관합니다. 기록 경고·오류는 「경고 / 오류」 건수(+는 5,000건 넘음)이며 침해 판정이 아닙니다.');
    Object.assign(caption.style, { textAlign: 'left', captionSide: 'top', color: 'var(--muted)', fontSize: '0.875rem', padding: '0 0 4px' });
    table.append(caption);
    const head = node('tr');
    for (const label of ['잰 시각', 'CPU', '메모리 사용', '디스크 여유', '방화벽', '기록 경고·오류', 'SDP']) {
      const th = node('th', label, { scope: 'col' });
      Object.assign(th.style, { padding: '4px 8px', borderBottom: '1px solid var(--border)' });
      head.append(th);
    }
    const thead = node('thead'); thead.append(head);
    const tbody = node('tbody');
    state.history.forEach((entry, index) => {
      const tr = node('tr', null, { 'data-student-pc-history': String(index) });
      const cells = [`${clockText(entry.measuredAt)}${index === 0 && state.status === 'ok' ? ' (현재)' : ' (과거)'}${entry.stale ? ' · 오래됨' : ''}`];
      for (const [key] of PC_CARDS) {
        const info = entry.metrics[key];
        cells.push(!info.ok ? '확인 불가' : key === 'cpu' ? `${info.number.toFixed(1)} %` : key === 'firewall' ? (info.caution ? '꺼진 프로필 있음' : '모두 켜짐') : `${info.number.toFixed(2)} GB`);
      }
      const ev = entry.conn && entry.conn.events;
      cells.push(ev && ev.ok ? `${ev.warning} / ${ev.error}${ev.truncated ? '+' : ''}` : '확인 불가', entry.sdp ? entry.sdp.label : '확인 불가');
      cells.forEach((text, i) => {
        const cell = node(i === 0 ? 'th' : 'td', text, i === 0 ? { scope: 'row' } : {});
        Object.assign(cell.style, { padding: '4px 8px', borderBottom: '1px solid var(--border)', fontWeight: i === 0 ? '600' : '400' });
        tr.append(cell);
      });
      tbody.append(tr);
    });
    table.append(thead, tbody);
    return table;
  }

  // 한눈 요약 줄 + 점검 결과 복사. 이번 조회가 성공했을 때만 요약하고, 실패·조회 중에는 이전 값으로 요약하지 않습니다.
  function renderSummaryAndCopy() {
    const latest = state.status === 'ok' ? state.history[0] : null;
    const parts = [];
    const summary = node('div', null, { className: 'student-pc-summary', role: 'status', 'aria-label': '한눈 요약' });
    Object.assign(summary.style, { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px', margin: '8px 0' });
    if (!latest) {
      summary.setAttribute('data-student-pc-summary', 'none');
      summary.append(node('span', state.status === 'error' ? '한눈 요약: 이번 조회 실패 — 요약 없음 (이전 값으로 요약하지 않습니다)'
        : state.status === 'loading' ? '한눈 요약: 읽는 중…' : '한눈 요약: 아직 조회하지 않았습니다.', { className: 'muted' }));
    } else {
      const items = classifyPcEntry(latest);
      const count = kind => items.filter(item => item.kind === kind).length;
      summary.setAttribute('data-student-pc-summary', `caution:${count('caution')},unavailable:${count('unavailable')},stale:${count('stale')},measured:${count('measured')}`);
      summary.append(node('strong', '한눈 요약'));
      for (const kind of ['caution', 'unavailable', 'stale', 'measured']) {
        const hits = items.filter(item => item.kind === kind);
        if (kind === 'stale' && !hits.length) continue;
        const group = node('span', `${PC_KIND_LABEL[kind]} ${hits.length}`, { className: `state ${kind === 'caution' && hits.length ? 'state-error' : kind === 'measured' ? 'state-ok' : 'state-empty'}`, 'data-student-pc-summary-kind': kind });
        Object.assign(group.style, { padding: '2px 6px' });
        if (kind !== 'measured') for (const item of hits) {
          // 항목 이름을 누르면(키보드 Enter·Space 포함) 해당 카드·줄로 포커스를 옮깁니다.
          const jump = node('button', item.title, { type: 'button', className: 'btn', 'data-student-pc-jump': item.key, 'aria-label': `${item.title} 항목으로 이동` });
          Object.assign(jump.style, { marginLeft: '4px', padding: '0 6px' });
          jump.addEventListener('click', () => {
            const target = document.querySelector(`[data-student-pc-metric="${item.key}"], [data-student-pc-conn="${item.key}"]`);
            if (target) { target.focus(); if (typeof target.scrollIntoView === 'function') target.scrollIntoView({ block: 'center' }); }
          });
          group.append(jump);
        }
        summary.append(group);
      }
      const sdpTag = node('span', `${state.sdp ? state.sdp.label : '확인 불가'} (PC 조회와 별개)`, { className: `state ${state.sdp && state.sdp.kind === 'on' ? 'state-ok' : 'state-empty'}`, 'data-student-pc-summary-sdp': state.sdp ? state.sdp.kind : 'unknown' });
      Object.assign(sdpTag.style, { padding: '2px 6px' });
      summary.append(sdpTag, node('span', '· 기록 경고·오류 건수는 침해 판정이 아니어서 주의로 세지 않습니다.', { className: 'muted' }));
    }
    parts.push(summary);

    // 점검 결과 복사: 버튼을 눌렀을 때만 복사합니다(자동 복사·저장·전송 없음).
    const copyRow = node('div', null, { className: 'student-pc-copy' });
    const copyButton = node('button', '점검 결과 복사', { type: 'button', className: 'btn', 'data-student-pc-copy': 'true' });
    copyButton.disabled = !latest;
    copyButton.addEventListener('click', () => { void copyReport(); });
    copyRow.append(copyButton, node('span', latest
      ? ' 값·잰 시각·확인 불가 이유만 글로 복사합니다. IP 주소·컴퓨터 이름·사용자 이름·토큰은 담지 않습니다.'
      : ' 이번 조회가 성공한 뒤에 복사할 수 있습니다(이전 값은 복사하지 않습니다).', { className: 'muted' }));
    if (state.copy && state.copy.status === 'ok') {
      copyRow.append(node('p', `복사됨 · ${clockText(state.copy.at)} — 담당자에게 붙여 넣어 전달하세요.`, { className: 'state state-ok', role: 'status', 'data-student-pc-copy-result': 'ok' }));
    } else if (state.copy && state.copy.status === 'error') {
      // 복사 실패를 성공처럼 보이지 않게 하고, 같은 내용을 화면에 보여 직접 복사할 수 있게 합니다.
      copyRow.append(node('p', `복사하지 못했습니다 (${state.copy.reason}). 아래 글을 직접 선택해 복사하세요.`, { className: 'state state-error', role: 'alert', 'data-student-pc-copy-result': 'error' }));
      const area = node('textarea', null, { readonly: 'true', rows: '10', 'aria-label': '점검 결과 글', 'data-student-pc-copy-text': 'true' });
      area.value = state.copy.text;
      Object.assign(area.style, { width: '100%', fontFamily: 'monospace', background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '8px' });
      copyRow.append(area);
    }
    parts.push(copyRow);
    return parts;
  }

  async function copyReport() {
    const latest = state.status === 'ok' ? state.history[0] : null;
    if (!latest) return;
    const text = buildPcReport(latest, state.history[1] || null, state.sdp);
    state.focusSel = '[data-student-pc-copy]';
    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') throw Object.assign(new Error(), { name: 'NO_CLIPBOARD' });
      await navigator.clipboard.writeText(text);
      state.copy = { status: 'ok', at: Date.now() };
    } catch (error) {
      const reason = error && error.name === 'NO_CLIPBOARD' ? '이 브라우저는 클립보드 복사를 지원하지 않음' : '브라우저가 클립보드 접근을 허용하지 않음';
      state.copy = { status: 'error', reason, text };
    }
    redraw();
  }

  // 3일차 「연결과 기록」: PC 실측 두 줄과 SDP 연결 한 줄을 출처별로 나눠 보여 줍니다.
  function renderConnection(latest, previous) {
    const box = node('section', null, { className: 'student-pc-connection', 'aria-label': '연결과 기록' });
    Object.assign(box.style, { border: '1px solid #d0d7de', borderRadius: '8px', padding: '8px', margin: '8px 0' });
    box.append(node('h4', '연결과 기록'), node('p', '모두 읽기만 합니다. 방화벽·보안 설정을 바꾸거나 관리자 권한을 요청하지 않습니다.', { className: 'muted' }));
    const list = node('dl', null, { className: 'kv' });
    for (const [key, title] of PC_CONN) {
      const info = latest ? latest.conn[key] : null;
      const label = !info || !info.ok ? '확인 불가' : latest.stale ? '오래됨' : info.caution ? '주의 · 실측' : '실측';
      const dd = node('dd', null, { 'data-student-pc-conn': key, 'data-state': !info || !info.ok ? 'unavailable' : 'measured', tabindex: '-1' });
      dd.append(node('p', `${label} · ${info ? info.text : '이번 PC 조회가 실패해 읽지 못함'}`, { className: `state ${!info || !info.ok ? 'state-empty' : info.caution ? 'state-error' : 'state-ok'}` }));
      if (!info) dd.append(node('p', '이유: 위의 「이번 조회 실패」를 확인하세요. 이전 값은 현재 상태로 표시하지 않습니다.', { className: 'muted' }));
      else if (!info.ok) dd.append(node('p', `이유: ${info.note}`, { className: 'muted' }));
      else dd.append(node('p', `잰 시각 ${clockText(latest.measuredAt)} · 출처: 이 PC(local-pc)`, { className: 'muted' }), node('p', info.note, { className: 'muted' }));
      if (key === 'events' && !(info && info.ok)) dd.append(node('p', '이 항목은 읽더라도 침해나 공격 탐지 결과가 아닙니다.', { className: 'muted' }));
      if (info) dd.append(node('p', pcConnDelta(key, info, previous && previous.conn && previous.conn[key]), { 'data-student-pc-conn-delta': key }));
      list.append(node('dt', title), dd);
    }
    const sdp = state.sdp;
    const sdpDd = node('dd', null, { 'data-student-sdp': sdp ? sdp.kind : 'unknown' });
    sdpDd.append(
      node('p', `${sdp ? sdp.label : '확인 불가'} · ${sdp ? sdp.text : '아직 확인하지 않았습니다.'}`, { className: `state ${sdp && sdp.kind === 'on' ? 'state-ok' : 'state-empty'}` }),
      node('p', `${sdp && sdp.checkedAt ? `확인 시각 ${clockText(sdp.checkedAt)} · ` : ''}출처: 앱 서버의 연결 상태(내 정보 응답) — PC 조회 결과와 별개입니다.`, { className: 'muted' }),
    );
    if (sdp) sdpDd.append(node('p', sdp.note, { className: 'muted' }));
    list.append(node('dt', 'SDP 서버 연결'), sdpDd);
    box.append(list);
    for (const p of box.querySelectorAll('p')) p.style.margin = '3px 0';
    return box;
  }

  // 다시 그린 뒤에도 키보드 포커스를 「다시 조회」 버튼에 둡니다.
  function restoreFocus() {
    if (!state.focusSel || typeof document === 'undefined') return;
    const target = document.querySelector(state.focusSel);
    // 조회 중에는 「다시 조회」가 꺼져 있으므로, 끝난 뒤 다시 그릴 때 포커스를 돌려줍니다.
    if (target && !target.disabled) { target.focus(); state.focusSel = null; }
  }

  return { render, restoreFocus };
}

// ---------- 총공세 디자인 통일: 학생 칸 공통 겉모습 ----------
// 13~20단계 렌더 함수가 만든 화면을 그대로 받아, 글자·여백·상태 표시 모양만 맞춥니다(내용·순서·기능·data 속성은 바꾸지 않음).
// 제공 CSP가 style 속성 문자열을 막으므로 CSSOM 속성으로만 지정하고, 화면 폭에 따른 제공 배치 규칙(.kv 한 열 전환 등)은 덮지 않습니다.
const PILL_MAX = 28;
function polishStudent(root, present) {
  if (!root || typeof root.querySelectorAll !== 'function') return root;
  const apply = () => { applyPolish(root); if (typeof present === 'function') present(root); };
  apply();
  // 15단계 상세 열기처럼 칸 안에서 바로 바뀌는 화면도 같은 겉모습을 유지합니다(요소가 추가될 때만 다시 적용, 내용은 건드리지 않음).
  if (typeof MutationObserver === 'function' && !root.__studentPolish) {
    root.__studentPolish = new MutationObserver(() => apply());
    root.__studentPolish.observe(root, { childList: true, subtree: true });
  }
  return root;
}
function applyPolish(root) {
  // 관제 대시보드는 자체 디자인을 쓰므로 공통 겉모습에서 뺍니다.
  const all = selector => [root, ...root.querySelectorAll(selector)].filter(el => el.matches && el.matches(selector) && !el.closest('.student-pc-dashboard'));
  for (const h of all('h3')) Object.assign(h.style, { fontSize: '1.15rem', fontWeight: '700', margin: '0 0 6px' });
  for (const h of all('h4, h5')) Object.assign(h.style, { fontSize: '0.95rem', fontWeight: '700', margin: '14px 0 6px', paddingLeft: '8px', borderLeft: '3px solid var(--accent)' });
  for (const p of all('p.muted')) Object.assign(p.style, { margin: '4px 0' });
  for (const s of all('.state')) {
    const short = (s.textContent || '').trim().length <= PILL_MAX;
    const inline = s.tagName === 'SPAN' || (s.parentElement && ['DD', 'LI', 'TD'].includes(s.parentElement.tagName));
    if (short && inline) Object.assign(s.style, { display: 'inline-block', padding: '2px 10px', borderRadius: '999px', fontWeight: '600', fontSize: '0.85rem', margin: '2px 0' });
    else Object.assign(s.style, { borderLeft: '4px solid currentColor', margin: '6px 0' });
  }
  for (const list of all('ul')) {
    Object.assign(list.style, { listStyle: 'none', padding: '0', margin: '6px 0' });
    for (const li of list.children) if (li.tagName === 'LI') Object.assign(li.style, { padding: '6px 10px', border: '1px solid var(--border)', borderRadius: '8px', marginBottom: '6px', background: 'var(--surface)' });
  }
  for (const dl of all('dl.kv')) Object.assign(dl.style, { rowGap: '8px', gridTemplateColumns: 'minmax(90px, max-content) minmax(0, 1fr)' });
  for (const dt of all('dl.kv > dt')) Object.assign(dt.style, { fontWeight: '600' });
  for (const b of all('button.btn')) Object.assign(b.style, { borderRadius: '8px', fontWeight: '600', padding: '6px 14px' });
  for (const t of all('table')) Object.assign(t.style, { width: '100%', borderCollapse: 'collapse', textAlign: 'left' });
  for (const c of all('th, td')) Object.assign(c.style, { padding: '6px 8px', borderBottom: '1px solid var(--border)' });
  for (const c of all('caption')) Object.assign(c.style, { textAlign: 'left', color: 'var(--muted)', fontSize: '0.875rem', padding: '0 0 4px' });
  for (const f of all('select')) Object.assign(f.style, { padding: '4px 8px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)' });
  return root;
}

// ---------- 총공세 디자인 2차: 칸별 표시 정리(배치만 바꿈) ----------
// 13~20단계 함수가 만든 화면을 받아 「핵심 한 줄 + 주요 버튼 + 접는 설명」 모양으로 배치만 바꿉니다.
// - 내용·순서 의미·data 속성·판단 규칙은 바꾸지 않습니다. 버튼·선택 상자처럼 포커스를 받는 요소는 옮기지 않습니다.
// - 접는 것은 설명 문단뿐입니다. 확인 불가·실패·주의·「실행되지 않음」·「침해 판정 아님」 같은 안전 문구는 그대로 보입니다.
// - 같은 칸이 다시 그려지면(15단계 상세 열기 등) 다시 적용됩니다. 구조 변경은 한 번만, 모양은 매번 적용합니다.
const TONE = Object.freeze({
  ok: ['var(--allow)', 'var(--allow-soft)'], error: ['var(--deny)', 'var(--deny-soft)'],
  empty: ['var(--unknown)', 'var(--unknown-soft)'], loading: ['var(--accent)', 'var(--accent-soft)'],
});
const toneOf = el => (!el ? 'empty' : el.classList.contains('state-ok') ? 'ok' : el.classList.contains('state-error') ? 'error' : el.classList.contains('state-loading') ? 'loading' : 'empty');
const once = (el, key) => { if (!el || el.dataset[key] === '1') return false; el.dataset[key] = '1'; return true; };
const styleAll = (els, style) => { for (const el of els) if (el) Object.assign(el.style, style); };

// 제목 줄: 제목 + 자료 출처 표시(원래 출처 문장은 「ⓘ 설명」에 그대로 보관).
function headerRow(container, title, sourceP) {
  let head = container.querySelector(':scope > .student-head');
  if (!head && title && once(container, 'studentHead')) {
    head = node('div', null, { className: 'student-head' });
    container.insertBefore(head, title);
    head.append(title);
    if (sourceP) {
      const text = (sourceP.textContent || '').split(':').slice(1).join(':').trim() || sourceP.textContent;
      head.append(node('span', text, { className: 'student-source-tag', title: sourceP.textContent }));
    }
  }
  if (head) {
    Object.assign(head.style, { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', margin: '0 0 10px' });
    const tag = head.querySelector('.student-source-tag');
    if (tag) {
      const live = /실측|연결됨/.test(tag.textContent);
      Object.assign(tag.style, { fontSize: '0.75rem', fontWeight: '700', borderRadius: '999px', padding: '2px 8px',
        background: live ? 'var(--allow-soft)' : 'var(--challenge-soft)', color: live ? 'var(--allow)' : 'var(--challenge)' });
    }
    const h = head.querySelector('h3');
    if (h) Object.assign(h.style, { margin: '0', fontSize: '1.15rem' });
  }
  return head;
}

// 「ⓘ 설명」: 설명 문단을 접어 둡니다(지우지 않음). 같은 칸에서 열림 상태를 기억합니다.
const infoOpen = new Map();
function infoBox(container, key, items, summaryText = 'ⓘ 설명') {
  const parts = items.filter(Boolean);
  let box = container.querySelector(`:scope > details[data-student-info="${key}"]`);
  if (!box && parts.length) {
    box = node('details', null, { 'data-student-info': key });
    box.open = !!infoOpen.get(key);
    box.addEventListener('toggle', () => infoOpen.set(key, box.open));
    box.append(node('summary', summaryText));
    container.append(box);
  }
  if (box) {
    for (const p of parts) if (p.parentElement !== box) box.append(p);
    Object.assign(box.style, { marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed var(--border)', color: 'var(--muted)', fontSize: '0.85rem' });
    const s = box.querySelector('summary');
    if (s) Object.assign(s.style, { cursor: 'pointer', color: 'var(--accent)', fontWeight: '700' });
  }
  return box;
}

// 큰 상태 상자: 상태 문장을 크게, 색은 원래 상태(class)를 따릅니다.
function heroBox(el, big) {
  if (!el) return;
  const [fg, bg] = TONE[toneOf(el)];
  Object.assign(el.style, { display: 'block', borderLeft: 'none', border: `2px solid ${fg}`, background: bg, color: fg, borderRadius: '12px', padding: '12px 14px', margin: '8px 0', fontWeight: '700', fontSize: big ? '1.15rem' : '0.95rem' });
}
// 조회 전·요청 전 안내: 무엇을 누르면 무엇이 보이는지 눈에 띄게.
function idleBox(el) {
  if (!el) return;
  Object.assign(el.style, { display: 'block', border: '2px dashed var(--border)', borderLeft: '2px dashed var(--border)', background: 'var(--surface)', color: 'var(--text)', borderRadius: '12px', padding: '14px 16px', fontWeight: '600' });
}
function tile(label, value, badge, tone) {
  const box = node('div', null, { className: 'student-tile' });
  Object.assign(box.style, { border: '1px solid var(--border)', borderTop: `4px solid ${tone === 'error' ? 'var(--deny)' : tone === 'empty' ? 'var(--unknown)' : 'var(--accent)'}`, borderRadius: '10px', padding: '10px 12px', background: 'var(--surface)', minWidth: '0' });
  const l = node('p', label); Object.assign(l.style, { margin: '0', fontSize: '0.8rem', color: 'var(--muted)', fontWeight: '600' });
  const v = node('p', value); Object.assign(v.style, { margin: '2px 0 6px', fontSize: '1.15rem', fontWeight: '800', overflowWrap: 'anywhere' });
  box.append(l, v);
  if (badge) box.append(badge);
  return box;
}
// 배지 복제본: 화면 표시용이므로 data 속성은 지웁니다(원본 배지는 「자세히」에 그대로 남음).
function badgeCopy(badge) {
  if (!badge) return null;
  const copy = badge.cloneNode(true);
  for (const name of [...copy.getAttributeNames()]) if (name.startsWith('data-') || name === 'role') copy.removeAttribute(name);
  Object.assign(copy.style, { display: 'inline-block', padding: '2px 10px', borderRadius: '999px', fontWeight: '700', fontSize: '0.8rem' });
  return copy;
}
const grid = (min) => { const g = node('div', null, { className: 'student-grid' }); Object.assign(g.style, { display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`, gap: '10px', margin: '8px 0' }); return g; };
const ddOf = (dl, term) => { for (const dt of dl ? dl.querySelectorAll(':scope > dt') : []) if (dt.textContent === term) return dt.nextElementSibling; return null; };

// 13단계 · 현재 로그인: 사용자·기기·세션 타일 + 주의 한 번 + 자세히(ID·목록)
function presentIdentity(root) {
  const me = root.querySelector('[data-part="me"]');
  if (!me) return;
  const title = me.querySelector(':scope > h3, :scope > .student-head > h3');
  const source = me.querySelector(':scope > p[data-mode]');
  headerRow(me, title, source);
  const list = me.querySelector(':scope > dl.kv');
  if (list && once(me, 'studentTiles')) {
    const tiles = grid(120);
    tiles.className = 'student-grid student-identity-tiles';
    const deviceBadge = ddOf(list, '기기 보안 상태') && ddOf(list, '기기 보안 상태').querySelector('.state');
    const sessionBadge = ddOf(list, '세션 상태') && ddOf(list, '세션 상태').querySelector('.state');
    const tone = b => (b && b.classList.contains('state-ok') ? 'ok' : 'error');
    tiles.append(
      tile('사용자', (ddOf(list, '사용자') || {}).textContent || '확인 불가', null, 'ok'),
      tile('기기', (ddOf(list, '현재 기기') || {}).textContent || '확인 불가', badgeCopy(deviceBadge), tone(deviceBadge)),
      tile('세션', (ddOf(list, '세션 ID') || {}).textContent || '확인 불가', badgeCopy(sessionBadge), tone(sessionBadge)),
    );
    me.insertBefore(tiles, list);
  }
  const alert = me.querySelector(':scope > p.state-error[role="alert"]');
  if (alert) Object.assign(alert.style, { fontWeight: '700', margin: '8px 0' });
  // 목록 칸은 정상으로 받았을 때만 접습니다(불러오는 중·실패·확인 불가는 그대로 보임).
  const lists = [...root.querySelectorAll(':scope > section[data-part="devices"], :scope > section[data-part="sessions"]')].filter(s => s.dataset.state === 'ok');
  for (const s of root.querySelectorAll(':scope > section[data-part="devices"], :scope > section[data-part="sessions"]')) {
    const t = s.querySelector(':scope > h3'); if (t) Object.assign(t.style, { fontSize: '0.95rem', margin: '10px 0 4px' });
  }
  infoBox(root, 'identity', [source, list, ...lists], 'ⓘ 자세히 (자료 출처 · 사용자 ID · 기기 ID · 세션 ID · 내 기기 목록 · 내 로그인 세션)');
}

// 14단계 · 업무 앱 판정: 판정을 큰 상자로, 이유·시각은 옆 타일로
function presentDecision(root) {
  const title = root.querySelector(':scope > h3, :scope > .student-head > h3');
  const source = root.querySelector(':scope > p[data-mode]');
  headerRow(root, title, source);
  const app = root.querySelector(':scope > p[data-app-id]');
  const verdict = root.querySelector(':scope p[data-decision]');
  const state = root.dataset.state;
  if (state === 'idle') idleBox(verdict);
  else if (state === 'ok' && verdict) {
    if (once(root, 'studentDecision')) {
      const wrap = grid(240); wrap.className = 'student-grid student-decision-grid';
      const hero = node('div', null, { className: 'student-decision-hero' });
      root.insertBefore(wrap, verdict);
      const next = verdict.nextElementSibling;
      hero.append(...[app, verdict].filter(Boolean));
      // 판정 설명(정의되지 않은 값 안내 포함)은 판정 상자 안에 그대로 둡니다.
      let sib = next;
      while (sib && sib.tagName === 'P') { const n = sib.nextElementSibling; hero.append(sib); sib = n; }
      const kv = root.querySelector(':scope > dl.kv');
      const side = node('div', null, { className: 'student-decision-side' });
      if (kv) side.append(kv);
      wrap.append(hero, side);
    }
    const hero = root.querySelector('.student-decision-hero');
    const [fg, bg] = TONE[toneOf(verdict)];
    if (hero) Object.assign(hero.style, { border: `2px solid ${fg}`, background: bg, borderRadius: '12px', padding: '12px 14px' });
    Object.assign(verdict.style, { background: 'none', border: 'none', borderLeft: 'none', padding: '0', fontSize: '1.5rem', fontWeight: '900', color: fg, margin: '2px 0' });
    if (app) Object.assign(app.style, { margin: '0', fontSize: '0.85rem', color: 'var(--muted)', fontWeight: '600' });
    const side = root.querySelector('.student-decision-side');
    if (side) Object.assign(side.style, { border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 14px', background: 'var(--surface)' });
  } else heroBox(verdict, false);
  infoBox(root, 'decision', [source], 'ⓘ 설명 (자료 출처)');
}

// 15단계 · 접속 기록: 필터 한 줄, 기록은 한 줄 카드(시각·종류 | 요약 | 상세 버튼), 상세는 근거·규칙·상태 3칸
function presentEvents(root) {
  const title = root.querySelector(':scope > h3, :scope > .student-head > h3');
  const source = root.querySelector(':scope > p[data-mode]');
  const scope = root.querySelector(':scope > p[data-student-event-scope]');
  headerRow(root, title, source);
  const bar = root.querySelector(':scope > .student-event-filters');
  if (bar) {
    Object.assign(bar.style, { display: 'flex', flexWrap: 'wrap', gap: '6px 16px', alignItems: 'center', padding: '8px 10px', background: 'var(--accent-soft)', borderRadius: '10px', margin: '0 0 8px' });
    styleAll(bar.querySelectorAll('.student-filter'), { margin: '0' });
    styleAll(bar.querySelectorAll('label'), { fontWeight: '700', fontSize: '0.85rem' });
  }
  for (const li of root.querySelectorAll('.student-event-list > li')) {
    const ps = [...li.querySelectorAll(':scope > p')];
    const button = li.querySelector(':scope > button');
    const detail = li.querySelector(':scope > .student-event-detail');
    Object.assign(li.style, { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.6fr) auto', columnGap: '14px', rowGap: '2px', alignItems: 'center', padding: '10px 12px',
      border: `1px solid ${detail ? 'var(--accent)' : 'var(--border)'}`, boxShadow: detail ? '0 0 0 2px var(--accent-soft)' : 'none' });
    if (ps[0]) Object.assign(ps[0].style, { gridColumn: '1', gridRow: '1', margin: '0', fontWeight: '700', fontSize: '0.85rem' });
    if (ps[1]) Object.assign(ps[1].style, { gridColumn: '1', gridRow: '2', margin: '0', fontSize: '0.8rem', color: 'var(--muted)' });
    if (ps[2]) Object.assign(ps[2].style, { gridColumn: '2', gridRow: '1 / span 2', margin: '0', fontWeight: '600' });
    if (button) {
      Object.assign(button.style, { gridColumn: '3', gridRow: '1 / span 2' });
      if (detail) Object.assign(button.style, { background: 'var(--accent)', color: 'var(--on-accent, #fff)', borderColor: 'var(--accent)' });
    }
    if (detail) {
      Object.assign(detail.style, { gridColumn: '1 / -1', marginTop: '8px' });
      const parts = [...detail.children];
      const stateTitle = parts.find(el => el.tagName === 'H5' && el.textContent.startsWith('상태'));
      if (stateTitle && once(detail, 'studentDetail')) {
        const states = stateTitle.nextElementSibling;
        const cols = grid(200); cols.className = 'student-grid student-event-detail-grid';
        const evidence = parts.find(el => el.tagName === 'DIV' && el.querySelector('h5') && el.querySelector('h5').textContent.startsWith('근거'));
        const rules = parts.find(el => el.tagName === 'DIV' && el.querySelector('h5') && el.querySelector('h5').textContent.startsWith('규칙'));
        const stateBox = node('div');
        detail.insertBefore(cols, evidence || stateTitle);
        stateBox.append(stateTitle, states);
        cols.append(...[evidence, rules, stateBox].filter(Boolean));
      }
      for (const col of detail.querySelectorAll('.student-event-detail-grid > div')) Object.assign(col.style, { border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 12px', background: 'var(--surface)' });
      for (const li2 of detail.querySelectorAll('.student-event-detail-grid li')) Object.assign(li2.style, { border: 'none', padding: '2px 0', margin: '0' });
      styleAll(detail.querySelectorAll('.student-event-detail-grid h5'), { margin: '0 0 6px', borderLeft: 'none', paddingLeft: '0', color: 'var(--muted)', fontSize: '0.8rem' });
    }
  }
  infoBox(root, 'events', [scope, source], 'ⓘ 설명 (표시 범위 · 자료 출처)');
}

// 16단계 · 기기·세션·알림·도움정보: 기기·세션·알림 타일 3개 + 도움정보 한 줄
function presentStatus16(root) {
  const title = root.querySelector(':scope > h3, :scope > .student-head > h3');
  const source = root.querySelector(':scope > p[data-mode]');
  headerRow(root, title, source);
  const parts = ['devices', 'sessions', 'notifications'].map(k => root.querySelector(`[data-student-status-part="${k}"]`)).filter(Boolean);
  if (parts.length && once(root, 'studentStatusTiles')) {
    const g = grid(220); g.className = 'student-grid student-status-tiles';
    root.insertBefore(g, parts[0]);
    g.append(...parts);
  }
  const notes = [];
  for (const part of parts) {
    const bad = part.querySelector('.state-error') || (part.dataset.studentStatusPart === 'notifications' && part.querySelector('[data-student-notifications]:not([data-student-notifications="0"])'));
    Object.assign(part.style, { border: '1px solid var(--border)', borderTop: `4px solid ${bad ? 'var(--deny)' : 'var(--accent)'}`, borderRadius: '10px', padding: '10px 12px', background: 'var(--surface)', minWidth: '0' });
    const h = part.querySelector(':scope > h4'); if (h) Object.assign(h.style, { margin: '0 0 4px', borderLeft: 'none', paddingLeft: '0', fontSize: '0.85rem', color: 'var(--muted)' });
    // 출처·설명 문장은 접고, 목록·상태·실패 문구는 그대로 둡니다.
    for (const p of part.querySelectorAll(':scope > p.muted')) notes.push(p);
    for (const li of part.querySelectorAll('li')) Object.assign(li.style, { border: 'none', padding: '2px 0', margin: '0', background: 'none' });
  }
  const count = root.querySelector('[data-student-notifications]');
  if (count && count.dataset.studentNotifications !== '0') Object.assign(count.style, { fontWeight: '800', color: 'var(--deny)', margin: '0 0 4px' });
  const diag = root.querySelector('[data-student-status-part="diagnostics"]');
  if (diag) {
    Object.assign(diag.style, { border: '1px solid var(--border)', borderRadius: '10px', padding: '10px 12px', margin: '10px 0 0', background: 'var(--surface)' });
    const h = diag.querySelector(':scope > h4'); if (h) Object.assign(h.style, { margin: '0 0 4px', borderLeft: 'none', paddingLeft: '0' });
  }
  infoBox(root, 'status16', [source, ...notes], 'ⓘ 설명 (자료 출처 · 목록 범위)');
}

// 17단계 · AI 연결 점검: 결과를 큰 상자로. test는 「시험 연결 확인」으로 낮춰 씁니다(앱 권한 확인 아님).
function presentAiConnection(root) {
  const title = root.querySelector(':scope > h3, :scope > .student-head > h3');
  headerRow(root, title, null);
  // 접는 것은 점검 범위 설명과 「다시 점검은…」 안내뿐입니다(「연결 완료가 아니며…」 같은 안전 문구는 그대로 보임).
  const desc = [...root.querySelectorAll(':scope > p.muted')].find(p => p.textContent.startsWith('이 점검은'));
  const check = root.querySelector('p[data-ai-check]');
  if (check) {
    const kind = check.dataset.aiCheck;
    if (kind === 'idle') idleBox(check);
    else heroBox(check, kind === 'ok');
    if (kind === 'ok' && once(check, 'studentHeadline')) {
      const audience = check.dataset.aiAudience;
      const headline = audience === 'verified' ? '앱 권한 확인 후 연결 확인 (verified)' : audience === 'test' ? '시험 연결 확인 (test)' : '확인 불가 (unknown)';
      const strong = node('span', headline, { className: 'student-hero-headline' });
      check.prepend(strong, node('br'));
    }
    const strong = check.querySelector('.student-hero-headline');
    if (strong) Object.assign(strong.style, { fontSize: '1.4rem', fontWeight: '900' });
  }
  const tail = [...root.querySelectorAll(':scope > p.muted')].filter(p => p !== desc && /다시 점검은/.test(p.textContent));
  infoBox(root, 'ai', [desc, ...tail], 'ⓘ 설명');
}

// 18단계 · AI 사건 설명: 요약을 크게, 근거·규칙은 왼쪽, 조치 제안은 오른쪽, 확인 불가는 따로 강조
function presentExplanation(root) {
  const title = root.querySelector(':scope > h3, :scope > .student-head > h3');
  headerRow(root, title, null);
  const stateP = root.querySelector('p[data-student-explanation-state]');
  if (stateP && ['no-event', 'idle'].includes(stateP.dataset.studentExplanationState)) idleBox(stateP);
  else if (stateP) heroBox(stateP, false);
  const failed = root.querySelector('p[data-student-explanation-failed]');
  if (failed) heroBox(failed, false);
  if (!root.hasAttribute('data-student-explanation-event')) return;
  const h4s = [...root.querySelectorAll(':scope > h4, .student-explain-grid h4, .student-explain-unknown h4')];
  const find = t => h4s.find(h => h.textContent.startsWith(t));
  if (once(root, 'studentExplain')) {
    const take = (start, stopTexts) => { const out = []; let el = start; while (el && !(el !== start && el.tagName === 'H4' && stopTexts.some(t => el.textContent.startsWith(t)))) { out.push(el); el = el.nextElementSibling; } return out; };
    const left = node('div', null, { className: 'student-explain-left' });
    const right = node('div', null, { className: 'student-explain-right' });
    const unknownBox = node('div', null, { className: 'student-explain-unknown' });
    const leftItems = take(find('AI 설명'), ['확인 불가 상태']);
    const unknownItems = take(find('확인 불가 상태'), ['조치 제안']);
    const rightItems = take(find('조치 제안'), ['__end__']);
    const g = grid(260); g.className = 'student-grid student-explain-grid';
    root.insertBefore(g, leftItems[0]);
    left.append(...leftItems); right.append(...rightItems); unknownBox.append(...unknownItems);
    g.append(left, right);
    root.insertBefore(unknownBox, g.nextSibling);
  }
  const left = root.querySelector('.student-explain-left'), right = root.querySelector('.student-explain-right'), unknownBox = root.querySelector('.student-explain-unknown');
  if (left) Object.assign(left.style, { border: '1px solid var(--border)', borderLeft: '4px solid var(--accent)', borderRadius: '10px', padding: '10px 12px', background: 'var(--surface)', minWidth: '0' });
  if (right) Object.assign(right.style, { border: '1px solid var(--border)', borderTop: '4px solid var(--challenge)', borderRadius: '10px', padding: '10px 12px', background: 'var(--surface)', minWidth: '0' });
  if (unknownBox) Object.assign(unknownBox.style, { borderLeft: '4px solid var(--unknown)', background: 'var(--unknown-soft)', borderRadius: '10px', padding: '8px 12px', margin: '8px 0' });
  const summary = left && ddOf(left.querySelector('dl.kv'), 'AI 요약');
  if (summary) Object.assign(summary.style, { fontSize: '1.05rem', fontWeight: '800' });
  for (const li of root.querySelectorAll('.student-explain-grid li, .student-explain-unknown li')) Object.assign(li.style, { border: 'none', padding: '2px 0', margin: '0', background: 'none' });
  for (const li of root.querySelectorAll('.student-explain-right li')) Object.assign(li.style, { fontWeight: '700' });
}

// 19단계 · 조치 상태: 진행 단계 막대(정상 흐름일 때만) + 현재 상태 큰 상자. 거절·실패·불명·기한 지남은 막대를 채우지 않습니다.
const ACTION_STEPS = Object.freeze(['준비됨', '사람 확인', '서버 전달', '접수(ACK)', '효과 확인']);
const ACTION_STEP_OF = Object.freeze({ prepared: 1, executing: 3, pending: 4, succeeded: 5 });
function presentAction(root) {
  const title = root.querySelector(':scope > h3, :scope > .student-head > h3');
  headerRow(root, title, null);
  const status = root.dataset.state;
  const stateP = root.querySelector('p[data-action-status]');
  if (stateP) (status === 'idle' ? idleBox : heroBox)(stateP, true);
  const step = ACTION_STEP_OF[status] || 0;
  if (step && once(root, 'studentSteps')) {
    const bar = node('ol', null, { className: 'student-action-steps', 'aria-label': `조치 진행 단계: ${ACTION_STEPS.length}단계 중 ${step}단계(${ACTION_STEPS[step - 1]})` });
    ACTION_STEPS.forEach((label, i) => {
      const li = node('li', label, i + 1 === step ? { 'aria-current': 'step' } : {});
      bar.append(li);
    });
    root.insertBefore(bar, stateP);
  }
  const bar = root.querySelector('.student-action-steps');
  if (bar) {
    Object.assign(bar.style, { display: 'grid', gridTemplateColumns: `repeat(${ACTION_STEPS.length}, 1fr)`, gap: '6px', listStyle: 'none', padding: '0', margin: '6px 0 10px' });
    [...bar.children].forEach((li, i) => Object.assign(li.style, { borderTop: `6px solid ${i < step ? 'var(--accent)' : 'var(--unknown-soft)'}`, paddingTop: '4px', textAlign: 'center', fontSize: '0.8rem', border: 'none', borderRadius: '0', background: 'none', margin: '0', fontWeight: i + 1 === step ? '800' : '400', color: i + 1 === step ? 'var(--accent)' : 'var(--muted)' }));
    [...bar.children].forEach((li, i) => { li.style.borderTop = `6px solid ${i < step ? 'var(--accent)' : 'var(--unknown-soft)'}`; });
  }
  const tail = [...root.querySelectorAll(':scope > p.muted')].filter(p => /이 칸은 상태만 보여 줍니다/.test(p.textContent));
  const kv = root.querySelector(':scope > dl.kv');
  infoBox(root, 'action', [kv, ...tail], 'ⓘ 자세히 (사건·조치·요청 번호 · 이 칸의 역할)');
}

// 20단계 · 패키지·취약점: 숫자 타일 3개(패키지·알려진 항목·확인 불가) + 표
function presentVulnerabilities(root) {
  const title = root.querySelector(':scope > h3, :scope > .student-head > h3');
  const source = root.querySelector(':scope > p[data-mode]');
  headerRow(root, title, source);
  const scan = root.querySelector('p[data-student-scan]');
  if (scan) (scan.dataset.studentScan === 'idle' ? idleBox : heroBox)(scan, false);
  const table = root.querySelector('table.student-package-table');
  if (table && once(root, 'studentScanTiles')) {
    const rows = [...table.querySelectorAll('tbody > tr')];
    const known = rows.filter(r => r.dataset.studentPackageStatus === 'known_vulnerabilities').length;
    const unverifiable = rows.filter(r => !['known_vulnerabilities', 'none_found'].includes(r.dataset.studentPackageStatus)).length;
    const g = grid(140); g.className = 'student-grid student-scan-tiles';
    g.append(tile('조회한 패키지', `${rows.length}개`, null, 'ok'), tile('알려진 항목 있음', `${known}개`, null, known ? 'error' : 'ok'), tile('조회 확인 불가', `${unverifiable}개`, null, unverifiable ? 'empty' : 'ok'));
    root.insertBefore(g, scan ? scan.nextSibling : table);
  }
  const footer = [...root.querySelectorAll(':scope > p.muted')].find(p => p.textContent.startsWith('OSV는'));
  if (footer) Object.assign(footer.style, { fontWeight: '700', color: 'var(--text)' });
  const lockNote = [...root.querySelectorAll(':scope > p.muted')].find(p => p.textContent.startsWith('버전은 package-lock'));
  const summary = root.querySelector(':scope > dl.kv');
  infoBox(root, 'scan', [source, summary, lockNote], 'ⓘ 자세히 (자료 출처 · lock 파일 · 조회 시각)');
}

export function createStudentView({ api, onChange } = {}) {
  const pcDashboard = createPcDashboard({ api, onChange });
  const renderEvents = createEventsRenderer();
  return {
    renderIdentity: input => polishStudent(renderIdentity(input), presentIdentity),
    renderDecision: input => polishStudent(renderDecision(input), presentDecision),
    renderEvents: input => polishStudent(renderEvents(input), presentEvents),
    // 16단계 renderStatus 결과는 그대로 두고(겉모습만 통일), 맨 위에 관제 대시보드를 덧붙입니다.
    renderStatus(input) {
      const element = polishStudent(renderStatus(input), presentStatus16);
      element.prepend(pcDashboard.render());
      if (typeof queueMicrotask === 'function') queueMicrotask(() => pcDashboard.restoreFocus());
      return element;
    },
    renderVulnerabilities: input => polishStudent(renderVulnerabilities(input), presentVulnerabilities),
    renderAiConnection: input => polishStudent(renderAiConnection(input), presentAiConnection),
    renderExplanation: input => polishStudent(renderExplanation(input), presentExplanation),
    renderAction: input => polishStudent(renderAction(input), presentAction),
  };
}
