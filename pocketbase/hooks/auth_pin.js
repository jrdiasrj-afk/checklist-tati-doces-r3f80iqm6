//
// Rota de autenticação por PIN para colaboradores E GERENTES.
//   POST /backend/v1/auth/pin  { pin }  → { token, record }
//
// O campo `pin` é guardado em texto claro, de propósito: o gerente precisa
// CONSULTAR o PIN de cada pessoa na tela Equipe para poder passar a ela.
// A rota existe para que o PIN nunca precise ser exposto via listagem pública
// de usuários — quem autentica é o backend, que devolve um token de auth
// oficial do PocketBase (mesma sessão do login por senha).
//
// Desde a importação da equipe real (migração 0015), gerentes com PIN
// (Francisco, Gisele Leão) também entram por PIN e caem na dashboard.
//
// Nota JSVM: cada callback roda em uma VM isolada, sem acesso a declarações
// top-level — a lógica de busca/validação fica toda dentro do handler.
//

routerAdd('POST', '/backend/v1/auth/pin', (e) => {
  let body
  try {
    body = e.requestInfo().body
    if (typeof body === 'string') {
      body = JSON.parse(body)
    }
  } catch (_) {
    return e.json(400, { error: 'Corpo da requisição inválido (JSON esperado).' })
  }

  const pin = String((body && body.pin) || '').trim()
  if (!/^\d{4,6}$/.test(pin)) {
    return e.json(400, { error: 'PIN inválido. Informe de 4 a 6 dígitos numéricos.' })
  }

  // Colaboradores e gerentes com PIN cadastrado entram por PIN.
  const matches = $app.findRecordsByFilter(
    'users',
    `pin = '${pin}' && (role = 'colaborador' || role = 'gerente')`,
    '',
    2,
    0,
  )

  if (matches.length === 0) {
    return e.json(401, { error: 'PIN não encontrado. Confira com o seu supervisor.' })
  }

  const record = matches[0]

  // Token de auth oficial do PocketBase (mesmo formato do authWithPassword).
  const token = record.newAuthToken()
  record.set('ultimo_acesso', new Date().toISOString())
  $app.save(record)

  return e.json(200, {
    token: token,
    record: {
      id: record.id,
      name: record.getString('name'),
      email: record.getString('email'),
      avatar: record.getString('avatar'),
      role: record.getString('role'),
      local: record.getString('local'),
      setor: record.getString('setor'),
      ultimo_acesso: record.getString('ultimo_acesso'),
    },
  })
})

//
// Lista pública de nomes para o seletor da tela de login por PIN.
//   GET /backend/v1/auth/colaboradores  → { colaboradores: [{ id, name, local, role }] }
//
// Devolve APENAS id/nome/local/role — nunca PIN, e-mail ou dado sensível.
// Inclui gerentes que têm PIN (entraram por PIN também) e EXCLUI quem não
// tem PIN (ex.: contas demo/desativadas — o campo pin vazio as esconde).
//
routerAdd('GET', '/backend/v1/auth/colaboradores', (e) => {
  // Colaboradores criados pelo gerente NÃO são verificados por e-mail —
  // por isso NÃO filtramos por `verified` aqui (a lista viria vazia).
  const users = $app.findRecordsByFilter(
    'users',
    "pin != '' && (role = 'colaborador' || role = 'gerente')",
    'name',
    500,
    0,
  )

  const colaboradores = users.map((u) => ({
    id: u.id,
    name: u.getString('name'),
    local: u.getString('local'),
    role: u.getString('role'),
  }))

  return e.json(200, { colaboradores })
})
