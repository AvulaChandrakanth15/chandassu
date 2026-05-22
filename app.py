from pathlib import Path
import json
import math
import random
import uuid
from collections import Counter

import pandas as pd
from flask import Flask, jsonify, render_template, request, session, abort, send_from_directory

from model.chandassu_core import (
    METERS,
    analyze_poem_structure,
    expected_final,
    labels_to_ui,
    ui_to_gl_array,
    normalize_meter_name,
)
from model.train_model import char_ngrams, structure_features

BASE_DIR = Path(__file__).resolve().parent
DATA_PATH = BASE_DIR / 'data' / 'poems.csv'
MODEL_PATH = BASE_DIR / 'model' / 'meter_model.json'

EXTERNAL_ASSETS_DIR = Path(
    '/Users/s.jyothirmayudu/.cursor/projects/Users-s-jyothirmayudu-Downloads-chandassu-ai-game-2/assets'
)
EXTERNAL_BG_FILENAME = 'image-3de855d0-02b8-4528-b188-a1d18ca2316d.png'

VIDEO_BG_FILENAME = 'Chandasu bg copy.mp4'
SCROLL_INPUT_FILENAME = 'scroll input.png'
BOX_CORNER_FILENAME = 'box element.png'
ELEPHANT_FILENAME = 'elephant.png'

app = Flask(__name__)
app.secret_key = 'change-this-secret-key'


# =========================================================
# Data + model loading
# =========================================================
def load_dataset():
    df = pd.read_csv(DATA_PATH)
    df.columns = [c.strip() for c in df.columns]

    poem_col = next(c for c in df.columns if c.lower() == 'poem')
    style_col = next(c for c in df.columns if c.lower() == 'poemstyle')

    df[poem_col] = df[poem_col].fillna('').astype(str).str.strip().str.strip('"')
    df[style_col] = df[style_col].fillna('').astype(str).str.strip().map(normalize_meter_name)

    df = df[(df[poem_col] != '') & (df[style_col] != '')].copy()
    df = df[df[style_col].isin(METERS.keys())].copy()

    return df.rename(columns={poem_col: 'poem', style_col: 'poemstyle'}).reset_index(drop=True)


def ensure_model():
    if not MODEL_PATH.exists():
        from model.train_model import train
        train()
    return json.loads(MODEL_PATH.read_text(encoding='utf-8'))


DATASET = load_dataset()
MODEL = ensure_model()


# =========================================================
# ML support
# =========================================================
def cosine(counter_a, counter_b):
    if not counter_a or not counter_b:
        return 0.0
    dot = sum(v * counter_b.get(k, 0) for k, v in counter_a.items())
    na = math.sqrt(sum(v * v for v in counter_a.values()))
    nb = math.sqrt(sum(v * v for v in counter_b.values()))
    return dot / (na * nb) if na and nb else 0.0


def structure_similarity(sample_struct, class_mean):
    keys = sorted(set(sample_struct.keys()) | set(class_mean.keys()))
    if not keys:
        return 0.0

    diffs = []
    for k in keys:
        a = float(sample_struct.get(k, 0.0))
        b = float(class_mean.get(k, 0.0))
        denom = max(abs(a), abs(b), 1.0)
        diffs.append(abs(a - b) / denom)

    return max(0.0, 1.0 - (sum(diffs) / len(diffs)))


def ml_predict_meter(poem: str):
    ng = char_ngrams(poem)
    st = structure_features(poem)
    scores = []

    for meter in MODEL['labels']:
        class_ng = Counter(MODEL['class_ngrams'].get(meter, {}))
        class_st = MODEL['class_struct_means'].get(meter, {})
        score = (0.75 * cosine(ng, class_ng)) + (0.25 * structure_similarity(st, class_st))
        scores.append((meter, score))

    scores.sort(key=lambda x: x[1], reverse=True)

    total = sum(max(s, 0.0001) for _, s in scores)
    ranking = [
        {
            'meter': m,
            'confidence': round((max(s, 0.0001) / total) * 100, 2)
        }
        for m, s in scores
    ]

    best = ranking[0]['meter'] if ranking else ''
    return best, ranking


