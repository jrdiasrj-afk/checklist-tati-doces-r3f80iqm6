//
// 0016 — Modelo "Checa Ai" para o cabeçalho do checklist:
//   - turno: texto opcional (ex. Abertura/Fechamento); sem turno vale o dia todo
//   - sem_horario: toggle "Checklist de Pendência (Sem Horário)" — zera o horário-limite
//   - setores: JSON array de setores (múltiplos setores por checklist)
//   - locais_extra: JSON array de unidades adicionais (além do `local` principal)
// Múltiplos responsáveis já existem no campo `designados` (relation list).
//
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('processos')
    col.fields.add(new TextField({ name: 'turno', required: false, max: 60 }))
    col.fields.add(new BoolField({ name: 'sem_horario' }))
    col.fields.add(new JSONField({ name: 'setores', required: false, maxSize: 2000 }))
    col.fields.add(new JSONField({ name: 'locais_extra', required: false, maxSize: 2000 }))
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('processos')
    col.fields.removeByName('turno')
    col.fields.removeByName('sem_horario')
    col.fields.removeByName('setores')
    col.fields.removeByName('locais_extra')
    app.save(col)
  },
)
