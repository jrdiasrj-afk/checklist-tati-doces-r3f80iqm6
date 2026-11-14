/// <reference path="../pb_data/types.d.ts" />
/**
 * 0014 — Evidência em vídeo nas tarefas do checklist.
 *
 * 1) `tarefas.tipo_registro` ganha o valor 'video' (select único — os mesmos
 *    campos evidencia_obrigatoria true/false servem para vídeo obrigatório/
 *    opcional; 5 opções do gerente = nenhum/foto×2/video×2 + medicao/texto).
 * 2) `atribuicoes` ganha o campo `video` (file único, ~50MB, mp4/webm/mov)
 *    — espelho do campo `foto`, para não misturar mimes num campo só.
 */
migrate(
  (app) => {
    // 1) valor 'video' no select de tipo_registro
    const tarefas = app.findCollectionByNameOrId('tarefas')
    const tipoRegistro = tarefas.fields.getByName('tipo_registro')
    if (tipoRegistro && !tipoRegistro.values.includes('video')) {
      tipoRegistro.values.push('video')
      app.save(tarefas)
    }

    // 2) campo de arquivo de vídeo em atribuicoes
    const atrib = app.findCollectionByNameOrId('atribuicoes')
    if (!atrib.fields.getByName('video')) {
      atrib.fields.add(
        new FileField({
          name: 'video',
          maxSelect: 1,
          maxSize: 52428800, // 50 MB
          mimeTypes: ['video/mp4', 'video/webm', 'video/quicktime'],
        }),
      )
      app.save(atrib)
    }
  },
  (app) => {
    const atrib = app.findCollectionByNameOrId('atribuicoes')
    const f = atrib.fields.getByName('video')
    if (f) {
      atrib.fields.removeByName('video')
      app.save(atrib)
    }
    const tarefas = app.findCollectionByNameOrId('tarefas')
    const tipoRegistro = tarefas.fields.getByName('tipo_registro')
    if (tipoRegistro) {
      tipoRegistro.values = tipoRegistro.values.filter((v) => v !== 'video')
      app.save(tarefas)
    }
  },
)
