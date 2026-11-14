/// <reference path="../pb_data/types.d.ts" />
/**
 * 0013 — Conferência automática de fotos por IA.
 * 1) Campos novos em `atribuicoes` (veredito da conferência):
 *    - foto_veredito: select('aprovado' | 'duvidoso' | 'reprovado' | 'erro') — '' = sem conferência
 *    - foto_comentario: texto curto em PT-BR da IA
 *    - foto_conferida_em: autodate on update (quando a IA conferiu)
 * 2) Agente nativo Skip Cloud "fiscal-foto" (multimodal) definido via $ai.agents.define.
 */
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('atribuicoes')

    if (!col.fields.getByName('foto_veredito')) {
      col.fields.add(
        new SelectField({
          name: 'foto_veredito',
          values: ['aprovado', 'duvidoso', 'reprovado', 'erro'],
          maxSelect: 1,
        }),
      )
    }
    if (!col.fields.getByName('foto_comentario')) {
      col.fields.add(new TextField({ name: 'foto_comentario', max: 500 }))
    }
    if (!col.fields.getByName('foto_conferida_em')) {
      col.fields.add(new DateField({ name: 'foto_conferida_em' }))
    }

    app.save(col)

    $ai.agents.define(app, {
      slug: 'fiscal-foto',
      name: 'Fiscal de Fotos',
      description:
        'Analisa a foto de evidência de uma tarefa do checklist e dá veredito de qualidade.',
      systemPrompt:
        'Você é o fiscal de qualidade da Tati Doces (confeitaria). Analise a foto de evidência da tarefa informada e diga se ela mostra a execução correta. Responda com veredito (aprovado/duvidoso/reprovado) e um comentário curto em português.',
      tier: 'fast',
    })
  },
  (app) => {
    const col = app.findCollectionByNameOrId('atribuicoes')
    const campos = ['foto_veredito', 'foto_comentario', 'foto_conferida_em']
    campos.forEach((nome) => {
      const f = col.fields.getByName(nome)
      if (f) col.fields.removeByName(nome)
    })
    app.save(col)
    try {
      $ai.agents.delete(app, 'fiscal-foto')
    } catch (_) {}
  },
)
