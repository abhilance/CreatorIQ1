import os
from dotenv import load_dotenv
load_dotenv()
from datetime import datetime, timedelta
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from jose import jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
import requests

from youtube_routes import router as youtube_router, snapshot_loop
from social_routes import router as social_router
from finance_routes import router as finance_router
from access_routes import router as access_router, migrate
import models
import schemas
from database import engine, get_db

# Create database tables
models.Base.metadata.create_all(bind=engine)
migrate()

app = FastAPI(
    title="CreatorIQ API",
    description="Backend API for the Creator Analytics Dashboard",
    version="1.0.0"
)

# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(youtube_router)
app.include_router(social_router)
app.include_router(finance_router)
app.include_router(access_router)


@app.on_event("startup")
async def start_snapshots():
    import asyncio
    asyncio.create_task(snapshot_loop())

# Password hashing configuration
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT configuration
SECRET_KEY = os.environ["SECRET_KEY"]
ALGORITHM = "HS256"

# YouTube Data API Configuration
YOUTUBE_API_KEY = os.environ["YOUTUBE_API_KEY"]


@app.get("/")
def read_root():
    return {"message": "Welcome to the CreatorIQ Backend API!"}


@app.get("/api/health")
def health_check():
    return {"status": "healthy", "database": "connected"}


# --- SIGNUP ROUTE ---
@app.post("/api/signup", response_model=schemas.UserResponse)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = pwd_context.hash(user.password)
    role = user.role if user.role in ("creator", "agency", "marketing") else "creator"
    if user.email.strip().lower() == os.environ.get("ADMIN_EMAIL", "").strip().lower():
        role = "admin"  # the one email set in .env becomes Administrator
    new_user = models.User(email=user.email, hashed_password=hashed_password, role=role)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


