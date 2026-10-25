## Healing feedback (2026-10-06)

`heal.wav` is derived from `health_restore.wav` by Julie Damsgaard / Spring Spring / Spring Enterprises.
Source: https://opengameart.org/content/magic-words-healing-sound-effect
Download: https://opengameart.org/sites/default/files/health_restore.wav
License: CC0, https://creativecommons.org/publicdomain/zero/1.0/
Creator: https://spring-enterprises.neocities.org
The harp clip is trimmed to 1.60 seconds, with 8 ms onset / 250 ms end fades,
normalized to -19 LUFS / -3 dBTP and converted to 22050 Hz mono 16-bit PCM.
Plays once when HP actually increases, including third-stage rest points.

# Local sound sources

Current Kurumi time-stop calls are unchanged copies of the newly supplied files:

- `kurumi-time-stop-1.mp3`: `D:/Download/爱丽丝梦游仙境游戏资产/狂三攻击音频1.mp3`.
- `kurumi-time-stop-2.mp3`: `D:/Download/爱丽丝梦游仙境游戏资产/狂三攻击音频2.mp3`.
- `kurumi-time-stop-3.mp3`: `D:/Download/爱丽丝梦游仙境游戏资产/狂三攻击音频3.mp3`.

Successful casts rotate 1 → 2 → 3 → 1, once per cast. The complete recordings
continue naturally after the 1.6-second freeze; playback speed is unchanged.
Pause/resume preserves the selected clip and actual offset. Cancelling a cast,
retrying, changing stages or losing stops the old source; retry resets to clip 1.
The earlier separated `kurumi-time-stop.wav` below is retained as historical
material and is no longer loaded or played.

Second-stage music is copied unchanged from the supplied files:

- `forest-exploration.mp3`: `D:/Download/爱丽丝梦游仙境游戏资产/第二关BGM.mp3`.
- `forest-boss.mp3`: `D:/Download/爱丽丝梦游仙境游戏资产/第二关BOSS战BGM.mp3`.

Each loops individually. Nuonu's reveal switches to the BOSS track, replacing
the synthesized entrance score. Her awakening, pause, mute and skipped reveal
retain playback position; retry restarts exploration from the beginning.