def choose_target_meter(csv_meter: str, poem: str):
    csv_meter = normalize_meter_name(csv_meter)
    ml_meter, ranking = ml_predict_meter(poem)

    final_meter = csv_meter if csv_meter in METERS else ml_meter
    reason = 'csv_label' if csv_meter in METERS else 'ml_prediction'
    return final_meter, ml_meter, ranking, reason


# =========================================================
# Helpers
# =========================================================
def safe_gl(value: str) -> str:
    if value == 'U':
        return 'G'
    if value == 'I':
        return 'L'
    if value in {'G', 'L'}:
        return value
    return ''


def normalize_user_labels(user_labels):
    out = []
    for x in (user_labels or []):
        out.append(safe_gl(str(x).strip().upper()))
    return out


def gl_to_ui(x: str) -> str:
    if x == 'G':
        return 'U'
    if x == 'L':
        return 'I'
    return '-'


def count_gl(labels):
    return {
        'guru': sum(1 for x in labels if x == 'G'),
        'laghu': sum(1 for x in labels if x == 'L'),
    }


def build_line_feedback(analysis_lines, user_lines, meter_name):
    per_line = []
    total = 0
    correct = 0
    wrong_total = 0
    perfect_lines = 0

    expected_guru_total = 0
    expected_laghu_total = 0
    user_guru_total = 0
    user_laghu_total = 0

    all_wrong_positions = []

    for idx, line in enumerate(analysis_lines):
        expected = expected_final(line['aksharas'], meter_name)
        explanations = line.get('final_explanations', [])

        incoming = user_lines[idx] if idx < len(user_lines) else {}
        user = normalize_user_labels(incoming.get('userLabels', []))
        user = list(user)[:len(expected)] + [''] * max(0, len(expected) - len(user))

        wrong_idx = [i for i, (u, e) in enumerate(zip(user, expected)) if u != e]
        line_correct = len(expected) - len(wrong_idx)
        line_total = len(expected)
        line_accuracy = round((line_correct / line_total) * 100, 2) if line_total else 0.0

        total += line_total
        correct += line_correct
        wrong_total += len(wrong_idx)

        if not wrong_idx and line_total > 0:
            perfect_lines += 1

        expected_counts = count_gl(expected)
        user_counts = count_gl(user)

        expected_guru_total += expected_counts['guru']
        expected_laghu_total += expected_counts['laghu']
        user_guru_total += user_counts['guru']
        user_laghu_total += user_counts['laghu']

        comparison_rows = []
        for i, ak in enumerate(line['aksharas']):
            row = {
                'position': i + 1,
                'akshara': ak,
                'user_label': user[i],
                'user_ui': gl_to_ui(user[i]),
                'system_label': expected[i],
                'system_ui': gl_to_ui(expected[i]),
                'status': 'correct' if user[i] == expected[i] else 'wrong',
                'reason': explanations[i]['final_reason'] if i < len(explanations) else '',
                'rule_label': explanations[i]['rule_label'] if i < len(explanations) else '',
                'rule_ui': gl_to_ui(explanations[i]['rule_label']) if i < len(explanations) else '-',
                'rule_reason': explanations[i]['rule_reason'] if i < len(explanations) else '',
                'meter_pattern_label': explanations[i]['meter_pattern_label'] if i < len(explanations) else '',
                'meter_pattern_ui': gl_to_ui(explanations[i]['meter_pattern_label']) if i < len(explanations) else '-',
                'meter_reason': explanations[i]['meter_reason'] if i < len(explanations) else '',
            }
            comparison_rows.append(row)

            if row['status'] == 'wrong':
                all_wrong_positions.append({
                    'line_number': idx + 1,
                    'position': i + 1,
                    'akshara': ak,
                    'user_label': row['user_label'] or 'blank',
                    'system_label': row['system_label'],
                    'reason': row['reason'],
                })

        per_line.append({
            'line_number': idx + 1,
            'text': line['original'],
            'original': line['original'],
            'aksharas': line['aksharas'],
            'user': user,
            'expected': expected,
            'wrongIdx': wrong_idx,
            'correct_count': line_correct,
            'total_count': line_total,
            'accuracy': line_accuracy,
            'userUI': ''.join(gl_to_ui(x) for x in user),
            'expectedUI': ''.join(gl_to_ui(x) for x in expected),
            'expectedGuru': expected_counts['guru'],
            'expectedLaghu': expected_counts['laghu'],
            'userGuru': user_counts['guru'],
            'userLaghu': user_counts['laghu'],
            'comparisonRows': comparison_rows,
        })

    graph_data = {
        'overall': {
            'correct': correct,
            'wrong': wrong_total,
            'total': total,
            'accuracy': round((correct / total) * 100, 2) if total else 0.0,
        },
        'line_accuracy': [
            {
                'line': f'Line {line["line_number"]}',
                'accuracy': line['accuracy'],
                'correct': line['correct_count'],
                'wrong': line['total_count'] - line['correct_count'],
                'total': line['total_count'],
            }
            for line in per_line
        ],
        'guru_laghu_distribution': {
            'expected': {
                'guru': expected_guru_total,
                'laghu': expected_laghu_total,
            },
            'user': {
                'guru': user_guru_total,
                'laghu': user_laghu_total,
            },
        },
        'line_wise_guru_laghu': [
            {
                'line': f'Line {line["line_number"]}',
                'expected_guru': line['expectedGuru'],
                'expected_laghu': line['expectedLaghu'],
                'user_guru': line['userGuru'],
                'user_laghu': line['userLaghu'],
            }
            for line in per_line
        ],
    }

    return (
        per_line,
        total,
        correct,
        wrong_total,
        perfect_lines,
        all_wrong_positions,
        graph_data
    )


