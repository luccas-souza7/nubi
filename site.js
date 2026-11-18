// Nubi
// 1) Preenche preço, links e contato a partir do config.js (window.NUBI_CONFIG).
// 2) Demonstração do entalho na tela do "PC": abertura animada + comandos de verdade.
// 3) Personalização, voz de exemplo e barra de compra no celular.
;(function () {
  'use strict'

  var cfg = window.NUBI_CONFIG || {}
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // ---------------------------------------------------------------------------
  // Configuração
  // ---------------------------------------------------------------------------
  function $(sel, root) {
    return (root || document).querySelector(sel)
  }
  function $$(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel))
  }

  $$('[data-price]').forEach(function (el) {
    if (cfg.preco) el.textContent = cfg.preco
  })
  $$('[data-price-from]').forEach(function (el) {
    if (cfg.precoDe) {
      el.textContent = 'de '
      var s = document.createElement('s')
      s.textContent = cfg.precoDe
      el.appendChild(s)
      el.appendChild(document.createTextNode(' por'))
    } else el.remove()
  })
  $$('[data-buy]').forEach(function (el) {
    if (cfg.linkCompra) {
      el.href = cfg.linkCompra
      el.rel = 'noopener'
    }
  })
  $$('[data-support]').forEach(function (el) {
    el.textContent = ''
    var links = []
    if (cfg.emailSuporte) {
      var a = document.createElement('a')
      a.href = 'mailto:' + cfg.emailSuporte
      a.textContent = cfg.emailSuporte
      links.push(a)
    }
    if (cfg.whatsappSuporte) {
      var w = document.createElement('a')
      w.href = 'https://wa.me/' + String(cfg.whatsappSuporte).replace(/\D/g, '')
      w.target = '_blank'
      w.rel = 'noopener'
      w.textContent = 'WhatsApp'
      links.push(w)
    }
    links.forEach(function (link, i) {
      if (i) el.appendChild(document.createTextNode(' ou '))
      el.appendChild(link)
    })
  })
  var year = $('#year')
  if (year) year.textContent = String(new Date().getFullYear())

  // ---------------------------------------------------------------------------
  // Utilidades
  // ---------------------------------------------------------------------------
  function wait(ms) {
    return new Promise(function (r) {
      setTimeout(r, ms)
    })
  }
  function pad(n) {
    return String(n).padStart(2, '0')
  }
  function hhmm(d) {
    return pad(d.getHours()) + ':' + pad(d.getMinutes())
  }
  function mmss(ms) {
    var s = Math.max(0, Math.ceil(ms / 1000))
    var h = Math.floor(s / 3600)
    var m = Math.floor((s % 3600) / 60)
    return (h ? h + ':' + pad(m) : pad(m)) + ':' + pad(s % 60)
  }
  function sameDay(a, b) {
    return a.toDateString() === b.toDateString()
  }
  function dayLabel(d) {
    var now = new Date()
    if (sameDay(d, now)) return 'hoje'
    var t = new Date(now)
    t.setDate(t.getDate() + 1)
    if (sameDay(d, t)) return 'amanhã'
    return d.toLocaleDateString('pt-BR', { weekday: 'long' })
  }
  // Remove acentos mantendo o mesmo comprimento (texto em NFC), para recortar o original pelos índices.
  function fold(s) {
    return s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
  }
  function capFirst(s) {
    return s.charAt(0).toUpperCase() + s.slice(1)
  }
  function tidy(s) {
    return s
      .replace(/\s+/g, ' ')
      .replace(/^[\s,.:;-]+|[\s,.:;!?-]+$/g, '')
      .trim()
  }

  // Números por extenso (sem acento, já "dobrados").
  var UNITS = {
    zero: 0, um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9,
    dez: 10, onze: 11, doze: 12, treze: 13, quatorze: 14, catorze: 14, quinze: 15, dezesseis: 16, dezessete: 17,
    dezoito: 18, dezenove: 19, vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, sessenta: 60
  }
  var NUM =
    '(?:\\d{1,3}|(?:(?:vinte|trinta|quarenta|cinquenta)(?: e (?:uma|um|dois|duas|tres|quatro|cinco|seis|sete|oito|nove))?' +
    '|dezesseis|dezessete|dezoito|dezenove|quatorze|catorze|quinze|treze|doze|onze|dez|sessenta' +
    '|zero|uma|um|dois|duas|tres|quatro|cinco|seis|sete|oito|nove)(?![a-z]))'
  function num(w) {
    if (w == null) return NaN
    w = w.trim()
    if (/^\d+$/.test(w)) return parseInt(w, 10)
    var parts = w.split(' e ')
    var v = 0
    for (var i = 0; i < parts.length; i++) {
      if (!(parts[i] in UNITS)) return NaN
      v += UNITS[parts[i]]
    }
    return v
  }

  // Duração: "20 minutos", "meia hora", "uma hora e meia", "30 segundos".
  var DUR = new RegExp(
    '(' + NUM + '|meia)\\s*(segundos?|seg|s|minutos?|min|m|horas?|h)(?![a-z])(?:\\s+e\\s+(meia|' + NUM + '\\s*(?:minutos?|min)))?'
  )
  function durationMs(m) {
    var n = m[1] === 'meia' ? 0.5 : num(m[1])
    if (isNaN(n)) return 0
    var unit = m[2]
    var ms = /^h/.test(unit) ? n * 3600000 : /^s/.test(unit) ? n * 1000 : n * 60000
    if (m[3]) {
      if (m[3] === 'meia') ms += /^h/.test(unit) ? 1800000 : 30000
      else ms += num(m[3].replace(/\s*(minutos?|min)$/, '')) * 60000 || 0
    }
    return ms
  }
  function durationText(ms) {
    var min = Math.round(ms / 60000)
    if (ms < 60000) return Math.round(ms / 1000) + ' segundos'
    if (min % 60 === 0) {
      var h = min / 60
      return h === 1 ? '1 hora' : h + ' horas'
    }
    if (min > 60) return Math.floor(min / 60) + 'h' + pad(min % 60)
    return min === 1 ? '1 minuto' : min + ' minutos'
  }

  // Quando: devolve { date, spans: [[ini, fim], ...] } ou null.
  function parseWhen(t) {
    var now = new Date()
    var spans = []
    var rel = new RegExp('\\b(?:daqui a|daqui|em|dentro de)\\s+' + DUR.source).exec(t)
    if (rel) {
      var ms = durationMs(rel)
      if (ms > 0) {
        spans.push([rel.index, rel.index + rel[0].length])
        return { date: new Date(now.getTime() + ms), spans: spans, relative: ms }
      }
    }

    var dayOffset = null
    var day = /\b(depois de amanha|amanha|hoje)\b/.exec(t)
    if (day) {
      dayOffset = day[1] === 'hoje' ? 0 : day[1] === 'amanha' ? 1 : 2
      spans.push([day.index, day.index + day[0].length])
    }

    var h = null
    var min = 0
    var period = null
    var special = /\b(?:ao |a |as )?(meio-? ?dia|meia-? ?noite)(?: e meia)?/.exec(t)
    var abs = new RegExp(
      '\\b(?:para as|pras|as|a|ao)\\s+(' + NUM + ')(?:\\s*(?:h|horas?|:)\\s*(\\d{2})?)?' +
        '(?:\\s+e\\s+(meia|quinze|' + NUM + ')(?:\\s*min(?:utos?)?)?)?' +
        '(?:\\s+(da manha|da tarde|da noite|da madrugada))?'
    ).exec(t)
    var bare = /\b(\d{1,2})(?:h|:)(\d{2})?(?![a-z0-9])/.exec(t)
    if (special) {
      h = /meio/.test(special[1]) ? 12 : 0
      if (/e meia$/.test(special[0])) min = 30
      spans.push([special.index, special.index + special[0].length])
    } else if (abs && !isNaN(num(abs[1]))) {
      h = num(abs[1])
      if (abs[2]) min = parseInt(abs[2], 10)
      else if (abs[3]) min = abs[3] === 'meia' ? 30 : num(abs[3]) || 0
      period = abs[4] || null
      spans.push([abs.index, abs.index + abs[0].length])
    } else if (bare) {
      h = parseInt(bare[1], 10)
      min = bare[2] ? parseInt(bare[2], 10) : 0
      spans.push([bare.index, bare.index + bare[0].length])
    }
    if (h === null) {
      if (dayOffset) {
        h = 9 // "amanhã" sem hora: de manhã
      } else return null
    }
    if (period && /tarde|noite/.test(period) && h < 12) h += 12
    if (h > 23 || min > 59) return null

    var d = new Date(now)
    d.setSeconds(0, 0)
    d.setHours(h, min)
    if (dayOffset) d.setDate(d.getDate() + dayOffset)
    else if (d <= now) {
      // "às 3" às 14h: provavelmente 15h.
      if (!period && h < 12 && new Date(d.getTime() + 12 * 3600000) > now && h + 12 <= 23) d.setHours(h + 12)
      else d.setDate(d.getDate() + 1)
    }
    return { date: d, spans: spans }
  }

  function cut(orig, spans) {
    var s = orig
    spans
      .slice()
      .sort(function (a, b) {
        return b[0] - a[0]
      })
      .forEach(function (sp) {
        s = s.slice(0, sp[0]) + ' ' + s.slice(sp[1])
      })
    return s
  }

  var SITES = {
    youtube: 'YouTube', whatsapp: 'WhatsApp Web', 'whats': 'WhatsApp Web', calculadora: 'Calculadora',
    'bloco de notas': 'Bloco de Notas', gmail: 'Gmail', google: 'Google', spotify: 'Spotify', netflix: 'Netflix',
    instagram: 'Instagram', explorador: 'Explorador de Arquivos', configuracoes: 'Configurações', paint: 'Paint'
  }

  // ---------------------------------------------------------------------------
  // Estado da demonstração
  // ---------------------------------------------------------------------------
  var state = { lembretes: [], tarefas: [], notas: [], memoria: [] }
  var seq = 0

  // Cérebro da demo: devolve { text, face, tab? }
  function respond(input) {
    var orig = input.normalize('NFC').trim()
    var t = fold(orig)
    var now = new Date()
    var m

    if (!t) return { text: 'Pode escrever, estou ouvindo o teclado.', face: 'piscando' }

    if (/^(oi|ola|opa|e ai|eai|hey|bom dia|boa tarde|boa noite)\b/.test(t) && t.length < 24)
      return { text: 'Oi! Quer um lembrete, um timer ou uma nota?', face: 'feliz' }
    if (/\b(obrigad|valeu|brigad)/.test(t)) return { text: 'Por nada! Tô sempre aqui em cima.', face: 'apaixonado' }

    if (/\b(que horas|quantas horas|hora agora|horas sao)\b/.test(t))
      return { text: 'Agora são ' + hhmm(now) + '.', face: 'feliz' }
    if (/\b(que dia|data de hoje|dia e hoje|que data|dia de hoje)\b/.test(t))
      return {
        text: 'Hoje é ' + now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }) + '.',
        face: 'feliz'
      }

    if ((m = /\b(lembretes|alarmes|tarefas|notas)\b/.exec(t)) && /\b(quais|qual|lista|liste|mostra|mostre|tenho|ver)\b/.test(t)) {
      var key = m[1] === 'alarmes' ? 'lembretes' : m[1]
      var arr = state[key].filter(function (x) {
        return !x.done
      })
      if (!arr.length) return { text: 'Nenhum item em ' + capFirst(key) + ' por enquanto.', face: 'neutro', tab: key }
      var names = arr.slice(0, 3).map(function (x) {
        return x.text
      })
      return {
        text: 'Você tem ' + arr.length + ' em ' + capFirst(key) + ': ' + names.join(', ') + (arr.length > 3 ? '…' : '.'),
        face: 'feliz',
        tab: key
      }
    }

    // Timer
    if (/\b(timer|temporizador|cronometro|contagem)\b/.test(t)) {
      var dm = DUR.exec(t)
      var ms = dm ? durationMs(dm) : 0
      if (!ms) return { text: 'De quanto tempo? Tenta “timer de 10 minutos”.', face: 'confuso' }
      if (ms > 24 * 3600000) return { text: 'Esse é longo demais para um timer. Que tal um lembrete?', face: 'confuso' }
      state.lembretes.push({ id: ++seq, kind: 'timer', text: 'Timer de ' + durationText(ms), at: new Date(Date.now() + ms) })
      return { text: 'Timer de ' + durationText(ms) + ' começando agora! A contagem fica na pílula.', face: 'focado', tab: 'lembretes' }
    }

    // Alarme
    if (/\b(me acorda|me acorde|alarme|despertador|despertar)\b/.test(t)) {
      var wa = parseWhen(t)
      if (!wa) return { text: 'Pra que horas? Tenta “me acorda amanhã às sete e meia”.', face: 'confuso' }
      state.lembretes.push({ id: ++seq, kind: 'alarme', text: 'Alarme', at: wa.date })
      return {
        text: 'Alarme marcado para ' + dayLabel(wa.date) + ' às ' + hhmm(wa.date) + '. Bom descanso!',
        face: 'sono',
        tab: 'lembretes'
      }
    }

    // Memória: "lembra que ..."
    if ((m = /^(?:lembra|lembre|guarda|grava|nao esquece|nao esqueca)\s+(?:que|isso:?|disso:?)\s+/.exec(t)) && !parseWhen(t)) {
      var fact = tidy(orig.slice(m[0].length))
      if (!fact) return { text: 'Lembrar do quê?', face: 'confuso' }
      var spoken = fact
        .replace(/\bmeu\b/gi, 'seu')
        .replace(/\bminha\b/gi, 'sua')
        .replace(/\bmeus\b/gi, 'seus')
        .replace(/\bminhas\b/gi, 'suas')
        .replace(/\beu\b/gi, 'você')
      state.memoria.push({ raw: fold(fact), spoken: spoken })
      return { text: 'Pode deixar, guardei: ' + spoken + '.', face: 'apaixonado' }
    }

    // Lembrete
    if (/\b(me lembra|me lembre|lembrete|lembrar|me avisa|me avise|avisa|lembra)\b/.test(t)) {
      var w = parseWhen(t)
      if (!w) return { text: 'Pra quando? Tenta “me lembra de beber água em 20 minutos”.', face: 'confuso' }
      var what = cut(orig, w.spans)
      what = what
        .replace(/^\s*(?:me\s+)?(?:lembra|lembre|lembrar|avisa|avise|lembrete)(?:\s*:)?\s*(?:me\s+)?(?:de|da|do|pra|para|que)?\s+/i, '')
        .replace(/\b(?:hoje|amanhã|amanha)\b/gi, '')
      what = capFirst(tidy(what)) || 'Lembrete'
      state.lembretes.push({ id: ++seq, kind: 'lembrete', text: what, at: w.date })
      var when = w.relative
        ? 'em ' + durationText(w.relative) + ' (às ' + hhmm(w.date) + ')'
        : dayLabel(w.date) + ' às ' + hhmm(w.date)
      return { text: 'Combinado! Te lembro de “' + what + '” ' + when + '.', face: 'feliz', tab: 'lembretes' }
    }

    // Tarefa
    if ((m = /^(?:nova tarefa|adiciona(?:r)?(?: uma)? tarefa|cria(?:r)?(?: uma)? tarefa|tarefa)\s*:?\s*/.exec(t))) {
      var task = capFirst(tidy(orig.slice(m[0].length)))
      if (!task) return { text: 'Qual é a tarefa?', face: 'confuso' }
      state.tarefas.push({ id: ++seq, text: task, done: false })
      return { text: 'Tarefa adicionada: ' + task + '.', face: 'animado', tab: 'tarefas' }
    }

    // Nota
    if ((m = /^(?:anota(?:r)?|anote|nova nota|nota)\s*(?:que|ai|isso)?\s*:?\s*/.exec(t))) {
      var note = capFirst(tidy(orig.slice(m[0].length)))
      if (!note) return { text: 'O que eu anoto?', face: 'confuso' }
      state.notas.push({ id: ++seq, text: note })
      return { text: 'Anotado!', face: 'feliz', tab: 'notas' }
    }

    // Pesquisa
    if ((m = /^(?:pesquisa(?:r)?|pesquise|procura(?:r)?|procure|busca(?:r)?|busque)\s+(?:(no google|no youtube|na internet)\s+)?(?:por|sobre)?\s*/.exec(t))) {
      var q = tidy(orig.slice(m[0].length))
      var yt = /youtube/.test(m[1] || '')
      if (!q) return { text: 'Pesquisar o quê?', face: 'confuso' }
      showApp((yt ? 'YouTube: ' : 'Google: ') + q)
      return { text: 'Pesquisando “' + q + '” no ' + (yt ? 'YouTube' : 'Google') + '…', face: 'focado' }
    }

    // Abrir
    if ((m = /^(?:abre|abrir|abra|abri|inicia|iniciar)\s+(?:o |a |os |as )?/.exec(t))) {
      var target = tidy(t.slice(m[0].length))
      var nice = null
      Object.keys(SITES).forEach(function (k) {
        if (!nice && target.indexOf(k) === 0) nice = SITES[k]
      })
      if (!nice) nice = capFirst(tidy(orig.slice(m[0].length)))
      if (!nice) return { text: 'Abrir o quê?', face: 'confuso' }
      showApp(nice)
      return { text: 'Abrindo ' + nice + '…', face: 'animado' }
    }

    // Pergunta sobre algo que ele guardou
    var words = t.replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(function (x) {
      return x.length > 3 && !/^(qual|quais|como|onde|quando|voce|sabe|lembra|minha|meu|meus|minhas|seu|sua|isso|esse|essa|para|sobre)$/.test(x)
    })
    var hit = state.memoria.filter(function (mem) {
      return words.some(function (wd) {
        return mem.raw.indexOf(wd) !== -1
      })
    })[0]
    if (hit) return { text: 'Você me contou: ' + hit.spoken + '.', face: 'apaixonado' }

    return {
      text: 'Essa eu não sei aqui na demonstração. No app, perguntas livres vão para a IA, se você ligar. Tenta “timer de 5 minutos”.',
      face: 'confuso'
    }
  }

  // ---------------------------------------------------------------------------
  // Interface da demonstração
  // ---------------------------------------------------------------------------
  var stage = $('#demo')
  if (!stage) return
  var notch = $('#notch')
  var pill = $('#pill')
  var pillText = $('#pill-text')
  var pillFace = $('#pill-face')
  var face = $('#face')
  var bubble = $('#bubble')
  var form = $('#cmd')
  var input = $('#cmd-input')
  var list = $('#list')
  var tabs = $$('.tabs [role="tab"]')
  var toast = $('#toast')
  var toastTitle = $('#toast-title')
  var toastWhen = $('#toast-when')
  var tbClock = $('#tb-clock')
  var appWin = $('#app-window')
  var appTitle = $('#app-title')
  var hint = $('#hint')
  var heroBot = $('#hero-bot')
  function setBot(name) {
    if (!heroBot) return
    var src = 'assets/robo/tela-' + name + '.svg'
    if (heroBot.getAttribute('src') !== src) heroBot.setAttribute('src', src)
  }

  var FACE_ALT = {
    neutro: 'neutro', piscando: 'piscando', pensando: 'pensando', feliz: 'feliz', animado: 'animado', focado: 'focado',
    apaixonado: 'apaixonado', falando: 'falando', confuso: 'confuso', sono: 'com sono', surpreso: 'surpreso'
  }
  var faceTimer
  function setFace(name, keep) {
    var src = 'assets/robo/tela-' + name + '.svg'
    if (face.getAttribute('src') !== src) face.setAttribute('src', src)
    face.alt = 'Telinha, ' + (FACE_ALT[name] || name)
    setBot(name)
    clearTimeout(faceTimer)
    if (!keep && name !== 'neutro')
      faceTimer = setTimeout(function () {
        setFace('neutro', true)
      }, 7000)
  }

  var currentTab = 'lembretes'
  function selectTab(name, focus) {
    currentTab = name
    tabs.forEach(function (b) {
      var on = b.getAttribute('data-tab') === name
      b.setAttribute('aria-selected', on ? 'true' : 'false')
      b.tabIndex = on ? 0 : -1
      if (on) {
        list.setAttribute('aria-labelledby', b.id)
        if (focus) b.focus()
      }
    })
    render()
  }
  tabs.forEach(function (b, i) {
    b.addEventListener('click', function () {
      selectTab(b.getAttribute('data-tab'))
    })
    b.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
      if (!d) return
      e.preventDefault()
      selectTab(tabs[(i + d + tabs.length) % tabs.length].getAttribute('data-tab'), true)
    })
  })

  var CHECK_SVG = '<svg class="i" aria-hidden="true"><use href="icons.svg#check"></use></svg>'
  function li(cls) {
    var el = document.createElement('li')
    if (cls) el.className = cls
    return el
  }
  function span(cls, text) {
    var s = document.createElement('span')
    s.className = cls
    s.textContent = text
    return s
  }
  function render() {
    var now = Date.now()
    list.textContent = ''
    var items = state[currentTab]
    if (currentTab === 'lembretes')
      items = items.slice().sort(function (a, b) {
        return a.at - b.at
      })
    if (!items.length) {
      list.appendChild(li('empty')).textContent =
        currentTab === 'lembretes' ? 'Nenhum lembrete ainda.' : currentTab === 'tarefas' ? 'Nenhuma tarefa ainda.' : 'Nenhuma nota ainda.'
    }
    items.forEach(function (it) {
      var el = li(it.done ? 'done' : '')
      if (currentTab === 'lembretes') {
        var when = it.kind === 'timer' ? mmss(it.at - now) : hhmm(it.at)
        el.appendChild(span('when', when))
        var label = it.text
        if (it.kind !== 'timer' && !sameDay(it.at, new Date())) label += ' · ' + dayLabel(it.at)
        el.appendChild(span('what', label))
        if (it.kind === 'timer') el.setAttribute('data-timer', it.id)
      } else if (currentTab === 'tarefas') {
        var b = document.createElement('button')
        b.type = 'button'
        b.className = 'check'
        b.setAttribute('aria-pressed', it.done ? 'true' : 'false')
        b.setAttribute('aria-label', 'Concluir: ' + it.text)
        b.innerHTML = CHECK_SVG
        b.addEventListener('click', function () {
          it.done = !it.done
          if (it.done) {
            setFace('feliz')
            say('Tarefa concluída. Boa!')
          }
          render()
        })
        el.appendChild(b)
        el.appendChild(span('what', it.text))
      } else {
        el.appendChild(span('what', it.text))
      }
      list.appendChild(el)
    })
    ;['lembretes', 'tarefas', 'notas'].forEach(function (k) {
      var c = $('[data-count="' + k + '"]')
      if (c)
        c.textContent = String(
          state[k].filter(function (x) {
            return !x.done
          }).length
        )
    })
    updatePill()
  }

  function updatePill() {
    var now = Date.now()
    var timers = state.lembretes.filter(function (x) {
      return x.kind === 'timer'
    })
    var next = state.lembretes
      .filter(function (x) {
        return x.kind !== 'timer'
      })
      .sort(function (a, b) {
        return a.at - b.at
      })[0]
    var text
    var f = 'neutro'
    if (timers.length) {
      var tmr = timers.sort(function (a, b) {
        return a.at - b.at
      })[0]
      text = mmss(tmr.at - now) + ' · Timer'
      f = 'focado'
    } else if (next) text = hhmm(next.at) + ' · ' + (next.kind === 'alarme' ? 'Alarme' : next.text)
    else text = hhmm(new Date())
    if (pillText.textContent !== text) pillText.textContent = text
    var src = 'assets/robo/tela-' + f + '.svg'
    if (pillFace.getAttribute('src') !== src) pillFace.setAttribute('src', src)
  }

  function say(text) {
    bubble.textContent = text
  }

  var appTimer
  function showApp(title) {
    appTitle.textContent = title
    appWin.classList.add('show')
    clearTimeout(appTimer)
    appTimer = setTimeout(function () {
      appWin.classList.remove('show')
    }, 3200)
  }

  var toastTimer
  function showToast(title, when) {
    toastTitle.textContent = title
    toastWhen.textContent = when || 'agora'
    toast.classList.add('show')
    clearTimeout(toastTimer)
    toastTimer = setTimeout(function () {
      toast.classList.remove('show')
    }, 5200)
  }

  // Relógio, contagem dos timers e lembretes que vencem enquanto a página está aberta.
  var frozenClock = false
  function tick() {
    var now = Date.now()
    if (!frozenClock) tbClock.textContent = hhmm(new Date())
    var fired = state.lembretes.filter(function (x) {
      return x.at <= now
    })
    if (fired.length) {
      state.lembretes = state.lembretes.filter(function (x) {
        return x.at > now
      })
      var f = fired[0]
      showToast(
        f.kind === 'timer' ? f.text + ' terminou!' : f.kind === 'alarme' ? 'Alarme: hora de acordar!' : f.text,
        'agora'
      )
      if (notch.classList.contains('open')) {
        setFace('falando')
        say(f.kind === 'timer' ? 'Acabou o tempo!' : 'Ei! ' + f.text + '.')
      }
      render()
      return
    }
    // Atualiza só os números dos timers, sem redesenhar a lista.
    if (currentTab === 'lembretes')
      $$('[data-timer]', list).forEach(function (el) {
        var id = +el.getAttribute('data-timer')
        var it = state.lembretes.filter(function (x) {
          return x.id === id
        })[0]
        if (it) el.firstChild.textContent = mmss(it.at - now)
      })
    updatePill()
  }

  // ---------- abrir/fechar ----------
  var pinned = false
  var hovering = false
  var closeTimer
  var introRunning = false
  var userActive = false
  function touched() {
    userActive = true
  }
  stage.addEventListener('pointerdown', touched)
  stage.addEventListener('keydown', touched)
  notch.addEventListener('pointerenter', function (e) {
    if (e.pointerType === 'mouse') touched()
  })
  function open(pin) {
    clearTimeout(closeTimer)
    if (pin) pinned = true
    notch.classList.add('open')
    pill.setAttribute('aria-expanded', 'true')
    hint.classList.remove('show')
  }
  function close() {
    pinned = false
    notch.classList.remove('open')
    pill.setAttribute('aria-expanded', 'false')
  }
  function maybeClose(delay) {
    clearTimeout(closeTimer)
    closeTimer = setTimeout(function () {
      if (introRunning || pinned || hovering || notch.contains(document.activeElement)) return
      close()
    }, delay)
  }

  notch.addEventListener('pointerenter', function (e) {
    if (e.pointerType !== 'mouse') return
    hovering = true
    open()
  })
  notch.addEventListener('pointerleave', function (e) {
    if (e.pointerType !== 'mouse') return
    hovering = false
    maybeClose(700)
  })
  pill.addEventListener('click', function (e) {
    if (notch.classList.contains('open') && !hovering) {
      close()
      return
    }
    open(true)
    // Teclado: leva o foco ao campo. Toque: não abre o teclado do celular sozinho.
    if (e.detail === 0) input.focus()
  })
  notch.addEventListener('focusout', function () {
    setTimeout(function () {
      if (!notch.contains(document.activeElement) && !hovering && !pinned && !introRunning) close()
    }, 0)
  })
  notch.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && notch.classList.contains('open')) {
      close()
      pill.focus()
    }
  })
  document.addEventListener('pointerdown', function (e) {
    if (!pinned || introRunning) return
    if (notch.contains(e.target) || e.target.closest('[data-say]')) return
    close()
  })

  // ---------- executar comandos ----------
  var runId = 0
  async function run(text, typed) {
    var my = ++runId
    open(true)
    input.value = ''
    setFace('focado', true)
    if (typed && !reduced) {
      for (var i = 0; i < text.length; i++) {
        if (my !== runId) return
        input.value += text[i]
        await wait(28 + Math.random() * 36)
      }
      await wait(260)
    } else input.value = text
    if (my !== runId) return
    setFace('pensando', true)
    say('…')
    await wait(reduced ? 0 : 420)
    if (my !== runId) return
    var r = respond(text)
    input.value = ''
    say(r.text)
    setFace(r.face)
    if (r.tab) selectTab(r.tab)
    else render()
    return r
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault()
    var v = input.value.trim()
    if (!v) return
    touched()
    cancelIntro()
    run(v, false)
  })

  $$('[data-say]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      touched()
      cancelIntro()
      var text = btn.getAttribute('data-say')
      var rect = stage.getBoundingClientRect()
      var visible = rect.top > -40 && rect.top < window.innerHeight * 0.5
      if (visible) {
        run(text, true)
        return
      }
      stage.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' })
      setTimeout(function () {
        run(text, true)
      }, reduced ? 0 : 650)
    })
  })

  // ---------- abertura: o PC liga ----------
  var introCancelled = false
  function cancelIntro() {
    if (!introRunning) return
    introCancelled = true
    introRunning = false
    stage.classList.add('booting', 'on', 'pill-in')
    frozenClock = false
    tbClock.classList.remove('jump')
  }

  async function intro() {
    introRunning = true
    var ok = function () {
      return !introCancelled
    }
    stage.classList.add('booting')
    await wait(550)
    if (!ok()) return
    stage.classList.add('on')
    setBot('surpreso')
    await wait(900)
    if (!ok()) return
    setBot('animado')
    if (!ok()) return
    stage.classList.add('pill-in')
    await wait(1000)
    if (!ok()) return
    open()
    await wait(450)
    if (!ok()) return
    await run('me lembra de pagar o boleto às 15h', true)
    if (!ok()) return
    await wait(2600)
    if (!ok()) return
    if (!hovering) close()
    await wait(1100)
    if (!ok()) return
    // Avança o relógio até a hora do lembrete para mostrar o aviso.
    var item = state.lembretes.filter(function (x) {
      return x.kind === 'lembrete'
    })[0]
    if (item) {
      frozenClock = true
      tbClock.textContent = hhmm(item.at)
      tbClock.classList.add('jump')
      showToast(item.text, hhmm(item.at))
      setBot('falando')
      await wait(4600)
      setBot('feliz')
      frozenClock = false
      tbClock.classList.remove('jump')
      tbClock.textContent = hhmm(new Date())
    }
    if (!ok()) return
    introRunning = false
    if (!notch.classList.contains('open')) hint.classList.add('show')
    autoplay()
  }

  // Enquanto ninguém mexe, a demo mostra mais alguns comandos e para.
  async function autoplay() {
    var demo = ['timer de 25 minutos', 'nova tarefa: responder o cliente', 'lembra que meu café é sem açúcar']
    for (var i = 0; i < demo.length; i++) {
      await wait(i ? 4200 : 5000)
      if (userActive) return
      hint.classList.remove('show')
      await run(demo[i], true)
      if (userActive) return
      await wait(2800)
      if (userActive) return
      close()
      setFace('neutro', true)
    }
    if (!userActive) hint.classList.add('show')
  }

  function staticStart() {
    stage.classList.add('on', 'pill-in')
    var r = respond('me lembra de pagar o boleto às 15h')
    say(r.text)
    setFace('feliz', true)
    selectTab('lembretes')
    hint.classList.add('show')
  }

  render()
  tick()
  setInterval(tick, 1000)

  if (reduced || !('IntersectionObserver' in window)) staticStart()
  else {
    var started = false
    var io = new IntersectionObserver(
      function (entries) {
        if (entries[0].isIntersecting && !started) {
          started = true
          io.disconnect()
          intro()
        }
      },
      { threshold: 0.2 }
    )
    io.observe(stage)
  }

  // ---------------------------------------------------------------------------
  // Personalização
  // ---------------------------------------------------------------------------
  var looksStage = $('#looks-stage')
  var looksImg = $('#looks-img')
  var LOOK_ALT = {
    'cor-azul': 'Telinha com luzes azuis',
    'cor-menta': 'Telinha com luzes verde-menta',
    'cor-amarelo': 'Telinha com luzes amarelas',
    'cor-rosa': 'Telinha com luzes rosa',
    'acessorio-laco': 'Telinha com um laço rosa',
    'acessorio-oculos': 'Telinha de óculos',
    'acessorio-chapeu': 'Telinha de chapéu'
  }
  $$('.swatch').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var look = btn.getAttribute('data-look')
      $$('.swatch').forEach(function (b) {
        b.setAttribute('aria-pressed', b === btn ? 'true' : 'false')
      })
      looksStage.setAttribute('data-glow', btn.getAttribute('data-glow'))
      var swap = function () {
        looksImg.src = 'assets/robo/tela-' + look + '.svg'
        looksImg.alt = LOOK_ALT[look] || 'Telinha'
        looksImg.classList.remove('swap')
      }
      if (reduced) swap()
      else {
        looksImg.classList.add('swap')
        setTimeout(swap, 180)
      }
    })
  })

  // ---------------------------------------------------------------------------
  // Voz de exemplo (no Windows, o navegador usa as vozes do próprio sistema)
  // ---------------------------------------------------------------------------
  var speak = $('#speak')
  if (speak && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window) {
    speak.hidden = false
    speak.addEventListener('click', function () {
      var u = new SpeechSynthesisUtterance('Ei! Hora de pagar o boleto.')
      u.lang = 'pt-BR'
      var voices = window.speechSynthesis.getVoices()
      var pt = voices.filter(function (v) {
        return /^pt(-|_)BR/i.test(v.lang)
      })[0]
      if (pt) u.voice = pt
      window.speechSynthesis.cancel()
      window.speechSynthesis.speak(u)
    })
  }

  // ---------------------------------------------------------------------------
  // Barra de compra no celular: aparece depois da primeira dobra e some no preço
  // ---------------------------------------------------------------------------
  var buybar = $('#buybar')
  var hero = $('.hero')
  var price = $('#preco')
  if (buybar && hero && price && 'IntersectionObserver' in window) {
    var heroVisible = true
    var priceVisible = false
    var sync = function () {
      buybar.classList.toggle('show', !heroVisible && !priceVisible)
    }
    new IntersectionObserver(function (e) {
      heroVisible = e[0].isIntersecting
      sync()
    }).observe(hero)
    new IntersectionObserver(function (e) {
      priceVisible = e[0].isIntersecting
      sync()
    }).observe(price)
  }
})()
