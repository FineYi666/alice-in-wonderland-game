/* Mint Parfait Parade — dependency-free Canvas arcade demo. */
const $ = (id) => document.getElementById(id)
const canvas = $('game')
const ctx = canvas.getContext('2d')
const W = 1100,
  H = 620,
  FLOOR = 528
let stage = 1,
  LENGTH = 4800
let cameraY = 0,
  clockJourney = null,
  timeStop = null
const keys = new Set()
const assets = {}
let mode = 'loading',
  last = 0,
  time = 0,
  camera = 0,
  score = 0,
  sweets = 0
let player,
  enemies = [],
  bullets = [],
  particles = [],
  drops = [],
  floaters = []
let shake = 0,
  toastTime = 0,
  kills = 0,
  soundOn = true,
  audio,
  master,
  noiseBuffer
let impacts = []
let hazards = [],
  vines = [],
  chests = []
let stageCheckpoint = { score: 0, sweets: 0, kills: 0 }
let bossIntro = null,
  entranceMusic = null,
  resumeMode = 'playing'
const ENTRANCE_DURATION = 4,
  ENTRANCE_CARD_START = 0.65,
  ENTRANCE_CARD_SLIDE = 0.35
const SUGAR_REGEN_PER_SECOND = 2
const POTION_DURATION = 6
const WAND_CHARGES = 4,
  WAND_REGEN = 0.9,
  WAND_CAST_DURATION = 0.56,
  WAND_COOLDOWN = 0.72
const soundBuffers = {},
  soundFiles = {}
const KURUMI_TIME_STOP_CALLS = [
  'kurumi-time-stop-1',
  'kurumi-time-stop-2',
  'kurumi-time-stop-3',
]
const SOUND_NAMES = [
  'cake-swing',
  'cake-hit',
  'defeat',
  'roll',
  'sugar-shot',
  'charge-ready',
  'spark-reveal',
  'forest-reveal',
  'name-sweep',
  'collect',
  'heal',
  ...KURUMI_TIME_STOP_CALLS,
  'nuonu-voice-1',
  'nuonu-voice-2',
  'whale-token-call',
  'ocean-hurt',
  'claude-laser-call',
]
let decodingSounds = null
const STAGE_MUSIC_FILES = {
  4: {
    exploration: './assets/audio/ocean-exploration.mp3',
    boss: './assets/audio/claude-battle.mp3',
  },
  1: {
    exploration: './assets/audio/castle-exploration.mp3',
    boss: './assets/audio/castle-boss.mp3',
  },
  2: {
    exploration: './assets/audio/forest-exploration.mp3',
    boss: './assets/audio/forest-boss.mp3',
  },
  3: {
    exploration: './assets/audio/clock-exploration.mp3',
    boss: './assets/audio/clock-boss.mp3',
  },
}
let stageMusic = null,
  stageMusicTicket = 0
let stageMusicBossStarted = false,
  bossCall = null,
  timeStopCallIndex = 0
const reducedMotion =
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false

async function loadSoundLibrary() {
  await Promise.all(
    SOUND_NAMES.map(async (name) => {
      try {
        const extension =
          KURUMI_TIME_STOP_CALLS.includes(name) || name === 'whale-token-call'
            ? 'mp3'
            : 'wav'
        const response = await fetch(`./assets/audio/${name}.${extension}`)
        if (response.ok) soundFiles[name] = await response.arrayBuffer()
      } catch {
        /* Synthesized effects remain available offline. */
      }
    }),
  )
  decodeSoundLibrary()
}
function decodeSoundLibrary() {
  if (!audio || decodingSounds) return
  decodingSounds = Promise.all(
    Object.entries(soundFiles).map(async ([name, data]) => {
      if (soundBuffers[name]) return
      try {
        soundBuffers[name] = await audio.decodeAudioData(data.slice(0))
      } catch {
        /* A failed sample uses the synthesized fallback. */
      }
    }),
  ).then(() => {
    decodingSounds = null
    if (
      bossIntro &&
      bossIntro.elapsed < 0.5 &&
      entranceMusic &&
      !entranceMusic.accent
    )
      addEntranceAccent(entranceMusic, bossIntro.elapsed)
  })
}
function sample(name, volume = 0.35, music = null, offset = 0, delay = 0) {
  const buffer = soundBuffers[name]
  if (!soundOn || !audio || !buffer || offset >= buffer.duration) return false
  const source = audio.createBufferSource(),
    gain = audio.createGain()
  source.buffer = buffer
  gain.gain.value = volume
  source.connect(gain)
  gain.connect(music?.bus || master)
  music?.sources.add(source)
  source.onended = () => {
    source.disconnect()
    gain.disconnect()
    if (music) {
      music.sources.delete(source)
      if (!music.sources.size) {
        music.bus.disconnect()
        if (entranceMusic === music) entranceMusic = null
      }
    }
  }
  source.start(audio.currentTime + delay, offset)
  return true
}
function addEntranceAccent(music, elapsed) {
  music.accent = sample(
    music.kind === 'spark' ? 'spark-reveal' : 'forest-reveal',
    0.3,
    music,
    elapsed,
  )
  if (!music.sweep && elapsed < ENTRANCE_CARD_START)
    music.sweep = sample(
      'name-sweep',
      0.2,
      music,
      0,
      ENTRANCE_CARD_START - elapsed,
    )
}
const BOSS_ENTRANCES = {
  claude: {
    name: 'Claude 娘',
    title: '花光圣殿 · 橙金裁决',
    english: 'CLAUDE · THE BLOSSOM SANCTUM',
    quote: '「让花光照亮这场对决。」',
    moves: '花光激柱 · 横向推进 / 翻滚闪避',
    track: '花光序曲',
    accent: '#ffd18b',
    ink: '#302015',
    tint: '#9d5629',
    pale: '#fff0ce',
  },
  kurumi: {
    name: '时崎狂三',
    title: '刻刻帝 · 绯红之时',
    english: 'KURUMI TOKISAKI · THE CRIMSON HOUR',
    quote: '「来吧，让我们享受这段时间。」',
    moves: '燧发齐射 / 时间暂停',
    track: '第三关 BOSS 战 · 单曲循环',
    accent: '#ffc879',
    ink: '#21131c',
    tint: '#663129',
    pale: '#fff0d0',
  },
  queen: {
    name: '白之女王',
    title: '紫晶裁决 · 追踪剑阵',
    english: 'WHITE QUEEN · SOVEREIGN OF THE RIFT',
    quote: '「这场战斗，由我们两人终结。」',
    moves: '紫晶斩击（翻滚） / 追踪地面剑（跳跃或翻滚）',
    track: '第三关 BOSS 战 · 单曲循环',
    accent: '#9ee8ff',
    ink: '#131e36',
    tint: '#354d80',
    pale: '#e9f7ff',
  },
  spark: {
    title: '绯红魔术师',
    english: 'THE SCARLET ILLUSIONIST',
    quote: '「下一幕，就让你成为我的观众。」',
    moves: '红心弹幕   /   帽子突进',
    track: '第一关 BOSS 战 · 单曲循环',
    accent: '#ff9cbc',
    ink: '#291827',
    tint: '#58304b',
    pale: '#ffe9d0',
  },
  nuonu: {
    title: '四叶森林守卫',
    english: 'WARDEN OF THE EMERALD MAZE',
    quote: '「别踩坏我的四叶草。」',
    moves: '飞叶齐射   /   根须震地',
    track: '四叶之森',
    accent: '#c4e69a',
    ink: '#132b26',
    tint: '#335545',
    pale: '#f0efd1',
  },
}

function syncSoundButton() {
  $('sound').textContent = soundOn ? '♪ 声音 开' : '♪ 声音 关'
  $('sound').setAttribute('aria-label', soundOn ? '关闭声音' : '开启声音')
}

function stopStageMusic() {
  const music = stageMusic
  stageMusic = null
  if (!music) return
  music.playing = false
  music.ticket = ++stageMusicTicket
  music.media.pause()
  // Release the old file when restarting/changing stages; pause alone keeps
  // the playback position when resuming this same exploration or boss track.
  music.media.removeAttribute('src')
  music.media.load()
}

function syncStageMusic() {
  syncBossCall()
  syncOceanSkillCall()
  const inGame =
    mode === 'playing' || mode === 'boss-intro' || mode === 'paused'
  const track =
    STAGE_MUSIC_FILES[stage] &&
    inGame &&
    audio &&
    !(
      isOceanArena() &&
      (mode === 'boss-intro' || (mode === 'paused' && bossIntro))
    )
      ? (
          stage === 4
            ? isOceanArena()
            : stage === 3
              ? clockJourney?.room === 'arena'
              : stageMusicBossStarted
        )
        ? 'boss'
        : 'exploration'
      : null
  if (
    (stageMusic?.track ?? null) !== track ||
    (track && stageMusic?.stage !== stage)
  ) {
    stopStageMusic()
    if (track) {
      const media = new Audio(STAGE_MUSIC_FILES[stage][track])
      media.loop = true
      media.preload = 'metadata'
      media.volume = 0.45
      stageMusic = {
        stage,
        track,
        media,
        playing: false,
        blocked: false,
        ticket: 0,
      }
    }
  }
  const music = stageMusic
  if (!music) return
  const volume =
    (bossCall || oceanSkillCall) && soundOn && mode !== 'paused' ? 0.17 : 0.45
  if (music.media.volume !== volume) music.media.volume = volume
  const playing = soundOn && (mode === 'playing' || mode === 'boss-intro')
  if (!playing) {
    if (music.playing) {
      music.playing = false
      music.ticket = ++stageMusicTicket
      music.media.pause()
    }
    return
  }
  if (music.playing || music.blocked) return
  music.playing = true
  const ticket = (music.ticket = ++stageMusicTicket)
  music.media.play()?.then(
    () => {
      // A delayed play promise must not revive a track from the previous room.
      if (stageMusic !== music || !music.playing) music.media.pause()
    },
    () => {
      if (stageMusic === music && music.ticket === ticket) {
        music.playing = false
        // Retry only on the next user gesture, never once per animation frame.
        music.blocked = true
      }
    },
  )
}

// Each spoken line owns its source. Preserve the actual playback offset when
// pausing, including when a combat frame was delayed or an intro was skipped.
function stopBossCallSource(call) {
  if (!call?.source) return
  call.elapsed = Math.max(
    call.elapsed,
    call.startOffset + audio.currentTime - call.startedAt,
  )
  call.source.onended = null
  call.source.stop()
  call.source.disconnect()
  call.gain.disconnect()
  call.source = null
  call.gain = null
}
function stopBossCall() {
  stopBossCallSource(bossCall)
  bossCall = null
  if (stageMusic) stageMusic.media.volume = 0.45
  if (entranceMusic) entranceMusic.bus.gain.value = 0.8
}
function beginBossCall(name, boss) {
  stopBossCall()
  bossCall = { name, boss, stage, elapsed: 0, source: null, gain: null }
  syncStageMusic()
}
function stopTimeStopCall() {
  if (KURUMI_TIME_STOP_CALLS.includes(bossCall?.name)) stopBossCall()
}
function beginTimeStopCall() {
  const name = KURUMI_TIME_STOP_CALLS[timeStopCallIndex]
  timeStopCallIndex = (timeStopCallIndex + 1) % KURUMI_TIME_STOP_CALLS.length
  beginBossCall(name, timeStop.boss)
}
function syncBossCall() {
  const call = bossCall
  if (!call) return
  if (
    stage !== call.stage ||
    call.boss.hp <= 0 ||
    !['playing', 'boss-intro', 'paused'].includes(mode)
  ) {
    stopBossCall()
    return
  }
  if (entranceMusic)
    entranceMusic.bus.gain.value = soundOn && mode !== 'paused' ? 0.25 : 0.8
  if (!soundOn || mode === 'paused') {
    stopBossCallSource(call)
    return
  }
  const buffer = soundBuffers[call.name]
  if (!audio || !buffer || call.source) return
  if (call.elapsed >= buffer.duration) {
    stopBossCall()
    return
  }
  const source = audio.createBufferSource(),
    gain = audio.createGain()
  source.buffer = buffer
  gain.gain.value = 0.9
  source.connect(gain)
  gain.connect(master)
  call.source = source
  call.gain = gain
  call.startedAt = audio.currentTime
  call.startOffset = call.elapsed
  source.onended = () => {
    // Ignore a completed source belonging to an earlier cast or paused take.
    if (bossCall === call && call.source === source) stopBossCall()
  }
  source.start(audio.currentTime, call.elapsed)
}
function updateBossCall(dt) {
  if (!bossCall) return
  bossCall.elapsed += dt
  if (bossCall.source)
    bossCall.elapsed = Math.max(
      bossCall.elapsed,
      bossCall.startOffset + audio.currentTime - bossCall.startedAt,
    )
  if (bossCall.elapsed >= (soundBuffers[bossCall.name]?.duration || 2))
    stopBossCall()
}

// AudioContext must be created/resumed from the player's first real gesture.
function unlockAudio() {
  if (!soundOn) return
  try {
    if (!audio) {
      audio = new AudioContext()
      master = audio.createGain()
      master.gain.value = 0.65
      const limiter = audio.createDynamicsCompressor()
      limiter.threshold.value = -16
      limiter.ratio.value = 8
      master.connect(limiter)
      limiter.connect(audio.destination)
      noiseBuffer = audio.createBuffer(
        1,
        audio.sampleRate * 0.35,
        audio.sampleRate,
      )
      const data = noiseBuffer.getChannelData(0)
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    }
    decodeSoundLibrary()
    audio.resume().catch(() => {
      soundOn = false
      stopEntranceMusic()
      syncStageMusic()
      syncSoundButton()
    })
    if (stageMusic) stageMusic.blocked = false
    syncStageMusic()
  } catch {
    soundOn = false
    syncStageMusic()
    syncSoundButton()
  }
}

// A separate audio bus lets skipping, pausing or restarting cancel every note,
// including notes scheduled to start later. Combat sounds keep their own path.
function stopEntranceMusic() {
  const music = entranceMusic
  entranceMusic = null
  if (!music || !audio) return
  const now = audio.currentTime
  music.bus.gain.cancelScheduledValues(now)
  music.bus.gain.setValueAtTime(music.bus.gain.value, now)
  music.bus.gain.linearRampToValueAtTime(0, now + 0.035)
  for (const source of music.sources) {
    try {
      source.stop(now + 0.04)
    } catch {
      /* A note may already have ended. */
    }
  }
  if (!music.sources.size) music.bus.disconnect()
}

function entranceNote(music, midi, at, duration, volume, type) {
  const oscillator = audio.createOscillator(),
    gain = audio.createGain(),
    frequency = 440 * 2 ** ((midi - 69) / 12)
  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, at)
  gain.gain.setValueAtTime(0.001, at)
  gain.gain.exponentialRampToValueAtTime(volume, at + 0.012)
  gain.gain.exponentialRampToValueAtTime(0.001, at + duration)
  oscillator.connect(gain)
  gain.connect(music.bus)
  music.sources.add(oscillator)
  oscillator.onended = () => {
    oscillator.disconnect()
    gain.disconnect()
    music.sources.delete(oscillator)
    if (!music.sources.size) {
      music.bus.disconnect()
      if (entranceMusic === music) entranceMusic = null
    }
  }
  oscillator.start(at)
  oscillator.stop(at + duration + 0.02)
}

function playEntranceMusic(kind, elapsed = 0) {
  stopEntranceMusic()
  if (STAGE_MUSIC_FILES[stage] && kind !== 'claude') {
    syncStageMusic()
    return
  }
  if (!soundOn || !audio || !master) return
  const music = { bus: audio.createGain(), sources: new Set(), kind },
    notes = []
  music.bus.gain.value = bossCall ? 0.25 : 0.8
  music.bus.connect(master)
  entranceMusic = music
  if (kind === 'spark') {
    // A bright, three-beat music-box flourish with a low circus pulse.
    ;[76, 79, 83, 81, 79, 76, 74, 78, 81, 79, 78, 74, 76, 79, 83, 88].forEach(
      (midi, i) => {
        notes.push([0.12 + i * 0.18, midi, 0.28, 0.13, 'sine'])
        notes.push([0.12 + i * 0.18, midi + 12, 0.13, 0.025, 'triangle'])
      },
    )
    for (let i = 0; i < 7; i++)
      notes.push([0.12 + i * 0.5, i % 2 ? 47 : 52, 0.38, 0.12, 'triangle'])
    for (const midi of [76, 79, 83])
      notes.push([3.25, midi, 0.55, 0.075, 'sine'])
  } else if (kind === 'claude') {
    ;[72, 76, 79, 84, 83, 79, 76, 72, 67, 72, 76, 79, 84, 88, 91, 96].forEach(
      (midi, i) => notes.push([0.1 + i * 0.18, midi, 0.32, 0.09, 'sine']),
    )
    for (const midi of [60, 64, 67, 84])
      notes.push([3.25, midi, 0.6, 0.065, 'triangle'])
  } else if (kind === 'kurumi' || kind === 'queen') {
    const melody =
      kind === 'kurumi'
        ? [57, 60, 64, 69, 68, 64, 60, 57, 52, 57, 60, 64, 69, 72, 76, 81]
        : [74, 78, 81, 86, 85, 81, 78, 74, 69, 74, 78, 81, 86, 90, 93, 98]
    melody.forEach((midi, i) =>
      notes.push([0.1 + i * 0.18, midi, 0.32, 0.09, 'sine']),
    )
    for (let i = 0; i < 6; i++)
      notes.push([i * 0.5, kind === 'kurumi' ? 33 : 38, 0.45, 0.13, 'triangle'])
    for (const midi of melody.slice(-3))
      notes.push([3.25, midi, 0.6, 0.07, 'sine'])
  } else {
    // A minor forest arpeggio, deep roots and distant bell harmonics.
    ;[57, 64, 69, 72, 71, 69, 64, 60, 57, 64, 69, 76, 72, 71, 69, 64].forEach(
      (midi, i) => notes.push([0.1 + i * 0.19, midi, 0.33, 0.095, 'triangle']),
    )
    for (let i = 0; i < 6; i++) {
      notes.push([0.08 + i * 0.55, 33, 0.5, 0.16, 'sine'])
      notes.push([0.35 + i * 0.55, 81, 0.32, 0.055, 'sine'])
    }
    for (const midi of [57, 60, 64, 76])
      notes.push([3.3, midi, 0.5, 0.07, 'sine'])
  }
  const now = audio.currentTime
  for (const [when, midi, duration, volume, type] of notes) {
    const remaining = when + duration - elapsed
    if (remaining <= 0.04) continue
    entranceNote(
      music,
      midi,
      now + Math.max(0, when - elapsed),
      Math.min(duration, remaining),
      volume,
      type,
    )
  }
  addEntranceAccent(music, elapsed)
  if (!music.sources.size) {
    music.bus.disconnect()
    entranceMusic = null
  }
}

function voice(from, to, duration, type, volume, delay = 0) {
  if (!soundOn || !audio || !master) return
  const at = audio.currentTime + delay
  const osc = audio.createOscillator(),
    gain = audio.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(from, at)
  osc.frequency.exponentialRampToValueAtTime(to, at + duration)
  gain.gain.setValueAtTime(0.001, at)
  gain.gain.exponentialRampToValueAtTime(volume, at + 0.006)
  gain.gain.exponentialRampToValueAtTime(0.001, at + duration)
  osc.connect(gain)
  gain.connect(master)
  osc.start(at)
  osc.stop(at + duration + 0.01)
  osc.onended = () => {
    osc.disconnect()
    gain.disconnect()
  }
}

function crunch(duration, volume, frequency = 1800, delay = 0) {
  if (!soundOn || !audio || !master || !noiseBuffer) return
  const source = audio.createBufferSource(),
    filter = audio.createBiquadFilter(),
    gain = audio.createGain()
  const at = audio.currentTime + delay
  source.buffer = noiseBuffer
  filter.type = 'bandpass'
  filter.frequency.value = frequency
  filter.Q.value = 0.6
  gain.gain.setValueAtTime(volume, at)
  gain.gain.exponentialRampToValueAtTime(0.001, at + duration)
  source.connect(filter)
  filter.connect(gain)
  gain.connect(master)
  source.start(at)
  source.stop(at + duration)
  source.onended = () => {
    source.disconnect()
    filter.disconnect()
    gain.disconnect()
  }
}

function attackSound(kind) {
  if (kind === 'shot') {
    voice(1250, 330, 0.13, 'square', 0.085)
    voice(720, 1400, 0.075, 'sine', 0.12)
    crunch(0.045, 0.07, 3400)
  } else if (kind === 'impact') {
    voice(90, 70, 0.075, 'sine', 0.11)
    crunch(0.055, 0.05, 650)
  } else if (kind === 'defeat') {
    crunch(0.1, 0.07, 900)
    voice(90, 55, 0.09, 'sine', 0.12)
  } else {
    crunch(0.3, 0.2, 950)
    voice(100, 50, 0.3, 'triangle', 0.32)
    for (let i = 0; i < 4; i++)
      voice(
        440 * 2 ** (i / 3),
        1000 * 2 ** (i / 3),
        0.22,
        'triangle',
        0.12,
        i * 0.04,
      )
  }
}
let best = 0
try {
  best = Number(localStorage.getItem('mint-parade-best')) || 0
} catch {
  /* Storage is optional. */
}
const firstPlatforms = [
  // Four optional two-step routes. The lower shelf is 90px above the floor;
  // its partner rises another 73px across a 40–50px gap, with wide landings.
  { x: 530, y: 438, w: 200 },
  { x: 770, y: 365, w: 200 },
  { x: 1430, y: 438, w: 210 },
  { x: 1690, y: 365, w: 200 },
  { x: 2380, y: 438, w: 200 },
  { x: 2630, y: 365, w: 200 },
  { x: 3320, y: 438, w: 200 },
  { x: 3560, y: 365, w: 200 },
]
const STAGES = {
  1: {
    name: '奶油城堡',
    english: 'SUGAR CASTLE',
    length: 4800,
    bossX: 4330,
    arena: 3750,
    boss: 'spark',
    bossName: '火花',
    bossHp: 24,
    count: 15,
    platforms: firstPlatforms,
    hazards: [],
  },
  2: {
    name: '幽绿迷宫',
    english: 'EMERALD LABYRINTH',
    length: 5800,
    bossX: 5300,
    arena: 4800,
    boss: 'nuonu',
    bossName: '糯糯',
    bossHp: 72,
    count: 21,
    platforms: [
      { x: 650, y: 420, w: 150 },
      { x: 835, y: 325, w: 140 },
      { x: 1480, y: 430, w: 125 },
      { x: 1650, y: 335, w: 120 },
      { x: 2310, y: 410, w: 150 },
      { x: 2530, y: 325, w: 135 },
      { x: 3020, y: 428, w: 125 },
      { x: 3210, y: 337, w: 130 },
      { x: 3870, y: 420, w: 140 },
      { x: 4060, y: 325, w: 125 },
      { x: 4760, y: 423, w: 145 },
    ],
    hazards: [
      { x: 980, w: 96, kind: 'thorns', offset: 0 },
      { x: 1780, w: 100, kind: 'thorns', offset: 0.8 },
      { x: 2630, w: 100, kind: 'thorns', offset: 1.6 },
      { x: 3400, w: 105, kind: 'thorns', offset: 2.4 },
      { x: 4240, w: 110, kind: 'thorns', offset: 3.2 },
      { x: 1310, w: 78, kind: 'spores', offset: 0 },
      { x: 2210, w: 78, kind: 'spores', offset: 1.4 },
      { x: 3150, w: 78, kind: 'spores', offset: 0.7 },
      { x: 3980, w: 78, kind: 'spores', offset: 2.1 },
    ],
  },
  4: {
    name: '晴蓝潮汐海岸',
    english: 'THE AZURE TIDELANDS',
    length: 4700,
    count: 0,
    boss: null,
    bossName: '大肥鲸 · 海岸 I',
    platforms: [
      { x: 550, y: 438, w: 250 },
      { x: 850, y: 355, w: 270 },
      { x: 1350, y: 438, w: 280 },
      { x: 1690, y: 350, w: 260 },
      { x: 2020, y: 275, w: 280 },
      { x: 2420, y: 360, w: 300 },
      { x: 2850, y: 438, w: 260 },
      { x: 3180, y: 355, w: 280 },
      { x: 3540, y: 430, w: 320 },
    ],
    hazards: [],
  },
  3: {
    name: '绯红时钟庭',
    english: 'THE CRIMSON CLOCK COURT',
    length: 1800,
    arena: 250,
    bossX: 1100,
    boss: 'kurumi',
    bossName: '时崎狂三',
    bossHp: 84,
    count: 0,
    platforms: [],
    hazards: [],
  },
}
let platforms = firstPlatforms
const clamp = (n, a, b) => Math.max(a, Math.min(b, n))
const random = (a, b) => a + Math.random() * (b - a)

function tone(frequency, duration = 0.08, type = 'square', volume = 0.025) {
  if (!soundOn || !audio) return
  const oscillator = audio.createOscillator(),
    gain = audio.createGain()
  oscillator.type = type
  oscillator.frequency.setValueAtTime(frequency, audio.currentTime)
  oscillator.frequency.exponentialRampToValueAtTime(
    Math.max(50, frequency * 0.55),
    audio.currentTime + duration,
  )
  gain.gain.setValueAtTime(volume, audio.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration)
  oscillator.connect(gain)
  gain.connect(master || audio.destination)
  oscillator.start()
  oscillator.stop(audio.currentTime + duration)
  oscillator.onended = () => {
    oscillator.disconnect()
    gain.disconnect()
  }
}

function image(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(src))
    img.src = src
  })
}

