"""Подборки видео/аудио, проверка ссылок, фото мест из Wikimedia Commons."""

import pytest

from family_bot.media import (
    MediaCard,
    MediaItem,
    PhotoAlbum,
    WikimediaPhotos,
    album_captions,
    is_known_url,
    media_as_text,
    normalize_url,
    parse_commons_response,
    parse_media,
    render_media_html,
)

from .conftest import make_photo

# ---------- ссылки ----------


@pytest.mark.parametrize(
    "url, key",
    [
        ("https://www.youtube.com/watch?v=abc123&t=10", "youtube/abc123"),
        ("https://m.youtube.com/watch?v=abc123", "youtube/abc123"),
        ("https://youtu.be/abc123", "youtube/abc123"),
        ("https://www.Example.ru/skazki/", "example.ru/skazki"),
        ("http://example.ru/skazki?id=5", "example.ru/skazki?id=5"),
    ],
)
def test_normalize_url(url, key):
    assert normalize_url(url) == key


def test_known_url_only_from_search():
    found = {normalize_url("https://www.youtube.com/watch?v=real1")}
    assert is_known_url("https://youtu.be/real1", found, searched=True)
    assert not is_known_url("https://www.youtube.com/watch?v=fake9", found, searched=True)  # придуманная
    assert not is_known_url("https://youtu.be/real1", found, searched=False)  # поиска не было
    assert is_known_url("https://site.ru/page", set(), searched=True)  # поиск был, сверить не с чем
    for bad in ("javascript:alert(1)", "ftp://x.ru", "https://a b.ru", None, 5):
        assert not is_known_url(bad, set(), searched=True)


# ---------- подборка видео / аудио ----------

VIDEO = {
    "kind": "video",
    "title": "Мультфильмы для Кати",
    "items": [
        {"title": "Ёжик в тумане", "url": "https://www.youtube.com/watch?v=real1", "note": "10 минут"},
        {"title": "Выдуманный", "url": "https://www.youtube.com/watch?v=fake9"},
    ],
}
FOUND = {normalize_url("https://www.youtube.com/watch?v=real1")}


def test_parse_media_drops_invented_links():
    card = parse_media(VIDEO, FOUND, searched=True)
    assert card.kind == "video" and card.title == "Мультфильмы для Кати"
    assert [i.title for i in card.items] == ["Ёжик в тумане"]


def test_parse_media_errors_explain_what_to_do():
    with pytest.raises(ValueError, match="web_search"):
        parse_media(VIDEO, FOUND, searched=False)
    with pytest.raises(ValueError, match="нет в результатах поиска"):
        parse_media({**VIDEO, "items": [VIDEO["items"][1]]}, FOUND, searched=True)
    with pytest.raises(ValueError, match="items"):
        parse_media({**VIDEO, "items": []}, FOUND, searched=True)


def test_unknown_kind_becomes_links():
    assert parse_media({**VIDEO, "kind": "game"}, FOUND, searched=True).kind == "links"


def test_render_media_html():
    card = MediaCard(
        "audio", "Аудио <сказки>", [MediaItem("Колобок & Ко", "https://a.ru/1?x=1&y=2", "5 мин")]
    )
    html = render_media_html(card)
    assert html.startswith("🎧 <b>Аудио &lt;сказки&gt;</b>")
    assert '1. <a href="https://a.ru/1?x=1&amp;y=2">Колобок &amp; Ко</a> — 5 мин' in html
    assert "слушать" in html
    assert "Колобок & Ко — https://a.ru/1?x=1&y=2" in media_as_text(card)


# ---------- фото из Wikimedia Commons ----------


def commons_page(
    index, mime="image/jpeg", width=4000, height=3000, thumb=True, artist="<a href='x'>Иван</a>"
):
    info = {
        "mime": mime,
        "width": width,
        "height": height,
        "url": f"https://upload.wikimedia.org/orig/{index}.jpg",
        "descriptionurl": f"https://commons.wikimedia.org/wiki/File:{index}.jpg",
        "extmetadata": {"Artist": {"value": artist}, "LicenseShortName": {"value": "CC BY-SA 4.0"}},
    }
    if thumb:
        info["thumburl"] = f"https://upload.wikimedia.org/thumb/{index}.jpg"
    return {"pageid": index, "title": f"File:{index}.jpg", "index": index, "imageinfo": [info]}


def test_parse_commons_keeps_good_photos_in_search_order():
    pages = [
        commons_page(3),
        commons_page(1),
        commons_page(2, mime="image/svg+xml"),  # схема
        commons_page(4, width=400, height=300),  # мелкое
        commons_page(5, width=9000, height=1000),  # панорама-лента
        commons_page(6, thumb=False),
        commons_page(7, artist=""),
    ]
    data = {"query": {"pages": {str(p["pageid"]): p for p in pages}}}
    photos = parse_commons_response(data, limit=6)
    assert [p.url for p in photos] == [
        "https://upload.wikimedia.org/thumb/1.jpg",
        "https://upload.wikimedia.org/thumb/3.jpg",
        "https://upload.wikimedia.org/thumb/7.jpg",
    ]
    assert photos[0].author == "Иван" and photos[0].license == "CC BY-SA 4.0"
    assert photos[2].author == "неизвестен"
    assert parse_commons_response({}, 6) == []
    assert len(parse_commons_response(data, limit=1)) == 1


async def test_wikimedia_search_request():
    seen = []

    async def fetch(params):
        seen.append(params)
        return {"query": {"pages": {"1": commons_page(1)}}}

    photos = await WikimediaPhotos(fetch_json=fetch).search("Gelendzhik beach")
    assert len(photos) == 1
    assert seen[0]["gsrsearch"] == "filetype:bitmap Gelendzhik beach"
    assert seen[0]["gsrnamespace"] == "6" and seen[0]["iiurlwidth"] == "1280"


async def test_wikimedia_unavailable_gives_empty_list():
    async def fetch(params):
        raise OSError("нет сети")

    assert await WikimediaPhotos(fetch_json=fetch).search("Sochi") == []


def test_album_captions_credit_authors():
    captions = album_captions(PhotoAlbum("Геленджик", [make_photo(1), make_photo(2)]))
    assert captions[0].startswith("📸 <b>Геленджик</b>")
    assert "© Автор 1 · CC BY-SA 4.0" in captions[0] and "Wikimedia Commons</a>" in captions[0]
    assert captions[1].startswith("© Автор 2")
