import PptxGenJS from 'pptxgenjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// ─────────────────────────────────────────────
// 안전 영역 상수
// ─────────────────────────────────────────────
const SLIDE = { W: 13.33, H: 7.5 };  // LAYOUT_WIDE (16:9)
const L = {
  HDR: 1.05,
  Y0: 1.12,
  YB: 6.80,
  XL: 0.40,
  XR: 12.93,
};
L.W = L.XR - L.XL;   // 12.53
L.AH = L.YB - L.Y0;  // 5.68

// ─────────────────────────────────────────────
// 색상 & 폰트
// ─────────────────────────────────────────────
const C = {
  hdr: '1E3A5F',   // 헤더 배경
  hdrTxt: 'FFFFFF',
  title: '111827',
  sub: '374151',
  accent: '2563EB',
  cardBg: 'F9FAFB',
  border: 'E5E7EB',
  light: '6B7280',
  green: '059669',
  red: 'DC2626',
  amber: 'D97706',
};
const F = 'Noto Sans KR';

// ─────────────────────────────────────────────
// 유틸
// ─────────────────────────────────────────────
function calcCardH(startY, rows, gap = 0.10, margin = 0.05) {
  const available = (L.YB - margin) - startY;
  const cardH = (available - gap * (rows - 1)) / rows;
  return Math.max(cardH, 0.40);
}

function resolveOutputPath(dir, baseName = 'Presentation') {
  let candidate = path.join(dir, `${baseName}.pptx`);
  if (!fs.existsSync(candidate)) return candidate;
  let n = 2;
  while (true) {
    candidate = path.join(dir, `${baseName}_${n}.pptx`);
    if (!fs.existsSync(candidate)) return candidate;
    n++;
  }
}

// ─────────────────────────────────────────────
// 슬라이드 공통: 헤더 바
// ─────────────────────────────────────────────
function addHeader(s, pptx, num, title) {
  s.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: SLIDE.W, h: L.HDR,
    fill: { color: C.hdr },
    line: { color: C.hdr },
  });
  s.addText(`${num < 10 ? '0' + num : num}`, {
    x: L.XL, y: 0.10, w: 0.55, h: 0.85,
    fontSize: 28, bold: true, color: '5B8DB8', fontFace: F,
    valign: 'middle', align: 'center',
    fit: 'shrink',
  });
  s.addText(title, {
    x: L.XL + 0.65, y: 0.10, w: L.W - 0.65, h: 0.85,
    fontSize: 30, bold: true, color: C.hdrTxt, fontFace: F,
    valign: 'middle', align: 'left',
    fit: 'shrink',
  });
}

// ─────────────────────────────────────────────
// 카드 그리기
// ─────────────────────────────────────────────
function addCard(s, pptx, cx, cy, cw, ch, icon, title, lines, accent = C.hdr) {
  s.addShape(pptx.ShapeType.rect, {
    x: cx, y: cy, w: cw, h: ch,
    fill: { color: C.cardBg },
    line: { color: C.border, width: 0.75 },
  });
  // 상단 accent 바
  s.addShape(pptx.ShapeType.rect, {
    x: cx, y: cy, w: cw, h: 0.06,
    fill: { color: accent },
    line: { color: accent },
  });
  const iconH = 0.45;
  s.addText(`${icon}  ${title}`, {
    x: cx + 0.14, y: cy + 0.12, w: cw - 0.28, h: iconH,
    fontSize: 18, bold: true, color: C.title, fontFace: F,
    valign: 'middle', fit: 'shrink', wrap: true,
  });
  const bodyY = cy + 0.12 + iconH + 0.08;
  const bodyH = ch - 0.12 - iconH - 0.08 - 0.12;
  s.addText(lines, {
    x: cx + 0.14, y: bodyY, w: cw - 0.28, h: Math.max(bodyH, 0.30),
    fontSize: 15, color: C.sub, fontFace: F,
    valign: 'top', wrap: true, fit: 'shrink',
    lineSpacingMultiple: 1.25,
  });
}

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────
const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE';
pptx.title = '재보험 정청산 관리 시스템';
pptx.author = '바이브코딩랩';

