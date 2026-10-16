import asyncio
import os
import re
import statistics
from datetime import date, datetime, timezone

import requests
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import BigInteger, Column, Date, Integer, String, UniqueConstraint
from sqlalchemy.orm import Session

from database import Base, SessionLocal, get_db

router = APIRouter(prefix="/api/youtube", tags=["youtube"])
API = "https://www.googleapis.com/youtube/v3"
CPM_LOW, CPM_HIGH = 0.5, 4.0


class Snapshot(Base):
    """One row per channel per day. YouTube gives no history, so we build our own."""
    __tablename__ = "channel_snapshots"
    id = Column(Integer, primary_key=True)
    channel_id = Column(String, index=True, nullable=False)
    handle = Column(String)
    day = Column(Date, nullable=False)
    subs = Column(BigInteger, default=0)
    views = Column(BigInteger, default=0)
    videos = Column(Integer, default=0)
    long_views = Column(BigInteger, default=0)
    short_views = Column(BigInteger, default=0)
    __table_args__ = (UniqueConstraint("channel_id", "day"),)


def yt(path: str, **params):
    key = os.environ.get("YOUTUBE_API_KEY")
    if not key:
        raise HTTPException(500, "YOUTUBE_API_KEY is not set on the server")
    r = requests.get(f"{API}/{path}", params={**params, "key": key}, timeout=10)
    if r.status_code == 403:
        raise HTTPException(429, "YouTube API quota exceeded. Try again tomorrow.")
    if r.status_code != 200:
        raise HTTPException(502, "YouTube API request failed")
    return r.json()


def to_seconds(iso: str) -> int:
    m = re.fullmatch(r"PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", iso or "")
    if not m:
        return 0
    h, mi, s = (int(x or 0) for x in m.groups())
    return h * 3600 + mi * 60 + s


def parse_video(v: dict) -> dict:
    stats = v.get("statistics", {})
    secs = to_seconds(v["contentDetails"]["duration"])
    published = datetime.fromisoformat(v["snippet"]["publishedAt"].replace("Z", "+00:00"))
    views = int(stats.get("viewCount", 0))
    hours = max((datetime.now(timezone.utc) - published).total_seconds() / 3600, 1)
    return {
        "video_id": v["id"],
        "title": v["snippet"]["title"],
        "thumbnail": v["snippet"]["thumbnails"].get("medium", {}).get("url"),
        "published_at": v["snippet"]["publishedAt"],
        "duration_seconds": secs,
        "is_short": secs <= 180,  # heuristic: the API has no explicit Shorts flag
        "views": views,
        "likes": int(stats.get("likeCount", 0)),
        "comments": int(stats.get("commentCount", 0)),
        "vph": round(views / hours),
        "age_hours": int(hours),
    }


def load(handle=None, channel_id=None):
    params = {"forHandle": handle} if handle else {"id": channel_id}
    items = yt("channels", part="snippet,statistics,contentDetails", **params).get("items")
    if not items:
        raise HTTPException(404, "Channel not found. Use the exact @handle.")
    c = items[0]
    uploads = c["contentDetails"]["relatedPlaylists"]["uploads"]
    pl = yt("playlistItems", part="contentDetails", playlistId=uploads, maxResults=50)
    ids = [i["contentDetails"]["videoId"] for i in pl.get("items", [])]
    raw = yt("videos", part="snippet,statistics,contentDetails", id=",".join(ids)).get("items", []) if ids else []
    vids = [parse_video(v) for v in raw]
    for fmt in (True, False):  # outlier score = views / median views of the same format
        grp = [v["views"] for v in vids if v["is_short"] == fmt]
        med = statistics.median(grp) if grp else 0
        for v in vids:
            if v["is_short"] == fmt:
                v["outlier"] = round(v["views"] / med, 2) if med else None
    return c, vids


def save_snapshot(db: Session, c: dict, videos: list):
    st, today = c["statistics"], date.today()
    row = db.query(Snapshot).filter_by(channel_id=c["id"], day=today).first() or Snapshot(channel_id=c["id"], day=today)
    row.handle = c["snippet"].get("customUrl")
    row.subs = int(st.get("subscriberCount", 0) or 0)
    row.views = int(st.get("viewCount", 0) or 0)
    row.videos = int(st.get("videoCount", 0) or 0)
    row.long_views = sum(v["views"] for v in videos if not v["is_short"])
    row.short_views = sum(v["views"] for v in videos if v["is_short"])
    db.add(row)
    db.commit()


def history(db: Session, channel_id: str):
    rows = db.query(Snapshot).filter_by(channel_id=channel_id).order_by(Snapshot.day).all()
    out = []
    for r in rows:
        tot = (r.long_views or 0) + (r.short_views or 0)
        out.append({
            "day": r.day.isoformat(), "subs": r.subs, "views": r.views, "videos": r.videos,
            "long_share": round(r.long_views / tot, 4) if tot else 0.5,
        })
    return out


def short_num(n: int) -> str:
    for v, s in ((10**9, "B"), (10**6, "M"), (10**3, "K")):
        if n >= v:
            return f"{n / v:g}{s}"
    return str(n)