def build_quiz_block(answer_meter, quiz):
    quiz = quiz or {}

    quiz_answers = {
        'meter': answer_meter,
        'ganas': METERS[answer_meter]['ganas_compact'],
        'pattern': METERS[answer_meter]['pattern'],
        'pattern_spaced': METERS[answer_meter]['pattern_spaced'],
    }

    meter_ok = normalize_meter_name(quiz.get('meter', '')) == answer_meter
    ganas_ok = str(quiz.get('ganas', '')).replace('-', '').replace(' ', '') == quiz_answers['ganas']
    pattern_ok = (
        str(quiz.get('pattern', '')).replace(' ', '') ==
        quiz_answers['pattern'].replace(' ', '')
    )

    quiz_score = sum([1 if meter_ok else 0, 1 if ganas_ok else 0, 1 if pattern_ok else 0])

    quiz_detail = {
        'meter': {
            'user': quiz.get('meter', ''),
            'correct': quiz_answers['meter'],
            'is_correct': meter_ok,
        },
        'ganas': {
            'user': quiz.get('ganas', ''),
            'correct': quiz_answers['ganas'],
            'correct_display': METERS[answer_meter]['ganas'],
            'is_correct': ganas_ok,
        },
        'pattern': {
            'user': quiz.get('pattern', ''),
            'correct': quiz_answers['pattern'],
            'correct_display': METERS[answer_meter]['pattern_spaced'],
            'is_correct': pattern_ok,
        },
    }

    quiz_graph = {
        'quiz_score': {
            'score': quiz_score,
            'max': 3,
            'wrong': 3 - quiz_score,
        }
    }

    return quiz_answers, quiz_detail, quiz_score, quiz_graph


