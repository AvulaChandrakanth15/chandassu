const $ = (id) => document.getElementById(id);

/* =========================
   DOM
   ========================= */
const poemDisplay = $("poemDisplay");
const poemText = $("poemText");
const loadBtn = $("loadBtn");
const startBtn = $("startBtn");
const resetBtn = $("resetBtn");

const inputArea = $("inputArea");
const playArea = $("playArea");
const tilesWrap = $("tilesWrap");

const lineNowEl = $("lineNow");
const ansNowEl = $("ansNow");
const totNowEl = $("totNow");
const detNowEl = $("detNow");
const stagePill = $("stagePill");
const progressText = $("progressText");

const origLineEl = $("origLineEl");
const akCountEl = $("akCountEl");
const lineCheckText = $("lineCheckText");

const prevLineBtn = $("prevLineBtn");
const nextLineBtn = $("nextLineBtn");

const autoFillBtn = $("autoFillBtn");

const tilesEl = $("tiles");
const tilesHost = $("tilesHost");
const resultBox = $("resultBox");

const hintText = $("hintText");
const nextHintBtn = $("nextHintBtn");

const timerNowEl = $("timerNow");

const guideRuleText = $("guideRuleText");
const guideAkshara = $("guideAkshara");
const guideSuggested = $("guideSuggested");
const guideShort = $("guideShort");

/* =========================
   Same work container helpers
   ========================= */
function getStageMount() {
  return tilesWrap || resultBox || tilesHost;
}

function removeStagePanels() {
  const oldQuiz = $("stageQuizPanel");
  const oldReport = $("stageReportPanel");
  if (oldQuiz) oldQuiz.remove();
  if (oldReport) oldReport.remove();
}

function showTilesAreaOnly() {
  removeStagePanels();

  if (tilesWrap) {
    tilesWrap.classList.remove("hidden");
    tilesWrap.style.display = "";
    tilesWrap.style.width = "100%";
  }

  if (tilesEl) {
    tilesEl.classList.remove("hidden");
    tilesEl.style.display = "";
  }

  if (resultBox) {
    resultBox.classList.add("hidden");
    resultBox.innerHTML = "";
  }
}

function hideTilesGridForStage() {
  if (tilesWrap) {
    tilesWrap.classList.remove("hidden");
    tilesWrap.style.display = "";
    tilesWrap.style.width = "100%";
  }

  if (tilesEl) {
    tilesEl.classList.add("hidden");
    tilesEl.style.display = "none";
  }

  if (resultBox) {
    resultBox.classList.add("hidden");
    resultBox.innerHTML = "";
  }
}

/* =========================
   State
   ========================= */
let game = [];
let currentLineIndex = 0;
let currentGamePayload = null;
let quizReady = false;
let finalSubmitted = false;
let quizState = null;

let timerInterval = null;
let startTime = null;
let endTime = null;
let hintIndex = 0;
let lockedMeterFromFirstGana = "";
let autoQuizOpening = false;

/* =========================
   Strict Chandassu Rules
   U = Guru
   I = Laghu
   ========================= */
const METER_INFO = {
  "ఉత్పలమాల": {
    meter: "ఉత్పలమాల",
    ganas: "భ ర న భ భ ర వ",
    ganasCompact: "భరనభభరవ",
    pattern: "UIIUIUIIIUIIUIIUIUIU",
    patternSpaced: "UII UIU III UII UII UIU IU",
    patternGroups: ["UII", "UIU", "III", "UII", "UII", "UIU", "IU"],
    aksharas: 20,
    yati: 10,
    prasa: "పాటించవలెను",
    prasaYati: "ప్రాస యతి చెల్లదు",
    firstGana: "UII"
  },
  "చంపకమాల": {
    meter: "చంపకమాల",
    ganas: "న జ భ జ జ జ ర",
    ganasCompact: "నజభజజజర",
    pattern: "IIIIUIUIIIUIIUIIUIUIU",
    patternSpaced: "III IUI UII IUI IUI IUI UIU",
    patternGroups: ["III", "IUI", "UII", "IUI", "IUI", "IUI", "UIU"],
    aksharas: 21,
    yati: 11,
    prasa: "పాటించవలెను",
    prasaYati: "ప్రాస యతి చెల్లదు",
    firstGana: "III"
  },
  "శార్ధూలము": {
    meter: "శార్ధూలము",
    ganas: "మ స జ స త త గ",
    ganasCompact: "మసజసతతగ",
    pattern: "UUUIIUIUIIIUUUIUUIU",
    patternSpaced: "UUU IIU IUI IIU UUI UUI U",
    patternGroups: ["UUU", "IIU", "IUI", "IIU", "UUI", "UUI", "U"],
    aksharas: 19,
    yati: 13,
    prasa: "పాటించవలెను",
    prasaYati: "ప్రాస యతి చెల్లదు",
    firstGana: "UUU"
  },
  "మత్తేభము": {
    meter: "మత్తేభము",
    ganas: "స భ ర న మ య వ",
    ganasCompact: "సభరనమయవ",
    pattern: "IIUUIIUIUIIIUUUIUUIU",
    patternSpaced: "IIU UII UIU III UUU IUU IU",
    patternGroups: ["IIU", "UII", "UIU", "III", "UUU", "IUU", "IU"],
    aksharas: 20,
    yati: 14,
    prasa: "పాటించవలెను",
    prasaYati: "ప్రాస యతి చెల్లదు",
    firstGana: "IIU"
  }
};

const METER_ALIASES = {
  "ఉత్పలమాల": "ఉత్పలమాల",
  "చంపకమాల": "చంపకమాల",
  "శార్ధూలము": "శార్ధూలము",
  "శార్దూలము": "శార్ధూలము",
  "శార్దూల విక్రీడితము": "శార్ధూలము",
  "శార్ధూల విక్రీడితము": "శార్ధూలము",
  "మత్తేభము": "మత్తేభము",
  "మత్తేభ విక్రీడితము": "మత్తేభము"
};

const FIRST_GANA_TO_METER = {
  "UII": "ఉత్పలమాల",
  "III": "చంపకమాల",
  "UUU": "శార్ధూలము",
  "IIU": "మత్తేభము"
};

/* =========================
   Basic Telugu Prosody Rules
   ========================= */
const SHORT_SIGNS = ["ి", "ు", "ృ", "ౢ", "ె", "ొ"];
const LONG_SIGNS = ["ా", "ీ", "ూ", "ౄ", "ే", "ై", "ో", "ౌ"];
const SHORT_VOWELS = ["అ", "ఇ", "ఉ", "ఋ", "ఌ", "ఎ", "ఒ"];
const LONG_VOWELS = ["ఆ", "ఈ", "ఊ", "ౠ", "ఏ", "ఐ", "ఓ", "ఔ"];

/* =========================
   Helpers
   ========================= */
