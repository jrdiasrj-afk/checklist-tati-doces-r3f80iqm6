//
// Tati Check — atribuicoes.js
//
// 1) BLOQUEIO SERVIDOR: um update que mude `status` para 'concluida' numa
//    atribuição cuja tarefa exige evidência (tipo_registro='foto' ou 'video'
//    && evidencia_obrigatoria=true) é rejeitado sem o arquivo correspondente
//    — foto para tarefas de foto, vídeo para tarefas de vídeo.
// 2) CONFERÊNCIA IA: após concluir com foto, o agente nativo "fiscal-foto"
//    analisa a imagem e grava veredito (aprovado/duvidoso/reprovado) +
//    comentário curto em PT-BR na própria atribuição. Para vídeo, a conferência
//    também é disparada; se o agente não conseguir analisar o vídeo, grava
//    veredito 'erro' com comentário explicativo (o fluxo do colaborador segue).
//
// Regra do projeto: a tarefa PEDE foto/vídeo quando tipo_registro é
// 'foto'/'video' ou evidencia_obrigatoria=true; EXIGE quando
// tipo_registro='foto'/'video' && evidencia_obrigatoria=true.
//

// ===== 1) Bloqueio de conclusão sem evidência obrigatória (foto OU vídeo) =====
onRecordUpdateRequest((e) => {
  const rec = e.record

  const novoStatus = rec.getString('status', '')
  const statusAnterior = rec.original().getString('status', '')
  const estaConcluindo = novoStatus === 'concluida' && statusAnterior !== 'concluida'

  if (!estaConcluindo) {
    return e.next()
  }

  const info = e.requestInfo()
  const body = info.body || {}
  const trouxeArquivo = (campo) => {
    const v = body[campo]
    return Array.isArray(v) ? v.length > 0 : v != null && v !== ''
  }

  // Qual evidência já gravada OU vindo neste update satisfaz a exigência?
  const temFoto = rec.getString('foto', '') !== '' || trouxeArquivo('foto')
  const temVideo = rec.getString('video', '') !== '' || trouxeArquivo('video')
  if (temFoto || temVideo) {
    return e.next()
  }

  // A tarefa exige foto ou vídeo?
  const tarefaId = rec.getString('tarefa', '')
  try {
    const tarefa = $app.findRecordById('tarefas', tarefaId)
    const tipo = tarefa.getString('tipo_registro', '')
    const obrigatoria = tarefa.getBool('evidencia_obrigatoria')
    if (tipo === 'foto' && obrigatoria) {
      return e.badRequestError('Este item exige uma foto para ser concluído.')
    }
    if (tipo === 'video' && obrigatoria) {
      return e.badRequestError('Este item exige um vídeo de até 30 segundos para ser concluído.')
    }
  } catch (err) {
    // Tarefa removida: deixa seguir (comportamento anterior)
  }

  return e.next()
}, 'atribuicoes')

// ===== 2) Conferência IA da evidência (agente nativo fiscal-foto) =====
onRecordAfterUpdateSuccess((e) => {
  const rec = e.record
  const status = rec.getString('status', '')

  // Só confere quando o update concluiu o item E trouxe evidência (foto ou vídeo)
  if (status !== 'concluida') return e.next()

  const nomeFoto = rec.getString('foto', '')
  const nomeVideo = rec.getString('video', '')
  if (!nomeFoto && !nomeVideo) return e.next()

  const original = rec.original()
  const evidenciaMudou =
    nomeFoto !== original.getString('foto', '') || nomeVideo !== original.getString('video', '')
  const jaTemVeredito = rec.getString('foto_veredito', '') !== ''
  if (!evidenciaMudou || jaTemVeredito) {
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

  // Escolhe o arquivo a conferir: foto tem prioridade; senão o vídeo.
  const campo = nomeFoto !== '' ? 'foto' : 'video'
  const nomeArquivo = nomeFoto !== '' ? nomeFoto : nomeVideo
  const ehVideo = campo === 'video'
  const tipoMidia = ehVideo ? 'vídeo' : 'foto'

  let veredito = ''
  let comentario = ''
  try {
    const result = $ai.agent('fiscal-foto').chat({
      user_id: rec.getString('colaborador', ''),
      message:
        `Conferência de ${tipoMidia} de evidência de checklist. ${contextoTarefa}\n` +
        `Analise o anexo (${tipoMidia}: ${nomeArquivo}) e responda SOMENTE JSON: ` +
        `{"veredito":"aprovado|duvidoso|reprovado","comentario":"frase curta em PT-BR"}.` +
        (ehVideo
          ? '\nNota: o anexo é um vídeo; se você não conseguir analisar vídeo, responda ' +
            '{"veredito":"erro","comentario":"Conferência automática de vídeo indisponível"}.'
          : ''),
      file: nomeArquivo,
      collection: 'atribuicoes',
      record_id: rec.id,
    })
    const raw = (result && result.content) || ''
    try {
      const limpo = String(raw)
        .replace(/^```(?:json)?/i, '')
        .replace(/```$/, '')
        .trim()
      const parsed = JSON.parse(limpo)
      veredito = String(parsed.veredito || '')
      comentario = String(parsed.comentario || '')
    } catch (_) {
      comentario = String(raw).slice(0, 300)
    }
  } catch (err) {
    comentario = 'Conferência automática falhou: ' + (err && err.message ? err.message : err)
  }

  if (!['aprovado', 'duvidoso', 'reprovado', 'erro'].includes(veredito)) {
    veredito = 'erro'
    if (!comentario) comentario = 'Conferência automática indisponível.'
  }

  try {
    rec.set('foto_veredito', veredito)
    rec.set('foto_comentario', comentario)
    rec.set('foto_conferida_em', new Date().toISOString().replace('T', ' '))
    $app.save(rec)
  } catch (err) {
    // Não derruba a resposta por falha ao salvar o veredito
    console.log('fiscal-foto: falha ao salvar veredito:', err)
  }

  return e.next()
}, 'atribuicoes')
