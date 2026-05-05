/**
 * 재보험 정청산 관리 시스템 — PPT 생성 스크립트
 * Design System: Dark Navy / Pretendard / LAYOUT_16x9
 * Layout: 10" × 5.625"
 */
import PptxGenJS from 'pptxgenjs';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '..', 'docs');

// ── 색상 팔레트 (Dark Navy Design System) ──
const C = {
  bg:      '1E2D45',  // 슬라이드 배경
  card:    '243554',  // 카드 배경
  cardAlt: '2A3F61',  // 카드 배경 대안
  header:  '162034',  // 헤더 바
  accent:  '3B82F6',  // 강조 파란색
  label:   '7DD3FC',  // 챕터 레이블
  divider: '2E4068',  // 구분선
  white:   'FFFFFF',
  sub:     '94A3B8',
  body:    'CBD5E1',
  muted:   '64748B',
  step:    '1E3A5F',  // 단계 번호 배경
  green:   '22C55E',
  orange:  'F59E0B',
  red:     'EF4444',
};

// ── 레이아웃 상수 (LAYOUT_16x9: 10" × 5.625") ──
const S = { W: 10, H: 5.625 };
const L = {
  XL: 0.25,
  XR: 9.75,
  Y0: 0.98,
  YB: 5.28,
};
L.W  = L.XR - L.XL;   // 9.50
L.AH = L.YB - L.Y0;   // 4.30

const F = 'Pretendard';

// ── 중복 방지 파일명 ──
function resolveOutputPath(dir, baseName) {
  let candidate = path.join(dir, `${baseName}.pptx`);
  if (!existsSync(candidate)) return candidate;
  let n = 2;
  while (true) {
    candidate = path.join(dir, `${baseName}_${n}.pptx`);
    if (!existsSync(candidate)) return candidate;
    n++;
  }
}

// ── 공통 헬퍼 ──
function addHeader(slide, chNum, title, subtitle) {
  slide.addShape('rect', {
    x: 0, y: 0, w: S.W, h: 0.55,
    fill: { color: C.header }, line: { color: C.header, width: 0 }
  });
  slide.addText(String(chNum).padStart(2, '0'), {
    x: 0.30, y: 0, w: 0.52, h: 0.55,
    fontFace: F, fontSize: 13, bold: true,
    color: C.label, align: 'left', valign: 'middle', margin: 0
  });
  slide.addText(title, {
    x: 0.88, y: 0, w: 8.80, h: 0.55,
    fontFace: F, fontSize: 22, bold: true,
    color: C.white, align: 'left', valign: 'middle', margin: 0
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.35, y: 0.57, w: 9.30, h: 0.36,
      fontFace: F, fontSize: 13, bold: false,
      color: C.sub, align: 'left', valign: 'middle', margin: 0
    });
  }
}

function addCard(slide, x, y, w, h, heading, body, color) {
  const bg = color || C.card;
  slide.addShape('rect', {
    x, y, w, h,
    fill: { color: bg }, line: { color: C.divider, width: 0.75 }
  });
  if (heading) {
    slide.addText(heading, {
      x: x + 0.18, y: y + 0.12, w: w - 0.36, h: 0.28,
      fontFace: F, fontSize: 13, bold: true,
      color: C.white, align: 'left', valign: 'top',
      fit: 'shrink', wrap: true, margin: 0
    });
  }
  if (body) {
    const bY = heading ? y + 0.46 : y + 0.12;
    const bH = h - (heading ? 0.54 : 0.24);
    slide.addText(body, {
      x: x + 0.18, y: bY, w: w - 0.36, h: Math.max(bH, 0.25),
      fontFace: F, fontSize: 11, bold: false,
      color: C.body, align: 'left', valign: 'top',
      fit: 'shrink', wrap: true, margin: 0
    });
  }
}

// ════════════════════════════════════════════
//  PPT 생성
// ════════════════════════════════════════════
const pres = new PptxGenJS();
pres.layout = 'LAYOUT_16x9';
pres.title  = '재보험 정청산 관리 시스템';
pres.author = '바이브코딩랩';

