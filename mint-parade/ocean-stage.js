/* Stage four: supplied ocean artwork and the whale heroine. */
const OCEAN_CAST_DURATION = 0.72
const DEEP_BLINK_DURATION = 0.56
const DEEP_BLINK_COOLDOWN = 10
const DEEP_BLINK_DISTANCE = 260
const OCEAN_CAST_RELEASE = 0.27
const OCEAN_ULTIMATE_DURATION = 0.64
const OCEAN_DRAIN_RELEASE = 0.2
const OCEAN_DRAIN_REACH = 115
const OCEAN_PORTAL_X = 4350
const OCEAN_CHEST_X = 2350
const OCEAN_UNSEAL_DURATION = 1.12
const CLAUDE_LASER_WINDUP = 1.2
const CLAUDE_LASER_SPEED = 370
const CLAUDE_LASER_RADIUS = 72
const CLAUDE_BODY_HEIGHT = 152
const CLAUDE_PORTAL_X = 1000
const CLAUDE_LEDGE_LEVELS = [418, 308]
const CLAUDE_BARRAGE_HEIGHTS = [474, 364, 254]
const OCEAN_SUPPLY_LIFETIME = 45
const OCEAN_MAP_SUPPLY_LIMIT = 6
let oceanSupplyTimer = 0
let oceanJourney = null
let oceanSkillCall = null

function isOceanArena() {
  return stage === 4 && oceanJourney?.room === 'arena'
}

function makeClaudeBoss() {
  return {
    x: 860,
    y: FLOOR,
    homeX: 860,
    homeY: FLOOR,
    hp: 72,
    maxHp: 72,
    type: 3,
    bossKind: 'claude',
    family: 'floral',
    bodyWidth: 39,
    bodyHeight: CLAUDE_BODY_HEIGHT,
    active: true,
    introDone: false,
    face: -1,
    phase: 0,
    hit: 0,
    state: 'idle',
    stateTime: 0,
    fired: false,
    phaseLevel: 1,
    barrageTimer: 0.75,
    barrageCount: 0,
    awakeningAge: 0,
  }
}

function enterOceanArena() {
  if (isOceanArena()) return
  stopOceanSkillCall()
  clearBossIntro()
  oceanJourney.room = 'arena'
  oceanJourney.hasKey = false
  oceanJourney.portal = 'open'
  oceanJourney.arenaCleared = false
  oceanJourney.arenaPortalAge = 0
  oceanJourney.relicCollected = false
  LENGTH = W
  platforms = [
    { x: 150, y: CLAUDE_LEDGE_LEVELS[0], w: 230 },
    { x: 720, y: CLAUDE_LEDGE_LEVELS[0], w: 230 },
    { x: 315, y: CLAUDE_LEDGE_LEVELS[1], w: 220 },
    { x: 565, y: CLAUDE_LEDGE_LEVELS[1], w: 220 },
  ]
  hazards = []
  chests = []
  drops = []
  oceanSupplyTimer = 0
  bullets = []
  vines = []
  particles = []
  impacts = []
  floaters = []
  camera = cameraY = shake = 0
  keys.clear()
  Object.assign(player, {
    x: 180,
    y: FLOOR,
    vx: 0,
    vy: 0,
    face: 1,
    ground: true,
    roll: 0,
    rollCooldown: 0,
    attack: 0,
    meleeCooldown: 0,
    oceanPending: false,
    deepFormTime: 0,
    deepFormUsed: false,
    deepBlink: null,
    deepBlinkCooldown: 0,
    oceanUltimate: 0,
    oceanDrainTargets: [],
    jumpBuffer: 0,
    jumpAge: 0,
    landing: 0,
    slam: null,
    dropPlatform: null,
    heal: 0,
    oceanIdleWait: 0,
    oceanFidget: false,
    oceanFidgetAge: 0,
  })
  stageCheckpoint = { score, sweets, kills }
  enemies = [makeClaudeBoss()]
  mode = 'playing'
  $('overlay').hidden = true
  $('pause').disabled = false
  beginBossIntro(enemies[0])
}

function beginClaudeLaserCharge(e) {
  e.state = 'laser-charge'
  e.stateTime = 0
  e.fired = false
  e.face = Math.sign(player.x - e.x) || e.face
  e.laserFace = e.face
  toast('花光激柱 · 即将横推，翻滚穿过！')
}

function updateClaudeBoss(e, dt) {
  if (e.hp <= e.maxHp / 2 && e.phaseLevel !== 2) {
    e.phaseLevel = 2
    e.awakeningAge = 0
    e.barrageTimer = 1.2
    e.barrageCount = 0
    toast('第二阶段 · 封号弹幕！利用两层台阶换高度，光柱仍需翻滚')
    shake = reducedMotion ? 0 : 6
  }
  if (e.phaseLevel === 2) {
    e.awakeningAge += dt
    e.barrageTimer -= dt
    if (e.barrageTimer <= 0) {
      spawnClaudeBarrage(e)
      e.barrageTimer += random(1.6, 2.2)
    }
  }
  e.phase += dt
  e.hit = Math.max(0, e.hit - dt)
  e.stateTime += dt
  if (e.state === 'idle') {
    e.face = Math.sign(player.x - e.x) || e.face
    // Drift toward a casting distance, without touch damage or dash attacks.
    const gap = Math.abs(player.x - e.x)
    if (gap > 220) e.x = clamp(e.x + e.face * 58 * dt, 160, W - 160)
    if (e.stateTime >= 1.4) {
      beginClaudeLaserCharge(e)
    }
  } else if (e.state === 'laser-charge' && e.stateTime >= CLAUDE_LASER_WINDUP) {
    e.state = 'laser-cast'
    e.stateTime = 0
    e.fired = true
    bullets.push({
      x: e.x + e.laserFace * 95,
      y: FLOOR,
      vx: e.laserFace * CLAUDE_LASER_SPEED,
      vy: 0,
      life: 3.2,
      age: 0,
      enemy: true,
      claudeLaser: true,
      owner: e,
      radius: CLAUDE_LASER_RADIUS,
      hitPlayer: false,
      trail: [],
    })
    shake = 5
    beginBossCall('claude-laser-call', e)
    if (!soundBuffers['claude-laser-call'])
      voice(220, 800, 0.25, 'sawtooth', 0.035)
  } else if (e.state === 'laser-cast' && e.stateTime >= 0.44) {
    e.state = 'recover'
    e.stateTime = 0
  } else if (e.state === 'recover' && e.stateTime >= 1.1) {
    e.state = 'idle'
    e.stateTime = 0
  }
}

function spawnClaudeBarrage(e) {
  // Stagger lanes rather than launching three simultaneous walls.
  if (e.barrageLane === undefined) e.barrageLane = Math.floor(random(0, 3))
  const lane = e.barrageLane
  e.barrageLane = (lane + 1 + (Math.random() < 0.2 ? 1 : 0)) % 3
  const face = Math.random() < 0.5 ? 1 : -1
  const art = Math.floor(random(0, 5))
  const width = art === 4 ? 360 : random(260, 330)
  const frame = assets.claudeBarrage?.[art]
  bullets.push({
    x: face > 0 ? -width / 2 - 30 : W + width / 2 + 30,
    y: CLAUDE_BARRAGE_HEIGHTS[lane],
    vx: face * random(240, 310),
    vy: 0,
    life: 7,
    age: 0,
    enemy: true,
    claudeBarrage: true,
    owner: e,
    lane,
    art,
    width,
    height: frame ? (width * frame.h) / frame.w : 52,
    hitPlayer: false,
  })
  e.barrageCount++
}

function updateClaudeBarrage(b, previousX) {
  if (
    !b.hitPlayer &&
    player.roll <= 0 &&
    Math.max(previousX, b.x) + b.width / 2 > player.x - 18 &&
    Math.min(previousX, b.x) - b.width / 2 < player.x + 18 &&
    b.y + b.height / 2 > player.y - 108 &&
    b.y - b.height / 2 < player.y - 6
  ) {
    const hpBefore = player.hp
    hurt()
    b.hitPlayer = player.hp < hpBefore
  }
  if (b.x + b.width / 2 < -40 || b.x - b.width / 2 > W + 40) b.life = 0
}

function drawClaudeBarrage(b) {
  const f = assets.claudeBarrage?.[b.art]
  if (!f) return
  const height = (b.width * f.h) / f.w
  ctx.drawImage(
    f.img,
    f.x,
    f.y,
    f.w,
    f.h,
    b.x - b.width / 2,
    b.y - height / 2,
    b.width,
    height,
  )
}

function drawClaudeShadow(e) {
  if (e.phaseLevel !== 2 || !assets.claudeShadow) return
  const height = 430,
    width = (height * assets.claudeShadow.width) / assets.claudeShadow.height
  ctx.save()
  ctx.globalAlpha = Math.min(1, e.awakeningAge / 0.6)
  ctx.drawImage(
    assets.claudeShadow,
    e.x - width / 2,
    FLOOR - height,
    width,
    height,
  )
  ctx.restore()
}

function updateWhaleIdle(dt) {
  const still =
    keys.size === 0 &&
    player.ground &&
    Math.abs(player.vx) < 1 &&
    player.attack <= 0 &&
    player.oceanUltimate <= 0 &&
    player.roll <= 0 &&
    !player.deepBlink &&
    !player.slam
  if (!still) {
    player.oceanIdleWait = 0
    player.oceanFidgetAge = 0
    player.oceanFidget = false
    player.oceanIdleDelay = random(4.5, 7)
    return
  }
  player.oceanIdleWait = (player.oceanIdleWait ?? 0) + dt
  if (
    !player.oceanFidget &&
    player.oceanIdleWait >= (player.oceanIdleDelay ?? 5)
  ) {
    player.oceanFidget = true
    player.oceanFidgetAge = 0
  }
  if (player.oceanFidget) {
    player.oceanFidgetAge += dt
    if (player.oceanFidgetAge >= 1.2) {
      player.oceanFidget = false
      player.oceanIdleWait = 0
      player.oceanIdleDelay = random(5, 8)
    }
  }
}