// Extract cells at load time. Flood-fill only the connected paper background;
// the pale dress and character highlights remain intact. Original PNGs stay untouched.
const CAKE_WALK_LEG_GAPS = [
  [223, 343, 241, 358],
  [225, 344, 242, 359],
  [199, 325, 213, 340],
  [210, 343, 230, 356],
  [228, 343, 247, 360],
  [231, 338, 248, 354],
  [205, 332, 220, 348],
  [207, 343, 226, 359],
]
// The idle/casting sheet has an enclosed paper background between the legs.
// Its dark stocking/ribbon outlines contain a fill started below the skirt.
const CAKE_STAND_LEG_GAPS = Array.from({ length: 8 }, (_, index) => ({
  seed: index === 7 ? [205, 385] : [235, 390],
  top: index < 4 ? 333 : 320,
}))
function cleanHeroPixels(p, w, h, legGap) {
  // Keep the character's connected silhouette; neighboring-row fragments and
  // faint exported matte pixels must never float above or below the character.
  const seen = new Uint8Array(w * h),
    queue = new Int32Array(w * h)
  let largest = { count: 0, top: 0, bottom: h - 1 }
  for (let i = 0; i < w * h; i++) {
    if (seen[i] || p[i * 4 + 3] <= 80) continue
    let head = 0,
      tail = 1,
      top = h,
      bottom = 0
    queue[0] = i
    seen[i] = 1
    while (head < tail) {
      const at = queue[head++],
        x = at % w,
        y = Math.floor(at / w)
      top = Math.min(top, y)
      bottom = Math.max(bottom, y)
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx,
            ny = y + dy,
            next = ny * w + nx
          if (
            nx < 0 ||
            nx >= w ||
            ny < 0 ||
            ny >= h ||
            seen[next] ||
            p[next * 4 + 3] <= 80
          )
            continue
          seen[next] = 1
          queue[tail++] = next
        }
    }
    if (tail > largest.count) largest = { count: tail, top, bottom }
  }
  for (let i = 0; i < w * h; i++) {
    const y = Math.floor(i / w)
    if (p[i * 4 + 3] < 24 || y < largest.top - 2 || y > largest.bottom + 2)
      p[i * 4 + 3] = 0
  }
  // The cake walk sheet has a small white export wedge between the hanging
  // brown ribbons. Confine cleanup to its measured location in each pose;
  // whitening/keying the whole sprite would also erase the stockings/frills.
  if (legGap) {
    if (!Array.isArray(legGap)) {
      const seen = new Uint8Array(w * h),
        queue = new Int32Array(w * h)
      let head = 0,
        tail = 0
      const push = (x, y) => {
        if (x < 140 || x > 355 || x >= w || y < legGap.top || y >= h) return
        const at = y * w + x,
          n = at * 4
        if (seen[at]) return
        seen[at] = 1
        const min = Math.min(p[n], p[n + 1], p[n + 2]),
          max = Math.max(p[n], p[n + 1], p[n + 2])
        if (p[n + 3] < 24 || (min > 180 && max - min < 48)) {
          p[n + 3] = 0
          queue[tail++] = at
        }
      }
      push(...legGap.seed)
      while (head < tail) {
        const at = queue[head++],
          x = at % w,
          y = Math.floor(at / w)
        push(x - 1, y)
        push(x + 1, y)
        push(x, y - 1)
        push(x, y + 1)
      }
      return
    }
    const [left, top, right, bottom] = legGap
    for (let y = top; y <= bottom; y++)
      for (let x = left; x <= right; x++) {
        const n = (y * w + x) * 4,
          min = Math.min(p[n], p[n + 1], p[n + 2]),
          max = Math.max(p[n], p[n + 1], p[n + 2])
        if (min > 160 && max - min < 70) p[n + 3] = 0
      }
  }
}
function cleanClockEnemyPixels(p, w, h, index) {
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const alpha = (y * w + x) * 4 + 3
      // These two attack cells contain a painted projectile. The simulation
      // emits its own projectile, so keep only the creature's silhouette.
      const bakedShot =
        (index === 5 && (x < 224 || (x < 260 && y >= 150 && y < 225))) ||
        (index === 8 && x < 234)
      if (p[alpha] < 24 || bakedShot) p[alpha] = 0
    }
}
function spriteFrames(
  img,
  columns,
  rows,
  paper,
  columnEdges,
  rowEdges,
  hero = false,
  legGaps,
) {
  const frames = []
  for (let row = 0; row < rows; row++)
    for (let col = 0; col < columns; col++) {
      const cell = document.createElement('canvas')
      const horizontalEdges =
        columnEdges &&
        (Array.isArray(columnEdges[0]) ? columnEdges[row] : columnEdges)
      const sx = horizontalEdges
        ? horizontalEdges[col]
        : (col * img.width) / columns
      const sw = horizontalEdges
        ? horizontalEdges[col + 1] - sx
        : img.width / columns
      const verticalEdges =
        rowEdges && (Array.isArray(rowEdges[0]) ? rowEdges[col] : rowEdges)
      const sy = verticalEdges ? verticalEdges[row] : (row * img.height) / rows
      const sh = verticalEdges ? verticalEdges[row + 1] - sy : img.height / rows
      const w = (cell.width = Math.floor(sw)),
        h = (cell.height = Math.floor(sh))
      const c = cell.getContext('2d', { willReadFrequently: true })
      c.drawImage(img, sx, sy, sw, sh, 0, 0, w, h)
      const data = c.getImageData(0, 0, w, h),
        p = data.data
      // Transparent boss sheets contain a bright blue export fringe.
      if (paper === 'whale-body' || paper === 'deep-body') {
        cleanWhaleBodyPixels(p, w, h)
        if (paper === 'deep-body')
          for (let n = 0; n < p.length; n += 4)
            if (p[n] > 200 && p[n + 1] < 45 && p[n + 2] < 45) p[n + 3] = 0
      } else if (paper === 'clock-enemy') {
        cleanClockEnemyPixels(p, w, h, row * columns + col)
      } else if (paper === 'violet' || paper === 'queen-violet') {
        for (let n = 0; n < p.length; n += 4) {
          const r = p[n],
            g = p[n + 1],
            b = p[n + 2]
          if (
            p[n + 3] < 32 ||
            (r > g + 145 && b > g + 145 && g < 65) ||
            (b > r + 95 && b > g + 100 && g < 90)
          )
            p[n + 3] = 0
        }
        // The last standing cell includes the previous pose's beam on its left.
        if (paper === 'queen-violet' && row * columns + col === 7)
          for (let y = 0; y < h; y++)
            for (let x = 0; x < 65; x++) p[(y * w + x) * 4 + 3] = 0
      } else if (paper === 'royal') {
        for (let n = 0; n < p.length; n += 4)
          if (
            p[n] > p[n + 1] + 145 &&
            p[n + 2] > p[n + 1] + 145 &&
            p[n + 1] < 65
          )
            p[n + 3] = 0
      } else if (paper === 'claude' || paper === 'deep-cast') {
        // Preserve white clothing and orange glow; remove the red export fringe.
        for (let n = 0; n < p.length; n += 4)
          if (p[n + 3] < 24 || (p[n] > 200 && p[n + 1] < 45 && p[n + 2] < 45))
            p[n + 3] = 0
        if (paper === 'deep-cast') cleanWhaleBodyPixels(p, w, h)
      } else if (paper === 'effect') {
        // Exported glow sheets have almost-transparent colored matte pixels.
        // Keep the actual glow; discard only the invisible background noise.
        for (let n = 3; n < p.length; n += 4) if (p[n] < 24) p[n] = 0
      } else if (paper === 'nuonu') {
        for (let n = 0; n < p.length; n += 4)
          if (p[n + 2] > p[n] + 95 && p[n + 2] > p[n + 1] + 50 && p[n] < 100)
            p[n + 3] = 0
      } else if (paper) {
        const visited = new Uint8Array(w * h),
          queue = new Int32Array(w * h)
        let head = 0,
          tail = 0
        const push = (i) => {
          if (i < 0 || i >= w * h || visited[i]) return
          visited[i] = 1
          const n = i * 4,
            min = Math.min(p[n], p[n + 1], p[n + 2]),
            max = Math.max(p[n], p[n + 1], p[n + 2])
          const r = p[n],
            g = p[n + 1],
            b = p[n + 2]
          const background =
            paper === 'dark'
              ? max < 35
              : paper === 'blue'
                ? b > g + 3 && g > r + 12 && b - r < 90 && r > 25
                : paper === 'jump-paper'
                  ? Math.abs(r - 206) <= 9 &&
                    Math.abs(g - 189) <= 9 &&
                    Math.abs(b - 178) <= 9 &&
                    r - g >= 14 &&
                    r - g <= 22 &&
                    g - b >= 7 &&
                    g - b <= 15
                  : paper === 'beige'
                    ? r > 95 &&
                      r - g >= 8 &&
                      r - g < 30 &&
                      g - b >= 5 &&
                      g - b < 24
                    : paper === 'checker'
                      ? min > 135 && max - min < 15
                      : min > 211 && max - min < 42
          if (background) {
            p[n + 3] = 0
            queue[tail++] = i
          }
        }
        for (let x = 0; x < w; x++) {
          push(x)
          push((h - 1) * w + x)
        }
        for (let y = 0; y < h; y++) {
          push(y * w)
          push(y * w + w - 1)
        }
        while (head < tail) {
          const i = queue[head++]
          if (i % w) push(i - 1)
          if (i % w < w - 1) push(i + 1)
          push(i - w)
          push(i + w)
        }
        // Remove the sheet's disconnected gray contact shadows, below the boots.
        for (let y = Math.floor(h * 0.9); paper === true && y < h; y++)
          for (let x = 0; x < w; x++) {
            const n = (y * w + x) * 4
            if (
              p[n] > 150 &&
              p[n + 1] > 140 &&
              p[n + 2] > 150 &&
              Math.max(p[n], p[n + 1], p[n + 2]) -
                Math.min(p[n], p[n + 1], p[n + 2]) <
                42
            )
              p[n + 3] = 0
          }
      }
      if (hero) cleanHeroPixels(p, w, h, legGaps?.[row * columns + col])
      c.putImageData(data, 0, 0)
      let minX = w,
        minY = h,
        maxX = 0,
        maxY = 0
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++)
          if (p[(y * w + x) * 4 + 3] > 80) {
            minX = Math.min(minX, x)
            maxX = Math.max(maxX, x)
            minY = Math.min(minY, y)
            maxY = Math.max(maxY, y)
          }
      frames.push({
        img: cell,
        x: minX,
        y: minY,
        w: maxX - minX + 1,
        h: maxY - minY + 1,
        anchor: w / 2,
        bottom: maxY + 1,
      })
    }
  // One scale for the entire sequence, never resize each pose independently.
  frames.height = Math.max(...frames.map((f) => f.h))
  return frames
}

function queenBodyFrames(img) {
  const frames = spriteFrames(
    img,
    4,
    2,
    'queen-violet',
    [0, 443, 887, 1330, 1774],
    [0, 459, 887],
  )
  // Register the body, rather than its baked magic, at a single standing scale.
  frames.bodyHeight = 382
  const centers = [243, 273, 272, 287, 226, 281, 279, 259]
  const feet = [437, 432, 437, 437, 376, 382, 387, 387]
  frames.forEach((f, i) => {
    f.anchor = centers[i]
    f.bottom = feet[i]
  })
  return frames
}
function queenSlashFrames(img) {
  // This asset is one complete horizontal attack, not an animation sheet.
  return spriteFrames(img, 1, 1, 'violet')
}

function queenSwordFrames(img) {
  const frames = spriteFrames(
    img,
    4,
    2,
    'violet',
    [
      [0, 362, 724, 1086, 1448],
      [0, 375, 744, 1090, 1448],
    ],
    [0, 556, 1086],
  )
  // Each planted cluster uses the same scale and floor; the sword length is
  // painted into the poses and must not be normalized frame by frame.
  frames.scale = 100 / 362
  const centers = [184, 173, 164, 167, 193, 191, 184, 186]
  frames.forEach((f, i) => {
    f.anchor = centers[i]
    f.bottom = i < 4 ? 542 : 484
  })
  frames.heights = frames.map((f) =>
    Math.max(25, (f.bottom - f.y) * frames.scale - 12),
  )
  return frames
}
function clockEnemyFrames(img) {
  // The moth's open wing exceeds x=512. The next attack begins at x=982;
  // neither belongs in the middle walking cell. Cut at the actual gaps.
  const columns = [0, 550, 956, 1536]
  const frames = spriteFrames(
    img,
    3,
    3,
    'clock-enemy',
    columns,
    [0, 340, 674, 1024],
  )
  const centers = [315, 762, 1300, 240, 747, 1273, 259, 750, 1290]
  frames.forEach((f, i) => {
    f.anchor = centers[i] - columns[i % 3]
  })
  return frames
}

function clearBossIntro() {
  stopEntranceMusic()
  bossIntro = null
  resumeMode = 'playing'
  $('screen').classList.remove('boss-intro-active')
  $('skip-boss-intro').hidden = true
  $('boss-nameplate').hidden = true
  $('boss-announcement').textContent = ''
}

function beginBossIntro(boss) {
  if (bossIntro || boss.introDone || boss.hp <= 0) return
  const theme = BOSS_ENTRANCES[boss.bossKind]
  stopBossCall()
  if (stage === 4) stopOceanSkillCall()
  endTimeStop(false)
  if (
    (stage === 1 && boss.bossKind === 'spark') ||
    (stage === 2 && boss.bossKind === 'nuonu')
  )
    stageMusicBossStarted = true
  bossIntro = {
    boss,
    elapsed: 0,
    duration: ENTRANCE_DURATION,
    fromCamera: camera,
    focusCamera: clamp(boss.x - W * 0.76, 0, LENGTH - W),
  }
  mode = 'boss-intro'
  // Cinematics use elapsed real time, even if the preview renders fewer frames.
  last = performance.now()
  boss.active = true
  boss.state = 'entrance'
  boss.stateTime = 0
  boss.face = Math.sign(player.x - boss.x) || -1
  boss.y = boss.bossKind === 'queen' ? FLOOR - 380 : FLOOR
  // Cancel old attacks on both sides and require fresh input after the reveal.
  keys.clear()
  bullets = []
  vines = []
  particles = []
  impacts = []
  floaters = []
  shake = 0
  player.vx = 0
  player.jumpBuffer = 0
  player.slam = null
  player.dropPlatform = null
  player.attack = 0
  player.wandPending = false
  player.ranged = 0
  player.rangedLeft = 0
  player.burst = 0
  player.muzzle = 0
  toastTime = 0
  $('toast').classList.remove('show')
  $('screen').classList.add('boss-intro-active')
  $('skip-boss-intro').hidden = false
  $('skip-boss-intro').disabled = true
  $('boss-nameplate').hidden = false
  $('boss-nameplate').style.opacity = '0'
  $('boss-nameplate').setAttribute('data-state', 'moving')
  $('boss-intro-number').textContent = `BOSS 0${stage} / ${STAGES[stage].name}`
  $('boss-intro-title').textContent =
    boss.bossKind === 'nuonu' && boss.phaseLevel === 2
      ? '破叶狂怒 · 森林守卫'
      : theme.title
  $('boss-intro-name').textContent = theme.name || STAGES[stage].bossName
  $('boss-intro-english').textContent = theme.english
  $('boss-intro-quote').textContent = theme.quote
  $('boss-intro-moves').textContent = theme.moves
  $('boss-announcement').textContent =
    `${theme.name || STAGES[stage].bossName}登场，${theme.title}。${theme.moves}。空格或 Enter 跳过，P 暂停。`
  $('status').textContent = `${theme.name || STAGES[stage].bossName} · 出场演出`
  playEntranceMusic(boss.bossKind)
  if (boss.bossKind === 'nuonu')
    beginBossCall(
      boss.phaseLevel === 2 ? 'nuonu-voice-2' : 'nuonu-voice-1',
      boss,
    )
  updateHud()
}

function finishBossIntro() {
  if (!bossIntro) return
  const boss = bossIntro.boss
  const theme = BOSS_ENTRANCES[boss.bossKind]
  boss.introDone = true
  boss.state = 'idle'
  boss.stateTime = 0
  boss.phase = 0
  boss.fired = false
  boss.y = FLOOR
  clearBossIntro()
  mode = 'playing'
  keys.clear()
  // A small reaction window also protects against an enemy beside the player.
  player.inv = Math.max(player.inv, 0.8)
  $('status').textContent = '冒险进行中'
  canvas.focus({ preventScroll: true })
  toast(`${theme.name || STAGES[stage].bossName} · 开战！${theme.moves}`)
  if (boss.bossKind === 'claude') beginClaudeLaserCharge(boss)
  syncStageMusic()
  updateHud()
}

function skipBossIntro() {
  if (mode === 'boss-intro' && bossIntro.elapsed >= 0.45) finishBossIntro()
}

function updateBossIntro(dt) {
  bossIntro.elapsed += dt
  bossIntro.boss.stateTime = bossIntro.elapsed
  if (bossIntro.boss.bossKind === 'queen')
    bossIntro.boss.y =
      FLOOR - 380 * (1 - clamp(bossIntro.elapsed / 1.2, 0, 1)) ** 2
  const pan = clamp(bossIntro.elapsed / 0.55, 0, 1),
    ease = 1 - (1 - pan) ** 3
  camera = reducedMotion
    ? bossIntro.focusCamera
    : bossIntro.fromCamera +
      (bossIntro.focusCamera - bossIntro.fromCamera) * ease
  const entering = clamp(
      (bossIntro.elapsed - ENTRANCE_CARD_START) / ENTRANCE_CARD_SLIDE,
      0,
      1,
    ),
    leaving = clamp(
      (bossIntro.elapsed - (bossIntro.duration - ENTRANCE_CARD_SLIDE)) /
        ENTRANCE_CARD_SLIDE,
      0,
      1,
    ),
    offset = -((1 - entering) ** 3) + leaving ** 3
  $('boss-nameplate').style.transform = reducedMotion
    ? 'none'
    : `translateX(${(offset * 100) / 0.55}%)`
  $('boss-nameplate').style.opacity = String(entering * (1 - leaving))
  $('boss-nameplate').setAttribute(
    'data-state',
    entering === 1 && leaving === 0 ? 'hold' : 'moving',
  )
  $('skip-boss-intro').disabled = bossIntro.elapsed < 0.45
  if (bossIntro.elapsed >= bossIntro.duration) finishBossIntro()
}

function reset(nextStage = 1, totals = { score: 0, sweets: 0, kills: 0 }) {
  stopBossCall()
  stopOceanSkillCall()
  oceanJourney = null
  timeStopCallIndex = 0
  stageMusicBossStarted = false
  stopStageMusic()
  clearBossIntro()
  endTimeStop(false)
  cameraY = 0
  clockJourney = null
  stage = nextStage
  const config = STAGES[stage]
  LENGTH = config.length
  platforms = config.platforms
  hazards = config.hazards.map((h) => ({ ...h }))
  vines = []
  stageCheckpoint = { ...totals }
  keys.clear()
  player = {
    x: 170,
    y: FLOOR,
    vx: 0,
    vy: 0,
    face: 1,
    hp: 5,
    inv: 0,
    potions: 0,
    ward: 0,
    wardAge: 0,
    wardHit: 0,
    wardTrail: [],
    shoot: 0,
    weapon: stage === 4 ? 'ocean' : 'cake',
    oceanPending: false,
    deepFormTime: 0,
    deepFormUsed: false,
    deepBlink: null,
    deepBlinkCooldown: 0,
    oceanAttackKind: 'wave',
    oceanUltimate: 0,
    oceanUltimateAge: 0,
    oceanUltimateFace: 1,
    oceanDrainResolved: true,
    oceanDrainTargets: [],
    wandCharge: 0,
    wandPending: false,
    weaponReveal: 0,
    attack: 0,
    attackAge: 0,
    meleeCooldown: 0,
    combo: 0,
    comboWindow: 0,
    attackFace: 1,
    swingResolved: false,
    sugar: 0,
    ranged: 0,
    rangedTimer: 0,
    rangedLeft: 0,
    special: 0,
    burst: 0,
    walk: 0,
    aliceWalkTime: 0,
    muzzle: 0,
    roll: 0,
    rollCooldown: 0,
    rollFace: 1,
    jumpAge: 0,
    landing: 0,
    ground: true,
    coyote: 0.1,
    jumpBuffer: 0,
    slam: null,
    dropPlatform: null,
    heal: 0,
  }
  camera = 0
  score = totals.score
  sweets = totals.sweets
  kills = totals.kills
  shake = 0
  time = 0
  bullets = []
  particles = []
  impacts = []
  floaters = []
  drops = []
  oceanSupplyTimer = 0
  chests =
    stage === 2
      ? [
          { platform: 1, offset: -6 },
          { platform: 8, offset: 6 },
          { platform: 6, offset: 0 },
        ].map(({ platform, offset }) => {
          const p = platforms[platform]
          return {
            x: p.x + p.w / 2 + offset,
            y: p.y,
            platform,
            opened: false,
            age: 0,
          }
        })
      : []
  if (stage === 4) {
    oceanJourney = {
      room: 'coast',
      hasKey: false,
      portal: 'sealed',
      portalAge: 0,
    }
    chests = [
      { x: OCEAN_CHEST_X, y: FLOOR, kind: 'ocean', opened: false, age: 0 },
    ]
    resetOceanSupplies()
  }
  enemies = Array.from({ length: config.count }, (_, i) => ({
    x: stage === 1 ? 720 + i * 253 : 620 + i * 198,
    homeX: stage === 1 ? 720 + i * 253 : 620 + i * 198,
    patrolDir: i % 2 ? -1 : 1,
    face: -1,
    moving: false,
    y: FLOOR,
    hp: (i % 3 === 2 ? 4 : 3) + (stage === 2 ? 2 : 0),
    type: i % 3,
    family: stage === 2 ? 'plant' : 'sweet',
    attack: 0,
    phase: i * 1.7,
    hit: 0,
    shot: stage === 2 ? 1.1 + (i % 3) * 0.35 : 2 + (i % 3),
    active: false,
  }))
  if (stage === 4) resetOceanEnemies()
  if (config.boss)
    enemies.push({
      x: config.bossX,
      y: FLOOR,
      hp: config.bossHp,
      maxHp: config.bossHp,
      bossKind: config.boss,
      phaseLevel: 1,
      type: 3,
      phase: 0,
      hit: 0,
      shot: 2,
      active: false,
      introDone: false,
      state: 'idle',
      stateTime: 0,
      pattern: 0,
      fired: false,
      face: -1,
    })
  // Place forest supplies after encounters, where melee fighters need them.
  for (const p of [1200, 2050, 3000, 4480])
    if (stage === 2)
      drops.push({
        x: p,
        y: FLOOR - 46,
        base: FLOOR - 46,
        phase: 0,
        kind: 'heart',
      })
  if (stage === 2)
    drops.push({
      x: 4670,
      y: FLOOR - 48,
      base: FLOOR - 48,
      phase: 0,
      kind: 'elixir',
    })
  if (stage !== 4)
    platforms.forEach((p) => {
      for (let i = 0; i < 3; i++)
        drops.push({
          x: p.x + 35 + i * 48,
          y: p.y - 34,
          base: p.y - 34,
          phase: i,
          kind: 'candy',
        })
    })
  if (stage === 3) {
    clockJourney = {
      room: null,
      key: false,
      wand: false,
      unlocked: false,
      portalTransition: null,
      cache: {},
      visited: new Set(),
      mapOpen: false,
    }
    enterClockRoom('entry', { x: 170, y: FLOOR })
  }
  updateHud()
}