// ── S01 표지 ─────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.bg };

  s.addShape('rect', {
    x: 0, y: 0, w: 0.08, h: S.H,
    fill: { color: C.accent }, line: { color: C.accent, width: 0 }
  });
  s.addText('재보험 정청산 관리 시스템', {
    x: 0.50, y: 0.70, w: 9.10, h: 1.00,
    fontFace: F, fontSize: 42, bold: true,
    color: C.white, align: 'left', valign: 'middle',
    fit: 'shrink', wrap: true, margin: 0
  });
  s.addText('Reinsurance Settlement Management System', {
    x: 0.50, y: 1.76, w: 9.10, h: 0.40,
    fontFace: F, fontSize: 15, bold: false,
    color: C.sub, align: 'left', valign: 'middle', margin: 0
  });
  s.addShape('rect', {
    x: 0.50, y: 2.26, w: 3.20, h: 0.04,
    fill: { color: C.accent }, line: { color: C.accent, width: 0 }
  });
  s.addText('계약 등록부터 회계 마감까지 — 8단계 완전 자동화 정산 워크플로우', {
    x: 0.50, y: 2.38, w: 9.10, h: 0.38,
    fontFace: F, fontSize: 13, bold: false,
    color: C.sub, align: 'left', valign: 'middle', margin: 0
  });

  const badges = ['Next.js 15', 'Supabase', 'TypeScript', 'shadcn/ui'];
  badges.forEach((b, i) => {
    const bx = 0.50 + i * 2.24;
    s.addShape('rect', {
      x: bx, y: 2.95, w: 2.10, h: 0.42,
      fill: { color: C.card }, line: { color: C.divider, width: 0.75 }
    });
    s.addText(b, {
      x: bx, y: 2.95, w: 2.10, h: 0.42,
      fontFace: F, fontSize: 12, bold: true,
      color: C.label, align: 'center', valign: 'middle', margin: 0
    });
  });

  const roles = ['브로커 실무자', '브로커 관리자', '출재사 뷰어', '수재사 뷰어'];
  roles.forEach((r, i) => {
    const rx = 0.50 + i * 2.24;
    s.addShape('rect', {
      x: rx, y: 3.55, w: 2.10, h: 0.38,
      fill: { color: C.step }, line: { color: C.step, width: 0 }
    });
    s.addText(r, {
      x: rx, y: 3.55, w: 2.10, h: 0.38,
      fontFace: F, fontSize: 11, bold: false,
      color: C.body, align: 'center', valign: 'middle', margin: 0
    });
  });

  s.addText('v1.4  |  2026-04-30  |  보험중개사 전용 싱글 테넌트', {
    x: 0.50, y: 5.15, w: 9.10, h: 0.30,
    fontFace: F, fontSize: 10, bold: false,
    color: C.muted, align: 'left', valign: 'middle', margin: 0
  });
}

// ── S02 목차 ─────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.bg };
  addHeader(s, '00', '목차', '8단계 정산 프로세스 + 핵심 기능 안내');

  const chapters = [
    { num: '00', title: '시스템 개요', sub: '사용자 역할 4종 · 화면 구성 · 사이드바 메뉴' },
    { num: '01', title: '계약(특약) 등록', sub: 'Treaty Setup — 출재비율 · 수수료율 · 정산주기 설정' },
    { num: '02', title: '명세 입력', sub: 'Bordereau — 보험료 명세 · 손해 명세 · CSV 업로드' },
    { num: '03-04', title: '기술계정 산출 & 정산서 작성', sub: 'Technical Account 자동 집계 → SOA Draft 생성' },
    { num: '05', title: '확인 및 승인', sub: '내부 승인 → 발행 → 외부 확인(Acknowledge) · 이의신청' },
    { num: '06', title: '정산 처리', sub: 'Settlement — 송수금 등록 · SOA 매칭' },
    { num: '07', title: '미수·미지급금 관리', sub: 'AR/AP Outstanding · Aging 구간 분석' },
    { num: '08', title: '회계 마감 및 보고', sub: 'Closing & Reporting — PDF/CSV 내보내기' },
    { num: '부록', title: '핵심 비즈니스 규칙', sub: '시스템 자동 검증 10가지 규칙' },
  ];

  const rowH = 0.43;
  const gap  = 0.02;
  const startY = L.Y0;

  chapters.forEach((ch, i) => {
    const cy = startY + i * (rowH + gap);
    const bg = i % 2 === 0 ? C.card : C.cardAlt;
    s.addShape('rect', {
      x: L.XL, y: cy, w: L.W, h: rowH,
      fill: { color: bg }, line: { color: C.divider, width: 0.5 }
    });
    s.addText(ch.num, {
      x: L.XL + 0.10, y: cy, w: 0.72, h: rowH,
      fontFace: F, fontSize: 11, bold: true,
      color: C.label, align: 'left', valign: 'middle', margin: 0
    });
    s.addText(ch.title, {
      x: L.XL + 0.88, y: cy, w: 4.30, h: rowH,
      fontFace: F, fontSize: 12, bold: true,
      color: C.white, align: 'left', valign: 'middle', margin: 0
    });
    s.addText(ch.sub, {
      x: L.XL + 5.30, y: cy, w: 4.10, h: rowH,
      fontFace: F, fontSize: 10.5, bold: false,
      color: C.sub, align: 'left', valign: 'middle', margin: 0
    });
  });
}

