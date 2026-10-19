#!/bin/bash

input=$(cat)

total_tokens=$(echo "$input" | jq -r '.context_window.total_input_tokens // 0')
context_size=$(echo "$input" | jq -r '.context_window.context_window_size // 0')

if [ "$context_size" -gt 0 ] 2>/dev/null; then
  percentage=$(awk -v used="$total_tokens" -v size="$context_size" 'BEGIN { printf "%.1f", (used / size) * 100 }')
else
  percentage="0.0"
fi

tokens_display=$(awk -v tokens="$total_tokens" 'BEGIN { printf "%.1fk", tokens / 1000 }')

GREEN=$'\033[1;32m'
YELLOW=$'\033[1;33m'
RED=$'\033[1;31m'
WHITE=$'\033[0;37m'
RESET=$'\033[0m'

if [ "$total_tokens" -lt 90000 ] 2>/dev/null; then
  color="$GREEN"
elif [ "$total_tokens" -lt 120000 ] 2>/dev/null; then
  color="$YELLOW"
else
  color="$RED"
fi

context_output=$(printf "${color}%s${RESET} ${WHITE}(%s%%)${RESET}" "$tokens_display" "$percentage")

format_reset_time() {
  local epoch_seconds="${1%%.*}"
  date -r "$epoch_seconds" "+%I:%M%p" | sed 's/^0//' | tr '[:upper:]' '[:lower:]'
}

format_reset_day() {
  local epoch_seconds="${1%%.*}"
  local day_num
  day_num=$(date -r "$epoch_seconds" "+%u")
  case "$day_num" in
    1) echo "Mon." ;;
    2) echo "Tues." ;;
    3) echo "Wed." ;;
    4) echo "Thurs." ;;
    5) echo "Fri." ;;
    6) echo "Sat." ;;
    7) echo "Sun." ;;
  esac
}

make_usage_bar() {
  local used_percentage="$1"
  local fill_color="$2"
  local bar_width=10
  local partial_chars=(' ' '▏' '▎' '▍' '▌' '▋' '▊' '▉')
  local eighths
  eighths=$(awk -v used="$used_percentage" -v width="$bar_width" 'BEGIN { printf "%d", (used / 100) * width * 8 + 0.5 }')
  local max_eighths=$((bar_width * 8))
  if [ "$eighths" -gt "$max_eighths" ]; then
    eighths=$max_eighths
  fi
  local filled_segments=$((eighths / 8))
  local partial_index=$((eighths % 8))
  local empty_segments=$((bar_width - filled_segments))
  if [ "$partial_index" -gt 0 ]; then
    empty_segments=$((empty_segments - 1))
  fi

  local filled=""
  local empty=""
  for ((i = 0; i < filled_segments; i++)); do
    filled="${filled}█"
  done
  if [ "$partial_index" -gt 0 ]; then
    filled="${filled}${partial_chars[$partial_index]}"
  fi
  for ((i = 0; i < empty_segments; i++)); do
    empty="${empty}░"
  done
  printf "%s%s%s%s%s" "$fill_color" "$filled" "$RESET" "$WHITE" "$empty"
}

usage_bar_color() {
  local used_percentage="$1"
  if (($(awk -v used="$used_percentage" 'BEGIN { print (used < 70) }'))); then
    echo "$GREEN"
  elif (($(awk -v used="$used_percentage" 'BEGIN { print (used < 90) }'))); then
    echo "$YELLOW"
  else
    echo "$RED"
  fi
}

session_used_percentage=$(echo "$input" | jq -r '.rate_limits.five_hour.used_percentage // empty')
session_resets_at=$(echo "$input" | jq -r '.rate_limits.five_hour.resets_at // empty')
weekly_used_percentage=$(echo "$input" | jq -r '.rate_limits.seven_day.used_percentage // empty')
weekly_resets_at=$(echo "$input" | jq -r '.rate_limits.seven_day.resets_at // empty')

rate_limit_output=""

if [ -n "$session_used_percentage" ]; then
  session_color=$(usage_bar_color "$session_used_percentage")
  session_bar=$(make_usage_bar "$session_used_percentage" "$session_color")
  session_percentage_display=$(awk -v used="$session_used_percentage" 'BEGIN { printf "%.0f", used }')
  session_reset_display=""
  if [ -n "$session_resets_at" ]; then
    session_reset_display="${WHITE} · $(format_reset_time "$session_resets_at")${RESET}"
  fi
  rate_limit_output="${rate_limit_output} ${WHITE}│${RESET} 5h ${session_bar}${RESET} ${WHITE}${session_percentage_display}%${RESET}${session_reset_display}"
fi

if [ -n "$weekly_used_percentage" ]; then
  weekly_color=$(usage_bar_color "$weekly_used_percentage")
  weekly_bar=$(make_usage_bar "$weekly_used_percentage" "$weekly_color")
  weekly_percentage_display=$(awk -v used="$weekly_used_percentage" 'BEGIN { printf "%.0f", used }')
  weekly_reset_display=""
  if [ -n "$weekly_resets_at" ]; then
    weekly_reset_display="${WHITE} · $(format_reset_day "$weekly_resets_at")${RESET}"
  fi
  rate_limit_output="${rate_limit_output} ${WHITE}│${RESET} 7d ${weekly_bar}${RESET} ${WHITE}${weekly_percentage_display}%${RESET}${weekly_reset_display}"
fi

printf "%s%s\n" "$context_output" "$rate_limit_output"
