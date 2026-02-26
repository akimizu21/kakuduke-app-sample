from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from dotenv import load_dotenv
import os

load_dotenv()

app = Flask(__name__)
CORS(app)

# Secret key for session management
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')

# Database configuration
DATABASE_URL = os.environ.get('DATABASE_URL', 'postgresql://localhost/kakuzuke')
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

app.config['SQLALCHEMY_DATABASE_URI'] = DATABASE_URL
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# 格付けランク定義
RANKS = [
    {"id": 0, "name": "一流社員", "color": "#C9A227", "bgColor": "#1a1a1a"},
    {"id": 1, "name": "普通社員", "color": "#333333", "bgColor": "#ffffff"},
    {"id": 2, "name": "二流社員", "color": "#ffffff", "bgColor": "#0088cc"},
    {"id": 3, "name": "三流社員", "color": "#ffffff", "bgColor": "#ff6600"},
    {"id": 4, "name": "そっくりさん", "color": "#333333", "bgColor": "#ffcc00"},
    {"id": 5, "name": "映す価値なし", "color": "#ffffff", "bgColor": "#1a1a1a"},
]

# Models
class Game(db.Model):
    __tablename__ = 'games'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    teams = db.relationship('Team', backref='game', lazy=True, cascade='all, delete-orphan')
    questions = db.relationship('Question', backref='game', lazy=True, cascade='all, delete-orphan')

class Team(db.Model):
    __tablename__ = 'teams'
    id = db.Column(db.Integer, primary_key=True)
    game_id = db.Column(db.Integer, db.ForeignKey('games.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    rank = db.Column(db.Integer, default=0)  # 0=一流社員, 5=映す価値なし
    row_position = db.Column(db.Integer, default=0)  # 表示行位置
    answers = db.relationship('Answer', backref='team', lazy=True, cascade='all, delete-orphan')

class Question(db.Model):
    __tablename__ = 'questions'
    id = db.Column(db.Integer, primary_key=True)
    game_id = db.Column(db.Integer, db.ForeignKey('games.id'), nullable=False)
    question_number = db.Column(db.Integer, nullable=False)
    title = db.Column(db.String(200), nullable=False)
    correct_answer = db.Column(db.String(100), nullable=False)
    choices = db.Column(db.JSON, default=list)  # ["A", "B"] など
    penalty = db.Column(db.Integer, default=1)  # 不正解時のランクダウン数（1=通常, 2=2ランクダウン）
    answers = db.relationship('Answer', backref='question', lazy=True, cascade='all, delete-orphan')

class Answer(db.Model):
    __tablename__ = 'answers'
    id = db.Column(db.Integer, primary_key=True)
    team_id = db.Column(db.Integer, db.ForeignKey('teams.id'), nullable=False)
    question_id = db.Column(db.Integer, db.ForeignKey('questions.id'), nullable=False)
    answer = db.Column(db.String(100))
    is_correct = db.Column(db.Boolean)
    judged_at = db.Column(db.DateTime)

# Routes
@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "ok"})

@app.route('/api/ranks', methods=['GET'])
def get_ranks():
    return jsonify(RANKS)

# Game CRUD
@app.route('/api/games', methods=['GET'])
def get_games():
    games = Game.query.order_by(Game.created_at.desc()).all()
    return jsonify([{
        "id": g.id,
        "name": g.name,
        "created_at": g.created_at.isoformat(),
        "team_count": len(g.teams),
        "question_count": len(g.questions)
    } for g in games])

@app.route('/api/games', methods=['POST'])
def create_game():
    data = request.json
    game = Game(name=data.get('name', '新規ゲーム'))
    db.session.add(game)
    db.session.commit()
    return jsonify({"id": game.id, "name": game.name}), 201

@app.route('/api/games/<int:game_id>', methods=['GET'])
def get_game(game_id):
    game = Game.query.get_or_404(game_id)
    return jsonify({
        "id": game.id,
        "name": game.name,
        "teams": [{
            "id": t.id,
            "name": t.name,
            "rank": t.rank,
            "row_position": t.row_position
        } for t in sorted(game.teams, key=lambda x: x.row_position)],
        "questions": [{
            "id": q.id,
            "question_number": q.question_number,
            "title": q.title,
            "correct_answer": q.correct_answer,
            "choices": q.choices,
            "penalty": q.penalty if hasattr(q, 'penalty') and q.penalty else 1
        } for q in sorted(game.questions, key=lambda x: x.question_number)]
    })