// ══════════════════════════════════════════════
// 슬라이드 1: 표지
// ══════════════════════════════════════════════
{
  const s = pptx.addSlide();
  // 배경 분할 (위: 진한 남색, 아래: 흰색)
  s.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: SLIDE.W, h: 4.2,
    fill: { color: C.hdr }, line: { color: C.hdr },
  });
  s.addShape(pptx.ShapeType.rect, {
    x: 0, y: 4.2, w: SLIDE.W, h: 3.3,
    fill: { color: 'FFFFFF' }, line: { color: 'FFFFFF' },
  });
  // 로고 영역 장식선
  s.addShape(pptx.ShapeType.rect, {
    x: L.XL, y: 0.30, w: 0.06, h: 3.30,
    fill: { color: '2563EB' }, line: { color: '2563EB' },
  });
  s.addText('재보험 정청산 관리 시스템', {
    x: L.XL + 0.25, y: 0.60, w: L.W - 0.25, h: 1.40,
    fontSize: 48, bold: true, color: C.hdrTxt, fontFace: F,
    valign: 'middle', align: 'left', fit: 'shrink', wrap: true,
  });
  s.addText('Reinsurance Final Settlement Management System', {
    x: L.XL + 0.25, y: 2.10, w: L.W - 0.25, h: 0.50,
    fontSize: 22, color: '5B8DB8', fontFace: F,
    valign: 'middle', align: 'left', fit: 'shrink',
  });
  s.addText('v1.3  |  2026.04', {
    x: L.XL + 0.25, y: 2.70, w: 4.00, h: 0.40,
    fontSize: 16, color: '5B8DB8', fontFace: F,
    valign: 'middle', align: 'left', fit: 'shrink',
  });
  // 아래 정보 카드들
  const tags = ['Next.js 15', 'Supabase', 'TailwindCSS', 'TypeScript'];
  const tagW = (L.W - 0.18 * 3) / 4;
  tags.forEach((tag, i) => {
    s.addShape(pptx.ShapeType.rect, {
      x: L.XL + i * (tagW + 0.18), y: 4.50, w: tagW, h: 0.55,
      fill: { color: 'EFF6FF' }, line: { color: 'BFDBFE', width: 0.75 },
    });
    s.addText(tag, {
      x: L.XL + i * (tagW + 0.18), y: 4.50, w: tagW, h: 0.55,
      fontSize: 17, bold: true, color: C.accent, fontFace: F,
      valign: 'middle', align: 'center', fit: 'shrink',
    });
  });
  s.addText('보험중개사 전용 · 싱글 테넌트 · 다통화 지원', {
    x: L.XL + 0.25, y: 5.30, w: L.W - 0.25, h: 0.40,
    fontSize: 17, color: C.light, fontFace: F,
    valign: 'middle', align: 'left', fit: 'shrink',
  });
  s.addText('바이브코딩랩', {
    x: L.XL + 0.25, y: 6.60, w: L.W - 0.25, h: 0.40,
    fontSize: 15, color: C.light, fontFace: F,
    valign: 'middle', align: 'right', fit: 'shrink',
  });
}

// ══════════════════════════════════════════════
// 슬라이드 2: 목차
// ══════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addHeader(s, pptx, 0, '목차  Contents');

  const items = [
    { num: '01', title: '프로젝트 개요', sub: '목적 · 대상 사용자 · 핵심 기능 요약' },
    { num: '02', title: '업무 흐름', sub: '재보험 정청산 프로세스 · 배분 로직' },
    { num: '03', title: '주요 기능 ①', sub: '계약 마스터 · 거래 입력 · 자동 배분' },
    { num: '04', title: '주요 기능 ②', sub: 'Account Current · 승인 워크플로우' },
    { num: '05', title: '주요 기능 ③', sub: '대사 · 미청산 대시보드 · Aging 분석' },
    { num: '06', title: '주요 기능 ④', sub: '결제 등록 · 환율 관리 · 보고서' },
    { num: '07', title: '외부 공유 & 보안', sub: '직접 로그인 · 토큰 URL · RLS' },
    { num: '08', title: '기술 스택', sub: 'Next.js 15 · Supabase · 주요 라이브러리' },
    { num: '09', title: '시스템 아키텍처', sub: 'DB 구조 · API · 인증 흐름' },
  ];

  const ROW_GAP = 0.08;
  const cardStartY = L.Y0 + 0.05;
  const cardH = calcCardH(cardStartY, items.length, ROW_GAP, 0.05);

  items.forEach((item, i) => {
    const cy = cardStartY + i * (cardH + ROW_GAP);
    s.addShape(pptx.ShapeType.rect, {
      x: L.XL, y: cy, w: L.W, h: cardH,
      fill: { color: i % 2 === 0 ? 'F8FAFF' : 'FFFFFF' },
      line: { color: C.border, width: 0.5 },
    });
    s.addShape(pptx.ShapeType.rect, {
      x: L.XL, y: cy, w: 0.70, h: cardH,
      fill: { color: C.hdr }, line: { color: C.hdr },
    });
    s.addText(item.num, {
      x: L.XL, y: cy, w: 0.70, h: cardH,
      fontSize: 16, bold: true, color: C.hdrTxt, fontFace: F,
      valign: 'middle', align: 'center', fit: 'shrink',
    });
    s.addText(item.title, {
      x: L.XL + 0.82, y: cy, w: 3.20, h: cardH,
      fontSize: 16, bold: true, color: C.title, fontFace: F,
      valign: 'middle', fit: 'shrink',
    });
    s.addText(item.sub, {
      x: L.XL + 4.20, y: cy, w: 5.30, h: cardH,
      fontSize: 14, color: C.sub, fontFace: F,
      valign: 'middle', fit: 'shrink',
    });
  });
}