// ── S03 시스템 개요 ───────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.bg };
  addHeader(s, '00', '시스템 개요', '재보험 정산 업무를 단일 플랫폼에서 — 4가지 역할, 8단계 워크플로우');

  const colW = (L.W - 0.12) / 2;
  const rowH = (L.AH - 0.42) / 2;
  const rowGap = 0.12;

  const roles = [
    {
      title: '브로커 실무자 (Operator)',
      body: '계약 등록 · 명세 입력 · 정산서 초안 작성\n거래 관리 · 결제 등록 · 보고서 조회'
    },
    {
      title: '브로커 관리자 (Manager)',
      body: '정산서 승인 · 송금 결재\n전체 현황 모니터링 · 마스터 데이터 관리'
    },
    {
      title: '출재사 뷰어 (Cedant Viewer)',
      body: '발행된 정산서 열람 및 확인(Acknowledge)\n이의신청(Dispute) · 공유 링크 접속(로그인 불필요)'
    },
    {
      title: '수재사 뷰어 (Reinsurer Viewer)',
      body: '발행된 정산서 수령 · 열람 · 확인(Acknowledge)\n공유 링크(토큰 URL) 30일 유효'
    },
  ];

  roles.forEach((r, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cx = L.XL + col * (colW + 0.12);
    const cy = L.Y0 + row * (rowH + rowGap);
    addCard(s, cx, cy, colW, rowH, r.title, r.body);
  });

  // 사이드바 메뉴 행
  const menuY = L.Y0 + rowH * 2 + rowGap * 2 + 0.02;
  const menus = [
    { n: '—', m: '대시보드' }, { n: '1', m: '계약 관리' }, { n: '2', m: '명세 입력' },
    { n: '2', m: '거래 관리' }, { n: '4~5', m: '정산서 관리' }, { n: '6', m: '결제 관리' },
    { n: '7', m: '미청산 잔액' }, { n: '8', m: '보고서' },
  ];
  const mW = (L.W - 0.08 * 7) / 8;
  menus.forEach((m, i) => {
    const mx = L.XL + i * (mW + 0.08);
    s.addShape('rect', {
      x: mx, y: menuY, w: mW, h: 0.60,
      fill: { color: C.step }, line: { color: C.accent, width: 0.75 }
    });
    s.addText(m.m, {
      x: mx, y: menuY, w: mW, h: 0.38,
      fontFace: F, fontSize: 9.5, bold: true,
      color: C.label, align: 'center', valign: 'middle',
      wrap: true, fit: 'shrink', margin: 0
    });
    s.addText(`단계 ${m.n}`, {
      x: mx, y: menuY + 0.38, w: mW, h: 0.22,
      fontFace: F, fontSize: 8.5, bold: false,
      color: C.muted, align: 'center', valign: 'middle', margin: 0
    });
  });
}

// ── S04 8단계 프로세스 흐름도 ────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.bg };
  addHeader(s, '00', '8단계 정산 프로세스 전체 흐름', '계약 등록부터 회계 마감까지 — 단계 순서 엄수');

  const steps = [
    { n: 1, title: '계약 등록', eng: 'Treaty Setup', url: '/contracts' },
    { n: 2, title: '명세 입력', eng: 'Bordereau', url: '/bordereau' },
    { n: 3, title: '기술계정 산출', eng: 'Technical Account', url: '/account-currents' },
    { n: 4, title: '정산서 작성', eng: 'SOA Draft', url: '/account-currents/new' },
    { n: 5, title: '확인·승인', eng: 'Confirmation', url: '/account-currents/{id}' },
    { n: 6, title: '정산 처리', eng: 'Settlement', url: '/settlements' },
    { n: 7, title: '미수·미지급', eng: 'AR/AP & Aging', url: '/outstanding' },
    { n: 8, title: '회계 마감', eng: 'Closing & Report', url: '/reports' },
  ];

  const boxW = (L.W - 0.10 * 3) / 4;
  const boxH = (L.AH - 0.45) / 2;
  const rowGap = 0.45;
  const colGap = 0.10;

  steps.forEach((step, i) => {
    const col = i % 4;
    const row = Math.floor(i / 4);
    const cx = L.XL + col * (boxW + colGap);
    const cy = L.Y0 + row * (boxH + rowGap);

    s.addShape('rect', {
      x: cx, y: cy, w: boxW, h: boxH,
      fill: { color: C.card }, line: { color: C.accent, width: 1 }
    });
    s.addShape('rect', {
      x: cx, y: cy, w: boxW, h: 0.30,
      fill: { color: C.step }, line: { color: C.step, width: 0 }
    });
    s.addText(`STEP ${step.n}`, {
      x: cx, y: cy, w: boxW, h: 0.30,
      fontFace: F, fontSize: 10.5, bold: true,
      color: C.label, align: 'center', valign: 'middle', margin: 0
    });
    s.addText(step.title, {
      x: cx + 0.08, y: cy + 0.34, w: boxW - 0.16, h: 0.36,
      fontFace: F, fontSize: 12.5, bold: true,
      color: C.white, align: 'center', valign: 'middle',
      fit: 'shrink', wrap: true, margin: 0
    });
    s.addText(step.eng, {
      x: cx + 0.08, y: cy + 0.72, w: boxW - 0.16, h: 0.26,
      fontFace: F, fontSize: 9.5, bold: false,
      color: C.sub, align: 'center', valign: 'middle',
      fit: 'shrink', wrap: true, margin: 0
    });
    s.addText(step.url, {
      x: cx + 0.08, y: cy + boxH - 0.28, w: boxW - 0.16, h: 0.22,
      fontFace: F, fontSize: 8.5, bold: false,
      color: C.muted, align: 'center', valign: 'middle',
      fit: 'shrink', wrap: true, margin: 0
    });

    // 행 내 화살표
    if (col < 3) {
      s.addShape('rect', {
        x: cx + boxW, y: cy + boxH / 2 - 0.02,
        w: colGap, h: 0.04,
        fill: { color: C.accent }, line: { color: C.accent, width: 0 }
      });
    }
  });

  // 행 간 수직 화살표 (4번 → 5번)
  const arrowX = L.XL + 3 * (boxW + colGap) + boxW / 2 - 0.02;
  const row0bottom = L.Y0 + boxH;
  s.addShape('rect', {
    x: arrowX, y: row0bottom + 0.02,
    w: 0.04, h: rowGap - 0.04,
    fill: { color: C.accent }, line: { color: C.accent, width: 0 }
  });
  // 5번 위치로 연결하는 수평 화살표
  const arrowY2 = L.Y0 + boxH + rowGap / 2 - 0.02;
  s.addShape('rect', {
    x: L.XL, y: arrowY2, w: L.XL + 3 * (boxW + colGap) + boxW / 2, h: 0.04,
    fill: { color: C.accent }, line: { color: C.accent, width: 0 }
  });
}

