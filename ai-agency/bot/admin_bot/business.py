"""Конфиг бизнеса: загрузка YAML-файла и проверка, что всё заполнено правильно.

Один YAML-файл описывает всё, что отличает одну нишу от другой:
название, адрес, услуги, график, частые вопросы и правила поведения ассистента.
Примеры: configs/dentistry.yaml и configs/autoservice.yaml.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date, datetime, time
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

import yaml

WEEKDAY_KEYS = ("mon", "tue", "wed", "thu", "fri", "sat", "sun")
WEEKDAY_NAMES = ("понедельник", "вторник", "среда", "четверг", "пятница", "суббота", "воскресенье")
WEEKDAY_SHORT = ("пн", "вт", "ср", "чт", "пт", "сб", "вс")

_SERVICE_ID_RE = re.compile(r"^[a-z0-9_]{1,20}$")


class ConfigError(ValueError):
    """Ошибка в конфиге. Текст по-русски — чтобы было понятно, что исправить."""


@dataclass(frozen=True)
class TimeRange:
    start: time
    end: time

    def __str__(self) -> str:
        return f"{self.start:%H:%M}–{self.end:%H:%M}"


@dataclass(frozen=True)
class Service:
    id: str
    name: str
    duration_minutes: int
    price: str | None = None
    description: str = ""

    @property
    def price_text(self) -> str:
        return self.price or "стоимость уточняет администратор"


@dataclass(frozen=True)
class FAQItem:
    question: str
    answer: str


@dataclass(frozen=True)
class Schedule:
    timezone: str
    working_hours: tuple[TimeRange | None, ...]  # 7 элементов: пн..вс, None = выходной
    breaks: tuple[TimeRange, ...]
    days_off: frozenset[date]
    slot_step_minutes: int
    booking_horizon_days: int
    min_lead_minutes: int
    capacity: int

    @property
    def tz(self) -> ZoneInfo:
        return ZoneInfo(self.timezone)

    def hours_for(self, day: date) -> TimeRange | None:
        if day in self.days_off:
            return None
        return self.working_hours[day.weekday()]


@dataclass(frozen=True)
class Business:
    name: str
    niche: str
    address: str
    phone: str
    website: str
    privacy_policy_url: str
    operator: str
    consent_text: str | None
    assistant_name: str
    assistant_tone: str
    greeting: str
    rules: tuple[str, ...]
    booking_comment_prompt: str | None
    services: tuple[Service, ...]
    faq: tuple[FAQItem, ...]
    knowledge: str
    schedule: Schedule

    def service(self, service_id: str) -> Service | None:
        for service in self.services:
            if service.id == service_id:
                return service
        return None

    @property
    def contacts_text(self) -> str:
        lines = [self.name, f"Адрес: {self.address}", f"Телефон: {self.phone}"]
        if self.website:
            lines.append(f"Сайт: {self.website}")
        lines.append("")
        lines.append("Режим работы:")
        lines.extend(schedule_lines(self.schedule))
        return "\n".join(lines)


def schedule_lines(schedule: Schedule) -> list[str]:
    lines = []
    for idx, hours in enumerate(schedule.working_hours):
        lines.append(f"{WEEKDAY_SHORT[idx]}: {hours if hours else 'выходной'}")
    if schedule.breaks:
        lines.append("Перерыв: " + ", ".join(str(b) for b in schedule.breaks))
    return lines


# ---------------------------------------------------------------- разбор YAML


def _req(data: dict[str, Any], key: str, path: str) -> Any:
    if not isinstance(data, dict) or key not in data or data[key] in (None, ""):
        raise ConfigError(f"{path}.{key}: обязательное поле не заполнено")
    return data[key]


def _str(data: dict[str, Any], key: str, path: str, default: str | None = None) -> str:
    if default is not None and (not isinstance(data, dict) or data.get(key) in (None, "")):
        return default
    value = _req(data, key, path)
    if not isinstance(value, (str, int, float)):
        raise ConfigError(f"{path}.{key}: ожидается текст")
    return str(value).strip()


def _int(data: dict[str, Any], key: str, path: str, default: int, minimum: int = 1) -> int:
    value = data.get(key, default) if isinstance(data, dict) else default
    if isinstance(value, bool) or not isinstance(value, int) or value < minimum:
        raise ConfigError(f"{path}.{key}: ожидается целое число не меньше {minimum}, получено {value!r}")
    return value


def _parse_time(text: str, path: str) -> time:
    try:
        return datetime.strptime(text.strip(), "%H:%M").time()
    except ValueError:
        raise ConfigError(f"{path}: время должно быть в формате ЧЧ:ММ, получено {text!r}") from None


def _parse_range(value: Any, path: str) -> TimeRange:
    if not isinstance(value, str) or "-" not in value:
        raise ConfigError(f"{path}: ожидается интервал вида «09:00-18:00», получено {value!r}")
    start_text, end_text = value.split("-", 1)
    rng = TimeRange(_parse_time(start_text, path), _parse_time(end_text, path))
    if rng.start >= rng.end:
        raise ConfigError(f"{path}: начало интервала должно быть раньше конца ({value!r})")
    return rng


def _parse_schedule(raw: Any) -> Schedule:
    path = "schedule"
    if not isinstance(raw, dict):
        raise ConfigError("schedule: раздел обязателен (график работы)")
    timezone = _str(raw, "timezone", path, default="Europe/Moscow")
    try:
        ZoneInfo(timezone)
    except (ZoneInfoNotFoundError, ValueError):
        raise ConfigError(f"schedule.timezone: неизвестный часовой пояс {timezone!r}") from None

    hours_raw = _req(raw, "working_hours", path)
    if not isinstance(hours_raw, dict):
        raise ConfigError("schedule.working_hours: ожидается список дней mon..sun")
    unknown = set(hours_raw) - set(WEEKDAY_KEYS)
    if unknown:
        raise ConfigError(f"schedule.working_hours: неизвестные дни {sorted(unknown)}, используйте {WEEKDAY_KEYS}")
    hours = tuple(
        _parse_range(hours_raw[key], f"schedule.working_hours.{key}") if hours_raw.get(key) else None
        for key in WEEKDAY_KEYS
    )
    if not any(hours):
        raise ConfigError("schedule.working_hours: нужен хотя бы один рабочий день")

    breaks = tuple(
        _parse_range(item, f"schedule.breaks[{i}]") for i, item in enumerate(raw.get("breaks") or [])
    )
    days_off = set()
    for i, item in enumerate(raw.get("days_off") or []):
        try:
            days_off.add(item if isinstance(item, date) else date.fromisoformat(str(item)))
        except ValueError:
            raise ConfigError(f"schedule.days_off[{i}]: дата должна быть в формате ГГГГ-ММ-ДД") from None

    return Schedule(
        timezone=timezone,
        working_hours=hours,
        breaks=breaks,
        days_off=frozenset(days_off),
        slot_step_minutes=_int(raw, "slot_step_minutes", path, default=30, minimum=5),
        booking_horizon_days=_int(raw, "booking_horizon_days", path, default=14),
        min_lead_minutes=_int(raw, "min_lead_minutes", path, default=60, minimum=0),
        capacity=_int(raw, "capacity", path, default=1),
    )


def _parse_services(raw: Any) -> tuple[Service, ...]:
    if not isinstance(raw, list) or not raw:
        raise ConfigError("services: нужен хотя бы один пункт услуги")
    services = []
    seen = set()
    for i, item in enumerate(raw):
        path = f"services[{i}]"
        service_id = _str(item, "id", path)
        if not _SERVICE_ID_RE.match(service_id):
            raise ConfigError(f"{path}.id: только латиница в нижнем регистре, цифры и _, до 20 символов ({service_id!r})")
        if service_id in seen:
            raise ConfigError(f"{path}.id: повторяется id {service_id!r}")
        seen.add(service_id)
        price = item.get("price")
        services.append(
            Service(
                id=service_id,
                name=_str(item, "name", path),
                duration_minutes=_int(item, "duration_minutes", path, default=0, minimum=5),
                price=str(price).strip() if price not in (None, "") else None,
                description=str(item.get("description") or "").strip(),
            )
        )
    return tuple(services)


def _parse_faq(raw: Any) -> tuple[FAQItem, ...]:
    items = []
    for i, item in enumerate(raw or []):
        path = f"faq[{i}]"
        items.append(FAQItem(_str(item, "q", path), _str(item, "a", path)))
    return tuple(items)


def parse_business(data: Any) -> Business:
    """Превращает словарь из YAML в объект Business (или бросает ConfigError)."""
    if not isinstance(data, dict):
        raise ConfigError("Конфиг пустой или не является YAML-словарём")
    biz = data.get("business") or {}
    assistant = data.get("assistant") or {}
    booking = data.get("booking") or {}
    assistant_name = _str(assistant, "name", "assistant", default="Администратор")
    business_name = _str(biz, "name", "business")
    greeting_default = (
        f"Здравствуйте! Я {assistant_name}, виртуальный администратор «{business_name}». "
        "Отвечу на вопросы и запишу вас на удобное время."
    )
    rules = assistant.get("rules") or []
    if not isinstance(rules, list) or not all(isinstance(r, str) for r in rules):
        raise ConfigError("assistant.rules: ожидается список строк")
    comment_prompt = booking.get("comment_prompt")
    return Business(
        name=business_name,
        niche=_str(biz, "niche", "business"),
        address=_str(biz, "address", "business"),
        phone=_str(biz, "phone", "business"),
        website=_str(biz, "website", "business", default=""),
        privacy_policy_url=_str(biz, "privacy_policy_url", "business"),
        operator=_str(biz, "operator", "business"),
        consent_text=str(biz.get("consent_text")).strip() if biz.get("consent_text") else None,
        assistant_name=assistant_name,
        assistant_tone=_str(assistant, "tone", "assistant", default="вежливо и коротко, на «вы»"),
        greeting=_str(assistant, "greeting", "assistant", default=greeting_default),
        rules=tuple(r.strip() for r in rules if r.strip()),
        booking_comment_prompt=str(comment_prompt).strip() if comment_prompt else None,
        services=_parse_services(data.get("services")),
        faq=_parse_faq(data.get("faq")),
        knowledge=str(data.get("knowledge") or "").strip(),
        schedule=_parse_schedule(data.get("schedule")),
    )


def load_business(path: str | Path) -> Business:
    """Читает YAML-файл конфига. Понятная ошибка, если файла нет или он сломан."""
    path = Path(path)
    if not path.is_file():
        raise ConfigError(f"Файл конфига не найден: {path}")
    try:
        data = yaml.safe_load(path.read_text(encoding="utf-8"))
    except yaml.YAMLError as exc:
        raise ConfigError(f"{path}: ошибка синтаксиса YAML — {exc}") from None
    try:
        return parse_business(data)
    except ConfigError as exc:
        raise ConfigError(f"{path}: {exc}") from None
