# BigQuery Release Notes Tracker & Tweeter

A sleek, modern web application built with Python Flask on the backend, and plain vanilla HTML, CSS, and JavaScript on the frontend. The application tracks Google Cloud BigQuery release notes from the official feed and provides an interactive dashboard to read, filter, search, and draft tweets about specific updates.

## Features

-   **Live Feed Fetching**: Fetches and parses the official BigQuery Release Notes RSS/Atom feed from Google Cloud in real-time.
-   **Smart Server Caching**: Implements a 5-minute memory cache on the Flask server to ensure fast page loads and avoid rate limits.
-   **Incremental Filtering**: Real-time filtering by update type:
    -   🟢 **Features**
    -   🔴 **Issues/Fixes**
    -   🟡 **Changes**
    -   💗 **Deprecations**
-   **Full-Text Search**: Instantly query dates, types, or text content dynamically.
-   **X/Twitter Web Intent Integration**: Automatically formats a selected release note into a tweet.
-   **Four Tweet Style Presets**: Choose between **Excited**, **Professional**, **Techie**, or **Brief** styles. The JavaScript engine dynamically handles URL formatting and character constraints.
-   **Character Count & Budgeting**: A live visual indicator and progress bar tracks character counts (standardized to treat URLs as 23 characters, matching X's behavior). Prevents posting if the 280-character limit is exceeded.
-   **Session Tweet Log**: Saves sent tweets and drafts in the browser's `localStorage`, allowing you to copy them to the clipboard or keep track of your history.

## Project Structure

```
agy-cli-projects/
├── app.py                  # Main Flask Server
├── requirements.txt        # Python dependencies
├── README.md               # Documentation
├── static/
│   ├── css/
│   │   └── style.css       # Premium CSS styles (dark mode & glassmorphism)
│   └── js/
│       └── main.js         # Frontend application logic
└── templates/
    └── index.html          # HTML Entrypoint
```

## Setup & Running Locally

### Prerequisites

-   Python 3.10+ (tested with Python 3.14)

### Steps

1.  **Initialize Virtual Environment (Optional, already set up)**:
    ```bash
    python -m venv .venv
    ```

2.  **Activate & Install Dependencies (Optional, already set up)**:
    ```bash
    # On Windows:
    .venv\Scripts\pip install -r requirements.txt
    
    # On Linux/macOS:
    .venv/bin/pip install -r requirements.txt
    ```

3.  **Run the Flask Server**:
    ```bash
    # On Windows:
    .venv\Scripts\python app.py
    
    # On Linux/macOS:
    .venv/bin/python app.py
    ```

4.  **Open in Browser**:
    Go to [http://127.0.0.1:5000](http://127.0.0.1:5000) in your web browser.

## Tech Stack

-   **Backend**: Python, Flask, Feedparser, Requests
-   **Frontend**: Plain HTML5, Vanilla CSS3 (Custom Variables, Flexbox, Grid, Animations), Vanilla JavaScript (ES6+, DOMParser, LocalStorage, Clipboard API)
-   **Icons**: Font Awesome 6 (CDN)
-   **Fonts**: Outfit & Inter (Google Fonts)
