FROM python:3.12-slim

# Install system dependencies
# - ffmpeg, curl: existing media + healthcheck tooling
# - libpango/harfbuzz/libffi/fonts-liberation: required by WeasyPrint for
#   PDF rendering (text shaping + bundled font fallbacks).
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    libpango-1.0-0 \
    libpangoft2-1.0-0 \
    libharfbuzz0b \
    libffi-dev \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

# Install Playwright and its browser
RUN pip install --no-cache-dir playwright && \
    playwright install --with-deps chromium

# Install yt-dlp
RUN pip install --no-cache-dir yt-dlp

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
