//
// 0017 — Importação dos checklists do sistema antigo Checa Ai (listagem colada
// pelo usuário) + colaboradores citados como responsáveis que ainda não existiam.
//
// Regras decididas pelo usuário:
//  - cada linha da listagem = 1 checklist (processo) com título, unidade,
//    recorrência, horário-limite e responsável (o ID antigo no fim da linha é
//    ignorado — na exportação do Checa Ai a coluna de ID saía deslocada);
//  - "mensal" na linha da Troca de Armadilhas é o que vale (a listagem manda);
//  - responsáveis citados que não existem são criados como colaboradores com
//    PIN de 4 dígitos único, local e setor da linha onde aparecem;
//  - idempotente: não duplica processo com mesmo título+unidade (reexecutar é
//    no-op); se o processo já existir com tarefas, elas são preservadas;
//  - tarefas internas NÃO são inventadas (não vieram na listagem).
//
migrate(
  (app) => {
    // ---- 1. Valor 'ASG' no select de setor dos usuários --------------------
    const usersCol = app.findCollectionByNameOrId('users')
    const setorField = usersCol.fields.getByName('setor')
    if (setorField) {
      const vals = setorField.values || []
      if (vals.indexOf('ASG') === -1) {
        setorField.values = vals.concat(['ASG'])
        app.save(usersCol)
      }
    }

    // ---- 2. 'quinzenal' e 'mensal' no select de recorrência dos processos ---
    const procCol = app.findCollectionByNameOrId('processos')
    const recField = procCol.fields.getByName('recorrencia')
    if (recField) {
      const vals = recField.values || []
      const novos = []
      if (vals.indexOf('quinzenal') === -1) novos.push('quinzenal')
      if (vals.indexOf('mensal') === -1) novos.push('mensal')
      if (novos.length > 0) {
        recField.values = vals.concat(novos)
        app.save(procCol)
      }
    }

    function normalizar(s) {
      return String(s || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
    }
    function slugify(nome) {
      return normalizar(nome)
        .replace(/[^a-z0-9]+/g, '.')
        .replace(/^\.|\.$/g, '')
    }
    function gerarSenha() {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
      let s = ''
      for (let i = 0; i < 16; i++) s += chars.charAt(Math.floor(Math.random() * chars.length))
      return s
    }

    // ---- 3. Colaboradores citados que não existiam --------------------------
    const equipeNova = [
      { nome: 'Maria Clara', local: 'barao', setor: 'Salão/Atendimento', pin: '1122' },
      { nome: 'Maria Luiza', local: 'barao', setor: 'Caixa', pin: '2210' },
      { nome: 'VITÓRIA MEIER', local: 'meier', setor: 'Salão/Atendimento', pin: '3315' },
      { nome: 'Luíza Cláudia', local: 'barao', setor: 'Gerência', pin: '4420' },
      { nome: 'MILENE CAMARGO', local: 'uruguai', setor: 'Gerência', pin: '5531' },
      { nome: 'Rozalia', local: 'barao', setor: 'Salão/Atendimento', pin: '6645' },
      { nome: 'Leonardo', local: 'barao', setor: 'ASG', pin: '7756' },
      { nome: 'VANESSSA PAIVA', local: 'barao', setor: 'Gerência', pin: '8867' },
      { nome: 'Luana', local: 'barao', setor: 'Salão/Atendimento', pin: '9978' },
      { nome: 'Val', local: 'uruguai', setor: 'Cozinha', pin: '1234' },
      { nome: 'Mariane', local: 'fabrica', setor: 'Produção', pin: '4321' },
      { nome: 'Monique meier', local: 'meier', setor: 'Cozinha', pin: '2718' },
      { nome: 'Monique', local: 'meier', setor: 'Salão/Atendimento', pin: '2819' },
      { nome: 'VITORIA MENDES', local: 'uruguai', setor: 'Salão/Atendimento', pin: '2920' },
      { nome: 'Mirella', local: 'barao', setor: 'Salão/Atendimento', pin: '3031' },
      { nome: 'Stefany Bezerra', local: 'barao', setor: 'Salão/Atendimento', pin: '3142' },
      { nome: 'Nathália', local: 'fabrica', setor: 'Produção', pin: '3253' },
      { nome: 'Thais', local: 'fabrica', setor: 'Produção', pin: '3364' },
    ]

    // Índices do que já existe (nomes normalizados → id, pins e e-mails usados)
    const idPorNome = {}
    const pinsUsados = new Set()
    const emailsUsados = new Set()
    const todosUsers = app.findRecordsByFilter('users', 'id != ""', '', 500, 0)
    for (const u of todosUsers) {
      const n = normalizar(u.getString('name', ''))
      if (n && !idPorNome[n]) idPorNome[n] = u.id
      const p = u.getString('pin', '')
      if (p) pinsUsados.add(p)
      emailsUsados.add(u.getString('email', '').toLowerCase())
    }

    for (const p of equipeNova) {
      const email = slugify(p.nome) + '@interno.tatidoces.com.br'
      let pin = p.pin
      if (pinsUsados.has(pin)) {
        pin = ''
        for (let i = 0; i < 200 && !pin; i++) {
          const cand = String(Math.floor(1000 + Math.random() * 9000))
          if (!pinsUsados.has(cand)) pin = cand
        }
      }
      if (!pin) continue

      if (idPorNome[normalizar(p.nome)]) {
        // já existe (reexecução ou outro e-mail): garante só o PIN
        try {
          const rec = app.findRecordById('users', idPorNome[normalizar(p.nome)])
          if (!rec.getString('pin', '')) {
            rec.set('pin', pin)
            app.save(rec)
          }
        } catch (_) {}
        pinsUsados.add(pin)
        continue
      }

      const nova = new Record(usersCol)
      nova.set('name', p.nome)
      nova.set('email', email)
      nova.set('password', gerarSenha())
      nova.set('passwordConfirm', '')
      nova.set('verified', false)
      nova.set('role', 'colaborador')
      nova.set('local', p.local)
      nova.set('setor', p.setor)
      nova.set('pin', pin)
      app.save(nova)
      idPorNome[normalizar(p.nome)] = nova.id
      pinsUsados.add(pin)
      emailsUsados.add(email)
    }

    // ---- 4. Checklists (processos) ------------------------------------------
    // Formato de cada linha: titulo|unidade|recorrencia|horario|responsavel|setor
    const linhas = [
      'abertura de loja|Barão de Mesquita|diaria|08:30|maria clara|Salão/Atendimento',
      'Caixa - Rotinas diárias|Barão de Mesquita|diaria|09:30|Maria Luiza|Caixa',
      'Caixa - Rotinas diárias|Fábrica|diaria|09:30||Estoque',
      'Abertura Gerencia - Atividades diária|Méier|diaria|09:45|VITÓRIA MEIER|Salão/Atendimento',
      'PEDIDOS CLIENTES PRONTO ENTREGA|Barão de Mesquita|diaria|09:45|Luíza Cláudia|Gerência',
      'Abertura Gerencia - Atividades diária|Uruguai|diaria|09:45|MILENE CAMARGO|Gerência',
      'PEDIDOS CLIENTES RETIRADA 1 TURNO PRONTO|Uruguai|diaria|09:45||Gerência',
      'PEDIDOS CLIENTES PRONTO RETIRADA 1 TURNO|Méier|diaria|09:45||Gerência',
      'Abertura balcão|Barão de Mesquita|diaria|09:50|Rozalia|Salão/Atendimento',
      'verificar as validades dos produtos da vitrine|Méier|diaria|11:00|ionara|Salão/Atendimento',
      'limpeza e lavagem da vitrine|Méier|diaria|11:00|ionara|Salão/Atendimento',
      '1ª Rotina limpeza - Rotina Diária|Barão de Mesquita|diaria|11:00|Leonardo|ASG',
      'Acompanhamento caixa- Rotina diária Cópia|Méier|diaria|11:30|VITÓRIA MEIER|Gerência',
      'Passagem Turno Balcão - Rotina Diária|Barão de Mesquita|diaria|11:30|Rozalia|Gerência',
      'Acompanhamento caixa- Rotina diária|Barão de Mesquita|diaria|12:00|Gisele Leão|Gerência',
      'Acompanhamento caixa- Rotina diária Cópia|Barão de Mesquita|diaria|12:00|Gisele Leão|Gerência',
      'Degustação|Barão de Mesquita|diaria|12:00|VANESSSA PAIVA|Gerência',
      'Degustação|Barão de Mesquita|diaria|12:00|Gisele Leão|Gerência',
      'veriifcar a validade dos produtos da vitrine|Barão de Mesquita|diaria|12:00|Luana|Salão/Atendimento',
      'limpeza e organizaçaõ da vitrine|Barão de Mesquita|diaria|12:30|Luana|Salão/Atendimento',
      'PEDIDOS CLIENTES RETIRADA 2 TURNO PRONTO|Uruguai|diaria|13:00||Gerência',
      'PEDIDOS CLIENTES PRONTO RETIRADA 2 TURNO|Méier|diaria|13:00||Gerência',
      'câmara Lavar 1 vez por semana|Uruguai|semanal|13:00|Ana|Cozinha',
      'Tortas Geladas|Barão de Mesquita|diaria|13:00|Gisele Leão|Gerência',
      'Tortas Geladas|Barão de Mesquita|diaria|13:00|VANESSSA PAIVA|Gerência',
      'PEDIDOS CLIENTES PRONTO ENTREGA 2 TURNO|Barão de Mesquita|diaria|13:00|Luíza Cláudia|Gerência',
      'limpeza do chão|Barão de Mesquita|diaria|13:00||Salão/Atendimento',
      'Caixa - Rotinas diárias Cópia|Barão de Mesquita|diaria|14:00|Gabriele Lima|Caixa',
      'VERIFICAR SE TEM MATÉRIA-PRIMA|Barão de Mesquita|semanal|15:00|Luíza Cláudia|Cozinha',
      'Tortas para fatia - atividade diária|Barão de Mesquita|diaria|16:30|Gisele Leão|Gerência',
      'Pedidos dia seguinte - Atividade diária|Barão de Mesquita|diaria|16:30|Gisele Leão|Gerência',
      'Pedidos dia seguinte - Atividade diária|Barão de Mesquita|diaria|16:30|VANESSSA PAIVA|Gerência',
      'Recebimento cozinha - rotina diária Cópia|Barão de Mesquita|diaria|16:30|Gisele Leão|Gerência',
      'Recebimento cozinha - rotina diária|Barão de Mesquita|diaria|16:30|Gisele Leão|Gerência',
      'Máquinas de cartão|Barão de Mesquita|diaria|19:00||Caixa',
      'Máquinas de cartão Cópia|Barão de Mesquita|diaria|19:00|Gabriele Lima|Caixa',
      'Fechamento Loja - Atividade diária|Barão de Mesquita|diaria|19:00|Gisele Leão|Gerência',
      'Caixa de morango|Barão de Mesquita|diaria|19:00|Gisele Leão|Gerência',
      'Caixa de morango Cópia|Barão de Mesquita|diaria|19:00|Gisele Leão|Gerência',
      'Fechamento balcão - atividade diária|Barão de Mesquita|diaria|19:30|VANESSSA PAIVA|Gerência',
      'lavar a vitrine|Barão de Mesquita|semanal|19:30|Luana|Salão/Atendimento',
      'Fechamento balcão - atividade diária|Barão de Mesquita|diaria|19:30|Gisele Leão|Gerência',
      'Rotina Confeitaria Diária|Barão de Mesquita|diaria||Anderson|Cozinha',
      'Limpeza Cozinha Diária (Rodizio Ana Lúcia / Val)|Uruguai|diaria||Val|Cozinha',
      'Produção Viviane - Atividade Semanal|Fábrica|diaria||Viviane|Produção',
      'Geladas - Rotina Diária|Fábrica|diaria||Mariane|Produção',
      'Atividade de Rodízio - Semanal|Barão de Mesquita|diaria||Anderson|Cozinha',
      'Limpeza Diária Balcão - Rotinas Diárias|Barão de Mesquita|diaria||Gabriele Lima|Salão/Atendimento',
      'Estoque - Rotina diária|Barão de Mesquita|diaria||Gisele Leão|Gerência',
      'Limpeza Cozinha Diária (Rodizio TAISSA/JACKELINE)|Méier|diaria||Monique meier|Cozinha',
      'Atividade de Rodízio - Semanal|Méier|diaria||Monique meier|Cozinha',
      'Morango para geleia|Barão de Mesquita|diaria||Luíza Cláudia|Gerência',
      'Validades|Barão de Mesquita|diaria||Gisele Leão|Gerência',
      'Controle de perda|Barão de Mesquita|diaria||Gisele Leão|Gerência',
      'Atividade de Rodízio - Semanal|Barão de Mesquita|diaria||Ayrton|Cozinha',
      'Atividade de Rodízio - Semanal|Barão de Mesquita|diaria||Irley|Cozinha',
      'Batida - Atividade Diária|Fábrica|diaria|||Batida',
      'Limpeza Diária (Rodizio / Vitoria MENDES)|Uruguai|diaria||VITORIA MENDES|Salão/Atendimento',
      'Balcão de Atendimento - 2|Uruguai|diaria||VITORIA MENDES|Salão/Atendimento',
      'Limpeza Diária (IONARA / GABRIELA)|Méier|diaria||gabriella oliveira|Salão/Atendimento',
      'Rotina Confeitaria Diária|Barão de Mesquita|diaria||Ayrton|Cozinha',
      'verificação da vitrine|Méier|diaria||ionara|Salão/Atendimento',
      '1ª Rotina Diária Gerencia Cozinha|Barão de Mesquita|diaria||Luíza Cláudia|Gerência',
      'limpeza dos banheiros e lixeiras|Méier|semanal||ionara|Salão/Atendimento',
      'DELIVERY|Barão de Mesquita|diaria||Mirella|Salão/Atendimento',
      'Limpeza Cozinha Diária (Rodizio TAISSA/JACKELINE)|Méier|diaria||Monique meier|Cozinha',
      'Validades Cópia|Barão de Mesquita|diaria||Gisele Leão|Gerência',
      'Mashmallow - Rotina diária|Barão de Mesquita|diaria||Luana|Cozinha',
      'Balcão de Atendimento - 2|Méier|diaria||VITÓRIA MEIER|Salão/Atendimento',
      'Limpeza Diária (Rodizio Priscila / Gabriele)|Barão de Mesquita|diaria||Gabriele Lima|Caixa',
      'Organização Louça|Barão de Mesquita|diaria||Leonardo|Cozinha',
      'Organização Fundos - Atividade semanal|Barão de Mesquita|semanal||Leonardo|Cozinha',
      'Organização Fundos - Atividade Diária|Barão de Mesquita|diaria||Leonardo|Cozinha',
      'Limpeza Cozinha Diária (Rodizio Monique/JACKELINE) Cópia|Méier|diaria||Monique|Salão/Atendimento',
      'Limpeza Semanal (Rodizio Priscila / Gabriele)|Barão de Mesquita|semanal||Gabriele Lima|Caixa',
      '2ª rotina diária gerencia cozinha|Barão de Mesquita|diaria||Luíza Cláudia|Gerência',
      'Limpeza Diária (Priscila / Gabriele)|Barão de Mesquita|diaria||Gabriele Lima|Caixa',
      'Passagem turno|Barão de Mesquita|diaria||Luíza Cláudia|Gerência',
      'PEDIDOS CLIENTES PRONTO RETIRADA 2 TURNO|Barão de Mesquita|diaria||Luíza Cláudia|Gerência',
      'PEDIDOS CLIENTES RETIRADA PRONTO|Barão de Mesquita|diaria||Luíza Cláudia|Gerência',
      '1ª Rotina gerencia frente - Diário|Barão de Mesquita|diaria||Gisele Leão|Gerência',
      'Produção Natália - Atividade Semanal|Fábrica|semanal||Nathália|Produção',
      'Caixa - Rotinas diárias|Barão de Mesquita|diaria||Maria Luiza|Caixa',
      'contagem e organização da vitrine|Barão de Mesquita|diaria||Gisele Leão|Salão/Atendimento',
      'verificação da abertura e fechamento da loja|Méier|diaria||VITÓRIA MEIER|Gerência',
      'verificar cozinha|Barão de Mesquita|diaria||Luíza Cláudia|Cozinha',
      'Produção Thais 02 - Atividade Semanal|Fábrica|semanal||Thais|Produção',
      'Produção Thais - Atividade Semanal Cópia|Fábrica|semanal||Thais|Produção',
      'Limpeza · ASG — Rotinas Diárias|Barão de Mesquita|diaria||Leonardo|Cozinha',
      'limpeza e organização verifiçao|Méier|diaria||gabriella oliveira|Salão/Atendimento',
      'Separação de material - Atividade semanal|Fábrica|semanal||Felipe|Estoque',
      'Estoque - Rotina diária|Barão de Mesquita|diaria||VANESSSA PAIVA|Gerência',
      'Abastecimento - Rotina Diária|Barão de Mesquita|diaria||Stefany Bezerra|Salão/Atendimento',
      'Controle de perda|Barão de Mesquita|diaria||VANESSSA PAIVA|Gerência',
      '1ª Rotina gerencia frente - Diário|Barão de Mesquita|diaria||VANESSSA PAIVA|Gerência',
      'Troca de Armadilhas moscas - Atividade Quinzenal|Barão de Mesquita|mensal||Leonardo|ASG',
      'Balcão de Atendimento - 2|Barão de Mesquita|diaria||Gabriele Lima|Caixa',
      'organização da vitrine|Barão de Mesquita|diaria||Stefany Bezerra|Salão/Atendimento',
      'organizar a vitrine do salgado|Barão de Mesquita|diaria||Luana|Salão/Atendimento',
      'Doceria - Atividades Diaria|Méier|diaria||Jackqueline|Cozinha',
      'Limpeza cozinha semanal (Rodizio Ana Lúcia / Val)|Uruguai|semanal||Ana|Salão/Atendimento',
      'Limpeza Prateleiras (Rodizio TAISSA/JACKELINE)|Méier|semanal||Monique meier|Salão/Atendimento',
      'troca do óleo da fritadeira|Barão de Mesquita|semanal||Alexandre|Cozinha',
      'Limpeza Cozinha Diária (Rodizio Ana Lúcia / Val)|Uruguai|diaria||Ana|Salão/Atendimento',
      'Balcão de Atendimento - 2|Méier|diaria||gabriella oliveira|Salão/Atendimento',
      'Limpeza Diária (Rodizio IONARA/GABRIELA)|Méier|diaria||gabriella oliveira|Salão/Atendimento',
      'Pedido|Barão de Mesquita|diaria||Luíza Cláudia|Gerência',
      'Rotinas Balcão - Atividades Semanais|Barão de Mesquita|semanal|||Salão/Atendimento',
      'Organização Velas Atividade Diária|Barão de Mesquita|semanal|||Salão/Atendimento',
      'Food to save|Barão de Mesquita|diaria||Luana|Salão/Atendimento',
      'Lavagem - Rotina semanal|Barão de Mesquita|semanal||Leonardo|Cozinha',
      'Lavar Calçada|Barão de Mesquita|semanal||Leonardo|Cozinha',
      'Troca de óleo|Barão de Mesquita|semanal||Dudu|Cozinha',
      'Produção Thais - Atividade Semanal|Fábrica|semanal||Thais|Produção',
      'Separação de receitas para produção - Atividade Diária|Fábrica|diaria||Felipe|Estoque',
      'Recebimento de material - Atividade Diária|Fábrica|diaria||Felipe|Estoque',
      'Rotina confeitaria - Atividade semanal|Barão de Mesquita|semanal||Anderson|Cozinha',
      'Limpeza Prateleiras (Rodizio Ana Lúcia / Val)|Uruguai|semanal||Val|Salão/Atendimento',
      'Limpeza cozinha semanal (Rodizio Ana Lúcia / Val)|Uruguai|semanal||Val|Salão/Atendimento',
      'Limpeza 1 x Semana (Rodizio Priscila/Gabriele)|Barão de Mesquita|semanal||Gabriele Lima|Caixa',
      'Limpeza Prateleiras (Rodizio Ana Lúcia / Val)|Uruguai|semanal||Ana|Salão/Atendimento',
      'Limpeza cozinha semanal (Rodizio TAISSA/JACKELINE)|Méier|semanal||Jackqueline|Cozinha',
      'Limpeza Prateleiras (Rodizio TAISSA/JACKELINE)|Méier|semanal||Jackqueline|Cozinha',
      'Limpeza cozinha semanal (Rodizio TAISSA/JACKELINE)|Méier|semanal||gabriella oliveira|Salão/Atendimento',
      'Limpeza 1 x Semana (Rodizio Mirelle/Vitoria)|Uruguai|semanal||VITORIA MENDES|Salão/Atendimento',
      'Limpeza Semanal (Rodizio / Vitoria MENDES)|Uruguai|semanal||VITORIA MENDES|Salão/Atendimento',
      'Rotina confeitaria - Atividade semanal|Barão de Mesquita|semanal||Irley|Cozinha',
      'Validades|Barão de Mesquita|semanal||Luíza Cláudia|Gerência',
      'Organização do estoque - Atividade Diária|Fábrica|diaria||Felipe|Estoque',
      'Limpeza 1 x Semana (Rodizio IONARA/Gabriele)|Méier|semanal||gabriella oliveira|Salão/Atendimento',
      'Separação de material 02 - Atividade Diária|Fábrica|semanal||Felipe|Estoque',
      'Rotina confeitaria - Atividade semanal|Barão de Mesquita|semanal||Ayrton|Cozinha',
      'Rotina confeitaria - Atividade semanal|Barão de Mesquita|semanal||Monique meier|Cozinha',
      'Tratamento morango|Barão de Mesquita|diaria||Dudu|Cozinha',
      'Doceira - 1 Rotina semanal|Fábrica|semanal||Erika|Produção',
      'Doceira - 2 Rotina semanal|Fábrica|semanal||Erika|Produção',
      'Rotina Confeitaria Diária|Méier|diaria||Monique meier|Cozinha',
      'Rotina Confeitaria Diária|Barão de Mesquita|diaria||Irley|Cozinha',
      'Câmara|Barão de Mesquita|diaria||Leonardo|Cozinha',
      'Fritadeira - Atividade Diária|Barão de Mesquita|diaria||Dudu|Cozinha',
    ]

    const UNIDADES = {
      'barao de mesquita': 'barao',
      fabrica: 'fabrica',
      uruguai: 'uruguai',
      meier: 'meier',
    }
    const AREA_POR_SETOR = {
      'Salão/Atendimento': 'Loja',
      Caixa: 'Caixa',
      Estoque: 'Estoque',
      Gerência: 'Loja',
      ASG: 'Limpeza',
      Cozinha: 'Cozinha',
      Produção: 'Cozinha',
      Batida: 'Cozinha',
      Recheios: 'Cozinha',
    }

    // Processos existentes: chave normalizada título+unidade (idempotência)
    const chaveExiste = {}
    const processosExistentes = app.findRecordsByFilter('processos', 'id != ""', '', 500, 0)
    for (const pr of processosExistentes) {
      const local = pr.getString('local', '')
      chaveExiste[normalizar(pr.getString('nome', '')) + '|' + local] = true
    }

    let criados = 0
    let duplicados = 0
    let semResponsavel = 0
    for (const linha of linhas) {
      const partes = linha.split('|')
      if (partes.length < 6) continue
      const titulo = partes[0].trim()
      const local = UNIDADES[normalizar(partes[1])] || ''
      const recorrencia = partes[2].trim()
      const horario = partes[3].trim()
      const respNome = partes[4].trim()
      const setor = partes[5].trim()

      const chave = normalizar(titulo) + '|' + local
      if (chaveExiste[chave]) {
        duplicados++
        continue
      }

      const designados = []
      if (respNome) {
        const respId = idPorNome[normalizar(respNome)]
        if (respId) {
          designados.push(respId)
        } else {
          semResponsavel++
          console.log('[import-checa-ai] responsável não encontrado:', respNome, '—', titulo)
        }
      }

      const novo = new Record(procCol)
      novo.set('nome', titulo)
      novo.set('descricao', 'Checklist importado do sistema antigo Checa Ai.')
      novo.set('area', AREA_POR_SETOR[setor] || 'Loja')
      novo.set('ativo', true)
      if (local) novo.set('local', local)
      if (setor) novo.set('setores', [setor])
      if (['diaria', 'semanal', 'quinzenal', 'mensal'].indexOf(recorrencia) !== -1) {
        novo.set('recorrencia', recorrencia)
      }
      novo.set('sem_horario', horario === '')
      if (horario) novo.set('horario_limite', horario)
      if (designados.length > 0) novo.set('designados', designados)
      app.save(novo)
      chaveExiste[chave] = true
      criados++
    }

    console.log(
      '[import-checa-ai] processos criados: ' +
        criados +
        ' | duplicados ignorados: ' +
        duplicados +
        ' | sem responsável encontrado: ' +
        semResponsavel,
    )
  },
  (app) => {
    // Rollback: a importação permanece (idempotente), como na migração 0015.
  },
)