function toast(text) {
  $('toast').textContent = text
  $('toast').classList.add('show')
  toastTime = 3
}
function updateHud() {
  const config = STAGES[stage]
  $('stage-number').textContent = `STAGE 0${stage}`
  $('stage-name').textContent = config.name
  $('stamp-title').textContent = config.english
  $('stamp-stage').textContent = `0${stage} — ${config.name}`
  $('stage-one').setAttribute('aria-pressed', String(stage === 1))
  $('stage-two').setAttribute('aria-pressed', String(stage === 2))
  $('stage-three').setAttribute('aria-pressed', String(stage === 3))
  $('stage-four').setAttribute('aria-pressed', String(stage === 4))
  $('screen').classList[stage === 4 ? 'add' : 'remove']('ocean-coast')
  $('screen').classList[isOceanArena() ? 'add' : 'remove']('ocean-arena')
  $('screen').classList[stage === 2 ? 'add' : 'remove']('forest')
  $('screen').classList[stage === 3 ? 'add' : 'remove']('clock-court')
  $('clock-objective').hidden = stage !== 3
  $('clock-map').hidden = stage !== 3 || !clockJourney?.mapOpen
  $('roll-label').textContent =
    player.roll > 0
      ? '翻滚中'
      : player.rollCooldown > 0
        ? `翻滚 ${player.rollCooldown.toFixed(1)}s`
        : '翻滚 就绪'
  $('roll-key').textContent =
    stage === 4 && oceanJourney?.relicCollected ? '⇧' : 'L / ⇧'
  $('potion-status').hidden = stage === 1 || stage === 4
  $('potion-status').setAttribute('data-active', String(player.ward > 0))
  $('potion-label').textContent =
    player.ward > 0
      ? `魔法护盾 ${player.ward.toFixed(1)}s · 药水 ×${player.potions}`
      : `魔法药水 ×${player.potions} · Q 使用`
  $('ward-fill').style.width = `${(player.ward / POTION_DURATION) * 100}%`
  const chest = nearbyChest()
  $('chest-hint').hidden = !chest || mode !== 'playing'
  $('chest-hint').textContent =
    stage === 4 ? oceanChestHint() : 'E 打开猫猫宝箱 · 内含无敌药水'
  const boss = enemies.find((e) => e.type === 3 && e.active)
  $('boss-status').hidden = !boss || !!bossIntro
  $('boss-status').setAttribute('data-phase', String(boss?.phaseLevel || 1))
  if (boss)
    $('boss-status').textContent =
      `${BOSS_ENTRANCES[boss.bossKind]?.name || config.bossName} ${boss.hp}/${boss.maxHp}${stage === 2 ? ` · ${boss.phaseLevel === 2 ? 'II 破叶狂怒' : 'I 四叶守卫'}` : ''} · ${{ idle: '观察', windup: '即将出招', cast: stage === 2 ? '飞叶齐射' : '红心魔术', dash: stage === 2 ? '藤叶突进' : '帽子冲刺', recover: '收招空隙', transform: '半血觉醒', slam: '根须震地', 'laser-charge': '花光蓄力 · 准备翻滚', 'laser-cast': '激柱横推 · 翻滚穿过' }[boss.state]}`
  $('health-label').textContent = stage === 4 ? '潮汐之心' : '甜心能量'
  if (player.hudHp !== player.hp || player.hudHeartStage !== stage) {
    $('hearts').innerHTML = Array.from(
      { length: 5 },
      (_, i) =>
        `<span class="hero-heart${stage === 4 ? ' ocean-heart' : ''}${i < player.hp ? '' : ' empty'}" aria-hidden="true"></span>`,
    ).join('')
    player.hudHp = player.hp
    player.hudHeartStage = stage
  }
  $('hearts').setAttribute('aria-label', `生命值 ${player.hp} / 5`)
  $('score').textContent = String(score).padStart(6, '0')
  $('candies').textContent = String(sweets).padStart(2, '0')
  $('special-fill').style.width = `${player.sugar}%`
  $('special-fill').parentElement?.setAttribute('aria-label', '星糖能量')
  $('special-fill').parentElement?.setAttribute(
    'aria-valuenow',
    String(Math.floor(player.sugar + 1e-8)),
  )
  $('special-label').textContent =
    player.ranged > 0
      ? '星糖齐射 · 释放中'
      : player.sugar >= 100
        ? '星糖齐射 · K 可释放'
        : `星糖能量 ${Math.floor(player.sugar + 1e-8)}/100 · +2/s`
  $('weapon-status').hidden = stage !== 3
  $('weapon-status').setAttribute('data-weapon', player.weapon)
  $('weapon-label').textContent =
    player.weapon === 'wand'
      ? `糖果魔法棒 · J 射击 · 魔力 ${Math.floor(player.wandCharge + 1e-8)}/${WAND_CHARGES}`
      : 'J 蛋糕近战 · 前厅高台的宝箱藏着新武器'
  $('wand-fill').style.width = `${(player.wandCharge / WAND_CHARGES) * 100}%`
  $('screen-note').textContent =
    `${Math.min(100, Math.floor((player.x / (LENGTH - 260)) * 100))}% · ${stage === 2 ? '穿过迷宫，抵达森林门' : '向甜品屋前进'} →`
  if (stage === 3) updateClockHud()
  if (stage === 4) updateOceanHud()
}
function start() {
  if (mode === 'loading' || mode === 'error') return
  if (mode === 'boss-intro') return
  last = performance.now()
  if (mode === 'paused') {
    mode = bossIntro ? 'boss-intro' : resumeMode
  } else {
    const arenaRetry = isOceanArena() && mode !== 'won'
    if (mode === 'stage-clear') reset(stage + 1, { score, sweets, kills })
    else if (mode === 'won') reset(1)
    else reset(stage, stageCheckpoint)
    mode = 'playing'
    if (arenaRetry) enterOceanArena()
    toast(
      `STAGE 0${stage} · ${STAGES[stage].name}${stage === 2 ? ' · 小心荆棘与孢子！' : '，出发！'}`,
    )
  }
  $('overlay').hidden = true
  $('pause').disabled = false
  $('pause').textContent = 'Ⅱ'
  $('pause').setAttribute('aria-label', '暂停游戏')
  $('status').textContent = bossIntro
    ? `${BOSS_ENTRANCES[bossIntro.boss.bossKind].name || STAGES[stage].bossName} · 出场演出`
    : '冒险进行中'
  canvas.focus({ preventScroll: true })
  unlockAudio()
  if (bossIntro) {
    $('skip-boss-intro').hidden = false
    playEntranceMusic(bossIntro.boss.bossKind, bossIntro.elapsed)
  }
}
function overlay(tag, title, copy, button) {
  $('overlay-tag').textContent = tag
  $('overlay-title').innerHTML = title
  $('overlay-copy').innerHTML = copy
  $('start').textContent = button
  $('overlay').hidden = false
}
function pause() {
  if (mode === 'paused') {
    start()
    return
  }
  if (mode !== 'playing' && mode !== 'boss-intro') return
  resumeMode = mode
  mode = 'paused'
  syncStageMusic()
  keys.clear()
  stopEntranceMusic()
  $('skip-boss-intro').hidden = true
  $('status').textContent = '已暂停'
  $('pause').textContent = '▶'
  $('pause').setAttribute('aria-label', '继续游戏')
  if (bossIntro) return
  overlay(
    'TAKE A SWEET BREAK',
    '休息一下，<br>甜蜜不打烊。',
    '你的冒险还在这里等你。',
    '继续冒险 →',
  )
}
function finish(won) {
  stopBossCall()
  clearBossIntro()
  endTimeStop(false)
  mode = won ? (stage < 4 ? 'stage-clear' : 'won') : 'lost'
  syncStageMusic()
  keys.clear()
  $('pause').disabled = true
  if (won) score += player.hp * 500
  best = Math.max(best, score)
  try {
    localStorage.setItem('mint-parade-best', String(best))
  } catch {
    /* Optional. */
  }
  $('status').textContent = won
    ? stage < 4
      ? `第 ${stage} 关完成`
      : '花光圣殿通关！'
    : '冒险结束'
  overlay(
    won
      ? stage < 4
        ? `STAGE 0${stage} COMPLETE`
        : 'STAGE 04-2 COMPLETE!'
      : 'ONE MORE SWEET TRY',
    won
      ? stage < 4
        ? stage === 1
          ? '穿过城堡，<br>森林正等着你。'
          : stage === 2
            ? '穿过森林，<br>绯红钟庭的门已打开。'
            : '时钟再次转动，<br>前往晴蓝潮汐海岸。'
        : '花光圣殿通关！<br>橙金之战落幕。'
      : '别灰心，<br>再来一颗糖！',
    `得分 ${String(score).padStart(6, '0')} · 收集 ${sweets} 颗糖果<br>${stage < 4 && won ? '下一关：' + STAGES[stage + 1].name + ' · ' + STAGES[stage + 1].bossName : '击败 ' + kills + ' 个敌人 · 最高分 ' + best}`,
    won
      ? stage < 4
        ? `进入第 ${stage + 1} 关 →`
        : '从第一关再出发 →'
      : '重试本关 →',
  )
  $('start-hint').textContent =
    stage === 1 && won
      ? '带上累计得分，满血进入第二关'
      : '每次出发，都是新的甜蜜冒险'
  updateHud()
  tone(won ? 880 : 160, 0.5, 'triangle')
}

function burst(x, y, color, count = 12, shape) {
  for (let i = 0; i < count; i++)
    particles.push({
      x,
      y,
      vx: random(-170, 170),
      vy: random(-220, 60),
      life: random(0.25, 0.65),
      max: 0.65,
      color,
      size: random(3, 7),
      spin: random(-9, 9),
      shape: shape ?? i % 3,
    })
}
function hitEnemy(e, damage) {
  if (
    mode !== 'playing' ||
    e.hp <= 0 ||
    e.state === 'transform' ||
    (e.type === 3 && !e.introDone)
  )
    return
  e.hp = Math.round((e.hp - damage) * 1e6) / 1e6
  if (e.bossKind === 'kurumi' && e.phaseLevel === 1 && e.hp <= e.maxHp / 2) {
    e.hp = e.maxHp / 2
    e.phaseLevel = 2
    summonQueen(e)
    return
  }
  if (e.bossKind === 'nuonu' && e.phaseLevel === 1 && e.hp <= e.maxHp / 2) {
    e.hp = e.maxHp / 2
    e.phaseLevel = 2
    e.state = 'transform'
    e.stateTime = 0
    e.fired = 0
    e.y = FLOOR
    clearHostileAttacks()
    shake = 10
    impacts.push({
      x: e.x,
      y: FLOOR - 65,
      life: 1.2,
      max: 1.2,
      radius: 180,
      color: '#e6b15f',
    })
    burst(e.x, FLOOR - 65, '#a1ed76', 40)
    toast('糯糯 · 半血觉醒！II 破叶狂怒')
    beginBossCall('nuonu-voice-2', e)
    voice(120, 650, 0.75, 'sawtooth', 0.09)
    crunch(0.3, 0.16, 850)
  }
  e.hit = 0.13
  if (e.family === 'ocean' && e.hp > 0) e.stagger = 0.12
  const plant = e.family === 'plant'
  burst(e.x, e.y - 35, plant ? '#cbe9a2' : '#fff0b1', 10, plant ? 3 : undefined)
  impacts.push({
    x: e.x,
    y: e.y - 35,
    life: 0.26,
    max: 0.26,
    radius: damage > 1 ? 72 : 40,
    color: plant ? '#c7e69b' : '#ffecac',
  })
  shake = Math.max(shake, 2.5)
  if (e.hp <= 0) {
    const reward =
      e.type === 3 ? (stage === 2 ? 3500 : 2000) : stage === 2 ? 225 : 150
    score += reward
    kills++
    shake = e.type === 3 ? 12 : 3
    burst(
      e.x,
      e.y - 35,
      plant
        ? e.type === 1
          ? '#e7c789'
          : '#acd87d'
        : e.type === 1
          ? '#9ce6cc'
          : '#ff99b8',
      25,
      plant ? (e.type === 1 ? 4 : 3) : undefined,
    )
    floaters.push({
      x: e.x,
      y: e.y - 65,
      text: '+' + reward,
      life: 1,
    })
    if (stage === 4) dropOceanEnemySupplies(e)
    else {
      for (let i = 0; i < (e.type === 3 ? 10 : 3); i++)
        drops.push({
          x: e.x + random(-30, 30),
          y: e.y - 45,
          base: (stage === 3 ? e.homeY || e.y : FLOOR) - 22,
          phase: random(0, 7),
          kind: 'candy',
        })
      if (kills % 5 === 0)
        drops.push({
          x: e.x + 20,
          y: e.y - 70,
          base: FLOOR - 55,
          phase: 0,
          kind: 'heart',
        })
    }
    impacts.push({
      x: e.x,
      y: e.y - 35,
      life: 0.46,
      max: 0.46,
      radius: e.type === 3 ? 150 : 82,
      color: plant ? '#bfe9a3' : '#ffacd2',
    })
    if (!sample('defeat', 0.22)) attackSound('defeat')
    if (e.type === 3) {
      if (stage === 3) {
        // A defeated queen cannot leave a damaging sword train behind.
        bullets = bullets.filter((b) => b.owner !== e)
        if (
          !enemies.some(
            (other) => other !== e && other.type === 3 && other.hp > 0,
          )
        ) {
          clearHostileAttacks()
          toast('双王之战落幕 · 前往右侧时之门 →')
        } else toast('一位 BOSS 已退场 · 另一位仍在战斗')
        return
      }
      toast(
        stage === 4
          ? 'Claude 娘的花光落幕 · 补给已掉落'
          : stage === 2
            ? '糯糯恢复了平静！前往森林门 →'
            : '火花的魔术落幕了！前往右侧甜品屋 →',
      )
      clearHostileAttacks()
    }
  } else if (!sample('cake-hit', damage > 2 ? 0.26 : 0.19))
    attackSound('impact')
}
function clearHostileAttacks() {
  // Also invalidate projectiles in an in-progress simulation iteration.
  for (const b of bullets) if (b.enemy) b.life = 0
  bullets = bullets.filter((b) => !b.enemy)
  vines = []
}
function hurt() {
  if (mode !== 'playing' || timeStop || clockJourney?.portalTransition) return
  if (player.ward > 0) {
    if (player.wardHit <= 0) player.wardHit = 0.3
    return
  }
  if (player.inv > 0 || player.deepBlink) return
  player.hp--
  player.inv = 1.6
  shake = 8
  burst(player.x, player.y - 55, '#ff8b9d', 15)
  if (!sample('ocean-hurt', 0.9)) tone(130, 0.2, 'sawtooth')
  if (player.hp <= 0) finish(false)
}
function nearbyChest() {
  return chests
    .filter(
      (c) =>
        !c.opened &&
        Math.abs(c.x - player.x) <= 150 &&
        Math.abs(c.y - player.y) < 45,
    )
    .sort((a, b) => Math.abs(a.x - player.x) - Math.abs(b.x - player.x))[0]
}
function openChest() {
  if (
    mode !== 'playing' ||
    timeStop ||
    clockJourney?.portalTransition ||
    player.roll > 0
  )
    return
  const chest = nearbyChest()
  if (!chest) return
  if (chest.kind === 'ocean' && oceanRemainingEnemies() > 0) {
    toast(`海洋宝箱尚未解锁 · 还需击败 ${oceanRemainingEnemies()} 只小怪`)
    return
  }
  chest.opened = true
  chest.age = 0
  if (chest.kind === 'ocean') {
    oceanJourney.hasKey = true
    burst(chest.x, chest.y - 65, '#a0efff', 16)
    if (!sample('collect', 0.15)) tone(660, 0.15, 'sine', 0.035)
    toast('获得潮汐钥匙 · 前往右侧传送门，按 E 解除封印')
    updateHud()
    return
  }
  if (chest.kind === 'wand') {
    equipWand()
    burst(chest.x, chest.y - 85, '#ffb1cb', 24)
    toast('获得糖果魔法棒！J 魔法射击 · 魔力自动恢复 · K 满能量三连齐射')
    if (!sample('charge-ready', 0.18)) tone(880, 0.2, 'sine', 0.04)
    updateHud()
    return
  }
  const toward = Math.sign(player.x - chest.x) || -player.face
  drops.push({
    x: chest.x + toward * 50,
    y: chest.y - 95,
    base: chest.y - 56,
    phase: 0,
    kind: 'potion',
  })
  burst(chest.x, chest.y - 65, '#ffe2a0', 20)
  if (!sample('charge-ready', 0.15)) tone(660, 0.15, 'sine', 0.035)
  toast('宝箱已开启！拾取魔法药水，按 Q 获得 6 秒无敌')
  updateHud()
}
function drinkPotion() {
  if (
    mode !== 'playing' ||
    timeStop ||
    clockJourney?.portalTransition ||
    player.potions <= 0 ||
    player.ward > 0 ||
    player.roll > 0
  )
    return
  player.potions--
  player.ward = POTION_DURATION
  player.wardAge = 0
  player.wardHit = 0
  player.wardTrail = []
  burst(player.x, player.y - 8, '#baf1af', 10, 4)
  if (!sample('charge-ready', 0.2)) tone(880, 0.2, 'sine', 0.04)
  toast('DRINK ME · 魔法护盾！6 秒内免疫所有伤害')
  updateHud()
}
function gainSugar(amount) {
  const wasReady = player.sugar >= 100
  const next = player.sugar + amount
  player.sugar = next >= 100 - 1e-8 ? 100 : next
  if (!wasReady && player.sugar === 100) {
    if (!sample('charge-ready', 0.22)) tone(880, 0.2, 'sine', 0.05)
    toast(
      stage === 4
        ? '大招能量已满！按 K 释放潮汐吸血'
        : '星糖能量已满！按 K 释放三连齐射',
    )
  }
}
function healPlayer(amount) {
  const restored = Math.min(5 - player.hp, Math.max(0, amount))
  if (restored <= 0) return 0
  player.hp += restored
  player.heal = 0.96
  if (!sample('heal', 0.24)) {
    tone(660, 0.18, 'sine', 0.025)
    tone(990, 0.25, 'sine', 0.02)
  }
  return restored
}
function startDownSlam() {
  if (
    mode !== 'playing' ||
    timeStop ||
    clockJourney?.portalTransition ||
    clockJourney?.mapOpen ||
    player.ground ||
    player.slam ||
    player.roll > 0 ||
    player.ranged > 0 ||
    player.weaponReveal > 1
  )
    return false
  if (stage === 4 && (player.oceanUltimate > 0 || player.deepBlink))
    return false
  // Refund only a wand cast that has not released its projectile yet.
  if (player.wandPending)
    player.wandCharge = Math.min(WAND_CHARGES, player.wandCharge + 1)
  player.slam = {
    phase: 'windup',
    age: 0,
    face: player.face,
    hits: new Set(),
    damage:
      stage === 4
        ? player.deepFormTime > 0
          ? 3.9
          : 3
        : player.weapon === 'wand'
          ? 3
          : 2,
  }
  player.attack = 0
  player.oceanPending = false
  player.wandPending = false
  player.comboWindow = 0
  player.jumpBuffer = 0
  player.coyote = 0
  player.landing = 0
  player.vy = 0
  sample('cake-swing', 0.17)
  return true
}
function dropThroughPlatform() {
  if (!player.ground || player.roll > 0 || player.slam) return false
  const platform = platforms.find(
    (p) =>
      Math.abs(player.y - p.y) < 2 &&
      player.x + 18 > p.x &&
      player.x - 18 < p.x + p.w &&
      p.y < FLOOR,
  )
  if (!platform) return false
  player.dropPlatform = platform
  player.y += 5
  player.vy = 80
  player.ground = false
  player.coyote = 0
  player.jumpBuffer = 0
  player.jumpAge = 0.25
  player.landing = 0
  return true
}
function hitDownSlam(oldY, landed) {
  const slam = player.slam
  if (!slam || slam.phase !== 'dive') return
  for (const e of enemies) {
    if (
      e.hp <= 0 ||
      slam.hits.has(e) ||
      e.state === 'transform' ||
      (e.type === 3 && !e.introDone)
    )
      continue
    const width = e.bodyWidth ?? (e.type === 3 ? 65 : 32)
    const height = e.bodyHeight ?? (e.type === 3 ? 120 : 66)
    // Sweep the blade between frames so a fast fall cannot skip an enemy.
    const crossed =
      Math.abs(player.x - e.x) < width + 28 &&
      Math.min(oldY, player.y) - 35 < e.y &&
      player.y + 24 > e.y - height
    const impact =
      landed &&
      Math.abs(player.x - e.x) < width + 75 &&
      player.y - 30 < e.y &&
      player.y + 30 > e.y - height
    if (!crossed && !impact) continue
    slam.hits.add(e)
    hitEnemy(
      e,
      slam.damage ?? (stage === 4 ? 3 : player.weapon === 'wand' ? 3 : 2),
    )
    if (stage !== 4) gainSugar(12)
    if (mode !== 'playing') return
  }
  if (landed) {
    slam.phase = 'impact'
    slam.age = 0
    player.meleeCooldown = Math.max(player.meleeCooldown, 0.38)
    shake = Math.max(shake, reducedMotion ? 0 : 4)
    burst(
      player.x,
      player.y - 4,
      player.weapon === 'wand' ? '#ffa2cb' : '#ffe2b4',
      12,
    )
    sample('cake-hit', 0.2)
  }
}
function attackCake() {
  if (keys.has('KeyS') && !player.ground) {
    startDownSlam()
    return
  }
  if (stage === 4) {
    castOceanWave()
    return
  }
  if (keys.has('KeyS') && !player.ground) {
    startDownSlam()
    return
  }
  if (
    mode !== 'playing' ||
    timeStop ||
    clockJourney?.portalTransition ||
    player.roll > 0 ||
    player.ranged > 0 ||
    player.slam ||
    player.meleeCooldown > 0
  )
    return
  if (player.weapon === 'wand') {
    if (player.weaponReveal > 1 || player.wandCharge < 1 - 1e-8) return
    player.wandCharge = Math.max(0, player.wandCharge - 1)
    player.attack = WAND_CAST_DURATION
    player.attackAge = 0
    player.meleeCooldown = WAND_COOLDOWN
    player.attackFace = player.face
    player.wandPending = true
    player.swingResolved = true
    return
  }
  player.combo = player.comboWindow > 0 ? (player.combo % 3) + 1 : 1
  player.comboWindow = 1.1
  player.attack = player.combo === 3 ? 0.6 : 0.42
  player.attackAge = 0
  player.meleeCooldown = player.combo === 3 ? 0.67 : 0.47
  player.attackFace = player.face
  player.swingResolved = false
  if (!sample('cake-swing', player.combo === 3 ? 0.2 : 0.17)) {
    crunch(0.12, 0.06, 2000)
    crunch(0.08, 0.025, 850, 0.025)
  }
}
function equipWand() {
  if (stage !== 3 || player.weapon === 'wand') return
  clockJourney.wand = true
  player.weapon = 'wand'
  player.wandCharge = WAND_CHARGES
  player.wandPending = false
  player.attack = 0
  player.ranged = 0
  player.rangedLeft = 0
  player.comboWindow = 0
  player.slam = null
  player.weaponReveal = 1.8
  player.inv = Math.max(player.inv, 1.2)
}
function fireWandShot(power = false) {
  const face = power ? player.face : player.attackFace
  player.muzzle = 0.11
  bullets.push({
    x: player.x + face * 58,
    y: player.y - 64,
    vx: face * (power ? 680 : 550),
    vy: 0,
    life: power ? 1.1 : 0.95,
    enemy: false,
    wand: true,
    power,
    radius: power ? 17 : 10,
    damage: power ? 3 : 2,
  })
  burst(player.x + face * 61, player.y - 64, '#ffc4de', power ? 12 : 5)
  if (!sample('sugar-shot', power ? 0.19 : 0.13)) {
    voice(740, 340, 0.09, 'sine', 0.028)
    voice(1100, 880, 0.12, 'sine', 0.016)
  }
}
function resolveCakeHit() {
  player.swingResolved = true
  const finisher = player.combo === 3,
    reach = finisher ? 140 : 115
  for (const e of enemies) {
    const dx = (e.x - player.x) * player.attackFace,
      width = e.type === 3 ? 63 : 31,
      height = e.type === 3 ? 120 : 66,
      before = e.hp
    if (
      dx < -18 ||
      dx > reach + width ||
      e.y < player.y - 106 ||
      e.y - height > player.y + (finisher ? 90 : -20)
    )
      continue
    hitEnemy(e, finisher ? 4 : 2)
    if (e.hp < before) {
      gainSugar(finisher ? 18 : 12)
      if (e.type !== 3) {
        e.stagger = finisher ? 0.3 : 0.2
        e.x = clamp(
          e.x + player.attackFace * (finisher ? 42 : 22),
          35,
          LENGTH - 100,
        )
        e.shot = Math.max(e.shot, 0.45)
      }
    }
  }
  burst(
    player.x + player.attackFace * 85,
    player.y - 55,
    finisher ? '#ffd48d' : '#ffe9d0',
    finisher ? 12 : 6,
  )
}
function fireSugarShot() {
  if (player.weapon === 'wand') {
    fireWandShot(true)
    return
  }
  player.muzzle = 0.11
  bullets.push({
    x: player.x + player.face * 38,
    y: player.y - 61,
    vx: player.face * 720,
    vy: 0,
    life: 0.95,
    enemy: false,
    power: true,
    damage: 2,
  })
  burst(player.x + player.face * 44, player.y - 62, '#fff4b4', 7)
  if (!sample('sugar-shot', 0.23)) attackSound('shot')
}
function special() {
  if (stage === 4) {
    castOceanUltimate()
    return
  }
  if (mode !== 'playing' || timeStop || clockJourney?.portalTransition) return
  if (player.roll > 0 || player.ranged > 0 || player.slam) return
  if (player.sugar < 100) {
    if (toastTime <= 0) toast('能量不足：近战、拾糖或等待恢复至 100')
    return
  }
  player.sugar = 0
  player.attack = 0
  player.wandPending = false
  player.ranged = 0.54
  player.rangedLeft = 2
  player.rangedTimer = 0.15
  fireSugarShot()
  shake = 3
  impacts.push({
    x: player.x,
    y: player.y - 58,
    life: 0.55,
    max: 0.55,
    radius: 90,
    color: '#ffa4df',
  })
  toast('SUGAR SALVO! · 星糖三连齐射')
  updateHud()
}
function roll() {
  if (stage === 4 && (player.oceanUltimate > 0 || player.deepBlink)) return
  if (mode !== 'playing' || timeStop || clockJourney?.portalTransition) return
  if (
    !player.ground ||
    player.slam ||
    player.roll > 0 ||
    player.rollCooldown > 0
  )
    return
  const direction =
    (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) -
    (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0)
  player.rollFace = direction || player.face
  player.face = player.rollFace
  player.roll = 0.58
  player.rollCooldown = 1.25
  player.inv = Math.max(player.inv, 0.48)
  player.attack = 0
  player.wandPending = false
  player.ranged = 0
  player.rangedLeft = 0
  player.burst = 0
  player.oceanPending = false
  player.muzzle = 0
  player.jumpBuffer = 0
  burst(player.x, player.y - 6, '#e2f9e8', 10)
  if (!sample('roll', 0.2)) {
    crunch(0.18, 0.1, 800)
    voice(320, 100, 0.17, 'triangle', 0.12)
  }
}

// Bodies are harmless. Only the active portion of a visible strike can hurt.
function strikePlayer(e, fromX, left, right, top, bottom) {
  if (e.strikeHit || player.slam) return
  const a = e.face * left,
    b = e.face * right
  const minX = Math.min(fromX, e.x) + Math.min(a, b)
  const maxX = Math.max(fromX, e.x) + Math.max(a, b)
  if (
    player.x + 18 > minX &&
    player.x - 18 < maxX &&
    player.y > e.y - top &&
    player.y - 88 < e.y - bottom
  ) {
    e.strikeHit = true
    hurt()
  }
}
function sweetPose(e) {
  if (e.state === 'windup') return e.stateTime < 0.22 ? 1 : 2
  if (e.state === 'strike') return e.type === 0 && e.stateTime >= 0.1 ? 6 : 3
  if (e.state === 'recover') return e.stateTime < 0.12 ? 6 : 7
  return 0
}
function updateSweet(e, dt) {
  e.state ||= 'chase'
  e.stateTime = (e.stateTime || 0) + dt
  e.moving = false
  if (e.state === 'chase') {
    faceTarget(e, player.x)
    const gap = Math.abs(player.x - e.x)
    const dir = Math.sign(player.x - e.x)
    e.moving = gap >= 2
    if (e.moving) e.x += dir * Math.min(gap, (e.type === 1 ? 65 : 42) * dt)
    // Restore the original springy walk; finish the hop before winding up.
    e.y =
      FLOOR -
      (reducedMotion
        ? 0
        : Math.abs(Math.sin(e.phase * 4)) * (e.type === 1 ? 65 : 12))
    if (
      Math.abs(player.x - e.x) < 54 &&
      Math.abs(player.y - e.y) < 75 &&
      e.y >= FLOOR - 12 &&
      e.shot <= 0
    ) {
      e.state = 'windup'
      e.stateTime = 0
      e.strikeHit = false
      e.moving = false
      e.y = FLOOR
    }
  } else {
    e.y = FLOOR
    if (e.state === 'windup' && e.stateTime >= 0.44) {
      e.state = 'strike'
      e.stateTime = 0
      voice(e.type === 0 ? 420 : 280, 110, 0.12, 'triangle', 0.045)
    } else if (e.state === 'strike') {
      if (e.stateTime >= 0.3) {
        e.state = 'recover'
        e.stateTime = 0
        e.shot = 1.1
      } else strikePlayer(e, e.x, 4, e.type === 0 ? 50 : 84, 75, 0)
    } else if (e.state === 'recover' && e.stateTime >= 0.32) {
      e.state = 'chase'
      e.stateTime = 0
    }
  }
}

