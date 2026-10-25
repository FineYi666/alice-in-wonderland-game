/* Third stage: connected rooms, persistent exploration and the two royal bosses. */
const CLOCK_ROOMS = {
  entry: {
    name: '绯红前厅',
    width: 1650,
    top: 0,
    platforms: [
      { x: 280, y: 420, w: 180 },
      { x: 500, y: 325, w: 220 },
    ],
    chest: { x: 380, y: 420, kind: 'wand' },
    doors: [
      {
        x: 1460,
        y: 528,
        to: 'tower',
        spawn: { x: 100, y: 528 },
        label: '发条塔 ↑',
      },
      {
        x: 610,
        y: 325,
        to: 'bridge',
        spawn: { x: 120, y: 528 },
        locked: true,
        label: '时之封印',
      },
    ],
    foes: [
      { x: 720, y: 528, type: 0 },
      { x: 1130, y: 528, type: 1 },
      { x: 1360, y: 528, type: 2 },
    ],
  },
  tower: {
    name: '发条塔 · 垂直攀登',
    width: 1250,
    top: -850,
    platforms: [
      { x: 180, y: 420, w: 190 },
      { x: 400, y: 310, w: 190 },
      { x: 650, y: 200, w: 190 },
      { x: 900, y: 90, w: 190 },
      { x: 670, y: -20, w: 190 },
      { x: 420, y: -130, w: 190 },
      { x: 170, y: -240, w: 190 },
      { x: 400, y: -350, w: 200 },
      { x: 650, y: -460, w: 450 },
    ],
    doors: [
      {
        x: 100,
        y: 528,
        to: 'entry',
        spawn: { x: 1380, y: 528 },
        label: '返回绯红前厅',
      },
      {
        x: 1000,
        y: -460,
        to: 'gallery',
        spawn: { x: 120, y: 528 },
        label: '高层回廊 →',
      },
    ],
    foes: [
      { x: 300, y: 420, type: 0 },
      { x: 775, y: 200, type: 2 },
      { x: 760, y: -20, type: 1 },
      { x: 545, y: -350, type: 0 },
    ],
  },
  gallery: {
    name: '逆行回廊',
    width: 1900,
    top: 0,
    platforms: [
      { x: 430, y: 420, w: 210 },
      { x: 750, y: 335, w: 230 },
      { x: 1220, y: 420, w: 190 },
      { x: 1450, y: 310, w: 350 },
    ],
    chest: { x: 885, y: 335, kind: 'potion' },
    doors: [
      {
        x: 100,
        y: 528,
        to: 'tower',
        spawn: { x: 960, y: -460 },
        label: '发条塔 ↶',
      },
      {
        x: 1680,
        y: 310,
        to: 'vault',
        spawn: { x: 120, y: 528 },
        label: '钟心钥匙室 →',
      },
    ],
    foes: [
      { x: 600, y: 528, type: 0 },
      { x: 1000, y: 528, type: 1 },
      { x: 1530, y: 310, type: 2 },
    ],
  },
  vault: {
    name: '钟心密室',
    width: 1250,
    top: 0,
    platforms: [
      { x: 400, y: 420, w: 190 },
      { x: 620, y: 310, w: 190 },
      { x: 850, y: 200, w: 310 },
    ],
    doors: [
      {
        x: 100,
        y: 528,
        to: 'gallery',
        spawn: { x: 1620, y: 310 },
        label: '带钥匙折返 ↶',
      },
    ],
    key: { x: 1030, y: 200 },
    foes: [
      { x: 520, y: 420, type: 0 },
      { x: 720, y: 310, type: 2 },
      { x: 940, y: 200, type: 1 },
    ],
  },
  bridge: {
    name: '封印长桥',
    width: 1800,
    top: 0,
    platforms: [
      { x: 420, y: 420, w: 190 },
      { x: 650, y: 310, w: 190 },
      { x: 890, y: 200, w: 190 },
      { x: 1120, y: 310, w: 190 },
      { x: 1370, y: 420, w: 190 },
    ],
    doors: [
      {
        x: 100,
        y: 528,
        to: 'entry',
        spawn: { x: 650, y: 325 },
        label: '已开启的捷径 ↶',
      },
      {
        x: 1640,
        y: 528,
        to: 'arena',
        spawn: { x: 240, y: 528 },
        label: '双王庭 · BOSS →',
      },
    ],
    foes: [
      { x: 600, y: 528, type: 0 },
      { x: 920, y: 528, type: 1 },
      { x: 1370, y: 528, type: 2 },
    ],
  },
  arena: {
    name: '双王庭',
    width: 1800,
    top: 0,
    platforms: [],
    doors: [],
    foes: [],
  },
}
const CLOCK_MAP_ORDER = [
  'entry',
  'tower',
  'gallery',
  'vault',
  'bridge',
  'arena',
]

