#include "ekagra_logic.h"
#include <algorithm>
#include <cctype>
#include <cstdlib>
namespace ekagra {
namespace {
constexpr size_t kWidth = 16;
bool stringField(const std::string& json, const char* key, std::string& value, bool& isNull) {
  const std::string needle = std::string("\"") + key + "\""; const size_t keyAt = json.find(needle); if (keyAt == std::string::npos) return false;
  const size_t colon = json.find(':', keyAt + needle.size()); if (colon == std::string::npos) return false; size_t start = colon + 1;
  while (start < json.size() && std::isspace(static_cast<unsigned char>(json[start]))) ++start;
  if (json.compare(start, 4, "null") == 0) { isNull = true; value.clear(); return true; }
  if (start >= json.size() || json[start] != '"') return false;
  ++start;
  std::string result;
  for (size_t i = start; i < json.size(); ++i) { if (json[i] == '"') { value = result; isNull = false; return true; } if (json[i] == '\\' && i + 1 < json.size()) result += json[++i]; else result += json[i]; }
  return false;
}
bool integerField(const std::string& json, const char* key, int& value) {
  const std::string needle = std::string("\"") + key + "\""; const size_t keyAt = json.find(needle); if (keyAt == std::string::npos) return false;
  const size_t colon = json.find(':', keyAt + needle.size()); if (colon == std::string::npos) return false; char* end = nullptr; const long parsed = std::strtol(json.c_str() + colon + 1, &end, 10);
  if (end == json.c_str() + colon + 1) return false;
  value = static_cast<int>(parsed);
  return true;
}
bool validJsonShape(const std::string& json) { int depth = 0; bool quoted = false; bool escaped = false; for (char ch : json) { if (escaped) { escaped = false; continue; } if (quoted && ch == '\\') { escaped = true; continue; } if (ch == '"') quoted = !quoted; if (!quoted && ch == '{') ++depth; if (!quoted && ch == '}' && --depth < 0) return false; } return !quoted && depth == 0; }
std::string pad16(std::string value) { if (value.size() > kWidth) value.resize(kWidth); value.append(kWidth - value.size(), ' '); return value; }
}
bool parsePollPayload(const std::string& json, PollSnapshot& out) {
  if (!validJsonShape(json)) return false;
  bool nullValue = false;
  if (!stringField(json, "t", out.title, nullValue)) return false;
  out.hasTitle = !nullValue;
  if (!stringField(json, "c", out.countdown, nullValue) || nullValue) return false;
  std::string phase;
  if (!stringField(json, "p", phase, nullValue) || nullValue) return false;
  if (phase == "idle") out.phase = Phase::Idle; else if (phase == "work") out.phase = Phase::Work; else if (phase == "short_break") out.phase = Phase::ShortBreak; else if (phase == "long_break") out.phase = Phase::LongBreak; else return false;
  if (!integerField(json, "b", out.blocksToday) || !integerField(json, "w", out.weeklyMinutes)) return false;
  if (!stringField(json, "n", out.serverNow, nullValue) || nullValue) return false;
  return parseCountdown(out.countdown) >= 0;
}
std::string formatIdleLine1(int blocksToday) { return pad16("Today B: " + std::to_string(std::max(0, blocksToday))); }
std::string formatIdleLine2(int weeklyMinutes) { return pad16("Week " + std::to_string(std::max(0, weeklyMinutes)) + "m"); }
std::string formatRunningLine1(const std::string& title, uint32_t elapsedMs) { if (title.size() <= kWidth) return pad16(title); const std::string text = title + "    "; const size_t offset = (elapsedMs / 450) % text.size(); return pad16(text.substr(offset, kWidth)); }
std::string phaseLabel(Phase phase) { if (phase == Phase::Work) return "WORK"; if (phase == Phase::ShortBreak) return "S-BRK"; if (phase == Phase::LongBreak) return "L-BRK"; return "IDLE"; }
std::string formatRunningLine2(const std::string& countdown, Phase phase) { return pad16(countdown + " " + phaseLabel(phase)); }
int parseCountdown(const std::string& value) { if (value.size() != 5 || value[2] != ':' || !std::isdigit(value[0]) || !std::isdigit(value[1]) || !std::isdigit(value[3]) || !std::isdigit(value[4])) return -1; const int minutes = (value[0] - '0') * 10 + value[1] - '0'; const int seconds = (value[3] - '0') * 10 + value[4] - '0'; return seconds < 60 ? minutes * 60 + seconds : -1; }
void reconcile(Countdown& countdown, const std::string& serverCountdown, uint32_t nowMs) { const int seconds = parseCountdown(serverCountdown); if (seconds >= 0) { countdown.remainingSeconds = seconds; countdown.lastMillis = nowMs; countdown.initialized = true; } }
void tick(Countdown& countdown, uint32_t nowMs) { if (!countdown.initialized) return; const uint32_t elapsed = nowMs - countdown.lastMillis; const int elapsedSeconds = static_cast<int>(elapsed / 1000); if (elapsedSeconds > 0) { countdown.remainingSeconds = std::max(0, countdown.remainingSeconds - elapsedSeconds); countdown.lastMillis += static_cast<uint32_t>(elapsedSeconds) * 1000; } }
BuzzerEvent detectBuzzerEvent(Phase previous, Phase current, bool hasPrevious) { if (!hasPrevious) return BuzzerEvent::None; if (previous == Phase::Work && (current == Phase::ShortBreak || current == Phase::LongBreak || current == Phase::Idle)) return BuzzerEvent::WorkCompleted; if ((previous == Phase::ShortBreak || previous == Phase::LongBreak) && (current == Phase::Work || current == Phase::Idle)) return BuzzerEvent::BreakEnded; return BuzzerEvent::None; }
}