function updateBoss(e, dt) {
  if (e.bossKind === 'kurumi' || e.bossKind === 'queen') {
    updateClockBoss(e, dt)
    return
  }
  if (e.bossKind === 'nuonu') {
    updateNuonu(e, dt)
    return
  }
  e.stateTime += dt
  if (e.state === 'idle') {
    e.face = Math.sign(player.x - e.x) || -1
    e.y = FLOOR - Math.sin(e.phase * 3) * 3
    if (e.stateTime > 1.15) {
      e.state = 'windup'
      e.stateTime = 0
      e.fired = false
      toast(
        e.pattern % 2 === 0
          ? '火花 · 红心魔术！跳跃躲开低空弹幕'
          : '火花 · 帽子冲刺！翻滚穿过攻击',
      )
    }
  } else if (e.state === 'windup') {
    if (e.stateTime >= 0.85) {
      e.strikeHit = false
      e.state = e.pattern % 2 === 0 ? 'cast' : 'dash'
      e.stateTime = 0
      e.y = FLOOR
    }
  } else if (e.state === 'cast') {
    if (!e.fired && e.stateTime >= 0.22) {
      e.fired = true
      for (let i = 0; i < 5; i++)
        bullets.push({
          x: e.x + e.face * 45,
          y: FLOOR - 30 - i * 20,
          vx: e.face * (240 + i * 22),
          vy: i === 4 ? -35 : 0,
          life: 4,
          enemy: true,
          heart: true,
          sparkShot: true,
        })
      impacts.push({
        x: e.x,
        y: e.y - 75,
        life: 0.4,
        max: 0.4,
        radius: 85,
        color: '#ff719f',
      })
      voice(620, 180, 0.25, 'triangle', 0.18)
      crunch(0.16, 0.1, 2200)
    }
    if (e.stateTime > 0.8) {
      e.state = 'recover'
      e.stateTime = 0
    }
  } else if (e.state === 'dash') {
    const fromX = e.x
    e.x = clamp(e.x + e.face * 540 * dt, 3750, LENGTH - 330)
    strikePlayer(e, fromX, 12, 110, 98, 20)
    if (e.stateTime > 0.65) {
      e.state = 'recover'
      e.stateTime = 0
    }
  } else if (e.stateTime > 0.65) {
    e.state = 'idle'
    e.stateTime = 0
    e.pattern++
  }
}

function setBossState(e, state) {
  e.state = state
  e.stateTime = 0
  e.fired = 0
  e.strikeHit = false
}
function leafVolley(e, spreadCount, speed) {
  const originX = e.x + e.face * 45,
    originY = e.y - 60
  const aim = Math.atan2(player.y - 55 - originY, player.x - originX)
  for (let i = 0; i < spreadCount; i++) {
    const a = aim + (i - (spreadCount - 1) / 2) * 0.14
    bullets.push({
      x: originX,
      y: originY,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      life: 3.5,
      enemy: true,
      leaf: true,
      nuonuPhase: e.phaseLevel,
      radius: 10,
    })
  }
  burst(originX, originY, '#c9f68d', 9)
  voice(620, 170, 0.16, 'triangle', 0.13)
  crunch(0.07, 0.12, 2200)
}
function updateNuonu(e, dt) {
  e.stateTime += dt
  const angry = e.phaseLevel === 2,
    idle = angry ? 0.5 : 1,
    windup = angry ? 0.48 : 0.75
  if (e.state === 'transform') {
    e.y = FLOOR
    if (e.stateTime >= 1.35) {
      e.pattern = 0
      setBossState(e, 'idle')
    }
    return
  }
  if (e.state === 'idle') {
    e.face = Math.sign(player.x - e.x) || -1
    e.y = FLOOR - Math.sin(e.phase * 3) * 2
    if (e.stateTime >= idle) {
      e.targetX = clamp(player.x, STAGES[2].arena, LENGTH - 350)
      e.originX = e.x
      setBossState(e, 'windup')
      const hints = [
        '飞叶齐射 · 跳跃或翻滚躲避',
        angry ? '连续突进 · 注意第二次冲刺' : '藤叶突进 · 翻滚穿过',
        '根须震地 · 跳过地面冲击',
      ]
      toast(`糯糯 · ${hints[e.pattern % 3]}`)
    }
  } else if (e.state === 'windup') {
    if (e.stateTime >= windup) {
      e.y = FLOOR
      setBossState(e, ['cast', 'dash', 'slam'][e.pattern % 3])
      e.turned = false
    }
  } else if (e.state === 'cast') {
    if (!e.fired && e.stateTime > 0.16) {
      leafVolley(e, angry ? 7 : 5, angry ? 335 : 250)
      e.fired = 1
    }
    if (angry && e.fired === 1 && e.stateTime > 0.5) {
      leafVolley(e, 5, 300)
      e.fired = 2
    }
    if (e.stateTime > (angry ? 0.86 : 0.65)) setBossState(e, 'recover')
  } else if (e.state === 'dash') {
    if (angry && !e.turned && e.stateTime > 0.53) {
      e.face = Math.sign(player.x - e.x) || -e.face
      e.turned = true
      e.strikeHit = false
      burst(e.x, FLOOR - 30, '#d1da94', 12)
    }
    const fromX = e.x
    e.x = clamp(
      e.x + e.face * (angry ? 625 : 410) * dt,
      STAGES[2].arena,
      LENGTH - 330,
    )
    // Damage belongs to the visible thorns/tornado, never her idle body.
    strikePlayer(
      e,
      fromX,
      angry ? -80 : -90,
      angry ? 80 : 40,
      angry ? 180 : 90,
      0,
    )
    if (e.stateTime > (angry ? 1.04 : 0.78)) setBossState(e, 'recover')
  } else if (e.state === 'slam') {
    e.y =
      FLOOR -
      Math.sin(clamp(e.stateTime / 0.5, 0, 1) * Math.PI) * (angry ? 110 : 75)
    if (!e.fired && e.stateTime > 0.5) {
      e.fired = 1
      shake = 9
      impacts.push({
        x: e.x,
        y: FLOOR - 10,
        life: 0.5,
        max: 0.5,
        radius: 90,
        color: angry ? '#e6b266' : '#aee780',
      })
      for (const direction of [-1, 1])
        bullets.push({
          x: e.x,
          y: FLOOR - 17,
          vx: direction * (angry ? 370 : 280),
          vy: 0,
          life: 3,
          enemy: true,
          shock: true,
          nuonuPhase: e.phaseLevel,
          radius: 15,
        })
      const targets = angry ? [player.x - 115, player.x + 115] : [player.x]
      targets.forEach((x) =>
        vines.push({
          x: clamp(x, STAGES[2].arena, LENGTH - 330),
          w: 72,
          age: 0,
          warn: angry ? 0.58 : 0.8,
          life: 2,
          height: 64,
          nuonuPhase: e.phaseLevel,
        }),
      )
      crunch(0.2, 0.2, 750)
      voice(100, 45, 0.24, 'triangle', 0.22)
    }
    if (e.stateTime > 0.95) setBossState(e, 'recover')
  } else if (e.stateTime > (angry ? 0.42 : 0.7)) {
    e.pattern++
    setBossState(e, 'idle')
  }
}
function forestHazardState(h) {
  const cycle = (time + (h.offset || 0)) % 4.2
  let index = 0,
    warning = false,
    active = false,
    height = 0
  if (h.kind === 'thorns') {
    warning = cycle >= 2.2 && cycle < 2.875
    if (cycle >= 2.65 && cycle < 3.1)
      index = Math.min(3, Math.floor(((cycle - 2.65) / 0.45) * 4))
    else if (cycle >= 3.1 && cycle < 3.6) index = 4
    else if (cycle >= 3.6)
      index = Math.min(7, 5 + Math.floor(((cycle - 3.6) / 0.6) * 3))
    active = index >= 2 && index <= 6
    height = (h.w + 12) * [0, 0, 0.64, 0.88, 0.94, 0.86, 0.62, 0][index]
  } else {
    warning = cycle >= 2.55 && cycle <= 3.25
    active = cycle > 3.25
    if (warning) index = cycle < 2.9 ? 1 : 2
    else if (active)
      index = Math.min(7, 3 + Math.floor(((cycle - 3.25) / 0.95) * 5))
    height = active ? 100 : 0
  }
  // Keep the dangerous/safe state legible, while avoiding continual motion.
  const pose = reducedMotion ? (active ? 4 : warning ? 1 : 0) : index
  return { index: pose, active, warning, height }
}
function hazardActive(h) {
  return forestHazardState(h).active
}
function updateHazards(dt) {
  for (const h of hazards) {
    const state = forestHazardState(h)
    if (
      Math.abs(player.x - (h.x + h.w / 2)) < h.w / 2 + 16 &&
      player.y > FLOOR - state.height &&
      state.active
    )
      hurt()
  }
  for (const v of vines) {
    v.age += dt
    if (
      v.age > v.warn &&
      Math.abs(player.x - v.x) < v.w / 2 + 15 &&
      player.y > FLOOR - v.height
    )
      hurt()
  }
  vines = vines.filter((v) => v.age < v.life)
}

function faceTarget(e, targetX) {
  if (Math.abs(targetX - e.x) > 12) e.face = Math.sign(targetX - e.x)
  return e.face || -1
}
function patrolPlant(e, dt) {
  const radius = [75, 90, 62][e.type],
    speed = [31, 42, 24][e.type]
  e.homeX ??= e.x
  e.patrolDir ??= 1
  const left = Math.max(80, e.homeX - radius),
    right = Math.min(STAGES[2].arena - 100, e.homeX + radius)
  if (e.x >= right) e.patrolDir = -1
  if (e.x <= left) e.patrolDir = 1
  e.x = clamp(e.x + e.patrolDir * speed * dt, left, right)
  e.face = e.patrolDir
  e.moving = true
  e.y =
    FLOOR -
    (e.type === 1
      ? Math.abs(Math.sin(e.phase * 3.5)) * 32
      : Math.abs(Math.sin(e.phase * 7)) * 2)
}
function updateForestAttack(e, dt) {
  const mushroom = e.type === 1
  e.state ||= 'chase'
  e.stateTime = (e.stateTime || 0) + dt
  e.attack = Math.max(0, e.attack - dt)
  e.moving = false
  if (e.state === 'chase') {
    faceTarget(e, player.x)
    const gap = Math.abs(player.x - e.x),
      dir = Math.sign(player.x - e.x)
    if (gap >= 2) {
      e.x += dir * Math.min(gap, (mushroom ? 91 : 58.8) * dt)
      e.moving = true
    }
    e.y =
      FLOOR -
      (mushroom
        ? Math.abs(Math.sin(e.phase * 4)) * 78
        : Math.abs(Math.sin(e.phase * 8)) * 2)
    const withinRange = Math.abs(player.x - e.x) < (mushroom ? 380 : 64)
    if (
      withinRange &&
      Math.abs(player.y - e.y) < (mushroom ? 140 : 90) &&
      e.y >= FLOOR - 12 &&
      e.shot <= 0
    ) {
      e.state = 'windup'
      e.stateTime = 0
      e.strikeHit = false
      e.moving = false
      e.y = FLOOR
    }
  } else {
    e.y = FLOOR
    if (e.state === 'windup' && e.stateTime >= 0.5) {
      e.state = mushroom ? 'cast' : 'strike'
      e.stateTime = 0
      e.attack = 0.3
      if (mushroom) {
        bullets.push({
          x: e.x + e.face * 32,
          y: e.y - 46,
          vx: e.face * 225,
          vy: 0,
          life: 3.2,
          enemy: true,
          mobShot: 'mushroom',
          radius: 10,
        })
        e.shot = 2.2
        burst(e.x + e.face * 32, e.y - 46, '#edee98', 5, 4)
        voice(350, 120, 0.15, 'triangle', 0.055)
      } else voice(220, 80, 0.12, 'triangle', 0.045)
    } else if (e.state === 'strike' || e.state === 'cast') {
      if (e.stateTime >= 0.3) {
        e.state = 'recover'
        e.stateTime = 0
        e.attack = 0
        if (!mushroom) e.shot = 1.2
      } else if (!mushroom) strikePlayer(e, e.x, 4, 88, 68, 10)
    } else if (e.state === 'recover' && e.stateTime >= 0.32) {
      e.state = 'chase'
      e.stateTime = 0
    }
  }
}
function updatePlant(e, dt) {
  if (e.type < 2) {
    updateForestAttack(e, dt)
    return
  }
  const direction = Math.sign(player.x - e.x),
    distance = Math.abs(player.x - e.x)
  faceTarget(e, player.x)
  e.attack = Math.max(0, e.attack - dt)
  e.moving = false
  if (player.ground && Math.abs(player.y - FLOOR) > 85 && distance < 2) {
    e.y = FLOOR - 2
    return
  }
  // Keep the flower's existing seed volley and rooted telegraph.
  if ((e.shot > 0.6 && e.attack <= 0) || distance > 300) {
    const travel = distance < 175 ? -direction : direction
    e.x = clamp(e.x + travel * 42 * dt, 80, STAGES[2].arena - 100)
    e.moving = true
  }
  e.y = FLOOR - Math.sin(e.phase * 3) * 2
}

function update(dt) {
  syncStageMusic()
  if (mode === 'playing' || mode === 'boss-intro') updateBossCall(dt)
  if (mode === 'boss-intro') {
    updateBossIntro(dt)
    return
  }
  if (mode !== 'playing') return
  if (stage === 3 && clockJourney.portalTransition) {
    updatePortalUnseal(dt)
    return
  }
  if (stage === 3 && clockJourney.mapOpen) return
  if (stage === 3 && timeStop) {
    updateTimeStop(dt)
    return
  }
  const arrivingBoss = enemies.find(
    (e) =>
      e.type === 3 &&
      e.hp > 0 &&
      !e.introDone &&
      Math.abs(e.x - player.x) < 740 &&
      Math.abs(e.y - player.y) < 200,
  )
  if (arrivingBoss) {
    beginBossIntro(arrivingBoss)
    return
  }
  time += dt
  gainSugar(dt * SUGAR_REGEN_PER_SECOND)
  if (stage === 4) {
    updateOceanJourney(dt)
    if (mode !== 'playing') {
      updateHud()
      return
    }
    updateOceanUltimate(dt)
    updateDeepClaudeForm(dt)
    updateWhaleIdle(dt)
    updateOceanSupplies(dt)
  }
  toastTime -= dt
  if (toastTime <= 0) $('toast').classList.remove('show')
  player.shoot = Math.max(0, player.shoot - dt)
  player.attack = Math.max(0, player.attack - dt)
  player.weaponReveal = Math.max(0, player.weaponReveal - dt)
  if (player.weapon === 'wand')
    player.wandCharge = Math.min(
      WAND_CHARGES,
      player.wandCharge + WAND_REGEN * dt,
    )
  player.meleeCooldown = Math.max(0, player.meleeCooldown - dt)
  player.comboWindow = Math.max(0, player.comboWindow - dt)
  if (player.attack > 0) player.attackAge += dt
  if (player.oceanPending && player.attackAge >= OCEAN_CAST_RELEASE)
    releaseOceanWave()
  if (player.wandPending && player.attackAge >= 0.26) {
    player.wandPending = false
    fireWandShot()
  }
  player.ranged = Math.max(0, player.ranged - dt)
  if (player.rangedLeft > 0) {
    player.rangedTimer -= dt
    if (player.rangedTimer <= 0) {
      fireSugarShot()
      player.rangedLeft--
      player.rangedTimer += 0.15
    }
  }
  player.special = Math.max(0, player.special - dt)
  player.burst = Math.max(0, player.burst - dt)
  player.inv = Math.max(0, player.inv - dt)
  const hadWard = player.ward > 0
  player.ward = Math.max(0, player.ward - dt)
  player.wardHit = Math.max(0, player.wardHit - dt)
  if (hadWard) player.wardAge += dt
  if (player.ward < 1e-8) player.ward = 0
  if (hadWard && player.ward === 0) {
    player.wardTrail = []
    toast('魔法护盾已结束 · 留意敌人的攻击')
  }
  for (const chest of chests) if (chest.opened) chest.age += dt
  player.muzzle = Math.max(0, player.muzzle - dt)
  player.roll = Math.max(0, player.roll - dt)
  player.rollCooldown = Math.max(0, player.rollCooldown - dt)
  player.landing = Math.max(0, player.landing - dt)
  player.heal = Math.max(0, player.heal - dt)
  if (player.slam) {
    player.slam.age += dt
    if (player.slam.phase === 'impact' && player.slam.age >= 0.38)
      player.slam = null
    else if (player.slam.phase === 'windup' && player.slam.age >= 0.13) {
      player.slam.phase = 'dive'
      player.slam.age = 0
      player.vy = 900
    }
  }
  if (player.dropPlatform && player.y > player.dropPlatform.y + 24)
    player.dropPlatform = null
  if (!player.ground) player.jumpAge += dt
  const dir =
    (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) -
    (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0)
  player.vx = player.deepBlink
    ? 0
    : player.roll > 0
      ? player.rollFace * (player.roll > 0.13 ? 440 : 180)
      : dir *
        255 *
        (player.slam
          ? player.slam.phase === 'impact'
            ? 0
            : 0.35
          : stage === 4 && player.oceanUltimate > 0
            ? 0.35
            : player.attack > 0 && player.ground
              ? 0.7
              : player.ranged > 0
                ? 0.8
                : 1)
  if (dir && player.roll <= 0 && !player.deepBlink) {
    player.face = dir
    if (player.ground && player.attack <= 0)
      player.walk += (Math.abs(player.vx) * dt) / 132
  }
  player.coyote = player.ground ? 0.11 : Math.max(0, player.coyote - dt)
  player.jumpBuffer = Math.max(0, player.jumpBuffer - dt)
  if (
    player.jumpBuffer > 0 &&
    player.coyote > 0 &&
    player.roll <= 0 &&
    !player.deepBlink &&
    !player.slam
  ) {
    player.vy = -660
    player.ground = false
    player.coyote = 0
    player.jumpBuffer = 0
    player.jumpAge = 0
    player.landing = 0
    tone(400, 0.14, 'triangle')
    burst(player.x, player.y, '#fff1d6', 6)
  }
  if (keys.has('KeyJ')) attackCake()
  const oldY = player.y
  player.x = clamp(
    player.x + player.vx * dt,
    45,
    stage === 4
      ? isOceanArena()
        ? LENGTH - 55
        : OCEAN_PORTAL_X - 65
      : LENGTH - 100,
  )
  player.vy =
    player.slam?.phase === 'windup'
      ? 0
      : Math.min(
          player.slam?.phase === 'dive' ? 1100 : Infinity,
          player.vy + 1650 * dt,
        )
  player.y += player.vy * dt
  player.ground = false
  let floor = FLOOR
  for (const p of platforms)
    if (
      p !== player.dropPlatform &&
      player.x + 18 > p.x &&
      player.x - 18 < p.x + p.w &&
      oldY <= p.y + 3 &&
      player.y >= p.y &&
      player.vy >= 0
    )
      floor = Math.min(floor, p.y)
  if (player.y >= floor) {
    if (player.vy > 160) {
      player.landing = 0.16
      burst(player.x, floor - 3, '#fff3d8', 6)
    }
    player.y = floor
    player.vy = 0
    player.ground = true
    player.dropPlatform = null
  }
  hitDownSlam(oldY, player.ground)
  if (stage <= 3) {
    player.aliceWalkTime =
      player.vx &&
      player.ground &&
      player.landing <= 0 &&
      player.attack <= 0 &&
      player.ranged <= 0 &&
      player.roll <= 0 &&
      player.burst <= 0 &&
      !player.slam
        ? (player.aliceWalkTime || 0) + dt
        : 0
  }
  if (mode !== 'playing') {
    updateHud()
    return
  }
  if (player.ward > 0) {
    const trail = player.wardTrail
    if (
      !reducedMotion &&
      (Math.abs(player.vx) > 0 || !player.ground) &&
      (!trail.length || player.wardAge - trail.at(-1).age > 0.065)
    )
      trail.push({ x: player.x, y: player.y - 55, age: player.wardAge })
    player.wardTrail = trail.filter((p) => player.wardAge - p.age < 0.5)
  }
  updateHazards(dt)
  if (mode !== 'playing') {
    updateHud()
    return
  }
  camera +=
    (clamp(player.x - W * 0.32, 0, LENGTH - W) - camera) * Math.min(1, dt * 7)
  if (stage === 3)
    cameraY +=
      (clamp(player.y - H * 0.72, CLOCK_ROOMS[clockJourney.room].top, 0) -
        cameraY) *
      Math.min(1, dt * 7)
  if (
    player.attack > 0 &&
    !player.swingResolved &&
    player.attackAge >= (player.combo === 3 ? 0.22 : 0.14)
  )
    resolveCakeHit()
  if (mode !== 'playing') {
    updateHud()
    return
  }
  for (const e of enemies) {
    if (e.hp <= 0) continue
    if (e.bossKind === 'claude') {
      updateClaudeBoss(e, dt)
      continue
    }
    if (e.family === 'ocean') {
      updateOceanEnemy(e, dt)
      continue
    }
    const activationRange = e.family === 'plant' ? 380 : 740
    if (
      Math.abs(e.x - player.x) < activationRange &&
      (stage !== 3 || Math.abs(e.y - player.y) < 200)
    )
      e.active = true
    if (e.family === 'plant' && (!e.active || Math.abs(e.x - player.x) > 600)) {
      e.phase += dt
      e.hit = Math.max(0, e.hit - dt)
      e.attack = 0
      if (e.type < 2) {
        e.state = 'chase'
        e.stateTime = 0
        e.strikeHit = true
      }
      e.shot = Math.max(0.65, e.shot)
      patrolPlant(e, dt)
      continue
    }
    if (!e.active) continue
    e.phase += dt
    e.hit = Math.max(0, e.hit - dt)
    e.shot -= dt
    if (e.stagger > 0) {
      if (e.family === 'sweet' && e.type < 2) {
        e.state = 'recover'
        e.stateTime = 0
        e.shot = 1.1
        e.strikeHit = true
      }
      if (e.family === 'plant' && e.type < 2) {
        e.state = 'recover'
        e.stateTime = 0
        e.attack = 0
        e.shot = 1.2
        e.strikeHit = true
      }
      e.stagger = Math.max(0, e.stagger - dt)
      continue
    }
    const sign = Math.sign(player.x - e.x)
    if (e.type === 3) updateBoss(e, dt)
    else if (e.family === 'clock') updateClockEnemy(e, dt)
    else if (e.family === 'plant') updatePlant(e, dt)
    else if (stage === 1 && e.type < 2) updateSweet(e, dt)
    else {
      faceTarget(e, player.x)
      const beneathLedge =
        player.ground &&
        Math.abs(player.y - FLOOR) > 85 &&
        Math.abs(player.x - e.x) < 2
      e.moving = !beneathLedge && !!sign
      if (!beneathLedge) e.x += sign * (e.type === 1 ? 65 : 42) * dt
      e.y =
        FLOOR -
        Math.abs(Math.sin(e.phase * (e.type === 3 ? 3 : 4))) *
          (e.type === 1 ? (stage === 2 ? 78 : 65) : 12)
    }
    if (timeStop) {
      updateHud()
      return
    }
    if (
      e.type === 2 &&
      e.family !== 'clock' &&
      e.shot <= 0 &&
      Math.abs(e.x - player.x) < 750
    ) {
      e.shot = stage === 2 ? 1.65 : 2.8
      const plant = e.family === 'plant'
      if (plant) {
        e.attack = 0.28
        burst(e.x + sign * 35, e.y - 62, '#dbea92', 5, 4)
        voice(240, 80, 0.12, 'triangle', 0.055)
        crunch(0.055, 0.04, 900)
      }
      bullets.push({
        x: e.x + sign * 35,
        y: e.y - (plant ? 62 : 48),
        vx: sign * (stage === 2 ? 245 : 180),
        vy: 0,
        life: 4,
        enemy: true,
        seed: plant,
        mobShot: plant ? 'forest' : 'castle',
        radius: 4,
      })
    }
  }
  for (const b of bullets) {
    if (b.life <= 0) continue
    if (b.arm > 0) {
      b.arm = Math.max(0, b.arm - dt)
      continue
    }
    b.age = (b.age || 0) + dt
    b.trail ??= []
    b.trail.push({ x: b.x, y: b.y })
    if (b.trail.length > 7) b.trail.shift()
    const previousX = b.x
    b.x += b.vx * dt
    b.y += b.vy * dt
    b.life -= dt
    if (b.oceanWave) {
      updateOceanWave(b, previousX)
      continue
    }
    if (b.deepLaser) {
      updateDeepClaudeLaser(b, previousX)
      continue
    }
    if (b.enemy) {
      if (b.owner && b.owner.hp <= 0) {
        b.life = 0
        continue
      }
      if (b.claudeLaser) {
        updateClaudeLaser(b, previousX)
        continue
      }
      if (b.claudeBarrage) {
        updateClaudeBarrage(b, previousX)
        continue
      }
      if (b.queenSword) {
        const hazard = queenSwordVisual(b)
        if (
          !b.hitPlayer &&
          hazard.active &&
          Math.abs(b.x - player.x) < hazard.width / 2 + 18 &&
          player.y > FLOOR - hazard.height + 12
        ) {
          if (player.roll <= 0) hurt()
          b.hitPlayer = true
        }
        continue
      }
      if (b.royalWave) {
        if (
          !b.hitPlayer &&
          Math.max(previousX, b.x) + (b.radius || 85) > player.x - 18 &&
          Math.min(previousX, b.x) - (b.radius || 85) < player.x + 18 &&
          player.y > FLOOR - queenSlashVisual(b).height
        ) {
          if (player.roll <= 0) hurt()
          b.hitPlayer = true
        }
        continue
      }
      if (
        Math.abs(b.x - player.x) < 20 + (b.radius || 4) &&
        b.y + (b.radius || 0) > player.y - (player.roll > 0 ? 52 : 108) &&
        b.y - (b.radius || 0) < player.y - 6
      ) {
        hurt()
        b.life = 0
      }
    } else
      for (const e of enemies) {
        if (e.hp <= 0) continue
        const ew = e.bodyWidth ?? (e.type === 3 ? 63 : 31),
          eh = e.bodyHeight ?? (e.type === 3 ? 120 : 66)
        if (
          Math.max(previousX, b.x) + (b.radius || 0) > e.x - ew &&
          Math.min(previousX, b.x) - (b.radius || 0) < e.x + ew &&
          b.y + (b.radius || 0) > e.y - eh &&
          b.y - (b.radius || 0) < e.y + 8
        ) {
          hitEnemy(e, b.damage ?? (b.power ? 3 : 1))
          b.life = 0
          break
        }
      }
  }
  bullets = bullets.filter(
    (b) =>
      b.life > 0 &&
      b.y > (stage === 3 ? CLOCK_ROOMS[clockJourney.room].top - 100 : 65) &&
      b.y < FLOOR + 10,
  )
  enemies = enemies.filter((e) => e.hp > 0)
  if (mode !== 'playing') {
    updateHud()
    return
  }
  for (const d of drops) {
    d.y += (d.base - d.y) * dt * 3
    d.phase += dt * 3
    const dx = player.x - d.x,
      dy = player.y - 50 - d.y,
      dist = Math.hypot(dx, dy)
    if (dist < 115) {
      d.x += dx * dt * 7
      d.base = player.y - 50
      d.y += dy * dt * 7
    }
    if (dist < 35) {
      d.collected = true
      if (d.kind === 'claude-relic') {
        oceanJourney.relicCollected = true
        toast('获得花光信物！L 变身 30 秒，每小关一次 · Shift 翻滚')
        floaters.push({
          x: player.x,
          y: player.y - 120,
          text: '花光信物 · L',
          life: 1,
        })
      } else if (d.kind === 'potion') {
        player.potions++
        toast('获得魔法药水！Q 使用 · 6 秒无敌，适合留给危险时刻')
      } else if (
        d.kind === 'heart' ||
        d.kind === 'elixir' ||
        d.kind === 'ocean-health'
      ) {
        const healed = healPlayer(d.kind === 'elixir' ? 3 : 1)
        toast(
          healed > 0
            ? `${d.kind === 'ocean-health' ? '海洋爱心' : '爱心补给'} · 恢复 ${healed} 格生命`
            : '爱心补给 · 生命已满',
        )
      } else if (d.kind === 'ocean-energy') {
        gainSugar(d.energy ?? 25)
        toast(`潮汐能量珠 · 大招能量 +${d.energy ?? 25}`)
      } else {
        sweets++
        score += 25
        gainSugar(3)
      }
      burst(d.x, d.y, '#ffed9c', 4)
      if (
        d.kind !== 'heart' &&
        d.kind !== 'elixir' &&
        d.kind !== 'ocean-health' &&
        !sample('collect', 0.14)
      )
        tone(1100, 0.045, 'sine', 0.014)
    }
  }
  drops = drops.filter((d) => !d.collected)
  for (const p of particles) {
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.vy += 450 * dt
    p.life -= dt
  }
  particles = particles.filter((p) => p.life > 0)
  for (const impact of impacts) impact.life -= dt
  impacts = impacts.filter((impact) => impact.life > 0)
  for (const f of floaters) {
    f.y -= 45 * dt
    f.life -= dt
  }
  floaters = floaters.filter((f) => f.life > 0)
  shake = Math.max(0, shake - dt * 25)
  if (
    stage !== 4 &&
    player.x > LENGTH - 260 &&
    (stage !== 3 || clockJourney.room === 'arena')
  ) {
    if (enemies.some((e) => e.type === 3)) {
      player.x = LENGTH - 265
      if (toastTime <= 0)
        toast(
          stage === 3
            ? '先击败狂三和白之女王，解开时之门！'
            : stage === 2
              ? '先击败糯糯，解开森林的封印！'
              : '先击败火花，打开甜品屋！',
        )
    } else finish(true)
  }
  updateHud()
}

