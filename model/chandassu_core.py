import re
import unicodedata
from typing import List, Dict, Any, Optional

BOUND = '|'
VIRAMA = '్'
ANUSVARA = 'ం'
VISARGA = 'ః'
CANDRABINDU = 'ఁ'

LONG_SIGNS = {'ా', 'ీ', 'ూ', 'ే', 'ై', 'ో', 'ౌ', 'ౄ'}
MAHAPRANA = {'ఖ', 'ఘ', 'ఛ', 'ఝ', 'ఠ', 'ఢ', 'థ', 'ధ', 'ఫ', 'భ'}
LONG_VOWELS = {'ఆ', 'ఈ', 'ఊ', 'ౠ', 'ఏ', 'ఐ', 'ఓ', 'ఔ'}

# =========================================================
# Meter master data aligned with your frontend METER_INFO
# =========================================================
METERS: Dict[str, Dict[str, Any]] = {
    'ఉత్పలమాల': {
        'meter': 'ఉత్పలమాల',
        'padas': 4,
        'aksharas': 20,
        'yati': 10,
        'ganas': 'భ ర న భ భ ర వ',
        'ganas_compact': 'భరనభభరవ',
        'pattern': 'UIIUIUIIIUIIUIIUIUIU',
        'pattern_spaced': 'UII UIU III UII UII UIU IU',
        'pattern_groups': ['UII', 'UIU', 'III', 'UII', 'UII', 'UIU', 'IU'],
        'prasa': 'పాటించవలెను',
        'prasa_yati': 'ప్రాస యతి చెల్లదు',
        'first_gana': 'UII',
    },
    'చంపకమాల': {
        'meter': 'చంపకమాల',
        'padas': 4,
        'aksharas': 21,
        'yati': 11,
        'ganas': 'న జ భ జ జ జ ర',
        'ganas_compact': 'నజభజజజర',
        'pattern': 'IIIIUIUIIIUIIUIIUIUIU',
        'pattern_spaced': 'III IUI UII IUI IUI IUI UIU',
        'pattern_groups': ['III', 'IUI', 'UII', 'IUI', 'IUI', 'IUI', 'UIU'],
        'prasa': 'పాటించవలెను',
        'prasa_yati': 'ప్రాస యతి చెల్లదు',
        'first_gana': 'III',
    },
    'శార్ధూలము': {
        'meter': 'శార్ధూలము',
        'padas': 4,
        'aksharas': 19,
        'yati': 13,
        'ganas': 'మ స జ స త త గ',
        'ganas_compact': 'మసజసతతగ',
        'pattern': 'UUUIIUIUIIIUUUIUUIU',
        'pattern_spaced': 'UUU IIU IUI IIU UUI UUI U',
        'pattern_groups': ['UUU', 'IIU', 'IUI', 'IIU', 'UUI', 'UUI', 'U'],
        'prasa': 'పాటించవలెను',
        'prasa_yati': 'ప్రాస యతి చెల్లదు',
        'first_gana': 'UUU',
    },
    'మత్తేభము': {
        'meter': 'మత్తేభము',
        'padas': 4,
        'aksharas': 20,
        'yati': 14,
        'ganas': 'స భ ర న మ య వ',
        'ganas_compact': 'సభరనమయవ',
        'pattern': 'IIUUIIUIUIIIUUUIUUIU',
        'pattern_spaced': 'IIU UII UIU III UUU IUU IU',
        'pattern_groups': ['IIU', 'UII', 'UIU', 'III', 'UUU', 'IUU', 'IU'],
        'prasa': 'పాటించవలెను',
        'prasa_yati': 'ప్రాస యతి చెల్లదు',
        'first_gana': 'IIU',
    },
}

# =========================================================
# Meter aliases
# =========================================================
METER_ALIASES = {
    'ఉత్పలమాల': 'ఉత్పలమాల',
    'ఉత్పల మాల': 'ఉత్పలమాల',
    'utpalamala': 'ఉత్పలమాల',
    'utpala mala': 'ఉత్పలమాల',

    'చంపకమాల': 'చంపకమాల',
    'చంపక మాల': 'చంపకమాల',
    'champakamala': 'చంపకమాల',
    'champaka mala': 'చంపకమాల',

    'శార్ధూలము': 'శార్ధూలము',
    'శార్దూలము': 'శార్ధూలము',
    'శార్ధూలం': 'శార్ధూలము',
    'శార్దూలం': 'శార్ధూలము',
    'shardoolamu': 'శార్ధూలము',
    'shardulam': 'శార్ధూలము',
    'sardoolamu': 'శార్ధూలము',
    'sardulam': 'శార్ధూలము',

    'మత్తేభము': 'మత్తేభము',
    'మత్తేభం': 'మత్తేభము',
    'mattebhamu': 'మత్తేభము',
    'matthebhamu': 'మత్తేభము',
    'matthebham': 'మత్తేభము',
}

