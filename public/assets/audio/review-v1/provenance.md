# Grand Theft Astra audio review

The repository contains nineteen downloaded ElevenLabs files: two music candidates and seventeen sound effects.
The game selects seventeen files. It excludes the rejected first menu candidate and the combined square ambience.

- Provider: [ElevenLabs MCP](https://elevenlabs.io/mcp).
- Music: Eleven Music v2, a rejected 60-second candidate and a selected 45-second candidate.
- Effects: ElevenLabs Sound Effects v2, seventeen original sound effects.
- Generation date: 10 September 2026.

| Batch | Metadata |
| --- | --- |
| First music candidate and ten effects | [Initial metadata](metadata.json) |
| Six city effects | [City metadata](../city-review-v1/metadata.json) |
| Separate outdoor ambience | [Plaza metadata](../plaza-review-v1/metadata.json) |
| New 45-second menu candidate | [Menu metadata](../menu-review-v2/metadata.json) |

Ambient effects use the provider's loop option where recorded in metadata. Neither music request exposes a loop option.
The review page's Repeat control repeats the file; it does not prove that the boundary is seamless.
MP3 files retain the downloaded provider output. They have no added normalization, trimming, or fades.

The game now uses separate ambience, nearby crowd volume, and spatial sound for occupied cars and helicopters.
The horn file is available to the runtime; no horn action is connected yet.
Occasional quiet sirens represent distant city activity. Walking officers never emit a vehicle siren.
The helicopter file uses a distant perspective. Its sound at close range needs a listening check.

The user selects Michael Hunter’s [Soviet Connection](https://www.youtube.com/watch?v=93TW692tQb8) as the reference for a new original menu cue.
The new candidate requests an original cimbalom motif, tense strings, deep bass, and assertive drums at 92 BPM.
That tempo is our composition choice. We do not claim it matches the reference tempo.
The new file lasts 45 seconds and passes full decode validation. Listening approval and the loop boundary check remain pending.
Generation uses 1718.68125 credits; the provider reports a value of 20.625 USD cents.

The provider metadata does not identify the subscription plan. Credits alone do not establish the output license.
ElevenLabs distinguishes free-plan output from output generated during a paid subscription in its [publication terms](https://help.elevenlabs.io/hc/en-us/articles/13313564601361-Can-I-publish-the-content-I-generate-on-the-platform).

Generated with Eleven Music and ElevenLabs Sound Effects: [elevenlabs.io](https://elevenlabs.io).
We supply no GTA recording or melody as a source asset. The reference recording is not downloaded or included.
