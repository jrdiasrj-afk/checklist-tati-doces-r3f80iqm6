//
// Tati Check — atribuicoes.js
//
// 1) BLOQUEIO SERVIDOR: um update que mude `status` para 'concluida' numa
//    atribuição cuja tarefa exige foto (tipo_registro='foto' &&
//    evidencia_obrigatoria=true) é rejeitado sem arquivo `foto` no update.
// 2) CONFERÊNCIA IA: após concluir com foto, o agente nativo "fiscal-foto"
//    analisa a imagem e grava veredito (aprovado/duvidoso/reprovado) +
//    comentário curto em PT-BR na própria atribuição.
//
// Regra do projeto: a tarefa PEDE foto quando tipo_registro='foto' ou
// evidencia_obrigatoria=true; EXIGE foto quando tipo_registro='foto' &&
// evidencia_obrigatoria=true (a UI do gerente seta os dois juntos).
//

// ===== 1) Bloqueio de conclusão sem foto obrigatória =====
onRecordUpdateRequest((e) => {
  const rec = e.record

  const novoStatus = rec.getString('status', '')
  const statusAnterior = rec.original().getString('status', '')
  const estaConcluindo = novoStatus === 'concluida' && statusAnterior !== 'concluida'

  if (!estaConcluindo) {
    return e.next()
  }

  // Já tem foto gravada de um update anterior? (ex.: reenvio de foto reprovada)
  if (rec.getString('foto', '') !== '') {
    return e.next()
  }

  // O update atual trouxe um arquivo de foto?
  const info = e.requestInfo()
  const body = info.body || {}
  const arquivos = body.foto || []
  const trouxeFoto = Array.isArray(arquivos) ? arquivos.length > 0 : arquivos != null
  if (trouxeFoto) {
    return e.next()
  }

  // A tarefa exige foto?
  const tarefaId = rec.getString('tarefa', '')
  try {
    const tarefa = $app.findRecordById('tarefas', tarefaId)
    const exige =
      tarefa.getString('tipo_registro', '') === 'foto' && tarefa.getBool('evidencia_obrigatoria')
    if (exige) {
      return e.badRequestError('Este item exige uma foto para ser concluído.')
    }
  } catch (err) {
    // Tarefa inexistente: deixa a validação normal do PocketBase tratar
  }

  return e.next()
}, 'atribuicoes')

// ===== 2) Conferência IA da foto (agente nativo fiscal-foto) =====
onRecordAfterUpdateSuccess((e) => {
  const rec = e.record
  const status = rec.getString('status', '')

  // Só confere quando o update concluiu o item E trouxe/tem foto
  if (status !== 'concluida') return e.next()
  const nomeFoto = rec.getString('foto', '')
  if (!nomeFoto) return e.next()

  // Evita loop: reconfere somente quando a foto mudou ou o veredito saiu
  const original = rec.original()
  const fotoMudou = nomeFoto !== original.getString('foto', '')
  const jaTemVeredito = rec.getString('foto_veredito', '') !== ''
  if (!fotoMudou || jaTemVeredito) {
    return e.next()
  }

  const tarefaId = rec.getString('tarefa', '')
  let contextoTarefa = ''
  try {
    const tarefa = $app.findRecordById('tarefas', tarefaId)
    const procId = tarefa.getString('processo', '')
    let processoNome = ''
    try {
      processoNome = $app.findRecordById('processos', procId).getString('nome', '')
    } catch (_) {}
    contextoTarefa =
      `Tarefa: "${tarefa.getString('titulo', '')}"` +
      (processoNome ? ` (processo: ${processoNome})` : '')
    const desc = tarefa.getString('descricao', '')
    if (desc) contextoTarefa += `\nDescrição da tarefa: ${desc}`
    if (tarefa.getString('tipo_registro', '') === 'medicao') {
      contextoTarefa += `\nValor medido: ${rec.getFloat('medicao_valor', 0)}`
    }
    if (rec.getString('observacao', '')) {
      contextoTarefa += `\nObservação do colaborador: ${rec.getString('observacao', '')}`
    }
  } catch (_) {}

  try {
    const result = $ai.agent('fiscal-foto').chat({
      user_id: rec.getString('colaborador', ''),
      message:
        `Avalie a foto de evidência anexada.\n${contextoTarefa}\n\n` +
        `Responda OBRIGATORIAMENTE exatamente neste formato (uma linha):\n` +
        `VEREDITO: aprovado | duvidoso | reprovado\nCOMENTARIO: <frase curta em português explicando o veredito>`,
      files: [{ name: nomeFoto, collection: 'atribuicoes', id: rec.id }],
    })

    const texto = String(result?.content || '').toLowerCase()
    let veredito = ''
    if (texto.includes('reprovado')) veredito = 'reprovado'
    else if (texto.includes('duvidoso')) veredito = 'duvidoso'
    else if (texto.includes('aprovado')) veredito = 'aprovado'

    let comentario = ''
    const m = texto.match(/comentario\s*[:\-]\s*([^\n]+)/)
    if (m && m[1]) comentario = m[1].trim().slice(0, 480)

    if (veredito) {
      const fresh = $app.findRecordById('atribuicoes', rec.id)
      fresh.set('foto_veredito', veredito)
      fresh.set(
        'foto_comentario',
        comentario || 'Conferência automática concluída — confira a foto.',
      )
      fresh.set('foto_conferida_em', new Date())
      $app.save(fresh)
      console.log(`[fiscal-foto] ${rec.id}: ${veredito} — ${comentario}`)
    } else {
      const fresh = $app.findRecordById('atribuicoes', rec.id)
      fresh.set('foto_veredito', 'erro')
      fresh.set('foto_comentario', 'Não foi possível interpretar a resposta da conferência.')
      fresh.set('foto_conferida_em', new Date())
      $app.save(fresh)
      console.log(`[fiscal-foto] resposta não interpretada p/ ${rec.id}: ${texto.slice(0, 200)}`)
    }
  } catch (err) {
    console.log(`[fiscal-foto] falha IA para ${rec.id}: ${err.message || err}`)
    try {
      const fresh = $app.findRecordById('atribuicoes', rec.id)
      fresh.set('foto_veredito', 'erro')
      fresh.set('foto_comentario', 'Conferência automática indisponível neste momento.')
      fresh.set('foto_conferida_em', new Date())
      $app.save(fresh)
    } catch (_) {}
  }

  return e.next()
}, 'atribuicoes')
