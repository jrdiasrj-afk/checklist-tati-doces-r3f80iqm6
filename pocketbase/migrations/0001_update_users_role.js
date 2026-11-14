migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')

    if (!users.fields.getByName('role')) {
      users.fields.add(
        new SelectField({
          name: 'role',
          required: true,
          values: ['gerente', 'colaborador'],
          maxSelect: 1,
        }),
      )
    }

    // Permite list e view para usuários autenticados para que dashboard exiba os colaboradores
    users.listRule = "@request.auth.id != ''"
    users.viewRule = "@request.auth.id != ''"
    // updateRule restrito ao próprio registro garantindo que colaborador não altere o próprio role
    users.updateRule = 'id = @request.auth.id && @request.body.role:changed = false'

    app.save(users)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    const roleField = users.fields.getByName('role')
    if (roleField) {
      users.fields.removeByName('role')
    }
    users.listRule = 'id = @request.auth.id'
    users.viewRule = 'id = @request.auth.id'
    users.updateRule = 'id = @request.auth.id'
    app.save(users)
  },
)
