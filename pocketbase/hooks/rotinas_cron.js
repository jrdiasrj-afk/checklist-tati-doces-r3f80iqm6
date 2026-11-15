//
// Cron diário (05h) + endpoint manual que geram as atribuições do dia para
// processos recorrentes, no modelo Checa Ai:
//   - cada checklist é gerado para TODOS os responsáveis designados do
//     cabeçalho (designados) e de cada combinação extra (locais_extra);
//   - cada combinação de unidade (local/locais_extra[].local) é etiquetada
//     na observação da atribuição (a unidade do checklist vai junto);
//   - sem_horario=true → atribuição SEM horário-limite (pendência do dia);
//   - turno é meramente informativo (exibição), não restringe a geração;
//   - o índice único (tarefa, colaborador, data) + o pré-check evitam duplicar.
//
// Também contém a verificação de ALERTAS (coleção `alertas`):
//  - fora_prazo: atribuição pendente cujo horario_limite já passou (a cada 30 min)
//  - fim_dia: atribuição que continua pendente no fim do dia (23:30)
// O índice único (atribuicao, tipo) garante que o mesmo alerta não se duplica.
//
// TODO WhatsApp: quando a integração for contratada, enviar a mensagem no ponto
// marcado com "PONTO DE ENVIO EXTERNO" abaixo.
//
// Nota JSVM: a lógica de geração é duplicada inline em cada callback (definida
// DENTRO do callback) porque callbacks rodam em um pool de VM separado, sem
// acesso a declarações top-level.