function makeClockEnemy(spec) {
  const p = CLOCK_ROOMS[clockJourney.room].platforms.find(
    (p) => p.y === spec.y && spec.x >= p.x && spec.x <= p.x + p.w,
  )
  return {
    ...spec,
    homeX: spec.x,
    homeY: spec.y,
    hp: spec.type === 0 ? 6 : 5,
    family: 'clock',
    phase: 0,
    hit: 0,
    shot: 1.8,
    active: false,
    patrolDir: -1,
    face: -1,
    moving: false,
    state: 'patrol',
    stateTime: 0,
    attack: 0,
    patrolMin: p ? p.x + 35 : spec.x - 105,
    patrolMax: p ? p.x + p.w - 35 : spec.x + 105,
  }
}
function makeRoyalBoss(kind, x) {
  const hp = kind === 'kurumi' ? 84 : 64
  return {
    x,
    y: FLOOR,
    homeY: FLOOR,
    hp,
    maxHp: hp,
    bossKind: kind,
    type: 3,
    phaseLevel: 1,
    phase: 0,
    hit: 0,
    shot: 2,
    active: false,
    introDone: false,
    state: 'idle',
    stateTime: 0,
    pattern: 0,
    fired: 0,
    face: -1,
  }
}
function enterClockRoom(room, spawn) {
  endTimeStop(false)
  clockJourney.portalTransition = null
  if (clockJourney.room)
    clockJourney.cache[clockJourney.room] = { enemies, drops, chests }
  clockJourney.room = room
  clockJourney.visited.add(room)
  const config = CLOCK_ROOMS[room]
  LENGTH = config.width
  platforms = config.platforms
  hazards = []
  chests = []
  bullets = []
  vines = []
  particles = []
  impacts = []
  floaters = []
  const cached = clockJourney.cache[room]
  chests =
    cached?.chests ||
    (config.chest ? [{ ...config.chest, opened: false, age: 0 }] : [])
  enemies = cached?.enemies || config.foes.map(makeClockEnemy)
  drops =
    cached?.drops ||
    config.platforms.flatMap((p) =>
      [0, 1].map((i) => ({
        x: p.x + 50 + i * 55,
        y: p.y - 38,
        base: p.y - 38,
        phase: i,
        kind: 'candy',
      })),
    )
  if (!cached && room === 'arena') enemies = [makeRoyalBoss('kurumi', 1100)]
  player.x = spawn.x
  player.y = spawn.y
  player.vy = 0
  player.vx = 0
  player.ground = true
  player.roll = 0
  player.attack = 0
  player.ranged = 0
  player.rangedLeft = 0
  player.wandPending = false
  player.slam = null
  player.dropPlatform = null
  player.jumpBuffer = 0
  player.inv = Math.max(player.inv, 1)
  player.wardTrail = []
  keys.clear()
  camera = clamp(player.x - W * 0.32, 0, LENGTH - W)
  cameraY = clamp(player.y - H * 0.74, config.top, 0)
  toast(
    config.name +
      (room === 'tower'
        ? ' · 沿台阶向上，寻找高层出口'
        : ' · M 查看路线，E 进入附近的门'),
  )
  syncStageMusic()
}
function clockInteraction() {
  if (stage !== 3 || !clockJourney) return null
  const room = CLOCK_ROOMS[clockJourney.room]
  const near = (p) =>
    Math.abs(player.x - p.x) < 78 && Math.abs(player.y - p.y) < 44
  const chest = nearbyChest()
  if (chest) return { kind: 'chest', point: chest }
  if (room.key && !clockJourney.key && near(room.key))
    return { kind: 'key', point: room.key }
  const door = room.doors.find(near)
  return door ? { kind: 'door', point: door } : null
}
function interactClock() {
  if (
    timeStop ||
    clockJourney.portalTransition ||
    mode !== 'playing' ||
    player.roll > 0
  )
    return
  const interaction = clockInteraction()
  if (!interaction) return
  const p = interaction.point
  if (interaction.kind === 'chest') {
    openChest()
    return
  } else if (interaction.kind === 'key') {
    clockJourney.key = true
    score += 600
    gainSugar(35)
    burst(p.x, p.y - 85, '#ffd48b', 28)
    toast('取得钟心钥匙！折返发条塔和前厅，开启旧路的时之封印')
    tone(880, 0.3, 'triangle', 0.06)
  } else if (p.locked && !clockJourney.key) {
    toast('时之封印锁住了 · 先登发条塔，在钟心密室取得钥匙')
  } else {
    if (p.locked && !clockJourney.unlocked) beginPortalUnseal(p)
    else enterClockRoom(p.to, p.spawn)
  }
  updateHud()
}
function beginPortalUnseal(door) {
  clockJourney.portalTransition = {
    door,
    elapsed: 0,
    opening: reducedMotion ? 0.25 : 2.4,
    fadeOut: reducedMotion ? 0.2 : 0.35,
    fadeIn: reducedMotion ? 0.2 : 0.35,
    cameraFrom: camera,
    cameraYFrom: cameraY,
    arrived: false,
    released: false,
  }
  keys.clear()
  player.vx = 0
  player.vy = 0
  player.attack = 0
  player.ranged = 0
  player.rangedLeft = 0
  player.wandPending = false
  player.slam = null
  player.dropPlatform = null
  player.jumpBuffer = 0
  clockJourney.mapOpen = false
  tone(660, 0.2, 'triangle', 0.04)
  toast('钟心钥匙已回应 · 时之封印正在解除')
}
function updatePortalUnseal(dt) {
  const transition = clockJourney.portalTransition
  transition.elapsed += dt
  const travelAt = transition.opening + transition.fadeOut
  if (!transition.arrived) {
    if (!reducedMotion) {
      // Reuse the cinematic camera's gentle approach; all combat stays frozen.
      const approach = 1 - (1 - clamp(transition.elapsed / 0.6, 0, 1)) ** 3
      const targetX = clamp(transition.door.x - W / 2, 0, LENGTH - W)
      const targetY = clamp(
        transition.door.y - H * 0.65,
        CLOCK_ROOMS[clockJourney.room].top,
        0,
      )
      camera =
        transition.cameraFrom + (targetX - transition.cameraFrom) * approach
      cameraY =
        transition.cameraYFrom + (targetY - transition.cameraYFrom) * approach
    }
    if (
      !transition.released &&
      transition.elapsed >= transition.opening * 0.65
    ) {
      transition.released = true
      tone(880, 0.25, 'sine', 0.045)
    }
    if (transition.elapsed + 1e-8 >= travelAt) {
      // Commit the shortcut only once the complete opening has been shown.
      clockJourney.unlocked = true
      transition.arrived = true
      enterClockRoom(transition.door.to, transition.door.spawn)
      clockJourney.portalTransition = transition
    }
  }
  if (transition.elapsed + 1e-8 >= travelAt + transition.fadeIn) {
    clockJourney.portalTransition = null
    toast('时之封印已解除 · 已抵达封印长桥')
  }
  updateHud()
}
function drawPortalUnseal() {
  const transition = clockJourney?.portalTransition
  if (!transition || stage !== 3) return
  const t = transition.elapsed,
    travelAt = transition.opening + transition.fadeOut
  ctx.save()
  if (!transition.arrived) {
    const envelope = clamp(t / 0.2, 0, 1)
    ctx.globalAlpha = envelope
    rect(0, 0, W, 18, '#140d19b0')
    rect(0, H - 32, W, 32, '#140d19b0')
    rect(W / 2 - 220, H - 108, 440, 52, '#21121fe0')
    ctx.textAlign = 'center'
    ctx.font = 'bold 18px serif'
    ctx.fillStyle = '#ffe6bc'
    ctx.fillText('钟心钥匙 · 时之封印', W / 2, H - 85)
    ctx.font = '12px sans-serif'
    ctx.fillStyle = '#ffd0da'
    ctx.fillText(
      t < transition.opening * 0.65 ? '锁链逐渐裂开…' : '封印解除 · 通往长桥',
      W / 2,
      H - 66,
    )
  }
  // The room changes at complete darkness, then the destination fades in.
  const fade = transition.arrived
    ? 1 - clamp((t - travelAt) / transition.fadeIn, 0, 1)
    : clamp((t - transition.opening) / transition.fadeOut, 0, 1)
  ctx.globalAlpha = fade
  rect(0, 0, W, H, '#110b17')
  ctx.restore()
}
function updateClockHud() {
  const room = clockJourney.room
  document.querySelectorAll('[data-room]').forEach((node) => {
    node.setAttribute(
      'data-state',
      node.dataset.room === room
        ? 'current'
        : clockJourney.visited.has(node.dataset.room)
          ? 'visited'
          : 'unknown',
    )
  })
  const objective =
    room === 'arena'
      ? '击败两位 BOSS · 跳跃躲弹，翻滚穿剑波'
      : !clockJourney.key
        ? '登发条塔 ↑ → 回廊 → 寻找钟心钥匙'
        : !clockJourney.unlocked
          ? '携钥匙折返 ↶ 发条塔 → 前厅封印门'
          : '封印已解开 → 穿过长桥，前往双王庭'
  $('clock-objective').textContent = clockJourney.portalTransition
    ? clockJourney.portalTransition.arrived
      ? '封印长桥 · 传送完成'
      : '时之封印 · 钟心钥匙正在解除锁链'
    : CLOCK_ROOMS[room].name + ' · ' + objective + ' · M 地图'
  $('clock-map-copy').textContent =
    '前厅 → 发条塔 ↑ → 高层回廊 → 钥匙室；取得钥匙后原路折返 ↶ 前厅高台封印门 → 长桥 → 双王庭。'
  $('clock-map-rooms').textContent = CLOCK_MAP_ORDER.map(
    (id) =>
      (id === room ? '◆ ' : clockJourney.visited.has(id) ? '✓ ' : '◇ ') +
      CLOCK_ROOMS[id].name,
  ).join('  /  ')
  const interaction = clockInteraction()
  $('chest-hint').hidden =
    !interaction || mode !== 'playing' || !!clockJourney.portalTransition
  if (interaction)
    $('chest-hint').textContent =
      interaction.kind === 'key'
        ? 'E · 取得钟心钥匙'
        : interaction.kind === 'chest'
          ? interaction.point.kind === 'wand'
            ? 'E · 开启时钟宝箱，获得糖果魔法棒'
            : 'E · 开启药水宝箱，获得 6 秒无敌药水'
          : interaction.point.locked && !clockJourney.unlocked
            ? clockJourney.key
              ? 'E · 使用钟心钥匙，解除时之封印'
              : 'E · 时之封印（需要钥匙）'
            : 'E · ' + interaction.point.label
  const bosses = enemies.filter((e) => e.type === 3 && e.hp > 0 && e.active)
  $('boss-status').hidden = !bosses.length || !!bossIntro
  const moves = {
    idle: '观察',
    recover: '收招空隙',
    windup: '枪击蓄力',
    cast: '燧发齐射',
    dash: '暗影移步',
    'stop-windup': '时停将至',
    'time-stop': '时间冻结',
    'wave-charge': '紫晶斩击蓄力 · 准备翻滚',
    wave: '紫晶斩击 · 仅翻滚可躲',
    'sword-charge': '地面剑蓄力 · 跳跃或翻滚',
    swords: '剑阵正在逼近',
  }
  $('boss-status').textContent = bosses
    .map(
      (e) =>
        BOSS_ENTRANCES[e.bossKind].name +
        ' ' +
        e.hp +
        '/' +
        e.maxHp +
        ' · ' +
        (moves[e.state] || '登场'),
    )
    .join('  |  ')
  $('screen-note').textContent =
    room === 'arena'
      ? '双王庭 · 斩击用翻滚，地面剑用跳跃或翻滚'
      : clockJourney.key
        ? '钟心钥匙 ✓ · ' +
          (clockJourney.unlocked ? '封印已解锁' : '返回前厅高台 ↶')
        : '探索 ' + clockJourney.visited.size + '/6 区域 · 向上寻找钥匙 ↑'
}
function updateClockEnemy(e, dt) {
  e.moving = false
  e.attack = Math.max(0, e.attack - dt)
  e.stateTime += dt
  // Recovery must finish even after the player jumps out of melee reach.
  if (e.state === 'attack' && e.stateTime > 0.35) e.state = 'patrol'
  if (
    e.type === 0 &&
    e.state === 'windup' &&
    e.stateTime > 0.6 &&
    !closeClockMelee(e)
  ) {
    e.state = 'patrol'
    e.shot = 1.2
    e.stateTime = 0
  }
  const close =
    Math.abs(player.x - e.x) < 340 && Math.abs(player.y - e.homeY) < 85
  if (e.type === 0 && close && Math.abs(player.x - e.x) < 135) {
    if (e.state === 'patrol') faceTarget(e, player.x)
    if (e.state === 'patrol' && e.shot <= 0) {
      e.state = 'windup'
      e.stateTime = 0
    }
    if (e.state === 'windup' && e.stateTime > 0.6) {
      if (
        !player.slam &&
        Math.abs(player.x - e.x) < 150 &&
        Math.abs(player.y - e.y) < 110
      )
        hurt()
      e.state = 'attack'
      e.stateTime = 0
      e.shot = 2
      burst(e.x + e.face * 70, e.y - 45, '#efb47a', 6)
    }
  } else if (e.state !== 'windup' && e.state !== 'attack' && e.attack <= 0) {
    if (e.x <= e.patrolMin) e.patrolDir = 1
    if (e.x >= e.patrolMax) e.patrolDir = -1
    e.face = e.patrolDir
    e.moving = true
    e.x = clamp(
      e.x + e.patrolDir * (e.type === 0 ? 50 : 67) * dt,
      e.patrolMin,
      e.patrolMax,
    )
  }
  e.y =
    e.homeY -
    (e.type === 1
      ? Math.abs(Math.sin(e.phase * 3)) * 50
      : e.type === 2
        ? Math.sin(e.phase * 3) * 12 + 14
        : 0)
  if (e.type > 0 && close && e.shot <= 0) {
    faceTarget(e, player.x)
    e.shot = e.type === 1 ? 2.4 : 2
    const a = Math.atan2(player.y - 60 - (e.y - 40), player.x - e.x)
    bullets.push({
      x: e.x,
      y: e.y - 40,
      vx: Math.cos(a) * 210,
      vy: Math.sin(a) * 210,
      life: 3,
      enemy: true,
      clockBolt: true,
      clockAttack: e.type === 1 ? 'orb' : 'spear',
      blue: e.type === 2,
      radius: 6,
    })
    e.attack = 0.3
  }
}
function closeClockMelee(e) {
  return Math.abs(player.x - e.x) < 135 && Math.abs(player.y - e.homeY) < 85
}
function summonQueen(kurumi) {
  if (enemies.some((e) => e.bossKind === 'queen')) return
  clearHostileAttacks()
  endTimeStop(false)
  setBossState(kurumi, 'idle')
  kurumi.pattern = 0
  const queen = makeRoyalBoss('queen', clamp(player.x + 480, 450, LENGTH - 350))
  enemies.push(queen)
  beginBossIntro(queen)
  $('boss-intro-number').textContent = 'PHASE II / 双王共战'
}
function beginTimeStop(e) {
  const queen = enemies.find((e) => e.bossKind === 'queen')
  if (
    timeStop ||
    ['wave-charge', 'wave', 'sword-charge', 'swords'].includes(queen?.state) ||
    bullets.some((b) => (b.royalWave || b.queenSword) && b.life > 0)
  )
    return false
  timeStop = { boss: e, elapsed: 0, duration: 1.6, shots: 0, origin: e.x }
  setBossState(e, 'time-stop')
  keys.clear()
  player.jumpBuffer = 0
  document.body?.classList.add('time-stopped')
  $('time-stop-label').hidden = false
  toast('刻刻帝 · 时间暂停！只有狂三可以行动')
  beginTimeStopCall()
  return true
}
function endTimeStop(release = true) {
  if (!release) stopTimeStopCall()
  if (timeStop && release) {
    setBossState(timeStop.boss, 'recover')
    timeStop.boss.pattern++
    const queen = enemies.find((e) => e.bossKind === 'queen')
    if (queen?.state === 'idle') queen.stateTime = 0
    player.inv = Math.max(player.inv, 0.35)
    keys.clear()
    toast('时间恢复 · 翻滚躲开延迟枪弹！')
    tone(880, 0.18, 'sine', 0.06)
  }
  timeStop = null
  document.body?.classList.remove('time-stopped')
  $('time-active-layer').hidden = true
  $('time-stop-label').hidden = true
}
function updateTimeStop(dt) {
  const stop = timeStop,
    e = stop.boss
  stop.elapsed += dt
  e.stateTime += dt
  e.phase += dt
  const destination = clamp(
    player.x + (stop.origin < player.x ? -220 : 220),
    280,
    LENGTH - 290,
  )
  e.x =
    stop.origin + (destination - stop.origin) * clamp(stop.elapsed / 0.65, 0, 1)
  e.face = Math.sign(player.x - e.x) || -1
  while (stop.shots < 4 && stop.elapsed > 0.5 + stop.shots * 0.24) {
    const a = Math.atan2(
      player.y - 65 + (stop.shots - 1.5) * 19 - (e.y - 73),
      player.x - e.x,
    )
    bullets.push({
      x: e.x + e.face * 45,
      y: e.y - 73,
      vx: Math.cos(a) * 335,
      vy: Math.sin(a) * 335,
      life: 3,
      enemy: true,
      clockBolt: true,
      timeShot: true,
      kurumiShot: true,
      radius: 7,
      arm: 0.15,
    })
    stop.shots++
    voice(680, 160, 0.1, 'triangle', 0.06)
  }
  $('time-stop-label').textContent =
    '刻刻帝 · 时间停止 ' +
    Math.max(0, stop.duration - stop.elapsed).toFixed(1) +
    's'
  updateHud()
  if (stop.elapsed >= stop.duration) endTimeStop()
}
function royalVolley(e) {
  const ox = e.x + e.face * 55,
    oy = e.y - 74
  const aim = Math.atan2(player.y - 55 - oy, player.x - ox)
  for (let i = 0; i < 3; i++) {
    const a = aim + (i - 1) * 0.15
    bullets.push({
      x: ox,
      y: oy,
      vx: Math.cos(a) * 285,
      vy: Math.sin(a) * 285,
      life: 3,
      enemy: true,
      clockBolt: true,
      kurumiShot: true,
      radius: 6,
    })
  }
  burst(ox, oy, '#f79975', 10)
  voice(160, 70, 0.12, 'triangle', 0.08)
  crunch(0.08, 0.09, 900)
}
function releaseRoyalWave(e) {
  const origin = e.x + e.face * 95
  bullets.push({
    x: origin,
    y: FLOOR - 150,
    vx: e.face * 480,
    vy: 0,
    life: 3.4,
    enemy: true,
    royalWave: true,
    age: 0,
    radius: 85,
    origin,
    owner: e,
    hitPlayer: false,
  })
  shake = reducedMotion ? 0 : 8
  impacts.push({
    x: e.x,
    y: e.y - 80,
    life: 0.55,
    max: 0.55,
    radius: 90,
    color: '#d9adff',
  })
  voice(1800, 150, 0.5, 'triangle', 0.14)
  crunch(0.45, 0.14, 1700)
  toast('紫晶斩击 · 翻滚穿过，跳跃无法躲避')
}
function releaseQueenSwords(e) {
  if (e.fired === 0) e.swordX = e.x + e.face * 145
  else
    e.swordX +=
      Math.sign(player.x - e.swordX) *
      Math.min(96, Math.abs(player.x - e.swordX))
  e.swordX = clamp(e.swordX, 90, LENGTH - 90)
  bullets.push({
    x: e.swordX,
    y: FLOOR,
    vx: 0,
    vy: 0,
    age: 0,
    life: 0.82,
    enemy: true,
    queenSword: true,
    owner: e,
    hitPlayer: false,
  })
  e.fired++
  voice(850, 1600, 0.12, 'triangle', 0.065)
}
function queenSwordVisual(b) {
  const age = b.age || 0
  const warning = age < 0.28
  const progress = clamp((age - 0.28) / 0.5, 0, 1)
  const index = Math.min(7, Math.floor(progress * 8))
  return {
    warning,
    active: !warning && age < 0.78 && index > 0 && index < 7,
    index,
    height:
      assets.queenSwords?.heights?.[index] ??
      [30, 45, 75, 112, 116, 110, 80, 25][index],
    width: 100,
  }
}
function queenSlashVisual(b) {
  const img = assets.queenSlash?.[0]?.img
  const height = 300
  return {
    height,
    width: height * (img ? img.width / img.height : 2),
    alpha: clamp(b.life / 0.2, 0, 1),
  }
}