function rect(x, y, w, h, color) {
  ctx.fillStyle = color
  ctx.fillRect(Math.round(x), Math.round(y), w, h)
}
function ellipse(x, y, rx, ry, color) {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
  ctx.fill()
}
function star(x, y, r, color, rotation = 0) {
  ctx.fillStyle = color
  ctx.beginPath()
  for (let i = 0; i < 10; i++) {
    const a = rotation - Math.PI / 2 + (i * Math.PI) / 5,
      rr = i % 2 ? r * 0.48 : r
    const px = x + Math.cos(a) * rr,
      py = y + Math.sin(a) * rr
    if (i === 0) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
  ctx.fill()
}
function drawCollectible(kind, x, y) {
  const healing = kind === 'heart' || kind === 'elixir'
  const frames = healing ? assets.healthPickup : assets.candyPickup
  const frame = frames?.[healing ? Math.floor(time * 7) % frames.length : 0]
  if (!frame) return
  const height = healing ? (kind === 'elixir' ? 58 : 48) : 38
  const scale = height / (frames.height || frame.h)
  const width = frame.w * scale
  ctx.save()
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ellipse(
    x,
    y,
    healing ? 22 : 21,
    healing ? 24 : 18,
    healing ? '#ff8da526' : '#ffdd8b20',
  )
  ctx.drawImage(
    frame.img,
    frame.x,
    frame.y,
    frame.w,
    frame.h,
    x - width / 2,
    y - (frame.h * scale) / 2,
    width,
    frame.h * scale,
  )
  if (kind === 'elixir') {
    ctx.font = 'bold 11px sans-serif'
    ctx.textAlign = 'center'
    ctx.strokeStyle = '#532f43'
    ctx.lineWidth = 3
    ctx.fillStyle = '#fff1bd'
    ctx.strokeText('+3', x, y + height / 2 + 11)
    ctx.fillText('+3', x, y + height / 2 + 11)
  }
  ctx.restore()
}
function drawStagePlatform(p, level = stage) {
  const tile = isOceanArena()
    ? assets.claudePlatform
    : assets.platformTiles?.[level]
  if (!tile) return false
  const f = tile.frame,
    x = p.x - camera,
    // Use whole panels at one uniform scale. Wider ledges join multiple
    // panels, keeping clocks, hearts and flowers round instead of stretching.
    panels = Math.max(1, Math.ceil(p.w / (level === 4 ? 480 : 240))),
    width = p.w / panels,
    scale = width / f.w,
    top = p.y + (f.y - tile.surface) * scale,
    height = f.h * scale
  if (top + height - cameraY < 0 || top - cameraY > H) return true
  ctx.save()
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  for (let i = 0; i < panels; i++)
    ctx.drawImage(f.img, f.x, f.y, f.w, f.h, x + i * width, top, width, height)
  ctx.restore()
  return true
}
function platform(p) {
  if (drawStagePlatform(p)) return
  const x = p.x - camera,
    y = p.y
  if (stage === 2) {
    rect(x, y, p.w, 29, '#182d26')
    rect(x + 3, y + 4, p.w - 6, 21, '#416149')
    for (let i = 5; i < p.w - 12; i += 26) {
      rect(x + i, y + 6, 22, 6, '#64815a')
      rect(x + i + 7, y + 17, 16, 5, '#2c4638')
      rect(x + i + 9, y + 27, 4, 13 + (i % 17), '#285d3b')
      rect(x + i + 6, y + 35, 6, 3, '#75a345')
    }
    rect(x - 3, y - 6, p.w + 6, 10, '#407740')
    rect(x, y - 7, p.w, 4, '#a3c864')
    for (let i = 12; i < p.w; i += 31) {
      rect(x + i, y - 11, 3, 7, '#91b955')
      star(x + i + 4, y - 8, 3, '#fff1c2')
    }
    return
  }
  rect(x, y, p.w, 28, '#775044')
  rect(x + 3, y + 3, p.w - 6, 21, '#c79668')
  for (let i = 7; i < p.w - 8; i += 23) {
    rect(x + i, y + 13, 8, 5, '#9f704c')
    rect(x + i + 4, y + 5, 5, 3, '#f5cea0')
  }
  rect(x - 3, y - 5, p.w + 6, 9, '#f4b6c4')
  rect(x, y - 9, p.w, 7, '#fff0d6')
  for (let i = 8; i < p.w; i += 29) {
    rect(x + i, y + 3, 14, 6, '#f4b6c4')
    rect(x + i + 3, y + 9, 8, 4, '#f4b6c4')
  }
}
function ground() {
  if (stage === 2) {
    rect(0, FLOOR, W, H - FLOOR, '#162820')
    for (
      let wx = Math.floor(camera / 64) * 64;
      wx < camera + W + 64;
      wx += 64
    ) {
      const x = wx - camera
      rect(x + 2, FLOOR + 11, 60, 31, '#344c3c')
      rect(x + 5, FLOOR + 14, 53, 5, '#52694a')
      rect(x + 32, FLOOR + 47, 60, 35, '#293d31')
      rect(x + 36, FLOOR + 50, 53, 4, '#42593f')
      rect(x + 20, FLOOR + 37, 4, 26, '#224e32')
      rect(x + 12, FLOOR + 48, 12, 4, '#55834a')
      rect(x + 22, FLOOR + 61, 11, 4, '#3f7040')
      rect(x + 46, FLOOR + 28, 8, 5, '#1b3328')
      rect(x + 42, FLOOR - 12, 3, 10, '#a0b96c')
      rect(x + 37, FLOOR - 6, 13, 3, '#709f47')
    }
    rect(0, FLOOR - 6, W, 10, '#456e3e')
    rect(0, FLOOR - 7, W, 3, '#afc571')
    for (
      let wx = Math.floor(camera / 22) * 22;
      wx < camera + W + 22;
      wx += 22
    ) {
      rect(wx - camera, FLOOR + 3, 12, 5, '#6a913f')
      rect(wx - camera + 4, FLOOR + 8, 5, 5, '#3c6f39')
    }
    return
  }
  rect(0, FLOOR, W, H - FLOOR, '#735042')
  const start = Math.floor(camera / 80) * 80
  for (let wx = start; wx < camera + W + 80; wx += 80) {
    const x = wx - camera
    rect(x + 2, FLOOR + 18, 76, 31, '#ac7958')
    rect(x + 4, FLOOR + 20, 71, 4, '#ce9a6b')
    rect(x + 42, FLOOR + 52, 76, 31, '#95644e')
    rect(x + 45, FLOOR + 55, 70, 4, '#bd8961')
    rect(x + 20, FLOOR + 33, 5, 5, '#8c5a45')
    rect(x + 54, FLOOR + 65, 7, 5, '#755044')
  }
  rect(0, FLOOR - 8, W, 12, '#fff1ce')
  rect(0, FLOOR - 3, W, 9, '#ffd9c4')
  for (let wx = Math.floor(camera / 32) * 32; wx < camera + W + 32; wx += 32) {
    const x = wx - camera
    rect(x, FLOOR + 6, 28, 6, '#f5bdc5')
    rect(x + 4, FLOOR + 12, 20, 5, '#f5bdc5')
    rect(x + 9, FLOOR + 17, 10, 4, '#e39cae')
    rect(x + 5, FLOOR - 6, 4, 2, wx % 64 === 0 ? '#e78b99' : '#a2c9b4')
  }
}
function lollipop(x, y, color) {
  rect(x - 3, y - 82, 6, 82, '#855b53')
  rect(x - 1, y - 80, 2, 79, '#ffe1ba')
  ellipse(x, y - 91, 20, 20, '#744251')
  ellipse(x, y - 92, 17, 17, color)
  ellipse(x - 3, y - 96, 11, 10, '#ffe6cf')
  ellipse(x, y - 94, 7, 7, color)
  rect(x - 1, y - 98, 3, 7, '#fff0db')
  ctx.fillStyle = '#89bca4'
  ctx.beginPath()
  ctx.moveTo(x, y - 22)
  ctx.lineTo(x - 19, y - 35)
  ctx.lineTo(x - 14, y - 20)
  ctx.fill()
}
function drawGoalPortal() {
  const frames = assets.goalPortals?.[stage]
  if (!frames?.length) return false
  const x = LENGTH - 230 - camera
  if (x < -150 || x > W + 150) return true
  const sealed = enemies.some((e) => e.type === 3)
  const index = sealed ? 0 : effectPose(time, 6, frames.length)
  const frame = frames[index]
  const height = 276,
    width = (height * frame.img.width) / frame.img.height
  // Whole cells share one scale and ground line. Changing text and drifting
  // petals must not resize the doorway or move the stairs between poses.
  drawAttackArt(frames, x, FLOOR, width, {
    cell: true,
    index,
    height,
    anchorY: 0.965,
    alpha: sealed ? 0.48 : 1,
  })
  ctx.save()
  ctx.font = 'bold 13px sans-serif'
  ctx.textAlign = 'center'
  ctx.fillStyle = sealed ? '#ffe1b6' : '#fff7d3'
  ctx.shadowColor = '#201725'
  ctx.shadowBlur = 4
  ctx.fillText(
    sealed
      ? stage === 3
        ? '击败双王后开启'
        : '击败 BOSS 后开启'
      : stage === 3
        ? '冒险终点 →'
        : '前往下一关 →',
    x,
    FLOOR - height - 8,
  )
  ctx.restore()
  return true
}
function shop() {
  if (drawGoalPortal()) return
  const x = LENGTH - 230 - camera
  if (stage === 2) {
    const sealed = enemies.some((e) => e.type === 3)
    ellipse(x, FLOOR - 78, 62, 90, '#17372fe6')
    ellipse(x, FLOOR - 78, 46, 77, sealed ? '#263e32' : '#97ebbc66')
    for (let i = 0; i < 7; i++) {
      const a = Math.PI + (i * Math.PI) / 6
      rect(
        x + Math.cos(a) * 61 - 11,
        FLOOR - 61 + Math.sin(a) * 97 - 10,
        23,
        29,
        '#324c3f',
      )
      rect(
        x + Math.cos(a) * 61 - 8,
        FLOOR - 61 + Math.sin(a) * 97 - 7,
        17,
        8,
        '#7b8a58',
      )
    }
    for (const side of [-1, 1]) {
      rect(x + side * 61 - 10, FLOOR - 67, 20, 67, '#3e5944')
      rect(x + side * 76 - 12, FLOOR - 109, 24, 33, '#5d4930')
      rect(x + side * 76 - 8, FLOOR - 104, 16, 23, '#ffe193')
      star(x + side * 76, FLOOR - 94, 5, '#fff1c1')
    }
    if (sealed) {
      ctx.strokeStyle = '#bbcd7788'
      ctx.lineWidth = 5
      for (let i = 0; i < 3; i++) {
        ctx.beginPath()
        ctx.moveTo(x - 45, FLOOR - 25 - i * 40)
        ctx.lineTo(x + 45, FLOOR - 55 - i * 40)
        ctx.stroke()
      }
    } else {
      for (let i = 0; i < 6; i++)
        star(
          x + Math.sin(time * 1.8 + i) * 28,
          FLOOR - 20 - i * 23,
          3,
          '#e0ffce',
        )
    }
    ctx.font = 'bold 17px monospace'
    ctx.textAlign = 'center'
    ctx.fillStyle = '#e0eeb0'
    ctx.fillText(sealed ? 'FOREST SEALED' : 'FOREST CLEAR', x, FLOOR - 179)
    return
  }
  rect(x - 78, FLOOR - 169, 165, 169, '#775048')
  rect(x - 68, FLOOR - 160, 145, 150, '#c78b6b')
  rect(x - 40, FLOOR - 113, 87, 113, '#573a46')
  rect(x - 28, FLOOR - 104, 64, 104, '#352d42')
  rect(x - 95, FLOOR - 177, 198, 32, '#ffccca')
  for (let i = 0; i < 6; i++)
    rect(x - 95 + i * 33, FLOOR - 177, 17, 35, '#d96b8c')
  rect(x - 85, FLOOR - 229, 177, 49, '#795047')
  rect(x - 80, FLOOR - 224, 167, 39, '#ffebbe')
  ctx.font = 'bold 25px Georgia'
  ctx.textAlign = 'center'
  ctx.fillStyle = '#b6506d'
  ctx.fillText('GOAL!', x + 3, FLOOR - 196)
  star(x + 3, FLOOR - 246, 19, '#ffe2a1')
  lollipop(x - 102, FLOOR, '#e5a2c4')
}
function woodland(x) {
  // Only lanterns decorate the path. Mushroom silhouettes belong to hazards
  // and enemies, so scenery must not suggest another dangerous mushroom.
  if (Math.floor((x + camera) / 390) % 2 === 0) return
  const y = FLOOR - 2
  rect(x - 4, y - 84, 8, 84, '#2b4030')
  rect(x - 2, y - 85, 29, 5, '#73825a')
  rect(x + 20, y - 81, 2, 18, '#998860')
  ellipse(x + 21, y - 45, 20, 26, '#ffd57515')
  rect(x + 10, y - 65, 23, 32, '#3d3829')
  rect(x + 14, y - 60, 15, 22, '#efc16b')
  rect(x + 20, y - 61, 3, 24, '#765a37')
  rect(x + 14, y - 36, 15, 3, '#8e7749')
}
function roots(x, width, height, color) {
  for (let i = 0; i < 5; i++) {
    const rx = x - width / 2 + (i * width) / 4
    ctx.fillStyle = '#1c3528'
    ctx.beginPath()
    ctx.moveTo(rx - 9, FLOOR)
    ctx.lineTo(rx + 4, FLOOR - height * (i % 2 ? 0.8 : 1))
    ctx.lineTo(rx + 10, FLOOR)
    ctx.fill()
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(rx - 4, FLOOR - 2)
    ctx.lineTo(rx + 4, FLOOR - height + 6)
    ctx.lineTo(rx + 6, FLOOR - 2)
    ctx.fill()
    rect(rx, FLOOR - height * 0.45, 11, 4, '#b9c77a')
  }
}
function drawHazards() {
  for (const h of hazards) {
    const x = h.x - camera,
      active = hazardActive(h)
    if (x + h.w < 0 || x > W) continue
    ellipse(x + h.w / 2, FLOOR, h.w / 2 + 8, 7, '#151e21a8')
    const state = forestHazardState(h),
      frames = h.kind === 'thorns' ? assets.forestThorns : assets.forestPoison,
      frame = frames?.[state.index]
    if (frame) {
      // Register whole cells against the shared ground line. The spines and
      // gas change height naturally, without resizing the mushroom or soil.
      const width = h.w + (h.kind === 'thorns' ? 12 : 22),
        scale = width / frame.img.width
      ctx.drawImage(
        frame.img,
        0,
        0,
        frame.img.width,
        frame.img.height,
        x + h.w / 2 - width / 2,
        FLOOR - 432 * scale,
        width,
        frame.img.height * scale,
      )
      if (state.warning || state.active)
        rect(x, FLOOR - 3, h.w, 3, state.active ? '#bdf383' : '#edc577')
      continue
    }
    if (h.kind === 'thorns') {
      if (state.active) roots(x + h.w / 2, h.w, state.height, '#849d50')
      for (let i = 0; i < 4; i++) {
        rect(x + 8 + i * 24, FLOOR - 11, 6, 6, '#9b344b')
        rect(x + 9 + i * 24, FLOOR - 12, 2, 2, '#ffd6ab')
      }
    } else {
      const cycle = (time + h.offset) % 4.2,
        warning = cycle > 2.55
      for (let i = 0; i < 3; i++) {
        const mx = x + 12 + i * 26
        rect(mx - 3, FLOOR - 15, 6, 15, '#d6bc85')
        ellipse(mx, FLOOR - 17, 13, 7, warning ? '#edb25f' : '#74657f')
        rect(mx - 5, FLOOR - 21, 4, 3, '#fff1c6')
      }
      if (warning) {
        rect(x, FLOOR - 3, h.w, 3, active ? '#d4f69a' : '#e9bd71')
        for (let i = 0; i < (active ? 14 : 5); i++) {
          const sy = (i * 31 + time * 70) % (active ? 100 : 34)
          ellipse(
            x + 5 + ((i * 23) % (h.w - 10)),
            FLOOR - sy,
            active ? 8 : 3,
            active ? 12 : 3,
            '#bbdb7970',
          )
        }
      }
    }
  }
  for (const v of vines) {
    const x = v.x - camera,
      growing = v.age > v.warn
    ellipse(x, FLOOR - 2, v.w / 2 + 5, 9, growing ? '#dfbb7466' : '#e9c27f88')
    rect(x - v.w / 2, FLOOR - 4, v.w, 3, '#f6d6a2')
    if (growing) {
      const growth = Math.min(1, (v.age - v.warn) / 0.12)
      const angry = v.nuonuPhase === 2
      drawAttackArt(
        angry ? assets.nuonuTornado : assets.nuonuThorns,
        x,
        FLOOR,
        v.w + 12,
        {
          height: v.height * growth,
          anchorY: 1,
          cell: angry,
          index: effectPose(v.age - v.warn, 12, 16),
          alpha: clamp(v.life / 0.2, 0, 1),
        },
      )
    } else {
      ctx.font = 'bold 16px monospace'
      ctx.textAlign = 'center'
      ctx.fillStyle = '#ffe2ac'
      ctx.fillText('!', x, FLOOR - 15 - Math.sin(v.age * 18) * 3)
    }
  }
}
function drawNuonu(e, x, y) {
  const angry = e.phaseLevel === 2,
    frames = angry ? assets.nuonuPhase2 : assets.nuonu
  if (!frames) return
  let index = Math.floor(e.stateTime * 3) % 3
  if (e.state === 'windup')
    index =
      3 + Math.min(2, Math.floor((e.stateTime / (angry ? 0.48 : 0.75)) * 3))
  if (e.state === 'cast')
    index =
      8 + Math.min(3, Math.floor((e.stateTime / (angry ? 0.86 : 0.65)) * 4))
  if (e.state === 'dash') index = 4 + (Math.floor(e.stateTime * 10) % 4)
  if (e.state === 'slam')
    index = 8 + Math.min(3, Math.floor((e.stateTime / 0.95) * 4))
  if (e.state === 'recover' || e.state === 'transform')
    index = 12 + (Math.floor(e.stateTime * 7) % 4)
  const f = frames[index],
    scale = 168 / Math.max(assets.nuonu[0].h, assets.nuonuPhase2[0].h)
  ellipse(x, FLOOR + 1, 54, 8, '#14271b77')
  if (angry && ['windup', 'dash', 'cast', 'transform'].includes(e.state)) {
    const charging = e.state === 'windup' || e.state === 'transform'
    drawAttackArt(assets.nuonuTornado, x, y + 6, 184, {
      height: 186,
      anchorY: 1,
      cell: true,
      index: effectPose(e.stateTime, 12, 16),
      alpha: charging ? Math.min(0.5, e.stateTime * 0.8) : 0.72,
    })
  } else if (
    !angry &&
    (e.state === 'dash' ||
      (e.state === 'slam' && e.fired) ||
      e.state === 'cast')
  ) {
    const casting = e.state === 'cast'
    drawAttackArt(assets.nuonuThorns, x - e.face * 25, FLOOR, 138, {
      height: casting ? 76 + Math.sin(e.stateTime * Math.PI) * 24 : 96,
      anchorY: 1,
      alpha: casting ? 0.55 : 0.8,
    })
  }
  if (e.state === 'windup' || e.state === 'transform') {
    ctx.strokeStyle = angry ? '#ecc486' : '#c0ed88'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.ellipse(
      x,
      FLOOR - 3,
      55 + Math.sin(e.stateTime * 15) * 8,
      12,
      0,
      0,
      Math.PI * 2,
    )
    ctx.stroke()
    if (e.pattern % 3 === 1 && e.state === 'windup') {
      rect(Math.min(x, x + e.face * 330), FLOOR - 7, 330, 5, '#ecc48688')
      star(x + e.face * 320, FLOOR - 13, 9, '#ffe0ad')
    }
    if (e.pattern % 3 === 2 && e.state === 'windup') {
      ellipse(e.targetX - camera, FLOOR - 2, 43, 10, '#e6bd7666')
    }
  }
  ctx.save()
  ctx.translate(x, y)
  if (e.face < 0) ctx.scale(-1, 1)
  if (e.hit > 0) ctx.filter = 'brightness(1.7) saturate(.6)'
  ctx.drawImage(
    f.img,
    f.x,
    f.y,
    f.w,
    f.h,
    (f.x - f.anchor) * scale,
    (f.y - f.bottom) * scale,
    f.w * scale,
    f.h * scale,
  )
  ctx.restore()
  if (e.state === 'transform') {
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4 + e.stateTime * 4
      star(x + Math.cos(a) * 88, y - 80 + Math.sin(a) * 75, 6, '#d4f394', a)
    }
  }
}
function drawForestVineAttack(e, x, y) {
  const frames = assets.forestVineAttack
  if (!frames || !['windup', 'strike', 'recover'].includes(e.state))
    return false
  const pose =
    e.state === 'windup'
      ? e.stateTime < 0.25
        ? 1
        : 2
      : e.state === 'strike'
        ? 3
        : e.stateTime < 0.14
          ? 6
          : 7
  const f = frames[pose],
    scale = 89 / frames.bodyHeight
  ellipse(x, FLOOR + 1, 31, 6, '#122d2066')
  ctx.save()
  ctx.translate(x, y)
  // The supplied vine poses face right; the walking plant atlas faces left.
  if (e.face < 0) ctx.scale(-1, 1)
  if (e.hit > 0) ctx.filter = 'brightness(1.8) saturate(.5)'
  ctx.drawImage(
    f.img,
    f.x,
    f.y,
    f.w,
    f.h,
    (f.x - f.anchor) * scale,
    (f.y - f.bottom) * scale,
    f.w * scale,
    f.h * scale,
  )
  ctx.restore()
  return true
}
function drawPlant(e, x, y) {
  if (e.type === 0 && drawForestVineAttack(e, x, y)) return
  if (!assets.plants) return
  let pose = Math.sin(e.phase * 8) > 0 ? 0 : 1
  if (e.type === 0 && e.attack > 0) pose = 2
  if (e.type === 1)
    pose = ['windup', 'cast'].includes(e.state)
      ? 2
      : e.y < FLOOR - 38
        ? 2
        : e.y < FLOOR - 8
          ? 1
          : 0
  if (e.type === 2)
    pose = e.attack > 0 || (e.active && e.shot < 0.38) ? 2 : e.moving ? 1 : 0
  const f = assets.plants[e.type + pose * 3]
  const bodyHeight = Math.max(
    assets.plants[e.type].h,
    assets.plants[e.type + 3].h,
  )
  const scale = [89, 82, 94][e.type] / bodyHeight
  ellipse(x, FLOOR + 1, [31, 33, 30][e.type], 6, '#122d2066')
  ctx.save()
  ctx.translate(x, y)
  if (e.face > 0) ctx.scale(-1, 1)
  if (e.type === 2) ctx.rotate(Math.sin(e.phase * 4) * 0.02)
  if (e.hit > 0) ctx.filter = 'brightness(1.8) saturate(.5)'
  ctx.drawImage(
    f.img,
    f.x,
    f.y,
    f.w,
    f.h,
    (f.x - f.anchor) * scale,
    (f.y - f.bottom) * scale,
    f.w * scale,
    f.h * scale,
  )
  ctx.restore()
  if (e.type === 1 && e.state === 'windup') {
    const chargeX = x + e.face * 30,
      progress = clamp(e.stateTime / 0.5, 0, 1)
    ellipse(chargeX, y - 46, 8 + progress * 5, 7 + progress * 4, '#ecee9855')
    star(chargeX, y - 46, 3 + progress * 4, '#fff1ae')
  }
  if (e.type === 2 && e.active && e.shot > 0 && e.shot < 0.38) {
    const mouthX = x + Math.sign(player.x - e.x) * 31
    ellipse(mouthX, y - 62, 13, 11, '#e7f99b33')
    star(mouthX, y - 62, 5, '#e8f7aa', e.phase * 6)
  }
}
function drawSweet(e, x, y) {
  if (!['windup', 'strike', 'recover'].includes(e.state)) return false
  const frames = e.type === 0 ? assets.sweetMacaron : assets.sweetPudding
  if (!frames) return false
  const f = frames[sweetPose(e)],
    // Measure the body only: extended fists and trails must not shrink the actor.
    scale =
      ((frames.drawHeight || 83) * (f.poseHeight || 1)) /
      (f.bodyHeight || frames.bodyHeight)
  ellipse(x, FLOOR + 1, 30, 6, '#51374735')
  ctx.save()
  ctx.translate(x, y)
  // The new sheets punch left. Lock facing throughout the strike.
  if (e.face > 0) ctx.scale(-1, 1)
  if (e.hit > 0) ctx.filter = 'brightness(1.8) saturate(0.5)'
  ctx.drawImage(
    f.img,
    f.x,
    f.y,
    f.w,
    f.h,
    (f.x - f.anchor) * scale,
    (f.y - f.bottom) * scale,
    f.w * scale,
    f.h * scale,
  )
  ctx.restore()
  return true
}

