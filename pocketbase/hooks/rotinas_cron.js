//
// Cron diário que gera as atribuições do dia para processos recorrentes
// (frequência diária / dias da semana / semanal), respeitando vigência,
// designados e o índice único (tarefa, colaborador, data).
//
// Nota JSVM: a lógica é duplicada inline em cada callback porque callbacks
// rodam em um pool de VM separado (sem acesso a declarações top-level).

cronAdd('gerar_atribuicoes_recorrentes', '0 5 * * *', () => {
  const hoje = new Date()
  const y = hoje.getFullYear()
  const m = String(hoje.getMonth() + 1).padStart(2, '0')
  const d = String(hoje.getDate()).padStart(2, '0')
  const dataStr = `${y}-${m}-${d}`
  const diaSemana = hoje.getDay() // 0=dom ... 6=sáb

  const res = { data: dataStr, processos: 0, criadas: 0, ignoradas: 0 }

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

    const designados = proc.get('designados') || []
    if (designados.length === 0) continue

    const limite = proc.getString('horario_limite', '')
    const tarefas = $app.findRecordsByFilter(
      'tarefas',
      `processo = '${proc.id}' && ativa = true`,
      'ordem',
      200,
      0,
    )
    if (tarefas.length === 0) continue

    res.processos++

    const atribuicoesCol = $app.findCollectionByNameOrId('atribuicoes')
    for (const colabId of designados) {
      for (const tarefa of tarefas) {
        const existing = $app.findRecordsByFilter(
          'atribuicoes',
          `tarefa = '${tarefa.id}' && colaborador = '${colabId}' && data >= '${dataStr} 00:00:00.000Z' && data <= '${dataStr} 23:59:59.999Z'`,
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
          rec.set('colaborador', colabId)
          rec.set('data', `${dataStr} 00:00:00.000Z`)
          rec.set('status', 'pendente')
          if (limite) rec.set('horario_limite', limite)
          $app.save(rec)
          res.criadas++
        } catch (_) {
          res.ignoradas++
        }
      }
    }
  }

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

  const hoje = new Date()
  const y = hoje.getFullYear()
  const m = String(hoje.getMonth() + 1).padStart(2, '0')
  const d = String(hoje.getDate()).padStart(2, '0')
  const dataStr = `${y}-${m}-${d}`
  const diaSemana = hoje.getDay()

  const res = { data: dataStr, processos: 0, criadas: 0, ignoradas: 0 }

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
      deveRodar = diaSemana === 1
    }

    if (!deveRodar) continue

    const vigencia = proc.getString('vigencia', '')
    if (vigencia) {
      const vigDate = vigencia.split(' ')[0].split('T')[0]
      if (dataStr < vigDate) continue
    }

    const designados = proc.get('designados') || []
    if (designados.length === 0) continue

    const limite = proc.getString('horario_limite', '')
    const tarefas = $app.findRecordsByFilter(
      'tarefas',
      `processo = '${proc.id}' && ativa = true`,
      'ordem',
      200,
      0,
    )
    if (tarefas.length === 0) continue

    res.processos++

    const atribuicoesCol = $app.findCollectionByNameOrId('atribuicoes')
    for (const colabId of designados) {
      for (const tarefa of tarefas) {
        const existing = $app.findRecordsByFilter(
          'atribuicoes',
          `tarefa = '${tarefa.id}' && colaborador = '${colabId}' && data >= '${dataStr} 00:00:00.000Z' && data <= '${dataStr} 23:59:59.999Z'`,
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
          rec.set('colaborador', colabId)
          rec.set('data', `${dataStr} 00:00:00.000Z`)
          rec.set('status', 'pendente')
          if (limite) rec.set('horario_limite', limite)
          $app.save(rec)
          res.criadas++
        } catch (_) {
          res.ignoradas++
        }
      }
    }
  }

  console.log(
    `[recorrencia] manual: ${res.criadas} atribuições criadas, ${res.ignoradas} ignoradas (${res.processos} processos recorrentes)`,
  )
  return e.json(200, res)
})
