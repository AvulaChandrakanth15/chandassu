from pathlib import Path
import json
from collections import Counter, defaultdict
import math
import statistics
import pandas as pd
import sys

BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from model.chandassu_core import (
    analyze_poem_structure,
    normalize_poem_lines,
    normalize_meter_name,
    METERS,
)

DATA_PATH = BASE_DIR / "data" / "poems.csv"
MODEL_PATH = BASE_DIR / "model" / "meter_model.json"


# =========================================================
# Text features
# =========================================================
def char_ngrams(text: str, n_values=(2, 3, 4)):
    """Extract character n-grams from text."""
    text = str(text or "").strip()
    if not text:
        return Counter()
    
    # Keep only meaningful characters (remove excessive whitespace)
    text = "".join(ch for ch in text if ch.strip() or ord(ch) > 127)
    
    feats = Counter()
    for n in n_values:
        for i in range(len(text) - n + 1):
            feats[text[i:i + n]] += 1
    return feats


# =========================================================
# Structural features from chandassu_core
# =========================================================
def structure_features(poem: str):
    analysis = analyze_poem_structure(poem)
    lines = analysis.get("lines", [])

    counts = [len(line.get("aksharas", [])) for line in lines]
    gurus = [line.get("final_labels", []).count("G") for line in lines]
    laghus = [line.get("final_labels", []).count("L") for line in lines]

    return {
        "line_count": len(normalize_poem_lines(poem)),
        "total_aksharas": sum(counts),
        "avg_aksharas": round(sum(counts) / len(counts), 3) if counts else 0,
        "min_aksharas": min(counts) if counts else 0,
        "max_aksharas": max(counts) if counts else 0,
        "total_gurus": sum(gurus),
        "total_laghus": sum(laghus),
        "prasa_ok": 1 if analysis.get("prasa_ok") else 0,
    }


# =========================================================
# CSV loading and cleanup
# =========================================================
def find_required_column(columns, target_name):
    for c in columns:
        if c.strip().lower() == target_name.lower():
            return c
    raise ValueError(f"Required column '{target_name}' not found in CSV.")


def load_and_clean_dataset(csv_path: Path) -> pd.DataFrame:
    df = pd.read_csv(csv_path)
    df.columns = [c.strip() for c in df.columns]

    poem_col = find_required_column(df.columns, "poem")
    style_col = find_required_column(df.columns, "poemstyle")

    df[poem_col] = (
        df[poem_col]
        .fillna("")
        .astype(str)
        .str.strip()
        .str.strip('"')
    )

    df[style_col] = (
        df[style_col]
        .fillna("")
        .astype(str)
        .str.strip()
        .map(normalize_meter_name)
    )

    # Keep only valid rows
    valid_styles = set(METERS.keys())
    df = df[(df[poem_col] != "") & (df[style_col].isin(valid_styles))].copy()

    # Standardize columns
    df = df.rename(columns={poem_col: "poem", style_col: "poemstyle"})
    df.reset_index(drop=True, inplace=True)
    return df


# =========================================================
# Training
# =========================================================
def train():
    df = load_and_clean_dataset(DATA_PATH)

    if df.empty:
        raise ValueError("Dataset is empty after cleaning. Check poems.csv and poemstyle values.")

    class_ngrams = defaultdict(Counter)
    class_counts = Counter()
    class_struct_sums = defaultdict(lambda: Counter())
    class_struct_values = defaultdict(lambda: defaultdict(list))

    for _, row in df.iterrows():
        poem = row["poem"]
        meter = row["poemstyle"]

        ng = char_ngrams(poem)
        st = structure_features(poem)

        class_ngrams[meter].update(ng)
        class_counts[meter] += 1
        class_struct_sums[meter].update(st)

        for k, v in st.items():
            class_struct_values[meter][k].append(v)

    class_struct_means = {}
    class_struct_std = {}

    for meter in class_counts:
        cnt = class_counts[meter]
        class_struct_means[meter] = {
            k: class_struct_sums[meter][k] / cnt
            for k in class_struct_sums[meter]
        }

        class_struct_std[meter] = {}
        for k, values in class_struct_values[meter].items():
            class_struct_std[meter][k] = statistics.pstdev(values) if len(values) > 1 else 0.0

    payload = {
        "labels": sorted(class_counts.keys()),
        "class_counts": dict(class_counts),
        "class_ngrams": {k: dict(v) for k, v in class_ngrams.items()},
        "class_struct_means": class_struct_means,
        "class_struct_std": class_struct_std,
        "meters_info": METERS,
        "dataset_size": int(len(df)),
    }

    MODEL_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Saved model to {MODEL_PATH}")
    print(f"Trained on {len(df)} poems")
    print("Class distribution:")
    for label, count in sorted(class_counts.items()):
        print(f"  {label}: {count}")


