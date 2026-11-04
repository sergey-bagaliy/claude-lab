"""Медиа: подборки ссылок на видео и аудио (с превью) и настоящие фото мест.

• Видео, мультфильмы, аудиосказки — Claude находит их в интернете, а бот присылает
  ссылки. Telegram показывает превью (у видео — кадр, нажали — открылось).
  Бот принимает только те адреса, которые действительно нашлись в поиске:
  нейросети иногда «придумывают» ссылки, особенно на YouTube.
• Фото курортов и других мест — из Wikimedia Commons: это свободные фото
  со свободными лицензиями, ключ не нужен. Автор и лицензия подписываются под фото.
"""

from __future__ import annotations

import logging
import re
from collections.abc import Awaitable, Callable
from dataclasses import dataclass
from html import escape, unescape
from typing import Any
from urllib.parse import parse_qs, urlsplit

import aiohttp

log = logging.getLogger(__name__)

# ---------- проверка ссылок ----------


def normalize_url(url: str) -> str:
    """Ключ для сравнения ссылок: без https://, www., «/» в конце; YouTube — по номеру ролика."""
    parts = urlsplit(url.strip())
    host = parts.netloc.lower().removeprefix("www.").removeprefix("m.")
    if host == "youtu.be":
        return "youtube/" + parts.path.strip("/")
    if host == "youtube.com" and parts.path == "/watch":
        video = parse_qs(parts.query).get("v", [""])[0]
        if video:
            return "youtube/" + video
    path = parts.path.rstrip("/")
    return f"{host}{path}?{parts.query}" if parts.query else f"{host}{path}"


def is_known_url(url: Any, found: set[str], searched: bool) -> bool:
    """Ссылку можно показывать, только если она пришла из поиска.

    found — адреса из результатов поиска; если поиск был, но адреса проверить
    не удалось (found пуст), доверяем ссылке.
    """
    if (
        not isinstance(url, str)
        or not url.startswith(("https://", "http://"))
        or len(url) > 500
        or " " in url
    ):
        return False
    if not searched:
        return False
    return not found or normalize_url(url) in found


# ---------- подборка видео / аудио / ссылок ----------

MEDIA_ICONS = {"video": "🎬", "audio": "🎧", "links": "🔗"}


@dataclass(frozen=True)
class MediaItem:
    title: str
    url: str
    note: str = ""


@dataclass
class MediaCard:
    kind: str
    title: str
    items: list[MediaItem]


def _clean(value: Any, limit: int) -> str:
    return " ".join(str(value or "").split())[:limit]


def parse_media(data: dict[str, Any], found: set[str], searched: bool) -> MediaCard:
    """Проверяет данные от Claude. Ошибка (ValueError) уходит обратно Claude с объяснением."""
    kind = data.get("kind") if data.get("kind") in MEDIA_ICONS else "links"
    title = _clean(data.get("title"), 120) or "Подборка"
    raw_items = data.get("items")
    if not isinstance(raw_items, list) or not raw_items:
        raise ValueError("Передай непустой список items.")
    if not searched:
        raise ValueError(
            "Сначала найди материалы через web_search, ссылки бери только из результатов поиска."
        )

    items, rejected = [], []
    for raw in raw_items[:8]:
        if not isinstance(raw, dict):
            continue
        url = str(raw.get("url", "")).strip()
        if is_known_url(url, found, searched):
            items.append(MediaItem(_clean(raw.get("title"), 100) or url, url, _clean(raw.get("note"), 160)))
        else:
            rejected.append(url)
    if not items:
        raise ValueError(
            "Этих ссылок нет в результатах поиска: "
            + ", ".join(rejected[:5])
            + ". Используй только точные адреса из результатов web_search (можно поискать ещё раз)."
        )
    if rejected:
        log.info("Отброшены ссылки не из поиска: %s", rejected)
    return MediaCard(kind=kind, title=title, items=items[:5])


def render_media_html(card: MediaCard) -> str:
    lines = [f"{MEDIA_ICONS[card.kind]} <b>{escape(card.title)}</b>", ""]
    for number, item in enumerate(card.items, start=1):
        line = f'{number}. <a href="{escape(item.url, quote=True)}">{escape(item.title)}</a>'
        if item.note:
            line += f" — {escape(item.note)}"
        lines.append(line)
    if card.kind == "video":
        lines += ["", "Нажмите на ссылку — откроется видео. Перед показом детям загляните сами 🙂"]
    elif card.kind == "audio":
        lines += ["", "Нажмите на ссылку — откроется страница, где можно слушать."]
    return "\n".join(lines)


