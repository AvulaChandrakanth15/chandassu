# Chandassu AI Game

## Run

```bash
cd chandassu_ai_game
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python model/train_model.py
python app.py
```

Open: http://127.0.0.1:5000

## Project structure

- `app.py` Flask backend and APIs
- `model/train_model.py` ML training script
- `model/chandassu_core.py` Telugu akshara split and Guru-Laghu engine
- `templates/index.html` UI
- `static/js/game.js` browser gameplay logic
- `data/poems.csv` poem dataset

## APIs

- `POST /api/game/new` returns a random poem and system analysis
- `POST /api/game/report` returns AI report after player submission