`kurumi-time-stop.wav` derives from the user's supplied
`D:/Download/游戏BOSS音频/《时崎狂三召唤刻刻帝的全部片段》_8-10秒.mp3`.
The two-second excerpt was processed locally with
[UVR-MDX-NET-Voc_FT](https://github.com/TRvlvr/model_repo/releases/tag/all_public_uvr_models)
to separate the original voice from its music. Periodic Hann STFT: 7680 FFT,
1024 hop, 3072 bins, 256 frames; symmetric inference. Model SHA-256:
`534b2070fcc7df514b13ef660dc8cbb328679c2374d04354a5c42bb14ecce111`.
120 Hz high-pass and 9 kHz low-pass, quiet tail trimmed, -2 dBFS peak,
12 ms edge fades; 22050 Hz mono 16-bit PCM, 1.590 seconds. No pitch/rate change,
no synthesized or replacement voice. See `scripts/prepare-kurumi-voice.py`.
The model and processing dependencies are not served with the game.

`nuonu-voice-1.wav` and `nuonu-voice-2.wav` derive from the supplied
`D:/Download/爱丽丝梦游仙境游戏资产/糯糯语音1.mp3` and `糯糯语音2.mp3`.
The same local model, STFT, separation and filtering pipeline above minimizes
their background music, preserving the original voice and playback speed.
Original decoded lengths: 2.00 and 1.60 seconds. Processed lengths: 1.950 and
1.590 seconds; 22050 Hz mono 16-bit PCM, -2 dBFS peak, 12 ms edge fades.
Voice 1 plays on the first entrance; voice 2 on the half-health transformation
or a direct phase-II practice entrance. The entrance score ducks while speaking.

First-stage music is copied unchanged from the supplied files:

- `castle-exploration.mp3`: `D:/Download/爱丽丝梦游仙境游戏资产/第一关BGM.mp3`.
- `castle-boss.mp3`: `D:/Download/爱丽丝梦游仙境游戏资产/第一关BOSS战BGM.mp3`.

Each loops individually. Spark's reveal switches from exploration to BOSS music;
skipping the reveal or pausing/muting preserves the current BOSS track position.

Third-stage music is copied unchanged from the user's supplied files:

- `clock-exploration.mp3`: `D:/Download/爱丽丝梦游仙境游戏资产/第三关BGM.mp3`.
- `clock-boss.mp3`: `D:/Download/爱丽丝梦游仙境游戏资产/第三关BOSS战BGM.mp3`.

Each file loops individually. Exploration rooms share playback position; entering
the boss room switches to the boss file. Pause/mute retains the current position,
and restarting or changing stages releases the previous file.

Selected from the user-provided Sonniss GDC 2026 bundle. Its Readme permits personal and commercial use. Original recordings remain unchanged in D:/Download/音效库. These are trimmed, faded, peak-normalized mono PCM WAV derivatives at 22050 Hz.

| Clip                | Source within the library                                                                                                                                                                  | Trim start / length |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------- |
| `cake-swing.wav`    | Sonniss.com-GDC2026-GameAudioBundle2of5/David Dumais Audio - Melee Weapons Sound Effects Pack 2/SWSH_SWING IMPACTS Quick Heavy Weapon Swing To Thud Impact Var 01_DDUMAIS_MWP2.wav         | 0.020s / 0.130s     |
| `cake-hit.wav`      | Sonniss.com-GDC2026-GameAudioBundle1of5/344 Audio - Cinematic Fight Vol. 1/FGHTImpt_4 x Punch, Body 02_344 Audio_Cinematic Fight Vol 1.wav                                                 | 0.270s / 0.190s     |
| `defeat.wav`        | Sonniss.com-GDC2026-GameAudioBundle1of5/344 Audio - Cinematic Fight Vol. 1/FGHTImpt_4 x Punch, Body 02_344 Audio_Cinematic Fight Vol 1.wav                                                 | 1.130s / 0.230s     |
| `roll.wav`          | Sonniss.com-GDC2026-GameAudioBundle2of5/Cinematic Sound Design - Cartoon & Animation Vol 2/Cartoon Pull Swoosh Readout.wav                                                                 | 0.074s / 0.400s     |
| `sugar-shot.wav`    | Sonniss.com-GDC2026-GameAudioBundle2of5/Epic Stock Media - Fantasy Game 2 - Sound Kit for Enchanted Realms/MAGAngl_Magic Light Spell Enchantment Potion Effect Tonal Bright 03_ESM_FG2.wav | 0.000s / 0.550s     |
| `charge-ready.wav`  | Sonniss.com-GDC2026-GameAudioBundle2of5/Cinematic Sound Design - User Interface/Interface Plucks Happy.wav                                                                                 | 0.000s / 0.800s     |
| `spark-reveal.wav`  | Sonniss.com-GDC2026-GameAudioBundle2of5/Cinematic Sound Design - Ultra Transitions & Impacts/Impact Hit Rapid Chord Reverb.wav                                                             | 0.187s / 3.019s     |
| `forest-reveal.wav` | Sonniss.com-GDC2026-GameAudioBundle2of5/Cinematic Sound Design - Ultra Transitions & Impacts/Transition Braam Slow Dark Creepy.wav                                                         | 0.181s / 3.400s     |
| `name-sweep.wav`    | Sonniss.com-GDC2026-GameAudioBundle2of5/Cinematic Sound Design - Ultra Transitions & Impacts/Woosh Sweep Slide Infographics Basic.wav                                                      | 0.014s / 0.486s     |
| `collect.wav`       | Sonniss.com-GDC2026-GameAudioBundle2of5/Cinematic Sound Design - UI Interaction Elements/Ting Coins.wav                                                                                    | 0.079s / 0.300s     |