// ── S05 1단계: 계약 등록 ─────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.bg };
  addHeader(s, '01', '계약(특약) 등록', 'Treaty Setup — 이후 모든 정산 산출의 기준 정보');

  const leftW = 4.55;
  const rightX = L.XL + leftW + 0.12;
  const rightW = L.W - leftW - 0.12;

  addCard(s, L.XL, L.Y0, leftW, 1.90,
    '필수 입력 항목',
    '기본 정보: 계약번호 · 유형(Treaty/Fac) · 보험종목\n거래상대방: 출재사 · 수재사 지분율(합계 반드시 100%)\n기간·통화: 개시일 · 만기일 · 정산통화 · 정산주기'
  );
  addCard(s, L.XL, L.Y0 + 1.98, leftW, 2.08,
    '선택 입력 항목 (▶ 접힌 섹션 펼쳐서 입력)',
    '수수료 체계: 출재수수료율(%) · 이익수수료율(%) · 중개수수료율(%)\n적립금·이자: 보험료적립금율(%) · 손해적립금율(%) · 이자율(%)\n정산 조건: 지급기한(일) · Cash Loss 한도 · 상계 허용 여부 · 확인기한(일)'
  );

  addCard(s, rightX, L.Y0, rightW, 2.10,
    '클릭 경로 (6단계) — URL: /contracts/new',
    '1. 사이드바 → 계약 관리 (1) 클릭\n2. + 계약 등록 버튼 클릭\n3. 기본 정보 섹션 입력\n4. 수재사별 지분율(%) 입력 — 합계 100% 필수\n5. 수수료·적립금·정산조건 섹션 펼쳐 입력 (선택)\n6. 계약 등록 버튼 클릭'
  );

  const ruleY = L.Y0 + 2.18;
  const rules = [
    { t: '지분율 합계', b: '수재사 지분율 합계\n반드시 100%' },
    { t: '계약 기간', b: '명세 위험기간 ⊂\n계약기간 내' },
    { t: '정산 통화', b: '명세 통화 =\n계약 정산통화' },
    { t: '다음 단계', b: 'status = active\n→ 명세 입력 가능' },
  ];
  const rW = (rightW - 0.09 * 3) / 4;
  rules.forEach((r, i) => {
    addCard(s, rightX + i * (rW + 0.09), ruleY, rW, L.YB - ruleY, r.t, r.b, C.cardAlt);
  });
}

