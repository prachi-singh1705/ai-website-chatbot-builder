"""
SiteMind AI - Website crawler & semantic chunking engine (pure Python).

Responsibilities
    1. Fetch a URL (stdlib urllib, no external HTTP dependency).
    2. Strip boilerplate / noise nodes with BeautifulSoup.
    3. Split the page into heading-aware knowledge chunks.
    4. Extract keywords per chunk for hybrid BM25-style retrieval.
    5. Discover same-host subpages for deep crawling.
"""

from __future__ import annotations

import gzip
import io
import re
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter
from dataclasses import dataclass, field
from typing import Any

from py_backend import bootstrap  # noqa: F401

from bs4 import BeautifulSoup

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 SiteMindBot/1.0 (Python)"
)

NOISE_TAGS = [
    "script", "style", "noscript", "svg", "iframe", "canvas",
    "form", "template", "header", "footer", "nav", "aside",
]

STOP_WORDS = {
    "this", "that", "with", "from", "have", "more", "your", "will", "what",
    "when", "where", "about", "there", "their", "which", "would", "these",
    "other", "into", "some", "could", "them", "then", "also", "after",
    "been", "were", "they", "than", "here", "just", "very", "each", "over",
}

SKIP_EXTENSIONS = re.compile(
    r"\.(jpg|jpeg|png|gif|webp|pdf|zip|svg|css|js|ico|mp4|mp3|woff2?)$", re.I
)


class ScrapeError(Exception):
    """Raised when a website cannot be fetched or parsed."""


@dataclass
class Chunk:
    heading: str
    content: str
    keywords: str

    def to_dict(self) -> dict[str, str]:
        return {"heading": self.heading, "content": self.content, "keywords": self.keywords}


@dataclass
class ScrapedPage:
    url: str
    title: str
    description: str
    headings: list[str] = field(default_factory=list)
    chunks: list[Chunk] = field(default_factory=list)
    discovered_links: list[str] = field(default_factory=list)

    @property
    def raw_text(self) -> str:
        return "\n\n".join(f"{c.heading}:\n{c.content}" for c in self.chunks)

    def to_dict(self) -> dict[str, Any]:
        return {
            "url": self.url,
            "title": self.title,
            "description": self.description,
            "headings": self.headings,
            "chunks": [c.to_dict() for c in self.chunks],
            "discoveredLinks": self.discovered_links,
            "rawText": self.raw_text,
        }


# --------------------------------------------------------------------------
# Text utilities
# --------------------------------------------------------------------------
def clean_text(value: str) -> str:
    value = value.replace("\r\n", "\n").replace("\t", " ")
    value = re.sub(r"[ \u00a0]+", " ", value)
    value = re.sub(r"\n\s*\n\s*\n+", "\n\n", value)
    return value.strip()


def extract_keywords(text: str, limit: int = 15) -> str:
    words = re.sub(r"[^a-z0-9\s-]", " ", text.lower()).split()
    counter = Counter(w for w in words if len(w) > 3 and w not in STOP_WORDS)
    return ", ".join(word for word, _ in counter.most_common(limit))


def normalize_url(raw_url: str) -> str:
    candidate = (raw_url or "").strip()
    if not candidate:
        raise ScrapeError("A website URL is required.")
    if not candidate.startswith(("http://", "https://")):
        candidate = "https://" + candidate

    parsed = urllib.parse.urlparse(candidate)
    if not parsed.netloc:
        raise ScrapeError(f'Invalid URL provided: "{raw_url}"')
    return parsed.geturl()


# --------------------------------------------------------------------------
# Fetching
# --------------------------------------------------------------------------
def fetch_html(url: str, timeout: int = 12) -> str:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, identity",
        },
    )

    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            payload = response.read()
            if response.headers.get("Content-Encoding") == "gzip":
                payload = gzip.GzipFile(fileobj=io.BytesIO(payload)).read()
            charset = response.headers.get_content_charset() or "utf-8"
            return payload.decode(charset, errors="replace")
    except urllib.error.HTTPError as exc:
        raise ScrapeError(f"HTTP {exc.code} error while fetching {url}") from exc
    except urllib.error.URLError as exc:
        raise ScrapeError(f"Could not reach {url} ({exc.reason})") from exc
    except Exception as exc:  # noqa: BLE001
        raise ScrapeError(f"Failed to fetch {url}: {exc}") from exc