// ══════════════════════════════════════════════
// 슬라이드 3: 프로젝트 개요
// ══════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addHeader(s, pptx, 1, '프로젝트 개요');

  const cards = [
    {
      icon: '🎯', title: '시스템 목적',
      lines: '• 보험중개사 정청산 업무 디지털화\n• 보험료·보험금 흐름 정확 추적\n• 미청산 잔액 실시간 현황 파악\n• 정산서 생성 및 승인 워크플로우 자동화',
    },
    {
      icon: '👥', title: '대상 사용자',
      lines: '• 브로커 실무자 — 거래 입력·정산서 작성\n• 브로커 관리자 — 최종 승인·경영 보고\n• 출재사/수재사 뷰어 — 조회 + Acknowledge\n• 시스템 관리자 — 마스터 데이터·계정 관리',
    },
    {
      icon: '💡', title: '핵심 가치',
      lines: '• 다통화(USD/EUR/GBP/JPY/KRW) 실시간 환산\n• Treaty 자동 배분 + 수동 입력 병행\n• 감사 추적 및 정산서 잠금 무결성\n• 외부 공유: 계정 로그인 + 토큰 URL',
    },
    {
      icon: '🔒', title: '제약 & 보안',
      lines: '• Supabase RLS 행 단위 데이터 격리\n• 정산서 승인 후 거래 수정 차단 (is_locked)\n• 토큰 URL 만료 시간·접근 로그 필수\n• 싱글 테넌트 — 단일 브로커 전용',
    },
  ];

  const COL_GAP = 0.18;
  const ROW_GAP = 0.12;
  const cardStartY = L.Y0 + 0.05;
  const cardH = calcCardH(cardStartY, 2, ROW_GAP, 0.05);
  const colW = (L.W - COL_GAP) / 2;

  cards.forEach((card, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cx = L.XL + col * (colW + COL_GAP);
    const cy = cardStartY + row * (cardH + ROW_GAP);
    addCard(s, pptx, cx, cy, colW, cardH, card.icon, card.title, card.lines, C.accent);
  });
}

// ══════════════════════════════════════════════
// 슬라이드 4: 업무 흐름
// ══════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addHeader(s, pptx, 2, '재보험 정청산 업무 흐름');

  const steps = [
    { icon: '1️⃣', label: '거래 입력', sub: '보험료·보험금·수수료 항목별 입력', color: '2563EB' },
    { icon: '2️⃣', label: '자동 배분', sub: 'Treaty 지분율 기준 수재사별 자동 배분', color: '059669' },
    { icon: '3️⃣', label: 'AC 발행', sub: '분기·반기·연간·수시 정산서 생성', color: 'D97706' },
    { icon: '4️⃣', label: '승인 워크플로우', sub: '실무자 제출 → 관리자 승인 → 잠금', color: '7C3AED' },
    { icon: '5️⃣', label: '외부 공유', sub: '직접 로그인 또는 토큰 URL로 전달', color: '0891B2' },
    { icon: '6️⃣', label: 'Acknowledge', sub: '출재사·수재사 정산서 확인 및 승인', color: 'DC2626' },
    { icon: '7️⃣', label: '결제 매칭', sub: '실제 송금·수금 1:1/1:N 매칭 처리', color: '1E3A5F' },
  ];

  const cardStartY = L.Y0 + 0.05;
  const ROW_GAP = 0.08;
  const cardH = calcCardH(cardStartY, steps.length, ROW_GAP, 0.05);

  steps.forEach((step, i) => {
    const cy = cardStartY + i * (cardH + ROW_GAP);
    s.addShape(pptx.ShapeType.rect, {
      x: L.XL, y: cy, w: L.W, h: cardH,
      fill: { color: 'FAFAFA' }, line: { color: C.border, width: 0.75 },
    });
    s.addShape(pptx.ShapeType.rect, {
      x: L.XL, y: cy, w: 0.06, h: cardH,
      fill: { color: step.color }, line: { color: step.color },
    });
    s.addText(step.icon, {
      x: L.XL + 0.14, y: cy, w: 0.55, h: cardH,
      fontSize: 22, valign: 'middle', align: 'center',
      fontFace: 'Segoe UI Emoji', fit: 'shrink',
    });
    s.addText(step.label, {
      x: L.XL + 0.80, y: cy, w: 2.80, h: cardH,
      fontSize: 17, bold: true, color: C.title, fontFace: F,
      valign: 'middle', fit: 'shrink',
    });
    s.addText(step.sub, {
      x: L.XL + 3.80, y: cy, w: 5.60, h: cardH,
      fontSize: 15, color: C.sub, fontFace: F,
      valign: 'middle', fit: 'shrink',
    });
    // 화살표 연결선 (마지막 제외)
    if (i < steps.length - 1) {
      s.addText('▾', {
        x: L.XL + 0.55, y: cy + cardH, w: 0.30, h: ROW_GAP,
        fontSize: 10, color: C.border, fontFace: F,
        valign: 'middle', align: 'center',
      });
    }
  });
}