function claudePose(e) {
  if (e.state === 'laser-charge')
    return Math.min(7, Math.floor((e.stateTime / CLAUDE_LASER_WINDUP) * 8))
  if (e.state === 'laser-cast')
    return 8 + Math.min(3, Math.floor((e.stateTime / 0.44) * 4))
  if (e.state === 'recover')
    return 12 + Math.min(3, Math.floor((e.stateTime / 1.1) * 4))
  return -1
}

function drawClaudeBoss(e, x, y) {
  const pose = claudePose(e)
  const f = pose < 0 ? assets.claudeIdle?.[0] : assets.claudeCast?.[pose]
  if (!f) return
  const scale = pose < 0 ? CLAUDE_BODY_HEIGHT / f.h : CLAUDE_BODY_HEIGHT / 292
  ellipse(x, y + 2, 49, 8, '#5d341f50')
  ctx.save()
  ctx.translate(x, y)
  // The supplied casting poses face right.
  if (e.face < 0) ctx.scale(-1, 1)
  if (e.hit > 0) ctx.filter = 'brightness(1.7)'
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
  if (e.state === 'laser-charge') {
    const progress = clamp(e.stateTime / CLAUDE_LASER_WINDUP, 0, 1)
    const muzzle = x + e.laserFace * 95
    ctx.save()
    ctx.globalAlpha = 0.18 + progress * 0.35
    rect(
      muzzle - CLAUDE_LASER_RADIUS,
      10,
      CLAUDE_LASER_RADIUS * 2,
      FLOOR - 10,
      '#ffe7a0',
    )
    ctx.restore()
    star(muzzle, y - 90, 10 + progress * 15, '#fff6ca', time * 2)
  }
}

function drawClaudeLaser(b) {
  const f = assets.claudeLaser
  if (!f) return
  const height = 540,
    width = (height * f.w) / f.h
  ctx.save()
  ctx.translate(b.x - camera, FLOOR)
  if (b.vx < 0) ctx.scale(-1, 1)
  ctx.globalAlpha = Math.min(1, b.life / 0.18)
  ctx.drawImage(f.img, f.x, f.y, f.w, f.h, -width / 2, -height, width, height)
  ctx.restore()
}

function updateClaudeLaser(b, previousX) {
  // Full-height swept collision: rising/falling never evades this column.
  const overlaps =
    Math.max(previousX, b.x) + b.radius > player.x - 18 &&
    Math.min(previousX, b.x) - b.radius < player.x + 18
  if (!b.hitPlayer && overlaps && player.roll <= 0) {
    hurt()
    b.hitPlayer = true
  }
  // A roll does not consume the danger; it must carry the player through it.
  if (b.x < -210 || b.x > LENGTH + 210) b.life = 0
}

function oceanRemainingEnemies() {
  return enemies.filter((e) => e.family === 'ocean' && e.hp > 0).length
}

function oceanChestHint() {
  const remaining = oceanRemainingEnemies()
  return remaining > 0
    ? `宝箱封锁 · 还剩 ${remaining} 只小怪`
    : 'E · 开箱获得潮汐钥匙'
}

function stopOceanSkillCall() {
  stopBossCallSource(oceanSkillCall)
  oceanSkillCall = null
}

function syncOceanSkillCall() {
  const call = oceanSkillCall
  if (!call) return
  if (stage !== 4 || !['playing', 'paused'].includes(mode)) {
    stopOceanSkillCall()
    return
  }
  if (!soundOn || mode === 'paused') {
    stopBossCallSource(call)
    return
  }
  const buffer = soundBuffers['whale-token-call']
  if (!audio || !buffer || call.source) return
  if (call.elapsed >= buffer.duration) {
    stopOceanSkillCall()
    return
  }
  const source = audio.createBufferSource(),
    gain = audio.createGain()
  source.buffer = buffer
  gain.gain.value = 0.85
  source.connect(gain)
  gain.connect(master)
  call.source = source
  call.gain = gain
  call.startedAt = audio.currentTime
  call.startOffset = call.elapsed
  source.onended = () => {
    if (oceanSkillCall === call && call.source === source) stopOceanSkillCall()
  }
  source.start(audio.currentTime, call.elapsed)
}

function updateOceanJourney(dt) {
  if (isOceanArena() && oceanJourney.arenaCleared)
    oceanJourney.arenaPortalAge += dt
  if (oceanJourney?.portal === 'unsealing') {
    oceanJourney.portalAge = Math.min(
      OCEAN_UNSEAL_DURATION,
      oceanJourney.portalAge + dt,
    )
    if (oceanJourney.portalAge >= OCEAN_UNSEAL_DURATION - 1e-8) {
      oceanJourney.portalAge = OCEAN_UNSEAL_DURATION
      oceanJourney.portal = 'open'
      enterOceanArena()
    }
  }
  const call = oceanSkillCall
  if (call) {
    call.elapsed += dt
    if (call.source)
      call.elapsed = Math.max(
        call.elapsed,
        call.startOffset + audio.currentTime - call.startedAt,
      )
    if (call.elapsed >= (soundBuffers['whale-token-call']?.duration ?? 3.1))
      stopOceanSkillCall()
  }
}

const OCEAN_ENEMY_STATS = {
  jelly: {
    hp: 7.5,
    type: 2,
    height: 94,
    width: 32,
    speed: 32,
    windup: 0.55,
    cooldown: 2.6,
    shotSpeed: 235,
  },
  pirate: {
    hp: 9,
    type: 0,
    height: 91,
    width: 34,
    speed: 58,
    windup: 0.48,
    cooldown: 1.5,
    reach: 83,
  },
  angler: {
    hp: 7.5,
    type: 2,
    height: 92,
    width: 30,
    speed: 43,
    windup: 0.5,
    cooldown: 2.2,
    shotSpeed: 290,
  },
  crab: {
    hp: 12,
    type: 1,
    height: 101,
    width: 39,
    speed: 34,
    windup: 0.65,
    cooldown: 1.9,
    reach: 94,
  },
}

// Independent windows overlap where a tentacle, claw or blade crosses a column.
const OCEAN_ENEMY_ATLASES = {
  jellyWalk: {
    name: 'ocean-jelly-walk',
    boxes: [
      [17, 19, 466, 414],
      [462, 18, 901, 426],
      [904, 20, 1337, 429],
      [1341, 19, 1756, 429],
      [29, 431, 478, 853],
      [453, 431, 907, 862],
      [862, 437, 1336, 847],
      [1291, 436, 1763, 849],
    ],
    centers: [260, 690, 1135, 1570, 255, 685, 1110, 1550],
  },
  pirateWalk: {
    name: 'ocean-pirate-walk',
    boxes: [
      [13, 170, 371, 516],
      [380, 170, 731, 516],
      [733, 170, 1101, 516],
      [1099, 169, 1445, 521],
      [12, 595, 361, 931],
      [370, 595, 731, 938],
      [733, 595, 1104, 941],
      [1090, 595, 1446, 931],
    ],
    centers: [206, 565, 931, 1290, 200, 558, 928, 1288],
  },
  pirateAttack: {
    name: 'ocean-pirate-attack',
    boxes: [
      [26, 97, 435, 445],
      [501, 87, 897, 448],
      [920, 48, 1332, 460],
      [1334, 129, 1770, 454],
      [14, 509, 524, 862],
      [495, 567, 932, 862],
      [925, 482, 1337, 863],
      [1348, 522, 1758, 864],
    ],
    centers: [244, 730, 1160, 1580, 333, 743, 1156, 1596],
    bodyHeights: [349, 338, 331, 322, 306, 296, 314, 343],
  },
  anglerWalk: {
    name: 'ocean-angler-walk',
    boxes: [
      [13, 51, 427, 419],
      [449, 44, 867, 420],
      [890, 62, 1320, 420],
      [1335, 47, 1759, 420],
      [13, 488, 433, 859],
      [455, 471, 872, 861],
      [881, 492, 1325, 861],
      [1333, 495, 1753, 861],
    ],
    centers: [280, 718, 1152, 1595, 279, 727, 1160, 1595],
  },
  crabWalk: {
    name: 'ocean-crab-walk',
    boxes: [
      [7, 26, 427, 411],
      [448, 26, 881, 411],
      [889, 26, 1313, 410],
      [1340, 26, 1763, 402],
      [8, 470, 433, 845],
      [456, 460, 875, 843],
      [889, 465, 1314, 849],
      [1323, 469, 1760, 849],
    ],
    centers: [215, 659, 1095, 1550, 215, 659, 1095, 1550],
  },
  crabAttack: {
    name: 'ocean-crab-attack',
    boxes: [
      [13, 75, 425, 440],
      [448, 81, 897, 440],
      [895, 78, 1332, 438],
      [1370, 21, 1763, 440],
      [18, 491, 453, 838],
      [457, 503, 973, 839],
      [937, 515, 1343, 838],
      [1345, 491, 1755, 843],
    ],
    centers: [218, 704, 1144, 1590, 280, 790, 1195, 1555],
    bodyHeights: [365, 357, 358, 301, 318, 334, 318, 351],
  },
}

