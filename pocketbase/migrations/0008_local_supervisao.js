/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('users')
    const processosCol = app.findCollectionByNameOrId('processos')

    // ---------- users.local / users.supervisor ----------
    if (!usersCol.fields.getByName('local')) {
      usersCol.fields.add(
        new Field({
          name: 'local',
          type: 'select',
          required: false,
          maxSelect: 1,
          values: ['fabrica', 'barao', 'uruguai', 'meier'],
        }),
      )
    }
    if (!usersCol.fields.getByName('supervisor')) {
      usersCol.fields.add(
        new Field({
          name: 'supervisor',
          type: 'relation',
          required: false,
          collectionId: usersCol.id,
          maxSelect: 1,
        }),
      )
    }
    app.save(usersCol)

    // ---------- processos.local ----------
    if (!processosCol.fields.getByName('local')) {
      processosCol.fields.add(
        new Field({
          name: 'local',
          type: 'select',
          required: false,
          maxSelect: 1,
          values: ['fabrica', 'barao', 'uruguai', 'meier'],
        }),
      )
    }
    app.save(processosCol)

    // ---------- coleção alertas ----------
    try {
      app.findCollectionByNameOrId('alertas')
    } catch (_) {
      const atribuicoesCol = app.findCollectionByNameOrId('atribuicoes')
      const alertasCol = new Collection({
        type: 'base',
        name: 'alertas',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: null,
        updateRule: null,
        deleteRule: null,
        fields: [
          {
            name: 'colaborador',
            type: 'relation',
            required: true,
            collectionId: usersCol.id,
            maxSelect: 1,
            cascadeDelete: false,
          },
          {
            name: 'supervisor',
            type: 'relation',
            required: false,
            collectionId: usersCol.id,
            maxSelect: 1,
            cascadeDelete: false,
          },
          {
            name: 'atribuicao',
            type: 'relation',
            required: true,
            collectionId: atribuicoesCol.id,
            maxSelect: 1,
            cascadeDelete: true,
          },
          {
            name: 'local',
            type: 'select',
            required: false,
            maxSelect: 1,
            values: ['fabrica', 'barao', 'uruguai', 'meier'],
          },
          {
            name: 'tipo',
            type: 'select',
            required: true,
            maxSelect: 1,
            values: ['fora_prazo', 'fim_dia'],
          },
          { name: 'mensagem', type: 'text', required: false, maxSize: 2000 },
          { name: 'criado_em', type: 'autodate', onCreate: true, onUpdate: false },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_alertas_atribuicao_tipo ON alertas (atribuicao, tipo)',
          'CREATE INDEX idx_alertas_local ON alertas (local)',
        ],
      })
      app.save(alertasCol)
    }

    // ---------- Backfill idempotente (no-op em banco vazio) ----------
    // Usuários: local por nome; supervisor derivado de gerente do mesmo local.
    const backfillUsers = [
      { nome: 'Junior Dias', local: 'meier' },
      { nome: 'Maria Oliveira', local: 'meier' },
    ]
    for (const item of backfillUsers) {
      let rec
      try {
        rec = app.findFirstRecordByFilter('users', `name = '${item.nome}'`)
      } catch (_) {
        continue
      }
      if (!rec || rec.getString('local') !== '') continue // já preenchido — idempotente

      let supId = ''
      try {
        const sup = app.findFirstRecordByFilter(
          'users',
          `role = 'gerente' && local = '${item.local}' && id != '${rec.id}'`,
        )
        supId = sup ? sup.id : ''
      } catch (_) {
        supId = ''
      }
      rec.set('local', item.local)
      if (supId) rec.set('supervisor', supId)
      app.save(rec)
    }

    // Como o backfill de supervisor roda em ordem, o gerente pode ainda não ter
    // local quando o colaborador é processado primeiro: garante o vínculo depois.
    try {
      const junior = app.findFirstRecordByFilter('users', "name = 'Junior Dias'")
      const maria = app.findFirstRecordByFilter('users', "name = 'Maria Oliveira'")
      if (junior && maria && junior.id !== maria.id) {
        if (junior.getString('local') === 'meier' && maria.getString('supervisor') === '') {
          maria.set('supervisor', junior.id)
          app.save(maria)
        }
      }
    } catch (_) {}

    // Processos: local por nome
    const backfillProcessos = [
      { nome: 'Abertura da Loja', local: 'barao' },
      { nome: 'Higiene da Cozinha', local: 'fabrica' },
      { nome: 'Fechamento de Caixa', local: 'meier' },
    ]
    for (const item of backfillProcessos) {
      let rec
      try {
        rec = app.findFirstRecordByFilter('processos', `nome = '${item.nome}'`)
      } catch (_) {
        continue
      }
      if (!rec || rec.getString('local') !== '') continue // já preenchido — idempotente
      rec.set('local', item.local)
      app.save(rec)
    }
  },
  (app) => {
    // Rollback: sem ações destrutivas (campos novos permanecem, inofensivos)
  },
)
