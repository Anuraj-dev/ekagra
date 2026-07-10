#include <Arduino.h>
#include <ESP8266HTTPClient.h>
#include <ESP8266WiFi.h>
#include <LiquidCrystal_I2C.h>
#include <WiFiClientSecureBearSSL.h>
#include <cstdio>
#include <memory>
#include "ekagra_logic.h"
#include "secrets.h"

using namespace ekagra;
LiquidCrystal_I2C lcd(0x27, 16, 2);
Countdown countdown;
PollSnapshot snapshot;
Phase previousPhase = Phase::Idle;
bool hasPreviousPhase = false;
uint32_t lastPoll = 0;
uint32_t titleSince = 0;
constexpr uint32_t kPollIntervalMs = 3000;
constexpr uint8_t kButtonPin = D6;
constexpr uint8_t kBuzzerPin = D5;

uint32_t secondToneAt = 0;

void buzz(BuzzerEvent event) {
  if (event == BuzzerEvent::None) return;
  const uint16_t duration = event == BuzzerEvent::WorkCompleted ? 180 : 80;
  tone(kBuzzerPin, event == BuzzerEvent::WorkCompleted ? 1800 : 1000, duration);
  if (event == BuzzerEvent::WorkCompleted) secondToneAt = millis() + 230;
}

void serviceBuzzer() {
  if (secondToneAt != 0 && static_cast<int32_t>(millis() - secondToneAt) >= 0) {
    tone(kBuzzerPin, 2400, 180);
    secondToneAt = 0;
  }
}

void render() {
  tick(countdown, millis());
  lcd.setCursor(0, 0);
  const std::string line1 = snapshot.phase == Phase::Idle ? formatIdleLine1(snapshot.blocksToday) : formatRunningLine1(snapshot.title, millis() - titleSince);
  lcd.print(line1.c_str());
  lcd.setCursor(0, 1);
  if (snapshot.phase == Phase::Idle) lcd.print(formatIdleLine2(snapshot.weeklyMinutes).c_str());
  else { char value[6]; snprintf(value, sizeof(value), "%02d:%02d", countdown.remainingSeconds / 60, countdown.remainingSeconds % 60); lcd.print(formatRunningLine2(value, snapshot.phase).c_str()); }
}

bool request(const char* path, const String& body, String& response, const char* method) {
  if (WiFi.status() != WL_CONNECTED) return false;
  auto client = std::make_unique<BearSSL::WiFiClientSecure>(); client->setInsecure(); client->setTimeout(800);
  HTTPClient http; if (!http.begin(*client, String(EKAGRA_SUPABASE_URL) + path)) return false; http.setTimeout(800); http.addHeader("x-device-token", EKAGRA_DEVICE_TOKEN);
  if (method[0] == 'P') http.addHeader("Content-Type", "application/json"); const int code = method[0] == 'P' ? http.POST(body) : http.GET();
  if (code >= 200 && code < 300) response = http.getString(); http.end(); return code >= 200 && code < 300;
}

void pollServer() {
  String body; if (!request("/functions/v1/device-poll", "", body, "GET")) return;
  PollSnapshot next; if (!parsePollPayload(body.c_str(), next)) return;
  const BuzzerEvent event = detectBuzzerEvent(previousPhase, next.phase, hasPreviousPhase); const bool titleChanged = snapshot.title != next.title;
  previousPhase = next.phase; hasPreviousPhase = true; snapshot = next; reconcile(countdown, next.countdown, millis()); if (titleChanged) titleSince = millis(); buzz(event);
}

void sendAction(const char* action) { String ignored; request("/functions/v1/device-action", String("{\"action\":\"") + action + "\"}", ignored, "POST"); }

void setup() {
  pinMode(kButtonPin, INPUT_PULLUP); pinMode(kBuzzerPin, OUTPUT); lcd.init(); lcd.backlight(); lcd.print("Ekagra connecting"); WiFi.begin(EKAGRA_WIFI_SSID, EKAGRA_WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED && millis() < 10000) delay(100); lastPoll = millis() - kPollIntervalMs;
}

void loop() {
  static bool lastButton = HIGH; static uint32_t changedAt = 0; static bool pressHandled = false; const bool button = digitalRead(kButtonPin);
  if (button != lastButton) { lastButton = button; changedAt = millis(); if (button == HIGH) pressHandled = false; }
  if (button == LOW && !pressHandled && millis() - changedAt > 35) { pressHandled = true; sendAction(snapshot.phase == Phase::Idle ? "start_next_planned" : "pause"); }
  if (millis() - lastPoll >= kPollIntervalMs) { lastPoll = millis(); pollServer(); } serviceBuzzer(); render(); delay(30);
}