// ---------------------------------------------------------------------------
// Cron das 05h
// ---------------------------------------------------------------------------
cronAdd('gerar_atribuicoes_recorrentes', '0 5 * * *', () => {
  function gerarAtribuicoesDoDia(dataStr, diaSemana) {
    const res = { data: dataStr, criadas: 0, ignoradas: 0, processos: 0 }

    const processos = $app.findRecordsByFilter(
      'processos',
      "ativo = true && recorrencia != 'nenhuma' && recorrencia != ''",
      '',
      200,
      0,
    )

    for (const proc of processos) {
      const recorrencia = proc.getString('recorrencia', 'nenhuma')
      let deveRodar = false

      if (recorrencia === 'diaria') {
        deveRodar = true
      } else if (recorrencia === 'dias_semana') {
        const dias = proc.get('dias_semana') || []
        deveRodar = dias.includes(diaSemana)
      } else if (recorrencia === 'semanal') {
        deveRodar = diaSemana === 1 // segunda-feira
      }

      if (!deveRodar) continue

      // Vigência opcional: só gera se a vigência já começou
      const vigencia = proc.getString('vigencia', '')
      if (vigencia) {
        const vigDate = vigencia.split(' ')[0].split('T')[0]
        if (dataStr < vigDate) continue
      }

      const tarefas = $app.findRecordsByFilter(
        'tarefas',
        `processo = '${proc.id}' && ativa = true`,
        'ordem',
        200,
        0,
      )
      if (tarefas.length === 0) continue

      // --- Destinos: pares {colaborador, unidade} sem duplicar ---------------
      // Cabeçalho: designados × (unidade principal + setores)
      const semHorario = proc.getBool('sem_horario')
      const limite = semHorario ? '' : proc.getString('horario_limite', '')
      const turno = proc.getString('turno', '')
      const unidadesCabecalho = []
      const localPrincipal = proc.getString('local', '')
      if (localPrincipal) unidadesCabecalho.push(localPrincipal)
      const setoresProc = proc.get('setores') || []

      const destinos = []
      const vistos = {}
      const addDestino = (colabId, unidade, setor) => {
        if (!colabId) return
        const chave = colabId + '|' + (unidade || '') + '|' + (setor || '')
        if (vistos[chave]) return
        vistos[chave] = true
        destinos.push({ colabId: colabId, unidade: unidade || '', setor: setor || '' })
      }

      for (const colabId of proc.get('designados') || []) {
        if (unidadesCabecalho.length === 0) {
          addDestino(colabId, '', '')
        } else {
          for (const un of unidadesCabecalho) {
            if (setoresProc.length === 0) {
              addDestino(colabId, un, '')
            } else {
              for (const st of setoresProc) addDestino(colabId, un, st)
            }
          }
        }
      }

      // Configurações adicionais (locais_extra): unidade + setor + responsáveis
      let extras = []
      const rawExtra = proc.get('locais_extra')
      if (rawExtra) {
        try {
          extras = typeof rawExtra === 'string' ? JSON.parse(rawExtra) : rawExtra
        } catch (_) {
          extras = []
        }
        if (!Array.isArray(extras)) extras = []
      }
      for (const extra of extras) {
        if (!extra || typeof extra !== 'object') continue
        const unExtra = String(extra.local || '')
        const stExtra = String(extra.setor || '')
        const designadosExtra = Array.isArray(extra.designados) ? extra.designados : []
        for (const colabId of designadosExtra) {
          addDestino(colabId, unExtra, stExtra)
        }
      }

      if (destinos.length === 0) continue
      res.processos++

      const atribuicoesCol = $app.findCollectionByNameOrId('atribuicoes')
      for (const destino of destinos) {
        for (const tarefa of tarefas) {
          const existing = $app.findRecordsByFilter(
            'atribuicoes',
            `tarefa = '${tarefa.id}' && colaborador = '${destino.colabId}' && data >= '${dataStr} 00:00:00.000Z' && data <= '${dataStr} 23:59:59.999Z'`,
            '',
            1,
            0,
          )
          if (existing.length > 0) {
            res.ignoradas++
            continue
          }
          try {
            const rec = new Record(atribuicoesCol)
            rec.set('tarefa', tarefa.id)
            rec.set('colaborador', destino.colabId)
            rec.set('data', `${dataStr} 00:00:00.000Z`)
            rec.set('status', 'pendente')
            if (limite) rec.set('horario_limite', limite)
            // Etiqueta da combinação unidade+setor+turno do checklist
            const partes = []
            if (destino.unidade) partes.push('unidade:' + destino.unidade)
            if (destino.setor) partes.push('setor:' + destino.setor)
            if (turno) partes.push('turno:' + turno)
            if (partes.length > 0) rec.set('observacao', partes.join(' | '))
            $app.save(rec)
            res.criadas++
          } catch (_) {
            res.ignoradas++
          }
        }
      }
    }

    return res
  }

  const hoje = new Date()
  const y = hoje.getFullYear()
  const m = String(hoje.getMonth() + 1).padStart(2, '0')
  const d = String(hoje.getDate()).padStart(2, '0')
  const dataStr = `${y}-${m}-${d}`
  const diaSemana = hoje.getDay() // 0=dom ... 6=sáb

  const res = gerarAtribuicoesDoDia(dataStr, diaSemana)
  console.log(
    `[recorrencia] ${res.data}: ${res.criadas} atribuições criadas, ${res.ignoradas} ignoradas (${res.processos} processos recorrentes)`,
  )
})