function monster(e) {
  const x = Math.round(e.x - camera),
    y = Math.round(e.y),
    boss = e.type === 3
  if (x < -150 || x > W + 150) return
  if (e.bossKind === 'claude') {
    drawClaudeBoss(e, x, y)
    return
  }
  if (e.family === 'ocean') {
    drawOceanEnemy(e, x, y)
    return
  }
  if (
    e.family === 'clock' ||
    e.bossKind === 'kurumi' ||
    e.bossKind === 'queen'
  ) {
    drawClockMonster(e, x, y)
    return
  }
  if (e.family === 'plant') {
    drawPlant(e, x, y)
    return
  }
  if (boss && e.bossKind === 'nuonu') {
    drawNuonu(e, x, y)
    return
  }
  if (boss && assets.boss) {
    let index = 0
    if (e.state === 'idle') index = Math.floor(e.stateTime * 3) % 3
    if (e.state === 'entrance')
      index =
        e.stateTime < 1.2
          ? Math.floor(e.stateTime * 2) % 3
          : 13 + (Math.floor(e.stateTime * 3) % 3)
    if (e.state === 'windup')
      index = 6 + Math.min(1, Math.floor((e.stateTime / 0.85) * 2))
    if (e.state === 'cast')
      index = 8 + Math.min(4, Math.floor((e.stateTime / 0.8) * 5))
    if (e.state === 'dash')
      index = 3 + Math.min(2, Math.floor((e.stateTime / 0.65) * 3))
    if (e.state === 'recover')
      index = 13 + Math.min(2, Math.floor((e.stateTime / 0.65) * 3))
    const f = assets.boss[index],
      scale = 148 / assets.boss.height
    ellipse(x, FLOOR + 1, 42, 7, '#50344b42')
    drawSparkMagic(e, x, y)
    if (e.state === 'windup') {
      const radius = 35 + e.stateTime * 35
      ctx.strokeStyle = '#ff9cba'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.ellipse(x, FLOOR - 3, radius, 10, 0, 0, Math.PI * 2)
      ctx.stroke()
      if (e.pattern % 2 === 1) {
        rect(Math.min(x, x + e.face * 340), FLOOR - 6, 340, 5, '#ff619788')
        star(x + e.face * 330, FLOOR - 12, 10, '#ff96bb')
      }
    }
    ctx.save()
    ctx.translate(x, y)
    if (e.face < 0) ctx.scale(-1, 1)
    if (e.hit > 0) ctx.filter = 'brightness(1.7) saturate(.6)'
    ctx.drawImage(
      f.img,
      f.x,
      f.y,
      f.w,
      f.h,
      (f.x - f.anchor) * scale,
      -f.h * scale,
      f.w * scale,
      f.h * scale,
    )
    ctx.restore()
    return
  }
  if (!boss && stage === 1 && e.type < 2 && drawSweet(e, x, y)) return
  if (assets.monsters) {
    const bounce = Math.sin(e.phase * 8)
    const row = bounce > 0 ? 0 : 4
    const f = assets.monsters[e.type + row]
    const pairHeight = Math.max(
      assets.monsters[e.type].h,
      assets.monsters[e.type + 4].h,
    )
    const height = boss ? 153 : 83,
      scale = height / pairHeight
    ellipse(x, FLOOR + 1, boss ? 55 : 30, 6, '#51374735')
    ctx.save()
    ctx.translate(x, y)
    if (e.face > 0) ctx.scale(-1, 1)
    const squash = 1 + Math.cos(e.phase * 8) * 0.035
    ctx.scale(squash, 1 / squash)
    ctx.rotate(Math.sin(e.phase * 4) * (boss ? 0.015 : 0.035))
    if (e.hit > 0) ctx.filter = 'brightness(1.8) saturate(0.5)'
    ctx.drawImage(
      f.img,
      f.x,
      f.y,
      f.w,
      f.h,
      (-f.w * scale) / 2,
      -f.h * scale,
      f.w * scale,
      f.h * scale,
    )
    ctx.restore()
    return
  }
}
const BOSS_BAR_STYLES = {
  claude: { name: 'Claude 娘', color: '#ffb458', hole: [390, 299, 1390, 104] },
  spark: { name: '火花', color: '#f77da5', hole: [420, 316, 1332, 80] },
  nuonu: { name: '糯糯', color: '#a1d862', hole: [354, 342, 1464, 54] },
  kurumi: { name: '时崎狂三', color: '#ee4769', hole: [385, 346, 1402, 64] },
  queen: { name: '白之女王', color: '#85d8ff', hole: [306, 348, 1560, 50] },
}
function bossHealthLayout(boss, index, count) {
  const width = 420,
    x = (count > 1 ? W * (index ? 0.75 : 0.25) : W / 2) - width / 2,
    y = 84,
    scale = width / 2172,
    style = BOSS_BAR_STYLES[boss.bossKind],
    [left, top, w, h] = style.hole
  return {
    x,
    y,
    width,
    height: 724 * scale,
    fillX: x + left * scale,
    fillY: y + top * scale,
    fillWidth: w * scale,
    fillHeight: h * scale,
    ratio: clamp(boss.hp / boss.maxHp, 0, 1),
    style,
  }
}
function drawBossBars(target = ctx) {
  if (bossIntro || !['playing', 'paused'].includes(mode)) return
  const bosses = enemies.filter((e) => e.type === 3 && e.active && e.hp > 0)
  bosses.forEach((boss, index) => {
    const layout = bossHealthLayout(boss, index, bosses.length),
      frame = assets.bossHealthFrames?.[boss.bossKind]?.[0],
      color =
        boss.bossKind === 'nuonu' && boss.phaseLevel === 2
          ? '#ecb16d'
          : layout.style.color
    target.save()
    target.imageSmoothingEnabled = true
    target.fillStyle = '#151923ec'
    target.fillRect(
      layout.fillX,
      layout.fillY,
      layout.fillWidth,
      layout.fillHeight,
    )
    target.fillStyle = color
    target.fillRect(
      layout.fillX,
      layout.fillY,
      layout.fillWidth * layout.ratio,
      layout.fillHeight,
    )
    if (frame)
      target.drawImage(
        frame.img,
        0,
        0,
        frame.img.width,
        frame.img.height,
        layout.x,
        layout.y,
        layout.width,
        layout.height,
      )
    else {
      target.strokeStyle = '#ffdc9f'
      target.lineWidth = 2
      target.strokeRect(
        layout.fillX - 3,
        layout.fillY - 3,
        layout.fillWidth + 6,
        layout.fillHeight + 6,
      )
    }
    target.textAlign = 'center'
    target.font = 'bold 12px "Microsoft YaHei", sans-serif'
    target.strokeStyle = '#16151b'
    target.lineWidth = 3
    target.fillStyle = '#fff4de'
    const label = `${layout.style.name}${boss.bossKind === 'nuonu' ? (boss.phaseLevel === 2 ? ' · II 破叶狂怒' : ' · I 四叶守卫') : ''}  ${Math.ceil(boss.hp)} / ${boss.maxHp}`
    target.strokeText(
      label,
      layout.x + layout.width / 2,
      layout.y + layout.height + 10,
    )
    target.fillText(
      label,
      layout.x + layout.width / 2,
      layout.y + layout.height + 10,
    )
    const move = {
      'laser-charge': '花光激柱蓄力 · 准备翻滚',
      'laser-cast': '激柱横推 · 仅翻滚可躲',
      idle: '观察',
      recover: '收招空隙',
      windup: '即将出招',
      cast: '远程齐射',
      dash: '冲刺将至',
      transform: '半血觉醒',
      slam: '根须震地',
      'stop-windup': '时停将至',
      'time-stop': '时间冻结',
      'wave-charge': '斩击蓄力 · 准备翻滚',
      wave: '紫晶斩击 · 仅翻滚可躲',
      'sword-charge': '地面剑蓄力 · 跳跃或翻滚',
      swords: '剑阵正在逼近',
    }[boss.state]
    if (move) {
      target.font = '11px "Microsoft YaHei", sans-serif'
      target.fillStyle = [
        'windup',
        'stop-windup',
        'wave-charge',
        'sword-charge',
      ].includes(boss.state)
        ? '#ffe6a1'
        : '#e1d5c9'
      target.strokeText(
        move,
        layout.x + layout.width / 2,
        layout.y + layout.height + 27,
      )
      target.fillText(
        move,
        layout.x + layout.width / 2,
        layout.y + layout.height + 27,
      )
    }
    target.restore()
  })
}
// Keep the source PNG's alpha and palette; transforms follow the actual attack.
function drawAttackArt(frames, x, y, width, options = {}) {
  const f = frames?.[options.index ?? 0]
  if (!f) return
  // Animated effects share a fixed cell, so changing crop bounds cannot make
  // the blade or tornado jump sideways or grow between poses.
  const sx = options.cell ? 0 : f.x,
    sy = options.cell ? 0 : f.y,
    sw = options.cell ? f.img.width : f.w,
    sh = options.cell ? f.img.height : f.h,
    height = options.height || (width * sh) / sw
  ctx.save()
  ctx.translate(x, y)
  if (options.angle) ctx.rotate(options.angle)
  if (options.face < 0) ctx.scale(-1, 1)
  ctx.globalAlpha *= options.alpha ?? 1
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(
    f.img,
    sx,
    sy,
    sw,
    sh,
    -width * (options.anchorX ?? 0.5),
    -height * (options.anchorY ?? 0.5),
    width,
    height,
  )
  ctx.restore()
}
function effectPose(age, fps, count) {
  return reducedMotion ? 0 : Math.floor(Math.max(0, age) * fps) % count
}
function drawNuonuProjectile(b) {
  const x = b.x - camera,
    angry = b.nuonuPhase === 2
  if (angry) {
    drawAttackArt(assets.nuonuTornado, x, b.y, b.shock ? 52 : 36, {
      height: b.shock ? 38 : 36,
      cell: true,
      index: effectPose(b.age || 0, 12, 16),
      alpha: 0.95,
    })
  } else {
    drawAttackArt(assets.nuonuThorns, x, b.y, b.shock ? 52 : 34, {
      height: b.shock ? 38 : 34,
      angle: b.shock ? 0 : Math.atan2(b.vy, b.vx) + Math.PI / 2,
    })
  }
}
function drawCakeSlash() {
  if (player.weapon === 'wand' || player.attack <= 0 || player.roll > 0) return
  const finisher = player.combo === 3,
    start = finisher ? 0.16 : 0.08,
    duration = finisher ? 0.3 : 0.26,
    progress = (player.attackAge - start) / duration
  if (progress <= 0 || progress >= 1) return
  drawAttackArt(
    assets.cakeSlash,
    player.x - camera + player.attackFace * (finisher ? 70 : 58),
    player.y - 62,
    finisher ? 195 : 165,
    {
      face: player.attackFace,
      height: finisher ? 112 : 96,
      angle: reducedMotion ? 0 : player.attackFace * (-0.15 + progress * 0.3),
      alpha: Math.sin(progress * Math.PI) ** 0.65,
    },
  )
}
function drawSparkMagic(e, x, y) {
  if (e.state === 'windup' || e.state === 'cast') {
    const charging = e.state === 'windup'
    const progress = charging
      ? clamp(e.stateTime / 0.85, 0, 1)
      : 1 - clamp(e.stateTime / 0.8, 0, 1)
    drawAttackArt(assets.sparkClockEffect, x, y - 86, 190 + progress * 80, {
      alpha: charging ? 0.35 + progress * 0.5 : progress * 0.9,
      angle: reducedMotion ? 0 : Math.sin(e.stateTime * 3) * 0.08,
    })
  }
  if (e.state === 'dash') {
    drawAttackArt(assets.sparkSlashEffect, x + e.face * 55, y - 63, 330, {
      face: e.face,
      anchorX: 0.8,
      alpha: 0.8,
    })
  }
}
function drawBossProjectile(b) {
  const kurumi = b.kurumiShot
  const frames = kurumi ? assets.kurumiShotEffect : assets.sparkSlashEffect
  drawAttackArt(frames, b.x - camera, b.y, kurumi ? 138 : 105, {
    angle: Math.atan2(b.vy, b.vx) - (b.vx < 0 ? Math.PI : 0),
    face: Math.sign(b.vx),
    anchorX: kurumi ? 0.9 : 0.96,
    anchorY: kurumi ? 0.55 : 0.82,
  })
}
function drawMobProjectile(b) {
  const forest = b.mobShot === 'forest',
    mushroom = b.mobShot === 'mushroom',
    face = b.vx < 0 ? -1 : 1
  drawAttackArt(
    mushroom
      ? assets.mushroomShotEffect
      : forest
        ? assets.forestMobShot
        : assets.castleMobShot,
    b.x - camera,
    b.y,
    mushroom ? 108 : forest ? 54 : 64,
    {
      face,
      angle: Math.atan2(b.vy, b.vx) - (face < 0 ? Math.PI : 0),
      anchorX: mushroom ? 0.92 : forest ? 0.73 : 0.84,
      anchorY: mushroom ? 0.5 : forest ? 0.54 : 0.58,
    },
  )
}
function wardHeart(x, y, size, fill, outline = '#ffe8a8') {
  ctx.save()
  ctx.translate(x, y)
  ctx.fillStyle = fill
  ctx.strokeStyle = outline
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(0, size * 0.9)
  ctx.bezierCurveTo(
    -size * 1.5,
    -size * 0.1,
    -size,
    -size * 1.2,
    0,
    -size * 0.45,
  )
  ctx.bezierCurveTo(size, -size * 1.2, size * 1.5, -size * 0.1, 0, size * 0.9)
  ctx.fill()
  ctx.stroke()
  rect(-size * 0.5, -size * 0.35, 2, 2, '#fffad8')
  ctx.restore()
}
function wardButterfly(x, y, size, phase, rotation) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(rotation)
  const wing = reducedMotion ? 0.8 : 0.65 + Math.sin(phase * 9) * 0.25
  ctx.scale(wing, 1)
  for (const side of [-1, 1]) {
    ctx.fillStyle = '#8dfad3'
    ctx.strokeStyle = '#ecffd7'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(side * size * 0.7, -size * 0.8)
    ctx.lineTo(side * size * 1.2, -size * 0.5)
    ctx.lineTo(side * size, size * 0.15)
    ctx.lineTo(side * size * 0.5, size * 0.65)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    rect(side > 0 ? 2 : -5, -size * 0.4, 3, 3, '#fff5b5')
  }
  rect(-1, -size * 0.45, 2, size, '#fff0b9')
  ctx.restore()
}
function wardRing(x, y, rx, ry, color, thickness, rotation = 0) {
  ctx.strokeStyle = color
  ctx.lineWidth = thickness
  ctx.beginPath()
  ctx.ellipse(x, y, rx, ry, rotation, 0, Math.PI * 2)
  ctx.stroke()
}
function drawWard(front = false) {
  if (player.ward <= 0) return
  const t = reducedMotion ? 0 : player.wardAge,
    x = player.x - camera,
    foot = player.y,
    rolling = player.roll > 0,
    y = foot - (rolling ? 43 : 65),
    rx = rolling ? 72 : 66,
    ry = rolling ? 58 : 91,
    envelope = Math.min(
      clamp(player.wardAge / 0.2, 0, 1),
      clamp(player.ward / 0.25, 0, 1),
    ),
    swell = reducedMotion ? 0 : Math.sin(t * 2.4) * 2,
    gold = player.ward < 1 ? '#ffe0a0' : '#ffeab0'
  ctx.save()
  ctx.globalAlpha = envelope
  if (!front) {
    // Luminous rim, a clear center, and an ornate ground seal behind the feet.
    const shell = ctx.createRadialGradient(x, y, 16, x, y, ry + 7)
    shell.addColorStop(0, '#a6ffda00')
    shell.addColorStop(0.48, '#a6ffda06')
    shell.addColorStop(0.78, '#74ebbc25')
    shell.addColorStop(1, '#b3ffdf52')
    ctx.fillStyle = shell
    ctx.beginPath()
    ctx.ellipse(x, y, rx + swell, ry, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    wardRing(x, y, rx + swell + 3, ry + 3, '#65efba26', 9)
    wardRing(x, y, rx + swell, ry, '#b3ffd5c9', 1.5)
    ellipse(x, foot + 1, 84, 18, '#7cfdaf20')
    wardRing(x, foot, 78, 17, '#64efaa44', 6)
    wardRing(x, foot, 78, 17, gold, 1.2)
    wardRing(x, foot, 62, 12, '#c5ffd1', 1.5)
    wardRing(x, foot, 46, 8, '#9cf5be88', 1)
    ctx.restore()
    ctx.save()
    ctx.translate(x, foot)
    ctx.scale(1, 0.23)
    ctx.rotate(t * 0.35)
    ctx.strokeStyle = '#e4efbaad'
    ctx.fillStyle = '#91f1bb0c'
    ctx.lineWidth = 1.5
    for (let i = 0; i < 6; i++) {
      ctx.rotate(Math.PI / 3)
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.bezierCurveTo(22, -30, 55, -26, 62, 0)
      ctx.bezierCurveTo(55, 26, 22, 30, 0, 0)
      ctx.fill()
      ctx.stroke()
    }
    ctx.restore()
    // Rotating links and tiny card-suit sigils connect the two seal rings.
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6 + t * 0.35
      ctx.strokeStyle = '#ebf4b899'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x + Math.cos(a) * 49, foot + Math.sin(a) * 9)
      ctx.lineTo(x + Math.cos(a) * 74, foot + Math.sin(a) * 16)
      ctx.stroke()
      star(
        x + Math.cos(a) * 78,
        foot + Math.sin(a) * 17,
        i % 3 ? 2 : 4,
        gold,
        a,
      )
    }
    for (const point of player.wardTrail) {
      ctx.globalAlpha =
        envelope * (1 - (player.wardAge - point.age) / 0.5) * 0.35
      star(point.x - camera, point.y - 25, 6, '#b8ffca', point.age)
      wardButterfly(point.x - camera, point.y + 22, 4, point.age, -0.25)
    }
    ctx.globalAlpha = envelope
    // Activation blooms outward; no white flash over the player's face.
    if (!reducedMotion && t < 0.6) {
      const life = 1 - t / 0.6
      ctx.globalAlpha = envelope * life
      wardRing(x, foot, 80 + (1 - life) * 60, 17 + (1 - life) * 17, gold, 2)
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4 + t * 0.4
        star(
          x + Math.cos(a) * (75 + t * 45),
          y + Math.sin(a) * (ry + t * 30),
          3 + life * 3,
          '#d5ffb5',
          a,
        )
      }
      ctx.globalAlpha = envelope
    }
  }
  // Two helixes flow up the perimeter. Depth places the front half over the
  // shell, while the back half remains behind the character's silhouette.
  for (let i = 0; i < (reducedMotion ? 8 : 26); i++) {
    const progress = (t * 0.38 + i / 26) % 1,
      angle = t * 1.7 + i * 0.73,
      nearer = Math.sin(angle) >= 0
    if (nearer !== front) continue
    const px = x + Math.cos(angle) * (rx - 1),
      py = foot - 7 - progress * (rolling ? 106 : 170),
      alpha = 0.25 + Math.sin(progress * Math.PI) * 0.55
    ctx.globalAlpha = envelope * alpha
    ellipse(px, py, 5, 5, '#a0ffc129')
    star(px, py, i % 4 ? 2 : 4, i % 3 ? '#c5ffdf' : gold, angle)
  }
  for (let i = 0; i < 6; i++) {
    const a = t * 0.7 + (i * Math.PI) / 3,
      nearer = Math.sin(a) >= 0
    if (nearer !== front) continue
    const px = x + Math.cos(a) * (rx + 8),
      py = y + Math.sin(a) * (ry - 10)
    ctx.globalAlpha = envelope * (nearer ? 0.95 : 0.6)
    ellipse(px, py, 12, 10, '#a3ffcb20')
    wardButterfly(px, py, i % 2 ? 7 : 5, t + i, Math.cos(a) * 0.3)
  }
  ctx.globalAlpha = envelope
  if (front) {
    // Pearl arcs and corner jewels frame the body without obscuring it.
    ctx.strokeStyle = '#ffecb0ac'
    ctx.lineWidth = 1.5
    for (const a of [-0.55, Math.PI - 0.55]) {
      ctx.beginPath()
      ctx.ellipse(x, y, rx - 5, ry - 7, 0, a + t * 0.14, a + 0.8 + t * 0.14)
      ctx.stroke()
    }
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + Math.PI / 4
      star(x + Math.cos(a) * rx, y + Math.sin(a) * ry, 4, gold, a)
    }
    // Gold ivy filigree echoes the bottle's stopper and heart-lock ornaments.
    for (const side of [-1, 1]) {
      ctx.save()
      ctx.translate(x + side * (rx - 7), y)
      ctx.scale(side, 1)
      ctx.strokeStyle = '#efdf9c9c'
      ctx.lineWidth = 1.4
      ctx.beginPath()
      ctx.moveTo(-5, -55)
      ctx.bezierCurveTo(14, -42, -12, -27, 2, -9)
      ctx.bezierCurveTo(19, 11, -8, 18, 3, 42)
      ctx.stroke()
      for (let i = 0; i < 3; i++) {
        const cy = -36 + i * 29
        ctx.beginPath()
        ctx.arc(4, cy, 6, -0.7, Math.PI * 1.7)
        ctx.stroke()
        ctx.save()
        ctx.translate(-5, cy + 6)
        ctx.rotate(-0.7)
        ellipse(0, 0, 3, 6, '#b9f5b586')
        ctx.restore()
      }
      ctx.restore()
    }
    wardHeart(x, y - ry + 2, 7, '#8ee0b4')
    if (player.wardHit > 0) {
      ctx.save()
      ctx.globalAlpha = (player.wardHit / 0.3) * 0.75
      wardRing(x, y, rx + 5, ry + 5, '#f8f2bd', 2.5)
      for (let i = 0; i < 6; i++)
        star(
          x + Math.cos((i * Math.PI) / 3) * rx,
          y + Math.sin((i * Math.PI) / 3) * ry,
          6,
          '#faffc8',
        )
      ctx.restore()
    }
    const labelY = y - ry - 26
    rect(x - 57, labelY - 11, 114, 24, '#173b31e6')
    ctx.strokeStyle = '#d6ce8a'
    ctx.lineWidth = 1
    ctx.strokeRect(x - 57, labelY - 11, 114, 24)
    star(x - 50, labelY + 1, 3, gold)
    star(x + 50, labelY + 1, 3, gold)
    ctx.font = 'bold 11px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillStyle = '#edffd9'
    ctx.fillText(`森灵守护 ${player.ward.toFixed(1)}s`, x, labelY + 4)
  }
  ctx.restore()
}
function aliceReferenceWalkPose() {
  const index =
    Math.floor((player.aliceWalkTime || 0) * 16 + 1e-8) %
    assets.aliceWalk.length
  return { frames: assets.aliceWalk, index }
}