// ══════════════════════════════════════════════
// 슬라이드 5: 주요 기능 ① — 계약 마스터 · 거래 입력
// ══════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addHeader(s, pptx, 3, '주요 기능 ①  계약 마스터 & 거래 입력');

  const cards = [
    {
      icon: '📋', title: '계약 마스터 관리',
      lines: '• Treaty(비례/비비례) · Facultative 등록\n• 계약 유효기간 및 지분율(Signed Line) 관리\n• Endorsement 변경 이력 추적\n• 수재사별 배분 비율 설정',
      accent: C.hdr,
    },
    {
      icon: '💰', title: 'Treaty 자동 배분',
      lines: '• 총액 입력 → 수재사별 자동 분배\n• 거래일 기준 유효 Signed Line 조회\n• Σ = 100% 저장 전 자동 검증\n• 소수점 오차 1순위 수재사에 흡수',
      accent: C.green,
    },
    {
      icon: '✍️', title: '거래 입력 (수동)',
      lines: '• 보험료 · 보험금 · 수수료 · 환급금\n• Non-Proportional(XL): 수동 전용\n• Facultative: 수재사별 직접 입력\n• 환율 미등록 시 저장 차단',
      accent: C.amber,
    },
    {
      icon: '💱', title: '다통화 지원',
      lines: '• USD · EUR · GBP · JPY · KRW 기본 지원\n• 관리자 Custom 통화 추가 가능\n• amount_krw 환산값 병행 저장\n• 수동 환율 이력 관리',
      accent: C.accent,
    },
  ];

  const COL_GAP = 0.18;
  const ROW_GAP = 0.12;
  const cardStartY = L.Y0 + 0.05;
  const cardH = calcCardH(cardStartY, 2, ROW_GAP, 0.05);
  const colW = (L.W - COL_GAP) / 2;

  cards.forEach((card, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cx = L.XL + col * (colW + COL_GAP);
    const cy = cardStartY + row * (cardH + ROW_GAP);
    addCard(s, pptx, cx, cy, colW, cardH, card.icon, card.title, card.lines, card.accent);
  });
}

