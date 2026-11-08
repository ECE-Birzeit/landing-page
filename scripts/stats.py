"""Counts what is on the platform, for the landing page's impact strip.

Reads the four lab sites' repos through the GitHub API (no clone) and prints JSON:
manuals, experiments and code listings, in total and per lab. Run by the deploy workflow
every day; GITHUB_TOKEN is used when set (higher rate limit), but the repos are public.

With GA_PROPERTY_ID (the numeric GA4 property id) it also adds visitors from Google Analytics
since the semester in progress started teaching: students (active users) and experiment pages
opened, in total and per lab. The start date comes from bzu-course-catalog, which reads it from
Ritaj's academic calendar; without one, the visitor numbers are left out rather than guessed.
It signs in with Application Default Credentials: in the deploy, google-github-actions/auth
provides them through Workload Identity Federation (no key stored anywhere); locally,
`gcloud auth application-default login` does.
Without them, or if Analytics can't be reached, the visitor numbers are left out and the page
simply doesn't show them. Needs `pip install google-auth requests` for that part only.

    python3 scripts/stats.py > stats.json
"""

from __future__ import annotations

import json
import os
import re
import sys
import urllib.request
from datetime import datetime, timezone

ORG = "ECE-Birzeit"
LABS = ["encs4110", "encs4101", "encs5150", "encs5101"]
SKIP = ("node_modules/", ".vitepress/", "public/")
# An experiment page lives in experiments/ (encs4110 keeps its site under docs/); the index page isn't one
EXPERIMENT = re.compile(r"(^|/)experiments/(?!index\.md$)[^/]+\.md$")
FENCE = re.compile(r"^```[A-Za-z]", re.M)


def get(url: str, raw: bool = False):
    req = urllib.request.Request(url, headers={"User-Agent": "birzeit.me-stats", "Accept": "application/vnd.github.raw" if raw else "application/vnd.github+json"})
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    with urllib.request.urlopen(req, timeout=30) as r:
        body = r.read().decode("utf-8", errors="replace")
    return body if raw else json.loads(body)


def count(repo: str) -> dict:
    meta = get(f"https://api.github.com/repos/{ORG}/{repo}")
    tree = get(f"https://api.github.com/repos/{ORG}/{repo}/git/trees/{meta['default_branch']}?recursive=1")
    pages = [t["path"] for t in tree["tree"] if t["type"] == "blob" and t["path"].endswith(".md")
             and not t["path"].startswith(SKIP) and not any(f"/{s}" in t["path"] for s in SKIP)
             and os.path.basename(t["path"]) not in ("README.md", "CONTRIBUTING.md", "LICENSE.md")]
    experiments = [p for p in pages if EXPERIMENT.search(p)]
    listings = 0
    for p in pages:
        text = get(f"https://api.github.com/repos/{ORG}/{repo}/contents/{p}?ref={meta['default_branch']}", raw=True)
        listings += len(FENCE.findall(text))
    return {"experiments": len(experiments), "code_listings": listings}


CATALOG = "https://raw.githubusercontent.com/mabushelbaia/bzu-course-catalog/main/data/index.json"


def semester() -> dict | None:
    """The semester in progress and its dates, from the course catalog's index."""
    with urllib.request.urlopen(urllib.request.Request(CATALOG, headers={"User-Agent": "birzeit.me-stats"}), timeout=30) as r:
        current = json.loads(r.read()).get("current") or {}
    return current if current.get("teaching_starts") else None


