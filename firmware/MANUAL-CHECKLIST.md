# Phase 4 hardware checklist

- [ ] Provision `src/secrets.h`; confirm the device token is the token returned once by device registration.
- [ ] Upload to NodeMCU; confirm LCD backlight and both 16-character lines render without clipping.
- [ ] With no running session, confirm idle screen shows today’s earned blocks and weekly honest minutes, not a clock.
- [ ] Start a planned task; confirm title, `MM:SS`, and WORK appear. Use a title over 16 characters and confirm scrolling.
- [ ] Press once while idle: exactly one `start_next_planned` action. Press while running: exactly one pause action.
- [ ] Complete a work block and confirm the two-tone celebration starts within about one second of the next poll.
- [ ] Let a short/long break end and confirm its shorter, distinct buzzer pattern.
- [ ] Disconnect Wi-Fi during a run; confirm the countdown continues. Reconnect and confirm it snaps to server time.
- [ ] Verify invalid token / HTTP failure leaves the display usable and retries on the next poll.
- [ ] Power-cycle and confirm Wi-Fi reconnects and the last server state appears after polling.
