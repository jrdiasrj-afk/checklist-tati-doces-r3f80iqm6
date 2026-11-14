//
// Gera automaticamente um PIN numérico único (4 dígitos) sempre que um
// colaborador é criado sem PIN — cobre tanto o cadastro pela tela Equipe
// quanto contas criadas direto no painel.
// O gerente pode visualizar/editar o PIN depois na tela Equipe.
//

onRecordCreateRequest((e) => {
  const rec = e.record
  const role = rec.getString('role', 'colaborador')
  const pin = rec.getString('pin', '')

  if (role === 'colaborador' && !/^\d{4,6}$/.test(pin)) {
    const usados = new Set(
      $app.findRecordsByFilter('users', "pin != ''", '', 500, 0).map((u) => u.getString('pin', '')),
    )
    let novo = ''
    for (let i = 0; i < 50 && !novo; i++) {
      const cand = String(Math.floor(1000 + Math.random() * 9000))
      if (!usados.has(cand)) novo = cand
    }
    if (novo) rec.set('pin', novo)
  }

  e.next()
}, 'users')
