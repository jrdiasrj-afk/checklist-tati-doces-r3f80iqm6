migrate(
  (app) => {
    const tarefasCol = app.findCollectionByNameOrId('tarefas')

    const collection = new Collection({
      name: 'atribuicoes',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != '' && @request.auth.role = 'gerente'",
      updateRule:
        "@request.auth.id != '' && (@request.auth.role = 'gerente' || colaborador = @request.auth.id)",
      deleteRule: "@request.auth.id != '' && @request.auth.role = 'gerente'",
      fields: [
        {
          name: 'tarefa',
          type: 'relation',
          required: true,
          collectionId: tarefasCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'colaborador',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'data', type: 'date', required: true },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['pendente', 'concluida', 'nao_aplicavel'],
          maxSelect: 1,
        },
        { name: 'concluida_em', type: 'date', required: false },
        { name: 'observacao', type: 'text', required: false },
        {
          name: 'foto',
          type: 'file',
          required: false,
          maxSelect: 1,
          maxSize: 5242880,
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_atribuicoes_tarefa_colab_data ON atribuicoes (tarefa, colaborador, data)',
        'CREATE INDEX idx_atribuicoes_data ON atribuicoes (data)',
        'CREATE INDEX idx_atribuicoes_colaborador ON atribuicoes (colaborador)',
        'CREATE INDEX idx_atribuicoes_status ON atribuicoes (status)',
      ],
    })

    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('atribuicoes')
    app.delete(collection)
  },
)