// ══════════════════════════════════════════════
// 슬라이드 6: 주요 기능 ② — Account Current
// ══════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addHeader(s, pptx, 4, '주요 기능 ②  Account Current & 승인 워크플로우');

  // 상단 2개 카드
  const COL_GAP = 0.18;
  const colW = (L.W - COL_GAP) / 2;
  const cardStartY = L.Y0 + 0.05;
  const topH = 2.45;

  addCard(s, pptx, L.XL, cardStartY, colW, topH, '📄', 'Account Current 생성',
    '• 분기·반기·연간·수시 4가지 주기\n• 수재사별 별도 정산서 발행\n• 확정·청구 거래 자동 집계\n• B/F(이월 잔액) 자동 산출',
    C.hdr
  );
  addCard(s, pptx, L.XL + colW + COL_GAP, cardStartY, colW, topH, '🔄', 'B/F 이월 공식',
    '• 직전 AC net_balance - 매칭 settlement 합계\n• 취소 AC 연결 거래 자동 잠금 해제\n• 중복 발행 경고 표시 (차단 없음)\n• 스냅샷 저장으로 감사 추적 지원',
    C.accent
  );

  // 승인 단계 흐름
  const flowY = cardStartY + topH + 0.18;
  s.addText('승인 워크플로우', {
    x: L.XL, y: flowY, w: L.W, h: 0.38,
    fontSize: 18, bold: true, color: C.title, fontFace: F,
    valign: 'middle', fit: 'shrink',
  });

  const stages = [
    { label: 'Draft', sub: '초안 작성', color: '94A3B8' },
    { label: 'Submitted', sub: '승인 요청', color: C.amber },
    { label: 'Approved', sub: '관리자 승인', color: C.green },
    { label: 'Acknowledged', sub: 'AC Locked', color: C.hdr },
    { label: 'Disputed', sub: '이의 제기', color: C.red },
    { label: 'Cancelled', sub: '취소', color: C.light },
  ];

  const stageStartY = flowY + 0.44;
  const stageH = calcCardH(stageStartY, 1, 0, 0.05);
  const stageW = (L.W - 0.12 * (stages.length - 1)) / stages.length;

  stages.forEach((st, i) => {
    const sx = L.XL + i * (stageW + 0.12);
    s.addShape(pptx.ShapeType.rect, {
      x: sx, y: stageStartY, w: stageW, h: stageH,
      fill: { color: 'F8FAFF' }, line: { color: st.color, width: 1.2 },
    });
    s.addShape(pptx.ShapeType.rect, {
      x: sx, y: stageStartY, w: stageW, h: 0.06,
      fill: { color: st.color }, line: { color: st.color },
    });
    s.addText(st.label, {
      x: sx + 0.06, y: stageStartY + 0.12, w: stageW - 0.12, h: stageH * 0.45,
      fontSize: 14, bold: true, color: C.title, fontFace: F,
      valign: 'middle', align: 'center', fit: 'shrink',
    });
    s.addText(st.sub, {
      x: sx + 0.06, y: stageStartY + stageH * 0.55, w: stageW - 0.12, h: stageH * 0.38,
      fontSize: 12, color: C.sub, fontFace: F,
      valign: 'middle', align: 'center', fit: 'shrink',
    });
    if (i < stages.length - 1) {
      s.addText('→', {
        x: sx + stageW, y: stageStartY, w: 0.12, h: stageH,
        fontSize: 16, color: C.light, fontFace: F,
        valign: 'middle', align: 'center',
      });
    }
  });
}

// ══════════════════════════════════════════════
// 슬라이드 7: 주요 기능 ③ — 대사 · 미청산 대시보드
// ══════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addHeader(s, pptx, 5, '주요 기능 ③  대사 & 미청산 대시보드');

  const cards = [
    {
      icon: '🔍', title: '대사 (Reconciliation)',
      lines: '• 브로커 장부 ↔ 출재사/수재사 장부 비교\n• 금액·날짜 불일치 항목 자동 감지\n• 드래그로 거래 매칭 (react-dnd)\n• 대사 완료 후 Reconciled 상태 전환',
      accent: C.accent,
    },
    {
      icon: '📊', title: 'Outstanding 대시보드',
      lines: '• 상대방별·계약별·통화별 잔액 현황\n• KPI 카드: 총 미수령·미지급·순잔액\n• 환율 자동 적용 KRW 환산 집계\n• 3초 이내 로딩 (인덱스 최적화)',
      accent: C.hdr,
    },
    {
      icon: '📈', title: 'Aging 분석',
      lines: '• 30일·60일·90일·90일 초과 구간 분류\n• 상대방별 연체 현황 시각화 (Recharts)\n• 통화별 필터 및 Excel 내보내기\n• 경영 보고용 PDF 출력 지원',
      accent: C.amber,
    },
    {
      icon: '🔒', title: 'Parent TX 처리',
      lines: '• is_allocation_parent=true → Outstanding 제외\n• 수재사별 자식 TX만 Outstanding 산출\n• 중복 집계 방지 로직 내장\n• 소프트 딜리트 + 감사 로그 보존',
      accent: C.green,
    },
  ];

  const COL_GAP = 0.18;
  const ROW_GAP = 0.12;
  const cardStartY = L.Y0 + 0.05;
  const cardH = calcCardH(cardStartY, 2, ROW_GAP, 0.05);
  const colW = (L.W - COL_GAP) / 2;

  cards.forEach((card, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cx = L.XL + col * (colW + COL_GAP);
    const cy = cardStartY + row * (cardH + ROW_GAP);
    addCard(s, pptx, cx, cy, colW, cardH, card.icon, card.title, card.lines, card.accent);
  });
}