# =========================================================
# Model loading
# =========================================================
def load_model():
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Model file not found: {MODEL_PATH}")
    return json.loads(MODEL_PATH.read_text(encoding="utf-8"))


# =========================================================
# Naive scoring-based prediction
# Combines char ngrams + structure similarity
# =========================================================
def log_prob_ngram_score(poem: str, label: str, model: dict, alpha: float = 1.0) -> float:
    poem_ngrams = char_ngrams(poem)
    class_ngrams = Counter(model["class_ngrams"].get(label, {}))

    vocab_size = max(1, len(class_ngrams))
    total_count = sum(class_ngrams.values())

    score = 0.0
    for ng, cnt in poem_ngrams.items():
        prob = (class_ngrams.get(ng, 0) + alpha) / (total_count + alpha * vocab_size)
        score += cnt * math.log(prob)
    return score


def structure_similarity_score(poem: str, label: str, model: dict) -> float:
    st = structure_features(poem)
    means = model["class_struct_means"].get(label, {})
    stds = model.get("class_struct_std", {}).get(label, {})

    score = 0.0
    for k, observed in st.items():
        mu = means.get(k, 0.0)
        sigma = stds.get(k, 0.0)

        # Avoid divide-by-zero and keep similarity stable
        sigma = sigma if sigma > 1e-6 else 1.0
        z = abs(observed - mu) / sigma
        score -= z
    return score


def predict_meter(poem: str, model: dict):
    labels = model["labels"]
    scored = []

    for label in labels:
        ngram_score = log_prob_ngram_score(poem, label, model)
        struct_score = structure_similarity_score(poem, label, model)

        total_score = (0.65 * ngram_score) + (0.35 * struct_score)
        scored.append({
            "label": label,
            "ngram_score": ngram_score,
            "structure_score": struct_score,
            "total_score": total_score,
        })

    scored.sort(key=lambda x: x["total_score"], reverse=True)
    best = scored[0]["label"] if scored else ""
    return best, scored