async function loadOceanEnemies() {
  const descriptors = Object.entries(OCEAN_ENEMY_ATLASES)
  const sheets = await Promise.all(
    descriptors.map(([, d]) => image(`./assets/${d.name}.png`)),
  )
  assets.oceanEnemies = {}
  descriptors.forEach(([key, d], n) => {
    const img = sheets[n]
    const frames = d.boxes.map(([x1, y1, x2, y2], i) => {
      const left = Math.max(0, x1 - 3),
        top = Math.max(0, y1 - 3)
      const f = spriteFrames(
        img,
        1,
        1,
        'whale-body',
        [left, Math.min(img.width, x2 + 4)],
        [top, Math.min(img.height, y2 + 4)],
      )[0]
      f.anchor = d.centers[i] - left
      f.bodyHeight = d.bodyHeights?.[i]
      return f
    })
    frames.height = Math.max(...frames.map((f) => f.h))
    assets.oceanEnemies[key] = frames
  })
  const shots = await Promise.all(
    ['jelly', 'angler'].map((kind) => image(`./assets/ocean-${kind}-shot.png`)),
  )
  assets.oceanEnemyShots = Object.fromEntries(
    shots.map((img, i) => [
      ['jelly', 'angler'][i],
      spriteFrames(img, 1, 1, 'effect')[0],
    ]),
  )
}

function resetOceanEnemies() {
  const placements = [
    ['pirate', 620],
    ['jelly', 980, 1],
    ['angler', 920],
    ['crab', 1260],
    ['pirate', 1490, 2],
    ['jelly', 1850],
    ['angler', 1830, 3],
    ['crab', 2160],
    ['pirate', 2550],
    ['jelly', 2600, 5],
    ['angler', 3010],
    ['crab', 2990, 6],
    ['pirate', 3350],
    ['jelly', 3670, 8],
    ['angler', 3940],
    ['crab', 4160],
  ]
  enemies = placements.map(([kind, x, ledge], i) => {
    const stats = OCEAN_ENEMY_STATS[kind],
      p = platforms[ledge]
    return {
      family: 'ocean',
      oceanKind: kind,
      type: stats.type,
      x,
      homeX: x,
      y: p?.y ?? FLOOR,
      homeY: p?.y ?? FLOOR,
      minX: p ? p.x + stats.width : Math.max(530, x - 150),
      maxX: p
        ? p.x + p.w - stats.width
        : Math.min(OCEAN_PORTAL_X - 110, x + 150),
      hp: stats.hp,
      maxHp: stats.hp,
      bodyWidth: stats.width,
      bodyHeight: stats.height,
      face: -1,
      patrolDir: i % 2 ? -1 : 1,
      phase: i * 0.7,
      moving: false,
      hit: 0,
      stagger: 0,
      shot: 1.2 + (i % 4) * 0.4,
      active: false,
      state: 'chase',
      stateTime: 0,
      strikeHit: false,
    }
  })
  // Select two distinct donors per run; kill order never changes the quota.
  const lootOrder = [...enemies]
  for (let i = lootOrder.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[lootOrder[i], lootOrder[j]] = [lootOrder[j], lootOrder[i]]
  }
  lootOrder.slice(0, 2).forEach((e) => {
    e.oceanHealthLoot = true
  })
}

function oceanEnemyPatrol(e, dt) {
  e.moving = true
  e.face = e.patrolDir
  e.x = clamp(
    e.x + e.patrolDir * OCEAN_ENEMY_STATS[e.oceanKind].speed * 0.45 * dt,
    e.minX,
    e.maxX,
  )
  if (e.x <= e.minX || e.x >= e.maxX) e.patrolDir *= -1
}

function fireOceanEnemyShot(e) {
  const stats = OCEAN_ENEMY_STATS[e.oceanKind]
  const x = e.x + e.face * 32,
    y = e.y - 60
  const dx = Math.max(1, Math.abs(e.aimX - x)),
    dy = e.aimY - y
  const angle = clamp(Math.atan2(dy, dx), -0.45, 0.45)
  bullets.push({
    x,
    y,
    vx: e.face * Math.cos(angle) * stats.shotSpeed,
    vy: Math.sin(angle) * stats.shotSpeed,
    life: 2.8,
    enemy: true,
    oceanShot: e.oceanKind,
    owner: e,
    radius: 12,
    age: 0,
  })
  tone(e.oceanKind === 'jelly' ? 360 : 190, 0.1, 'triangle', 0.025)
}

function updateOceanEnemy(e, dt) {
  const stats = OCEAN_ENEMY_STATS[e.oceanKind]
  e.phase += dt
  e.hit = Math.max(0, e.hit - dt)
  e.shot -= dt
  e.stateTime += dt
  e.y = e.homeY
  e.moving = false
  const gap = Math.abs(e.x - player.x),
    heightGap = Math.abs(e.y - player.y)
  e.active = gap < 540 && heightGap < 260
  if (e.stagger > 0) {
    e.stagger = Math.max(0, e.stagger - dt)
    e.state = 'recover'
    e.stateTime = 0
    e.shot = Math.max(e.shot, 0.8)
    e.strikeHit = true
    return
  }
  if (!e.active) {
    e.state = 'chase'
    e.stateTime = 0
    e.shot = Math.max(e.shot, 0.8)
    oceanEnemyPatrol(e, dt)
    return
  }
  if (e.state === 'chase') {
    faceTarget(e, player.x)
    const inRange = stats.shotSpeed
      ? gap < 460 && heightGap < 220
      : gap < stats.reach && heightGap < 65
    if (inRange && e.shot <= 0) {
      e.state = 'windup'
      e.stateTime = 0
      e.strikeHit = false
      e.aimX = player.x
      e.aimY = player.y - 55
    } else if (!stats.shotSpeed && heightGap < 65 && gap > 42) {
      const previous = e.x
      e.x = clamp(
        e.x + Math.sign(player.x - e.x) * stats.speed * dt,
        e.minX,
        e.maxX,
      )
      e.moving = e.x !== previous
    } else if (!inRange) oceanEnemyPatrol(e, dt)
  } else if (e.state === 'windup' && e.stateTime >= stats.windup) {
    e.state = 'strike'
    e.stateTime = 0
    if (stats.shotSpeed) fireOceanEnemyShot(e)
    else tone(e.oceanKind === 'pirate' ? 230 : 140, 0.12, 'triangle', 0.025)
  } else if (e.state === 'strike') {
    if (!stats.shotSpeed && e.stateTime >= 0.045 && e.stateTime < 0.24)
      strikePlayer(e, e.x, 8, stats.reach, stats.height - 8, 0)
    if (e.stateTime >= 0.3) {
      e.state = 'recover'
      e.stateTime = 0
      e.shot = stats.cooldown
    }
  } else if (e.state === 'recover' && e.stateTime >= 0.32) {
    e.state = 'chase'
    e.stateTime = 0
  }
}

function oceanEnemyPose(e) {
  if (e.state === 'windup')
    return Math.min(
      3,
      Math.floor((e.stateTime / OCEAN_ENEMY_STATS[e.oceanKind].windup) * 4),
    )
  if (e.state === 'strike') return e.stateTime < 0.14 ? 4 : 5
  if (e.state === 'recover') return e.stateTime < 0.15 ? 6 : 7
  return e.moving ? Math.floor(e.phase * 8) % 8 : 0
}

function drawOceanEnemy(e, x, y) {
  const stats = OCEAN_ENEMY_STATS[e.oceanKind],
    walk = assets.oceanEnemies?.[`${e.oceanKind}Walk`]
  if (!walk) return
  const attacking = e.state !== 'chase',
    attack = assets.oceanEnemies[`${e.oceanKind}Attack`]
  const frames = attacking && attack ? attack : walk
  const f = frames[oceanEnemyPose(e)],
    scale = stats.height / (f.bodyHeight ?? walk.height)
  ellipse(x, y + 2, stats.width, 5, '#183e5835')
  if (e.state === 'windup') {
    const progress = e.stateTime / stats.windup
    if (stats.shotSpeed)
      star(
        x + e.face * 32,
        y - 60,
        5 + progress * 7,
        e.oceanKind === 'jelly' ? '#dfa3ff' : '#83fff0',
        time * 4,
      )
    else
      rect(
        Math.min(x + e.face * 8, x + e.face * stats.reach),
        y - 3,
        stats.reach - 8,
        3,
        '#ffcd7777',
      )
  }
  ctx.save()
  ctx.translate(x, y)
  // The fish faces right; the other three supplied creatures face left.
  if (e.oceanKind === 'angler' ? e.face < 0 : e.face > 0) ctx.scale(-1, 1)
  if (e.hit > 0) ctx.filter = 'brightness(1.8) saturate(.6)'
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
  if (e.active || e.hit > 0) {
    rect(x - 23, y - stats.height - 12, 46, 4, '#17364ad9')
    rect(
      x - 23,
      y - stats.height - 12,
      46 * clamp(e.hp / e.maxHp, 0, 1),
      4,
      '#8ce6dc',
    )
  }
}

function drawOceanEnemyShot(b) {
  const f = assets.oceanEnemyShots?.[b.oceanShot]
  if (!f) return
  const width = b.oceanShot === 'jelly' ? 79 : 90,
    scale = width / f.w
  ctx.save()
  ctx.translate(b.x - camera, b.y)
  ctx.rotate(Math.atan2(b.vy, Math.abs(b.vx)) * (b.vx < 0 ? -1 : 1))
  if (b.vx < 0) ctx.scale(-1, 1)
  ctx.globalAlpha = Math.min(1, b.life / 0.18)
  // Both supplied shots have their leading core on the right and trailing tail left.
  ctx.drawImage(
    f.img,
    f.x,
    f.y,
    f.w,
    f.h,
    -width * 0.76,
    (-f.h * scale) / 2,
    width,
    f.h * scale,
  )
  ctx.restore()
}