# =========================================================
# Utility enrichment
# =========================================================
def _compact_spaces(text: str) -> str:
    return ''.join((text or '').split())


def _ensure_meter_fields() -> None:
    for _, info in METERS.items():
        info.setdefault('meter', '')
        info.setdefault('padas', 4)
        info.setdefault('aksharas', 0)
        info.setdefault('yati', 0)
        info.setdefault('ganas', '')
        info.setdefault('ganas_compact', info['ganas'].replace(' ', '').replace('-', ''))
        info.setdefault('pattern', '')
        info.setdefault('pattern_compact', _compact_spaces(info['pattern']))
        info.setdefault('pattern_spaced', info['pattern'])
        info.setdefault('pattern_groups', info['pattern_spaced'].split() if info['pattern_spaced'] else [])
        info.setdefault('prasa', 'పాటించవలెను')
        info.setdefault('prasa_yati', 'ప్రాస యతి చెల్లదు')
        info.setdefault('first_gana', info['pattern_groups'][0] if info['pattern_groups'] else '')

        # Normalize pattern to compact form
        info['pattern'] = _compact_spaces(info['pattern'])
        info['pattern_compact'] = info['pattern']
        info['ganas_compact'] = info['ganas_compact'].replace(' ', '').replace('-', '')


_ensure_meter_fields()

# =========================================================
# Meter helpers
# =========================================================
def normalize_meter_name(name: Optional[str]) -> Optional[str]:
    if not name:
        return None

    key = unicodedata.normalize('NFC', str(name)).strip().lower()
    key = re.sub(r'\s+', ' ', key)

    if key in METER_ALIASES:
        return METER_ALIASES[key]

    raw = unicodedata.normalize('NFC', str(name)).strip()
    if raw in METERS:
        return raw

    return None


def get_meter_info(name: Optional[str]) -> Optional[Dict[str, Any]]:
    norm = normalize_meter_name(name)
    if not norm:
        return None
    return METERS.get(norm)


# =========================================================
# Telugu text cleaning
# =========================================================
def clean_for_split(line: str) -> str:
    s = unicodedata.normalize('NFC', line or '')
    s = s.replace('\u200c', '').replace('\u200d', '')
    s = re.sub(r'\s+', BOUND, s)
    s = re.sub(r'[.,;:!?“”‘’"\'\(\)\[\]{}<>]', BOUND, s)
    s = re.sub(r'[।॥]', BOUND, s)
    s = re.sub(r'[-–—]', BOUND, s)
    s = re.sub(r'[0-9A-Za-z]', '', s)
    s = re.sub(r'\|+', BOUND, s)
    s = re.sub(r'^\|+|\|+$', '', s)
    return s


def is_mark_char(ch: str) -> bool:
    c = ord(ch)
    return (
        c == 0x0C01 or c == 0x0C02 or c == 0x0C03 or
        (0x0C3E <= c <= 0x0C4D) or
        (0x0C55 <= c <= 0x0C56) or
        c == 0x0C43 or c == 0x0C44
    )


def first_base_letter_of_akshara(ak: str) -> str:
    s = ak or ''
    for ch in s:
        code = ord(ch)
        is_tel = 0x0C00 <= code <= 0x0C7F
        if is_tel and not is_mark_char(ch) and ch != VIRAMA:
            return ch
    return ''


