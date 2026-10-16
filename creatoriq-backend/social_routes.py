import requests
from fastapi import APIRouter, HTTPException

router = APIRouter(prefix="/api/social", tags=["social"])
GH = {"User-Agent": "CreatorIQ"}


@router.get("/github/{username}")
def github_profile(username: str):
    r = requests.get(f"https://api.github.com/users/{username}", headers=GH, timeout=10)
    if r.status_code == 403:
        raise HTTPException(429, "GitHub rate limit reached. Try again in an hour.")
    if r.status_code != 200:
        raise HTTPException(404, "GitHub user not found")
    u = r.json()
    rr = requests.get(f"https://api.github.com/users/{username}/repos", params={"per_page": 100, "sort": "updated"}, headers=GH, timeout=10)
    repos = rr.json() if rr.status_code == 200 else []
    langs = {}
    for x in repos:
        if x.get("language"):
            langs[x["language"]] = langs.get(x["language"], 0) + 1
    top = sorted(repos, key=lambda x: x["stargazers_count"], reverse=True)[:6]
    return {
        "name": u.get("name") or username, "handle": u["login"], "avatar": u.get("avatar_url"), "bio": u.get("bio"),
        "followers": u["followers"], "following": u["following"], "public_repos": u["public_repos"],
        "total_stars": sum(x["stargazers_count"] for x in repos), "created_at": u["created_at"],
        "repos": [{"name": x["name"], "stars": x["stargazers_count"], "forks": x["forks_count"], "language": x.get("language"), "url": x["html_url"]} for x in top],
        "languages": [{"name": k, "count": v} for k, v in sorted(langs.items(), key=lambda kv: -kv[1])[:6]],
    }


@router.get("/bluesky/{handle}")
def bluesky_profile(handle: str):
    base = "https://public.api.bsky.app/xrpc"
    r = requests.get(f"{base}/app.bsky.actor.getProfile", params={"actor": handle}, timeout=10)
    if r.status_code != 200:
        raise HTTPException(404, "Bluesky user not found. Use the full handle, e.g. bsky.app")
    d = r.json()
    fr = requests.get(f"{base}/app.bsky.feed.getAuthorFeed", params={"actor": handle, "limit": 15, "filter": "posts_no_replies"}, timeout=10)
    posts = []
    for it in (fr.json().get("feed", []) if fr.status_code == 200 else []):
        p = it["post"]
        posts.append({"text": p.get("record", {}).get("text", ""), "likes": p.get("likeCount", 0), "reposts": p.get("repostCount", 0),
                      "replies": p.get("replyCount", 0), "created_at": p.get("record", {}).get("createdAt")})
    return {
        "name": d.get("displayName") or handle, "handle": d.get("handle"), "avatar": d.get("avatar"), "bio": d.get("description"),
        "followers": d.get("followersCount", 0), "following": d.get("followsCount", 0), "posts": d.get("postsCount", 0),
        "created_at": d.get("createdAt"), "recent_posts": posts,
    }