function smoothScrollTo(el) {
  if (!el) return;
  requestAnimationFrame(() => {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function normalizeMeterName(name) {
  const raw = String(name || "").trim();
  return METER_ALIASES[raw] || raw;
}

function getStrictMeterInfo(name) {
  const normalized = normalizeMeterName(name);
  return METER_INFO[normalized] || null;
}

function getMeterNameFromPayload(payload) {
  const safePayload = payload || currentGamePayload || null;
  if (!safePayload) return "";

  return normalizeMeterName(
    safePayload.poemstyle ||
    safePayload.Poemstyle ||
    safePayload.answerMeter ||
    safePayload.systemMeter ||
    safePayload?.meterMeta?.meter ||
    ""
  );
}

function getMeterInfoFromPayload(payload) {
  const meterName = getMeterNameFromPayload(payload);
  return getStrictMeterInfo(meterName);
}

function detectMeterFromFirstGanaUI(ui3) {
  return FIRST_GANA_TO_METER[String(ui3 || "").replace(/\s+/g, "")] || "";
}

function getLockedMeter() {
  if (lockedMeterFromFirstGana && METER_INFO[lockedMeterFromFirstGana]) {
    return lockedMeterFromFirstGana;
  }

  const payloadMeter = getMeterNameFromPayload(currentGamePayload);
  if (payloadMeter && METER_INFO[payloadMeter]) {
    return payloadMeter;
  }

  return "";
}

function getExpectedMeter() {
  return getLockedMeter();
}

function getExpectedMeterInfo() {
  const m = getExpectedMeter();
  return getStrictMeterInfo(m);
}

function tryLockMeterFromLineZero() {
  if (!game.length || !game[0]) return "";

  const line0 = game[0];
  const first3 = labelsToUI((line0.userLabels || []).slice(0, 3));

  if (first3.length !== 3 || first3.includes("?")) return "";

  const meter = detectMeterFromFirstGanaUI(first3);
  if (meter && METER_INFO[meter]) {
    lockedMeterFromFirstGana = meter;
    return meter;
  }

  return "";
}

function formatSeconds(sec) {
  const s = Math.max(0, Math.floor(sec || 0));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function startTimer() {
  stopTimer();
  startTime = Date.now();
  endTime = null;
  if (timerNowEl) timerNowEl.textContent = "00:00";

  timerInterval = setInterval(() => {
    if (timerNowEl && startTime) {
      timerNowEl.textContent = formatSeconds((Date.now() - startTime) / 1000);
    }
  }, 250);
}

function stopTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
}

function getElapsedSeconds() {
  if (!startTime) return 0;
  const end = endTime || Date.now();
  return Math.round((end - startTime) / 1000);
}

function escapeHtml(s) {
  return String(s || "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  }[c]));
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function labelsToUI(labels) {
  return (labels || []).map((x) => x === "G" ? "U" : x === "L" ? "I" : "?").join("");
}

function uiToGLArray(ui) {
  return String(ui || "").split("").map((ch) => ch === "U" ? "G" : ch === "I" ? "L" : "");
}

function compactToSpacedPattern(pattern, meterName) {
  const info = getStrictMeterInfo(meterName);
  if (!info) return String(pattern || "");

  const raw = String(pattern || "").replace(/\s+/g, "");
  let idx = 0;
  const parts = [];

  for (const grp of info.patternGroups) {
    parts.push(raw.slice(idx, idx + grp.length));
    idx += grp.length;
  }
  return parts.join(" ");
}

function splitPatternIntoGroups(pattern, meterName) {
  const info = getStrictMeterInfo(meterName);
  if (!info) return [String(pattern || "")];

  const raw = String(pattern || "").replace(/\s+/g, "");
  let idx = 0;
  const out = [];

  for (const grp of info.patternGroups) {
    out.push(raw.slice(idx, idx + grp.length));
    idx += grp.length;
  }
  return out;
}

function safeChar(x) {
  return String(x || "").trim().charAt(0) || "";
}

function safeAksharaAt(arr, index1Based) {
  const idx = Number(index1Based) - 1;
  if (!Array.isArray(arr) || idx < 0 || idx >= arr.length) return "";
  return String(arr[idx] || "");
}

/* =========================
   Rule-based Akshara Logic
   ========================= */
function isLongAkshara(ak) {
  ak = String(ak || "");
  return LONG_SIGNS.some((ch) => ak.includes(ch)) || LONG_VOWELS.some((ch) => ak.includes(ch));
}

function isShortAkshara(ak) {
  ak = String(ak || "");
  return SHORT_SIGNS.some((ch) => ak.includes(ch)) || SHORT_VOWELS.some((ch) => ak.includes(ch));
}

function hasAnusvaraOrVisarga(ak) {
  ak = String(ak || "");
  return ak.includes("ం") || ak.includes("ః");
}

function endsWithPollu(ak) {
  ak = String(ak || "");
  return ak.endsWith("్");
}

function nextStartsConjunct(nextAk) {
  nextAk = String(nextAk || "");
  return nextAk.includes("్");
}

function inferGuruLaghu(ak, nextAk = "") {
  ak = String(ak || "");
  nextAk = String(nextAk || "");

  if (hasAnusvaraOrVisarga(ak)) {
    return {
      label: "G",
      suggested: "Guru",
      short: "ం / ః",
      rule: "ఈ అక్షరంలో ం లేదా ః ఉంది. అందువల్ల ఇది గురువు."
    };
  }

  if (isLongAkshara(ak)) {
    return {
      label: "G",
      suggested: "Guru",
      short: "దీర్ఘం",
      rule: "ఈ అక్షరంలో దీర్ఘ స్వరం లేదా దీర్ఘ మాత్ర ఉంది. అందువల్ల ఇది గురువు."
    };
  }

  if (endsWithPollu(ak)) {
    return {
      label: "G",
      suggested: "Guru",
      short: "పొల్లు",
      rule: "ఈ అక్షరం పొల్లుతో ముగిసింది. అందువల్ల ఇది గురువు."
    };
  }

  if (nextStartsConjunct(nextAk)) {
    return {
      label: "G",
      suggested: "Guru",
      short: "సంయుక్తం ముందు",
      rule: "తర్వాతి అక్షరం సంయుక్తాక్షరంగా ఉంది. కాబట్టి ముందు అక్షరం గురువు కావచ్చు."
    };
  }

  if (isShortAkshara(ak)) {
    return {
      label: "L",
      suggested: "Laghu",
      short: "హ్రస్వం",
      rule: "ఈ అక్షరంలో హ్రస్వ లక్షణం ఉంది. అందువల్ల ఇది లఘువు."
    };
  }

  return {
    label: "L",
    suggested: "Laghu",
    short: "సాధారణం",
    rule: "గురువు లక్షణాలు కనిపించలేదు. కాబట్టి ఇది లఘువు."
  };
}

function getGuideForAkshara(ak, nextAk = "") {
  if (!ak) {
    return {
      label: "",
      suggested: "—",
      short: "—",
      rule: "అక్షరంపై mouse పెట్టండి లేదా click చేయండి. ఆ అక్షరానికి Guru/Laghu rule ఇక్కడ కనిపిస్తుంది."
    };
  }
  return inferGuruLaghu(ak, nextAk);
}

function updateGuide(ak, nextAk) {
  const g = getGuideForAkshara(ak, nextAk);
  if (guideAkshara) guideAkshara.textContent = ak || "—";
  if (guideSuggested) guideSuggested.textContent = g.suggested;
  if (guideShort) guideShort.textContent = g.short;
  if (guideRuleText) guideRuleText.textContent = g.rule;
}

/* =========================
   Hint Helpers
   ========================= */
function getBaseHints() {
  const meterInfo = getExpectedMeterInfo() || getMeterInfoFromPayload();

  const generic = [
    "ముందుగా poem load చేసి Start Game నొక్కండి.",
    "మొదటి మూడు అక్షరాలు చూసి మొదటి గణాన్ని గుర్తించండి.",
    "మొదటి గణం fix అయితే ఛందస్సు fix అవుతుంది.",
    "ఒకసారి metre fix అయితే అన్ని పాదాలు అదే pattern అనుసరిస్తాయి.",
    "దీర్ఘం ఉన్నది సాధారణంగా Guru.",
    "ం లేదా ః ఉన్నది సాధారణంగా Guru.",
    "సంయుక్తాక్షరానికి ముందు ఉన్నది చాలాసార్లు Guru అవుతుంది.",
    "ప్రతి పాదం 2వ అక్షరంతో ప్రాస చూడాలి.",
    "యతి metre లో ఇచ్చిన స్థానంలో చూడాలి."
  ];

  if (!meterInfo) return generic;

  return [
    ...generic,
    `ఈ poem యొక్క correct ఛందస్సు ${meterInfo.meter}.`,
    `గణములు: ${meterInfo.ganasCompact}.`,
    `ప్యాటర్న్: ${meterInfo.patternSpaced}.`,
    `ప్రతి పాదంలో ${meterInfo.aksharas} అక్షరాలు.`,
    `యతి ${meterInfo.yati} వ అక్షరములో.`,
    `ప్రాస 2వ అక్షరములో చూడాలి.`
  ];
}

function setHint(text) {
  if (hintText) hintText.textContent = text || "";
}

function refreshHintCycle(resetToStart = false) {
  const hints = getBaseHints();
  if (!hints.length) return;

  if (resetToStart) hintIndex = 0;
  if (hintIndex >= hints.length) hintIndex = 0;

  setHint(hints[hintIndex]);
}

function showAksharaHint(ak, nextAk = "") {
  const guide = getGuideForAkshara(ak, nextAk);
  updateGuide(ak, nextAk);
  setHint(`అక్షరం: ${ak} | సూచన: ${guide.suggested} | కారణం: ${guide.rule}`);
}

/* =========================
   Meter Notes
   ========================= */
function buildMeterNotesText(meterName) {
  const info = getStrictMeterInfo(meterName);
  if (!info) return "ఛందస్సు notes ఇక్కడ కనిపిస్తాయి.";

  return [
    `ఛందస్సు: ${info.meter}`,
    `గణములు: ${info.ganasCompact} (${info.ganas})`,
    `ప్యాటర్న్: ${info.patternSpaced}`,
    `ప్రతిపాదంలో అక్షరాల సంఖ్య: ${info.aksharas}`,
    `యతిస్థానం: ${info.yati} వ అక్షరము`,
    `ప్రాస: ${info.prasa}`,
    `ప్రాస యతి: ${info.prasaYati}`
  ].join(" • ");
}

function updateMeterNotesFromPayload(payload) {
  if (!lineCheckText) return;
  const meterName = getMeterNameFromPayload(payload);
  lineCheckText.textContent = meterName
    ? buildMeterNotesText(meterName)
    : "Poem loaded. Backend response లో meter name లేదు. మొదటి గణం ద్వారా system detect చేస్తుంది.";
}

/* =========================
   Yati / Prasa Helpers
   ========================= */
function getYatiLetterForLine(line, meterName) {
  const info = getStrictMeterInfo(meterName);
  if (!info || !line || !Array.isArray(line.aksharas)) {
    return { pos: 0, ak: "", firstChar: "" };
  }

  const yatiAk = safeAksharaAt(line.aksharas, info.yati);
  return {
    pos: info.yati,
    ak: yatiAk,
    firstChar: safeChar(yatiAk)
  };
}

function getPrasaLetterForLine(line) {
  if (!line || !Array.isArray(line.aksharas)) {
    return { pos: 2, ak: "", firstChar: "" };
  }

  const prasaAk = safeAksharaAt(line.aksharas, 2);
  return {
    pos: 2,
    ak: prasaAk,
    firstChar: safeChar(prasaAk)
  };
}

function checkYatiForLine(line, meterName) {
  const info = getStrictMeterInfo(meterName);
  if (!info || !line || !Array.isArray(line.aksharas)) {
    return { ok: false, expectedPos: 0, firstAk: "", yatiAk: "" };
  }

  const yatiPos = info.yati - 1;
  if (line.aksharas.length <= yatiPos || !line.aksharas[0] || !line.aksharas[yatiPos]) {
    return {
      ok: false,
      expectedPos: info.yati,
      firstAk: line.aksharas[0] || "",
      yatiAk: line.aksharas[yatiPos] || ""
    };
  }

  const firstAk = safeChar(line.aksharas[0]);
  const yatiAk = safeChar(line.aksharas[yatiPos]);

  return {
    ok: firstAk && yatiAk ? firstAk === yatiAk : false,
    expectedPos: info.yati,
    firstAk,
    yatiAk
  };
}

function checkPrasaForAllLines(lines) {
  const validLines = (lines || []).filter((l) => Array.isArray(l.aksharas) && l.aksharas.length >= 2);
  if (validLines.length < 2) {
    return { ok: false, base: "", perLine: [] };
  }

  const baseAk = validLines[0].aksharas[1] || "";
  const base = safeChar(baseAk);

  const perLine = validLines.map((line, idx) => {
    const secondAk = line.aksharas[1] || "";
    const second = safeChar(secondAk);
    return {
      line: idx + 1,
      secondAk,
      second,
      ok: base && second ? base === second : false
    };
  });

  return {
    ok: perLine.every((x) => x.ok),
    base,
    perLine
  };
}

/* =========================
   Explainable AI Summary
   ========================= */
function buildExplainableSummary(report, info) {
  const strengths = [];
  const issues = [];
  const xaiSteps = [];

  const meterName = report.answerMeter || "—";
  const ganas = info?.ganasCompact || "—";
  const pattern = info?.patternSpaced || "—";

  xaiSteps.push(`మొదటి గణం ఆధారంగా system ఈ పద్యాన్ని ${meterName} గా గుర్తించింది.`);
  xaiSteps.push(`ఈ ఛందస్సుకు గణములు ${ganas}.`);
  xaiSteps.push(`ఈ ఛందస్సుకు సరైన Guru/Laghu pattern ${pattern}.`);

  if (report.prasaOK) {
    strengths.push("ప్రాస అన్ని పాదాల్లో సరిపోయింది.");
  } else {
    issues.push("ప్రాస అన్ని పాదాల్లో సరిపోలలేదు.");
  }

  const yatiBad = (report.perLine || []).filter((x) => !x.yatiOK);
  if (yatiBad.length === 0) {
    strengths.push("యతి స్థానాలు సరిగ్గా వచ్చాయి.");
  } else {
    issues.push(`యతి లోపం ఉన్న పాదాలు: ${yatiBad.map((x) => x.line).join(", ")}.`);
  }

  if ((report.accuracy || 0) >= 90) {
    strengths.push("Guru/Laghu ఎంపికలు ఎక్కువ భాగం సరిగ్గా ఉన్నాయి.");
  } else if ((report.accuracy || 0) >= 70) {
    strengths.push("Guru/Laghu పై మంచి అవగాహన ఉంది.");
    issues.push("కొన్ని స్థానాల్లో pattern mismatch ఉంది.");
  } else {
    issues.push("Guru/Laghu pattern లో గణనీయమైన తేడాలు ఉన్నాయి.");
  }

  const quizParts = [];
  quizParts.push(`Quiz లో meter ${quizState?.selected?.meter === report.quizAnswers?.meter ? "correct" : "wrong"}`);
  quizParts.push(`ganas ${quizState?.selected?.ganas === report.quizAnswers?.ganas ? "correct" : "wrong"}`);
  quizParts.push(
    `pattern ${
      compactToSpacedPattern(quizState?.selected?.pattern || "", report.answerMeter) ===
      compactToSpacedPattern(report.quizAnswers?.pattern || "", report.answerMeter)
        ? "correct"
        : "wrong"
    }`
  );

  const lines = [];
  lines.push(`Summary:`);
  lines.push(`1) Meter detected: ${meterName}`);
  lines.push(`2) Expected ganas: ${ganas}`);
  lines.push(`3) Expected pattern: ${pattern}`);
  lines.push(`4) Guru-Laghu accuracy: ${report.accuracy || 0}%`);
  lines.push(`5) Quiz score: ${report.quizScore || 0}/3`);
  lines.push(`6) ${quizParts.join(", ")}.`);

  if (strengths.length) {
    lines.push(`Strengths: ${strengths.join(" ")}`);
  }
  if (issues.length) {
    lines.push(`Needs improvement: ${issues.join(" ")}`);
  }
  if (xaiSteps.length) {
    lines.push(`Reasoning: ${xaiSteps.join(" ")}`);
  }

  return lines.join(" ");
}

/* =========================
   Load Random Poem
   ========================= */
function openScrollAnimation() {
  if (!poemDisplay) return;
  poemDisplay.classList.remove("scroll-open");
  void poemDisplay.offsetHeight;
  poemDisplay.classList.add("scroll-open");
  playPaperUnrollSound();
}

let __audioCtx = null;
function getAudioContext() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!__audioCtx) __audioCtx = new AC();
  return __audioCtx;
}

function playPaperUnrollSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const dur = 0.42;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(0.06, now + 0.03);
    master.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / data.length, 2);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(950, now);
    filter.Q.setValueAtTime(1.6, now);

    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + dur);

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.02, now);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    noise.connect(filter);
    filter.connect(master);
    osc.connect(oscGain);
    oscGain.connect(master);
    master.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + dur);
    osc.start(now);
    osc.stop(now + dur);
  } catch (e) {}
}