# --------------------------------------------------------------------------
# Parsing & chunking
# --------------------------------------------------------------------------
def parse_html(html: str, page_url: str) -> ScrapedPage:
    soup = BeautifulSoup(html, "html.parser")

    # Capture metadata before nodes are stripped.
    title = ""
    og_title = soup.find("meta", property="og:title")
    if og_title and og_title.get("content"):
        title = og_title["content"]
    elif soup.title and soup.title.string:
        title = soup.title.string

    description = ""
    for finder in (
        lambda: soup.find("meta", attrs={"name": "description"}),
        lambda: soup.find("meta", property="og:description"),
        lambda: soup.find("meta", attrs={"name": "twitter:description"}),
    ):
        tag = finder()
        if tag and tag.get("content"):
            description = tag["content"]
            break

    # Discover same-host subpages before removing navigation.
    discovered = _discover_links(soup, page_url)

    for tag_name in NOISE_TAGS:
        for node in soup.find_all(tag_name):
            node.decompose()

    root = (
        soup.find("main")
        or soup.find("article")
        or soup.find(attrs={"role": "main"})
        or soup.find(id="content")
        or soup.body
        or soup
    )

    chunks: list[Chunk] = []
    headings: list[str] = []

    description = clean_text(description)
    if description:
        chunks.append(
            Chunk("Overview & Summary", description, extract_keywords(description))
        )

    current_heading = "Main Information"
    buffer: list[str] = []

    def flush(min_length: int = 40) -> None:
        nonlocal buffer
        if not buffer:
            return
        body = clean_text("\n\n".join(buffer))
        if len(body) >= min_length:
            chunks.append(Chunk(current_heading, body, extract_keywords(body)))
        buffer = []

    for node in root.find_all(["h1", "h2", "h3", "p", "li", "td", "blockquote"]):
        text = clean_text(node.get_text(" ", strip=True))
        if not text or len(text) < 5:
            continue

        if node.name in ("h1", "h2", "h3"):
            flush()
            current_heading = text[:180]
            headings.append(current_heading)
        else:
            buffer.append(text)
            if sum(len(part) for part in buffer) > 700:
                flush(min_length=1)

    flush(min_length=30)

    # Fallback: page had no structured tags at all.
    if not chunks:
        body_text = clean_text(root.get_text("\n", strip=True))
        for index in range(0, len(body_text), 600):
            slice_text = body_text[index : index + 600]
            if slice_text.strip():
                chunks.append(
                    Chunk(
                        f"Section {len(chunks) + 1}",
                        slice_text.strip(),
                        extract_keywords(slice_text),
                    )
                )

    if not chunks:
        raise ScrapeError(
            "No readable text content was found on this page. "
            "The site may be JavaScript-rendered or blocking crawlers."
        )

    parsed_host = urllib.parse.urlparse(page_url).netloc
    return ScrapedPage(
        url=page_url,
        title=clean_text(title) or parsed_host or "Website Content",
        description=description,
        headings=headings[:20],
        chunks=chunks[:25],
        discovered_links=discovered[:8],
    )


def _discover_links(soup: BeautifulSoup, page_url: str) -> list[str]:
    host = urllib.parse.urlparse(page_url).netloc
    seen: list[str] = []
    priority_words = ("pricing", "plan", "about", "service", "product", "faq", "doc", "contact", "feature")

    for anchor in soup.find_all("a", href=True):
        href = anchor["href"].strip()
        if not href or href.startswith(("#", "mailto:", "tel:", "javascript:")):
            continue
        try:
            absolute = urllib.parse.urljoin(page_url, href)
            parsed = urllib.parse.urlparse(absolute)
        except ValueError:
            continue

        if parsed.netloc != host or SKIP_EXTENSIONS.search(parsed.path or ""):
            continue

        clean_link = f"{parsed.scheme}://{parsed.netloc}{parsed.path}".rstrip("/")
        if clean_link and clean_link != page_url.rstrip("/") and clean_link not in seen:
            seen.append(clean_link)

    # Prefer high-signal pages (pricing / about / docs) first.
    seen.sort(key=lambda link: 0 if any(w in link.lower() for w in priority_words) else 1)
    return seen


def scrape_url(raw_url: str, timeout: int = 12) -> ScrapedPage:
    url = normalize_url(raw_url)
    return parse_html(fetch_html(url, timeout=timeout), url)
