migrate(
  (app) => {
    // Configura recorrência plausível nos processos já semeados (0005)
    const config = {
      'Abertura da Loja': {
        recorrencia: 'dias_semana',
        dias: [1, 2, 3, 4, 5, 6], // seg a sáb
        limite: '08:00',
      },
      'Higiene da Cozinha': {
        recorrencia: 'diaria',
        dias: [0, 1, 2, 3, 4, 5, 6],
        limite: '07:30',
      },
      'Fechamento de Caixa': {
        recorrencia: 'dias_semana',
        dias: [1, 2, 3, 4, 5, 6],
        limite: '18:00',
      },
    }

    const tarefasCriticas = {
      'Verificar validade das massas e recheios na câmara fria': {
        critica: true,
        tipo: 'medicao',
        alvo: 5,
        max: 5,
        unidade: '°C',
      },
      'Tirar relatório de fechamento do sistema PDV': {
        critica: false,
        tipo: 'texto',
      },
    }

    const processos = app.findRecordsByFilter('processos', '', '', 100, 0)
    for (const proc of processos) {
      const cfg = config[proc.getString('nome')]
      if (!cfg) continue
      proc.set('recorrencia', cfg.recorrencia)
      proc.set('dias_semana', cfg.dias)
      proc.set('horario_limite', cfg.limite)
      app.save(proc)
    }

    const tarefas = app.findRecordsByFilter('tarefas', '', '', 500, 0)
    for (const t of tarefas) {
      const cfg = tarefasCriticas[t.getString('titulo')]
      if (!cfg) continue
      t.set('critica', cfg.critica)
      t.set('tipo_registro', cfg.tipo)
      if (cfg.alvo !== undefined) t.set('medicao_alvo', cfg.alvo)
      if (cfg.max !== undefined) t.set('medicao_max', cfg.max)
      if (cfg.unidade !== undefined) t.set('medicao_unidade', cfg.unidade)
      app.save(t)
    }

    // Atribuições de exemplo: uma crítica ATRASADA de ontem e uma com medição
    const hoje = new Date()
    const ontem = new Date(hoje)
    ontem.setDate(ontem.getDate() - 1)
    const fmt = (d) => {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${dd} 00:00:00.000Z`
    }

    try {
      const critica = app.findFirstRecordByFilter(
        'tarefas',
        "titulo = 'Verificar validade das massas e recheios na câmara fria'",
      )
      const maria = app.findAuthRecordByEmail('users', 'maria@tatidoces.com.br')
      const atrasada = new Record(app.findCollectionByNameOrId('atribuicoes'))
      atrasada.set('tarefa', critica.id)
      atrasada.set('colaborador', maria.id)
      atrasada.set('data', fmt(ontem))
      atrasada.set('status', 'pendente')
      atrasada.set('horario_limite', '07:30')
      app.save(atrasada)
    } catch (_) {
      // seeds idempotentes: ignora se já existir
    }
  },
  (app) => {
    // Seeds não exigem rollback destrutivo
  },
)
