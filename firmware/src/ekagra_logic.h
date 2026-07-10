#pragma once
#include <cstdint>
#include <string>
namespace ekagra {
enum class Phase { Idle, Work, ShortBreak, LongBreak };
enum class BuzzerEvent { None, WorkCompleted, BreakEnded };
struct PollSnapshot { std::string title; bool hasTitle = false; std::string countdown; Phase phase = Phase::Idle; int blocksToday = 0; int weeklyMinutes = 0; std::string serverNow; };
bool parsePollPayload(const std::string& json, PollSnapshot& out);
std::string formatIdleLine1(int blocksToday);
std::string formatIdleLine2(int weeklyMinutes);
std::string formatRunningLine1(const std::string& title, uint32_t elapsedMs);
std::string formatRunningLine2(const std::string& countdown, Phase phase);
std::string phaseLabel(Phase phase);
struct Countdown { int remainingSeconds = 0; uint32_t lastMillis = 0; bool initialized = false; };
int parseCountdown(const std::string& value);
void reconcile(Countdown& countdown, const std::string& serverCountdown, uint32_t nowMs);
void tick(Countdown& countdown, uint32_t nowMs);
BuzzerEvent detectBuzzerEvent(Phase previous, Phase current, bool hasPrevious);
}