// Endpoint manual para o gerente forçar a geração (ex.: após configurar um processo)
routerAdd('POST', '/backend/v1/atribuicoes/gerar', (e) => {
  const auth = e.auth
  if (!auth || auth.getString('role') !== 'gerente') {
    return e.json(403, { error: 'Acesso restrito para gerentes.' })
  }

  function gerarAtribuicoesDoDia(dataStr, diaSemana) {
    const res = { data: dataStr, criadas: 0, ignoradas: 0, processos: 0 }

    const processos = $app.findRecordsByFilter(
      'processos',
      "ativo = true && recorrencia != 'nenhuma' && recorrencia != ''",
      '',
      200,
      0,
    )

    for (const proc of processos) {
      const recorrencia = proc.getString('recorrencia', 'nenhuma')
      let deveRodar = false

      if (recorrencia === 'diaria') {
        deveRodar = true
      } else if (recorrencia === 'dias_semana') {
        const dias = proc.get('dias_semana') || []
        deveRodar = dias.includes(diaSemana)
      } else if (recorrencia === 'semanal') {
        deveRodar = diaSemana === 1 // segunda-feira
      }

      if (!deveRodar) continue

      // Vigência opcional: só gera se a vigência já começou
      const vigencia = proc.getString('vigencia', '')
      if (vigencia) {
        const vigDate = vigencia.split(' ')[0].split('T')[0]
        if (dataStr < vigDate) continue
      }

      const tarefas = $app.findRecordsByFilter(
        'tarefas',
        `processo = '${proc.id}' && ativa = true`,
        'ordem',
        200,
        0,
      )
      if (tarefas.length === 0) continue

      // --- Destinos: pares {colaborador, unidade} sem duplicar ---------------
      // Cabeçalho: designados × (unidade principal + setores)
      const semHorario = proc.getBool('sem_horario')
      const limite = semHorario ? '' : proc.getString('horario_limite', '')
      const turno = proc.getString('turno', '')
      const unidadesCabecalho = []
      const localPrincipal = proc.getString('local', '')
      if (localPrincipal) unidadesCabecalho.push(localPrincipal)
      const setoresProc = proc.get('setores') || []

      const destinos = []
      const vistos = {}
      const addDestino = (colabId, unidade, setor) => {
        if (!colabId) return
        const chave = colabId + '|' + (unidade || '') + '|' + (setor || '')
        if (vistos[chave]) return
        vistos[chave] = true
        destinos.push({ colabId: colabId, unidade: unidade || '', setor: setor || '' })
      }

      for (const colabId of proc.get('designados') || []) {
        if (unidadesCabecalho.length === 0) {
          addDestino(colabId, '', '')
        } else {
          for (const un of unidadesCabecalho) {
            if (setoresProc.length === 0) {
              addDestino(colabId, un, '')
            } else {
              for (const st of setoresProc) addDestino(colabId, un, st)
            }
          }
        }
      }

      // Configurações adicionais (locais_extra): unidade + setor + responsáveis
      let extras = []
      const rawExtra = proc.get('locais_extra')
      if (rawExtra) {
        try {
          extras = typeof rawExtra === 'string' ? JSON.parse(rawExtra) : rawExtra
        } catch (_) {
          extras = []
        }
        if (!Array.isArray(extras)) extras = []
      }
      for (const extra of extras) {
        if (!extra || typeof extra !== 'object') continue
        const unExtra = String(extra.local || '')
        const stExtra = String(extra.setor || '')
        const designadosExtra = Array.isArray(extra.designados) ? extra.designados : []
        for (const colabId of designadosExtra) {
          addDestino(colabId, unExtra, stExtra)
        }
      }

      if (destinos.length === 0) continue
      res.processos++

      const atribuicoesCol = $app.findCollectionByNameOrId('atribuicoes')
      for (const destino of destinos) {
        for (const tarefa of tarefas) {
          const existing = $app.findRecordsByFilter(
            'atribuicoes',
            `tarefa = '${tarefa.id}' && colaborador = '${destino.colabId}' && data >= '${dataStr} 00:00:00.000Z' && data <= '${dataStr} 23:59:59.999Z'`,
            '',
            1,
            0,
          )
          if (existing.length > 0) {
            res.ignoradas++
            continue
          }
          try {
            const rec = new Record(atribuicoesCol)
            rec.set('tarefa', tarefa.id)
            rec.set('colaborador', destino.colabId)
            rec.set('data', `${dataStr} 00:00:00.000Z`)
            rec.set('status', 'pendente')
            if (limite) rec.set('horario_limite', limite)
            // Etiqueta da combinação unidade+setor+turno do checklist
            const partes = []
            if (destino.unidade) partes.push('unidade:' + destino.unidade)
            if (destino.setor) partes.push('setor:' + destino.setor)
            if (turno) partes.push('turno:' + turno)
            if (partes.length > 0) rec.set('observacao', partes.join(' | '))
            $app.save(rec)
            res.criadas++
          } catch (_) {
            res.ignoradas++
          }
        }
      }
    }

    return res
  }

  const hoje = new Date()
  const y = hoje.getFullYear()
  const m = String(hoje.getMonth() + 1).padStart(2, '0')
  const d = String(hoje.getDate()).padStart(2, '0')
  const dataStr = `${y}-${m}-${d}`
  const diaSemana = hoje.getDay()

  const res = gerarAtribuicoesDoDia(dataStr, diaSemana)
  console.log(
    `[recorrencia] manual: ${res.criadas} atribuições criadas, ${res.ignoradas} ignoradas (${res.processos} processos recorrentes)`,
  )
  return e.json(200, res)
})