def media_as_text(card: MediaCard) -> str:
    """Короткая текстовая версия — сохраняется в историю разговора."""
    return f"{card.title}:\n" + "\n".join(
        f"{n}. {i.title} — {i.url}" for n, i in enumerate(card.items, start=1)
    )


# ---------- фото мест из Wikimedia Commons ----------

COMMONS_API = "https://commons.wikimedia.org/w/api.php"
# Wikimedia просит указывать в запросах понятное имя программы и ссылку на неё.
USER_AGENT = (
    "FamilyHelperBot/1.0 (personal family Telegram bot; https://github.com/sergey-bagaliy/claude-lab)"
)
PHOTO_MIME = {"image/jpeg", "image/png", "image/webp"}


@dataclass(frozen=True)
class Photo:
    url: str  # картинка ~1280 px — её Telegram скачает сам
    page_url: str  # страница фото на Wikimedia Commons (автор, лицензия)
    author: str
    license: str


@dataclass
class PhotoAlbum:
    title: str
    photos: list[Photo]


def _strip_html(value: str) -> str:
    return " ".join(unescape(re.sub(r"<[^>]+>", " ", value)).split())


def parse_commons_response(data: dict[str, Any], limit: int = 6) -> list[Photo]:
    """Разбирает ответ API Wikimedia Commons: оставляет нормальные фото, без схем и мелочи."""
    pages = (data.get("query") or {}).get("pages") or {}
    ranked = sorted(pages.values(), key=lambda page: page.get("index", 10**6))
    photos: list[Photo] = []
    for page in ranked:
        info = (page.get("imageinfo") or [{}])[0]
        width, height = info.get("width") or 0, info.get("height") or 0
        url = info.get("thumburl") or ""
        if info.get("mime") not in PHOTO_MIME or not url or width < 800 or height < 500:
            continue
        if not 0.5 <= width / height <= 2.5:  # отсекаем панорамы-ленты и столбики
            continue
        meta = info.get("extmetadata") or {}
        author = _strip_html(str((meta.get("Artist") or {}).get("value", ""))) or "неизвестен"
        license_name = (
            _strip_html(str((meta.get("LicenseShortName") or {}).get("value", ""))) or "см. страницу фото"
        )
        photos.append(Photo(url, info.get("descriptionurl") or url, author[:60], license_name[:40]))
        if len(photos) >= limit:
            break
    return photos


FetchJson = Callable[[dict[str, str]], Awaitable[dict[str, Any]]]


class WikimediaPhotos:
    """Поиск фото по запросу. fetch_json можно подменить в тестах."""

    def __init__(self, fetch_json: FetchJson | None = None) -> None:
        self._fetch = fetch_json or self._http_get_json
        self._session: aiohttp.ClientSession | None = None

    async def _http_get_json(self, params: dict[str, str]) -> dict[str, Any]:
        if self._session is None:
            self._session = aiohttp.ClientSession(
                headers={"User-Agent": USER_AGENT}, timeout=aiohttp.ClientTimeout(total=15)
            )
        async with self._session.get(COMMONS_API, params=params) as response:
            response.raise_for_status()
            return await response.json(content_type=None)

    async def search(self, query: str, limit: int = 6) -> list[Photo]:
        params = {
            "action": "query",
            "format": "json",
            "generator": "search",
            "gsrsearch": f"filetype:bitmap {query}",
            "gsrnamespace": "6",  # только файлы
            "gsrlimit": "30",
            "prop": "imageinfo",
            "iiprop": "url|mime|size|extmetadata",
            "iiextmetadatafilter": "Artist|LicenseShortName",
            "iiurlwidth": "1280",
        }
        try:
            data = await self._fetch(params)
        except Exception as error:
            log.warning("Wikimedia Commons недоступен: %s", error)
            return []
        return parse_commons_response(data, limit)

    async def close(self) -> None:
        if self._session is not None:
            await self._session.close()


def album_captions(album: PhotoAlbum) -> list[str]:
    """Подписи к фото (HTML): у первого — название места, у каждого — автор и лицензия."""
    captions = []
    for number, photo in enumerate(album.photos):
        credit = (
            f'© {escape(photo.author)} · {escape(photo.license)} · <a href="{escape(photo.page_url, quote=True)}">'
            "Wikimedia Commons</a>"
        )
        captions.append(f"📸 <b>{escape(album.title)}</b>\n{credit}" if number == 0 else credit)
    return captions