def analytics() -> dict | None:
    """Visitors since the semester started, from the GA4 Data API. None when not configured."""
    prop = os.environ.get("GA_PROPERTY_ID")
    if not prop:
        return None
    import google.auth
    from google.auth.transport.requests import Request

    creds, _ = google.auth.default(scopes=["https://www.googleapis.com/auth/analytics.readonly"])
    creds.refresh(Request())
    quota = getattr(creds, "quota_project_id", None)
    term = semester()
    if not term:
        print("stats: no semester start date in the catalog, visitors left out", file=sys.stderr)
        return None
    since = term["teaching_starts"]
    hosts = {"stringFilter": {"matchType": "FULL_REGEXP", "value": "|".join(f"{l}\\.birzeit\\.me" for l in LABS)}}
    experiments = {"stringFilter": {"matchType": "CONTAINS", "value": "/experiments/"}}

    def report(dimensions: list[str], page_filter: bool, order: str | None = None, limit: int | None = None) -> list[dict]:
        filters = [{"filter": {"fieldName": "hostName", **hosts}}]
        if page_filter:
            filters.append({"filter": {"fieldName": "pagePath", **experiments}})
        body = {
            "dateRanges": [{"startDate": since, "endDate": "today"}],
            "dimensions": [{"name": d} for d in dimensions],
            "metrics": [{"name": "activeUsers"}, {"name": "screenPageViews"}],
            "dimensionFilter": {"andGroup": {"expressions": filters}},
        }
        if order:
            body["orderBys"] = [{"metric": {"metricName": order}, "desc": True}]
        if limit:
            body["limit"] = limit
        req = urllib.request.Request(
            f"https://analyticsdata.googleapis.com/v1beta/properties/{prop}:runReport",
            data=json.dumps(body).encode(), method="POST",
            headers={"Authorization": f"Bearer {creds.token}", "Content-Type": "application/json",
                     **({"x-goog-user-project": quota} if quota else {})})
        with urllib.request.urlopen(req, timeout=30) as r:
            rows = json.loads(r.read()).get("rows", [])
        return [{"dims": [d["value"] for d in row.get("dimensionValues", [])],
                 "users": int(row["metricValues"][0]["value"]), "views": int(row["metricValues"][1]["value"])} for row in rows]

    # Students are counted once across all four sites (no dimension), and once per site
    total = report([], False)
    views = report([], True)
    per_host = {r["dims"][0].split(".")[0]: r for r in report(["hostName"], False)}
    views_host = {r["dims"][0].split(".")[0]: r for r in report(["hostName"], True)}
    # For the dashboard: students per day, when in the week they read, on what device, and the
    # experiments they open most
    daily = sorted((r["dims"][0], r["users"], r["views"]) for r in report(["date"], False))
    when = [[r["dims"][0], r["dims"][1], r["views"]] for r in report(["dayOfWeek", "hour"], False)]
    devices = {r["dims"][0]: r["users"] for r in report(["deviceCategory"], False)}
    top = [{"lab": r["dims"][0].split(".")[0], "path": r["dims"][1], "title": r["dims"][2], "views": r["views"], "students": r["users"]}
           for r in report(["hostName", "pagePath", "pageTitle"], True, order="screenPageViews", limit=10)]
    return {
        "since": since,
        "term": term["name"],
        "term_dates": {k: term[k] for k in ("teaching_starts", "teaching_ends", "exams_start", "exams_end") if k in term},
        "students": total[0]["users"] if total else 0,
        "experiment_views": views[0]["views"] if views else 0,
        "labs": {l: {"students": per_host.get(l, {}).get("users", 0), "experiment_views": views_host.get(l, {}).get("views", 0)} for l in LABS},
        # date (YYYYMMDD), students, page views
        "daily": [list(d) for d in daily],
        # dayOfWeek (0 = Sunday), hour (00-23), page views
        "week_hours": when,
        "devices": devices,
        "top_experiments": top,
    }


def main() -> None:
    labs = {}
    for repo in LABS:
        try:
            labs[repo] = count(repo)
        except Exception as e:  # one unreachable repo shouldn't break the deploy
            print(f"stats: skipped {repo}: {e}", file=sys.stderr)
    out = {
        "generated_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "manuals": len(LABS),
        "experiments": sum(l["experiments"] for l in labs.values()),
        "code_listings": sum(l["code_listings"] for l in labs.values()),
        "labs": labs,
    }
    try:
        visits = analytics()
    except Exception as e:  # Analytics being down shouldn't break the deploy either
        print(f"stats: skipped analytics: {e}", file=sys.stderr)
        visits = None
    if visits:
        out["visitors"] = {"since": visits["since"], "term": visits["term"], "term_dates": visits["term_dates"],
                           "daily": visits["daily"], "week_hours": visits["week_hours"], "devices": visits["devices"],
                           "top_experiments": visits["top_experiments"], "students": visits["students"], "experiment_views": visits["experiment_views"]}
        for l, v in visits["labs"].items():
            labs.setdefault(l, {}).update(v)
    json.dump(out, sys.stdout, indent=1)
    print()


if __name__ == "__main__":
    main()