function updateClockBoss(e, dt) {
  e.stateTime += dt
  const queen = e.bossKind === 'queen'
  if (e.state === 'idle') {
    e.face = Math.sign(player.x - e.x) || -1
    if (e.stateTime > (queen ? 2.2 : e.phaseLevel === 2 ? 1.15 : 1.4)) {
      if (queen) {
        const other = enemies.find((b) => b.bossKind === 'kurumi')
        if ((other && !['idle', 'recover'].includes(other.state)) || timeStop)
          return
        if (bullets.some((b) => (b.royalWave || b.queenSword) && b.life > 0))
          return
        setBossState(e, e.pattern % 2 ? 'sword-charge' : 'wave-charge')
        toast(
          e.pattern % 2
            ? '白之女王 · 地面剑将逐簇逼近！跳跃或翻滚躲避'
            : '白之女王 · 紫晶斩击蓄力！留好翻滚，跳跃无法躲避',
        )
        voice(300, 1100, 0.8, 'sine', 0.055)
      } else if (
        enemies.some(
          (b) =>
            b.bossKind === 'queen' &&
            ['wave-charge', 'wave', 'sword-charge', 'swords'].includes(b.state),
        )
      )
        return
      else if (e.pattern % 3 === 1) {
        if (
          enemies.some(
            (b) => b.bossKind === 'queen' && b.state === 'wave-charge',
          ) ||
          bullets.some((b) => b.royalWave || b.queenSword)
        )
          return
        setBossState(e, 'stop-windup')
        toast('狂三 · 时停将至，调整位置！时间恢复后立即躲枪弹')
      } else {
        setBossState(e, 'windup')
        toast('狂三 · 燧发齐射，跳跃或翻滚躲避')
      }
    }
  } else if (e.state === 'stop-windup') {
    if (e.stateTime > 1.15) beginTimeStop(e)
  } else if (e.state === 'windup') {
    if (e.stateTime > 0.75)
      setBossState(e, e.pattern % 3 === 2 ? 'dash' : 'cast')
  } else if (e.state === 'cast') {
    if (!e.fired && e.stateTime > 0.15) {
      royalVolley(e)
      e.fired = 1
    }
    if (e.stateTime > 0.8) setBossState(e, 'recover')
  } else if (e.state === 'dash') {
    e.x = clamp(e.x + e.face * 320 * dt, 250, LENGTH - 300)
    if (e.stateTime > 0.5) setBossState(e, 'recover')
  } else if (e.state === 'wave-charge') {
    if (e.stateTime > 1.2) {
      setBossState(e, 'wave')
      releaseRoyalWave(e)
    }
  } else if (e.state === 'wave') {
    if (e.stateTime > 0.7) setBossState(e, 'recover')
  } else if (e.state === 'sword-charge') {
    if (e.stateTime > 0.75) {
      setBossState(e, 'swords')
      releaseQueenSwords(e)
    }
  } else if (e.state === 'swords') {
    while (e.fired < 6 && e.stateTime >= e.fired * 0.7) releaseQueenSwords(e)
    if (e.stateTime > 4.35) setBossState(e, 'recover')
  } else if (e.state === 'recover' && e.stateTime > (queen ? 1.2 : 0.9)) {
    e.pattern++
    setBossState(e, 'idle')
  }
}
function royalPose(e) {
  if (e.bossKind === 'queen') {
    if (e.state === 'wave-charge') return 1
    if (e.state === 'wave') return e.stateTime < 0.3 ? 2 : 3
    if (e.state === 'sword-charge') return 5
    if (e.state === 'swords') return 6
    if (e.state === 'recover') return e.stateTime < 0.4 ? 4 : 7
    return 0
  }
  if (e.state === 'stop-windup') return 2
  if (e.state === 'time-stop') return 7 + (Math.floor(e.stateTime * 8) % 5)
  if (e.state === 'cast') return 7 + Math.min(4, Math.floor(e.stateTime * 7))
  if (e.state === 'windup') return 3
  if (e.state === 'dash') return 5
  return Math.floor(e.phase * 3) % 2
}
function drawClockSprite(e, x, y, target = ctx) {
  const boss = e.type === 3
  const frames = boss ? assets[e.bossKind] : assets.clockEnemies
  if (!frames) return
  const pose = boss
    ? royalPose(e)
    : e.type * 3 +
      (e.state === 'windup' || e.state === 'attack' || e.attack > 0
        ? 2
        : Math.floor(e.phase * 5) % 2)
  const f = frames[pose]
  const h = boss ? 158 : e.type === 1 ? 75 : 85
  const basis = boss
    ? frames.bodyHeight || frames[0].h
    : Math.max(...frames.slice(e.type * 3, e.type * 3 + 3).map((f) => f.h))
  const scale = h / basis
  target.save()
  target.translate(x, y)
  // Kurumi faces right; the new queen and clock creatures face left.
  if (boss ? (e.bossKind === 'queen' ? e.face > 0 : e.face < 0) : e.face > 0)
    target.scale(-1, 1)
  if (e.hit > 0) target.filter = 'brightness(1.6)'
  target.drawImage(
    f.img,
    f.x,
    f.y,
    f.w,
    f.h,
    (f.x - f.anchor) * scale,
    (boss && e.bossKind !== 'queen' ? -f.h : f.y - (f.bottom ?? f.y + f.h)) *
      scale,
    f.w * scale,
    f.h * scale,
  )
  target.restore()
}
function clockDial(x, y, r, color, t = 0) {
  ctx.save()
  ctx.translate(x, y)
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  for (const radius of [r, r * 0.88, r * 0.66]) {
    ctx.beginPath()
    ctx.arc(0, 0, radius, 0, Math.PI * 2)
    ctx.stroke()
  }
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6
    ctx.beginPath()
    ctx.moveTo(Math.cos(a) * r * 0.73, Math.sin(a) * r * 0.73)
    ctx.lineTo(Math.cos(a) * r * 0.85, Math.sin(a) * r * 0.85)
    ctx.stroke()
  }
  ctx.rotate(t)
  ctx.beginPath()
  ctx.moveTo(-r * 0.12, 0)
  ctx.lineTo(0, 0)
  ctx.lineTo(r * 0.57, -r * 0.38)
  ctx.stroke()
  ctx.restore()
}
function drawClockMonster(e, x, y) {
  if (e.type === 3) drawRoyalMagic(e, x, y)
  else if (e.type === 0 && ['windup', 'attack'].includes(e.state)) {
    const charging = e.state === 'windup',
      progress = charging
        ? clamp(e.stateTime / 0.6, 0, 1)
        : 1 - clamp(e.stateTime / 0.35, 0, 1)
    drawAttackArt(assets.clockKnightSlash, x + e.face * 65, y - 48, 142, {
      height: 91,
      face: e.face,
      angle: reducedMotion ? 0 : e.face * e.stateTime * (charging ? 1 : 5),
      alpha: charging ? progress * 0.35 : progress,
    })
  }
  drawClockSprite(e, x, y)
  if (e.type !== 3) {
    if (e.state === 'windup') {
      ellipse(x, y - 5, 75, 8, '#e9aa5e42')
      star(x + e.face * 90, y - 65, 8, '#ffcb89')
    }
    return
  }
  if (e.bossKind === 'queen') return
  if (
    e.state === 'stop-windup' ||
    (e.state === 'time-stop' && !assets.timeStopClock)
  )
    clockDial(
      x,
      y - 80,
      110 + Math.sin(e.stateTime * 5) * 5,
      '#ffc080',
      reducedMotion ? 0 : e.stateTime * 2,
    )
}