# --- LOGIN ROUTE ---
@app.post("/api/login")
def login(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if not db_user or not pwd_context.verify(user.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not db_user.is_active:
        raise HTTPException(status_code=403, detail="This account has been deactivated")
    admin_email = os.environ.get("ADMIN_EMAIL", "").strip().lower()
    if admin_email and db_user.email.lower() == admin_email and db_user.role != "admin":
        db_user.role = "admin"
        db.commit()
    expiration = datetime.utcnow() + timedelta(hours=24)
    token_data = {"sub": db_user.email, "exp": expiration}
    token = jwt.encode(token_data, SECRET_KEY, algorithm=ALGORITHM)
    return {"access_token": token, "token_type": "bearer", "role": db_user.role}


# --- OVERVIEW ANALYTICS ROUTE ---
@app.get("/api/analytics/overview")
def get_overview_data():
    performance_data = [
        {"name": "Mon", "views": 4000, "engagement": 2400},
        {"name": "Tue", "views": 3000, "engagement": 1398},
        {"name": "Wed", "views": 2000, "engagement": 9800},
        {"name": "Thu", "views": 2780, "engagement": 3908},
        {"name": "Fri", "views": 1890, "engagement": 4800},
        {"name": "Sat", "views": 2390, "engagement": 3800},
        {"name": "Sun", "views": 3490, "engagement": 4300},
    ]

    metrics = {
        "total_views": "2.4M",
        "views_trend": "+14%",
        "total_followers": "84.2K",
        "followers_trend": "+5%",
        "engagement_rate": "5.8%",
        "engagement_trend": "+1.2%",
        "est_revenue": "$4,200",
        "revenue_trend": "+8%",
    }

    return {"chart_data": performance_data, "metrics": metrics}


# --- YOUTUBE SEARCH & STATS ROUTE ---
@app.get("/api/youtube/search/{query}")
def search_youtube_channel(query: str):
    # Step 1: Search by channel name or handle
    search_url = (
        f"https://www.googleapis.com/youtube/v3/search"
        f"?part=snippet&type=channel&q={query}&maxResults=1&key={YOUTUBE_API_KEY}"
    )
    search_response = requests.get(search_url)

    if search_response.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to query YouTube search API")

    search_data = search_response.json()
    items = search_data.get("items", [])
    if not items:
        raise HTTPException(status_code=404, detail="Channel not found. Try using an exact name or handle.")

    channel_id = items[0]["snippet"]["channelId"]
    channel_title = items[0]["snippet"]["title"]

    # Step 2: Fetch detailed statistics for the discovered channel ID
    stats_url = (
        f"https://www.googleapis.com/youtube/v3/channels"
        f"?part=statistics&id={channel_id}&key={YOUTUBE_API_KEY}"
    )
    stats_response = requests.get(stats_url)

    if stats_response.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to fetch channel statistics")

    stats_data = stats_response.json()
    stats_items = stats_data.get("items", [])
    if not stats_items:
        raise HTTPException(status_code=404, detail="Channel statistics not available")

    stats = stats_items[0]["statistics"]
    return {
        "platform": "YouTube",
        "channel_name": channel_title,
        "channel_id": channel_id,
        "subscribers": stats.get("subscriberCount"),
        "total_views": stats.get("viewCount"),
        "total_videos": stats.get("videoCount"),
    }

# --- BLUESKY INTEGRATION ---
@app.get("/api/bluesky/stats/{handle}")
def get_bluesky_stats(handle: str):
    # Bluesky's open public API endpoint for fetching profile data
    url = f"https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor={handle}"
    
    response = requests.get(url)
    
    if response.status_code == 200:
        data = response.json()
        return {
            "platform": "Bluesky",
            "channel_name": data.get("displayName", handle),
            "handle": data.get("handle"),
            "subscribers": data.get("followersCount", 0),  # Mapping followers to "subscribers" for consistency
            "following": data.get("followsCount", 0),
            "total_posts": data.get("postsCount", 0)
        }
    else:
        raise HTTPException(status_code=404, detail="Bluesky user not found. Ensure you use the full handle (e.g., username.bsky.social)")

    # --- GITHUB INTEGRATION ---
@app.get("/api/github/stats/{username}")
def get_github_stats(username: str):
    # GitHub strictly requires a User-Agent header to identify the application
    headers = {"User-Agent": "CreatorIQ-Dashboard"}
    url = f"https://api.github.com/users/{username}"
    
    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        return {
            "platform": "GitHub",
            "channel_name": data.get("name") or username,
            "handle": username,
            "subscribers": data.get("followers", 0), 
            "following": data.get("following", 0),
            "total_posts": data.get("public_repos", 0) 
        }
    else:
        raise HTTPException(status_code=404, detail="GitHub user not found")

    # --- AUDIENCE ANALYTICS ROUTE ---
@app.get("/api/analytics/audience")
def get_audience_data():
    demographics = [
        {"name": "13-17", "male": 15, "female": 10},
        {"name": "18-24", "male": 35, "female": 25},
        {"name": "25-34", "male": 20, "female": 15},
        {"name": "35-44", "male": 10, "female": 8},
        {"name": "45+", "male": 5, "female": 2}
    ]
    
    locations = [
        {"country": "United States", "viewers": 45000},
        {"country": "India", "viewers": 25000},
        {"country": "United Kingdom", "viewers": 15000},
        {"country": "Canada", "viewers": 10000},
        {"country": "Australia", "viewers": 5000}
    ]

    active_hours = [
        {"time": "12 AM", "active": 2000},
        {"time": "6 AM", "active": 5000},
        {"time": "12 PM", "active": 15000},
        {"time": "6 PM", "active": 35000},
        {"time": "9 PM", "active": 25000}
    ]

    return {
        "demographics": demographics,
        "locations": locations,
        "active_hours": active_hours
    }


@app.get("/api/youtube/top-videos/{query}")
def get_top_videos(query: str):
    api_key = YOUTUBE_API_KEY
    
    # 1. Resolve the name/handle to a Channel ID
    search_channel_url = f"https://www.googleapis.com/youtube/v3/search?part=snippet&q={query}&type=channel&maxResults=1&key={api_key}"
    channel_res = requests.get(search_channel_url).json()
    
    if "items" not in channel_res or len(channel_res["items"]) == 0:
        raise HTTPException(status_code=404, detail="Could not find a YouTube channel matching that name or handle.")
        
    channel_id = channel_res["items"][0]["id"]["channelId"]
    channel_name = channel_res["items"][0]["snippet"]["title"]
    
    # 2. Search for the channel's top 5 most viewed videos using the resolved ID
    search_videos_url = f"https://www.googleapis.com/youtube/v3/search?part=snippet&channelId={channel_id}&maxResults=5&order=viewCount&type=video&key={api_key}"
    videos_res = requests.get(search_videos_url).json()
    
    if "items" not in videos_res or len(videos_res["items"]) == 0:
        raise HTTPException(status_code=404, detail="Could not fetch videos for this channel.")
        
    video_ids = [item["id"]["videoId"] for item in videos_res["items"]]
    video_ids_str = ",".join(video_ids)
    
    # 3. Fetch the actual statistics (views, likes, comments)
    stats_url = f"https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id={video_ids_str}&key={api_key}"
    stats_res = requests.get(stats_url).json()
    
    top_videos = []
    for video in stats_res.get("items", []):
        top_videos.append({
            "video_id": video["id"],
            "title": video["snippet"]["title"],
            "thumbnail": video["snippet"]["thumbnails"]["high"]["url"],
            "published_at": video["snippet"]["publishedAt"],
            "views": int(video["statistics"].get("viewCount", 0)),
            "likes": int(video["statistics"].get("likeCount", 0)),
            "comments": int(video["statistics"].get("commentCount", 0))
        })
        
    return {
        "platform": "YouTube", 
        "channel_name": channel_name,
        "top_videos": top_videos
    }