// ── S06 2단계: 명세 입력 ─────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.bg };
  addHeader(s, '02', '명세 입력 (Bordereau)', '원수계약 증권/사고 단위 출재 내역 추적 — 직접 입력 또는 CSV 업로드');

  const colW = (L.W - 0.12) / 2;

  addCard(s, L.XL, L.Y0, colW, 1.80,
    '보험료 명세 (Premium Bordereau) — /bordereau/premium/new',
    '계약 · 회계기간(2026Q1 / S1 / A) · 증권번호\n위험기간(계약기간 내) · 보험가입금액\n원보험료 · 출재비율(%) → 출재보험료 자동계산\n처리구분: 신규 / 취소 / 환급 / 조정'
  );
  addCard(s, L.XL + colW + 0.12, L.Y0, colW, 1.80,
    '손해 명세 (Loss Bordereau) — /bordereau/loss/new',
    '사고번호 · 사고발생일 / 보고일\n지급보험금(Paid) · 미결손해(O/S Reserve)\n재보험금 회수액: (Paid + O/S) × 출재비율 자동계산\nCash Loss 여부 · 손해 상태(진행중/지급완료/종결/거절)'
  );

  addCard(s, L.XL, L.Y0 + 1.88, colW, 2.00,
    '방법 1: 직접 입력',
    '1. 사이드바 → 명세 입력 (2) 클릭\n2. + 보험료 명세 추가 / + 손해 명세 추가\n3. 각 필드 입력 — 자동계산 필드 확인\n4. 저장 클릭'
  );
  addCard(s, L.XL + colW + 0.12, L.Y0 + 1.88, colW, 2.00,
    '방법 2: CSV 일괄 업로드 (권장) — /bordereau/upload',
    '1. 명세 입력 → CSV 업로드 버튼 클릭\n2. 명세 유형 선택 → 샘플 CSV 다운로드\n3. 데이터 입력 후 저장 (UTF-8, 숫자에 쉼표 금지)\n4. 계약 선택 → CSV 업로드 → 행별 검증 확인\n5. 오류(error) 라인 수정 후 재저장'
  );

  const stY = L.Y0 + 3.96;
  const states = [
    { l: '정상 (valid)', c: C.green },
    { l: '경고 (warning)', c: C.orange },
    { l: '오류 (error)', c: C.red },
  ];
  const sW = (L.W - 0.12 * 2) / 3;
  states.forEach((st, i) => {
    const sx = L.XL + i * (sW + 0.12);
    s.addShape('rect', {
      x: sx, y: stY, w: sW, h: 0.40,
      fill: { color: C.card }, line: { color: st.c, width: 1.5 }
    });
    s.addText(st.l, {
      x: sx, y: stY, w: sW, h: 0.40,
      fontFace: F, fontSize: 11.5, bold: true,
      color: st.c, align: 'center', valign: 'middle', margin: 0
    });
  });
  s.addText('오류(error) 상태 라인은 정산서 집계 전에 반드시 수정 필요', {
    x: L.XL, y: stY + 0.44, w: L.W, h: 0.22,
    fontFace: F, fontSize: 10, bold: false,
    color: C.sub, align: 'center', valign: 'middle', margin: 0
  });
}

// ── S07 3~4단계: 기술계정 & 정산서 ──────────
{
  const s = pres.addSlide();
  s.background = { color: C.bg };
  addHeader(s, '03-04', '기술계정 산출 & 정산서 작성 (SOA)', '명세·거래 자동 집계 → Account Current 생성 → 수재사 발송');

  const colW = (L.W - 0.12) / 2;

  addCard(s, L.XL, L.Y0, colW, 2.62,
    '정산서(SOA) 자동 집계 항목',
    '출재보험료 (Credit)  ↑ 수재사가 받을 항목\n출재수수료 (Debit)   ↓ 출재사가 받을 항목\n재보험금 회수 (Debit) ↓ 출재사가 받을 항목\n보험료 적립금 신규 (Credit)  ↑ 수재사 유보\n보험료 적립금 환급 (Debit)   ↓ 이전 기간 반환\n이자 (Debit)         ↓ 출재사가 받을 항목\n이월잔액 B/F         → 자동 계산\n─────────────────────────────\n순 정산금액 (Net Balance) → 방향 자동 결정'
  );

  addCard(s, L.XL + colW + 0.12, L.Y0, colW, 1.50,
    '정산서 생성 절차 — /account-currents/new',
    '1. 정산서 관리 (4) → + 정산서 생성\n2. 계약 · 수재사 · 정산 기간 입력\n3. 중복 기간 경고 확인 후 진행\n4. 생성 → 시스템 자동 집계\n5. 항목별 집계 금액 확인'
  );

  addCard(s, L.XL + colW + 0.12, L.Y0 + 1.58, colW, 1.06,
    'B/F (Balance Brought Forward) 자동 계산',
    '= 직전 SOA net_balance\n  − 직전 SOA에 매칭된 Settlement 합계'
  );

  addCard(s, L.XL + colW + 0.12, L.Y0 + 2.72, colW, 0.96,
    '정산 방향 자동 결정',
    'net_balance > 0 → to_reinsurer (출재사 → 수재사 지급)\nnet_balance < 0 → to_cedant (수재사 → 출재사 지급)'
  );

  addCard(s, L.XL, L.Y0 + 2.70, colW, L.YB - L.Y0 - 2.70,
    '핵심 규칙: 수재사별 별도 SOA 발행',
    '동일 계약이라도 수재사가 다르면 각각 별도 정산서 생성\n초안(Draft) 상태에서만 내용 수정 가능\n이후 승인 요청 → 5단계로 진행'
  );
}