// ---------------------------------------------------------------------------
// Alertas: verificação de atraso a cada 30 minutos (06:00–22:30)
// ---------------------------------------------------------------------------
cronAdd('alertas_fora_prazo', '*/30 6-22 * * *', () => {
  // Rótulos em português dos locais (usado na mensagem do alerta)
  const LOCAL_LABELS_HOOK = {
    fabrica: 'Fábrica',
    barao: 'Barão',
    uruguai: 'Uruguai',
    meier: 'Meier',
  }

  // Cria o alerta (respeitando o índice único atribuicao+tipo) e devolve true se criou.
  // `colab` é o record do colaborador (para supervisor e local).
  // ==== PONTO DE ENVIO EXTERNO (WhatsApp) — descomentar quando a integração existir ====
  // if ($os.getenv('WHATSAPP_TOKEN')) {
  //   $http.send({ url: 'https://graph.facebook.com/v19.0/<PHONE_ID>/messages', method: 'POST',
  //     headers: { Authorization: 'Bearer ' + $os.getenv('WHATSAPP_TOKEN') },
  //     body: JSON.stringify({ messaging_product: 'whatsapp', to: '<numero do supervisor>', text: { body: msg } }) })
  // }
  function criarAlertaHook(tipo, atrib, colab, limite) {
    const alertasCol = $app.findCollectionByNameOrId('alertas')
    const existing = $app.findRecordsByFilter(
      'alertas',
      `atribuicao = '${atrib.id}' && tipo = '${tipo}'`,
      '',
      1,
      0,
    )
    if (existing.length > 0) return false

    let tarefa = null
    try {
      tarefa = $app.findRecordById('tarefas', atrib.getString('tarefa'))
    } catch (_) {}
    let processo = null
    if (tarefa) {
      try {
        processo = $app.findRecordById('processos', tarefa.getString('processo'))
      } catch (_) {}
    }

    const nomeColab = colab.getString('name', 'Colaborador')
    const nomeTarefa = tarefa ? tarefa.getString('titulo', '') : 'tarefa'
    const nomeProcesso = processo ? processo.getString('nome', '') : 'processo'
    const localUser = colab.getString('local', '')
    const localTxt =
      localUser && LOCAL_LABELS_HOOK[localUser]
        ? LOCAL_LABELS_HOOK[localUser]
        : 'local não definido'
    const limiteTxt = limite ? ` (limite ${limite})` : ''
    const msg = `${nomeColab} não concluiu a tarefa ${nomeTarefa} do processo ${nomeProcesso}${limiteTxt} — local ${localTxt}.`

    const rec = new Record(alertasCol)
    rec.set('colaborador', colab.id)
    const supId = colab.getString('supervisor', '')
    if (supId) rec.set('supervisor', supId)
    rec.set('atribuicao', atrib.id)
    if (localUser) rec.set('local', localUser)
    rec.set('tipo', tipo)
    rec.set('mensagem', msg)
    $app.save(rec)
    console.log(`[alertas] ${tipo}: ${msg}`)
    return true
  }

  const agora = new Date()
  const res = { fora_prazo: 0 }

  const pendentes = $app.findRecordsByFilter('atribuicoes', "status = 'pendente'", '', 500, 0)
  for (const atrib of pendentes) {
    const limite = atrib.getString('horario_limite', '')
    if (!limite) continue

    // horario_limite é 'HH:MM' no dia da atribuição
    const dataStr = (atrib.getString('data', '') || '').split(' ')[0].split('T')[0]
    if (!dataStr) continue
    const parts = limite.split(':')
    const limiteDate = new Date(`${dataStr}T00:00:00`)
    limiteDate.setHours(parseInt(parts[0], 10) || 0, parseInt(parts[1], 10) || 0, 0, 0)
    if (agora.getTime() <= limiteDate.getTime()) continue

    let colab = null
    try {
      colab = $app.findRecordById('users', atrib.getString('colaborador'))
    } catch (_) {}
    if (colab && criarAlertaHook('fora_prazo', atrib, colab, limite)) res.fora_prazo++
  }

  if (res.fora_prazo > 0) {
    console.log(`[alertas] fora_prazo: ${res.fora_prazo} novo(s) alerta(s)`)
  }
})