@app.route('/api/games/<int:game_id>', methods=['DELETE'])
def delete_game(game_id):
    game = Game.query.get_or_404(game_id)
    db.session.delete(game)
    db.session.commit()
    return jsonify({"message": "deleted"}), 200

# Team CRUD
@app.route('/api/games/<int:game_id>/teams', methods=['POST'])
def create_team(game_id):
    game = Game.query.get_or_404(game_id)
    data = request.json
    max_row = db.session.query(db.func.max(Team.row_position)).filter(Team.game_id == game_id).scalar() or -1
    team = Team(
        game_id=game_id,
        name=data.get('name', '新規チーム'),
        rank=0,
        row_position=max_row + 1
    )
    db.session.add(team)
    db.session.commit()
    return jsonify({"id": team.id, "name": team.name, "rank": team.rank, "row_position": team.row_position}), 201

@app.route('/api/teams/<int:team_id>', methods=['PUT'])
def update_team(team_id):
    team = Team.query.get_or_404(team_id)
    data = request.json
    if 'name' in data:
        team.name = data['name']
    if 'rank' in data:
        team.rank = min(5, max(0, data['rank']))
    if 'row_position' in data:
        team.row_position = data['row_position']
    db.session.commit()
    return jsonify({"id": team.id, "name": team.name, "rank": team.rank, "row_position": team.row_position})

@app.route('/api/teams/<int:team_id>', methods=['DELETE'])
def delete_team(team_id):
    team = Team.query.get_or_404(team_id)
    db.session.delete(team)
    db.session.commit()
    return jsonify({"message": "deleted"})

@app.route('/api/teams/<int:team_id>/rank-down', methods=['POST'])
def rank_down_team(team_id):
    team = Team.query.get_or_404(team_id)
    if team.rank < 5:
        team.rank += 1
        db.session.commit()
    return jsonify({"id": team.id, "name": team.name, "rank": team.rank})

@app.route('/api/teams/<int:team_id>/reset-rank', methods=['POST'])
def reset_rank(team_id):
    team = Team.query.get_or_404(team_id)
    team.rank = 0
    db.session.commit()
    return jsonify({"id": team.id, "name": team.name, "rank": team.rank})

# Question CRUD
@app.route('/api/games/<int:game_id>/questions', methods=['POST'])
def create_question(game_id):
    game = Game.query.get_or_404(game_id)
    data = request.json
    question_count = Question.query.filter_by(game_id=game_id).count()
    if question_count >= 6:
        return jsonify({"error": "最大6問までです"}), 400
    
    question = Question(
        game_id=game_id,
        question_number=question_count + 1,
        title=data.get('title', ''),
        correct_answer=data.get('correct_answer', 'A'),
        choices=data.get('choices', ['A', 'B']),
        penalty=data.get('penalty', 1)
    )
    db.session.add(question)
    db.session.commit()
    return jsonify({
        "id": question.id,
        "question_number": question.question_number,
        "title": question.title,
        "correct_answer": question.correct_answer,
        "choices": question.choices,
        "penalty": question.penalty
    }), 201

@app.route('/api/questions/<int:question_id>', methods=['PUT'])
def update_question(question_id):
    question = Question.query.get_or_404(question_id)
    data = request.json
    if 'title' in data:
        question.title = data['title']
    if 'correct_answer' in data:
        question.correct_answer = data['correct_answer']
    if 'choices' in data:
        question.choices = data['choices']
    if 'penalty' in data:
        question.penalty = data['penalty']
    db.session.commit()
    return jsonify({
        "id": question.id,
        "question_number": question.question_number,
        "title": question.title,
        "correct_answer": question.correct_answer,
        "choices": question.choices,
        "penalty": question.penalty
    })

@app.route('/api/questions/<int:question_id>', methods=['DELETE'])
def delete_question(question_id):
    question = Question.query.get_or_404(question_id)
    game_id = question.game_id
    question_number = question.question_number
    db.session.delete(question)
    # 番号を詰める
    remaining = Question.query.filter(
        Question.game_id == game_id,
        Question.question_number > question_number
    ).all()
    for q in remaining:
        q.question_number -= 1
    db.session.commit()
    return jsonify({"message": "deleted"})