// Keep the connected character silhouette, discarding neighbouring atlas fragments.
// Run before bounds/scale calculation so a leftover tail cannot widen the frame.
function cleanWhaleBodyPixels(p, w, h) {
  const labels = new Int32Array(w * h),
    queue = new Int32Array(w * h)
  let component = 0,
    largest = 0,
    largestSize = 0
  for (let start = 0; start < labels.length; start++) {
    if (labels[start] || p[start * 4 + 3] < 24) continue
    component++
    let head = 0,
      tail = 1
    labels[start] = component
    queue[0] = start
    while (head < tail) {
      const i = queue[head++],
        x = i % w,
        y = Math.floor(i / w)
      for (let dy = -1; dy <= 1; dy++) {
        if (y + dy < 0 || y + dy >= h) continue
        for (let dx = -1; dx <= 1; dx++) {
          if (x + dx < 0 || x + dx >= w) continue
          const next = i + dy * w + dx
          if (!labels[next] && p[next * 4 + 3] >= 24) {
            labels[next] = component
            queue[tail++] = next
          }
        }
      }
    }
    if (tail > largestSize) {
      largestSize = tail
      largest = component
    }
  }
  for (let i = 0; i < labels.length; i++)
    if (labels[i] !== largest || p[i * 4 + 3] < 24) p[i * 4 + 3] = 0
}

async function loadOceanAssets() {
  const [
    deepWalk,
    deepJump,
    deepCast,
    deepLaser,
    deepSlam,
    deepIdle,
    deepFidget,
    deepRoll,
    deepBlink,
  ] = await Promise.all(
    [
      'walk',
      'jump',
      'cast',
      'laser',
      'slam',
      'idle',
      'fidget',
      'roll',
      'blink',
    ].map((kind) => image(`./assets/deep-claude-${kind}.png`)),
  )
  assets.deepWalk = spriteFrames(deepWalk, 4, 2, 'deep-body')
  assets.deepJump = spriteFrames(deepJump, 4, 2, 'deep-body')
  assets.deepCast = spriteFrames(
    deepCast,
    4,
    2,
    'deep-cast',
    [
      [0, 335, 725, 1085, 1448],
      [0, 355, 755, 1150, 1448],
    ],
    [0, 545, 1086],
  )
  assets.deepRoll = spriteFrames(
    deepRoll,
    4,
    2,
    'deep-cast',
    [
      [0, 510, 945, 1380, 1774],
      [0, 515, 940, 1340, 1774],
    ],
    [0, 464, 887],
  )
  assets.deepRoll.forEach((f, i) => {
    f.anchor = [300, 250, 245, 205, 295, 250, 250, 290][i]
  })
  assets.deepBlink = spriteFrames(
    deepBlink,
    4,
    2,
    'deep-cast',
    [
      [0, 445, 890, 1335, 1774],
      [0, 505, 955, 1375, 1774],
    ],
    [0, 454, 887],
  )
  assets.deepBlink.forEach((f, i) => {
    f.anchor = [275, 280, 280, 260, 265, 300, 245, 270][i]
  })
  assets.deepLaser = spriteFrames(deepLaser, 1, 1, 'effect')[0]
  assets.deepIdle = spriteFrames(deepIdle, 1, 1, 'deep-body')
  assets.deepFidget = spriteFrames(
    deepFidget,
    4,
    2,
    'deep-body',
    [
      [0, 410, 795, 1175, 1536],
      [0, 395, 770, 1155, 1536],
    ],
    [0, 514, 1024],
  )
  assets.deepFidget.forEach((f, i) => {
    f.anchor = [285, 265, 255, 270, 275, 260, 270, 270][i]
  })
  assets.deepSlam = spriteFrames(
    deepSlam,
    4,
    2,
    'claude',
    [
      [0, 445, 890, 1334, 1774],
      [0, 448, 926, 1380, 1774],
    ],
    [0, 457, 887],
  )
  assets.deepSlam.forEach((f, i) => {
    f.anchor = [290, 280, 280, 240, 260, 210, 240, 205][i]
  })
  assets.deepWalk.forEach((f) => {
    f.anchor = 280
  })
  assets.deepJump.forEach((f) => {
    f.anchor = 310
  })
  assets.deepCast.forEach((f, i) => {
    f.anchor = [195, 210, 185, 195, 195, 195, 165, 135][i]
  })
  const names = [
    'ocean-background',
    'whale-idle',
    'whale-cast',
    'ocean-wave',
    'whale-roll',
    'whale-walk',
    'ocean-platform',
    'ocean-sealed-portal',
    'ocean-waterball',
    'ocean-chest-closed',
    'ocean-chest-open',
    'whale-ultimate',
    'ocean-drain',
    'ocean-energy-pickup',
    'ocean-health-pickup',
    'whale-jump',
    'ocean-key',
    'ocean-portal-unseal',
    'claude-idle',
    'claude-arena',
    'claude-cast',
    'claude-laser',
    'claude-relic',
    'claude-portal-sealed',
    'claude-portal-open',
    'claude-health-frame',
    'whale-slam',
    'whale-fidget',
    'claude-shadow',
    'claude-platform',
    'claude-barrage-1',
    'claude-barrage-2',
    'claude-barrage-3',
    'claude-barrage-4',
    'claude-barrage-5',
  ]
  const [
    background,
    idle,
    cast,
    wave,
    rollSheet,
    walk,
    tile,
    portal,
    waterball,
    chestClosed,
    chestOpen,
    ultimate,
    drain,
    energyPickup,
    healthPickup,
    jump,
    key,
    unseal,
    claudeIdle,
    claudeArena,
    claudeCast,
    claudeLaser,
    claudeRelic,
    claudePortalSealed,
    claudePortalOpen,
    claudeHealthFrame,
    whaleSlam,
    whaleFidget,
    claudeShadow,
    claudePlatform,
    ...claudeBarrage
  ] = await Promise.all(names.map((name) => image(`./assets/${name}.png`)))
  assets.oceanBackground = background
  assets.whaleSlam = spriteFrames(
    whaleSlam,
    4,
    2,
    'whale-body',
    [
      [0, 445, 890, 1335, 1774],
      [0, 495, 965, 1386, 1774],
    ],
    [0, 459, 887],
  )
  assets.whaleSlam.height = 356
  assets.whaleSlam.forEach((f, i) => {
    f.anchor = [224, 227, 248, 280, 263, 256, 267, 234][i]
    f.bottom = [451, 408, 398, 444, 400, 401, 398, 411][i]
  })
  assets.whaleFidget = spriteFrames(whaleFidget, 4, 2, 'whale-body')
  assets.whaleFidget.height = Math.max(...assets.whaleFidget.map((f) => f.h))
  assets.whaleFidget.forEach((f) => {
    f.anchor = 176
  })
  assets.claudeBarrage = claudeBarrage.map(
    (img) => spriteFrames(img, 1, 1, 'effect')[0],
  )
  const arenaTile = spriteFrames(claudePlatform, 1, 1, 'claude')[0]
  assets.claudePlatform = { frame: arenaTile, surface: arenaTile.y }
  assets.claudeShadow = claudeShadow
  assets.whaleIdle = spriteFrames(idle, 1, 1, 'effect')
  assets.whaleWalk = spriteFrames(
    walk,
    4,
    2,
    'whale-body',
    [
      [0, 465, 897, 1328, 1774],
      [0, 478, 897, 1328, 1774],
    ],
    [0, 447, 887],
  )
  assets.whaleCast = spriteFrames(
    cast,
    4,
    2,
    'effect',
    [
      [0, 430, 866, 1305, 1774],
      [0, 485, 935, 1330, 1774],
    ],
    [0, 451, 887],
  )
  assets.whaleRoll = spriteFrames(
    rollSheet,
    4,
    2,
    'effect',
    [0, 366, 748, 1092, 1448],
    [0, 560, 1086],
  )
  // Align the character's body, rather than the asymmetric hair / spell extent.
  assets.whaleWalk.forEach((f, i) => {
    f.anchor = [205, 184, 177, 176, 203, 174, 185, 177][i]
  })
  // Unevenly spaced jump poses: isolate each connected silhouette before cropping.
  // Some tails/hands cross their neighbours' rectangular columns. Overlapping
  // source windows retain those limbs; component cleanup removes the neighbour.
  assets.whaleJump = [
    [3, 218, 346, 658],
    [338, 273, 677, 658],
    [650, 327, 956, 662],
    [931, 190, 1254, 624],
    [12, 685, 347, 1113],
    [345, 689, 669, 1109],
    [630, 756, 978, 1148],
    [898, 869, 1254, 1191],
  ].map(
    ([left, top, right, bottom]) =>
      spriteFrames(jump, 1, 1, 'whale-body', [left, right], [top, bottom])[0],
  )
  assets.whaleJump.height = Math.max(...assets.whaleJump.map((f) => f.h))
  assets.whaleJump.forEach((f, i) => {
    f.anchor = [208, 209, 194, 227, 195, 205, 222, 245][i]
  })
  assets.whaleCast.forEach((f, i) => {
    f.anchor = [252, 270, 254, 227, 280, 260, 234, 245][i]
  })
  assets.oceanWave = spriteFrames(wave, 1, 1, 'effect')[0]
  assets.oceanWaterball = spriteFrames(waterball, 1, 1, 'effect')[0]
  assets.oceanEnergyPickup = spriteFrames(energyPickup, 4, 2, 'effect')
  assets.oceanHealthPickup = spriteFrames(healthPickup, 4, 2, 'effect')
  assets.oceanChestClosed = spriteFrames(chestClosed, 1, 1, 'effect')
  assets.oceanChestOpen = spriteFrames(chestOpen, 1, 1, 'effect')
  assets.whaleUltimate = spriteFrames(
    ultimate,
    4,
    4,
    'whale-body',
    [0, 313, 627, 940, 1254],
    [0, 313, 627, 940, 1254],
  )
  assets.whaleUltimate.forEach((f, i) => {
    f.anchor = [
      193, 196, 197, 199, 198, 197, 196, 198, 196, 197, 196, 196, 199, 197, 196,
      196,
    ][i]
    f.handX = [
      207, 293, 300, 293, 270, 266, 247, 244, 302, 303, 302, 245, 242, 251, 238,
      240,
    ][i]
    f.handY = [
      174, 177, 176, 181, 177, 184, 189, 190, 171, 168, 172, 187, 181, 182, 192,
      194,
    ][i]
  })
  // The new sheet faces toward the target: whirlpool on the left, energy on the right.
  // Keep the core and donor energy separate so empty casts never paint a stream on the hero.
  assets.oceanDrain = spriteFrames(
    drain,
    4,
    2,
    'effect',
    [
      [0, 280, 638, 999, 1448],
      [0, 517, 905, 1185, 1448],
    ],
    [0, 595, 1086],
  )
  assets.oceanDrain.forEach((f, i) => {
    f.coreX = [110, 108, 97, 91, 111, 103, 71, 75][i]
    f.coreY = [439, 444, 444, 444, 191, 199, 203, 204][i]
  })
  // One green comet from the supplied art, emitted only at a damaged enemy.
  assets.oceanDrainMote = {
    img: assets.oceanDrain[4].img,
    x: 396,
    y: 106,
    w: 96,
    h: 94,
  }
  assets.oceanPortal = spriteFrames(portal, 1, 1, 'effect')[0]
  assets.oceanKey = spriteFrames(key, 1, 1, 'effect')[0]
  assets.claudeIdle = spriteFrames(claudeIdle, 1, 1, 'claude')
  assets.claudeIdle[0].anchor =
    assets.claudeIdle[0].x + assets.claudeIdle[0].w / 2
  assets.claudeIdle[0].bottom = assets.claudeIdle[0].y + assets.claudeIdle[0].h
  assets.claudeArena = claudeArena
  assets.claudeCast = spriteFrames(
    claudeCast,
    4,
    4,
    'claude',
    [0, 313, 627, 940, 1254],
    [0, 310, 630, 919, 1254],
  )
  assets.claudeCast.forEach((f, i) => {
    f.anchor = [
      140, 143, 131, 140, 123, 132, 124, 128, 145, 141, 123, 125, 140, 135, 133,
      138,
    ][i]
    f.bottom = [
      301, 301, 301, 301, 314, 317, 318, 314, 281, 281, 282, 279, 303, 304, 305,
      303,
    ][i]
  })
  assets.claudeLaser = spriteFrames(claudeLaser, 1, 1, 'claude')[0]
  assets.claudeRelic = spriteFrames(
    claudeRelic,
    4,
    2,
    'claude',
    undefined,
    [0, 486, 887],
  )
  assets.claudeRelic.height = Math.max(...assets.claudeRelic.map((f) => f.h))
  assets.claudePortalSealed = spriteFrames(
    claudePortalSealed,
    1,
    1,
    'claude',
  )[0]
  assets.claudePortalOpen = spriteFrames(claudePortalOpen, 4, 2, 'claude')
  assets.claudePortalOpen.forEach((f, i) => {
    f.anchor = 181
    f.bottom = [490, 490, 487, 487, 472, 472, 472, 472][i]
  })
  assets.bossHealthFrames ??= {}
  assets.bossHealthFrames.claude = spriteFrames(
    claudeHealthFrame,
    1,
    1,
    'claude',
  )
  assets.oceanPortalUnseal = spriteFrames(
    unseal,
    4,
    2,
    'effect',
    [0, 443, 887, 1330, 1774],
    [0, 447, 887],
  )
  // Register the stone base, allowing the final glow to grow above the doorway.
  assets.oceanPortalUnseal.forEach((f, i) => {
    f.anchor = 210
    f.bottom = [441, 442, 442, 443, 437, 438, 438, 437][i]
  })
  const frame = spriteFrames(tile, 1, 1, 'effect')[0]
  assets.platformTiles[4] = { frame, surface: frame.y }
  await loadOceanEnemies()
}