// ---------------------------------------------------------------------------
// Alertas: fim do dia (23:30) — pendências que continuam abertas
// ---------------------------------------------------------------------------
cronAdd('alertas_fim_dia', '30 23 * * *', () => {
  // Rótulos em português dos locais
  const LOCAL_LABELS_HOOK = {
    fabrica: 'Fábrica',
    barao: 'Barão',
    uruguai: 'Uruguai',
    meier: 'Meier',
  }

  // Cria o alerta (respeitando o índice único atribuicao+tipo) e devolve true se criou.
  // ==== PONTO DE ENVIO EXTERNO (WhatsApp) — descomentar quando a integração existir ====
  // if ($os.getenv('WHATSAPP_TOKEN')) {
  //   $http.send({ url: '...', method: 'POST', headers: {...}, body: JSON.stringify({ ... }) })
  // }
  function criarAlertaFimDia(atrib, colab, limite) {
    const alertasCol = $app.findCollectionByNameOrId('alertas')
    const existing = $app.findRecordsByFilter(
      'alertas',
      `atribuicao = '${atrib.id}' && tipo = 'fim_dia'`,
      '',
      1,
      0,
    )
    if (existing.length > 0) return false

    let tarefa = null
    try {
      tarefa = $app.findRecordById('tarefas', atrib.getString('tarefa'))
    } catch (_) {}
    let processo = null
    if (tarefa) {
      try {
        processo = $app.findRecordById('processos', tarefa.getString('processo'))
      } catch (_) {}
    }

    const nomeColab = colab.getString('name', 'Colaborador')
    const nomeTarefa = tarefa ? tarefa.getString('titulo', '') : 'tarefa'
    const nomeProcesso = processo ? processo.getString('nome', '') : 'processo'
    const localUser = colab.getString('local', '')
    const localTxt =
      localUser && LOCAL_LABELS_HOOK[localUser]
        ? LOCAL_LABELS_HOOK[localUser]
        : 'local não definido'
    const limiteTxt = limite ? ` (limite ${limite})` : ''
    const msg = `${nomeColab} não concluiu até o fim do dia a tarefa ${nomeTarefa} do processo ${nomeProcesso}${limiteTxt} — local ${localTxt}.`

    const rec = new Record(alertasCol)
    rec.set('colaborador', colab.id)
    const supId = colab.getString('supervisor', '')
    if (supId) rec.set('supervisor', supId)
    rec.set('atribuicao', atrib.id)
    if (localUser) rec.set('local', localUser)
    rec.set('tipo', 'fim_dia')
    rec.set('mensagem', msg)
    $app.save(rec)
    console.log(`[alertas] fim_dia: ${msg}`)
    return true
  }

  const res = { fim_dia: 0 }

  const pendentes = $app.findRecordsByFilter('atribuicoes', "status = 'pendente'", '', 500, 0)
  for (const atrib of pendentes) {
    const limite = atrib.getString('horario_limite', '')
    let colab = null
    try {
      colab = $app.findRecordById('users', atrib.getString('colaborador'))
    } catch (_) {}
    if (colab && criarAlertaFimDia(atrib, colab, limite)) res.fim_dia++
  }

  if (res.fim_dia > 0) {
    console.log(`[alertas] fim_dia: ${res.fim_dia} novo(s) alerta(s)`)
  }
})

