#include <cassert>
#include <fstream>
#include <sstream>
#include "ekagra_logic.h"
using namespace ekagra;
int main(int argc, char** argv) {
  assert(argc == 2); std::ifstream file(argv[1]); std::stringstream input; input << file.rdbuf(); const std::string all = input.str(); PollSnapshot parsed;
  const std::string idle = all.substr(all.find("{\"t\":null"), all.find("}", all.find("{\"t\":null")) + 1 - all.find("{\"t\":null")); assert(parsePollPayload(idle, parsed)); assert(parsed.phase == Phase::Idle && !parsed.hasTitle && parsed.blocksToday == 3);
  const std::string work = all.substr(all.find("{\"t\":\"Write"), all.find("}", all.find("{\"t\":\"Write")) + 1 - all.find("{\"t\":\"Write")); assert(parsePollPayload(work, parsed)); assert(parsed.phase == Phase::Work && parsed.hasTitle);
  assert(!parsePollPayload("{malformed", parsed)); assert(formatIdleLine1(3).size() == 16); assert(formatIdleLine2(120).find("120m") != std::string::npos); assert(formatRunningLine1("123456789012345678", 0).size() == 16); assert(formatRunningLine1("123456789012345678", 450).size() == 16); assert(formatRunningLine2("24:59", Phase::Work).find("WORK") != std::string::npos);
  Countdown c; reconcile(c, "00:03", 1000); tick(c, 2999); assert(c.remainingSeconds == 2); tick(c, 4000); assert(c.remainingSeconds == 0); reconcile(c, "25:00", 5000); assert(c.remainingSeconds == 1500);
  assert(detectBuzzerEvent(Phase::Work, Phase::ShortBreak, true) == BuzzerEvent::WorkCompleted); assert(detectBuzzerEvent(Phase::ShortBreak, Phase::Work, true) == BuzzerEvent::BreakEnded); assert(detectBuzzerEvent(Phase::Work, Phase::Work, true) == BuzzerEvent::None); assert(detectBuzzerEvent(Phase::Work, Phase::Idle, false) == BuzzerEvent::None); return 0;
}