MILESTONES = {
    "subs": ([10**6, 5 * 10**6, 10**7, 25 * 10**6, 5 * 10**7, 10**8, 25 * 10**7, 5 * 10**8], "subscribers"),
    "views": ([10**9, 10**10, 25 * 10**9, 5 * 10**10, 10**11, 25 * 10**10], "views"),
    "videos": ([100, 250, 500, 750, 1000, 2000], "videos"),
}


def achievements(hist: list, current: dict):
    """Milestones already passed. The date is the first snapshot at/above it (None = before tracking)."""
    out = []
    for key, (steps, noun) in MILESTONES.items():
        for m in steps:
            if m <= current[key]:
                day = next((h["day"] for h in hist if h[key] >= m), None)
                if day and hist and hist[0]["day"] == day:
                    day = None  # already reached when tracking began, so the real date is unknown
                out.append({"kind": key, "label": f"{short_num(m)} {noun}", "day": day})
    out.sort(key=lambda a: (a["day"] is None, ""), reverse=False)
    dated = sorted([a for a in out if a["day"]], key=lambda a: a["day"], reverse=True)
    return dated + [a for a in out if not a["day"]][::-1]


def latest_insights(videos: list):
    if not videos:
        return None
    lv = dict(videos[0])
    same = [v["views"] for v in videos[1:] if v["is_short"] == lv["is_short"]]
    med = statistics.median(same) if same else 0
    lv["outlier"] = round(lv["views"] / med, 2) if med else None
    top5 = sorted(videos[:5], key=lambda v: v["views"], reverse=True)
    lv["rank_of_last_5"] = next((i + 1 for i, v in enumerate(top5) if v["video_id"] == lv["video_id"]), None)
    lv["engagement"] = round((lv["likes"] + lv["comments"]) / lv["views"] * 100, 1) if lv["views"] else 0
    lv["age_text"] = f"{lv['age_hours'] // 24} days and {lv['age_hours'] % 24} hours since upload"
    return lv


@router.get("/channel/{handle}")
def channel_overview(handle: str, db: Session = Depends(get_db)):
    handle = handle if handle.startswith("@") else f"@{handle}"
    c, videos = load(handle=handle)
    save_snapshot(db, c, videos)
    hist = history(db, c["id"])
    st = c["statistics"]
    current = {"subs": int(st.get("subscriberCount", 0) or 0), "views": int(st.get("viewCount", 0)), "videos": int(st.get("videoCount", 0))}

    long_v = [v for v in videos if not v["is_short"]]
    shorts = [v for v in videos if v["is_short"]]
    recent_views = sum(v["views"] for v in videos)
    interactions = sum(v["likes"] + v["comments"] for v in videos)
    span_days = 1
    if len(videos) > 1:
        dates = sorted(datetime.fromisoformat(v["published_at"].replace("Z", "+00:00")) for v in videos)
        span_days = max((dates[-1] - dates[0]).days, 1)

    return {
        "channel": {
            "id": c["id"], "name": c["snippet"]["title"], "handle": c["snippet"].get("customUrl", handle),
            "avatar": c["snippet"]["thumbnails"].get("high", {}).get("url"),
            "country": c["snippet"].get("country"), "joined": c["snippet"]["publishedAt"],
            "description": c["snippet"].get("description", ""),
        },
        "stats": {
            "subscribers": None if st.get("hiddenSubscriberCount") else current["subs"],
            "total_views": current["views"], "total_videos": current["videos"],
        },
        "insights": {
            "engagement_rate": round(interactions / recent_views * 100, 2) if recent_views else 0,
            "uploads_per_week": round(len(videos) / span_days * 7, 1),
            "avg_video_minutes": round(sum(v["duration_seconds"] for v in long_v) / len(long_v) / 60, 1) if long_v else 0,
            "est_earnings_recent": {
                "low": round(recent_views / 1000 * CPM_LOW), "high": round(recent_views / 1000 * CPM_HIGH),
                "note": "Estimate based on the last 50 uploads and a public CPM range",
            },
        },
        "format_split": {
            "long_form": {"uploads": len(long_v), "views": sum(v["views"] for v in long_v)},
            "shorts": {"uploads": len(shorts), "views": sum(v["views"] for v in shorts)},
        },
        "latest_video": latest_insights(videos),
        "latest_videos": videos[:10],
        "top_videos": sorted(long_v, key=lambda v: v["views"], reverse=True)[:5],
        "top_shorts": sorted(shorts, key=lambda v: v["views"], reverse=True)[:5],
        "latest_long": long_v[:5],
        "latest_shorts": shorts[:5],
        "recent_videos": [{k: v[k] for k in ("video_id", "published_at", "is_short", "views")} for v in videos],
        "history": hist,
        "achievements": achievements(hist, current),
    }


def snapshot_all():
    db = SessionLocal()
    try:
        for (cid,) in db.query(Snapshot.channel_id).distinct().all():
            try:
                c, videos = load(channel_id=cid)
                save_snapshot(db, c, videos)
            except Exception as e:  # keep the loop alive if one channel fails
                print("snapshot failed for", cid, e)
    finally:
        db.close()


async def snapshot_loop():
    """Saves a fresh snapshot for every tracked channel twice a day, even if nobody searches."""
    while True:
        await asyncio.sleep(60)
        await asyncio.to_thread(snapshot_all)
        await asyncio.sleep(12 * 3600)