// ══════════════════════════════════════════════
// 슬라이드 8: 주요 기능 ④ — 결제·환율·보고서
// ══════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addHeader(s, pptx, 6, '주요 기능 ④  결제 · 환율 · 보고서');

  const cards = [
    {
      icon: '💳', title: '결제(Settlement) 등록',
      lines: '• 실제 송금·수금 내역 입력\n• 1:1 완전 매칭 / 1:N 부분 매칭\n• Direction 자동 결정 (to_reinsurer/to_cedant)\n• 결제 완료 후 Outstanding 자동 차감',
      accent: C.hdr,
    },
    {
      icon: '💱', title: '환율 관리',
      lines: '• 통화별 수동 환율 이력 등록\n• 환율 미등록 시 거래 저장 차단\n• 등록 후 재시도 안내 UI\n• 통화 추가: rs_currencies 마스터 관리',
      accent: C.accent,
    },
    {
      icon: '📑', title: 'PDF 보고서',
      lines: '• 정산서(AC) PDF 출력 (jsPDF)\n• 로고·헤더·서명란 포함 공식 양식\n• 브라우저 직접 다운로드\n• 첨부 이미지·스탬프 지원',
      accent: C.amber,
    },
    {
      icon: '📊', title: 'Excel 내보내기',
      lines: '• 거래 목록·Outstanding·Aging xlsx 출력\n• XLSX 라이브러리 활용\n• 통화별 필터 적용 후 내보내기\n• 경영 보고 및 감사 제출용',
      accent: C.green,
    },
  ];

  const COL_GAP = 0.18;
  const ROW_GAP = 0.12;
  const cardStartY = L.Y0 + 0.05;
  const cardH = calcCardH(cardStartY, 2, ROW_GAP, 0.05);
  const colW = (L.W - COL_GAP) / 2;

  cards.forEach((card, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cx = L.XL + col * (colW + COL_GAP);
    const cy = cardStartY + row * (cardH + ROW_GAP);
    addCard(s, pptx, cx, cy, colW, cardH, card.icon, card.title, card.lines, card.accent);
  });
}

// ══════════════════════════════════════════════
// 슬라이드 9: 외부 공유 & 보안
// ══════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addHeader(s, pptx, 7, '외부 공유 & 보안');

  // 두 컬럼 레이아웃
  const COL_GAP = 0.25;
  const colW = (L.W - COL_GAP) / 2;
  const cardStartY = L.Y0 + 0.05;

  // 왼쪽: 직접 로그인
  const leftH = 2.55;
  addCard(s, pptx, L.XL, cardStartY, colW, leftH, '🔑', '방식 A: 직접 로그인 (Portal)',
    '• 관리자가 Supabase Auth로 계정 생성\n• cedant_viewer / reinsurer_viewer 역할\n• /external/dashboard — 세션 기반 상시 접근\n• RLS: company_id 기준 자사 데이터만 노출',
    C.accent
  );

  // 오른쪽: 토큰 URL
  addCard(s, pptx, L.XL + colW + COL_GAP, cardStartY, colW, leftH, '🔗', '방식 B: 만료형 토큰 URL',
    '• 특정 정산서 선택 → "공유 링크 생성"\n• /share/{token} — 로그인 없이 조회 가능\n• 기본 30일 만료 (관리자 설정 변경 가능)\n• 접근 로그: rs_share_token_logs',
    C.hdr
  );

  // 비교 테이블
  const tblY = cardStartY + leftH + 0.18;
  s.addText('접근 방식 비교', {
    x: L.XL, y: tblY, w: L.W, h: 0.36,
    fontSize: 17, bold: true, color: C.title, fontFace: F,
    valign: 'middle', fit: 'shrink',
  });

  const tblStartY = tblY + 0.40;
  const rows = [
    ['비교 항목', '직접 로그인', '토큰 URL'],
    ['로그인 필요', '✅', '❌'],
    ['접근 범위', '자사 전체 데이터', '지정 정산서 1건'],
    ['유효 기간', '상시 (계정 비활성화 시 차단)', '30일 (설정 변경 가능)'],
    ['주 사용 사례', '상시 거래 파트너', '1회성 정산서 공유'],
  ];
  const rowH = calcCardH(tblStartY, rows.length, 0.04, 0.05);
  const colWidths = [2.80, 3.30, 3.22];

  rows.forEach((row, ri) => {
    row.forEach((cell, ci) => {
      const cx = L.XL + colWidths.slice(0, ci).reduce((a, b) => a + b, 0) + ci * 0.06;
      const cy = tblStartY + ri * (rowH + 0.04);
      s.addShape(pptx.ShapeType.rect, {
        x: cx, y: cy, w: colWidths[ci], h: rowH,
        fill: { color: ri === 0 ? C.hdr : (ri % 2 === 0 ? 'F8FAFF' : 'FFFFFF') },
        line: { color: C.border, width: 0.5 },
      });
      s.addText(cell, {
        x: cx + 0.08, y: cy, w: colWidths[ci] - 0.16, h: rowH,
        fontSize: ri === 0 ? 14 : 13,
        bold: ri === 0,
        color: ri === 0 ? C.hdrTxt : C.sub,
        fontFace: F, valign: 'middle', align: ci === 0 ? 'left' : 'center',
        fit: 'shrink', wrap: true,
      });
    });
  });
}