# =========================================================
# Akshara splitting
# =========================================================
def split_aksharas_telugu(text: str) -> List[str]:
    s = text or ''
    out: List[str] = []

    def is_telugu(ch: str) -> bool:
        c = ord(ch)
        return 0x0C00 <= c <= 0x0C7F

    def is_vowel_sign(ch: str) -> bool:
        c = ord(ch)
        return (0x0C3E <= c <= 0x0C4C) or (0x0C55 <= c <= 0x0C56) or c in (0x0C43, 0x0C44)

    def is_mark(ch: str) -> bool:
        return ch in {ANUSVARA, VISARGA, CANDRABINDU, VIRAMA} or is_vowel_sign(ch)

    def is_letter(ch: str) -> bool:
        return is_telugu(ch) and not is_mark(ch)

    def take_base(i: int):
        if i >= len(s) or not is_letter(s[i]):
            return '', i

        ak = s[i]
        i += 1

        while i < len(s) and s[i] != BOUND and s[i] == VIRAMA:
            ak += s[i]
            i += 1
            if i < len(s) and s[i] != BOUND and is_letter(s[i]):
                ak += s[i]
                i += 1
            else:
                break

        while i < len(s) and s[i] != BOUND and is_vowel_sign(s[i]):
            ak += s[i]
            i += 1

        while i < len(s) and s[i] != BOUND and s[i] in {ANUSVARA, VISARGA, CANDRABINDU}:
            ak += s[i]
            i += 1

        return ak, i

    def is_dead_consonant_token(tok: str) -> bool:
        if not tok or tok == BOUND:
            return False
        if not tok.endswith(VIRAMA):
            return False
        if any(x in tok for x in [ANUSVARA, VISARGA, CANDRABINDU]):
            return False
        if any(is_vowel_sign(ch) for ch in tok):
            return False
        return True

    i = 0
    while i < len(s):
        if s[i] == BOUND:
            out.append(BOUND)
            i += 1
            continue

        c = s[i]
        if not is_telugu(c):
            i += 1
            continue

        if is_letter(c):
            ak, nxt = take_base(i)
            if ak:
                out.append(ak)
                i = nxt
                continue

        i += 1

    glued: List[str] = []
    for tok in out:
        if tok == BOUND:
            glued.append(tok)
            continue

        if glued and glued[-1] != BOUND and is_dead_consonant_token(tok):
            glued[-1] += tok
        else:
            glued.append(tok)

    return [x for x in glued if x != BOUND]


def split_aksharas(line: str) -> List[str]:
    return split_aksharas_telugu(clean_for_split(line))


# =========================================================
# Guru Laghu rules
# =========================================================
def has_long_vowel_sign(ak: str) -> bool:
    return any(ch in LONG_SIGNS for ch in (ak or ''))


def has_anusvara_visarga(ak: str) -> bool:
    s = ak or ''
    return ANUSVARA in s or VISARGA in s or CANDRABINDU in s


def ends_with_halant(ak: str) -> bool:
    return (ak or '').endswith(VIRAMA)


def is_samyukta(ak: str) -> bool:
    return VIRAMA in (ak or '')


def has_dvitva_inside(ak: str) -> bool:
    s = ak or ''
    for i in range(len(s) - 2):
        a, b, c = s[i], s[i + 1], s[i + 2]
        if b == VIRAMA and a == c and a != VIRAMA and not is_mark_char(a):
            return True
    return False


def is_mahaprana_pollu(ak: str) -> bool:
    base = first_base_letter_of_akshara(ak)
    return base in MAHAPRANA and ends_with_halant(ak)


def current_is_guru_by_itself(ak: str) -> bool:
    base = first_base_letter_of_akshara(ak)
    return (
        base in LONG_VOWELS or
        has_long_vowel_sign(ak) or
        has_anusvara_visarga(ak) or
        ends_with_halant(ak) or
        is_mahaprana_pollu(ak)
    )


def next_forces_previous_guru(aksharas: List[str], i: int) -> bool:
    if i >= len(aksharas) - 1:
        return False
    nxt = aksharas[i + 1]
    return is_samyukta(nxt) or has_dvitva_inside(nxt)


def expected_by_rules(aksharas: List[str]) -> List[str]:
    exp = ['G' if current_is_guru_by_itself(ak) else 'L' for ak in aksharas]
    for i in range(len(aksharas) - 1):
        if next_forces_previous_guru(aksharas, i):
            exp[i] = 'G'
    return exp


def aksharas_to_gl(aksharas: List[str]) -> List[str]:
    return expected_by_rules(aksharas)


# =========================================================
# UI / GL conversion
# =========================================================
def labels_to_ui(labels: List[str]) -> str:
    return ''.join('U' if x == 'G' else 'I' for x in labels)


def ui_to_gl_array(ui: str) -> List[str]:
    return ['G' if ch == 'U' else 'L' for ch in (ui or '') if ch in ('U', 'I')]


