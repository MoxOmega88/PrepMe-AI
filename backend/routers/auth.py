"""
Auth router — signup / login, returns JWT
"""
import uuid
import datetime
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
import bcrypt
from jose import jwt

from db.database import get_db
from db.models import User, MasteryScore
from db.crud import get_user_by_email, create
from config import get_settings

router = APIRouter(prefix="/api/auth", tags=["Auth"])
settings = get_settings()

def _hash(password: str) -> str:
    return bcrypt.hashpw(password[:72].encode(), bcrypt.gensalt()).decode()

def _verify(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password[:72].encode(), hashed.encode())

# ── Science topics seeded at signup ───────────────────────────────────────────
SCIENCE_TOPICS = {
    "Exploring the Investigative World of Science": 0.5,
    "The Invisible Living World: Beyond Our Naked Eye": 0.5,
    "Health: The Ultimate Treasure": 0.5,
    "Electricity: Magnetic and Heating Effects": 0.5,
    "Exploring Forces": 0.5,
    "Pressure, Winds, Storms, and Cyclones": 0.5,
    "Particulate Nature of Matter": 0.5,
    "Nature of Matter: Elements, Compounds, and Mixtures": 0.5,
    "The Amazing World of Solutes, Solvents, and Solutions": 0.5,
    "Light: Mirrors and Lenses": 0.5,
    "Keeping Time with the Skies": 0.5,
}

MATHS_TOPICS = {
    "Rational Numbers": 0.5,
    "Linear Equations": 0.5,
    "Understanding Quadrilaterals": 0.5,
    "Practical Geometry": 0.5,
    "Data Handling": 0.5,
    "Squares & Square Roots": 0.5,
    "Cubes & Cube Roots": 0.5,
    "Comparing Quantities": 0.5,
    "Algebraic Expressions": 0.5,
    "Mensuration": 0.5,
    "Exponents & Powers": 0.5,
    "Direct & Inverse Proportions": 0.5,
    "Factorisation": 0.5,
    "Introduction to Graphs": 0.5,
    "Playing with Numbers": 0.5,
}


def _make_token(user_id: str) -> str:
    expire = datetime.datetime.utcnow() + datetime.timedelta(minutes=settings.access_token_expire_minutes)
    return jwt.encode(
        {"sub": user_id, "exp": expire},
        settings.secret_key,
        algorithm=settings.algorithm,
    )


class SignupRequest(BaseModel):
    name: str
    email: str
    password: str
    subject: str = "science"  # "science" | "maths"


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/signup")
async def signup(req: SignupRequest, db: AsyncSession = Depends(get_db)):
    existing = await get_user_by_email(db, req.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    subject = req.subject.lower()
    if subject not in ("science", "maths"):
        subject = "science"

    user = User(
        id=uuid.uuid4(),
        name=req.name,
        email=req.email,
        hashed_password=_hash(req.password),
        subject=subject,
    )
    await create(db, user)

    # Seed mastery rows
    topics = SCIENCE_TOPICS if subject == "science" else MATHS_TOPICS
    for topic, score in topics.items():
        await create(db, MasteryScore(
            id=uuid.uuid4(),
            user_id=user.id,
            topic=topic,
            score=score,
            sessions_done=0,
        ))

    return {"access_token": _make_token(str(user.id)), "token_type": "bearer"}


@router.post("/login")
async def login(req: LoginRequest, db: AsyncSession = Depends(get_db)):
    user = await get_user_by_email(db, req.email)
    if not user or not _verify(req.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"access_token": _make_token(str(user.id)), "token_type": "bearer"}