def generate_ai_report(
    meter_name,
    ml_meter,
    ranking,
    per_line,
    total,
    correct,
    elapsed_seconds,
    quiz_score,
    prasa_ok,
    wrong_positions,
):
    accuracy = round((correct / total) * 100) if total else 0

    strongest_line = max(
        per_line,
        key=lambda x: x['correct_count'] / max(1, x['total_count']),
        default=None
    )
    weakest_line = min(
        per_line,
        key=lambda x: x['correct_count'] / max(1, x['total_count']),
        default=None
    )

    level = 'Beginner'
    if accuracy >= 90 and quiz_score == 3:
        level = 'Advanced'
    elif accuracy >= 75:
        level = 'Intermediate'

    if accuracy >= 90:
        summary = (
            'Excellent rhythmic understanding. The player identified most Guru-Laghu positions '
            'correctly and showed strong awareness of the meter pattern.'
        )
    elif accuracy >= 75:
        summary = (
            'Good control over the verse structure. The player understands the pattern well, '
            'but a few positions still need more careful analysis.'
        )
    elif accuracy >= 55:
        summary = (
            'The player has the basic idea of the meter. More practice is needed on Guru-Laghu '
            'identification and consistency across all four lines.'
        )
    else:
        summary = (
            'The player is still building core Chandassu recognition skills. This report highlights '
            'the exact positions and reasons for confusion.'
        )

    strengths = []
    improvements = []

    if strongest_line and strongest_line['wrongIdx'] == []:
        strengths.append(f'Line {strongest_line["line_number"]} was completely correct.')
    elif strongest_line:
        strengths.append(f'Best performance was in line {strongest_line["line_number"]}.')

    if prasa_ok:
        strengths.append('Prasa alignment is correct across the four lines.')
    else:
        improvements.append('Prasa needs more attention. Compare the second akshara sound across all four lines.')

    if elapsed_seconds <= 120 and elapsed_seconds > 0:
        strengths.append('The poem was completed quickly, showing improving confidence.')
    elif elapsed_seconds > 120:
        improvements.append('Try smaller practice poems first to improve speed and confidence.')

    if quiz_score == 3:
        strengths.append('All quiz answers were correct.')
    elif quiz_score == 2:
        improvements.append('Quiz understanding is good, but one concept still needs reinforcement.')
    else:
        improvements.append('Review the meter name, ganas, and full U/I pattern after each round.')

    if weakest_line and weakest_line['wrongIdx']:
        pos_text = ', '.join(str(i + 1) for i in weakest_line['wrongIdx'][:8])
        improvements.append(f'Line {weakest_line["line_number"]} needs the most revision at positions: {pos_text}.')

    common_mistakes = []
    for item in wrong_positions[:8]:
        common_mistakes.append(
            f'Line {item["line_number"]}, akshara {item["position"]} ({item["akshara"]}): '
            f'user marked {item["user_label"]}, correct is {item["system_label"]}. '
            f'Reason: {item["reason"]}'
        )

    coaching = [
        'Split each line into aksharas first before deciding Guru or Laghu.',
        'Check for దీర్ఘం, ం, ః, and conjunct influence before clicking.',
        'Use the first three aksharas to identify the first gana carefully.',
        f'Practice more poems of {meter_name} so the rhythm becomes natural by repetition.',
    ]

    professor_notes = [
        'This report compares user choice, rule-based decision, and final meter-aligned system target.',
        'Every wrong akshara is explained so the learner can understand the exact cause of the mistake.',
        'Line-wise performance, overall rhythm accuracy, quiz understanding, and prasa consistency are all included.',
    ]

    return {
        'player_level': level,
        'summary': summary,
        'meter_identified': meter_name,
        'ml_meter_prediction': ml_meter,
        'ml_top_predictions': ranking[:3],
        'accuracy': accuracy,
        'elapsed_seconds': elapsed_seconds,
        'strengths': strengths,
        'improvements': improvements,
        'common_mistakes': common_mistakes,
        'coaching_tips': coaching,
        'professor_notes': professor_notes,
    }


# =========================================================
# Routes
# =========================================================
@app.route('/')
def index():
    return render_template('index.html')


@app.route('/external-assets/<path:filename>')
def external_assets(filename: str):
    if filename != EXTERNAL_BG_FILENAME:
        abort(404)
    return send_from_directory(EXTERNAL_ASSETS_DIR, filename)