# =========================================================
# Player performance report
# Input:
#   poem: poem text
#   player_lines: [
#       {"aksharas": [...], "userLabels": ["G","L",...]}
#   ]
#   quiz_answers: {"meter": "...", "ganas": "...", "pattern": "..."}
# =========================================================
def generate_player_report(poem: str, player_lines: list, quiz_answers: dict = None) -> dict:
    """Generate comprehensive player performance report with graph-ready data."""
    try:
        quiz_answers = quiz_answers or {}
        player_lines = player_lines or []
        
        analysis = analyze_poem_structure(poem)
        if not analysis:
            raise ValueError("Failed to analyze poem structure")
            
        locked_meter = analysis.get("meter_name", "")
        meter_info = analysis.get("meter_info") or {}

        total = 0
        correct = 0
        per_line = []
        common_mistakes = []

        correct_pattern = meter_info.get("pattern", "") if meter_info else ""
        correct_pattern_spaced = meter_info.get("pattern_spaced", "") if meter_info else ""
        correct_ganas = meter_info.get("ganas_compact", "") if meter_info else ""

        analysis_lines = analysis.get("lines", [])
        
        if not analysis_lines:
            raise ValueError("No lines to analyze in poem")

        for idx, sys_line in enumerate(analysis_lines):
            player_line = player_lines[idx] if idx < len(player_lines) else {}
            user_labels = player_line.get("userLabels", []) if player_line else []
            expected = sys_line.get("final_labels", []) if sys_line else []

            if not isinstance(user_labels, list):
                user_labels = []
            if not isinstance(expected, list):
                expected = []

            wrong_positions = []
            compare_len = min(len(user_labels), len(expected))

            line_correct = 0
            for i in range(compare_len):
                total += 1
                if user_labels[i] == expected[i]:
                    correct += 1
                    line_correct += 1
                else:
                    wrong_positions.append(i + 1)
                    aksh = sys_line.get("aksharas", []) if sys_line else []
                    ak = aksh[i] if i < len(aksh) else "—"
                    common_mistakes.append(
                        f"Line {idx + 1}, akshara {i + 1} ({ak}): player marked {user_labels[i]}, correct is {expected[i]}."
                    )

            # Handle length mismatches
            if len(user_labels) < len(expected):
                for i in range(len(user_labels), len(expected)):
                    total += 1
                    wrong_positions.append(i + 1)
                    aksh = sys_line.get("aksharas", []) if sys_line else []
                    ak = aksh[i] if i < len(aksh) else "—"
                    common_mistakes.append(
                        f"Line {idx + 1}, akshara {i + 1} ({ak}): player skipped, correct is {expected[i]}."
                    )

            line_total = len(expected)
            line_accuracy = round((line_correct / line_total) * 100, 2) if line_total else 0

            per_line.append({
                "line": idx + 1,
                "text": sys_line.get("text", "") if sys_line else "",
                "aksharas": sys_line.get("aksharas", []) if sys_line else [],
                "user": user_labels,
                "expected": expected,
                "userUI": "".join("U" if x == "G" else "I" for x in user_labels),
                "expectedUI": sys_line.get("final_ui", "") if sys_line else "",
                "wrong_positions": wrong_positions,
                "line_accuracy": line_accuracy,
                "yati": sys_line.get("yati", {}) if sys_line else {},
                "prasa": sys_line.get("prasa", {}) if sys_line else {},
            })

        accuracy = round((correct / total) * 100, 2) if total > 0 else 0

        # Quiz score calculation with proper key handling
        quiz_score = 0
        meter_answer = quiz_answers.get("meter", "")
        ganas_answer = quiz_answers.get("ganas", "")
        pattern_answer = quiz_answers.get("pattern", "")

        # Meter check
        if meter_answer and meter_answer == locked_meter:
            quiz_score += 1
        
        # Ganas check
        if ganas_answer and ganas_answer == correct_ganas:
            quiz_score += 1
        
        # Pattern check - handle both spaced and compact patterns
        if pattern_answer:
            if pattern_answer == correct_pattern_spaced or pattern_answer == correct_pattern:
                quiz_score += 1
            # Also try removing spaces for comparison
            elif pattern_answer.replace(" ", "") == correct_pattern:
                quiz_score += 1

        strengths = []
        improvements = []

        if accuracy >= 90:
            strengths.append("Guru/Laghu placement చాలా బాగా చేశారు.")
        elif accuracy >= 75:
            strengths.append("Pattern మీద మంచి అవగాహన ఉంది.")
            improvements.append("కొన్ని స్థానాల్లో marking consistency మెరుగుపరచాలి.")
        else:
            improvements.append("మొదటి గణం fix చేసిన తర్వాత పూర్తి pattern ను జాగ్రత్తగా అనుసరించాలి.")

        if analysis.get("prasa_ok"):
            strengths.append("Prasa alignment looks good.")
        else:
            improvements.append("ప్రతి పాదంలో 2వ అక్షరంతో ప్రాసను చెక్ చేయాలి.")

        # Ensure we have graph data even if meter_info is missing
        guru_count = sum(line["expected"].count("G") for line in per_line)
        laghu_count = sum(line["expected"].count("L") for line in per_line)
        player_guru_count = sum(line["user"].count("G") for line in per_line)
        player_laghu_count = sum(line["user"].count("L") for line in per_line)

        # Graph-ready data for frontend charts
        graph_data = {
            "line_accuracy": [
                {"line": item["line"], "accuracy": item["line_accuracy"]}
                for item in per_line
            ],
            "quiz_score": {
                "score": quiz_score,
                "max_score": 3
            },
            "overall": {
                "correct": correct,
                "wrong": max(0, total - correct),
                "accuracy": accuracy
            },
            "guru_laghu_distribution": {
                "guru": guru_count,
                "laghu": laghu_count,
                "player_guru": player_guru_count,
                "player_laghu": player_laghu_count,
            }
        }

        report = {
            "answerMeter": locked_meter,
            "meterInfo": meter_info if meter_info else {},
            "correct": correct,
            "total": total,
            "accuracy": accuracy,
            "quizScore": quiz_score,
            "quizAnswers": {
                "meter": locked_meter,
                "ganas": correct_ganas,
                "pattern": correct_pattern,
                "patternSpaced": correct_pattern_spaced,
            },
            "perLine": per_line,
            "prasaOK": analysis.get("prasa_ok", False),
            "prasaKeys": analysis.get("prasa_keys", []),
            "aiReport": {
                "summary": f"ఈ పద్యానికి సరైన ఛందస్సు {locked_meter}. మొత్తం Guru-Laghu score {accuracy}%.",
                "strengths": strengths,
                "improvements": improvements,
                "common_mistakes": common_mistakes[:10],
                "coaching_tips": analysis.get("global_hints", []),
            },
            "graphData": graph_data,
        }

        return report
        
    except Exception as e:
        # Return a minimal valid report on error
        import traceback
        print(f"Error in generate_player_report: {str(e)}")
        traceback.print_exc()
        
        return {
            "answerMeter": "—",
            "meterInfo": {},
            "correct": 0,
            "total": 0,
            "accuracy": 0,
            "quizScore": 0,
            "quizAnswers": {"meter": "—", "ganas": "—", "pattern": "—", "patternSpaced": "—"},
            "perLine": [],
            "prasaOK": False,
            "prasaKeys": [],
            "aiReport": {
                "summary": f"Report generation error: {str(e)}",
                "strengths": [],
                "improvements": ["Report generation failed. Please try again."],
                "common_mistakes": [],
                "coaching_tips": [],
            },
            "graphData": {
                "line_accuracy": [],
                "quiz_score": {"score": 0, "max_score": 3},
                "overall": {"correct": 0, "wrong": 0, "accuracy": 0},
                "guru_laghu_distribution": {"guru": 0, "laghu": 0, "player_guru": 0, "player_laghu": 0},
            },
        }

    plt.figure(figsize=(8, 4))
    plt.bar(x, y)
    plt.ylim(0, 100)
    plt.xlabel("Lines")
    plt.ylabel("Accuracy (%)")
    plt.title("Line-wise Accuracy")
    plt.tight_layout()
    plt.savefig(output_dir / "line_accuracy.png")
    plt.close()

    # 2. Overall correct vs wrong
    overall = report["graphData"]["overall"]
    plt.figure(figsize=(5, 5))
    plt.pie(
        [overall["correct"], overall["wrong"]],
        labels=["Correct", "Wrong"],
        autopct="%1.1f%%"
    )
    plt.title("Overall Performance")
    plt.tight_layout()
    plt.savefig(output_dir / "overall_performance.png")
    plt.close()

    # 3. Guru / Laghu comparison
    dist = report["graphData"]["guru_laghu_distribution"]
    labels = ["Guru", "Laghu"]
    expected_vals = [dist["guru"], dist["laghu"]]
    player_vals = [dist["player_guru"], dist["player_laghu"]]

    import numpy as np
    idx = np.arange(len(labels))
    width = 0.35

    plt.figure(figsize=(7, 4))
    plt.bar(idx - width / 2, expected_vals, width, label="System")
    plt.bar(idx + width / 2, player_vals, width, label="Player")
    plt.xticks(idx, labels)
    plt.ylabel("Count")
    plt.title("Guru / Laghu Distribution")
    plt.legend()
    plt.tight_layout()
    plt.savefig(output_dir / "guru_laghu_distribution.png")
    plt.close()

    return {
        "line_accuracy_chart": str(output_dir / "line_accuracy.png"),
        "overall_chart": str(output_dir / "overall_performance.png"),
        "guru_laghu_chart": str(output_dir / "guru_laghu_distribution.png"),
    }


if __name__ == "__main__":
    train()