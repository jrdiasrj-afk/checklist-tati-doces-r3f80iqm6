//
// Tati Check — trocar_pin.js
//
// Permite que o COLABORADOR (ou gerente) troque o PRÓPRIO PIN dentro do app,
// na tela Perfil, sem expor o valor do PIN pela API.
//
//   POST /backend/v1/auth/trocar-pin
//     { pin_atual, novo_pin, confirmar_pin }  →  { success: true }
//
// Validações (todas no servidor, e.auth é o usuário logado):
//   1. Autenticado (token de sessão, igual ao login por senha ou por PIN).
//   2. pin_atual confere com o PIN gravado do PRÓPRIO registro (nunca de
//      outro usuário — o alvo é sempre e.auth).
//   3. novo_pin: 4 a 6 dígitos numéricos e diferente do atual.
//   4. confirmar_pin igual ao novo_pin.
//   5. Novo PIN não pode colidir com o PIN de outra pessoa (índice único).
//
// Defesa adicional (defesa em profundidade): mesmo que alguém tente mudar
// `pin` direto no PATCH /api/collections/users/{id}, o hook de update abaixo
// exige o pin_atual no corpo da requisição para qualquer usuário que NÃO seja
// gerente. O gerente continua editando qualquer PIN na tela Equipe sem
// informar o PIN atual, como hoje.
//
// Nota JSVM: cada callback roda em uma VM isolada, sem acesso a declarações
// top-level — a lógica de validação fica toda dentro de cada handler.
//

routerAdd('POST', '/backend/v1/auth/trocar-pin', (e) => {
  const auth = e.auth
  if (!auth) {
    return e.json(401, { error: 'Não autenticado.' })
  }

  let body
  try {
    body = e.requestInfo().body
    if (typeof body === 'string') {
      body = JSON.parse(body)
    }
  } catch (_) {
    return e.json(400, { error: 'Corpo da requisição inválido (JSON esperado).' })
  }

  const pinAtual = String((body && body.pin_atual) || '').trim()
  const novoPin = String((body && body.novo_pin) || '').trim()
  const confirmarPin = String((body && body.confirmar_pin) || '').trim()

  if (!/^\d{4,6}$/.test(novoPin)) {
    return e.json(400, { error: 'O novo PIN deve ter de 4 a 6 dígitos numéricos.' })
  }
  if (novoPin !== confirmarPin) {
    return e.json(400, { error: 'A confirmação do novo PIN não confere.' })
  }

  // Recarrega o registro do PRÓPRIO usuário autenticado — nunca de outro.
  let rec
  try {
    rec = $app.findRecordById('users', auth.id)
  } catch (_) {
    return e.json(401, { error: 'Sessão inválida. Entre novamente.' })
  }

  const pinGravado = rec.getString('pin', '')
  if (pinGravado === '') {
    return e.json(400, {
      error:
        'Sua conta não possui PIN cadastrado. Peça ao gerente para definir um PIN na tela Equipe.',
    })
  }
  if (pinAtual !== pinGravado) {
    return e.json(400, { error: 'O PIN atual está incorreto.' })
  }
  if (novoPin === pinGravado) {
    return e.json(400, { error: 'O novo PIN deve ser diferente do PIN atual.' })
  }

  // O índice único de `pin` cobre a colisão, mas verificamos antes para
  // devolver uma mensagem amigável em vez de um erro bruto de constraint.
  const colisao = $app.findRecordsByFilter('users', `pin = '${novoPin}'`, '', 2, 0)
  for (let i = 0; i < colisao.length; i++) {
    if (colisao[i].id !== rec.id) {
      return e.json(400, {
        error: 'Este novo PIN já está em uso por outra pessoa. Escolha outro.',
      })
    }
  }

  rec.set('pin', novoPin)
  try {
    $app.save(rec)
  } catch (err) {
    return e.json(400, { error: 'Não foi possível salvar o novo PIN. Tente outro.' })
  }

  return e.json(200, { success: true })
})

//
// Defesa em profundidade no PATCH de users: se o corpo altera `pin` e quem
// chama NÃO é gerente, exigimos `pin_atual` correto no corpo. Gerente edita
// PIN de qualquer pessoa pela tela Equipe sem pin_atual, como hoje.
// (A regra de update da coleção já impede o colaborador de tocar em registro
// alheio — aqui reforçamos a validação do PIN atual no servidor.)
//
onRecordUpdateRequest((e) => {
  const rec = e.record
  const pinNovo = rec.getString('pin', '')
  const pinAnterior = rec.original().getString('pin', '')

  // Só intervenção quando o update realmente muda o PIN.
  if (pinNovo === pinAnterior || pinNovo === '') {
    return e.next()
  }

  const auth = e.auth
  if (!auth) {
    // Sem sessão: nada muda aqui (regra da coleção já bloqueia).
    return e.next()
  }

  const role = auth.getString('role', '')
  if (role === 'gerente') {
    return e.next() // gerente edita PIN livremente na Equipe
  }

  // Próprio usuário alterando o próprio PIN: exige o PIN atual no corpo.
  const info = e.requestInfo()
  let body = info.body || {}
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body)
    } catch (_) {
      body = {}
    }
  }
  const pinAtualInformado = String(body.pin_atual || '').trim()

  if (pinAtualInformado !== pinAnterior) {
    return e.badRequestError('Para alterar o seu PIN é necessário informar o PIN atual correto.')
  }

  return e.next()
}, 'users')
