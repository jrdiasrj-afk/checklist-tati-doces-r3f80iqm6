/// <reference path="../pb_data/types.d.ts" />
//
// Blindagem do campo PIN:
//  1. Índice ÚNICO no pin (colaboradores nunca dividem um mesmo PIN).
//  2. Regras da coleção users:
//     - list/view: só o próprio registro OU gerente — o colaborador não
//       consegue mais listar/ler os dados (incluindo PIN) de outras pessoas.
//     - update: o colaborador pode editar apenas os próprios dados e NUNCA
//       os campos sensíveis (pin, role, local, supervisor); o gerente pode
//       editar qualquer registro (é onde ele define o PIN na tela Equipe).
//     - create: apenas gerentes (cadastro de colaborador pela tela Equipe).
//     - delete: o próprio registro (mantém o comportamento anterior).
//
migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('users')

    // --- Índice único de PIN (parcial: só quando preenchido) ---
    const temIndice = usersCol.indexes.some((idx) => idx.includes('`pin`'))
    if (!temIndice) {
      usersCol.indexes.push(
        "CREATE UNIQUE INDEX `idx_users_pin` ON `users` (`pin`) WHERE `pin` != ''",
      )
      app.save(usersCol)
    }

    // --- Regras de acesso ---
    usersCol.listRule = "(@request.auth.role = 'gerente' || id = @request.auth.id)"
    usersCol.viewRule = "(@request.auth.role = 'gerente' || id = @request.auth.id)"
    usersCol.createRule = "@request.auth.role = 'gerente'"
    usersCol.updateRule =
      "(@request.auth.role = 'gerente' || (id = @request.auth.id && " +
      '@request.body.pin:isset = false && @request.body.role:isset = false && ' +
      '@request.body.local:isset = false && @request.body.supervisor:isset = false))'
    usersCol.deleteRule = 'id = @request.auth.id'
    app.save(usersCol)
  },
  (app) => {
    const usersCol = app.findCollectionByNameOrId('users')
    usersCol.listRule = "@request.auth.id != ''"
    usersCol.viewRule = "@request.auth.id != ''"
    usersCol.createRule = ''
    usersCol.updateRule = 'id = @request.auth.id && @request.body.role:changed = false'
    usersCol.deleteRule = 'id = @request.auth.id'
    app.save(usersCol)
  },
)
