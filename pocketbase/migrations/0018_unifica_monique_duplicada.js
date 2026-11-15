// 0018 — Unificação de colaboradores duplicados: Monique (Méier)
//
// Mantém:   A = ooc7oe5wh88fi8c ("Monique",     pin 2819, Salão/Atendimento)
// Remove:   B = n1ylv58coasehcd ("Monique meier", pin 2718, Cozinha)
//
// B NÃO é deletado (preserva histórico/integridade). A migração:
//   1. Reaponta toda relação que aponta para B para A
//      (processos.designados, users.supervisor, atribuicoes.colaborador, alertas).
//   2. Deduplica atribuições: se A e B têm atribuição para a mesma
//      tarefa+data, mantém a mais recente de A e apaga a de B.
//   3. Copia supervisor de B para A quando A não tem.
//   4. Zera o PIN de B (some do login por PIN, mesmo padrão da 0015) e
//      renomeia para deixar claro que é registro duplicado/inativo.
//   5. Copia supervisor de B para A quando A não tem.
//   6. Renomeia B para deixar claro que é registro duplicado/inativo.
//
// Idempotente: cada passo só age sobre o que ainda existe/aponta para B.
// Rodar de novo é no-op e não quebra nada.
//
// NÃO tocar no par VITÓRIA MEIER (lojpkw9tud7q771) / VITORIA MENDES
// (o90tkz3ndigh356) — pessoas distintas em unidades diferentes.

migrate(
  (app) => {
    const ID_B = 'n1ylv58coasehcd'
    const ID_A = 'ooc7oe5wh88fi8c'

    // Confirma que ambos existem; se B não existir, nada a fazer (idempotente).
    let userB
    try {
      userB = app.findRecordById('users', ID_B)
    } catch (_) {
      console.log('0018: usuário B (n1ylv58coasehcd) não existe — nada a fazer.')
      return
    }
    let userA
    try {
      userA = app.findRecordById('users', ID_A)
    } catch (_) {
      throw new Error('0018: usuário A (ooc7oe5wh88fi8c) não encontrado — abortando unificação.')
    }

    app.runInTransaction((tx) => {
      // ---- 1. Copia supervisor de B para A quando A está sem supervisor ----
      const supervisorB = userB.getString('supervisor')
      if (supervisorB !== '' && userA.getString('supervisor') === '') {
        userA.set('supervisor', supervisorB)
        tx.save(userA)
        console.log('0018: supervisor de B copiado para A.')
      }

      // ---- 2. Reaponta users.supervisor que aponta para B ----
      const subordinados = tx.findRecordsByFilter('users', 'supervisor = {:b}', '', -1, 0, {
        b: ID_B,
      })
      for (const sub of subordinados) {
        sub.set('supervisor', ID_A)
        tx.save(sub)
      }
      if (subordinados.length > 0) {
        console.log(
          '0018: ' + subordinados.length + ' usuário(s) reapontados de B para A como supervisor.',
        )
      }

      // ---- 3. Reaponta processos.designados (multi-relação) ----
      const processos = tx.findRecordsByFilter('processos', 'designados ~ {:b}', '', -1, 0, {
        b: ID_B,
      })
      let processosAjustados = 0
      for (const proc of processos) {
        const designados = proc.getStringSlice('designados')
        if (designados.indexOf(ID_B) === -1) continue // filtro `~` pode trazer falso positivo
        const novos = []
        for (const id of designados) {
          if (id === ID_B) continue
          if (id === ID_A) continue // A já está lá — evita duplicar
          novos.push(id)
        }
        novos.push(ID_A)
        proc.set('designados', novos)
        tx.save(proc)
        processosAjustados++
      }
      if (processosAjustados > 0) {
        console.log(
          '0018: ' + processosAjustados + ' processo(s) com designados reapontados de B para A.',
        )
      }

      // ---- 4. Deduplica e reaponta atribuicoes.colaborador ----
      // Mantém a atribuição de A (a mais recente) para mesma tarefa+data;
      // apaga a de B nessas colisões; nas demais, reaponta para A.
      const atribsB = tx.findRecordsByFilter(
        'atribuicoes',
        'colaborador = {:b}',
        '-created',
        -1,
        0,
        { b: ID_B },
      )
      let reapontadas = 0
      let apagadas = 0
      for (const atr of atribsB) {
        const tarefaId = atr.getString('tarefa')
        const dataVal = atr.getString('data')
        // Existe atribuição de A para a mesma tarefa+data?
        const conflitosA = tx.findRecordsByFilter(
          'atribuicoes',
          'colaborador = {:a} && tarefa = {:t} && data = {:d}',
          '-created',
          -1,
          0,
          { a: ID_A, t: tarefaId, d: dataVal },
        )
        if (conflitosA.length > 0) {
          // Mantém a mais recente de A; apaga a de B (preserva o histórico de A).
          tx.delete(atr)
          apagadas++
        } else {
          atr.set('colaborador', ID_A)
          tx.save(atr)
          reapontadas++
        }
      }
      if (reapontadas + apagadas > 0) {
        console.log(
          '0018: atribuições — ' +
            reapontadas +
            ' reapontada(s) para A, ' +
            apagadas +
            ' duplicada(s) apagada(s).',
        )
      }

      // ---- 5. Reaponta alertas (colaborador e supervisor) ----
      const alertasColab = tx.findRecordsByFilter('alertas', 'colaborador = {:b}', '', -1, 0, {
        b: ID_B,
      })
      for (const al of alertasColab) {
        al.set('colaborador', ID_A)
        tx.save(al)
      }
      const alertasSup = tx.findRecordsByFilter('alertas', 'supervisor = {:b}', '', -1, 0, {
        b: ID_B,
      })
      for (const al of alertasSup) {
        al.set('supervisor', ID_A)
        tx.save(al)
      }
      if (alertasColab.length + alertasSup.length > 0) {
        console.log(
          '0018: ' +
            (alertasColab.length + alertasSup.length) +
            ' alerta(s) reapontado(s) de B para A.',
        )
      }

      // ---- 6. Neutraliza B: zera PIN e marca nome como duplicado ----
      userB.set('pin', '')
      const nomeAtual = userB.getString('name')
      if (nomeAtual !== 'Monique meier (duplicado - não usar)') {
        userB.set('name', 'Monique meier (duplicado - não usar)')
      }
      tx.save(userB)
      console.log('0018: PIN de B zerado e nome marcado como duplicado.')
    })
  },
  (app) => {
    // down: sem reversão de dados (unificação de registros não é reversível
    // sem recriar relações). Apenas loga.
    console.log('0018 down: unificação de Monique é irreversível por design.')
  },
)
