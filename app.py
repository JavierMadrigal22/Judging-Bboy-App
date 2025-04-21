from flask import Flask, render_template, request, redirect, url_for, jsonify, flash
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, login_required, current_user, logout_user
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import os
from flask_wtf.csrf import CSRFProtect
from datetime import datetime

# Configuración inicial
app = Flask(__name__)
app.secret_key = 'supersecreto_mejorado'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///breaking.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = os.path.join(app.static_folder, 'uploads')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB
app.config['ALLOWED_EXTENSIONS'] = {'png', 'jpg', 'jpeg', 'gif'}

# Extensiones
db = SQLAlchemy(app)
csrf = CSRFProtect(app) 
login_manager = LoginManager(app)
login_manager.login_view = 'login'

# --- Modelos ---
class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    aka = db.Column(db.String(100), unique=True, nullable=False)
    city = db.Column(db.String(50))
    age = db.Column(db.Integer)
    photo = db.Column(db.String(200))
    description = db.Column(db.Text)
    password_hash = db.Column(db.String(128), nullable=False)
    role = db.Column(db.String(20), default='bboy')
    nivel = db.Column(db.String(20))
    participations = db.relationship('Participation', backref='user', lazy='dynamic')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class Vote(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    judge_id = db.Column(db.Integer, nullable=False)
    category = db.Column(db.String(20), nullable=False)
    bboy_color = db.Column(db.String(10), nullable=False)
    score = db.Column(db.Integer, nullable=False)

class Competitor(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    total_points = db.Column(db.Integer, default=0)
    battles = db.Column(db.Integer, default=0)
    wins = db.Column(db.Integer, default=0)
    ties = db.Column(db.Integer, default=0)
    losses = db.Column(db.Integer, default=0)
    event_id = db.Column(db.Integer, db.ForeignKey('event.id'))  # Relación con evento
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))    # Relación con usuario

    # Relación única y bien definida
    event = db.relationship('Event', backref='competitors')
    user = db.relationship('User', backref='competitor_profiles')