// ══════════════════════════════════════════════
// 슬라이드 10: 기술 스택
// ══════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addHeader(s, pptx, 8, '기술 스택');

  const stacks = [
    { icon: '⚛️', name: 'Next.js 15', role: '프론트엔드 · 서버', desc: 'App Router · Route Handlers · SSR/CSR 혼합', color: '111827' },
    { icon: '🗄️', name: 'Supabase', role: 'DB · 인증 · RLS', desc: 'PostgreSQL · Auth · Row Level Security · Realtime', color: '10B981' },
    { icon: '🎨', name: 'TailwindCSS + shadcn/ui', role: 'UI 프레임워크', desc: 'TweakCN 커스터마이징 · 다크테마 · next-themes', color: '38BDF8' },
    { icon: '📘', name: 'TypeScript', role: '타입 안전성', desc: 'strict mode · 전체 코드베이스 적용', color: '3178C6' },
    { icon: '📊', name: 'Recharts + jsPDF', role: '차트 · PDF', desc: 'Aging 분석 차트 · 정산서 PDF 출력', color: 'F59E0B' },
    { icon: '🔄', name: 'react-dnd + XLSX', role: '인터랙션 · Excel', desc: '드래그 대사 매칭 · Excel 내보내기', color: 'EC4899' },
  ];

  const COL_GAP = 0.18;
  const ROW_GAP = 0.12;
  const cols = 3;
  const colW = (L.W - COL_GAP * (cols - 1)) / cols;
  const cardStartY = L.Y0 + 0.05;
  const rows = Math.ceil(stacks.length / cols);
  const cardH = calcCardH(cardStartY, rows, ROW_GAP, 0.05);

  stacks.forEach((st, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = L.XL + col * (colW + COL_GAP);
    const cy = cardStartY + row * (cardH + ROW_GAP);

    s.addShape(pptx.ShapeType.rect, {
      x: cx, y: cy, w: colW, h: cardH,
      fill: { color: C.cardBg }, line: { color: C.border, width: 0.75 },
    });
    s.addShape(pptx.ShapeType.rect, {
      x: cx, y: cy, w: colW, h: 0.06,
      fill: { color: st.color }, line: { color: st.color },
    });
    s.addText(`${st.icon}`, {
      x: cx + 0.12, y: cy + 0.12, w: 0.45, h: cardH - 0.24,
      fontSize: 28, fontFace: 'Segoe UI Emoji',
      valign: 'top', align: 'center',
    });
    s.addText(st.name, {
      x: cx + 0.65, y: cy + 0.12, w: colW - 0.77, h: 0.42,
      fontSize: 16, bold: true, color: C.title, fontFace: F,
      valign: 'top', fit: 'shrink',
    });
    s.addText(st.role, {
      x: cx + 0.65, y: cy + 0.56, w: colW - 0.77, h: 0.35,
      fontSize: 13, color: C.accent, fontFace: F,
      valign: 'top', fit: 'shrink', bold: true,
    });
    s.addText(st.desc, {
      x: cx + 0.65, y: cy + 0.92, w: colW - 0.77, h: cardH - 0.92 - 0.12,
      fontSize: 13, color: C.sub, fontFace: F,
      valign: 'top', wrap: true, fit: 'shrink',
    });
  });
}

