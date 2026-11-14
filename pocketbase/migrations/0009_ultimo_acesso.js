/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('users')

    // Marca de "visto por último" — atualizada quando o colaborador abre a tela Hoje.
    if (!usersCol.fields.getByName('ultimo_acesso')) {
      usersCol.fields.add(new Field({ name: 'ultimo_acesso', type: 'date' }))
      app.save(usersCol)
    }
  },
  (app) => {
    // Rollback sem ações destrutivas: campo inofensivo permanece.
  },
)