// ── S08 5단계: 확인 및 승인 ──────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.bg };
  addHeader(s, '05', '확인 및 승인', '내부 승인 → 발행 → 외부 확인(Acknowledge) — 상태 흐름에 따른 단계별 처리');

  // 주 흐름 상태
  const states = [
    { l: 'Draft\n초안', c: C.muted },
    { l: 'Pending\n승인대기', c: C.orange },
    { l: 'Approved\n승인됨', c: C.accent },
    { l: 'Issued\n발행됨', c: C.green },
    { l: 'Acknowledged\n확인됨', c: '10B981' },
  ];
  const stW = (L.W - 0.08 * 4) / 5;
  const stH = 0.72;
  const stY = L.Y0;

  states.forEach((st, i) => {
    const sx = L.XL + i * (stW + 0.08);
    s.addShape('rect', {
      x: sx, y: stY, w: stW, h: stH,
      fill: { color: C.card }, line: { color: st.c, width: 1.5 }
    });
    s.addText(st.l, {
      x: sx, y: stY, w: stW, h: stH,
      fontFace: F, fontSize: 10, bold: true,
      color: st.c, align: 'center', valign: 'middle',
      wrap: true, margin: 0
    });
    if (i < 4) {
      s.addShape('rect', {
        x: sx + stW, y: stY + stH / 2 - 0.02, w: 0.08, h: 0.04,
        fill: { color: C.accent }, line: { color: C.accent, width: 0 }
      });
    }
  });

  // 이의신청 분기
  const dY = stY + stH + 0.10;
  s.addText('이의 있는 경우 분기:', {
    x: L.XL + 3 * (stW + 0.08), y: dY, w: stW * 2.2, h: 0.22,
    fontFace: F, fontSize: 9.5, bold: false,
    color: C.sub, align: 'left', valign: 'middle', margin: 0
  });
  const dispStates = [
    { l: 'Disputed\n이의신청', c: C.red },
    { l: 'Cancelled\n취소', c: C.muted },
    { l: 'New Draft\n재발행', c: C.orange },
  ];
  dispStates.forEach((ds, i) => {
    const dx = L.XL + (3 + i) * (stW + 0.08);
    s.addShape('rect', {
      x: dx, y: dY + 0.26, w: stW, h: 0.58,
      fill: { color: C.card }, line: { color: ds.c, width: 1.2 }
    });
    s.addText(ds.l, {
      x: dx, y: dY + 0.26, w: stW, h: 0.58,
      fontFace: F, fontSize: 10, bold: true,
      color: ds.c, align: 'center', valign: 'middle',
      wrap: true, margin: 0
    });
    if (i < 2) {
      s.addShape('rect', {
        x: dx + stW, y: dY + 0.55, w: 0.08, h: 0.04,
        fill: { color: C.red }, line: { color: C.red, width: 0 }
      });
    }
  });

  // 담당자별 역할 카드
  const roleY = dY + 1.00;
  const colW = (L.W - 0.12) / 2;
  addCard(s, L.XL, roleY, colW, L.YB - roleY,
    '브로커(내부) 담당자',
    '1. 정산서 상세 → 승인 요청 버튼 클릭\n2. 관리자가 내용 검토 후 승인 버튼\n3. 승인 후 발행 버튼 → 토큰 URL 생성\n4. 수재사/출재사에게 공유 링크 발송\n\n화면: /account-currents/{id}'
  );
  addCard(s, L.XL + colW + 0.12, roleY, colW, L.YB - roleY,
    '외부 뷰어 (수재사/출재사)',
    '1. 이메일 공유 링크 접속 (로그인 불필요)\n2. 정산서 내용 검토\n3. 확인(Acknowledge) 버튼 클릭\n4. 이의 있는 경우 이의신청(Dispute) 버튼\n\n공유 링크: /share/{token} — 30일 유효'
  );
}

// ── S09 6단계: 정산 처리 ─────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.bg };
  addHeader(s, '06', '정산 처리 (송수금)', 'Settlement — 송금·수금 등록 및 SOA 매칭으로 미청산 잔액 청산');

  const colW = (L.W - 0.12) / 2;

  addCard(s, L.XL, L.Y0, colW, 1.92,
    '등록 입력 항목',
    '정산 유형: 수금(Receipt) / 송금(Payment)\n거래상대방: 송금 또는 수금 상대방\n금액 · 통화 선택\n정산일: 실제 입금/출금일\n메모: 은행 참조번호 등 내부 메모'
  );
  addCard(s, L.XL + colW + 0.12, L.Y0, colW, 1.92,
    '등록 절차 — URL: /settlements',
    '1. 결제 관리 (6) 클릭\n2. + 정산 등록 → 수금/송금 등록\n3. 매칭 패널에서 SOA 선택\n4. 매칭 확정 → 정산서 미청산 잔액 감소'
  );

  addCard(s, L.XL, L.Y0 + 2.00, L.W, 1.38,
    '매칭(Matching) 개념',
    'SOA 발행 → 미청산 상태 → 송금/수금 등록 → 매칭 패널에서 SOA 연결 → 매칭 확정 시 SOA 미청산 잔액 감소\n하나의 정산에 여러 SOA 분할 매칭 또는 하나의 SOA에 여러 정산 매칭 복합 지원'
  );

  addCard(s, L.XL, L.Y0 + 3.46, L.W, L.YB - L.Y0 - 3.46,
    '주의: SOA 승인·발행 후 연결 거래 수정 차단',
    'SOA 승인 또는 발행 이후 연결된 거래(명세·거래내역)의 수정은 차단됩니다.\n수정이 필요한 경우 SOA를 취소(Cancelled)한 후 새 정산서를 재발행하세요.'
  );
}

