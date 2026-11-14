migrate(
  (app) => {
    const processosCol = app.findCollectionByNameOrId('processos')

    const collection = new Collection({
      name: 'tarefas',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != '' && @request.auth.role = 'gerente'",
      updateRule: "@request.auth.id != '' && @request.auth.role = 'gerente'",
      deleteRule: "@request.auth.id != '' && @request.auth.role = 'gerente'",
      fields: [
        {
          name: 'processo',
          type: 'relation',
          required: true,
          collectionId: processosCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'titulo', type: 'text', required: true, max: 150 },
        { name: 'descricao', type: 'text', required: false },
        { name: 'ordem', type: 'number', required: false },
        { name: 'evidencia_obrigatoria', type: 'bool', required: false },
        { name: 'ativa', type: 'bool', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_tarefas_processo ON tarefas (processo)',
        'CREATE INDEX idx_tarefas_ativa ON tarefas (ativa)',
      ],
    })

    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('tarefas')
    app.delete(collection)
  },
)