function createOceanSupply(kind, x, surface, source = 'enemy') {
  return {
    x,
    y: surface - 28,
    base: surface - 28,
    phase: random(0, Math.PI * 2),
    age: 0,
    life: OCEAN_SUPPLY_LIFETIME,
    kind,
    source,
    energy: 25,
  }
}

function spawnOceanMapSupply(kind, minX = 260, maxX = OCEAN_PORTAL_X - 250) {
  for (let attempt = 0; attempt < 40; attempt++) {
    const x = random(minX, maxX)
    if (
      Math.abs(x - player.x) < 150 ||
      Math.abs(x - OCEAN_CHEST_X) < 130 ||
      drops.some((d) => Math.abs(d.x - x) < 95)
    )
      continue
    const ledge = platforms.find((p) => x >= p.x + 28 && x <= p.x + p.w - 28)
    const surface = ledge && Math.random() < 0.5 ? ledge.y : FLOOR
    const supply = createOceanSupply(kind, x, surface, 'map')
    // The only map heart remains available until picked up; it never respawns.
    if (kind === 'ocean-health') supply.life = undefined
    drops.push(supply)
    return true
  }
  return false
}

function resetOceanSupplies() {
  oceanSupplyTimer = random(12, 18)
  for (const [kind, minX, maxX] of [
    ['ocean-energy', 550, 880],
    ['ocean-health', 900, 1180],
    ['ocean-energy', 1600, 2700],
    ['ocean-energy', 2850, 4000],
  ])
    spawnOceanMapSupply(kind, minX, maxX)
}

function updateOceanSupplies(dt) {
  if (isOceanArena()) {
    for (const d of drops) d.age = (d.age ?? 0) + dt
    return
  }
  for (const d of drops)
    if (d.kind === 'ocean-energy' || d.kind === 'ocean-health') {
      d.age = (d.age ?? 0) + dt
      if (d.life !== undefined) d.life -= dt
    }
  drops = drops.filter((d) => d.life === undefined || d.life > 0)
  oceanSupplyTimer -= dt
  if (oceanSupplyTimer <= 0) {
    if (drops.filter((d) => d.source === 'map').length < OCEAN_MAP_SUPPLY_LIMIT)
      spawnOceanMapSupply('ocean-energy')
    oceanSupplyTimer = random(12, 18)
  }
}

function dropOceanEnemySupplies(e) {
  if (e.bossKind === 'claude') {
    if (oceanJourney.arenaCleared) return
    oceanJourney.arenaCleared = true
    oceanJourney.arenaPortalAge = 0
    drops.push({
      kind: 'claude-relic',
      x: e.x,
      y: e.y - 50,
      base: FLOOR - 40,
      phase: 0,
      age: 0,
      source: 'boss',
    })
    return
  }
  const surface = oceanSurface(e.x, e.y)
  const kinds =
    e.type === 3
      ? ['ocean-energy', 'ocean-health']
      : [e.oceanHealthLoot ? 'ocean-health' : 'ocean-energy']
  kinds.forEach((kind, i) => {
    const x = clamp(
      e.x + (kinds.length === 2 ? (i ? 24 : -24) : 0),
      40,
      LENGTH - 40,
    )
    const d = createOceanSupply(kind, x, surface)
    d.y = e.y - 40
    drops.push(d)
  })
}

function drawOceanSupply(d, x, y) {
  const frames =
    d.kind === 'claude-relic'
      ? assets.claudeRelic
      : d.kind === 'ocean-health'
        ? assets.oceanHealthPickup
        : assets.oceanEnergyPickup
  if (!frames) return
  const index = Math.floor((d.age ?? 0) * 9) % 8
  const f = frames[index]
  // One scale for the atlas preserves its authored heartbeat instead of normalizing it away.
  const scale = (d.kind === 'claude-relic' ? 68 : 52) / frames.height
  ctx.save()
  if (d.life < 4) ctx.globalAlpha = clamp(d.life / 4, 0, 1)
  ctx.drawImage(
    f.img,
    f.x,
    f.y,
    f.w,
    f.h,
    x - (f.w * scale) / 2,
    y - (f.h * scale) / 2,
    f.w * scale,
    f.h * scale,
  )
  ctx.restore()
}

// A wave always rests on the highest surface below its previous feet.
// Leaving a ledge snaps it to the next lower surface; no airborne projectile.
function oceanSurface(x, feet) {
  let surface = FLOOR
  for (const p of platforms)
    if (x >= p.x && x <= p.x + p.w && p.y >= feet - 3)
      surface = Math.min(surface, p.y)
  return surface
}

function castOceanWave() {
  if (
    mode !== 'playing' ||
    player.roll > 0 ||
    player.meleeCooldown > 0 ||
    player.oceanUltimate > 0 ||
    player.deepBlink ||
    player.slam
  )
    return
  player.attack = OCEAN_CAST_DURATION
  player.attackAge = 0
  player.meleeCooldown = 0.86
  player.attackFace = player.face
  player.swingResolved = true
  player.oceanPending = true
  player.oceanAttackKind =
    player.deepFormTime > 0
      ? 'deep-laser'
      : player.ground && Math.abs(player.y - FLOOR) < 1
        ? 'wave'
        : 'waterball'
}