# =========================================================
# Gana helpers
# =========================================================
def gl_to_ganas(gl: List[str]) -> List[str]:
    gana_map = {
        'LLL': 'న',
        'UII': 'భ',
        'LUL': 'జ',
        'LLU': 'స',
        'LUU': 'య',
        'ULU': 'ర',
        'UUL': 'త',
        'UUU': 'మ',
    }

    ui = ''.join('U' if x == 'G' else 'I' for x in gl)
    out: List[str] = []

    for i in range(0, len(ui), 3):
        chunk = ui[i:i + 3]
        if len(chunk) == 3:
            normalized = chunk.replace('I', 'L')
            out.append(gana_map.get(normalized, '?'))
        elif len(chunk) == 1:
            out.append('గ')
        elif len(chunk) == 2:
            out.append('వ')

    return out


def ganas_string_from_labels(labels: List[str]) -> str:
    return '-'.join(gl_to_ganas(labels))


def ganas_compact_from_labels(labels: List[str]) -> str:
    return ''.join(gl_to_ganas(labels))


# =========================================================
# Meter expected pattern
# =========================================================
def meter_expected_labels(aksharas: List[str], meter_name: str) -> List[str]:
    meter_name = normalize_meter_name(meter_name)
    meter = METERS.get(meter_name) if meter_name else None
    if not meter:
        return expected_by_rules(aksharas)

    pattern = meter['pattern']
    if len(aksharas) != len(pattern):
        return expected_by_rules(aksharas)

    return ['G' if ch == 'U' else 'L' for ch in pattern]


def expected_final(aksharas: List[str], meter_name: str) -> List[str]:
    exp = meter_expected_labels(aksharas, meter_name)

    for i, ak in enumerate(aksharas):
        if current_is_guru_by_itself(ak):
            exp[i] = 'G'

    for i in range(len(aksharas) - 1):
        if next_forces_previous_guru(aksharas, i):
            exp[i] = 'G'

    return exp


def detect_meter_from_pattern(ui_pattern: str) -> Optional[str]:
    if not ui_pattern:
        return None

    compact = _compact_spaces(ui_pattern)
    for name, info in METERS.items():
        if compact == info['pattern']:
            return name
    return None


# =========================================================
# Prasa / line helpers
# =========================================================
def compute_prasa_keys(lines_aksharas: List[List[str]]) -> List[str]:
    keys = []
    for aks in lines_aksharas:
        a2 = aks[1] if len(aks) > 1 else ''
        keys.append(first_base_letter_of_akshara(a2))
    return keys


def normalize_poem_lines(poem: str) -> List[str]:
    lines = [x.strip().strip('"') for x in (poem or '').splitlines() if x.strip()]
    return lines[:4]


# =========================================================
# Analysis functions
# =========================================================
def analyze_line(line: str, meter_name: str = None) -> Dict[str, Any]:
    meter_name = normalize_meter_name(meter_name)
    meter_info = get_meter_info(meter_name)

    clean = clean_for_split(line)
    aks = split_aksharas_telugu(clean)
    rule_labels = expected_by_rules(aks)
    final_labels = expected_final(aks, meter_name) if meter_name else rule_labels

    final_ui = labels_to_ui(final_labels)
    detected = detect_meter_from_pattern(final_ui)
    ganas_list = gl_to_ganas(final_labels)

    return {
        'original': line,
        'text': line,
        'clean': clean,
        'aksharas': aks,
        'rule_labels': rule_labels,
        'final_labels': final_labels,
        'rule_ui': labels_to_ui(rule_labels),
        'final_ui': final_ui,
        'akshara_count': len(aks),
        'ganas': ganas_list,
        'ganas_str': '-'.join(ganas_list),
        'ganas_compact': ''.join(ganas_list),
        'meter': meter_name or detected,
        'meter_info': meter_info,
    }


def analyze_poem_structure(poem: str, meter_name: str = None) -> Dict[str, Any]:
    meter_name = normalize_meter_name(meter_name)
    lines = normalize_poem_lines(poem)
    analyzed_lines = []
    all_aksharas = []

    for line in lines:
        result = analyze_line(line, meter_name)
        analyzed_lines.append(result)
        all_aksharas.append(result['aksharas'])

    prasa_keys = compute_prasa_keys(all_aksharas)
    prasa_ok = len(prasa_keys) == 4 and all(k and k == prasa_keys[0] for k in prasa_keys)

    return {
        'lines': analyzed_lines,
        'prasa_keys': prasa_keys,
        'prasa_ok': prasa_ok,
        'meter_name': meter_name,
        'meter_info': get_meter_info(meter_name),
    }