function drawRoyalMagic(e, x, y) {
  if (e.bossKind === 'queen') return
  if (['windup', 'cast', 'stop-windup', 'time-stop'].includes(e.state)) {
    const progress =
      e.state === 'windup'
        ? clamp(e.stateTime / 0.75, 0, 1)
        : e.state === 'stop-windup'
          ? clamp(e.stateTime / 1.15, 0, 1)
          : 1
    drawAttackArt(
      assets.kurumiShotEffect,
      x + e.face * 58,
      y - 74,
      135 + progress * 75,
      {
        face: e.face,
        anchorX: 0.9,
        alpha:
          e.state === 'cast' ? Math.max(0, 0.85 - e.stateTime) : progress * 0.6,
      },
    )
  }
}
function drawRoyalWave(b) {
  const f = assets.queenSlash?.[0]
  if (!f) return
  const visual = queenSlashVisual(b)
  ctx.save()
  ctx.translate(b.x - camera, b.y)
  // The complete artwork faces right; mirror it for a leftward attack.
  if (b.vx < 0) ctx.scale(-1, 1)
  ctx.globalAlpha = visual.alpha
  ctx.drawImage(
    f.img,
    0,
    0,
    f.img.width,
    f.img.height,
    -visual.width + (b.radius || 85),
    -visual.height / 2,
    visual.width,
    visual.height,
  )
  ctx.restore()
}

