"""Общение с Claude через официальный SDK anthropic."""

from __future__ import annotations

import asyncio
import logging
from collections.abc import Callable
from datetime import date

import anthropic

from .family import build_system_prompt, build_weekend_request
from .memory import ChatMemory

log = logging.getLogger(__name__)

# Верхняя граница длины ответа в токенах (≈ словах). Это потолок, а не цель:
# обычно ответы короче, а платите вы только за реально написанные токены.
MAX_TOKENS = 8000

# Уровень «старания» модели. "low" — быстро и дёшево, для чата этого хватает.
EFFORT = "low"

TRUNCATED_NOTE = "\n\n(Ответ получился длинным и обрезан. Напишите «продолжи».)"


class AssistantError(Exception):
    """Понятная пользователю ошибка: текст можно сразу отправить в чат."""


class FamilyAssistant:
    def __init__(
        self,
        client: anthropic.AsyncAnthropic,
        model: str,
        memory: ChatMemory,
        today: Callable[[], date] = date.today,
    ) -> None:
        self.client = client
        self.model = model
        self.memory = memory
        self.today = today
        self._locks: dict[int, asyncio.Lock] = {}

    async def ask(self, chat_id: int, text: str) -> str:
        """Обычный диалог: вопрос + последние сообщения чата → ответ Claude."""
        # Замок на чат: если быстро отправить два сообщения подряд,
        # они обработаются по очереди и история не перепутается.
        lock = self._locks.setdefault(chat_id, asyncio.Lock())
        async with lock:
            messages = self.memory.get(chat_id)
            messages.append({"role": "user", "content": text})

            reply = await self._call_claude(messages)

            # Запоминаем только успешный обмен. При ошибке история не меняется.
            self.memory.add_exchange(chat_id, text, reply)
            return reply

    async def weekend_ideas(self, chat_id: int) -> str:
        """Идеи на выходные. Попадают в историю — можно потом уточнять."""
        return await self.ask(chat_id, build_weekend_request(self.today()))

    def reset(self, chat_id: int) -> None:
        self.memory.clear(chat_id)

    async def _call_claude(self, messages: list[dict[str, str]]) -> str:
        try:
            response = await self.client.messages.create(
                model=self.model,
                max_tokens=MAX_TOKENS,
                system=build_system_prompt(self.today()),
                messages=messages,
                output_config={"effort": EFFORT},
            )
        except anthropic.AuthenticationError:
            log.error("Claude не принял API-ключ (401)")
            raise AssistantError(
                "Claude не принял API-ключ. Проверьте переменную ANTHROPIC_API_KEY."
            ) from None
        except anthropic.PermissionDeniedError:
            log.error("Нет доступа к Claude API (403)")
            raise AssistantError(
                "У API-ключа нет доступа к Claude. Проверьте ключ в Claude Console."
            ) from None
        except anthropic.NotFoundError:
            log.error("Модель %s не найдена (404)", self.model)
            raise AssistantError(
                f"Модель {self.model} не найдена. Проверьте переменную CLAUDE_MODEL."
            ) from None
        except anthropic.RateLimitError:
            log.warning("Превышен лимит запросов к Claude (429)")
            raise AssistantError(
                "Слишком много вопросов подряд. Подождите минуту и спросите снова."
            ) from None
        except anthropic.BadRequestError as error:
            log.error("Claude отклонил запрос (400): %s", error.message)
            if "credit balance" in error.message.lower():
                raise AssistantError(
                    "На балансе Claude Console закончились деньги. Пополните баланс и попробуйте снова."
                ) from None
            raise AssistantError(
                "Claude не смог обработать запрос. Попробуйте /sbros и спросите снова."
            ) from None
        except anthropic.APIStatusError as error:
            log.error("Ошибка сервиса Claude (%s): %s", error.status_code, error.message)
            raise AssistantError(
                "Сервис Claude сейчас перегружен или недоступен. Попробуйте через пару минут."
            ) from None
        except anthropic.APIConnectionError:
            log.error("Нет связи с Claude API")
            raise AssistantError(
                "Не получилось связаться с Claude. Проверьте интернет и попробуйте снова."
            ) from None

        if response.stop_reason == "refusal":
            category = response.stop_details.category if response.stop_details else None
            log.warning("Claude отказался отвечать, категория: %s", category)
            raise AssistantError("На этот вопрос я ответить не могу. Попробуйте спросить иначе.")

        # В ответе могут быть разные блоки (например, «размышления» модели).
        # Пользователю показываем только текст.
        text = "".join(block.text for block in response.content if block.type == "text").strip()
        if not text:
            log.warning("Пустой ответ от Claude, stop_reason=%s", response.stop_reason)
            raise AssistantError("Claude прислал пустой ответ. Попробуйте спросить иначе.")

        if response.stop_reason == "max_tokens":
            text += TRUNCATED_NOTE

        log.info(
            "Ответ Claude: модель=%s, токены вход=%s выход=%s",
            response.model,
            response.usage.input_tokens,
            response.usage.output_tokens,
        )
        return text