function drawPlayer() {
  const x = Math.round(player.x - camera),
    y = Math.round(player.y)
  ellipse(x, y + 2, 31, 7, '#402c453f')
  if (stage === 4) {
    drawWhalePlayer(x, y)
    return
  }
  if (
    !clockJourney?.portalTransition &&
    player.inv > 0 &&
    player.ward <= 0 &&
    player.roll <= 0 &&
    player.burst <= 0 &&
    Math.floor(player.inv * 14) % 2 === 0
  )
    return
  if (player.slam && drawDownSlam(x, y)) return
  if (player.weapon === 'wand' && assets.wandAttack) {
    drawWandPlayer(x, y)
    return
  }
  let frames = assets.run,
    index =
      player.vx && player.ground
        ? Math.floor(player.walk * 8) % 8
        : player.ground
          ? 2
          : 3,
    flip = player.face < 0,
    height = 136
  if (!player.vx && player.ground && assets.attack) {
    frames = assets.attack
    index = 1
    flip = player.face > 0
  }
  if (player.ranged > 0 && !player.vx && player.ground) {
    frames = assets.attack
    index = Math.floor(player.ranged * 14) % 8
    flip = player.face > 0
  }
  if (player.burst > 0) {
    frames = assets.special
    index = 4 + Math.min(7, Math.floor(((0.6 - player.burst) / 0.6) * 8))
    flip = player.face < 0
  }
  if ((!player.ground || player.landing > 0) && assets.jump) {
    frames = assets.jump
    flip = player.face > 0
    height = 136
    index = player.ground
      ? player.landing > 0.08
        ? 6
        : 7
      : player.jumpAge < 0.06
        ? 0
        : player.vy < -390
          ? 1
          : player.vy < -110
            ? 2
            : player.vy < 110
              ? 3
              : player.vy < 380
                ? 4
                : 5
  }
  if (player.attack > 0 && assets.special) {
    frames = assets.special
    const poses =
      player.combo === 3 ? [4, 5, 6, 7, 8, 9, 10, 11, 12] : [4, 5, 6, 7, 10, 12]
    index =
      poses[
        Math.min(
          poses.length - 1,
          Math.floor(
            (player.attackAge / (player.combo === 3 ? 0.6 : 0.42)) *
              poses.length,
          ),
        )
      ]
    flip = player.attackFace < 0
  }
  if (player.roll > 0 && assets.roll) {
    frames = assets.roll
    index = Math.min(7, Math.floor(((0.58 - player.roll) / 0.58) * 8))
    flip = player.rollFace < 0
    height = 112
  }
  const referenceWalking =
    stage <= 3 &&
    assets.aliceWalk &&
    player.vx &&
    player.ground &&
    player.landing <= 0 &&
    player.attack <= 0 &&
    player.roll <= 0 &&
    player.burst <= 0
  if (referenceWalking) {
    ;({ frames, index } = aliceReferenceWalkPose())
    flip = player.face < 0
  }
  if (!frames) return
  const f = frames[index],
    scale = height / frames.height
  const moving = player.vx && player.ground && player.roll <= 0
  const bob = referenceWalking
    ? 0
    : moving
      ? Math.sin(player.walk * Math.PI * 4) * 1.3
      : Math.sin(time * 2.5) * 0.6
  const recoil = player.muzzle / 0.11
  ctx.save()
  ctx.translate(x - player.face * recoil * 3, y - bob)
  if (flip) ctx.scale(-1, 1)
  if (moving && !referenceWalking)
    ctx.rotate(player.face * (flip ? -1 : 1) * 0.025)
  ctx.drawImage(
    f.img,
    f.x,
    f.y,
    f.w,
    f.h,
    (f.x - f.anchor) * scale,
    (f.y - (f.bottom ?? f.y + f.h)) * scale,
    f.w * scale,
    f.h * scale,
  )
  ctx.restore()
}
function drawDownSlam(x, y) {
  const slam = player.slam
  const frames =
    player.weapon === 'wand' ? assets.wandDownSlam : assets.cakeDownSlam
  if (!frames) return false
  const wand = player.weapon === 'wand'
  const poses =
    slam.phase === 'windup'
      ? wand
        ? [3, 4]
        : [2, 3, 4]
      : slam.phase === 'dive'
        ? wand
          ? [5, 6]
          : [5, 6, 7]
        : wand
          ? [7, 11, 12, 15]
          : [9, 10, 11, 12, 14]
  const duration =
    slam.phase === 'windup' ? 0.13 : slam.phase === 'dive' ? 0.18 : 0.38
  const f =
    frames[
      poses[
        Math.min(
          poses.length - 1,
          Math.floor((slam.age / duration) * poses.length),
        )
      ]
    ]
  const scale = 136 / frames.bodyHeight
  ctx.save()
  ctx.translate(x, y)
  // Cake poses face right; the wand poses face left.
  if (wand ? slam.face > 0 : slam.face < 0) ctx.scale(-1, 1)
  ctx.drawImage(
    f.img,
    f.x,
    f.y,
    f.w,
    f.h,
    (f.x - f.anchor) * scale,
    (f.y - f.bottom) * scale,
    f.w * scale,
    f.h * scale,
  )
  ctx.restore()
  return true
}
function drawHealing() {
  const frames = assets.healEffect
  if (player.heal <= 0 || !frames) return
  const index = Math.min(7, Math.floor(((0.96 - player.heal) / 0.96) * 8))
  const f = frames[index]
  const scale = 155 / frames.height
  ctx.save()
  ctx.globalAlpha = Math.min(0.62, player.heal / 0.12)
  ctx.drawImage(
    f.img,
    f.x,
    f.y,
    f.w,
    f.h,
    player.x - camera + (f.x - f.anchor) * scale,
    player.y + 8 + (f.y - f.bottom) * scale,
    f.w * scale,
    f.h * scale,
  )
  ctx.restore()
}
function drawWandPlayer(x, y) {
  let frames = assets.wandAttack,
    index = 12 + (Math.floor(time * 3) % 4),
    face = player.face,
    scale = 136 / frames.bodyHeight
  const moving = player.vx && player.ground && player.roll <= 0
  if (moving && assets.wandRun) {
    frames = assets.wandRun
    index = Math.floor(player.walk * 8) % 8
    scale = 136 / frames.height
  }
  const referenceWalking =
    stage <= 3 &&
    assets.aliceWalk &&
    moving &&
    player.attack <= 0 &&
    player.ranged <= 0
  if (referenceWalking) {
    ;({ frames, index } = aliceReferenceWalkPose())
    scale = 136 / frames.height
  }
  if (!player.ground && assets.wandRun) {
    frames = assets.wandRun
    index = player.vy < 0 ? 2 : 6
    scale = 136 / frames.height
  }
  if (player.attack > 0 || player.ranged > 0) {
    frames = assets.wandAttack
    const poses = [2, 3, 4, 5, 6, 7, 10, 12]
    index =
      player.attack > 0
        ? poses[
            Math.min(7, Math.floor((player.attackAge / WAND_CAST_DURATION) * 8))
          ]
        : [5, 6, 7][Math.floor(player.ranged * 16) % 3]
    face = player.attack > 0 ? player.attackFace : player.face
    scale = 136 / frames.bodyHeight
  }
  if (player.roll > 0) {
    frames = assets.wandRoll
    index = Math.min(7, Math.floor(((0.58 - player.roll) / 0.58) * 8))
    face = player.rollFace
    scale = 136 / frames.bodyHeight
  }
  const f = frames[index]
  ctx.save()
  ctx.translate(
    x,
    y -
      (moving && !referenceWalking
        ? Math.sin(player.walk * Math.PI * 4) * 1.4
        : 0),
  )
  if (face < 0) ctx.scale(-1, 1)
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(
    f.img,
    f.x,
    f.y,
    f.w,
    f.h,
    (f.x - f.anchor) * scale,
    (f.y - f.bottom) * scale,
    f.w * scale,
    f.h * scale,
  )
  ctx.restore()
  if (player.weaponReveal > 0) {
    const age = 1.8 - player.weaponReveal
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ctx.globalAlpha = Math.min(1, player.weaponReveal * 2)
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6 + age * 1.5,
        r = 46 + age * 28
      star(
        x + Math.cos(a) * r,
        y - 64 + Math.sin(a) * r * 0.7,
        4,
        i % 2 ? '#ffb8d7' : '#ffe5a8',
        a,
      )
    }
    ctx.restore()
  }
}
function drawWandShot(b) {
  const f = assets.wandShot?.[0]
  if (!f) return
  const x = b.x - camera,
    width = b.power ? 178 : 112,
    height = (width * f.h) / f.w,
    face = Math.sign(b.vx)
  ctx.save()
  ctx.translate(x, b.y)
  if (face < 0) ctx.scale(-1, 1)
  ctx.imageSmoothingEnabled = true
  // A narrow bright trail leaves the original rose/card projectile legible.
  ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < (b.trail || []).length; i++) {
    const p = b.trail[i]
    ctx.globalAlpha = ((i + 1) / b.trail.length) * 0.25
    ellipse((p.x - b.x) * face, p.y - b.y, 12, 6, '#ff90c8')
  }
  ctx.globalAlpha = 1
  ctx.globalCompositeOperation = 'source-over'
  ctx.drawImage(
    f.img,
    f.x,
    f.y,
    f.w,
    f.h,
    -width * 0.72,
    -height / 2,
    width,
    height,
  )
  ctx.restore()
}
function drawTreasure() {
  for (const chest of chests) {
    const x = chest.x - camera
    if (x < -130 || x > W + 130) continue
    const clockChest = stage === 3
    const f = (
      stage === 4
        ? chest.opened
          ? assets.oceanChestOpen
          : assets.oceanChestClosed
        : clockChest
          ? chest.opened
            ? assets.clockChestOpen
            : assets.clockChestClosed
          : chest.opened
            ? assets.chestOpen
            : assets.chestClosed
    )?.[0]
    if (!f) continue
    // Equal image width and a common ground anchor keep the base stable.
    const width = clockChest ? 115 : 124,
      height = (f.h / f.w) * width
    ellipse(x, chest.y, 57, 9, '#0a221da0')
    if (chest.opened && chest.age < 2) {
      ellipse(x, chest.y - 66, 45, 35, '#ffe28b30')
      for (let i = 0; i < 6; i++)
        star(
          x - 38 + i * 15,
          chest.y - 45 - ((chest.age * 43 + i * 17) % 65),
          3,
          '#ffeba9',
        )
    }
    ctx.drawImage(
      f.img,
      f.x,
      f.y,
      f.w,
      f.h,
      x - width / 2,
      chest.y - height,
      width,
      height,
    )
    if (chest.kind === 'ocean') drawOceanKeyReward(chest, x)
    if (
      chest.kind === 'wand' &&
      chest.opened &&
      chest.age < 3 &&
      assets.candyWand
    ) {
      const wand = assets.candyWand[0],
        wh = 70,
        ww = (wand.w / wand.h) * wh
      const wy = chest.y - height - 14 - Math.min(chest.age, 1) * 35
      ctx.save()
      ctx.globalAlpha = clamp(3 - chest.age, 0, 1)
      ctx.imageSmoothingEnabled = true
      ctx.drawImage(
        wand.img,
        wand.x,
        wand.y,
        wand.w,
        wand.h,
        x - ww / 2,
        wy - wh,
        ww,
        wh,
      )
      ctx.restore()
    }
    if (!chest.opened) {
      star(x, chest.y - height - 11, 5, '#ffe5a0', time * 0.7)
      if (nearbyChest() === chest && mode === 'playing') {
        ctx.font = 'bold 12px sans-serif'
        ctx.textAlign = 'center'
        ctx.strokeStyle = '#173b2f'
        ctx.lineWidth = 4
        ctx.fillStyle = '#ffedbc'
        const label =
          chest.kind === 'ocean'
            ? oceanChestHint()
            : chest.kind === 'wand'
              ? 'E · 糖果魔法棒'
              : 'E · 无敌药水'
        ctx.strokeText(label, x, chest.y - height - 27)
        ctx.fillText(label, x, chest.y - height - 27)
      }
    }
  }
}
function drawBossIntro() {
  if (!bossIntro) return
  const { boss, elapsed: t, duration } = bossIntro,
    forest = boss.bossKind === 'nuonu',
    theme = BOSS_ENTRANCES[boss.bossKind],
    opening = clamp(t / 0.45, 0, 1),
    closing = clamp((duration - t) / 0.45, 0, 1),
    envelope = opening * closing,
    x = boss.x - camera
  ctx.save()
  ctx.globalAlpha = envelope
  rect(0, 0, W, H, forest ? '#061b19a3' : '#26102288')

  // The reveal belongs to the world: a spotlight or a waking forest seal.
  if (!forest) {
    ctx.fillStyle = '#ffe0bc25'
    ctx.beginPath()
    ctx.moveTo(x - 120, 40)
    ctx.lineTo(x + 150, 40)
    ctx.lineTo(x + 110, FLOOR)
    ctx.lineTo(x - 130, FLOOR)
    ctx.closePath()
    ctx.fill()
  }
  for (let i = 0; i < (forest ? 3 : 2); i++) {
    ctx.strokeStyle = theme.accent
    ctx.globalAlpha = envelope * (0.25 + i * 0.1)
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.ellipse(
      x,
      FLOOR - 2,
      65 + i * 30 + Math.sin(t * 3) * 8,
      12 + i * 7,
      0,
      0,
      Math.PI * 2,
    )
    ctx.stroke()
  }
  for (let i = 0; i < 26; i++) {
    const a = i * 2.399 + t * (forest ? 0.6 : -0.4),
      radius = 65 + (i % 6) * 21,
      px = x + Math.cos(a) * radius,
      py = FLOOR - 28 - ((t * 65 + i * 29) % 310)
    ctx.globalAlpha = envelope * (0.3 + (i % 4) * 0.17)
    if (forest) {
      ctx.save()
      ctx.translate(px, py)
      ctx.rotate(a)
      ellipse(0, 0, 3, 8, theme.accent)
      rect(-1, -5, 1, 10, '#f1f5c7')
      ctx.restore()
    } else {
      ctx.font = `${12 + (i % 3) * 4}px serif`
      ctx.textAlign = 'center'
      ctx.fillStyle = i % 2 ? theme.accent : theme.pale
      ctx.fillText(i % 3 ? '✦' : '♥', px, py)
    }
  }

  const slideIn = clamp((t - ENTRANCE_CARD_START) / ENTRANCE_CARD_SLIDE, 0, 1),
    slideOut = clamp(
      (t - (duration - ENTRANCE_CARD_SLIDE)) / ENTRANCE_CARD_SLIDE,
      0,
      1,
    ),
    offset = reducedMotion ? 0 : -W * (1 - slideIn) ** 3 + W * slideOut ** 3
  if (slideIn > 0) {
    ctx.save()
    ctx.globalAlpha = envelope
    ctx.translate(offset, 0)
    const gradient = ctx.createLinearGradient(0, 0, W, 0)
    gradient.addColorStop(0, theme.ink)
    gradient.addColorStop(0.58, theme.ink)
    gradient.addColorStop(1, theme.tint)
    rect(0, 185, W, 266, gradient)
    rect(0, 185, W, 2, theme.accent)
    rect(0, 449, W, 2, theme.accent)
    rect(56, 214, 4, 207, theme.accent)
    // Slanted stage strips and a soft halo frame the original character art.
    ctx.fillStyle = theme.tint
    ctx.beginPath()
    ctx.moveTo(750, 187)
    ctx.lineTo(850, 187)
    ctx.lineTo(650, 449)
    ctx.lineTo(550, 449)
    ctx.fill()
    ellipse(843, 316, 150, 137, forest ? '#b9e69012' : '#ff90b21c')
    ctx.strokeStyle = forest ? '#c3e49966' : '#ffb6c466'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(843, 316, 124, t * 0.22, t * 0.22 + Math.PI * 1.55)
    ctx.stroke()
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4 - t * 0.25
      star(
        843 + Math.cos(a) * 140,
        316 + Math.sin(a) * 120,
        i % 2 ? 3 : 6,
        theme.accent,
        a,
      )
    }

    for (const corner of [
      [20, 199],
      [1080, 199],
      [20, 436],
      [1080, 436],
    ])
      star(corner[0], corner[1], 8, theme.accent, Math.PI / 4)

    const royal = boss.bossKind === 'kurumi' || boss.bossKind === 'queen'
    const claude = boss.bossKind === 'claude'
    const frames = claude
      ? assets.claudeIdle
      : royal
        ? assets[boss.bossKind]
        : forest
          ? boss.phaseLevel === 2
            ? assets.nuonuPhase2
            : assets.nuonu
          : assets.boss
    if (frames) {
      const index = claude
          ? 0
          : royal
            ? royalPose(boss)
            : forest
              ? Math.floor(t * 2) % 3
              : t < 2
                ? Math.floor(t * 2) % 3
                : 13 + (Math.floor(t * 3) % 3),
        f = frames[index],
        scale =
          316 /
          (claude
            ? frames[0].h
            : royal
              ? frames[0].h
              : forest
                ? Math.max(assets.nuonu[0].h, assets.nuonuPhase2[0].h)
                : assets.boss[0].h)
      ctx.save()
      ctx.translate(841 + Math.sin(t * 2) * 3, 442)
      ctx.drawImage(
        f.img,
        f.x,
        f.y,
        f.w,
        f.h,
        (f.x - f.anchor) * scale,
        -f.h * scale,
        f.w * scale,
        f.h * scale,
      )
      ctx.restore()
    }
    ctx.restore()
  }

  // Letterbox bars leave a readable stage credit and the skip button clear.
  ctx.globalAlpha = envelope
  rect(0, 0, W, 58, '#15121e')
  rect(0, H - 58, W, 58, '#15121e')
  ctx.fillStyle = theme.accent
  ctx.textAlign = 'left'
  ctx.font = '11px monospace'
  ctx.fillText(`STAGE 0${stage}   /   BOSS ENCOUNTER`, 32, 34)
  ctx.textAlign = 'center'
  ctx.fillStyle = theme.pale
  ctx.fillText(forest ? 'THE FOREST AWAKENS' : 'THE CURTAIN RISES', W / 2, 34)
  ctx.textAlign = 'left'
  ctx.font = '12px "Microsoft YaHei", sans-serif'
  ctx.fillText(soundOn ? `♪ ${theme.track}` : '♪ 声音已关闭', 32, H - 24)
  rect(32, H - 11, (W - 64) * clamp(t / duration, 0, 1), 2, theme.accent)
  ctx.restore()
}

function draw() {
  ctx.imageSmoothingEnabled = false
  rect(
    0,
    0,
    W,
    H,
    stage === 3 ? '#201621' : stage === 2 ? '#244f42' : '#85cee5',
  )
  const background =
    stage === 3
      ? assets.clockCourt
      : stage === 2
        ? assets.forest
        : assets.background
  if (stage === 4) drawOceanBackground()
  else if (background) {
    const bw = 1490,
      bh = stage === 3 ? 840 : 994,
      offset = -(camera / (LENGTH - W)) * (bw - W)
    ctx.drawImage(
      background,
      offset,
      stage === 3 ? -190 : stage === 2 ? -132 : -185,
      bw,
      bh,
    )
    rect(0, 80, W, FLOOR - 80, stage === 2 ? '#06291a16' : '#fff2ce0b')
  }
  ctx.save()
  if (shake > 0)
    ctx.translate(random(-shake, shake), random(-shake / 2, shake / 2))
  // Floating sugar dust lives on a slower parallax layer.
  for (let i = 0; stage !== 4 && i < 22; i++) {
    const x =
        (((i * 139.7 - camera * 0.15 + Math.sin(time * 0.4 + i) * 18) %
          (W + 40)) +
          W +
          40) %
        (W + 40),
      y = 110 + ((i * 71) % 365) + Math.sin(time + i) * 10
    if (stage === 2) {
      ellipse(x, y, 6, 6, '#d9efa21c')
      star(x, y, 2 + (i % 2), i % 2 ? '#d6f1a3aa' : '#ffe4a2aa', time * 0.4 + i)
    } else
      star(x, y, 3 + (i % 3), i % 2 ? '#fff4cfaa' : '#ffbbd5aa', time * 0.4 + i)
  }
  if (stage === 3) ctx.translate(0, -cameraY)
  for (let x = 280; stage < 3 && x < LENGTH; x += 390) {
    const sx = x - camera
    if (sx > -50 && sx < W + 50) {
      if (stage === 2) woodland(sx)
      else lollipop(sx, FLOOR - 2, x % 780 === 280 ? '#f3a1ba' : '#9ad8c2')
    }
  }
  if (stage === 3) drawClockScenery()
  else if (stage === 4) drawOceanScenery()
  else {
    shop()
    for (const p of platforms)
      if (p.x + p.w > camera && p.x < camera + W) platform(p)
    ground()
  }
  if (stage === 2) drawHazards()
  drawTreasure()
  for (const e of enemies) {
    if (bossIntro?.boss === e) {
      ctx.save()
      const reveal = clamp((bossIntro.elapsed - 0.1) / 0.7, 0, 1)
      ctx.globalAlpha = reveal
      ctx.translate(0, (e.bossKind === 'nuonu' ? 25 : -35) * (1 - reveal))
      monster(e)
      ctx.restore()
    } else monster(e)
  }
  for (const d of drops) {
    const x = d.x - camera
    if (x < -40 || x > W + 40) continue
    const y = d.y + Math.sin(d.phase) * 4
    if (d.kind === 'potion' && assets.potion) {
      const f = assets.potion[0],
        height = 49,
        width = (height * f.w) / f.h
      ellipse(x, y, 24, 28, '#c9ffb32a')
      star(x - 23, y + 4, 4, '#e6ffc5', time)
      ctx.drawImage(
        f.img,
        f.x,
        f.y,
        f.w,
        f.h,
        x - width / 2,
        y - height / 2,
        width,
        height,
      )
    } else if (
      d.kind === 'ocean-energy' ||
      d.kind === 'ocean-health' ||
      d.kind === 'claude-relic'
    ) {
      drawOceanSupply(d, x, y)
    } else drawCollectible(d.kind, x, y)
  }
  drawWard()
  drawPlayer()
  drawHealing()
  drawWard(true)
  if (stage !== 4) drawCakeSlash()
  if (player.muzzle > 0) {
    const mx = player.x - camera + player.face * 43,
      my = player.y - 62,
      t = player.muzzle / 0.11
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    ellipse(mx, my, 27 * t + 7, 20 * t + 5, '#ffc4c447')
    star(mx, my, 25 * t + 8, '#ffd077', player.face * 0.4)
    star(mx, my, 14 * t + 4, '#fffce6', -0.2)
    ctx.restore()
  }
  for (const b of bullets) {
    const x = b.x - camera
    if (b.oceanWave) {
      drawOceanWave(b)
      continue
    }
    if (b.deepLaser) {
      drawDeepClaudeLaser(b)
      continue
    }
    if (b.oceanWaterball) {
      drawOceanWaterball(b)
      continue
    }
    if (b.enemy) {
      if (b.claudeLaser) {
        drawClaudeLaser(b)
        continue
      }
      if (b.claudeBarrage) {
        drawClaudeBarrage(b)
        continue
      }
      if (b.oceanShot) {
        drawOceanEnemyShot(b)
        continue
      }
      if (b.queenSword) {
        drawQueenSwords(b)
        continue
      }
      if (b.royalWave) {
        drawRoyalWave(b)
      } else if (b.kurumiShot || b.sparkShot) {
        drawBossProjectile(b)
      } else if (b.clockBolt) {
        drawClockProjectile(b)
      } else if (b.mobShot) {
        drawMobProjectile(b)
      } else if (b.nuonuPhase) {
        drawNuonuProjectile(b)
      } else if (b.shock) {
        ellipse(x, b.y + 7, 28, 9, '#d0bd6c55')
        ctx.save()
        ctx.translate(x, b.y)
        if (b.vx < 0) ctx.scale(-1, 1)
        ctx.fillStyle = '#c6c779'
        ctx.beginPath()
        ctx.moveTo(-22, 12)
        ctx.lineTo(-7, -5)
        ctx.lineTo(6, -16)
        ctx.lineTo(17, 11)
        ctx.fill()
        rect(-15, 4, 20, 4, '#e5e7a7')
        rect(-8, -7, 6, 10, '#778e4d')
        ctx.restore()
      } else if (b.seed) {
        for (const point of b.trail || [])
          ellipse(point.x - camera, point.y, 3, 3, '#d6e68928')
        ellipse(x, b.y, 14, 12, '#d8ed8d2b')
        ellipse(x, b.y, 8, 7, '#385529')
        ellipse(x - 1, b.y - 1, 6, 5, '#bdcf73')
        rect(x - 2, b.y - 4, 3, 3, '#f3efb3')
      } else if (b.leaf) {
        const trail = b.trail || []
        for (let i = 0; i < trail.length; i++)
          ellipse(trail[i].x - camera, trail[i].y, 4, 3, '#b2e57725')
        ctx.save()
        ctx.translate(x, b.y)
        ctx.rotate(Math.atan2(b.vy, b.vx))
        ctx.fillStyle = '#4b6635'
        ctx.beginPath()
        ctx.moveTo(-15, 0)
        ctx.quadraticCurveTo(0, -16, 15, 0)
        ctx.quadraticCurveTo(0, 16, -15, 0)
        ctx.fill()
        ctx.fillStyle = '#b6de78'
        ctx.beginPath()
        ctx.moveTo(-11, 0)
        ctx.quadraticCurveTo(1, -10, 13, 0)
        ctx.quadraticCurveTo(0, 9, -11, 0)
        ctx.fill()
        rect(-10, -1, 20, 2, '#eef6b0')
        ctx.restore()
      } else if (b.heart) {
        ellipse(x, b.y, 16, 13, '#ff8eb52b')
        ctx.fillStyle = '#ff8bab'
        ctx.strokeStyle = '#833549'
        ctx.lineWidth = 2
        ctx.font = 'bold 25px serif'
        ctx.textAlign = 'center'
        ctx.strokeText('♥', x, b.y + 8)
        ctx.fillText('♥', x, b.y + 8)
        star(x - 4, b.y - 4, 3, '#fff8e3')
      } else {
        ellipse(x, b.y, 9, 7, '#704351')
        ellipse(x - 2, b.y - 2, 6, 4, '#ed99bd')
      }
    } else if (b.wand) {
      drawWandShot(b)
    } else {
      const trail = b.trail || []
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      for (let i = 0; i < trail.length; i++) {
        const p = trail[i],
          ratio = (i + 1) / trail.length
        ctx.globalAlpha = ratio * 0.6
        ellipse(
          p.x - camera,
          p.y,
          (b.power ? 12 : 7) * ratio,
          (b.power ? 8 : 4) * ratio,
          b.power ? '#ff92d8' : '#ffc977',
        )
      }
      ctx.globalAlpha = 1
      ellipse(
        x,
        b.y,
        b.power ? 27 : 17,
        b.power ? 20 : 12,
        b.power ? '#ff95d133' : '#ffed9433',
      )
      ctx.restore()
      rect(
        x - Math.sign(b.vx) * 24,
        b.y - 2,
        22,
        4,
        b.power ? '#ffb3df88' : '#ffffbb88',
      )
      star(
        x,
        b.y,
        b.power ? 16 : 10,
        b.power ? '#ff9fd7' : '#fff1a3',
        time * 14,
      )
      star(x, b.y, b.power ? 8 : 5, '#fffbe7', time * 14)
    }
  }
  for (const p of particles) {
    ctx.globalAlpha = clamp(p.life / 0.4, 0, 1)
    if (p.shape === 0) star(p.x - camera, p.y, p.size, p.color, time * p.spin)
    else if (p.shape === 3) {
      ctx.save()
      ctx.translate(p.x - camera, p.y)
      ctx.rotate(time * p.spin)
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.moveTo(-p.size, 0)
      ctx.quadraticCurveTo(0, -p.size * 1.1, p.size, 0)
      ctx.quadraticCurveTo(0, p.size, -p.size, 0)
      ctx.fill()
      rect(-p.size * 0.6, -1, p.size * 1.2, 1, '#e4efb9')
      ctx.restore()
    } else if (p.shape === 4) {
      ellipse(p.x - camera, p.y, p.size * 1.5, p.size * 1.5, '#d6e7a325')
      ellipse(p.x - camera, p.y, p.size * 0.55, p.size * 0.55, p.color)
    } else {
      ctx.save()
      ctx.translate(p.x - camera, p.y)
      ctx.rotate(time * p.spin)
      rect(
        -p.size / 2,
        -p.size / 2,
        p.size,
        p.shape === 1 ? p.size / 2 : p.size,
        p.color,
      )
      ctx.restore()
    }
  }
  ctx.globalAlpha = 1
  for (const impact of impacts) {
    const age = 1 - impact.life / impact.max,
      x = impact.x - camera,
      y = impact.y,
      r = impact.radius * (0.2 + age * 0.8)
    ctx.save()
    ctx.globalAlpha = (1 - age) ** 1.5
    ctx.strokeStyle = impact.color
    ctx.lineWidth = 5 * (1 - age) + 1
    ctx.beginPath()
    ctx.ellipse(x, y, r, r * 0.75, 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.globalCompositeOperation = 'lighter'
    if (age < 0.4)
      star(x, y, impact.radius * 0.55 * (1 - age * 2), '#fffce8', age * 2)
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4 + age * 0.35
      star(
        x + Math.cos(a) * r,
        y + Math.sin(a) * r * 0.75,
        (1 - age) * 8,
        impact.color,
        a,
      )
    }
    ctx.restore()
  }
  ctx.font = 'bold 18px monospace'
  ctx.textAlign = 'center'
  for (const f of floaters) {
    ctx.globalAlpha = f.life
    ctx.fillStyle = '#fff2b9'
    ctx.strokeStyle = '#7b4662'
    ctx.lineWidth = 3
    ctx.strokeText(f.text, f.x - camera, f.y)
    ctx.fillText(f.text, f.x - camera, f.y)
  }
  ctx.globalAlpha = 1
  ctx.restore()
  drawBossBars()
  drawClockScreenEffects()
  drawBossIntro()
  drawPortalUnseal()
  if (stage === 4) drawOceanKeyInventory()
}
function frame(now) {
  const elapsed = Math.max(0, (now - last) / 1000)
  // A frozen world needs no physics catch-up. Let its clock use real elapsed
  // time like entrances, keeping the spoken call aligned at lower frame rates.
  const dt =
    mode === 'boss-intro' || (mode === 'playing' && timeStop)
      ? elapsed
      : Math.min(elapsed, 0.033)
  last = now
  if (mode === 'playing' || mode === 'boss-intro') update(dt)
  else if (mode === 'ready') {
    time += dt
  }
  syncStageMusic()
  draw()
  requestAnimationFrame(frame)
}

