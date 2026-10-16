"""Role-based access: account settings, agency clients, admin user management."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from passlib.context import CryptContext
from pydantic import BaseModel, Field
from sqlalchemy import Column, ForeignKey, Integer, UniqueConstraint, func, inspect, or_, text
from sqlalchemy.orm import Session

import models
from database import Base, engine, get_db
from finance_routes import Notification, RevenueEntry, current_user, mine, need, summarize
from youtube_routes import Snapshot

router = APIRouter(prefix="/api", tags=["access"])
pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
ROLES = ["creator", "agency", "marketing", "admin"]


class AgencyClient(Base):
    __tablename__ = "agency_clients"
    id = Column(Integer, primary_key=True)
    agency_id = Column(Integer, ForeignKey("users.id"), index=True, nullable=False)
    client_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    __table_args__ = (UniqueConstraint("agency_id", "client_id"),)


def migrate():
    """Adds the new user columns to an existing database so current accounts keep working."""
    cols = {c["name"] for c in inspect(engine).get_columns("users")}
    with engine.begin() as conn:
        if "role" not in cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN role VARCHAR NOT NULL DEFAULT 'creator'"))
        if "full_name" not in cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN full_name VARCHAR DEFAULT ''"))


def me_dict(u):
    return {"id": u.id, "email": u.email, "role": u.role, "full_name": u.full_name or "", "is_active": u.is_active}


class NameIn(BaseModel):
    full_name: str = Field(max_length=80)


class PwdIn(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)


class ClientIn(BaseModel):
    email: str


class UserPatch(BaseModel):
    role: Optional[str] = None
    is_active: Optional[bool] = None


@router.get("/me")
def get_me(user=Depends(current_user)):
    return me_dict(user)


@router.put("/me")
def update_me(body: NameIn, user=Depends(current_user), db: Session = Depends(get_db)):
    user.full_name = body.full_name.strip()
    db.commit()
    return me_dict(user)


@router.post("/me/password")
def change_password(body: PwdIn, user=Depends(current_user), db: Session = Depends(get_db)):
    if not pwd.verify(body.current_password, user.hashed_password):
        raise HTTPException(400, "Current password is incorrect")
    user.hashed_password = pwd.hash(body.new_password)
    db.commit()
    return {"ok": True}


# ---------- Agency ----------
@router.get("/agency/clients")
def list_clients(user=Depends(need("agency")), db: Session = Depends(get_db)):
    out = []
    for link in db.query(AgencyClient).filter_by(agency_id=user.id).all():
        c = db.query(models.User).get(link.client_id)
        if not c:
            continue
        s = summarize(mine(db, c))
        out.append({"id": c.id, "email": c.email, "name": c.full_name or c.email.split("@")[0],
                    "total_earned": s["total_earned"], "this_month": s["this_month"], "pending": s["pending"],
                    "overdue": s["overdue"], "top_brand": s["top_brand"], "by_source": s["by_source"]})
    return out


@router.post("/agency/clients")
def add_client(body: ClientIn, user=Depends(need("agency")), db: Session = Depends(get_db)):
    c = db.query(models.User).filter(func.lower(models.User.email) == body.email.strip().lower()).first()
    if not c:
        raise HTTPException(404, "No account with that email. Ask the creator to sign up first.")
    if c.id == user.id or c.role != "creator":
        raise HTTPException(400, "Only Creator accounts can be added as clients")
    if db.query(AgencyClient).filter_by(agency_id=user.id, client_id=c.id).first():
        raise HTTPException(409, "Already a client")
    db.add(AgencyClient(agency_id=user.id, client_id=c.id)); db.commit()
    return {"ok": True}


@router.delete("/agency/clients/{client_id}")
def remove_client(client_id: int, user=Depends(need("agency")), db: Session = Depends(get_db)):
    db.query(AgencyClient).filter_by(agency_id=user.id, client_id=client_id).delete()
    db.commit()
    return {"ok": True}


# ---------- Admin ----------
@router.get("/admin/stats")
def admin_stats(user=Depends(need("admin")), db: Session = Depends(get_db)):
    by_role = {r: n for r, n in db.query(models.User.role, func.count()).group_by(models.User.role).all()}
    return {"total_users": sum(by_role.values()), "by_role": {r: by_role.get(r, 0) for r in ROLES},
            "revenue_entries": db.query(RevenueEntry).count(),
            "tracked_channels": db.query(Snapshot.channel_id).distinct().count()}


@router.get("/admin/users")
def admin_users(user=Depends(need("admin")), db: Session = Depends(get_db)):
    counts = dict(db.query(RevenueEntry.user_id, func.count()).group_by(RevenueEntry.user_id).all())
    return [{**me_dict(u), "entries": counts.get(u.id, 0),
             "created_at": u.created_at.isoformat() if u.created_at else None}
            for u in db.query(models.User).order_by(models.User.id).all()]


@router.put("/admin/users/{uid}")
def admin_update(uid: int, body: UserPatch, user=Depends(need("admin")), db: Session = Depends(get_db)):
    u = db.query(models.User).get(uid)
    if not u:
        raise HTTPException(404, "User not found")
    if u.id == user.id:
        raise HTTPException(400, "You cannot change your own role or status")
    if body.role is not None:
        if body.role not in ROLES:
            raise HTTPException(422, f"role must be one of {ROLES}")
        u.role = body.role
    if body.is_active is not None:
        u.is_active = body.is_active
    db.commit()
    return me_dict(u)


@router.delete("/admin/users/{uid}")
def admin_delete(uid: int, user=Depends(need("admin")), db: Session = Depends(get_db)):
    u = db.query(models.User).get(uid)
    if not u:
        raise HTTPException(404, "User not found")
    if u.id == user.id:
        raise HTTPException(400, "You cannot delete your own account")
    db.query(RevenueEntry).filter_by(user_id=uid).delete()
    db.query(Notification).filter_by(user_id=uid).delete()
    db.query(AgencyClient).filter(or_(AgencyClient.agency_id == uid, AgencyClient.client_id == uid)).delete(synchronize_session=False)
    db.delete(u); db.commit()
    return {"deleted": uid}