// ══════════════════════════════════════════════
// 슬라이드 11: 시스템 아키텍처
// ══════════════════════════════════════════════
{
  const s = pptx.addSlide();
  addHeader(s, pptx, 9, '시스템 아키텍처');

  const COL_GAP = 0.18;
  const colW = (L.W - COL_GAP * 2) / 3;
  const cardStartY = L.Y0 + 0.05;
  const ROW_GAP = 0.12;
  const topH = calcCardH(cardStartY, 2, ROW_GAP, 0.05);

  // Row 1: 3 cards
  const topCards = [
    {
      icon: '🌐', title: '프론트엔드 레이어',
      lines: '• (broker)/ — 브로커 전용\n• (external)/ — 외부 뷰어\n• share/[token]/ — 토큰 공유\n• (auth)/login — 로그인',
      accent: C.accent,
    },
    {
      icon: '⚙️', title: 'API 레이어',
      lines: '• app/api/ Route Handlers\n• Edge Function 미사용\n• lib/supabase/queries/ 분리\n• lib/utils/ 비즈니스 로직',
      accent: C.hdr,
    },
    {
      icon: '🗄️', title: 'DB 레이어 (Supabase)',
      lines: '• rs_ 접두어 전체 테이블\n• RLS 행 단위 보안\n• DB 트리거 일련번호 자동 채번\n• PostgreSQL Sequence 활용',
      accent: C.green,
    },
  ];

  topCards.forEach((card, i) => {
    const cx = L.XL + i * (colW + COL_GAP);
    addCard(s, pptx, cx, cardStartY, colW, topH, card.icon, card.title, card.lines, card.accent);
  });

  // Row 2: 3 cards
  const row2Y = cardStartY + topH + ROW_GAP;
  const row2Cards = [
    {
      icon: '🔐', title: '인증 & 권한',
      lines: '• Supabase Auth (이메일/패스워드)\n• 미들웨어 세션 검사\n• RLS: role 기반 정책\n• 관리자 직접 계정 생성',
      accent: C.amber,
    },
    {
      icon: '📦', title: '주요 DB 테이블',
      lines: '• rs_contracts, rs_transactions\n• rs_account_currents, rs_settlements\n• rs_exchange_rates, rs_currencies\n• rs_share_tokens, rs_audit_logs',
      accent: '7C3AED',
    },
    {
      icon: '🚀', title: '배포 & 인프라',
      lines: '• Next.js 15 빌드 (npm run build)\n• 싱글 테넌트 구조\n• .env.local 환경변수 관리\n• SUPABASE_SERVICE_ROLE_KEY 서버 전용',
      accent: '0891B2',
    },
  ];

  const row2H = calcCardH(row2Y, 1, 0, 0.05);
  row2Cards.forEach((card, i) => {
    const cx = L.XL + i * (colW + COL_GAP);
    addCard(s, pptx, cx, row2Y, colW, row2H, card.icon, card.title, card.lines, card.accent);
  });
}

// ══════════════════════════════════════════════
// 슬라이드 12: 마무리
// ══════════════════════════════════════════════
{
  const s = pptx.addSlide();
  s.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: SLIDE.W, h: SLIDE.H,
    fill: { color: C.hdr }, line: { color: C.hdr },
  });
  s.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 0.12, h: SLIDE.H,
    fill: { color: C.accent }, line: { color: C.accent },
  });
  s.addText('재보험 정청산 관리 시스템', {
    x: L.XL, y: 1.80, w: L.W, h: 1.20,
    fontSize: 44, bold: true, color: 'FFFFFF', fontFace: F,
    valign: 'middle', align: 'left', fit: 'shrink', wrap: true,
  });
  s.addText('보험중개사 정청산 업무의 완전한 디지털화를 실현합니다.', {
    x: L.XL, y: 3.10, w: L.W, h: 0.55,
    fontSize: 22, color: '93C5FD', fontFace: F,
    valign: 'middle', align: 'left', fit: 'shrink', wrap: true,
  });

  const summary = [
    '🔷  계약 마스터 → 거래 입력 → AC 발행 → 승인 → 결제 매칭',
    '🔷  다통화(5종+확장) · RLS 보안 · 감사 추적 · PDF/Excel 출력',
    '🔷  외부 파트너 직접 로그인 + 만료형 토큰 URL 이중 공유',
  ];
  summary.forEach((line, i) => {
    s.addText(line, {
      x: L.XL, y: 4.10 + i * 0.52, w: L.W, h: 0.46,
      fontSize: 18, color: 'CBD5E1', fontFace: F,
      valign: 'middle', align: 'left', fit: 'shrink',
    });
  });

  s.addShape(pptx.ShapeType.rect, {
    x: L.XL, y: 6.50, w: L.W, h: 0.04,
    fill: { color: '1E4A7A' }, line: { color: '1E4A7A' },
  });
  s.addText('바이브코딩랩  |  vibecodinglab.ai.kr', {
    x: L.XL, y: 6.60, w: L.W, h: 0.40,
    fontSize: 14, color: '64748B', fontFace: F,
    valign: 'middle', align: 'right', fit: 'shrink',
  });
}

// ══════════════════════════════════════════════
// 저장
// ══════════════════════════════════════════════
const outputDir = ROOT;
const outputPath = resolveOutputPath(outputDir, '재보험정청산시스템_소개');

await pptx.writeFile({ fileName: outputPath });
console.log(`✅ PPT 저장됨: ${outputPath}`);
