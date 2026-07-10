# Ekagra ESP8266 firmware

Thin NodeMCU client for the Ekagra focus timer. The device owns no timer state: it polls
Supabase over HTTPS and keeps only a display countdown between polls.

## Provisioning

Copy `src/secrets.example.h` to `src/secrets.h` and fill in the Wi-Fi credentials, Supabase
URL, and one-time device token returned by the app's device registration endpoint. `secrets.h`
is ignored by Git. The sketch uses the Supabase URL without a trailing slash.

Build with PlatformIO (`pio run`) and upload with `pio run -t upload`. The default pins are the
usual NodeMCU D1/D2 I2C pins, D5 for the buzzer, and D6 for the active-low push button.

Host tests do not require PlatformIO: from the repository root run `bun test`.