// ── S10 7단계: 미수·미지급금 ─────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.bg };
  addHeader(s, '07', '미수·미지급금 관리 (AR/AP)', 'Outstanding — Aging 구간 분석으로 연체 현황 파악 및 독촉 관리');

  const agings = [
    { l: '0 ~ 30일', d: '정상 범위\n즉시 처리 권고', c: C.green },
    { l: '31 ~ 60일', d: '주의 필요\n담당자 확인', c: C.accent },
    { l: '61 ~ 90일', d: '연체 주의\n독촉 발송', c: C.orange },
    { l: '91 ~ 180일', d: '연체\n상계 검토', c: 'F97316' },
    { l: '180일+', d: '장기 연체\n법적 조치 검토', c: C.red },
  ];

  const aW = (L.W - 0.10 * 4) / 5;
  agings.forEach((ag, i) => {
    const ax = L.XL + i * (aW + 0.10);
    s.addShape('rect', {
      x: ax, y: L.Y0, w: aW, h: 0.96,
      fill: { color: C.card }, line: { color: ag.c, width: 2 }
    });
    s.addText(ag.l, {
      x: ax, y: L.Y0 + 0.04, w: aW, h: 0.36,
      fontFace: F, fontSize: 11.5, bold: true,
      color: ag.c, align: 'center', valign: 'middle', margin: 0
    });
    s.addText(ag.d, {
      x: ax, y: L.Y0 + 0.42, w: aW, h: 0.50,
      fontFace: F, fontSize: 10, bold: false,
      color: C.body, align: 'center', valign: 'top',
      wrap: true, fit: 'shrink', margin: 0
    });
  });

  addCard(s, L.XL, L.Y0 + 1.04, L.W, 1.42,
    '미청산 잔액 현황 테이블 — 주요 컬럼',
    '거래상대방  |  계약 / SOA 번호  |  발생일 / 만기일  |  금액(통화별)  |  Aging 구간  |  상태(정상/연체/분쟁)\n필터: 거래상대방 · 계약 · 날짜 범위 · 방향(수취/지급) · 통화\nKPI 카드: 총 미청산 잔액 · 연체 비율 · 통화별 수취/지급 소계'
  );

  addCard(s, L.XL, L.Y0 + 2.54, L.W, L.YB - L.Y0 - 2.54,
    '처리 절차 — URL: /outstanding',
    '1. 미청산 잔액 (7) 클릭 → Aging 테이블 조회\n2. 거래상대방 · 계약 · 날짜 범위로 필터링\n3. 61일+ Aging 구간 우선 확인\n4. 연체 건 독촉 발송 또는 상계 처리'
  );
}

// ── S11 8단계: 회계 마감·보고 ────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.bg };
  addHeader(s, '08', '회계 마감 및 보고', 'Closing & Reporting — 계약별·거래상대방별·통화별 손익 및 내보내기');

  const colW = (L.W - 0.12) / 2;

  addCard(s, L.XL, L.Y0, colW, 2.00,
    '보고서 유형 3종 — URL: /reports',
    '계약별 손익:\n  계약별 출재보험료 · 보험금 · 수수료 · 순손익\n\n거래상대방별 잔액:\n  수재사별 미청산 잔액 요약\n\n통화별 포지션:\n  외화별 미청산 잔액 (환율 리스크 관리)'
  );
  addCard(s, L.XL + colW + 0.12, L.Y0, colW, 2.00,
    '보고서 조회 절차',
    '1. 보고서 (8) 클릭\n2. 기간 · 계약 · 거래상대방 필터 선택\n3. 조회 버튼 → 결과 확인\n4. PDF 내보내기 또는 CSV 내보내기'
  );

  addCard(s, L.XL, L.Y0 + 2.08, colW, 1.88,
    '환율 관리 — /exchange-rates',
    '다통화 환율 이력 등록 및 관리\n환율 미등록 시 해당 통화 거래 저장 차단\n→ 환율 등록 후 거래 재입력 필요\n통화 추가: 관리자 마스터 등록으로 확장'
  );
  addCard(s, L.XL + colW + 0.12, L.Y0 + 2.08, colW, 1.88,
    '대사 관리 — /reconciliation',
    '브로커 장부 vs 거래상대방 장부 대사\n차이 항목 식별 및 조정 처리\n정기 대사로 데이터 정합성 확보'
  );

  addCard(s, L.XL, L.Y0 + 4.04, L.W, L.YB - L.Y0 - 4.04,
    '마감 후 수정 차단 규칙',
    'SOA 승인·발행 후 연결 거래 수정 차단 — 취소(Cancelled) 후 새 SOA 재발행 필요'
  );
}