async function loadRandomPoem() {
  try {
    setHint("Dataset నుంచి random poem తీసుకుంటున్నాను...");
    const res = await fetch("/api/game/new", { method: "POST" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    currentGamePayload = data;
    lockedMeterFromFirstGana = "";
    quizReady = false;
    finalSubmitted = false;
    quizState = null;
    autoQuizOpening = false;

    if (poemText) poemText.textContent = data.poem || "";
    if (detNowEl) detNowEl.textContent = "Hidden";
    if (stagePill) stagePill.textContent = "Step 1: Poem Loaded";

    if (resultBox) {
      resultBox.classList.add("hidden");
      resultBox.innerHTML = "";
    }

    removeStagePanels();

    if (tilesWrap) tilesWrap.classList.add("hidden");

    openScrollAnimation();
    updateMeterNotesFromPayload(currentGamePayload);

    const meterInfo = getMeterInfoFromPayload(currentGamePayload);
    if (progressText) {
      progressText.textContent = meterInfo
        ? `Poem loaded. ఛందస్సు: ${meterInfo.meter} | గణాలు: ${meterInfo.ganasCompact} | ప్యాటర్న్: ${meterInfo.patternSpaced}`
        : "Poem loaded. All 4 lines are visible. Now click Start Game.";
    }

    updateGuide("", "");
    refreshHintCycle(true);

    if (prevLineBtn) prevLineBtn.style.display = "";
    if (nextLineBtn) nextLineBtn.style.display = "";

    smoothScrollTo(poemDisplay || poemText);
  } catch (err) {
    console.error(err);
    alert("Could not load poem from backend.");
  }
}

/* =========================
   Game Start
   ========================= */
function startGame() {
  if (!currentGamePayload || !currentGamePayload.analysis || !currentGamePayload.analysis.lines) {
    alert("First load a random poem.");
    return;
  }

  game = currentGamePayload.analysis.lines.map((line, idx) => {
    const aksharas = Array.isArray(line.aksharas) ? line.aksharas : [];
    const expectedAuto = Array.isArray(line.final_labels)
      ? line.final_labels
      : aksharas.map((ak, i) => inferGuruLaghu(ak, aksharas[i + 1] || "").label);

    return {
      lineNo: idx + 1,
      original: line.original || line.text || "",
      text: line.text || line.original || "",
      aksharas,
      userLabels: new Array(aksharas.length).fill(""),
      autoLabels: expectedAuto
    };
  });

  currentLineIndex = 0;
  quizReady = false;
  finalSubmitted = false;
  quizState = null;
  lockedMeterFromFirstGana = "";
  autoQuizOpening = false;

  showTilesAreaOnly();

  if (stagePill) stagePill.textContent = "Step 2: Mark Guru / Laghu";
  if (detNowEl) detNowEl.textContent = getExpectedMeter() || "Hidden";

  startTimer();
  renderLine();
  updateNextButtonState();
  refreshHintCycle(true);
  smoothScrollTo(tilesWrap || tilesHost || playArea);
}

/* =========================
   Status
   ========================= */
function updateTopStatus() {
  const lineObj = game[currentLineIndex];
  const total = lineObj ? lineObj.aksharas.length : 0;
  const answered = lineObj ? lineObj.userLabels.filter((x) => x === "G" || x === "L").length : 0;

  if (lineNowEl) lineNowEl.textContent = String(currentLineIndex + 1);
  if (ansNowEl) ansNowEl.textContent = String(answered);
  if (totNowEl) totNowEl.textContent = String(total);
}

function isCurrentLineDone() {
  const lineObj = game[currentLineIndex];
  return !!(lineObj && lineObj.userLabels.every((x) => x === "G" || x === "L"));
}

function isAllLinesDone() {
  return game.length === 4 && game.every((line) => line.userLabels.every((x) => x === "G" || x === "L"));
}

function updateNextButtonState() {
  if (!nextLineBtn) return;

  if (quizReady || finalSubmitted) {
    nextLineBtn.style.display = "none";
    if (prevLineBtn) prevLineBtn.style.display = "none";
    return;
  }

  nextLineBtn.style.display = "";
  if (prevLineBtn) prevLineBtn.style.display = "";

  const currentDone = isCurrentLineDone();

  if (currentLineIndex === 3) {
    nextLineBtn.innerHTML = currentDone
      ? `<span class="material-symbols-outlined">task_alt</span>Complete Line 4`
      : `<span class="material-symbols-outlined">arrow_forward</span>Finish Line 4`;
  } else {
    nextLineBtn.innerHTML = `<span class="material-symbols-outlined">arrow_forward</span>Next Line`;
  }
}

/* =========================
   Detection Display
   ========================= */
function updateDetectedMeterFromCurrentLine() {
  tryLockMeterFromLineZero();

  const fixedMeter = getExpectedMeter();
  const info = getStrictMeterInfo(fixedMeter);
  const lineObj = game[currentLineIndex];

  if (detNowEl) {
    detNowEl.textContent = fixedMeter || "Hidden";
  }

  if (info && progressText) {
    const currentUI = lineObj ? labelsToUI(lineObj.userLabels) : "";
    const currentGrouped = currentUI ? splitPatternIntoGroups(currentUI, info.meter).join(" | ") : "—";

    progressText.textContent =
      `Detected Meter: ${info.meter} | గణాలు: ${info.ganasCompact} | Correct Pattern: ${info.patternSpaced} | Your Current Grouping: ${currentGrouped}`;
  } else if (progressText) {
    progressText.textContent = "మొదటి 3 అక్షరాలు పూర్తి చేస్తే metre lock అవుతుంది.";
  }

  if (fixedMeter && lineCheckText) {
    lineCheckText.textContent = buildMeterNotesText(fixedMeter);
  }
}

/* =========================
   Auto-open quiz after line 4
   ========================= */
function maybeAutoOpenQuiz() {
  if (autoQuizOpening) return;
  if (quizReady) return;
  if (finalSubmitted) return;
  if (!game.length) return;
  if (currentLineIndex !== 3) return;
  if (!isAllLinesDone()) return;

  autoQuizOpening = true;
  setTimeout(() => {
    if (!quizReady && !finalSubmitted && isAllLinesDone()) {
      openQuizNow();
    }
    autoQuizOpening = false;
  }, 250);
}

function openQuizNow() {
  if (quizReady) return;
  if (finalSubmitted) return;
  if (!isAllLinesDone()) return;

  endTime = Date.now();
  stopTimer();
  quizState = buildQuizState();
  quizReady = true;

  if (prevLineBtn) prevLineBtn.style.display = "none";
  if (nextLineBtn) nextLineBtn.style.display = "none";

  renderQuiz();
}

/* =========================
   Render Line
   ========================= */
function renderLine() {
  const lineObj = game[currentLineIndex];
  if (!lineObj) return;

  if (prevLineBtn) prevLineBtn.style.display = "";
  if (nextLineBtn) nextLineBtn.style.display = "";

  removeStagePanels();
  if (tilesEl) {
    tilesEl.classList.remove("hidden");
    tilesEl.style.display = "";
  }
  if (tilesWrap) {
    tilesWrap.classList.remove("hidden");
    tilesWrap.style.display = "";
    tilesWrap.style.width = "100%";
  }

  if (origLineEl) origLineEl.textContent = lineObj.original;
  if (akCountEl) akCountEl.textContent = String(lineObj.aksharas.length);
  if (tilesEl) tilesEl.innerHTML = "";

  lineObj.aksharas.forEach((ak, idx) => {
    const tile = document.createElement("div");
    tile.className = "tile";

    const mini = document.createElement("div");
    mini.className = "mini";
    mini.textContent = "Pick";
    tile.appendChild(mini);

    const akEl = document.createElement("div");
    akEl.className = "ak";
    akEl.textContent = ak;

    const pick = document.createElement("div");
    pick.className = "pick";

    const gBtn = document.createElement("button");
    gBtn.type = "button";
    gBtn.textContent = "Guru";

    const lBtn = document.createElement("button");
    lBtn.type = "button";
    lBtn.textContent = "Laghu";

    function refreshBtns() {
      gBtn.classList.toggle("guruOn", lineObj.userLabels[idx] === "G");
      lBtn.classList.toggle("laghuOn", lineObj.userLabels[idx] === "L");
      mini.textContent =
        lineObj.userLabels[idx] === "G" ? "Guru" :
        lineObj.userLabels[idx] === "L" ? "Laghu" : "Pick";
    }

    gBtn.addEventListener("click", () => {
      if (quizReady || finalSubmitted) return;
      lineObj.userLabels[idx] = "G";
      refreshBtns();
      tryLockMeterFromLineZero();
      updateTopStatus();
      updateNextButtonState();
      showAksharaHint(ak, lineObj.aksharas[idx + 1] || "");
      updateDetectedMeterFromCurrentLine();
      maybeAutoOpenQuiz();
    });

    lBtn.addEventListener("click", () => {
      if (quizReady || finalSubmitted) return;
      lineObj.userLabels[idx] = "L";
      refreshBtns();
      tryLockMeterFromLineZero();
      updateTopStatus();
      updateNextButtonState();
      showAksharaHint(ak, lineObj.aksharas[idx + 1] || "");
      updateDetectedMeterFromCurrentLine();
      maybeAutoOpenQuiz();
    });

    tile.addEventListener("mouseenter", () => {
      showAksharaHint(ak, lineObj.aksharas[idx + 1] || "");
    });

    tile.addEventListener("click", () => {
      document.querySelectorAll(".tile").forEach((t) => t.classList.remove("active"));
      tile.classList.add("active");
      showAksharaHint(ak, lineObj.aksharas[idx + 1] || "");
    });

    refreshBtns();
    pick.appendChild(gBtn);
    pick.appendChild(lBtn);
    tile.appendChild(akEl);
    tile.appendChild(pick);

    if (tilesEl) tilesEl.appendChild(tile);
  });

  updateTopStatus();
  updateNextButtonState();

  const expectedMeter = getExpectedMeter();
  const expectedInfo = getStrictMeterInfo(expectedMeter);

  if (progressText) {
    progressText.textContent = expectedInfo
      ? `Line ${currentLineIndex + 1}: mark all aksharas. Expected grouped pattern: ${expectedInfo.patternGroups.join(" | ")}`
      : `Line ${currentLineIndex + 1}: first 3 aksharas ద్వారా metre గుర్తించండి.`;
  }

  updateGuide("", "");
  refreshHintCycle(false);
  updateDetectedMeterFromCurrentLine();
}

/* =========================
   Quiz
   ========================= */
function buildQuizState() {
  const correctMeter = getExpectedMeter();
  const info = getStrictMeterInfo(correctMeter);

  const meters = ["ఉత్పలమాల", "చంపకమాల", "శార్ధూలము", "మత్తేభము"];
  const ganasList = meters.map((m) => METER_INFO[m].ganasCompact);
  const patternList = meters.map((m) => METER_INFO[m].patternSpaced);

  return {
    answers: {
      meter: correctMeter,
      ganas: info?.ganasCompact || "",
      pattern: info?.patternSpaced || ""
    },
    selected: {
      meter: "",
      ganas: "",
      pattern: ""
    },
    options: {
      meter: shuffle([...new Set(meters)]),
      ganas: shuffle([...new Set(ganasList)]),
      pattern: shuffle([...new Set(patternList)])
    }
  };
}

function renderQuizBlock(key, title, options, selected) {
  return `
    <div class="bg-white rounded-[1.4rem] p-5 sm:p-6 border border-slate-200 shadow-sm" style="width:100%;">
      <h4 class="font-black text-slate-900 text-lg sm:text-xl mb-4">${title}</h4>
      <div class="grid grid-cols-1 gap-3" style="width:100%;">
        ${options.map((opt) => `
          <button
            type="button"
            class="quizOption ${selected === opt ? "selected" : ""}"
            data-key="${key}"
            data-value="${encodeURIComponent(opt)}"
            style="
              width:100%;
              display:block;
              padding:14px 16px;
              border-radius:18px;
              border:2px solid ${selected === opt ? "#7c3aed" : "#dbeafe"};
              background:${selected === opt ? "linear-gradient(135deg,#ede9fe,#fae8ff)" : "linear-gradient(135deg,#ffffff,#f8fafc)"};
              font-weight:800;
              text-align:left;
              transition:all .25s ease;
              color:#0f172a;
            "
          >
            ${escapeHtml(opt)}
          </button>
        `).join("")}
      </div>
    </div>
  `;
}

function isQuizComplete() {
  return !!(
    quizState &&
    quizState.selected.meter &&
    quizState.selected.ganas &&
    quizState.selected.pattern
  );
}

function bindQuizEvents() {
  document.querySelectorAll(".quizOption").forEach((btn) => {
    btn.onclick = () => {
      const key = btn.getAttribute("data-key");
      const val = decodeURIComponent(btn.getAttribute("data-value") || "");
      quizState.selected[key] = val;

      document.querySelectorAll(`.quizOption[data-key="${key}"]`).forEach((el) => {
        el.classList.remove("selected");
        el.style.border = "2px solid #dbeafe";
        el.style.background = "linear-gradient(135deg,#ffffff,#f8fafc)";
      });

      btn.classList.add("selected");
      btn.style.border = "2px solid #7c3aed";
      btn.style.background = "linear-gradient(135deg,#ede9fe,#fae8ff)";

      const submitBtn = $("submitFinalBtn");
      if (submitBtn) {
        const ready = isQuizComplete();
        submitBtn.disabled = !ready;
        submitBtn.classList.toggle("opacity-60", !ready);
        submitBtn.classList.toggle("cursor-not-allowed", !ready);
      }
    };
  });

  const submitBtn = $("submitFinalBtn");
  if (submitBtn) {
    submitBtn.type = "button";
    submitBtn.onclick = submitFinalResults;
  }
}

function renderQuiz() {
  if (!quizState) return;

  quizReady = true;
  if (stagePill) stagePill.textContent = "Step 3: Quiz Time";

  if (prevLineBtn) prevLineBtn.style.display = "none";
  if (nextLineBtn) nextLineBtn.style.display = "none";

  hideTilesGridForStage();

  const q = quizState;
  const mount = getStageMount();
  if (!mount) return;

  removeStagePanels();

  const quizPanel = document.createElement("div");
  quizPanel.id = "stageQuizPanel";
  quizPanel.className = "mt-4";
  quizPanel.style.width = "100%";
  quizPanel.innerHTML = `
    <div class="flex flex-col gap-6" style="width:100%;">
      <div class="bg-white rounded-[1.4rem] p-5 sm:p-6 border border-slate-200 shadow-sm" style="width:100%;">
        <h3 class="text-2xl sm:text-3xl font-black text-slate-900">Quiz Time</h3>
        <p class="text-slate-700 text-sm sm:text-base mt-2 leading-7">
          4 lines పూర్తయ్యాయి. ఇప్పుడు ఇక్కడే quiz complete చేయండి.
        </p>
      </div>

      ${renderQuizBlock("meter", "1) ఈ పద్యానికి సరైన ఛందస్సు ఏది?", q.options.meter, q.selected.meter)}
      ${renderQuizBlock("ganas", "2) సరైన గణములు ఏవి?", q.options.ganas, q.selected.ganas)}
      ${renderQuizBlock("pattern", "3) సరైన U/I pattern ఏది?", q.options.pattern, q.selected.pattern)}

      <div class="bg-white rounded-[1.4rem] p-5 sm:p-6 border border-slate-200 shadow-sm" style="width:100%;">
        <button
          id="submitFinalBtn"
          type="button"
          class="btnPrimary ${isQuizComplete() ? "" : "opacity-60 cursor-not-allowed"}"
          style="
            display:inline-flex;
            align-items:center;
            gap:8px;
            padding:14px 18px;
            border-radius:18px;
            font-weight:900;
          "
          ${isQuizComplete() ? "" : "disabled"}
        >
          <span class="material-symbols-outlined">task_alt</span>
          Submit Quiz and Show Report
        </button>
      </div>
    </div>
  `;

  mount.appendChild(quizPanel);

  bindQuizEvents();

  if (progressText) {
    progressText.textContent = "Quiz opened automatically after 4 lines completion.";
  }
  setHint("ఇప్పుడు quiz complete చేయండి. Submit చేసిన వెంటనే report ఇదే container లో కనిపిస్తుంది.");
  smoothScrollTo(quizPanel);
}

/* =========================
   Local Report Engine
   ========================= */
function buildLocalReport() {
  const answerMeter = getExpectedMeter();
  const info = getStrictMeterInfo(answerMeter);

  const expectedPatternGL = info ? uiToGLArray(info.pattern) : [];

  let correct = 0;
  let total = 0;
  let guruCorrect = 0;
  let laghuCorrect = 0;
  let guruWrong = 0;
  let laghuWrong = 0;

  const perLine = game.map((line, idx) => {
    const user = Array.isArray(line.userLabels) ? line.userLabels.slice() : [];
    const expected = expectedPatternGL.slice();
    const expectedUI = labelsToUI(expected);
    const userUI = labelsToUI(user);
    const wrongIdx = [];

    const len = Math.min(user.length, expected.length);
    let lineCorrect = 0;

    for (let i = 0; i < len; i++) {
      total += 1;
      if (user[i] === expected[i]) {
        correct += 1;
        lineCorrect += 1;
        if (user[i] === "G") guruCorrect++;
        if (user[i] === "L") laghuCorrect++;
      } else {
        wrongIdx.push(i);
        if (user[i] === "G") guruWrong++;
        if (user[i] === "L") laghuWrong++;
      }
    }

    const yatiCheck = checkYatiForLine(line, answerMeter);
    const yatiLetter = getYatiLetterForLine(line, answerMeter);
    const prasaLetter = getPrasaLetterForLine(line);
    const lineAccuracy = len ? Math.round((lineCorrect / len) * 100) : 0;

    return {
      line: idx + 1,
      text: line.original || line.text || "",
      aksharas: Array.isArray(line.aksharas) ? line.aksharas : [],
      user,
      expected,
      userUI,
      expectedUI,
      wrongIdx,
      yatiOK: yatiCheck.ok,
      yatiExpectedPos: yatiCheck.expectedPos,
      firstAk: yatiCheck.firstAk,
      yatiAk: yatiCheck.yatiAk,
      yatiLetter,
      prasaLetter,
      lineAccuracy
    };
  });

  const prasa = checkPrasaForAllLines(game);

  let quizScore = 0;
  if (quizState?.selected?.meter === quizState?.answers?.meter) quizScore++;
  if (quizState?.selected?.ganas === quizState?.answers?.ganas) quizScore++;
  if (quizState?.selected?.pattern === quizState?.answers?.pattern) quizScore++;

  const accuracy = total ? Math.round((correct / total) * 100) : 0;
  const wrong = Math.max(0, total - correct);

  const strengths = [];
  const improvements = [];
  const common_mistakes = [];
  const coaching_tips = [];

  if (accuracy >= 90) {
    strengths.push("Guru/Laghu placement చాలా బాగా చేశారు.");
  } else if (accuracy >= 70) {
    strengths.push("Pattern మీద మంచి అవగాహన ఉంది.");
    improvements.push("కొన్ని అక్షర స్థానాల్లో Guru/Laghu తేడా ఉంది.");
  } else {
    improvements.push("మొదటి గణం fix చేసిన తర్వాత పూర్తి pattern ని జాగ్రత్తగా match చేయాలి.");
  }

  if (prasa.ok) {
    strengths.push("ప్రాస సరిగా ఉంది.");
  } else {
    improvements.push("ప్రతి పాదంలో రెండవ అక్షరాన్ని చూసి ప్రాస సరిచూడాలి.");
    common_mistakes.push("ప్రాస అన్ని పాదాల్లో ఒకేలా లేదు.");
  }

  const badYatiLines = perLine.filter((x) => !x.yatiOK);
  if (badYatiLines.length === 0) {
    strengths.push("యతిస్థానం సరిగ్గా పాటించబడింది.");
  } else {
    improvements.push(`యతి ${info?.yati || "?"} వ అక్షరంలో మళ్లీ చూడాలి.`);
    common_mistakes.push(`Line ${badYatiLines.map((x) => x.line).join(", ")} లో యతి సరిపోలలేదు.`);
  }

  perLine.forEach((line) => {
    line.wrongIdx.forEach((i) => {
      common_mistakes.push(
        `Line ${line.line}, akshara ${i + 1} (${line.aksharas[i] || "—"}): player marked ${line.user[i] || "—"}, correct is ${line.expected[i] || "—"}.`
      );
    });
  });

  coaching_tips.push("మొదటి 3 అక్షరాలు చూసి మొదటి గణాన్ని గుర్తించండి.");
  coaching_tips.push("గణం fix అయిన వెంటనే అదే metre pattern ని అన్ని పాదాలకు వర్తింపజేయండి.");
  coaching_tips.push("దీర్ఘం, ం, ః, పొల్లు, సంయుక్త ప్రభావం చూసి Guru/Laghu నిర్ణయించండి.");
  coaching_tips.push("యతి స్థానాన్ని ప్రత్యేకంగా గుర్తించండి.");
  coaching_tips.push("ప్రతి పాదంలోని 2వ అక్షరంతో ప్రాసను పరీక్షించండి.");

  const report = {
    answerMeter,
    correct,
    wrong,
    total,
    accuracy,
    quizScore,
    guruCorrect,
    laghuCorrect,
    guruWrong,
    laghuWrong,
    prasaOK: prasa.ok,
    prasaBase: prasa.base,
    prasaPerLine: prasa.perLine,
    perLine,
    quizAnswers: {
      meter: quizState?.answers?.meter || answerMeter,
      ganas: info?.ganasCompact || "—",
      pattern: info?.patternSpaced || ""
    },
    aiReport: {
      ml_meter_prediction: answerMeter || "—",
      strengths,
      improvements,
      common_mistakes,
      coaching_tips
    }
  };

  report.aiReport.summary = buildExplainableSummary(report, info);
  return report;
}

/* =========================
   Backend ML merge
   ========================= */
async function tryBackendReport(localPayload) {
  try {
    const res = await fetch("/api/game/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(localPayload)
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("Backend report fallback to local report:", err);
    return null;
  }
}

/* =========================
   Final Submit
   ========================= */
async function submitFinalResults() {
  try {
    if (!isQuizComplete()) {
      alert("Please answer all 3 quiz questions.");
      return;
    }

    endTime = Date.now();
    stopTimer();

    const localPayload = {
      poem: currentGamePayload?.poem || "",
      lines: game.map((line) => ({
        original: line.original,
        aksharas: line.aksharas,
        userLabels: line.userLabels
      })),
      quiz: quizState?.selected || {},
      elapsed_seconds: getElapsedSeconds(),
      expected_meter: getExpectedMeter()
    };

    const localReport = buildLocalReport();
    const backendReport = await tryBackendReport(localPayload);

    const correctedMeter = normalizeMeterName(
      backendReport?.answerMeter ||
      localReport.answerMeter ||
      currentGamePayload?.answerMeter ||
      currentGamePayload?.systemMeter ||
      ""
    );

    const correctedInfo = getStrictMeterInfo(correctedMeter);

    const merged = {
      ...localReport,
      ...(backendReport || {}),
      answerMeter: correctedMeter || localReport.answerMeter,
      quizAnswers: {
        meter: correctedMeter || localReport.quizAnswers?.meter || "—",
        ganas: correctedInfo?.ganasCompact || localReport.quizAnswers?.ganas || "—",
        pattern: correctedInfo?.patternSpaced || localReport.quizAnswers?.pattern || ""
      },
      aiReport: {
        ...localReport.aiReport,
        ml_meter_prediction: normalizeMeterName(
          correctedMeter || localReport.answerMeter
        )
      },
      perLine: localReport.perLine,
      prasaPerLine: localReport.prasaPerLine,
      prasaBase: localReport.prasaBase,
      prasaOK: localReport.prasaOK,
      correct: localReport.correct,
      wrong: localReport.wrong,
      total: localReport.total,
      accuracy: localReport.accuracy,
      quizScore: localReport.quizScore,
      guruCorrect: localReport.guruCorrect,
      laghuCorrect: localReport.laghuCorrect,
      guruWrong: localReport.guruWrong,
      laghuWrong: localReport.laghuWrong
    };

    merged.aiReport.summary = buildExplainableSummary(merged, correctedInfo);
    merged.aiReport.strengths = localReport.aiReport.strengths || [];
    merged.aiReport.improvements = localReport.aiReport.improvements || [];
    merged.aiReport.common_mistakes = localReport.aiReport.common_mistakes || [];
    merged.aiReport.coaching_tips = localReport.aiReport.coaching_tips || [];

    finalSubmitted = true;
    quizReady = true;

    if (lineCheckText) lineCheckText.textContent = buildMeterNotesText(merged.answerMeter);
    renderFinalResults(merged);
  } catch (err) {
    console.error(err);
    alert("Could not generate final report.");
  }
}

/* =========================
   Graph drawing
   ========================= */
function animateCanvas(canvas, drawFrame, duration = 900) {
  if (!canvas) return;
  const start = performance.now();

  function frame(now) {
    const t = Math.min(1, (now - start) / duration);
    drawFrame(t);
    if (t < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function drawDonutChart(canvas, items) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(320, Math.floor(rect.width || 420));
  const height = Math.max(280, Math.floor(rect.height || 320));

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const total = items.reduce((s, x) => s + x.value, 0) || 1;
  const colors = ["#10b981", "#ef4444", "#8b5cf6", "#f59e0b", "#06b6d4", "#ec4899"];

  animateCanvas(canvas, (progress) => {
    ctx.clearRect(0, 0, width, height);

    const cx = width * 0.35;
    const cy = height * 0.52;
    const radius = Math.min(width, height) * 0.24;
    const lineWidth = radius * 0.42;

    let startAngle = -Math.PI / 2;
    items.forEach((item, i) => {
      const slice = (item.value / total) * Math.PI * 2 * progress;
      ctx.beginPath();
      ctx.strokeStyle = colors[i % colors.length];
      ctx.lineWidth = lineWidth;
      ctx.lineCap = "round";
      ctx.arc(cx, cy, radius, startAngle, startAngle + slice);
      ctx.stroke();
      startAngle += (item.value / total) * Math.PI * 2;
    });

    ctx.fillStyle = "#0f172a";
    ctx.font = "700 16px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${Math.round(((items[0]?.value || 0) / total) * 100)}%`, cx, cy - 2);

    ctx.fillStyle = "#64748b";
    ctx.font = "600 12px sans-serif";
    ctx.fillText("Correct", cx, cy + 18);

    const legendX = width * 0.62;
    let legendY = height * 0.26;

    items.forEach((item, i) => {
      ctx.fillStyle = colors[i % colors.length];
      if (typeof ctx.roundRect === "function") {
        ctx.beginPath();
        ctx.roundRect(legendX, legendY, 14, 14, 4);
        ctx.fill();
      } else {
        ctx.fillRect(legendX, legendY, 14, 14);
      }

      ctx.fillStyle = "#0f172a";
      ctx.font = "700 13px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`${item.label}: ${item.value}`, legendX + 24, legendY + 12);

      legendY += 28;
    });
  }, 1000);
}

function drawBarChart(canvas, labels, values, maxValueHint = 100) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(360, Math.floor(rect.width || 520));
  const height = Math.max(280, Math.floor(rect.height || 320));

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const padding = { top: 24, right: 20, bottom: 54, left: 42 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const maxVal = Math.max(maxValueHint, ...values, 1);
  const barWidth = chartW / Math.max(values.length, 1) * 0.55;

  animateCanvas(canvas, (progress) => {
    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 1;

    for (let i = 0; i <= 5; i++) {
      const y = padding.top + chartH - (chartH * i / 5);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      ctx.fillStyle = "#64748b";
      ctx.font = "11px sans-serif";
      ctx.textAlign = "right";
      ctx.fillText(String(Math.round(maxVal * i / 5)), padding.left - 6, y + 4);
    }

    values.forEach((v, i) => {
      const x = padding.left + (i + 0.5) * (chartW / values.length) - (barWidth / 2);
      const h = (v / maxVal) * chartH * progress;
      const y = padding.top + chartH - h;

      const grad = ctx.createLinearGradient(0, y, 0, y + h);
      grad.addColorStop(0, "#8b5cf6");
      grad.addColorStop(1, "#06b6d4");

      ctx.fillStyle = grad;
      if (typeof ctx.roundRect === "function") {
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, h, 12);
        ctx.fill();
      } else {
        ctx.fillRect(x, y, barWidth, h);
      }

      ctx.fillStyle = "#0f172a";
      ctx.font = "700 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(`${Math.round(v)}`, x + barWidth / 2, y - 8);

      ctx.fillStyle = "#334155";
      ctx.font = "12px sans-serif";
      ctx.fillText(labels[i], x + barWidth / 2, height - 18);
    });
  }, 1000);
}

function drawProgressLineChart(canvas, labels, values, maxValueHint = 100) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(360, Math.floor(rect.width || 520));
  const height = Math.max(280, Math.floor(rect.height || 320));

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const padding = { top: 20, right: 20, bottom: 46, left: 42 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const maxVal = Math.max(maxValueHint, ...values, 1);

  animateCanvas(canvas, (progress) => {
    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = padding.top + chartH - (chartH * i / 5);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }

    const pts = values.map((v, i) => {
      const x = padding.left + (chartW * i / Math.max(values.length - 1, 1));
      const y = padding.top + chartH - ((v / maxVal) * chartH * progress);
      return { x, y, v };
    });

    if (pts.length > 1) {
      ctx.beginPath();
      ctx.lineWidth = 4;
      ctx.strokeStyle = "#f59e0b";
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
    }

    pts.forEach((p, i) => {
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#0f172a";
      ctx.font = "700 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(String(Math.round(values[i])), p.x, p.y - 12);

      ctx.fillStyle = "#334155";
      ctx.font = "12px sans-serif";
      ctx.fillText(labels[i], p.x, height - 16);
    });
  }, 1000);
}

function renderReportGraphs(report) {
  const overallCanvas = $("overallDonutCanvas");
  const lineCanvas = $("lineAccuracyCanvas");
  const quizCanvas = $("quizBarCanvas");

  drawDonutChart(overallCanvas, [
    { label: "Correct", value: report.correct || 0 },
    { label: "Wrong", value: report.wrong || 0 }
  ]);

  drawBarChart(
    lineCanvas,
    (report.perLine || []).map((x) => `L${x.line}`),
    (report.perLine || []).map((x) => x.lineAccuracy || 0),
    100
  );

  drawProgressLineChart(
    quizCanvas,
    ["Meter", "Ganas", "Pattern"],
    [
      quizState?.selected?.meter === report.quizAnswers?.meter ? 100 : 0,
      quizState?.selected?.ganas === report.quizAnswers?.ganas ? 100 : 0,
      compactToSpacedPattern(quizState?.selected?.pattern || "", report.answerMeter) ===
      compactToSpacedPattern(report.quizAnswers?.pattern || "", report.answerMeter) ? 100 : 0
    ],
    100
  );
}

/* =========================
   Final Result UI
   ========================= */
function renderFinalResults(report) {
  if (detNowEl) detNowEl.textContent = report.answerMeter || "—";
  if (stagePill) stagePill.textContent = "Step 4: Final Report";

  finalSubmitted = true;
  if (prevLineBtn) prevLineBtn.style.display = "none";
  if (nextLineBtn) nextLineBtn.style.display = "none";

  const ai = report.aiReport || {};
  const normalizedMlMeter = normalizeMeterName(ai.ml_meter_prediction || report.answerMeter || "—");
  const info = getStrictMeterInfo(report.answerMeter);

  const strengths = (ai.strengths || []).map((x) => `<li>${escapeHtml(x)}</li>`).join("");
  const improvements = (ai.improvements || []).map((x) => `<li>${escapeHtml(x)}</li>`).join("");
  const mistakes = (ai.common_mistakes || []).map((x) => `<li>${escapeHtml(x)}</li>`).join("");
  const coaching = (ai.coaching_tips || []).map((x) => `<li>${escapeHtml(x)}</li>`).join("");

  const prasaRows = (report.prasaPerLine || []).map((item) => `
    <div class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-black" style="color:#000000 !important;">
      <div style="color:#000000 !important;"><b style="color:#000000 !important;">పాదం ${item.line}</b></div>
      <div class="mt-1" style="color:#000000 !important;">2వ అక్షరం: <b style="color:#000000 !important;">${escapeHtml(item.secondAk || "—")}</b></div>
      <div class="mt-1" style="color:#000000 !important;">ప్రాస అక్షరం: <b style="color:#000000 !important;">${escapeHtml(item.second || "—")}</b></div>
      <div class="mt-1" style="color:#000000 !important;">${item.ok ? "OK" : "Mismatch"}</div>
    </div>
  `).join("");

  const mount = getStageMount();
  if (!mount) return;

  hideTilesGridForStage();
  removeStagePanels();

  const reportPanel = document.createElement("div");
  reportPanel.id = "stageReportPanel";
  reportPanel.className = "mt-4";
  reportPanel.style.width = "100%";
  reportPanel.innerHTML = `
    <div class="flex flex-col gap-6" style="width:100%;">

      <div class="rounded-[1.6rem] p-5 sm:p-6 border border-transparent shadow-sm"
           style="background:linear-gradient(135deg,#fdf2f8,#eef2ff,#ecfeff); width:100%;">
        <h3 class="text-2xl sm:text-3xl font-black text-slate-900">AI Player Report</h3>
        <p class="text-slate-700 text-sm sm:text-base mt-2 leading-7">
          ${escapeHtml(ai.summary || "Performance report generated.")}
        </p>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-5 gap-3" style="width:100%;">
        <div class="rounded-2xl px-4 py-4 border shadow-sm" style="background:linear-gradient(135deg,#d1fae5,#ecfdf5);border-color:#a7f3d0;">
          <div class="text-xs font-bold text-slate-500 uppercase">Correct Meter</div>
          <div class="text-base font-black text-slate-900 mt-1">${escapeHtml(report.answerMeter || "—")}</div>
        </div>
        <div class="rounded-2xl px-4 py-4 border shadow-sm" style="background:linear-gradient(135deg,#fef3c7,#fff7ed);border-color:#fde68a;">
          <div class="text-xs font-bold text-slate-500 uppercase">Detected / ML</div>
          <div class="text-base font-black text-slate-900 mt-1">${escapeHtml(normalizedMlMeter || "—")}</div>
        </div>
        <div class="rounded-2xl px-4 py-4 border shadow-sm" style="background:linear-gradient(135deg,#dbeafe,#eff6ff);border-color:#93c5fd;">
          <div class="text-xs font-bold text-slate-500 uppercase">Guru-Laghu</div>
          <div class="text-base font-black text-slate-900 mt-1">${report.accuracy}%</div>
        </div>
        <div class="rounded-2xl px-4 py-4 border shadow-sm" style="background:linear-gradient(135deg,#ede9fe,#f5f3ff);border-color:#c4b5fd;">
          <div class="text-xs font-bold text-slate-500 uppercase">Quiz Score</div>
          <div class="text-base font-black text-slate-900 mt-1">${report.quizScore}/3</div>
        </div>
        <div class="rounded-2xl px-4 py-4 border shadow-sm" style="background:linear-gradient(135deg,#ffe4e6,#fff1f2);border-color:#fda4af;">
          <div class="text-xs font-bold text-slate-500 uppercase">Time</div>
          <div class="text-base font-black text-slate-900 mt-1">${formatSeconds(getElapsedSeconds())}</div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4" style="width:100%;">
        <div class="bg-white rounded-[1.5rem] p-5 sm:p-6 border border-slate-200 shadow-sm" style="width:100%;">
          <h4 class="font-black text-slate-900 text-lg sm:text-xl mb-4">Overall Accuracy Graph</h4>
          <div class="rounded-2xl border border-slate-100 bg-slate-50 p-3">
            <canvas id="overallDonutCanvas" style="width:100%;height:320px;display:block;"></canvas>
          </div>
        </div>

        <div class="bg-white rounded-[1.5rem] p-5 sm:p-6 border border-slate-200 shadow-sm" style="width:100%;">
          <h4 class="font-black text-slate-900 text-lg sm:text-xl mb-4">Line-wise Performance Graph</h4>
          <div class="rounded-2xl border border-slate-100 bg-slate-50 p-3">
            <canvas id="lineAccuracyCanvas" style="width:100%;height:320px;display:block;"></canvas>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-[1.5rem] p-5 sm:p-6 border border-slate-200 shadow-sm" style="width:100%;">
        <h4 class="font-black text-slate-900 text-lg sm:text-xl mb-4">Quiz Analysis Graph</h4>
        <div class="rounded-2xl border border-slate-100 bg-slate-50 p-3">
          <canvas id="quizBarCanvas" style="width:100%;height:300px;display:block;"></canvas>
        </div>
      </div>

      <div class="bg-white rounded-[1.5rem] p-5 sm:p-6 border border-slate-200 shadow-sm" style="width:100%;">
        <h4 class="font-black text-slate-900 text-lg sm:text-xl mb-3">Correct Chandassu Notes</h4>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-slate-800 leading-8 text-sm sm:text-base">
          <div><b>ఛందస్సు:</b> ${escapeHtml(info?.meter || "—")}</div>
          <div><b>గణములు:</b> ${escapeHtml(info?.ganasCompact || "—")} (${escapeHtml(info?.ganas || "—")})</div>
          <div><b>Pattern:</b> <span class="mono">${escapeHtml(info?.patternSpaced || "—")}</span></div>
          <div><b>అక్షరాల సంఖ్య:</b> ${escapeHtml(info?.aksharas || "—")}</div>
          <div><b>యతిస్థానం:</b> ${escapeHtml(info?.yati || "—")} వ అక్షరము</div>
          <div><b>ప్రాస స్థానం:</b> 2వ అక్షరము</div>
        </div>
      </div>

      <div class="bg-white rounded-[1.5rem] p-5 sm:p-6 border border-slate-200 shadow-sm" style="width:100%;">
        <h4 class="font-black text-slate-900 text-lg sm:text-xl mb-3">Correct Answers</h4>
        <div class="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-4 text-slate-900">
          <div><b>Correct Chandassu:</b> ${escapeHtml(report.answerMeter || "—")}</div>
          <div class="mt-1"><b>Correct Ganas:</b> ${escapeHtml(report.quizAnswers?.ganas || "—")}</div>
          <div class="mt-1"><b>Correct Pattern:</b> <span class="mono">${escapeHtml(compactToSpacedPattern(report.quizAnswers?.pattern || "", report.answerMeter) || "—")}</span></div>
        </div>
      </div>

      <div class="bg-white rounded-[1.5rem] p-5 sm:p-6 border border-slate-200 shadow-sm" style="width:100%;">
        <h4 class="font-black text-slate-900 text-lg sm:text-xl mb-3">Your Quiz Answers vs Correct Answers</h4>
        <div class="grid grid-cols-1 gap-4 text-slate-900">
          <div class="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-4">
            <div><b>Your meter answer:</b> ${escapeHtml(quizState?.selected?.meter || "—")}</div>
            <div class="mt-1"><b>Correct meter:</b> ${escapeHtml(report.quizAnswers?.meter || "—")}</div>
          </div>
          <div class="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-4">
            <div><b>Your ganas answer:</b> ${escapeHtml(quizState?.selected?.ganas || "—")}</div>
            <div class="mt-1"><b>Correct ganas:</b> ${escapeHtml(report.quizAnswers?.ganas || "—")}</div>
          </div>
          <div class="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-4">
            <div><b>Your pattern answer:</b> <span class="mono">${escapeHtml(quizState?.selected?.pattern || "—")}</span></div>
            <div class="mt-1"><b>Correct pattern:</b> <span class="mono">${escapeHtml(compactToSpacedPattern(report.quizAnswers?.pattern || "", report.answerMeter) || "—")}</span></div>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4" style="width:100%;">
        <div class="bg-white rounded-[1.5rem] p-5 sm:p-6 border border-slate-200 shadow-sm">
          <h4 class="font-black text-slate-900 text-lg sm:text-xl mb-3">Strengths</h4>
          <ul class="list-disc pl-5 text-slate-800 leading-7">${strengths || "<li>—</li>"}</ul>
        </div>

        <div class="bg-white rounded-[1.5rem] p-5 sm:p-6 border border-slate-200 shadow-sm">
          <h4 class="font-black text-slate-900 text-lg sm:text-xl mb-3">Needs Improvement</h4>
          <ul class="list-disc pl-5 text-slate-800 leading-7">${improvements || "<li>—</li>"}</ul>
        </div>
      </div>

      <div class="bg-white rounded-[1.5rem] p-5 sm:p-6 border border-slate-200 shadow-sm text-black" style="color:#000000 !important; width:100%;">
        <h4 class="font-black text-lg sm:text-xl mb-3 text-black" style="color:#000000 !important;">Prasa Letters</h4>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-black" style="color:#000000 !important;">
          ${prasaRows || `<div class="text-black" style="color:#000000 !important;">—</div>`}
        </div>
        <div class="mt-4 text-black" style="color:#000000 !important;">
          <b style="color:#000000 !important;">Base Prasa Letter:</b> ${escapeHtml(report.prasaBase || "—")} |
          <b style="color:#000000 !important;">Status:</b> ${report.prasaOK ? "OK" : "Check Again"}
        </div>
      </div>

      <div class="bg-white rounded-[1.5rem] p-5 sm:p-6 border border-slate-200 shadow-sm" style="width:100%;">
        <h4 class="font-black text-slate-900 text-lg sm:text-xl mb-4">Your Placement vs System Correction</h4>
        <div class="grid grid-cols-1 gap-4 text-slate-900">
          ${(report.perLine || []).map((line, idx) => `
            <div class="rounded-2xl bg-slate-50 border border-slate-200 px-4 py-4">
              <div class="mb-2 text-lg font-black">పాదం ${line.line || (idx + 1)} <span class="ml-2 text-sm text-slate-500">(${line.lineAccuracy || 0}%)</span></div>
              <div class="mb-3" style="font-family:'Noto Sans Telugu',sans-serif;"><b>Text:</b> ${escapeHtml(line.text || "—")}</div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><b>Your G/L:</b> <span class="mono">${escapeHtml((line.user || []).join(" "))}</span></div>
                <div><b>System G/L:</b> <span class="mono">${escapeHtml((line.expected || []).join(" "))}</span></div>
                <div><b>Your U/I pattern:</b> <span class="mono">${escapeHtml(line.userUI || "—")}</span></div>
                <div><b>Correct U/I pattern:</b> <span class="mono">${escapeHtml(line.expectedUI || "—")}</span></div>
                <div><b>Your grouped pattern:</b> <span class="mono">${escapeHtml(splitPatternIntoGroups(line.userUI || "", report.answerMeter).join(" | "))}</span></div>
                <div><b>Correct grouped pattern:</b> <span class="mono">${escapeHtml(splitPatternIntoGroups(line.expectedUI || "", report.answerMeter).join(" | "))}</span></div>
              </div>

              <div class="mt-3"><b>Wrong positions:</b> ${line.wrongIdx && line.wrongIdx.length ? line.wrongIdx.map((x) => x + 1).join(", ") : "None"}</div>

              <div class="mt-2">
                <b>Yati letter (${line.yatiLetter?.pos || "—"}వ అక్షరము):</b>
                ${escapeHtml(line.yatiLetter?.ak || "—")} → ${escapeHtml(line.yatiLetter?.firstChar || "—")}
              </div>

              <div class="mt-2 text-black" style="color:#000000 !important;">
                <b style="color:#000000 !important;">Prasa letter (2వ అక్షరము):</b>
                <span style="color:#000000 !important;">${escapeHtml(line.prasaLetter?.ak || "—")} → ${escapeHtml(line.prasaLetter?.firstChar || "—")}</span>
              </div>

              <div class="mt-2">
                <b>Yati check:</b>
                ${line.yatiOK ? "OK" : `Check ${line.yatiExpectedPos || "—"}వ అక్షరము (${escapeHtml(line.firstAk || "—")} vs ${escapeHtml(line.yatiAk || "—")})`}
              </div>
            </div>
          `).join("")}
        </div>
      </div>

      <div class="bg-white rounded-[1.5rem] p-5 sm:p-6 border border-slate-200 shadow-sm" style="width:100%;">
        <h4 class="font-black text-slate-900 text-lg sm:text-xl mb-3">Common Mistakes</h4>
        <ul class="list-disc pl-5 text-slate-800 leading-7">${mistakes || "<li>—</li>"}</ul>
      </div>

      <div class="bg-white rounded-[1.5rem] p-5 sm:p-6 border border-slate-200 shadow-sm" style="width:100%;">
        <h4 class="font-black text-slate-900 text-lg sm:text-xl mb-3">Coaching Tips</h4>
        <ul class="list-disc pl-5 text-slate-800 leading-7">${coaching || "<li>—</li>"}</ul>
      </div>

      <div class="bg-white rounded-[1.5rem] p-5 sm:p-6 border border-slate-200 shadow-sm" style="width:100%;">
        <div style="display:flex;justify-content:center;align-items:center;">
          <button
            id="playAgainBtn"
            type="button"
            class="btnPrimary"
            style="
              display:inline-flex;
              align-items:center;
              justify-content:center;
              gap:8px;
              padding:14px 24px;
              border-radius:18px;
              font-weight:900;
              margin:0 auto;
            "
          >
            <span class="material-symbols-outlined">replay</span>
            Play Again
          </button>
        </div>
      </div>

    </div>
  `;

  mount.appendChild(reportPanel);

  if (progressText) {
    progressText.textContent = "Game completed. Final report is now shown in the same working container.";
  }

  setHint("ఆట పూర్తైంది. Report ఇప్పుడు అదే Guru/Laghu working container లో చూపించబడింది.");
  smoothScrollTo(reportPanel);

  const playAgainBtn = $("playAgainBtn");
  if (playAgainBtn) {
    playAgainBtn.onclick = () => {
      resetGame();
      smoothScrollTo(poemDisplay || poemText || inputArea);
    };
  }

  setTimeout(() => {
    renderReportGraphs(report);
  }, 80);
}

/* =========================
   Navigation
   ========================= */
function goPrevLine() {
  if (!game.length || quizReady || finalSubmitted) return;
  if (currentLineIndex > 0) {
    currentLineIndex--;
    renderLine();
    smoothScrollTo(tilesWrap || tilesHost || playArea);
  }
}

function goNextLine() {
  if (!game.length || quizReady || finalSubmitted) return;

  if (!isCurrentLineDone()) {
    alert("Finish marking this line first.");
    return;
  }

  if (currentLineIndex < 3) {
    currentLineIndex++;
    renderLine();
    smoothScrollTo(tilesWrap || tilesHost || playArea);
    return;
  }

  if (currentLineIndex === 3 && isAllLinesDone()) {
    openQuizNow();
  }
}

/* =========================
   Reset
   ========================= */
function resetGame() {
  game = [];
  currentLineIndex = 0;
  currentGamePayload = null;
  quizReady = false;
  finalSubmitted = false;
  quizState = null;
  lockedMeterFromFirstGana = "";
  autoQuizOpening = false;

  stopTimer();
  startTime = null;
  endTime = null;

  if (poemDisplay) poemDisplay.classList.remove("scroll-open");
  if (poemText) poemText.textContent = "Random poem will appear here...";
  if (lineNowEl) lineNowEl.textContent = "1";
  if (ansNowEl) ansNowEl.textContent = "0";
  if (totNowEl) totNowEl.textContent = "0";
  if (detNowEl) detNowEl.textContent = "Hidden";
  if (timerNowEl) timerNowEl.textContent = "00:00";
  if (origLineEl) origLineEl.textContent = "—";
  if (akCountEl) akCountEl.textContent = "0";
  if (tilesEl) tilesEl.innerHTML = "";
  if (tilesWrap) tilesWrap.classList.add("hidden");

  removeStagePanels();

  if (resultBox) {
    resultBox.classList.add("hidden");
    resultBox.innerHTML = "";
  }

  if (tilesEl) {
    tilesEl.classList.remove("hidden");
    tilesEl.style.display = "";
  }

  if (stagePill) stagePill.textContent = "Step 1: Generate poem";
  if (progressText) progressText.textContent = "Click “Generate Random Poem” to start the ML game.";
  if (lineCheckText) lineCheckText.textContent = "ఛందస్సు పూర్తి notes ఇక్కడ కనిపిస్తాయి.";

  if (prevLineBtn) prevLineBtn.style.display = "";
  if (nextLineBtn) nextLineBtn.style.display = "";

  updateGuide("", "");
  refreshHintCycle(true);
  updateNextButtonState();

  if (autoFillBtn) autoFillBtn.style.display = "none";
}

/* =========================
   Events
   ========================= */
if (loadBtn) {
  loadBtn.type = "button";
  loadBtn.onclick = loadRandomPoem;
}
if (startBtn) {
  startBtn.type = "button";
  startBtn.onclick = startGame;
}
if (resetBtn) {
  resetBtn.type = "button";
  resetBtn.onclick = resetGame;
}
if (prevLineBtn) {
  prevLineBtn.type = "button";
  prevLineBtn.onclick = goPrevLine;
}
if (nextLineBtn) {
  nextLineBtn.type = "button";
  nextLineBtn.onclick = goNextLine;
}
if (nextHintBtn) {
  nextHintBtn.type = "button";
  nextHintBtn.onclick = () => {
    const hints = getBaseHints();
    if (!hints.length) return;
    hintIndex = (hintIndex + 1) % hints.length;
    setHint(hints[hintIndex]);
  };
}

window.addEventListener("resize", () => {
  if (finalSubmitted) {
    const localReport = buildLocalReport();
    setTimeout(() => renderReportGraphs(localReport), 100);
  }
});

/* =========================
   Init
   ========================= */
resetGame();