// ---------------------------------------------------------------------------
// Endpoint manual para o gerente disparar a verificação de alertas na hora
// (mesma lógica do fora_prazo; útil para testar sem esperar o cron)
// ---------------------------------------------------------------------------
routerAdd('POST', '/backend/v1/alertas/verificar', (e) => {
  const auth = e.auth
  if (!auth || auth.getString('role') !== 'gerente') {
    return e.json(403, { error: 'Acesso restrito para gerentes.' })
  }

  const LOCAL_LABELS_HOOK = {
    fabrica: 'Fábrica',
    barao: 'Barão',
    uruguai: 'Uruguai',
    meier: 'Meier',
  }

  function criarAlertaVerificar(tipo, atrib, colab, limite) {
    const alertasCol = $app.findCollectionByNameOrId('alertas')
    const existing = $app.findRecordsByFilter(
      'alertas',
      `atribuicao = '${atrib.id}' && tipo = '${tipo}'`,
      '',
      1,
      0,
    )
    if (existing.length > 0) return false

    let tarefa = null
    try {
      tarefa = $app.findRecordById('tarefas', atrib.getString('tarefa'))
    } catch (_) {}
    let processo = null
    if (tarefa) {
      try {
        processo = $app.findRecordById('processos', tarefa.getString('processo'))
      } catch (_) {}
    }

    const nomeColab = colab.getString('name', 'Colaborador')
    const nomeTarefa = tarefa ? tarefa.getString('titulo', '') : 'tarefa'
    const nomeProcesso = processo ? processo.getString('nome', '') : 'processo'
    const localUser = colab.getString('local', '')
    const localTxt =
      localUser && LOCAL_LABELS_HOOK[localUser]
        ? LOCAL_LABELS_HOOK[localUser]
        : 'local não definido'
    const limiteTxt = limite ? ` (limite ${limite})` : ''
    const msg = `${nomeColab} não concluiu a tarefa ${nomeTarefa} do processo ${nomeProcesso}${limiteTxt} — local ${localTxt}.`

    const rec = new Record(alertasCol)
    rec.set('colaborador', colab.id)
    const supId = colab.getString('supervisor', '')
    if (supId) rec.set('supervisor', supId)
    rec.set('atribuicao', atrib.id)
    if (localUser) rec.set('local', localUser)
    rec.set('tipo', tipo)
    rec.set('mensagem', msg)
    $app.save(rec)
    console.log(`[alertas] ${tipo}: ${msg}`)
    return true
  }

  const agora = new Date()
  const res = { fora_prazo: 0 }
  const pendentes = $app.findRecordsByFilter('atribuicoes', "status = 'pendente'", '', 500, 0)
  for (const atrib of pendentes) {
    const limite = atrib.getString('horario_limite', '')
    if (!limite) continue
    const dataStr = (atrib.getString('data', '') || '').split(' ')[0].split('T')[0]
    if (!dataStr) continue
    const parts = limite.split(':')
    const limiteDate = new Date(`${dataStr}T00:00:00`)
    limiteDate.setHours(parseInt(parts[0], 10) || 0, parseInt(parts[1], 10) || 0, 0, 0)
    if (agora.getTime() <= limiteDate.getTime()) continue
    let colab = null
    try {
      colab = $app.findRecordById('users', atrib.getString('colaborador'))
    } catch (_) {}
    if (colab && criarAlertaVerificar('fora_prazo', atrib, colab, limite)) res.fora_prazo++
  }
  return e.json(200, res)
})