// ── S12 핵심 비즈니스 규칙 ───────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.bg };
  addHeader(s, '부록', '핵심 비즈니스 규칙', '시스템이 자동 검증하는 10가지 규칙 — 오류 메시지 발생 시 참조');

  const rules = [
    { t: '특약 한도', b: '위험기간 ⊂ 계약기간\n초과 시 검증 오류' },
    { t: '통화 일치', b: '명세 통화 =\n계약 정산통화' },
    { t: '출재비율', b: '0 < 비율 ≤ 100\n1 초과 입력 → ÷100 자동' },
    { t: '출재보험료', b: 'ceded = original × cession_pct\n(±1원 허용)' },
    { t: '재보험금', b: 'recoverable = (paid + os_reserve)\n× cession_pct' },
    { t: 'Cash Loss', b: '손해액 > threshold\n→ Cash Loss 체크 권고' },
    { t: '지분율 합계', b: 'Treaty 수재사 지분율\n합계 = 반드시 100%' },
    { t: '이월잔액 B/F', b: '직전 SOA net_balance\n- 매칭 Settlement 합계' },
    { t: '정산서 취소', b: 'Disputed 해결:\nCancelled → 새 Draft 재발행' },
    { t: '마감 후 수정', b: 'SOA 승인·발행 후\n연결 거래 수정 차단' },
  ];

  const colW = (L.W - 0.12) / 2;
  const rowH = (L.AH - 0.08 * 4) / 5;
  const rowGap = 0.08;

  rules.forEach((r, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cx = L.XL + col * (colW + 0.12);
    const cy = L.Y0 + row * (rowH + rowGap);
    addCard(s, cx, cy, colW, rowH, r.t, r.b, i % 3 === 0 ? C.cardAlt : C.card);
  });
}

// ── S13 마무리 ────────────────────────────────
{
  const s = pres.addSlide();
  s.background = { color: C.bg };

  s.addShape('rect', {
    x: 0, y: 0, w: 0.08, h: S.H,
    fill: { color: C.accent }, line: { color: C.accent, width: 0 }
  });
  s.addText('재보험 정청산 관리 시스템', {
    x: 0.50, y: 0.90, w: 9.10, h: 0.80,
    fontFace: F, fontSize: 36, bold: true,
    color: C.white, align: 'left', valign: 'middle',
    fit: 'shrink', margin: 0
  });
  s.addText('계약 등록부터 회계 마감까지 — 8단계 완전 자동화', {
    x: 0.50, y: 1.78, w: 9.10, h: 0.40,
    fontFace: F, fontSize: 14, bold: false,
    color: C.sub, align: 'left', valign: 'middle', margin: 0
  });
  s.addShape('rect', {
    x: 0.50, y: 2.30, w: 9.10, h: 0.03,
    fill: { color: C.divider }, line: { color: C.divider, width: 0 }
  });

  const summaries = [
    { t: '8단계 워크플로우', b: '계약 → 명세 → SOA 생성\n→ 승인 → 송수금 → 보고' },
    { t: '4가지 역할', b: '브로커 실무자·관리자\n출재사·수재사 뷰어' },
    { t: '자동화 & 검증', b: '집계·B/F·방향 자동계산\n10가지 비즈니스 규칙 검증' },
  ];
  const sW = (L.W - 0.12 * 2) / 3;
  summaries.forEach((sm, i) => {
    addCard(s, L.XL + i * (sW + 0.12), 2.50, sW, 1.60, sm.t, sm.b);
  });

  s.addText('감사합니다', {
    x: 0.50, y: 4.30, w: 9.10, h: 0.55,
    fontFace: F, fontSize: 28, bold: true,
    color: C.white, align: 'left', valign: 'middle', margin: 0
  });
  s.addText('v1.4  |  2026-04-30  |  문의: 브로커 내부 시스템 관리자', {
    x: 0.50, y: 5.05, w: 9.10, h: 0.32,
    fontFace: F, fontSize: 10.5, bold: false,
    color: C.muted, align: 'left', valign: 'middle', margin: 0
  });
}

// ════════════════════════════════════════════
//  파일 저장
// ════════════════════════════════════════════
const outputPath = resolveOutputPath(OUTPUT_DIR, '재보험정청산_설명자료');
await pres.writeFile({ fileName: outputPath });
console.log(`✅ PPT 저장 완료: ${outputPath}`);