function drawQueenSwords(b) {
  const visual = queenSwordVisual(b),
    x = b.x - camera
  if (visual.warning) {
    const progress = clamp(b.age / 0.28, 0, 1)
    ellipse(x, FLOOR - 3, visual.width / 2, 7, '#cc9eff55')
    rect(x - visual.width / 2, FLOOR - 4, visual.width, 3, '#efc5ff')
    for (const dx of [-52, 0, 52])
      star(x + dx, FLOOR - 14, 5 + progress * 3, '#ffe4aa')
    return
  }
  const frames = assets.queenSwords,
    f = frames?.[visual.index]
  if (!f) return
  const scale = frames.scale
  ctx.save()
  ctx.translate(x, FLOOR)
  ctx.globalAlpha = clamp(b.life / 0.07, 0, 1)
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
}
function drawClockProjectile(b) {
  const spear = b.clockAttack === 'spear',
    face = Math.sign(b.vx) || 1,
    direction = Math.atan2(b.vy, b.vx)
  drawAttackArt(
    b.blue
      ? assets.clockBlueShot
      : spear
        ? assets.clockGhostSpear
        : assets.clockMothOrb,
    b.x - camera,
    b.y,
    b.blue ? 96 : spear ? 108 : 76,
    {
      face,
      angle: direction - (face < 0 ? Math.PI : 0),
      anchorX: b.blue ? 0.88 : spear ? 0.92 : 0.7,
      anchorY: b.blue ? 0.54 : 0.5,
    },
  )
}
function drawClockScenery() {
  const room = CLOCK_ROOMS[clockJourney.room]
  if (clockJourney.room === 'tower') {
    for (let y = 350; y > -700; y -= 240) {
      const x = 620 - camera
      rect(x - 30, y - 130, 60, 330, '#1c1824bb')
      rect(x - 2, y - 130, 4, 330, '#a1664155')
      clockDial(x, y, 84, '#cd965949', reducedMotion ? 0 : time * 0.16)
    }
  }
  for (const p of platforms) {
    if (p.x + p.w < camera || p.x > camera + W) continue
    drawClockPlatform(p)
  }
  const base = { x: 0, y: FLOOR, w: LENGTH, base: true }
  drawClockPlatform(base)
  for (const door of room.doors) {
    drawClockPortal(door, door.locked && !clockJourney.unlocked)
  }
  if (room.key && !clockJourney.key) {
    const { x: wx, y } = room.key,
      x = wx - camera
    const bob = reducedMotion ? 0 : Math.sin(time * 2.5) * 4
    ellipse(x, y - 66, 42, 64, '#d9325130')
    drawAttackArt(assets.clockKey, x, y - 67 + bob, 84, { height: 116 })
    for (let i = 0; i < 5; i++)
      star(x + Math.sin(time + i) * 38, y - 25 - i * 17, 3, '#fbe5b0')
    ctx.font = 'bold 13px sans-serif'
    ctx.fillStyle = '#fff1cb'
    ctx.fillText('钟心钥匙 · E', x, y - 132)
  }
  if (clockJourney.room === 'arena' && !drawGoalPortal()) {
    const sealed = enemies.some((e) => e.type === 3 && e.hp > 0)
    drawClockPortal(
      {
        x: LENGTH - 230,
        y: FLOOR,
        label: sealed ? '击败双王 · 解除封印' : '冒险终点 →',
      },
      sealed,
    )
  }
}

