/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('users')

    // PIN numérico (4–6 dígitos) usado pelo colaborador para entrar no app.
    if (!usersCol.fields.getByName('pin')) {
      usersCol.fields.add(new Field({ name: 'pin', type: 'text' }))
      app.save(usersCol)
    }

    // Backfill idempotente: colaboradores existentes sem PIN recebem um PIN único.
    const semPin = app.findRecordsByFilter('users', `role = 'colaborador' && pin = ''`, '', 500, 0)
    const usados = new Set(
      app.findRecordsByFilter('users', `pin != ''`, '', 500, 0).map((u) => u.getString('pin', '')),
    )

    for (const u of semPin) {
      let pin = ''
      for (let i = 0; i < 50 && !pin; i++) {
        const cand = String(Math.floor(1000 + Math.random() * 9000))
        if (!usados.has(cand)) {
          pin = cand
          usados.add(cand)
        }
      }
      if (pin) {
        u.set('pin', pin)
        app.save(u)
      }
    }
  },
  (app) => {
    // Rollback sem ações destrutivas: o campo PIN permanece (inofensivo).
  },
)