function press(code, repeat = false) {
  if (code === 'KeyP' || code === 'Escape') {
    if (!repeat) pause()
    return
  }
  if (mode === 'boss-intro') {
    if (!repeat && (code === 'Space' || code === 'Enter')) skipBossIntro()
    return
  }
  if (code === 'Enter' && mode !== 'playing') {
    start()
    return
  }
  if (mode !== 'playing') return
  if (timeStop) return
  if (clockJourney?.portalTransition) return
  if (code === 'KeyM' && stage === 3 && !repeat) {
    clockJourney.mapOpen = !clockJourney.mapOpen
    updateHud()
    return
  }
  if (stage === 3 && clockJourney.mapOpen) return
  if (stage === 4 && code === 'KeyL' && oceanJourney?.relicCollected) {
    if (!repeat) requestOceanForm()
    return
  }
  keys.add(code)
  if (
    (code === 'ShiftLeft' || code === 'ShiftRight' || code === 'KeyL') &&
    !repeat
  )
    roll()
  if (code === 'KeyS' && !repeat) {
    if (keys.has('KeyJ')) startDownSlam()
    if (keys.has('Space')) dropThroughPlatform()
  }
  if (code === 'KeyJ' && !repeat) attackCake()
  if (code === 'KeyK' && !repeat) special()
  if (code === 'KeyE' && !repeat)
    stage === 4
      ? interactOceanPortal()
      : stage === 3
        ? interactClock()
        : openChest()
  if (code === 'KeyQ' && !repeat) drinkPotion()
  if ((code === 'Space' || code === 'KeyW' || code === 'ArrowUp') && !repeat)
    if (code !== 'Space' || !keys.has('KeyS') || !dropThroughPlatform()) {
      if (!player.slam) player.jumpBuffer = 0.15
    }
}
const gameKeys = [
  'KeyS',
  'KeyM',
  'KeyA',
  'KeyD',
  'KeyW',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'Space',
  'KeyJ',
  'KeyK',
  'KeyE',
  'KeyQ',
  'ShiftLeft',
  'ShiftRight',
  'KeyL',
  'KeyP',
  'Escape',
  'Enter',
]
window.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey || !gameKeys.includes(e.code)) return
  // Leave native activation intact when an actual button owns keyboard focus.
  if (
    e.target instanceof HTMLButtonElement &&
    (e.code === 'Space' || e.code === 'Enter')
  )
    return
  e.preventDefault()
  press(e.code, e.repeat)
})
window.addEventListener('keyup', (e) => {
  keys.delete(e.code)
})
window.addEventListener('blur', () => {
  keys.clear()
  if (mode === 'playing' || mode === 'boss-intro') pause()
})
document.addEventListener('visibilitychange', () => {
  if (document.hidden && (mode === 'playing' || mode === 'boss-intro')) pause()
})
$('start').addEventListener('click', start)
$('pause').addEventListener('click', pause)
$('restart').addEventListener('click', () => {
  if (mode === 'loading' || mode === 'error') return
  mode = 'ready'
  start()
})
function playStage(nextStage, bossOnly = false, angry = false) {
  if (mode === 'loading' || mode === 'error') return
  reset(nextStage)
  mode = 'paused'
  start()
  if (bossOnly) {
    if (stage === 3) {
      equipWand()
      player.weaponReveal = 0
      enterClockRoom('arena', { x: 300, y: FLOOR })
    }
    player.x = STAGES[stage].arena + 100
    camera = clamp(player.x - W * 0.32, 0, LENGTH - W)
    enemies = enemies.filter((e) => e.type === 3)
    chests = []
    enemies[0].active = true
    if (angry) {
      enemies[0].phaseLevel = 2
      enemies[0].hp = enemies[0].maxHp / 2
    }
    drops = []
    hazards = []
    beginBossIntro(enemies[0])
  } else
    toast(
      `STAGE 0${stage} · ${STAGES[stage].name}${stage === 2 ? ' · 小心荆棘与孢子！' : '，出发！'}`,
    )
  $('start-hint').textContent = '键盘 / 触屏均可游玩'
  $('boss-status').setAttribute('data-phase', angry ? '2' : '1')
  updateHud()
}
$('stage-one').addEventListener('click', () => playStage(1))
$('stage-two').addEventListener('click', () => playStage(2))
$('stage-three').addEventListener('click', () => playStage(3))
$('stage-four').addEventListener('click', () => playStage(4))
$('claude-practice').addEventListener('click', () => {
  playStage(4)
  enterOceanArena()
  updateHud()
})
$('kurumi-practice').addEventListener('click', () => playStage(3, true))
$('time-stop-practice').addEventListener('click', () => {
  playStage(3, true)
  finishBossIntro()
  const boss = enemies[0]
  boss.pattern = 1
  setBossState(boss, 'stop-windup')
  player.inv = 3
  toast('刻刻帝 · 时停即将发动，P 可暂停查看巨钟')
})
$('royal-phase2').addEventListener('click', () => {
  playStage(3, true)
  finishBossIntro()
  hitEnemy(enemies[0], enemies[0].maxHp / 2)
})
$('portal-practice').addEventListener('click', () => {
  playStage(3)
  clockJourney.key = true
  clockJourney.unlocked = true
  enterClockRoom('bridge', { x: 1580, y: FLOOR })
  enemies = []
  toast('红色时钟门 · E 进入双王庭，P 暂停查看动画')
  updateHud()
})
$('seal-practice').addEventListener('click', () => {
  playStage(3)
  clockJourney.key = true
  enterClockRoom('entry', { x: 550, y: 325 })
  toast('钟心钥匙在手 · E 解开锁链，观看传送门开启')
  updateHud()
})
$('wand-practice').addEventListener('click', () => {
  playStage(3)
  const chest = chests[0]
  player.x = chest.x - 85
  player.y = chest.y
  player.vy = 0
  player.ground = true
  toast('时钟宝箱 · E 获得新武器，再按 J 试射糖果魔法')
  updateHud()
})
$('clock-map-toggle').addEventListener('click', () => {
  if (
    stage !== 3 ||
    timeStop ||
    mode === 'boss-intro' ||
    clockJourney.portalTransition
  )
    return
  clockJourney.mapOpen = !clockJourney.mapOpen
  updateHud()
})
$('boss-practice').addEventListener('click', () => playStage(1, true))
$('nuonu-practice').addEventListener('click', () => playStage(2, true))
$('nuonu-phase2').addEventListener('click', () => playStage(2, true, true))
$('treasure-practice').addEventListener('click', () => {
  playStage(2)
  const chest = chests[0]
  player.x = chest.x - 50
  player.y = chest.y
  player.vy = 0
  player.ground = true
  camera = clamp(player.x - W * 0.35, 0, LENGTH - W)
  toast('高台宝箱 · E 开箱，拾取药水后 Q 体验森灵守护')
  updateHud()
})
$('skip-boss-intro').addEventListener('click', skipBossIntro)
$('sound').addEventListener('click', () => {
  soundOn = !soundOn
  if (soundOn) {
    unlockAudio()
    tone(750, 0.12, 'triangle')
  }
  if (master) master.gain.setValueAtTime(soundOn ? 0.65 : 0, audio.currentTime)
  if (!soundOn) stopEntranceMusic()
  else if (mode === 'boss-intro')
    playEntranceMusic(bossIntro.boss.bossKind, bossIntro.elapsed)
  syncStageMusic()
  syncSoundButton()
})
$('fullscreen').addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen()
    else await document.querySelector('.cabinet').requestFullscreen()
  } catch {
    toast('当前浏览器暂不支持全屏')
  }
})
document.querySelectorAll('[data-key]').forEach((button) => {
  const code = button.dataset.key
  button.addEventListener('pointerdown', (e) => {
    e.preventDefault()
    button.setPointerCapture(e.pointerId)
    press(code)
  })
  const release = () => keys.delete(code)
  button.addEventListener('pointerup', release)
  button.addEventListener('pointercancel', release)
  button.addEventListener('lostpointercapture', release)
})

async function boot() {
  reset()
  loadSoundLibrary()
  requestAnimationFrame(frame)
  try {
    const [
      run,
      attack,
      specialSheet,
      background,
      monsters,
      rollSheet,
      jumpSheet,
      bossSheet,
      forest,
      nuonu,
      nuonuPhase2,
      plants,
      chestClosed,
      chestOpen,
      potion,
      kurumi,
      queen,
      clockCourt,
      clockEnemies,
      candyPickup,
      healthPickup,
      clockPortal,
      bossPortal,
      bossPortalSheet,
      candyWand,
      wandAttack,
      wandShot,
      wandRun,
      clockChestClosed,
      clockChestOpen,
      sparkClockEffect,
      sparkSlashEffect,
      kurumiShotEffect,
      queenSlashArt,
      queenSwordSheet,
      clockKey,
      clockKnightSlash,
      clockGhostSpear,
      clockMothOrb,
      nuonuThorns,
      nuonuTornado,
      cakeSlash,
      wandRoll,
      sealedPortal,
      portalUnseal,
      castleStep,
      forestStep,
      clockStep,
      castleMobShot,
      forestMobShot,
      clockBlueShot,
      timeStopClock,
      forestThorns,
      forestPoison,
      hpSpark,
      hpNuonu,
      hpKurumi,
      hpQueen,
      goalCastle,
      goalForest,
      goalClock,
      cakeDownSlam,
      wandDownSlam,
      healEffect,
      healthPickupSheet,
      sweetMacaron,
      sweetPudding,
      forestVineAttack,
      mushroomShotEffect,
      aliceWalkVideo,
    ] = await Promise.all(
      [
        'run-v2.png',
        'attack.png',
        'special.png',
        'kingdom.png',
        'monsters-v2.png',
        'roll.png',
        'jump.png',
        'boss-spark.png',
        'forest-no-mushrooms.png',
        'boss-nuonu.png',
        'boss-nuonu-phase2.png',
        'plants.png',
        'chest-closed.png',
        'chest-open.png',
        'magic-potion.png',
        'boss-kurumi.png',
        'queen-violet-sheet.png',
        'clock-court.png',
        'clock-enemies.png',
        'candy-pickup.png',
        'health-pickup.png',
        'clock-portal.png',
        'boss-portal.png',
        'boss-portal-sheet.png',
        'candy-wand.png',
        'wand-attack.png',
        'wand-shot.png',
        'wand-run.png',
        'clock-chest-closed.png',
        'clock-chest-open.png',
        'spark-clock-effect.png',
        'spark-slash-effect.png',
        'kurumi-shot-effect.png',
        'queen-violet-slash-static.png',
        'queen-ground-swords.png',
        'clock-key.png',
        'clock-knight-slash.png',
        'clock-ghost-spear.png',
        'clock-moth-orb.png',
        'nuonu-thorns-effect.png',
        'nuonu-tornado-sheet.png',
        'cake-slash-effect.png',
        'wand-roll.png',
        'sealed-portal.png',
        'portal-unseal-sheet.png',
        'platform-castle.png',
        'platform-forest.png',
        'platform-clock.png',
        'castle-mob-shot.png',
        'forest-mob-shot.png',
        'clock-blue-shot.png',
        'zafkiel-time-stop-sheet.png',
        'forest-thorns-sheet.png',
        'forest-poison-sheet.png',
        'hp-frame-spark.png',
        'hp-frame-nuonu.png',
        'hp-frame-kurumi.png',
        'hp-frame-queen.png',
        'goal-castle-sheet.png',
        'goal-forest-sheet.png',
        'goal-clock-sheet.png',
        'cake-down-slam.png',
        'wand-down-slam.png',
        'heal-effect-sheet.png',
        'health-pickup-sheet.png',
        'sweet-macaron-attack.png',
        'sweet-pudding-attack.png',
        'forest-vine-attack.png',
        'mushroom-shot-effect.png',
        'alice-walk-video.png',
      ].map((src) => image(`./assets/${src}`)),
    )
    assets.run = spriteFrames(
      run,
      4,
      2,
      false,
      null,
      null,
      true,
      CAKE_WALK_LEG_GAPS,
    )
    const referenceWalk = spriteFrames(aliceWalkVideo, 8, 7, false)
    referenceWalk.forEach((frame) => {
      frame.anchor = 220
      frame.bottom = 364
    })
    assets.aliceWalk = referenceWalk
    assets.aliceWalk.height = 360
    assets.attack = spriteFrames(
      attack,
      4,
      2,
      true,
      null,
      null,
      true,
      CAKE_STAND_LEG_GAPS,
    )
    assets.special = spriteFrames(
      specialSheet,
      4,
      4,
      false,
      [0, 314, 627, 941, 1254],
      [0, 320, 638, 942, 1254],
      true,
    )
    assets.chestClosed = spriteFrames(chestClosed, 1, 1, false)
    assets.castleMobShot = spriteFrames(castleMobShot, 1, 1, 'effect')
    assets.forestMobShot = spriteFrames(forestMobShot, 1, 1, 'effect')
    assets.clockBlueShot = spriteFrames(clockBlueShot, 1, 1, 'effect')
    assets.timeStopClock = spriteFrames(timeStopClock, 4, 2, 'effect')
    assets.forestThorns = spriteFrames(forestThorns, 4, 2, 'effect')
    assets.forestPoison = spriteFrames(forestPoison, 4, 2, 'effect')
    assets.goalPortals = {
      1: spriteFrames(goalCastle, 4, 2, 'effect'),
      2: spriteFrames(goalForest, 4, 2, 'effect'),
      3: spriteFrames(goalClock, 4, 2, 'effect'),
    }
    assets.bossHealthFrames = {
      spark: spriteFrames(hpSpark, 1, 1, 'effect'),
      nuonu: spriteFrames(hpNuonu, 1, 1, 'effect'),
      kurumi: spriteFrames(hpKurumi, 1, 1, 'effect'),
      queen: spriteFrames(hpQueen, 1, 1, 'effect'),
    }
    // Register the actual walking surface, independently of the crown, ivy
    // and pendants above/below it. Physics continues to use the original p.y.
    assets.platformTiles = {
      1: { frame: spriteFrames(castleStep, 1, 1, 'effect')[0], surface: 302 },
      2: { frame: spriteFrames(forestStep, 1, 1, 'effect')[0], surface: 330 },
      3: { frame: spriteFrames(clockStep, 1, 1, 'dark')[0], surface: 267 },
    }
    assets.chestOpen = spriteFrames(chestOpen, 1, 1, false)
    assets.potion = spriteFrames(potion, 1, 1, false)
    assets.candyPickup = spriteFrames(candyPickup, 1, 1, false)
    assets.healthPickup = spriteFrames(healthPickupSheet, 4, 2, 'effect')
    assets.healEffect = spriteFrames(healEffect, 4, 2, 'effect')
    assets.cakeDownSlam = spriteFrames(cakeDownSlam, 4, 4, 'effect', null, [
      [0, 322, 638, 929, 1254],
      [0, 322, 638, 931, 1254],
      [0, 322, 655, 929, 1254],
      [0, 333, 658, 926, 1254],
    ])
    // Some wide sweeps overlap their neighbours; use the intact poses only.
    assets.wandDownSlam = spriteFrames(
      wandDownSlam,
      4,
      4,
      'effect',
      [
        [0, 306, 635, 943, 1254],
        [0, 334, 646, 944, 1254],
        [0, 350, 664, 970, 1254],
        [0, 320, 629, 947, 1254],
      ],
      [
        [0, 342, 674, 952, 1254],
        [0, 341, 672, 953, 1254],
        [0, 343, 678, 953, 1254],
        [0, 345, 689, 953, 1254],
      ],
    )
    assets.cakeDownSlam.bodyHeight = assets.cakeDownSlam[15].h
    assets.wandDownSlam.bodyHeight = assets.wandDownSlam[15].h
    assets.candyWand = spriteFrames(candyWand, 1, 1, false)
    assets.wandAttack = spriteFrames(
      wandAttack,
      4,
      4,
      false,
      [0, 314, 627, 941, 1254],
      [0, 340, 645, 932, 1254],
      true,
    )
    assets.wandAttack.bodyHeight = 264
    // Register the body using the boots, independently of the large baked magic.
    const wandAnchors = [
      157, 163, 167, 192, 116, 189, 122, 161, 160, 155, 141, 173, 173, 177, 184,
      174,
    ]
    assets.wandAttack.forEach((f, i) => {
      f.anchor = wandAnchors[i]
    })
    assets.wandShot = spriteFrames(wandShot, 1, 1, false)
    assets.wandRun = spriteFrames(
      wandRun,
      4,
      2,
      false,
      [0, 402, 787, 1166, 1536],
      null,
      true,
    )
    assets.wandRoll = spriteFrames(
      wandRoll,
      4,
      2,
      'beige',
      [0, 443, 887, 1330, 1774],
      [0, 443, 887],
      true,
    )
    // The sheet itself contains the tumble. Keep one standing-body scale and
    // register each pose at its body center and floor, without extra rotation.
    assets.wandRoll.bodyHeight = assets.wandRoll[0].h
    const rollAnchors = [245, 251, 249, 261, 215, 247, 241, 251]
    assets.wandRoll.forEach((f, i) => {
      f.anchor = rollAnchors[i]
    })
    assets.clockChestClosed = spriteFrames(clockChestClosed, 1, 1, false)
    assets.clockChestOpen = spriteFrames(clockChestOpen, 1, 1, 'checker')
    assets.sparkClockEffect = spriteFrames(sparkClockEffect, 1, 1, false)
    assets.sparkSlashEffect = spriteFrames(sparkSlashEffect, 1, 1, false)
    assets.kurumiShotEffect = spriteFrames(kurumiShotEffect, 1, 1, false)
    assets.queenSlash = queenSlashFrames(queenSlashArt)
    assets.queenSwords = queenSwordFrames(queenSwordSheet)
    assets.clockKey = spriteFrames(clockKey, 1, 1, false)
    assets.clockKnightSlash = spriteFrames(clockKnightSlash, 1, 1, false)
    assets.clockGhostSpear = spriteFrames(clockGhostSpear, 1, 1, false)
    assets.clockMothOrb = spriteFrames(clockMothOrb, 1, 1, false)
    assets.nuonuThorns = spriteFrames(nuonuThorns, 1, 1, false)
    assets.nuonuTornado = spriteFrames(nuonuTornado, 4, 4, 'effect')
    assets.cakeSlash = spriteFrames(cakeSlash, 1, 1, false)
    assets.clockPortal = spriteFrames(clockPortal, 1, 1, false)
    assets.sealedPortal = spriteFrames(sealedPortal, 1, 1, false)
    assets.portalUnseal = spriteFrames(
      portalUnseal,
      4,
      2,
      'effect',
      [0, 443, 887, 1330, 1774],
      [0, 443, 887],
    )
    assets.portalUnseal.baseline = Math.max(
      ...assets.portalUnseal.map((f) => f.bottom),
    )
    assets.bossPortal = spriteFrames(bossPortal, 1, 1, false)
    assets.bossPortalFrames = spriteFrames(
      bossPortalSheet,
      4,
      4,
      false,
      [0, 314, 627, 941, 1254],
      [0, 313, 627, 941, 1254],
    )
    // Align every pose to the same cell origin, scale and stone-step baseline.
    assets.bossPortalFrames.baseline = Math.max(
      ...assets.bossPortalFrames.map((f) => f.bottom),
    )
    assets.kurumi = spriteFrames(
      kurumi,
      4,
      4,
      false,
      null,
      [0, 328, 633, 933, 1254],
    )
    assets.queen = queenBodyFrames(queen)
    assets.clockCourt = clockCourt
    assets.clockEnemies = clockEnemyFrames(clockEnemies)
    assets.background = background
    assets.forest = forest
    // Plant poses have different gaps and a wide thorn lash; avoid clipping roots.
    const plantColumns = [0, 570, 1024, 1536]
    assets.plants = spriteFrames(plants, 3, 3, false, plantColumns, [
      [0, 340, 674, 1024],
      [0, 350, 648, 1024],
      [0, 344, 670, 1024],
    ])
    const rootAnchors = [305, 764, 1345, 305, 838, 1322, 381, 824, 1401]
    assets.plants.forEach((frame, i) => {
      frame.anchor = rootAnchors[i] - plantColumns[i % 3]
    })
    // The shot uses a live projectile; omit the seed baked into the attack cell.
    const plantShot = assets.plants[8],
      end = plantShot.x + plantShot.w
    plantShot.x = Math.max(plantShot.x, 1155 - plantColumns[2])
    plantShot.w = end - plantShot.x
    assets.roll = spriteFrames(rollSheet, 4, 2, 'blue', null, null, true)
    // Match this sheet's gray-beige paper, not every beige clothing shade.
    // A broad hue key crossed skirt seams and erased the attached legs.
    assets.jump = spriteFrames(jumpSheet, 4, 2, 'jump-paper', null, null, true)
    assets.boss = spriteFrames(bossSheet, 4, 4, 'checker')
    // The supplied sheets use uneven row heights: cut inside actual alpha gaps.
    assets.nuonu = spriteFrames(
      nuonu,
      4,
      4,
      'nuonu',
      [0, 314, 627, 941, 1254],
      [0, 360, 650, 950, 1254],
    )
    assets.nuonuPhase2 = spriteFrames(
      nuonuPhase2,
      4,
      4,
      'nuonu',
      [0, 314, 627, 941, 1254],
      [0, 334, 635, 938, 1254],
    )
    // Generated poses slightly exceed uniform cells: cut at verified alpha gaps.
    assets.monsters = spriteFrames(
      monsters,
      4,
      2,
      false,
      [0, 398, 770, 1148, 1536],
    )
    // Verified cuts for the replacement sheets. Use intact poses 1/2/3/6/7;
    // the wide impact poses 4/5 overlap neighbouring artwork.
    assets.sweetMacaron = spriteFrames(
      sweetMacaron,
      4,
      2,
      'effect',
      [
        [0, 443, 883, 1305, 1774],
        [0, 550, 963, 1374, 1774],
      ],
      [0, 458, 887],
    )
    assets.sweetPudding = spriteFrames(
      sweetPudding,
      4,
      2,
      'effect',
      [
        [0, 443, 830, 1256, 1774],
        [0, 650, 1018, 1390, 1774],
      ],
      [0, 450, 887],
    )
    // Remove only the adjacent pose's pink trail at these verified cell margins.
    // The attacking fist/body is below or to the right of the cleared rectangles.
    assets.sweetMacaron[3].img.getContext('2d').clearRect(0, 0, 18, 270)
    assets.sweetMacaron[6].img.getContext('2d').clearRect(0, 0, 15, 220)
    const sweetRegistration = [
      [
        assets.sweetMacaron,
        [231, 224, 211, 246, 328, 209, 189, 194],
        [448, 444, 449, 440, 402, 397, 406, 411],
        [430, 381, 404, 422, 391, 391, 376, 408],
      ],
      [
        assets.sweetPudding,
        [232, 214, 295, 348, 494, 198, 174, 200],
        [427, 428, 432, 432, 354, 354, 355, 364],
        [353, 313, 340, 336, 290, 290, 315, 346],
      ],
    ]
    for (const [
      type,
      [frames, anchors, boots, bodyHeights],
    ] of sweetRegistration.entries()) {
      frames.bodyHeight = frames[0].h
      const walk = assets.monsters[type],
        alternate = assets.monsters[type + 4]
      frames.drawHeight = (83 * walk.h) / Math.max(walk.h, alternate.h)
      frames.forEach((f, i) => {
        f.anchor = anchors[i]
        f.bottom = boots[i]
        f.bodyHeight = bodyHeights[i]
        // Preserve anticipation/recovery crouches while correcting atlas size drift.
        f.poseHeight = i === 1 ? 0.9 : i === 6 ? 0.92 : 1
      })
    }
    // Select intact vine poses; the widest bottom-row impacts overlap neighbours.
    assets.forestVineAttack = spriteFrames(forestVineAttack, 4, 2, 'effect', [
      [0, 443, 847, 1260, 1774],
      [0, 520, 950, 1324, 1774],
    ])
    assets.forestVineAttack.bodyHeight = assets.forestVineAttack[0].h
    assets.forestVineAttack.forEach((f, i) => {
      f.anchor = [232, 219, 253, 194, 230, 160, 183, 230][i]
      f.bottom = [423, 424, 424, 424, 383, 382, 383, 383][i]
    })
    assets.mushroomShotEffect = spriteFrames(mushroomShotEffect, 1, 1, 'effect')
    await loadOceanAssets()
    mode = 'ready'
    $('start').disabled = false
    $('start').textContent = '开始冒险 →'
    for (const id of [
      'stage-one',
      'stage-two',
      'stage-three',
      'stage-four',
      'claude-practice',
      'kurumi-practice',
      'time-stop-practice',
      'royal-phase2',
      'portal-practice',
      'seal-practice',
      'wand-practice',
      'boss-practice',
      'nuonu-practice',
      'nuonu-phase2',
      'treasure-practice',
    ])
      $(id).disabled = false
  } catch (error) {
    mode = 'error'
    $('start').textContent = '素材加载失败'
    $('overlay-copy').textContent = '请刷新页面重新加载游戏素材。'
    console.error('Game asset load failed:', error)
  }
}
boot()