// The source hand angles are out of order; play one clockwise clock cycle.
const BOSS_PORTAL_CYCLE = [0, 15, 1, 2, 3, 14, 4, 6, 8, 9, 7, 10, 12, 5, 11, 13]
function drawClockPortal(door, locked = false) {
  const x = door.x - camera,
    y = door.y
  if (x < -150 || x > W + 150) return
  const bossDoor = door.to === 'arena'
  const keySealed = locked && door.locked
  const keyOpen = door.locked && !locked
  const transition = clockJourney?.portalTransition
  const opening =
    transition && !transition.arrived && transition.door === door
      ? transition
      : null
  const animated = bossDoor && !reducedMotion && assets.bossPortalFrames
  const frames =
    opening || keyOpen
      ? assets.portalUnseal
      : keySealed
        ? assets.sealedPortal
        : animated
          ? assets.bossPortalFrames
          : bossDoor
            ? assets.bossPortal
            : assets.clockPortal
  const pose = opening
    ? reducedMotion
      ? opening.elapsed < opening.opening / 2
        ? 0
        : 7
      : Math.min(7, Math.floor((opening.elapsed / opening.opening) * 8))
    : keyOpen
      ? reducedMotion
        ? 7
        : 6 + (Math.floor(time * 4) % 2)
      : animated
        ? BOSS_PORTAL_CYCLE[Math.floor(time * 8) % BOSS_PORTAL_CYCLE.length]
        : 0
  const frame = frames?.[pose]
  const height = bossDoor ? 250 : 208
  if (y - cameraY < -20 || y - height - cameraY > H) return
  const motion = reducedMotion ? 0 : time
  ctx.save()
  ellipse(
    x,
    y - height * 0.42,
    bossDoor ? 72 : 50,
    height * 0.35,
    keySealed || keyOpen
      ? '#ed345035'
      : locked
        ? '#b8904930'
        : bossDoor
          ? '#ed34502b'
          : '#7588ff22',
  )
  if (frame) {
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    const paint = (set, f, opacity) => {
      const scale = height / set.height,
        baseline = set.baseline ?? f.bottom
      ctx.globalAlpha = opacity
      ctx.drawImage(
        f.img,
        f.x,
        f.y,
        f.w,
        f.h,
        x + (f.x - f.anchor) * scale,
        y + (f.y - baseline) * scale,
        f.w * scale,
        f.h * scale,
      )
    }
    if (opening && opening.elapsed < 0.2) {
      paint(
        assets.sealedPortal,
        assets.sealedPortal[0],
        1 - opening.elapsed / 0.2,
      )
      paint(frames, frame, opening.elapsed / 0.2)
    } else paint(frames, frame, locked && !keySealed ? 0.78 : 1)
    ctx.globalAlpha = 1
  } else {
    ellipse(x, y - 72, 45, 70, '#2d2345dc')
    clockDial(x, y - 72, 36, '#aeceff')
  }
  if (locked && !keySealed) {
    ctx.strokeStyle = '#d6ad68'
    ctx.lineWidth = 3
    for (const direction of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(x - 38, y - 122 + direction * 24)
      ctx.lineTo(x + 38, y - 122 - direction * 24)
      ctx.stroke()
    }
    rect(x - 14, y - 137, 28, 32, '#271b30e0')
    ctx.font = '25px serif'
    ctx.textAlign = 'center'
    ctx.fillStyle = '#ffe0a0'
    ctx.fillText('⚿', x, y - 113)
  } else if (!locked) {
    ctx.globalCompositeOperation = 'lighter'
    const pulse = reducedMotion ? 0.25 : 0.23 + Math.sin(motion * 2.4) * 0.06
    ctx.globalAlpha = pulse
    ellipse(
      x,
      y - height * 0.36,
      bossDoor ? 44 : 28,
      bossDoor ? 68 : 49,
      bossDoor || keyOpen ? '#ff3c65' : '#75b8ff',
    )
    ctx.globalAlpha = 0.7
    for (let i = 0; i < (reducedMotion ? 2 : 6); i++) {
      const phase = motion * (bossDoor ? 0.7 : 0.4) + i * 2.399
      const radius = bossDoor ? 53 : 31
      star(
        x + Math.sin(phase) * radius,
        y - 30 - ((motion * 21 + i * 29) % (height * 0.62)),
        i % 2 ? 2 : 3,
        bossDoor || keyOpen ? '#ffb2b9' : '#bddeff',
        phase,
      )
    }
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 1
  }
  ctx.font = 'bold 12px sans-serif'
  ctx.textAlign = 'center'
  ctx.strokeStyle = '#17121fe8'
  ctx.lineWidth = 4
  ctx.fillStyle = locked
    ? '#ffd58d'
    : bossDoor || keyOpen
      ? '#ffc5c8'
      : '#d3e4ff'
  const label = opening
    ? '时之封印 · 解封中'
    : keyOpen
      ? '时之门 → 封印长桥'
      : door.label
  ctx.strokeText(label, x, y + 17)
  ctx.fillText(label, x, y + 17)
  ctx.restore()
}
function drawClockPlatform(p) {
  if (!p.base && drawStagePlatform(p, 3)) return
  const x = p.x - camera,
    y = p.y
  rect(x, y, p.w, p.base ? 95 : 30, '#201b29')
  rect(x, y - 7, p.w, 9, '#795740')
  rect(x, y - 7, p.w, 2, '#e6b879')
  for (let i = 0; i < p.w; i += 48) {
    rect(x + i + 3, y + 7, 43, 15, '#4c3d40')
    rect(x + i + 5, y + 8, 38, 2, '#786055')
    rect(x + i + 18, y + 25, 28, p.base ? 35 : 7, '#302735')
    if (i % 144 === 0) {
      rect(x + i + 9, y + 1, 3, 18, '#b49363')
      star(x + i + 11, y + 18, 3, '#cfac6b')
    }
  }
}
function drawClockScreenEffects() {
  if (stage !== 3) return
  if (bossIntro?.boss.bossKind === 'queen') {
    const t = bossIntro.elapsed,
      x = bossIntro.boss.x - camera
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    const radius = 90 + Math.sin(t * 3) * 10
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = i % 2 ? '#94caff' : '#c5b7ff'
      ctx.lineWidth = 4 - i * 0.6
      ctx.beginPath()
      ctx.ellipse(x, 100, radius + i * 12, 24 + i * 8, 0, 0, Math.PI * 2)
      ctx.stroke()
    }
    rect(x - 3, 100, 6, 300 * clamp(t / 1.2, 0, 1), '#d5f7ff66')
    for (let i = 0; i < 16; i++)
      star(
        x + Math.sin(t * 2 + i) * 100,
        85 + ((i * 43 + t * 85) % 330),
        4,
        '#cbe8ff',
      )
    ctx.restore()
  }
  const layer = $('time-active-layer')
  if (!timeStop || !canvas.getBoundingClientRect) return
  const r = canvas.getBoundingClientRect()
  layer.hidden = false
  layer.style.left = r.left + 'px'
  layer.style.top = r.top + 'px'
  layer.style.width = r.width + 'px'
  layer.style.height = r.height + 'px'
  const c = layer.getContext('2d')
  c.clearRect(0, 0, W, H)
  c.imageSmoothingEnabled = false
  // This canvas is outside the grayscale world. Both Zafkiel and Kurumi
  // remain crimson while Alice, the Queen and the staged bullets are frozen.
  drawTimeStopClock(timeStop, c)
  drawClockSprite(
    timeStop.boss,
    timeStop.boss.x - camera,
    timeStop.boss.y - cameraY,
    c,
  )
  // Screen-space health frames stay in front of the summoned clock.
  drawBossBars(c)
}

function timeStopClockVisual(stop) {
  const leaving = clamp((stop.duration - stop.elapsed) / 0.22, 0, 1)
  // The supplied cells turn the hands. Keep the dial upright and fixed in
  // size, centered behind Kurumi rather than behind the screen's midpoint.
  return {
    size: 360,
    alpha: clamp(stop.elapsed / 0.12, 0, 1) * leaving * 0.9,
    index: reducedMotion
      ? 0
      : Math.min(7, Math.floor(clamp(stop.elapsed / stop.duration, 0, 1) * 8)),
  }
}
function drawTimeStopClock(stop, target = ctx) {
  const visual = timeStopClockVisual(stop),
    frame = assets.timeStopClock?.[visual.index]
  if (!frame) return
  target.save()
  target.translate(stop.boss.x - camera, stop.boss.y - cameraY - 170)
  target.globalAlpha = visual.alpha * (mode === 'paused' ? 0.25 : 1)
  target.imageSmoothingEnabled = true
  target.drawImage(
    frame.img,
    0,
    0,
    frame.img.width,
    frame.img.height,
    -visual.size / 2,
    -visual.size / 2,
    visual.size,
    visual.size,
  )
  target.restore()
}
