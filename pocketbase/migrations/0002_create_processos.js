migrate(
  (app) => {
    const collection = new Collection({
      name: 'processos',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != '' && @request.auth.role = 'gerente'",
      updateRule: "@request.auth.id != '' && @request.auth.role = 'gerente'",
      deleteRule: "@request.auth.id != '' && @request.auth.role = 'gerente'",
      fields: [
        { name: 'nome', type: 'text', required: true, max: 100 },
        { name: 'descricao', type: 'text', required: false },
        {
          name: 'area',
          type: 'select',
          required: true,
          values: ['Cozinha', 'Loja', 'Caixa', 'Limpeza', 'Estoque'],
          maxSelect: 1,
        },
        { name: 'ativo', type: 'bool', required: false },
        {
          name: 'criado_por',
          type: 'relation',
          required: false,
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_processos_ativo ON processos (ativo)',
        'CREATE INDEX idx_processos_area ON processos (area)',
      ],
    })

    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('processos')
    app.delete(collection)
  },
)
