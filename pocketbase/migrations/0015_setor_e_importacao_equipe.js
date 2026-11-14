/// <reference path="../pb_data/types.d.ts" />
//
// 0015 — Campo `setor` (select) na coleção users + importação idempotente da
// equipe REAL da Tati Doces (transcrita dos prints do sistema antigo Checa Ai).
//
// Idempotente: cria o campo se faltar; para cada pessoa, atualiza os dados
// (role/local/setor/PIN/e-mail) pelo e-mail interno (ou cria se não existir).
// NÃO cria nem remove atribuições — as tarefas virão depois do sistema antigo.
//
migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('users')

    // ---- 1. Campo setor (select, opcional) --------------------------------
    if (!usersCol.fields.getByName('setor')) {
      const setor = new Field({
        name: 'setor',
        type: 'select',
        maxSelect: 1,
        values: [
          'Batida',
          'Cozinha',
          'Gerência',
          'Produção',
          'Estoque',
          'Caixa',
          'Salão/Atendimento',
          'Recheios',
        ],
      })
      usersCol.fields.add(setor)
      app.save(usersCol)
    }

    // ---- 2. Equipe real ----------------------------------------------------
    // local: valores do select da coleção (fabrica/barao/uruguai/meier).
    // email: placeholder interno (campo é obrigatório no auth do PocketBase);
    //        quem tem e-mail real no sistema antigo recebe o e-mail real.
    const equipe = [
      {
        nome: 'Francisco',
        role: 'gerente',
        local: '',
        setor: '',
        pin: '2651',
        email: 'financeiro@tatidoces.com.br',
      },
      {
        nome: 'Adenir Marcos',
        role: 'colaborador',
        local: 'fabrica',
        setor: 'Batida',
        pin: '0581',
        email: '',
      },
      {
        nome: 'Alexandre',
        role: 'colaborador',
        local: 'barao',
        setor: 'Cozinha',
        pin: '6199',
        email: '',
      },
      {
        nome: 'Ana',
        role: 'colaborador',
        local: 'barao',
        setor: 'Gerência',
        pin: '2989',
        email: '',
      },
      {
        nome: 'Ana Carolina',
        role: 'colaborador',
        local: 'barao',
        setor: 'Gerência',
        pin: '4447',
        email: '',
      },
      {
        nome: 'Anderson',
        role: 'colaborador',
        local: 'barao',
        setor: 'Cozinha',
        pin: '7782',
        email: '',
      },
      {
        nome: 'Ayrton',
        role: 'colaborador',
        local: 'barao',
        setor: 'Cozinha',
        pin: '9960',
        email: '',
      },
      {
        nome: 'Daniel',
        role: 'colaborador',
        local: 'fabrica',
        setor: 'Batida',
        pin: '2443',
        email: '',
      },
      {
        nome: 'Dudu',
        role: 'colaborador',
        local: 'barao',
        setor: 'Cozinha',
        pin: '0694',
        email: '',
      },
      {
        nome: 'Erika',
        role: 'colaborador',
        local: 'fabrica',
        setor: 'Produção',
        pin: '0080',
        email: '',
      },
      {
        nome: 'Felipe',
        role: 'colaborador',
        local: 'fabrica',
        setor: 'Estoque',
        pin: '2476',
        email: '',
      },
      {
        nome: 'Gabriele Lima',
        role: 'colaborador',
        local: 'barao',
        setor: 'Caixa',
        pin: '4344',
        email: '',
      },
      {
        nome: 'Gabriella Oliveira',
        role: 'colaborador',
        local: 'meier',
        setor: 'Salão/Atendimento',
        pin: '8188',
        email: '',
      },
      {
        nome: 'Gisele Leão',
        role: 'gerente',
        local: 'barao',
        setor: 'Gerência',
        pin: '2346',
        email: 'giselelao@tatidoces.com.br',
      },
      {
        nome: 'Ionara',
        role: 'colaborador',
        local: 'uruguai',
        setor: 'Salão/Atendimento',
        pin: '7550',
        email: '',
      },
      {
        nome: 'Irley',
        role: 'colaborador',
        local: 'barao',
        setor: 'Cozinha',
        pin: '9132',
        email: '',
      },
      {
        nome: 'Jackqueline',
        role: 'colaborador',
        local: 'meier',
        setor: 'Cozinha',
        pin: '8298',
        email: '',
      },
      {
        nome: 'Joyce',
        role: 'colaborador',
        local: 'uruguai',
        setor: 'Gerência',
        pin: '7860',
        email: 'joyce@tatidoces.com.br',
      },
      {
        nome: 'Karla',
        role: 'colaborador',
        local: 'fabrica',
        setor: 'Batida',
        pin: '7973',
        email: '',
      },
      {
        nome: 'Viviane',
        role: 'colaborador',
        local: 'fabrica',
        setor: 'Recheios',
        pin: '1426',
        email: '',
      },
      {
        nome: 'Yuri',
        role: 'colaborador',
        local: 'fabrica',
        setor: 'Estoque',
        pin: '4481',
        email: '',
      },
    ]

    // E-mails já usados (para não colidir com o índice único de e-mail).
    const usadosEmail = new Set()
    try {
      const todos = app.findRecordsByFilter('users', 'id != ""', '', 500, 0)
      for (const u of todos) usadosEmail.add(u.getString('email', '').toLowerCase())
    } catch (_) {}

    for (const p of equipe) {
      const emailInterno = p.email || `${slugify(p.nome)}@interno.tatidoces.com.br`

      // busca por e-mail interno (chave da idempotência)
      let rec = null
      try {
        rec = app.findRecordByFilter('users', `email = '${emailInterno}'`, '', 1, 0)[0] || null
      } catch (_) {}

      if (rec) {
        rec.set('name', p.nome)
        rec.set('role', p.role)
        rec.set('local', p.local || '')
        rec.set('setor', p.setor || '')
        rec.set('pin', p.pin)
        app.save(rec)
      } else {
        const nova = new Record(usersCol)
        nova.set('name', p.nome)
        nova.set('email', emailInterno)
        nova.set('password', gerarSenha())
        nova.set('passwordConfirm', '')
        nova.set('verified', false)
        nova.set('role', p.role)
        nova.set('local', p.local || '')
        nova.set('setor', p.setor || '')
        nova.set('pin', p.pin)
        app.save(nova)
        usadosEmail.add(emailInterno.toLowerCase())
      }
    }

    // ---- 3. Colaboradores de exemplo/demo saem da lista de login por PIN ----
    // (não são apagados — apenas marcados; o hook de PIN ignora marcados)
    const nomesDemo = [
      'Maria Oliveira',
      'João Silva',
      'Pedro Santos',
      'Carla Mendes',
      'Rafael Costa',
    ]
    for (const nome of nomesDemo) {
      try {
        const demos = app.findRecordsByFilter('users', `name = '${nome}'`, '', 10, 0)
        for (const d of demos) {
          if (d.getString('pin', '') !== '') {
            d.set('pin', '')
            app.save(d)
          }
        }
      } catch (_) {}
    }
  },
  (app) => {
    // Rollback: remove apenas o campo setor (a importação permanece — idempotente).
    try {
      const usersCol = app.findCollectionByNameOrId('users')
      if (usersCol.fields.getByName('setor')) {
        usersCol.fields.removeByName('setor')
        app.save(usersCol)
      }
    } catch (_) {}
  },
)

function slugify(nome) {
  return nome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/(^\.|\.$)/g, '')
}

function gerarSenha() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  let s = ''
  for (let i = 0; i < 16; i++) s += chars.charAt(Math.floor(Math.random() * chars.length))
  return s
}