# Answer CRUD
@app.route('/api/questions/<int:question_id>/answers', methods=['GET'])
def get_answers(question_id):
    question = Question.query.get_or_404(question_id)
    answers = Answer.query.filter_by(question_id=question_id).all()
    return jsonify([{
        "id": a.id,
        "team_id": a.team_id,
        "team_name": a.team.name,
        "answer": a.answer,
        "is_correct": a.is_correct
    } for a in answers])

@app.route('/api/questions/<int:question_id>/answers', methods=['POST'])
def submit_answer(question_id):
    question = Question.query.get_or_404(question_id)
    data = request.json
    team_id = data.get('team_id')
    answer_value = data.get('answer')
    
    # 既存の回答を更新または新規作成
    answer = Answer.query.filter_by(team_id=team_id, question_id=question_id).first()
    if answer:
        answer.answer = answer_value
        # is_correctはリセットしない（judge時に前回の判定結果として使用するため）
        # judged_atもリセットしない
    else:
        answer = Answer(
            team_id=team_id,
            question_id=question_id,
            answer=answer_value
        )
        db.session.add(answer)
    db.session.commit()
    return jsonify({
        "id": answer.id,
        "team_id": answer.team_id,
        "answer": answer.answer,
        "is_correct": answer.is_correct
    })

@app.route('/api/questions/<int:question_id>/judge', methods=['POST'])
def judge_answers(question_id):
    question = Question.query.get_or_404(question_id)
    answers = Answer.query.filter_by(question_id=question_id).all()
    results = []
    
    # 問題のペナルティ値を取得（デフォルト1）
    penalty = question.penalty if hasattr(question, 'penalty') and question.penalty else 1
    
    for answer in answers:
        is_correct = answer.answer == question.correct_answer
        previous_is_correct = answer.is_correct  # 前回の判定結果を保存
        
        answer.is_correct = is_correct
        answer.judged_at = datetime.utcnow()
        
        team = Team.query.get(answer.team_id)
        rank_changed = False
        
        # ランクダウンの条件：
        # 1. 今回不正解
        # 2. 前回未判定(None)または前回正解だった場合のみランクダウン
        #    （前回も不正解だった場合は既にランクダウン済みなのでスキップ）
        if not is_correct:
            if previous_is_correct is None or previous_is_correct == True:
                # ペナルティ分ランクダウン（最大5まで）
                new_rank = min(team.rank + penalty, 5)
                if new_rank != team.rank:
                    team.rank = new_rank
                    rank_changed = True
        
        # ランクアップの条件（回答修正で正解になった場合）：
        # 前回不正解で今回正解になった場合、ランクを戻す
        if is_correct and previous_is_correct == False and team.rank > 0:
            # ペナルティ分ランクアップ（最小0まで）
            new_rank = max(team.rank - penalty, 0)
            if new_rank != team.rank:
                team.rank = new_rank
                rank_changed = True
        
        results.append({
            "team_id": team.id,
            "team_name": team.name,
            "answer": answer.answer,
            "is_correct": is_correct,
            "new_rank": team.rank,
            "rank_changed": rank_changed
        })
    
    db.session.commit()
    return jsonify(results)

# ゲーム全体の状態を取得（表示用）
@app.route('/api/games/<int:game_id>/board', methods=['GET'])
def get_board(game_id):
    game = Game.query.get_or_404(game_id)
    teams = Team.query.filter_by(game_id=game_id).order_by(Team.row_position).all()
    
    board_data = {
        "game_name": game.name,
        "ranks": RANKS,
        "teams": [{
            "id": t.id,
            "name": t.name,
            "rank": t.rank,
            "row_position": t.row_position
        } for t in teams]
    }
    return jsonify(board_data)

# 全チームのランクをリセット
@app.route('/api/games/<int:game_id>/reset', methods=['POST'])
def reset_game(game_id):
    teams = Team.query.filter_by(game_id=game_id).all()
    for team in teams:
        team.rank = 0
    Answer.query.filter(Answer.team_id.in_([t.id for t in teams])).delete(synchronize_session=False)
    db.session.commit()
    return jsonify({"message": "reset complete"})

# Initialize database
with app.app_context():
    db.create_all()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)