@app.route('/bg-video')
def bg_video():
    return send_from_directory(BASE_DIR, VIDEO_BG_FILENAME)


@app.route('/scroll-input')
def scroll_input():
    return send_from_directory(BASE_DIR, SCROLL_INPUT_FILENAME)


@app.route('/box-corner')
def box_corner():
    return send_from_directory(BASE_DIR, BOX_CORNER_FILENAME)


@app.route('/elephant-image')
def elephant_image():
    return send_from_directory(BASE_DIR, ELEPHANT_FILENAME)


@app.post('/api/game/new')
def new_game():
    row = DATASET.sample(1, random_state=random.randint(1, 10_000_000)).iloc[0]
    poem = row['poem']
    csv_meter = row['poemstyle']

    final_meter, ml_meter, ranking, reason = choose_target_meter(csv_meter, poem)
    analysis = analyze_poem_structure(poem, final_meter)

    game_id = str(uuid.uuid4())
    session['game_id'] = game_id
    session['answer_meter'] = final_meter
    session['ml_meter'] = ml_meter

    return jsonify({
        'game_id': game_id,
        'poem': poem,
        'meterLabel': csv_meter,
        'systemMeter': final_meter,
        'mlMeter': ml_meter,
        'predictionReason': reason,
        'predictions': ranking[:3],
        'analysis': analysis,
        'meterMeta': METERS.get(final_meter, {}),
    })


@app.post('/api/game/report')
def game_report():
    payload = request.get_json(force=True)

    poem = payload.get('poem', '')
    user_lines = payload.get('lines', [])
    quiz = payload.get('quiz', {}) or {}
    elapsed_seconds = int(payload.get('elapsed_seconds') or 0)

    answer_meter = session.get('answer_meter') or choose_target_meter(payload.get('meterLabel', ''), poem)[0]
    answer_meter = normalize_meter_name(answer_meter)

    analysis = analyze_poem_structure(poem, answer_meter)

    (
        per_line,
        total,
        correct,
        wrong_total,
        perfect_lines,
        wrong_positions,
        graph_data
    ) = build_line_feedback(
        analysis['lines'],
        user_lines,
        answer_meter
    )

    quiz_answers, quiz_detail, quiz_score, quiz_graph = build_quiz_block(answer_meter, quiz)
    graph_data.update(quiz_graph)

    ml_meter = session.get('ml_meter') or answer_meter
    _, ranking = ml_predict_meter(poem)

    ai_report = generate_ai_report(
        answer_meter,
        ml_meter,
        ranking,
        per_line,
        total,
        correct,
        elapsed_seconds,
        quiz_score,
        analysis['prasa_ok'],
        wrong_positions,
    )

    report_summary = {
        'answerMeter': answer_meter,
        'meterMeta': METERS[answer_meter],
        'total': total,
        'correct': correct,
        'accuracy': round((correct / total) * 100, 2) if total else 0.0,
        'wrong_total': wrong_total,
        'perfect_lines': perfect_lines,
        'prasaOK': analysis['prasa_ok'],
        'prasaKeys': analysis['prasa_keys'],
        'elapsed_seconds': elapsed_seconds,
        'quizScore': quiz_score,
        'playerLevel': ai_report['player_level'],
    }

    return jsonify({
        'answerMeter': answer_meter,
        'meterMeta': METERS[answer_meter],
        'total': total,
        'correct': correct,
        'accuracy': round((correct / total) * 100, 2) if total else 0.0,
        'wrong_total': wrong_total,
        'perfect_lines': perfect_lines,
        'prasaOK': analysis['prasa_ok'],
        'prasaKeys': analysis['prasa_keys'],
        'perLine': per_line,
        'quizAnswers': quiz_answers,
        'quizDetail': quiz_detail,
        'quizScore': quiz_score,
        'aiReport': ai_report,
        'graphData': graph_data,
        'reportSummary': report_summary,
        'systemAnalysis': analysis,
    })


if __name__ == '__main__':
    app.run(debug=True)