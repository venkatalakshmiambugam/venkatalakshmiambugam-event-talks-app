import os
import time
from flask import Flask, render_template, jsonify, request
import requests
import feedparser

app = Flask(__name__)

# Feed URL
FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# In-memory cache
cache = {
    "data": None,
    "last_fetched": 0,
    "expiry": 300 # 5 minutes cache
}

def fetch_and_parse_feed(force_refresh=False):
    current_time = time.time()
    
    # Return cached data if valid and not force-refreshing
    if not force_refresh and cache["data"] and (current_time - cache["last_fetched"] < cache["expiry"]):
        return cache["data"], cache["last_fetched"], False

    try:
        # Fetch the XML feed
        response = requests.get(FEED_URL, timeout=10)
        response.raise_for_status()
        
        # Parse XML with feedparser
        feed = feedparser.parse(response.content)
        
        if feed.bozo:
            # If feedparser failed to parse properly but returned some data, we log it
            print(f"Warning: feedparser flagged bozo exception: {feed.bozo_exception}")
            
        entries = []
        for entry in feed.entries:
            # Extract content from 'content' or 'summary'
            content_html = ""
            if 'content' in entry and entry.content:
                content_html = entry.content[0].value
            elif 'summary' in entry:
                content_html = entry.summary
                
            entries.append({
                "id": entry.get("id", ""),
                "title": entry.get("title", "Unknown Date"),
                "link": entry.get("link", ""),
                "updated": entry.get("updated", ""),
                "content": content_html
            })
            
        feed_data = {
            "title": feed.feed.get("title", "BigQuery - Release notes"),
            "link": feed.feed.get("link", "https://cloud.google.com/bigquery/docs/release-notes"),
            "entries": entries
        }
        
        # Update cache
        cache["data"] = feed_data
        cache["last_fetched"] = current_time
        return feed_data, current_time, True
        
    except Exception as e:
        print(f"Error fetching feed: {e}")
        # Fall back to cache even if expired if we encounter an error
        if cache["data"]:
            return cache["data"], cache["last_fetched"], True # True indicates it was fetched (or attempted)
        raise e

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/notes")
def get_notes():
    force_refresh = request.args.get("refresh", "false").lower() == "true"
    try:
        feed_data, last_fetched_time, bypassed_cache = fetch_and_parse_feed(force_refresh)
        
        # Format the last fetched time into human readable format
        formatted_time = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(last_fetched_time))
        
        return jsonify({
            "success": True,
            "title": feed_data["title"],
            "link": feed_data["link"],
            "last_fetched": formatted_time,
            "last_fetched_epoch": last_fetched_time,
            "bypassed_cache": bypassed_cache,
            "entries": feed_data["entries"]
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

if __name__ == "__main__":
    # Standard Flask port
    app.run(host="127.0.0.1", port=5000, debug=True)
