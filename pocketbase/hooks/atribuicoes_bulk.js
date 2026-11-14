routerAdd('POST', '/backend/v1/atribuicoes/bulk', (e) => {
  // 1. Validar autenticação e se é gerente
  const authRecord = e.auth
  if (!authRecord) {
    return e.json(401, { error: 'Não autenticado.' })
  }

  const role = authRecord.getString('role')
  if (role !== 'gerente') {
    return e.json(403, { error: 'Acesso restrito para gerentes.' })
  }

  // 2. Ler body
  let body
  try {
    body = e.requestInfo().body
    if (typeof body === 'string') {
      body = JSON.parse(body)
    }
  } catch (err) {
    return e.json(400, { error: 'Corpo da requisição inválido (JSON esperado).' })
  }

  const processoId = body.processo_id
  const colaboradorId = body.colaborador_id
  const datas = body.datas

  if (!processoId || !colaboradorId || !Array.isArray(datas) || datas.length === 0) {
    return e.json(400, {
      error: 'Campos obrigatórios: processo_id, colaborador_id, datas (array de datas YYYY-MM-DD).',
    })
  }

  // 3. Buscar tarefas ativas do processo
  const tarefas = e.app.findRecordsByFilter(
    'tarefas',
    `processo = '${processoId}' && ativa = true`,
    'ordem',
    200,
    0,
  )

  if (tarefas.length === 0) {
    return e.json(400, { error: 'O processo selecionado não possui tarefas ativas.' })
  }

  const atribuicoesCol = e.app.findCollectionByNameOrId('atribuicoes')
  let criadas = 0
  let ignoradas = 0

  for (const dataRaw of datas) {
    // Normalizar data para YYYY-MM-DD 00:00:00.000Z
    const cleanDate = String(dataRaw).split('T')[0]
    const dataNormalized = `${cleanDate} 00:00:00.000Z`

    for (const tarefa of tarefas) {
      // Verificar se já existe atribuição para essa combinação (tarefa, colaborador, data)
      const existing = e.app.findRecordsByFilter(
        'atribuicoes',
        `tarefa = '${tarefa.id}' && colaborador = '${colaboradorId}' && data >= '${cleanDate} 00:00:00.000Z' && data <= '${cleanDate} 23:59:59.999Z'`,
        '',
        1,
        0,
      )

      if (existing.length > 0) {
        ignoradas++
        continue
      }

      try {
        const record = new Record(atribuicoesCol)
        record.set('tarefa', tarefa.id)
        record.set('colaborador', colaboradorId)
        record.set('data', dataNormalized)
        record.set('status', 'pendente')
        e.app.save(record)
        criadas++
      } catch (err) {
        // Ignora duplicidades ou erros de constraint
        ignoradas++
      }
    }
  }

  return e.json(200, {
    success: true,
    criadas,
    ignoradas,
    total_tarefas: tarefas.length,
    datas_processadas: datas.length,
  })
})