function releaseOceanWave() {
  player.oceanPending = false
  const face = player.attackFace
  const x = clamp(player.x + face * 55, 0, LENGTH)
  if (player.oceanAttackKind === 'deep-laser') {
    bullets.push({
      x,
      y: player.y,
      vx: face * 390,
      vy: 0,
      life: 2.2,
      age: 0,
      deepLaser: true,
      enemy: false,
      damage: 3.9,
      radius: 38,
      height: 190,
      hits: new Set(),
    })
    voice(520, 190, 0.25, 'sine', 0.04)
    return
  }
  if (player.oceanAttackKind === 'waterball') {
    bullets.push({
      x,
      y: player.y - 66,
      vx: face * 520,
      vy: 0,
      life: 1.8,
      age: 0,
      oceanWaterball: true,
      enemy: false,
      damage: 3,
      radius: 28,
    })
    voice(680, 240, 0.18, 'sine', 0.035)
    return
  }
  bullets.push({
    x,
    y: FLOOR,
    vx: face * 470,
    vy: 0,
    life: 2.2,
    age: 0,
    oceanWave: true,
    enemy: false,
    damage: 3,
    radius: 64,
    height: 108,
    hits: new Set(),
  })
  crunch(0.28, 0.065, 650)
  voice(280, 110, 0.24, 'sine', 0.045)
}

function castOceanUltimate() {
  if (
    mode !== 'playing' ||
    player.roll > 0 ||
    player.oceanUltimate > 0 ||
    player.deepBlink ||
    player.slam
  )
    return
  if (player.deepFormTime > 0) {
    castDeepClaudeBlink()
    return
  }
  if (player.sugar < 100) {
    if (toastTime <= 0) toast('大招能量不足 · 等待自动恢复，或拾取潮汐能量珠')
    return
  }
  player.sugar = 0
  player.attack = 0
  player.oceanPending = false
  player.oceanUltimate = OCEAN_ULTIMATE_DURATION
  player.oceanUltimateAge = 0
  player.oceanUltimateFace = player.face
  player.oceanUltimateDamage = 2
  player.oceanDrainResolved = false
  player.oceanDrainTargets = []
  stopOceanSkillCall()
  oceanSkillCall = { elapsed: 0, source: null, gain: null }
  syncOceanSkillCall()
  toast('潮汐吸血 · 近距离汲取')
  updateHud()
}

function updateOceanUltimate(dt) {
  if (player.oceanUltimate > 0) {
    player.oceanUltimateAge += dt
    if (
      !player.oceanDrainResolved &&
      player.oceanUltimateAge >= OCEAN_DRAIN_RELEASE
    )
      resolveOceanDrain()
    player.oceanUltimate = Math.max(0, player.oceanUltimate - dt)
  }
}

function resolveOceanDrain() {
  player.oceanDrainResolved = true
  let hit = false
  for (const e of enemies) {
    const dx = (e.x - player.x) * player.oceanUltimateFace
    const width = e.bodyWidth ?? (e.type === 3 ? 63 : 31)
    const height = e.bodyHeight ?? (e.type === 3 ? 120 : 66)
    // Match Alice's ordinary cake strike, including enemy body overlap.
    if (
      e.hp <= 0 ||
      dx < -18 ||
      dx > OCEAN_DRAIN_REACH + width ||
      e.y < player.y - 106 ||
      e.y - height > player.y - 20
    )
      continue
    const before = e.hp
    hitEnemy(e, player.oceanUltimateDamage ?? 2)
    if (e.hp < before) {
      hit = true
      player.oceanDrainTargets.push({ x: e.x, y: e.y - height / 2 })
    }
  }
  if (hit) {
    const restored = healPlayer(1)
    toast(restored ? '潮汐吸血 · 恢复 1 格生命' : '潮汐吸血 · 命中，生命已满')
  } else toast('潮汐吸血 · 范围内没有命中目标')
  updateHud()
}

function oceanDrainHand(x, y) {
  const index = Math.min(
    15,
    Math.floor((player.oceanUltimateAge / OCEAN_ULTIMATE_DURATION) * 16),
  )
  const f = assets.whaleUltimate?.[index]
  if (!f) return { x: x + player.oceanUltimateFace * 58, y: y - 58 }
  const scale = 136 / assets.whaleUltimate.height
  return {
    x: x + player.oceanUltimateFace * ((f.handX - f.anchor) * scale + 16),
    y: y + (f.handY - f.bottom) * scale,
  }
}

function oceanDrainMotePosition(target, hand, elapsed, delay = 0) {
  const t = clamp((elapsed - delay) / 0.22, 0, 1)
  return {
    x: target.x + (hand.x - target.x) * t,
    y: target.y + (hand.y - target.y) * t - Math.sin(t * Math.PI) * 12,
    t,
  }
}

function drawOceanDrain(x, y) {
  if (player.oceanUltimate <= 0 || !assets.oceanDrain) return
  const index = Math.min(
    7,
    Math.floor((player.oceanUltimateAge / OCEAN_ULTIMATE_DURATION) * 8),
  )
  const f = assets.oceanDrain[index],
    hand = oceanDrainHand(x, y)
  const progress = player.oceanUltimateAge / OCEAN_ULTIMATE_DURATION
  const envelope = Math.min(1, progress / 0.1, (1 - progress) / 0.18)
  const elapsed = player.oceanUltimateAge - OCEAN_DRAIN_RELEASE
  const mote = assets.oceanDrainMote
  if (mote && elapsed >= 0)
    for (const target of player.oceanDrainTargets) {
      // Donor coordinates are fixed at the hit, so a killing hit still visibly drains.
      const source = { x: target.x - camera, y: target.y }
      for (let n = 0; n < 4; n++) {
        const delay = n * 0.045
        if (elapsed < delay || elapsed >= delay + 0.22) continue
        const point = oceanDrainMotePosition(source, hand, elapsed, delay)
        const size = 20 * (1 - point.t * 0.35)
        ctx.save()
        ctx.globalAlpha = envelope
        ctx.translate(point.x, point.y)
        ctx.rotate(Math.atan2(hand.y - source.y, hand.x - source.x))
        ctx.beginPath()
        ctx.ellipse(0, 0, size / 2, size / 2, 0, 0, Math.PI * 2)
        ctx.clip()
        ctx.drawImage(
          mote.img,
          mote.x,
          mote.y,
          mote.w,
          mote.h,
          -size / 2,
          -size / 2,
          size,
          size,
        )
        ctx.restore()
      }
    }
  const scale = 0.26 * envelope
  ctx.save()
  ctx.translate(hand.x, hand.y)
  if (player.oceanUltimateFace < 0) ctx.scale(-1, 1)
  // Circular clipping isolates the supplied vortex; never attach its long green tail to the hero.
  ctx.beginPath()
  ctx.arc(0, 0, 100 * scale, 0, Math.PI * 2)
  ctx.clip()
  ctx.drawImage(
    f.img,
    f.x,
    f.y,
    f.w,
    f.h,
    (f.x - f.coreX) * scale,
    (f.y - f.coreY) * scale,
    f.w * scale,
    f.h * scale,
  )
  ctx.restore()
}

function updateOceanWave(b, previousX) {
  if (b.life <= 0 || b.hits.size > 0) return
  b.y = oceanSurface(b.x, b.y)
  // Resolve the first body along travel, even when a fast frame crosses several.
  const halfWidthOf = (e) => e.bodyWidth ?? (e.type === 3 ? 63 : 31)
  const targets = [...enemies].sort((a, c) =>
    b.vx >= 0
      ? a.x - halfWidthOf(a) - (c.x - halfWidthOf(c))
      : c.x + halfWidthOf(c) - (a.x + halfWidthOf(a)),
  )
  for (const e of targets) {
    if (e.hp <= 0 || b.hits.has(e)) continue
    const halfWidth = e.bodyWidth ?? (e.type === 3 ? 63 : 31)
    const height = e.bodyHeight ?? (e.type === 3 ? 120 : 66)
    if (
      Math.max(previousX, b.x) + b.radius > e.x - halfWidth &&
      Math.min(previousX, b.x) - b.radius < e.x + halfWidth &&
      b.y > e.y - height &&
      b.y - b.height < e.y + 8
    ) {
      b.hits.add(e)
      hitEnemy(e, b.damage)
      b.life = 0
      break
    }
  }
  if (b.x < -100 || b.x > LENGTH + 100) b.life = 0
}

function drawWhalePlayer(x, y) {
  if (player.deepFormTime > 0) {
    drawDeepClaudePlayer(x, y)
    return
  }
  let frames = assets.whaleIdle,
    index = 0,
    flip = player.face < 0,
    height = 136
  if (player.oceanFidget && keys.size === 0) {
    frames = assets.whaleFidget
    index = Math.min(7, Math.floor((player.oceanFidgetAge / 1.2) * 8))
  }
  if (player.vx && player.ground) {
    frames = assets.whaleWalk
    index = Math.floor(player.walk * 8) % 8
    // Supplied walking art faces left; cast and roll art face right.
    flip = player.face > 0
  }
  if ((!player.ground || player.landing > 0) && assets.whaleJump) {
    frames = assets.whaleJump
    flip = player.face < 0
    // Brief anticipation, then follow the real ascent/apex/descent. Landing
    // compresses once, rather than looping the sequence while airborne.
    index = player.ground
      ? player.landing > 0.06
        ? 7
        : 0
      : player.jumpAge < 0.025
        ? 0
        : player.jumpAge < 0.05
          ? 1
          : player.jumpAge < 0.085
            ? 2
            : player.vy < -240
              ? 3
              : player.vy < -70
                ? 4
                : player.vy < 120
                  ? 5
                  : 6
  }
  if (player.attack > 0) {
    frames = assets.whaleCast
    index = Math.min(
      7,
      Math.floor((player.attackAge / OCEAN_CAST_DURATION) * 8),
    )
    flip = player.attackFace < 0
  }
  if (player.oceanUltimate > 0) {
    frames = assets.whaleUltimate
    index = Math.min(
      15,
      Math.floor((player.oceanUltimateAge / OCEAN_ULTIMATE_DURATION) * 16),
    )
    flip = player.oceanUltimateFace < 0
  }
  if (player.roll > 0) {
    frames = assets.whaleRoll
    index = Math.min(7, Math.floor(((0.58 - player.roll) / 0.58) * 8))
    flip = player.rollFace < 0
    height = 112
  }
  if (player.slam && assets.whaleSlam) {
    frames = assets.whaleSlam
    const s = player.slam
    index =
      s.phase === 'windup'
        ? Math.min(2, Math.floor((s.age / 0.13) * 3))
        : s.phase === 'dive'
          ? 3 + Math.min(1, Math.floor((s.age / 0.16) * 2))
          : 5 + Math.min(2, Math.floor((s.age / 0.38) * 3))
    flip = s.face < 0
    height = 136
  }
  if (!frames) return
  const f = frames[index],
    scale = height / frames.height
  ctx.save()
  ctx.translate(x, y)
  if (flip) ctx.scale(-1, 1)
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
  drawOceanDrain(x, y)
}

