migrate(
  (app) => {
    // ===== processos: recorrência e horário-limite (estilo Koncluí) =====
    const processosCol = app.findCollectionByNameOrId('processos')
    processosCol.fields.add(
      new Field({
        name: 'recorrencia',
        type: 'select',
        required: false,
        values: ['nenhuma', 'diaria', 'dias_semana', 'semanal'],
        maxSelect: 1,
      }),
    )
    processosCol.fields.add(
      new Field({
        name: 'dias_semana',
        type: 'json',
        required: false,
      }),
    )
    processosCol.fields.add(
      new Field({
        name: 'horario_limite',
        type: 'text',
        required: false,
      }),
    )
    processosCol.fields.add(
      new Field({
        name: 'vigencia',
        type: 'date',
        required: false,
      }),
    )
    processosCol.fields.add(
      new Field({
        name: 'designados',
        type: 'relation',
        required: false,
        collectionId: '_pb_users_auth_',
        cascadeDelete: false,
        maxSelect: 99,
      }),
    )
    app.save(processosCol)

    // ===== tarefas: item crítico + tipo de registro exigido =====
    const tarefasCol = app.findCollectionByNameOrId('tarefas')
    tarefasCol.fields.add(
      new Field({
        name: 'critica',
        type: 'bool',
        required: false,
      }),
    )
    tarefasCol.fields.add(
      new Field({
        name: 'tipo_registro',
        type: 'select',
        required: false,
        values: ['nenhum', 'foto', 'medicao', 'texto'],
        maxSelect: 1,
      }),
    )
    tarefasCol.fields.add(
      new Field({
        name: 'medicao_alvo',
        type: 'number',
        required: false,
      }),
    )
    tarefasCol.fields.add(
      new Field({
        name: 'medicao_max',
        type: 'number',
        required: false,
      }),
    )
    tarefasCol.fields.add(
      new Field({
        name: 'medicao_unidade',
        type: 'text',
        required: false,
      }),
    )
    app.save(tarefasCol)

    // ===== atribuicoes: horário-limite do dia + registro de medição =====
    const atribuicoesCol = app.findCollectionByNameOrId('atribuicoes')
    atribuicoesCol.fields.add(
      new Field({
        name: 'horario_limite',
        type: 'text',
        required: false,
      }),
    )
    atribuicoesCol.fields.add(
      new Field({
        name: 'medicao_valor',
        type: 'number',
        required: false,
      }),
    )
    atribuicoesCol.fields.add(
      new Field({
        name: 'fora_padrao',
        type: 'bool',
        required: false,
      }),
    )
    app.save(atribuicoesCol)
  },
  (app) => {
    const processosCol = app.findCollectionByNameOrId('processos')
    for (const name of ['recorrencia', 'dias_semana', 'horario_limite', 'vigencia', 'designados']) {
      const field = processosCol.fields.getByName(name)
      if (field) processosCol.fields.removeByName(name)
    }
    app.save(processosCol)

    const tarefasCol = app.findCollectionByNameOrId('tarefas')
    for (const name of [
      'critica',
      'tipo_registro',
      'medicao_alvo',
      'medicao_max',
      'medicao_unidade',
    ]) {
      const field = tarefasCol.fields.getByName(name)
      if (field) tarefasCol.fields.removeByName(name)
    }
    app.save(tarefasCol)

    const atribuicoesCol = app.findCollectionByNameOrId('atribuicoes')
    for (const name of ['horario_limite', 'medicao_valor', 'fora_padrao']) {
      const field = atribuicoesCol.fields.getByName(name)
      if (field) atribuicoesCol.fields.removeByName(name)
    }
    app.save(atribuicoesCol)
  },
)
