//
// Rota de autenticação por PIN para colaboradores.
//   POST /backend/v1/auth/pin  { pin }  → { token, record }
//
// O campo `pin` é guardado em texto claro, de propósito: o gerente precisa
// CONSULTAR o PIN de cada pessoa na tela Equipe para poder passar a ela.
// A rota existe para que o PIN nunca precise ser exposto via listagem pública
// de usuários — quem autentica é o backend, que devolve um token de auth
// oficial do PocketBase (mesma sessão do login por senha).
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

  // Somente colaboradores entram por PIN; gerentes continuam por e-mail/senha.
  const matches = $app.findRecordsByFilter(
    'users',
    `pin = '${pin}' && role = 'colaborador'`,
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
      ultimo_acesso: record.getString('ultimo_acesso'),
    },
  })
})

//
// Lista pública de nomes de colaboradores para o seletor da tela de login.
//   GET /backend/v1/auth/colaboradores  → { colaboradores: [{ id, name, local }] }
//
// Devolve APENAS id/nome/local — nunca PIN, e-mail ou qualquer dado sensível.
//
routerAdd('GET', '/backend/v1/auth/colaboradores', (e) => {
  // Colaboradores criados pelo gerente NÃO são verificados por e-mail —
  // por isso NÃO filtramos por `verified` aqui (a lista viria vazia).
  const users = $app.findRecordsByFilter('users', "role = 'colaborador'", 'name', 500, 0)

  const colaboradores = users.map((u) => ({
    id: u.id,
    name: u.getString('name'),
    local: u.getString('local'),
  }))

  return e.json(200, { colaboradores })
})