function drawOceanWave(b) {
  const f = assets.oceanWave
  if (!f) return
  // The source contains a glow below the foam. Register the foam's baseline
  // (source y=974) to the collision surface and clip the glow below the floor.
  const scale = b.height / (974 - f.y)
  ctx.save()
  ctx.beginPath()
  ctx.rect(b.x - camera - 160, b.y - 160, 320, 160)
  ctx.clip()
  ctx.translate(b.x - camera, b.y)
  if (b.vx < 0) ctx.scale(-1, 1)
  ctx.globalAlpha = Math.min(1, b.life / 0.22)
  ctx.drawImage(
    f.img,
    f.x,
    f.y,
    f.w,
    f.h,
    (-f.w * scale) / 2,
    (f.y - 974) * scale,
    f.w * scale,
    f.h * scale,
  )
  ctx.restore()
}

function drawOceanBackground() {
  if (isOceanArena()) {
    if (assets.claudeArena) ctx.drawImage(assets.claudeArena, 0, 0, W, H)
    return
  }
  const bg = assets.oceanBackground
  if (!bg) return
  // Preserve the supplied composition; a little horizontal parallax adds depth.
  const height = H + 50,
    width = (height * bg.width) / bg.height
  ctx.drawImage(bg, -(camera / (LENGTH - W)) * (width - W), -50, width, height)
}

function drawOceanWaterball(b) {
  const f = assets.oceanWaterball
  if (!f) return
  const height = b.oceanWaterball ? 86 : 34,
    width = (height * f.w) / f.h
  ctx.save()
  ctx.translate(b.x - camera, b.y)
  if (b.vx < 0) ctx.scale(-1, 1)
  ctx.globalAlpha = b.life === undefined ? 1 : Math.min(1, b.life / 0.18)
  ctx.drawImage(
    f.img,
    f.x,
    f.y,
    f.w,
    f.h,
    -width / 2,
    -height / 2,
    width,
    height,
  )
  ctx.restore()
}

function drawOceanScenery() {
  if (isOceanArena()) {
    rect(0, FLOOR, W, 2, '#cfa77965')
    const boss = enemies.find((e) => e.bossKind === 'claude' && e.hp > 0)
    if (boss) drawClaudeShadow(boss)
    drawClaudePortal()
    for (const p of platforms) platform(p)
    return
  }
  // The photograph's sand is the walkable floor; only a quiet contact line is added.
  rect(0, FLOOR, W, 2, '#e1b87d70')
  for (const p of platforms)
    if (p.x + p.w > camera && p.x < camera + W) platform(p)
  const portalState = oceanJourney?.portal ?? 'sealed'
  const animation = assets.oceanPortalUnseal
  const frameIndex =
    portalState === 'unsealing'
      ? Math.min(
          7,
          Math.floor((oceanJourney.portalAge / OCEAN_UNSEAL_DURATION) * 8),
        )
      : 6 + (Math.floor(time * 3) % 2)
  const f =
    portalState === 'sealed' ? assets.oceanPortal : animation?.[frameIndex]
  if (!f) return
  const x = OCEAN_PORTAL_X - camera,
    scale = 270 / (portalState === 'sealed' ? f.h : 438),
    height = f.h * scale,
    width = f.w * scale
  if (x < -width || x > W + width) return
  ellipse(x, FLOOR + 4, 94, 12, '#335c6c35')
  ctx.drawImage(
    f.img,
    f.x,
    f.y,
    f.w,
    f.h,
    portalState === 'sealed' ? x - width / 2 : x - (f.anchor - f.x) * scale,
    portalState === 'sealed'
      ? FLOOR - height
      : FLOOR - (f.bottom - f.y) * scale,
    width,
    height,
  )
  ctx.save()
  ctx.textAlign = 'center'
  ctx.font = 'bold 15px sans-serif'
  ctx.fillStyle = '#123f62'
  const label =
    portalState === 'sealed'
      ? oceanJourney?.hasKey
        ? 'E · 使用潮汐钥匙'
        : '潮汐之门 · 需要钥匙'
      : portalState === 'unsealing'
        ? '潮汐之门 · 正在破封'
        : 'E · 进入花光圣殿'
  ctx.fillText(label, x, FLOOR - 286)
  ctx.restore()
}

function drawOceanKey(x, y, height) {
  const f = assets.oceanKey
  if (!f) return
  const width = (height * f.w) / f.h
  ctx.drawImage(
    f.img,
    f.x,
    f.y,
    f.w,
    f.h,
    x - width / 2,
    y - height,
    width,
    height,
  )
}

function drawClaudePortal() {
  const open = oceanJourney.arenaCleared
  const f = open
    ? assets.claudePortalOpen?.[Math.floor(oceanJourney.arenaPortalAge * 9) % 8]
    : assets.claudePortalSealed
  if (!f) return
  const scale = open ? 230 / 400 : 230 / f.h
  ctx.drawImage(
    f.img,
    f.x,
    f.y,
    f.w,
    f.h,
    open
      ? CLAUDE_PORTAL_X + (f.x - f.anchor) * scale
      : CLAUDE_PORTAL_X - (f.w * scale) / 2,
    open ? FLOOR + (f.y - f.bottom) * scale : FLOOR - f.h * scale,
    f.w * scale,
    f.h * scale,
  )
  ctx.save()
  ctx.textAlign = 'center'
  ctx.font = 'bold 12px sans-serif'
  ctx.fillStyle = '#fff0c8'
  ctx.strokeStyle = '#563018'
  ctx.lineWidth = 3
  const label = open ? 'E · 阶段终点' : '击败 Claude 解锁'
  ctx.strokeText(label, CLAUDE_PORTAL_X, FLOOR + 20)
  ctx.fillText(label, CLAUDE_PORTAL_X, FLOOR + 20)
  ctx.restore()
}

function requestOceanForm() {
  if (mode !== 'playing' || !oceanJourney?.relicCollected) return
  if (player.deepFormUsed) {
    toast(player.deepFormTime > 0 ? '新形态正在生效' : '本小关卡的新形态已使用')
    return
  }
  if (player.roll > 0 || player.slam || player.oceanUltimate > 0) return
  player.deepFormUsed = true
  player.deepFormTime = 30
  player.attack = 0
  player.oceanPending = false
  player.oceanFidget = false
  player.oceanIdleWait = 0
  player.oceanFidgetAge = 0
  player.oceanIdleDelay = 5
  toast('Deep Claude 形态 · 30 秒 · J 释放花光柱')
}

function castDeepClaudeBlink() {
  if (player.deepBlinkCooldown > 1e-8) {
    toast(`闪现冷却 · ${Math.ceil(player.deepBlinkCooldown)} 秒`)
    return
  }
  player.deepBlink = { age: 0, face: player.face, moved: false }
  player.deepBlinkCooldown = DEEP_BLINK_COOLDOWN
  player.attack = 0
  player.oceanPending = false
  player.oceanFidget = false
  player.jumpBuffer = 0
  voice(720, 220, 0.18, 'sine', 0.035)
  updateHud()
}

function updateDeepClaudeForm(dt) {
  player.deepBlinkCooldown = Math.max(0, (player.deepBlinkCooldown || 0) - dt)
  const blink = player.deepBlink
  if (blink) {
    blink.age += dt
    if (!blink.moved && blink.age >= DEEP_BLINK_DURATION / 2) {
      player.x = clamp(
        player.x + blink.face * DEEP_BLINK_DISTANCE,
        45,
        isOceanArena() ? LENGTH - 55 : OCEAN_PORTAL_X - 65,
      )
      blink.moved = true
    }
    if (blink.age >= DEEP_BLINK_DURATION) player.deepBlink = null
  }
  if (!(player.deepFormTime > 0)) return
  player.deepFormTime = Math.max(0, player.deepFormTime - dt)
  if (player.deepFormTime <= 1e-8) {
    player.deepFormTime = 0
    player.attack = 0
    player.oceanPending = false
    player.deepBlink = null
    toast('新形态结束 · 已恢复潮汐形态')
  }
}

