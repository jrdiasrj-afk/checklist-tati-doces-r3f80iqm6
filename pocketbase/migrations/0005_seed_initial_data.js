migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('users')
    const processosCol = app.findCollectionByNameOrId('processos')
    const tarefasCol = app.findCollectionByNameOrId('tarefas')
    const atribuicoesCol = app.findCollectionByNameOrId('atribuicoes')

    // 1. Seed Gerente inicial
    let gerenteUser
    try {
      gerenteUser = app.findAuthRecordByEmail('users', 'juniordias_rj@hotmail.com')
      if (gerenteUser.getString('role') !== 'gerente') {
        gerenteUser.set('role', 'gerente')
        app.save(gerenteUser)
      }
    } catch (_) {
      gerenteUser = new Record(usersCol)
      gerenteUser.setEmail('juniordias_rj@hotmail.com')
      gerenteUser.setPassword('Skip@Pass')
      gerenteUser.setVerified(true)
      gerenteUser.set('name', 'Junior Dias')
      gerenteUser.set('role', 'gerente')
      app.save(gerenteUser)
    }

    // 2. Seed Colaborador de exemplo para testar em tempo real e ver escala
    let colabUser
    try {
      colabUser = app.findAuthRecordByEmail('users', 'maria@tatidoces.com.br')
    } catch (_) {
      colabUser = new Record(usersCol)
      colabUser.setEmail('maria@tatidoces.com.br')
      colabUser.setPassword('Skip@Pass')
      colabUser.setVerified(true)
      colabUser.set('name', 'Maria Oliveira')
      colabUser.set('role', 'colaborador')
      app.save(colabUser)
    }

    // 3. Processos de exemplo
    const seedProcessos = [
      {
        nome: 'Abertura da Loja',
        descricao: 'Rotina de conferência e preparo inicial do balcão e vitrines para atendimento.',
        area: 'Loja',
        ativo: true,
        tarefas: [
          {
            titulo: 'Destrancar portas e ligar iluminação do salão',
            descricao: 'Verificar se as luminárias da vitrine principal estão acesas',
            ordem: 1,
            evidencia_obrigatoria: false,
          },
          {
            titulo: 'Higienizar vitrine principal e repor doces finos',
            descricao: 'Limpar vidros por dentro e por fora e organizar forminhas',
            ordem: 2,
            evidencia_obrigatoria: true,
          },
          {
            titulo: 'Ligar terminais de atendimento e checar papel na impressora',
            descricao: 'Testar conexão da maquininha e bobina térmica',
            ordem: 3,
            evidencia_obrigatoria: false,
          },
        ],
      },
      {
        nome: 'Higiene da Cozinha',
        descricao:
          'Higienização profunda das bancadas de confeitaria e controle térmico dos fornos.',
        area: 'Cozinha',
        ativo: true,
        tarefas: [
          {
            titulo: 'Ligar fornos e conferir temperatura de pré-aquecimento',
            descricao: 'Ajustar fornos industriais a 180°C e conferir termômetros',
            ordem: 1,
            evidencia_obrigatoria: false,
          },
          {
            titulo: 'Lavar bancadas com desinfetante próprio alimentício',
            descricao: 'Passar solução sanitizante nas 3 bancadas de inox',
            ordem: 2,
            evidencia_obrigatoria: true,
          },
          {
            titulo: 'Verificar validade das massas e recheios na câmara fria',
            descricao: 'Checar etiquetas com data de fabricação e descarte',
            ordem: 3,
            evidencia_obrigatoria: false,
          },
        ],
      },
      {
        nome: 'Fechamento de Caixa',
        descricao: 'Fechamento diário, contagem física e sangria de segurança.',
        area: 'Caixa',
        ativo: true,
        tarefas: [
          {
            titulo: 'Conferir sangria e fechar gaveta',
            descricao: 'Separar valor estipulado para fundo de caixa do dia seguinte',
            ordem: 1,
            evidencia_obrigatoria: true,
          },
          {
            titulo: 'Tirar relatório de fechamento do sistema PDV',
            descricao: 'Conferir totais de PIX, Cartão de Crédito/Débito e Dinheiro',
            ordem: 2,
            evidencia_obrigatoria: false,
          },
          {
            titulo: 'Guardar malote no cofre e trancar gaveteiros',
            descricao: 'Registrar assinatura no livro de controle de fechamento',
            ordem: 3,
            evidencia_obrigatoria: false,
          },
        ],
      },
    ]

    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const todayDateStr = `${year}-${month}-${day} 00:00:00.000Z`

    for (const procData of seedProcessos) {
      let procRecord
      try {
        procRecord = app.findFirstRecordByData('processos', 'nome', procData.nome)
      } catch (_) {
        procRecord = new Record(processosCol)
        procRecord.set('nome', procData.nome)
        procRecord.set('descricao', procData.descricao)
        procRecord.set('area', procData.area)
        procRecord.set('ativo', procData.ativo)
        procRecord.set('criado_por', gerenteUser.id)
        app.save(procRecord)
      }

      const createdTarefas = []
      for (const tData of procData.tarefas) {
        let tRecord
        try {
          const existing = app.findRecordsByFilter(
            'tarefas',
            `processo = '${procRecord.id}' && titulo = '${tData.titulo}'`,
            '',
            1,
            0,
          )
          if (existing.length > 0) {
            tRecord = existing[0]
          } else {
            throw new Error('not found')
          }
        } catch (_) {
          tRecord = new Record(tarefasCol)
          tRecord.set('processo', procRecord.id)
          tRecord.set('titulo', tData.titulo)
          tRecord.set('descricao', tData.descricao)
          tRecord.set('ordem', tData.ordem)
          tRecord.set('evidencia_obrigatoria', tData.evidencia_obrigatoria)
          tRecord.set('ativa', true)
          app.save(tRecord)
        }
        createdTarefas.push(tRecord)
      }

      // Se for "Abertura da Loja", gerar atribuições para hoje para o gerente e para a Maria
      if (procData.nome === 'Abertura da Loja' && createdTarefas.length > 0) {
        // Tarefa 0 (concluída)
        try {
          const filter = `tarefa = '${createdTarefas[0].id}' && colaborador = '${gerenteUser.id}' && data >= '${year}-${month}-${day} 00:00:00.000Z' && data <= '${year}-${month}-${day} 23:59:59.999Z'`
          const existing = app.findRecordsByFilter('atribuicoes', filter, '', 1, 0)
          if (existing.length === 0) {
            const at1 = new Record(atribuicoesCol)
            at1.set('tarefa', createdTarefas[0].id)
            at1.set('colaborador', gerenteUser.id)
            at1.set('data', todayDateStr)
            at1.set('status', 'concluida')
            at1.set('concluida_em', new Date().toISOString())
            at1.set('observacao', 'Abertura realizada com pontualidade. Tudo em ordem na vitrine.')
            app.save(at1)
          }
        } catch (_) {}

        // Tarefa 1 (pendente)
        try {
          const filter = `tarefa = '${createdTarefas[1].id}' && colaborador = '${gerenteUser.id}' && data >= '${year}-${month}-${day} 00:00:00.000Z' && data <= '${year}-${month}-${day} 23:59:59.999Z'`
          const existing = app.findRecordsByFilter('atribuicoes', filter, '', 1, 0)
          if (existing.length === 0) {
            const at2 = new Record(atribuicoesCol)
            at2.set('tarefa', createdTarefas[1].id)
            at2.set('colaborador', gerenteUser.id)
            at2.set('data', todayDateStr)
            at2.set('status', 'pendente')
            app.save(at2)
          }
        } catch (_) {}

        // Tarefa 2 para Maria (pendente)
        try {
          const filter = `tarefa = '${createdTarefas[2].id}' && colaborador = '${colabUser.id}' && data >= '${year}-${month}-${day} 00:00:00.000Z' && data <= '${year}-${month}-${day} 23:59:59.999Z'`
          const existing = app.findRecordsByFilter('atribuicoes', filter, '', 1, 0)
          if (existing.length === 0) {
            const at3 = new Record(atribuicoesCol)
            at3.set('tarefa', createdTarefas[2].id)
            at3.set('colaborador', colabUser.id)
            at3.set('data', todayDateStr)
            at3.set('status', 'pendente')
            app.save(at3)
          }
        } catch (_) {}
      }
    }
  },
  (app) => {
    // Seeds não exigem rollback destrutivo
  },
)
