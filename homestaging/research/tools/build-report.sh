#!/usr/bin/env bash
# Собирает report.html из README.md (нужен pandoc 2.11+).
# Запуск из корня репозитория: bash homestaging/research/tools/build-report.sh
set -euo pipefail
# pandoc читает аргументы в кодировке локали: без UTF-8 кириллица в заголовке ломается
export LC_ALL=C.UTF-8
DIR="$(cd "$(dirname "$0")/.." && pwd)"
# Заголовок страницы — первая строка «# ...» из README.md
DEFAULT_TITLE="$(awk '/^# /{sub(/^# /,""); print; exit}' "$DIR/README.md")"
TITLE="${REPORT_TITLE:-${DEFAULT_TITLE:-Хоумстейджинг в Краснодаре}}"
DATE="${REPORT_DATE:-$(date +%d.%m.%Y)}"

# Первый заголовок «# ...» убираем: он выводится в шапке страницы, а не в оглавлении.
awk 'BEGIN{done=0} !done && /^# /{done=1; next} {print}' "$DIR/README.md" |
pandoc \
  --from=gfm \
  --to=html5 \
  --standalone \
  --template="$DIR/tools/report-template.html" \
  --toc --toc-depth=3 \
  --metadata title="$TITLE" \
  --metadata date="$DATE" \
  --output="$DIR/report.html"

echo "Готово: $DIR/report.html"