function updateDeepClaudeLaser(b, previousX) {
  if (b.life <= 0 || b.hits.size > 0) return
  const targets = [...enemies].sort((a, c) =>
    b.vx >= 0 ? a.x - c.x : c.x - a.x,
  )
  for (const e of targets) {
    if (e.hp <= 0 || b.hits.has(e)) continue
    if (
      Math.max(previousX, b.x) + b.radius > e.x - (e.bodyWidth ?? 31) &&
      Math.min(previousX, b.x) - b.radius < e.x + (e.bodyWidth ?? 31) &&
      b.y > e.y - (e.bodyHeight ?? 66) &&
      b.y - b.height < e.y + 8
    ) {
      b.hits.add(e)
      hitEnemy(e, b.damage)
      b.life = 0
      break
    }
  }
  if (b.x < -100 || b.x > LENGTH + 100) b.life = 0
}

function drawDeepClaudeLaser(b) {
  const f = assets.deepLaser
  if (!f) return
  const width = (b.height * f.w) / f.h
  ctx.save()
  ctx.globalAlpha = Math.min(1, b.life / 0.15)
  ctx.drawImage(
    f.img,
    f.x,
    f.y,
    f.w,
    f.h,
    b.x - camera - width / 2,
    b.y - b.height,
    width,
    b.height,
  )
  ctx.restore()
}

function drawDeepClaudePlayer(x, y) {
  let frames = assets.deepIdle,
    index = 0,
    face = player.face,
    height = 136
  if (player.oceanFidget && keys.size === 0) {
    frames = assets.deepFidget
    index = Math.min(7, Math.floor((player.oceanFidgetAge / 1.2) * 8))
  }
  if (player.ground && player.vx) {
    frames = assets.deepWalk
    index = Math.floor(player.walk * 8) % 8
  }
  if (!player.ground || player.landing > 0) {
    frames = assets.deepJump
    index = player.ground
      ? 7
      : player.jumpAge < 0.06
        ? 0
        : player.vy < -240
          ? 2
          : player.vy < -70
            ? 3
            : player.vy < 120
              ? 4
              : 5
  }
  if (player.attack > 0 || player.oceanUltimate > 0) {
    frames = assets.deepCast
    index = Math.min(
      7,
      Math.floor((player.attackAge / OCEAN_CAST_DURATION) * 8),
    )
    face = player.attack > 0 ? player.attackFace : player.oceanUltimateFace
    if (player.oceanUltimate > 0)
      index = Math.min(
        7,
        Math.floor((player.oceanUltimateAge / OCEAN_ULTIMATE_DURATION) * 8),
      )
  }
  if (player.roll > 0) {
    frames = assets.deepRoll
    index = Math.min(7, Math.floor(((0.58 - player.roll) / 0.58) * 8))
    face = player.rollFace
    height = 112
  }
  if (player.slam) {
    frames = assets.deepSlam
    const s = player.slam
    index =
      s.phase === 'windup'
        ? Math.min(2, Math.floor((s.age / 0.13) * 3))
        : s.phase === 'dive'
          ? 3 + Math.min(1, Math.floor((s.age / 0.16) * 2))
          : 5 + Math.min(2, Math.floor((s.age / 0.38) * 3))
    face = s.face
    height = 136
  }
  if (player.deepBlink) {
    frames = assets.deepBlink
    index = Math.min(
      7,
      Math.floor((player.deepBlink.age / DEEP_BLINK_DURATION) * 8),
    )
    face = player.deepBlink.face
    height = 136
  }
  if (!frames) return
  const f = frames[index],
    scale = height / frames.height
  ctx.save()
  ctx.translate(x, y)
  if (face < 0) ctx.scale(-1, 1)
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
  drawOceanDrain(x, y)
}

function drawOceanKeyReward(chest, x) {
  if (!chest.opened || chest.age >= 3) return
  ctx.save()
  ctx.globalAlpha = Math.min(1, 3 - chest.age)
  drawOceanKey(x, chest.y - 112 - Math.min(chest.age, 1) * 32, 62)
  ctx.restore()
}

function drawOceanKeyInventory() {
  if (oceanJourney?.relicCollected) {
    drawOceanSupply({ kind: 'claude-relic', age: time }, W - 282, 114)
    ctx.save()
    ctx.font = 'bold 12px sans-serif'
    ctx.fillStyle = '#713d18'
    ctx.fillText(
      player.deepFormTime > 0
        ? `Deep Claude · ${Math.ceil(player.deepFormTime)}s`
        : player.deepFormUsed
          ? '花光信物 · 本关已使用'
          : '花光信物 · L 变身 30s',
      W - 246,
      119,
    )
    ctx.restore()
    return
  }
  if (!oceanJourney?.hasKey) return
  drawOceanKey(W - 182, 136, 44)
  ctx.save()
  ctx.font = 'bold 12px sans-serif'
  ctx.fillStyle = '#123f62'
  ctx.textAlign = 'left'
  ctx.fillText('潮汐钥匙 ×1', W - 163, 119)
  ctx.restore()
}

function interactOceanPortal() {
  if (mode !== 'playing' || player.roll > 0) return
  if (isOceanArena()) {
    if (
      Math.abs(player.x - CLAUDE_PORTAL_X) > 110 ||
      Math.abs(player.y - FLOOR) > 45
    )
      return
    if (!oceanJourney.arenaCleared) {
      toast('花光之门封锁 · 先击败 Claude 娘')
      return
    }
    if (!oceanJourney.relicCollected) {
      toast('先拾取 Claude 掉落的花光信物，再前往终点')
      return
    }
    finish(true)
    updateHud()
    return
  }
  if (nearbyChest()) {
    openChest()
    return
  }
  if (
    Math.abs(player.x - OCEAN_PORTAL_X) >= 150 ||
    Math.abs(player.y - FLOOR) >= 45
  )
    return
  if (oceanJourney.portal === 'open') {
    enterOceanArena()
    return
  }
  if (oceanJourney.portal === 'unsealing') return
  if (!oceanJourney.hasKey) {
    toast('需要潮汐钥匙 · 击败全部小怪后，前往地图中央开启宝箱')
    return
  }
  oceanJourney.hasKey = false
  oceanJourney.portal = 'unsealing'
  oceanJourney.portalAge = 0
  burst(OCEAN_PORTAL_X, FLOOR - 125, '#9af5ff', 24)
  if (!sample('collect', 0.18)) tone(880, 0.2, 'sine', 0.04)
  toast('潮汐钥匙已使用 · 正在解除传送门封印')
  updateHud()
}

function updateOceanHud() {
  if (isOceanArena()) {
    $('stage-number').textContent = 'STAGE 04-2'
    $('stage-name').textContent = enemies.some(
      (e) => e.bossKind === 'claude' && e.phaseLevel === 2,
    )
      ? '花光圣殿 · Claude 娘 II'
      : '花光圣殿 · Claude 娘'
    $('stamp-title').textContent = 'THE BLOSSOM SANCTUM'
    $('stamp-stage').textContent = '04-2 — 花光圣殿'
  }
  $('weapon-status').hidden = false
  $('weapon-status').setAttribute('data-weapon', 'ocean')
  $('weapon-label').textContent =
    `大肥鲸 · J ${player.ground && Math.abs(player.y - FLOOR) < 1 ? '海浪' : '水球'} · ${player.oceanUltimate > 0 ? '大招释放中' : player.meleeCooldown > 0 ? '施法恢复中' : '就绪'}`
  $('wand-fill').style.width =
    `${Math.max(0, 1 - player.meleeCooldown / 0.86) * 100}%`
  $('special-label').textContent =
    player.oceanUltimate > 0
      ? '潮汐吸血 · 释放中'
      : player.sugar >= 100
        ? '潮汐吸血 · K 可释放'
        : `大招能量 ${Math.floor(player.sugar + 1e-8)}/100 · +2/s`
  $('special-fill').parentElement?.setAttribute('aria-label', '大肥鲸大招能量')
  if (player.deepFormTime > 0) {
    $('weapon-label').textContent = 'Deep Claude · J 花光柱 · S + J 跳劈'
    $('special-label').textContent = player.deepBlink
      ? '闪现 · 无敌中'
      : player.deepBlinkCooldown > 1e-8
        ? `闪现冷却 · ${Math.ceil(player.deepBlinkCooldown)}s`
        : '闪现 · K 可释放 · 无需能量'
    $('special-fill').style.width =
      `${(1 - player.deepBlinkCooldown / DEEP_BLINK_COOLDOWN) * 100}%`
    $('special-fill').parentElement?.setAttribute('aria-label', '闪现冷却')
  }
  $('screen-note').textContent = isOceanArena()
    ? oceanJourney.arenaCleared
      ? oceanJourney.relicCollected
        ? '花光之门已解锁 · E 完成 4-2 · L 变身 30 秒'
        : 'Claude 已击败 · 拾取花光信物，前往右侧终点 →'
      : enemies.some((e) => e.bossKind === 'claude' && e.phaseLevel === 2)
        ? '二阶段 · 三层弹幕，换层躲避；光柱仍需 Shift 翻滚！'
        : '海岸 II · BOSS 花光激柱，Shift 翻滚穿过！'
    : player.x > OCEAN_PORTAL_X - 220
      ? oceanJourney.portal === 'sealed'
        ? oceanJourney.hasKey
          ? 'E 使用潮汐钥匙 · 解除封印'
          : '潮汐之门封锁 · 需要钥匙'
        : oceanJourney.portal === 'unsealing'
          ? '潮汐之门正在破封…'
          : '潮汐之门已开启 · 进入花光圣殿 →'
      : oceanRemainingEnemies() > 0
        ? `海岸 I · 剩余 ${oceanRemainingEnemies()} 只小怪 →`
        : oceanJourney.hasKey
          ? '已获得潮汐钥匙 · 前往右侧传送门 →'
          : oceanJourney.portal !== 'sealed'
            ? '海岸 I 已清理 · 潮汐之门已开启'
            : '全部小怪已击败 · 返回地图中央开箱获得钥匙'
}