class Battle(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    competitor_red = db.Column(db.String(100), nullable=False)
    competitor_blue = db.Column(db.String(100), nullable=False)
    winner = db.Column(db.String(100))
    is_tie = db.Column(db.Boolean, default=False)
    round_number = db.Column(db.Integer, nullable=False)
    
class Event(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, default=True)
    
    # Relación con participantes
    participants = db.relationship('Participation', backref='event', lazy='dynamic')


class Participation(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    event_id = db.Column(db.Integer, db.ForeignKey('event.id'))
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)

# --- Helpers ---
def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

def create_upload_folder():
    if not os.path.exists(app.config['UPLOAD_FOLDER']):
        os.makedirs(app.config['UPLOAD_FOLDER'])

# --- Configuración Login ---
@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# --- Rutas ---
@app.route('/')
@login_required
def standings1():
    return render_template('standings.html')

@app.route('/main')
@login_required
def main():
    return render_template('main.html')

@app.route('/standings')
@login_required
def standings():
    competitors = Competitor.query.order_by(
        Competitor.total_points.desc(),
        Competitor.wins.desc()
    ).all()
    return render_template('standings.html', competitors=competitors)

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        user = User.query.filter_by(aka=request.form['aka']).first()
        if user and user.check_password(request.form['password']):
            login_user(user)
            return redirect(url_for('standings'))
        flash('Credenciales inválidas', 'danger')
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

@app.route('/vote')
@login_required
def vote():
    if current_user.role != 'judge':
        flash('Acceso restringido a jueces', 'warning')
        return redirect(url_for('main'))
    return render_template('vote.html')

@csrf.exempt
@app.route('/submit_vote', methods=['POST'])
@login_required
@csrf.exempt
def submit_vote():
    try:
        data = request.get_json()
        new_vote = Vote(
            judge_id=current_user.id,
            category=data['category'],
            bboy_color=data['bboy_color'],
            score=data['score']
        )
        db.session.add(new_vote)
        db.session.commit()
        return jsonify({'status': 'success'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        try:
            # Validaciones
            if User.query.filter_by(aka=request.form['aka']).first():
                flash('Este AKA ya está registrado', 'danger')
                return redirect(url_for('register'))
            
            if int(request.form['age']) < 12:
                flash('Edad mínima 12 años', 'danger')
                return redirect(url_for('register'))

            # Manejo de archivo
            photo_path = None
            if 'photo' in request.files:
                photo = request.files['photo']
                if photo.filename != '':
                    if not allowed_file(photo.filename):
                        flash('Tipo de archivo no permitido', 'danger')
                        return redirect(url_for('register'))
                    
                    create_upload_folder()
                    filename = secure_filename(photo.filename)
                    photo_path = os.path.join('uploads', filename)
                    photo.save(os.path.join(app.static_folder, photo_path))

            # Crear usuario
            new_user = User(
                aka=request.form['aka'],
                city=request.form['city'],
                age=request.form['age'],
                nivel=request.form['nivel'],
                photo=photo_path,
                description=request.form['description']
            )
            new_user.set_password(request.form['password'])

            db.session.add(new_user)
            db.session.commit()
            flash('Registro exitoso! Puedes iniciar sesión', 'success')
            return redirect(url_for('login'))

        except Exception as e:
            db.session.rollback()
            flash(f'Error en el registro: {str(e)}', 'danger')

    return render_template('register.html')

@app.route('/profile', methods=['GET', 'POST'])
@login_required
def profile():
    if request.method == 'POST':
        try:
            # Validar AKA único
            if User.query.filter(User.aka == request.form['aka'], User.id != current_user.id).first():
                flash('Este AKA ya está en uso', 'danger')
                return redirect(url_for('profile'))

            # Actualizar datos básicos
            current_user.aka = request.form['aka']
            current_user.city = request.form['city']
            current_user.nivel = request.form['nivel']
            current_user.age = request.form['age']
            current_user.description = request.form['description']

            # Manejar nueva foto
            if 'photo' in request.files:
                photo = request.files['photo']
                if photo.filename != '':
                    if not allowed_file(photo.filename):
                        flash('Formato de imagen no válido', 'danger')
                        return redirect(url_for('profile'))
                    
                    # Eliminar foto anterior si existe
                    if current_user.photo:
                        old_photo_path = os.path.join(app.static_folder, current_user.photo)
                        if os.path.exists(old_photo_path):
                            os.remove(old_photo_path)
                    
                    # Guardar nueva foto
                    filename = secure_filename(photo.filename)
                    photo_path = os.path.join('uploads', filename)
                    photo.save(os.path.join(app.static_folder, photo_path))
                    current_user.photo = photo_path

            db.session.commit()
            flash('Perfil actualizado con éxito!', 'success')
            return redirect(url_for('profile'))

        except Exception as e:
            db.session.rollback()
            flash(f'Error al actualizar: {str(e)}', 'danger')

    return render_template('profile.html')

@app.route('/events', methods=['GET', 'POST'])
@login_required
def manage_events():
    if request.method == 'POST':
        event_name = request.form.get('event_name').strip()
        try:
            if not event_name:
                flash('El nombre de la jornada no puede estar vacío', 'danger')
            elif Event.query.filter_by(name=event_name).first():
                flash('Ya existe una jornada con ese nombre', 'danger')
            else:
                new_event = Event(name=event_name)
                db.session.add(new_event)
                db.session.commit()
                flash('Nueva jornada creada!', 'success')
                return redirect(url_for('view_event', event_id=new_event.id))
                
        except Exception as e:
            db.session.rollback()
            flash(f'Error al crear jornada: {str(e)}', 'danger')
    
    events = Event.query.order_by(Event.created_at.desc()).all()
    return render_template('events.html', events=events)

@app.route('/event/<int:event_id>', methods=['GET', 'POST'])
@login_required
def view_event(event_id):
    event = Event.query.get_or_404(event_id)
    
    if request.method == 'POST':
        action = request.form.get('action')
        
        if action == 'participate':
            # Crear participación y competidor si no existe
            if not Participation.query.filter_by(user_id=current_user.id, event_id=event_id).first():
                # Crear participación
                participation = Participation(user_id=current_user.id, event_id=event_id)
                db.session.add(participation)
                
                # Crear competidor asociado al evento
                competitor = Competitor(
                    name=current_user.aka,
                    event_id=event.id,
                    user_id=current_user.id
                )
                db.session.add(competitor)
                
                db.session.commit()
                flash('¡Registro exitoso en la jornada!', 'success')
        
        elif action == 'leave':
            # Eliminar participación y competidor
            participation = Participation.query.filter_by(user_id=current_user.id, event_id=event_id).first()
            competitor = Competitor.query.filter_by(user_id=current_user.id, event_id=event_id).first()
            
            if participation:
                db.session.delete(participation)
            if competitor:
                db.session.delete(competitor)
            
            db.session.commit()
            flash('Has abandonado la jornada', 'warning')
        
        return redirect(url_for('view_event', event_id=event_id))

    # Obtener datos para la vista
    participants = User.query.join(Participation).filter(Participation.event_id == event_id).all()
    competitors = Competitor.query.filter_by(event_id=event_id).order_by(Competitor.total_points.desc()).all()

    return render_template('event.html', 
                         event=event,
                         participants=participants,
                         competitors=competitors)

@app.context_processor
def inject_events():
    events = Event.query.order_by(Event.created_at.desc()).all()
    return dict(all_events=events)

# --- Inicialización ---
if __name__ == '__main__':
    with app.app_context():
        create_upload_folder()
        db.create_all()
        
        # Crear juez inicial si no existe
        if not User.query.filter_by(aka='juez1').first():
            judge = User(
                aka='juez1',
                city='Sede Central',
                age=35,
                description='Juez Certificado',
                role='judge'
            )
            judge.set_password('123')
            db.session.add(judge)
            db.session.commit()
    
    app.run(host='0.0.0.0', port=5000, debug=True)