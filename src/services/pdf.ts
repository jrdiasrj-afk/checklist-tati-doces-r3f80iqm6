import { toast } from 'sonner'
import { jsPDF } from 'jspdf'
import type { CellDef, RowInput, HookData } from 'jspdf-autotable'
import autoTable from 'jspdf-autotable'
import type { AtribuicaoRecord } from '@/types'
import { calcularIndicadores, type Indicadores } from './indicadores'

/** Monta as linhas de dados do relatório (compartilhadas com o CSV). */
function linhasDoRelatorio(registros: AtribuicaoRecord[]) {
  return registros.map((r) => {
    const cleanDate = r.data.split('T')[0]
    const colabName = r.expand?.colaborador?.name || ''
    const colabSetor = r.expand?.colaborador?.setor || ''
    const colabEmail = r.expand?.colaborador?.email || ''
    const procName = r.expand?.tarefa?.expand?.processo?.nome || ''
    const procArea = r.expand?.tarefa?.expand?.processo?.area || ''
    const taskTitle = r.expand?.tarefa?.titulo || ''
    const concluidaEm = r.concluida_em ? new Date(r.concluida_em).toLocaleString('pt-BR') : ''
    const limite = r.horario_limite || (r.expand?.tarefa as any)?.horario_limite || ''
    const atrasoMin =
      r.status === 'concluida' && limite && r.concluida_em
        ? Math.max(
            0,
            Math.round(
              (new Date(r.concluida_em).getTime() -
                new Date(`${cleanDate}T${limite}:00`).getTime()) /
                60000,
            ),
          )
        : ''
    const registroExigido = (r.expand?.tarefa as any)?.tipo_registro || 'nenhum'

    return [
      cleanDate.split('-').reverse().join('/'),
      colabName || colabEmail,
      colabSetor,
      procName,
      procArea,
      taskTitle,
      r.status,
      limite,
      concluidaEm,
      String(atrasoMin),
      registroExigido,
      r.medicao_valor != null ? String(r.medicao_valor) : '',
      r.fora_padrao ? 'Sim' : 'Não',
      r.observacao || '',
      r.foto ? 'Sim' : 'Não',
    ]
  })
}

const HEADERS_PDF = [
  'Data',
  'Colaborador',
  'Setor',
  'Processo',
  'Área',
  'Tarefa',
  'Status',
  'Limite',
  'Concluída em',
  'Atraso (min)',
  'Registro',
  'Valor medido',
  'Fora do padrão',
  'Observação',
  'Foto',
]

const statusLabel: Record<string, string> = {
  concluida: 'Concluída',
  pendente: 'Pendente',
  nao_aplicavel: 'N/A',
}

/** Exporta o relatório do período filtrado em PDF (gerado no cliente). */
export function exportarRelatorioPDF(
  registros: AtribuicaoRecord[],
  filtros: { dataInicio: string; dataFim: string; colaborador: string; status: string },
) {
  if (registros.length === 0) {
    toast.warning('Nenhum dado para exportar.')
    return
  }

  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt' })
  const ind: Indicadores = calcularIndicadores(registros)
  const pageWidth = doc.internal.pageSize.getWidth()

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('Tati Check — Relatório de Atividades', 40, 40)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  const dataInicio = filtros.dataInicio.split('-').reverse().join('/')
  const dataFim = filtros.dataFim.split('-').reverse().join('/')
  const colaborador = filtros.colaborador === 'todos' ? 'Todos' : filtros.colaborador
  const status = statusLabel[filtros.status] || 'Todos'
  doc.text(`Período: ${dataInicio} a ${dataFim}`, 40, 58)
  doc.text(
    `Colaborador: ${colaborador}  ·  Status: ${status}  ·  Registros: ${registros.length}`,
    40,
    72,
  )
  doc.text(
    `Aplicação: ${ind.aplicacao}%  ·  Pontualidade: ${ind.pontualidade}%  ·  Esforço: ${ind.esforco}  ·  Score: ${ind.score}%`,
    40,
    86,
  )

  const body: RowInput[] = linhasDoRelatorio(registros).map((row) => {
    const [data, colab, setor, proc, area, tarefa, st, ...rest] = row
    const cell: CellDef[] = [
      { content: data },
      { content: colab },
      { content: setor },
      { content: proc },
      { content: area },
      { content: tarefa },
      { content: statusLabel[st] || st },
      ...rest.map((v) => ({ content: v })),
    ]
    return cell
  })

  autoTable(doc, {
    head: [HEADERS_PDF],
    body,
    startY: 100,
    margin: { left: 40, right: 40 },
    styles: { fontSize: 8, cellPadding: 4, overflow: 'linebreak' },
    headStyles: { fillColor: [224, 68, 124], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [255, 249, 242] },
    columnStyles: {
      13: { cellWidth: 140 },
    },
    didDrawPage: (data: HookData) => {
      const pageNum = doc.getNumberOfPages()
      doc.setFontSize(8)
      doc.setTextColor(138, 111, 111)
      doc.text(
        `Tati Doces · Tati Check — página ${pageNum}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 20,
        { align: 'center' },
      )
    },
  })

  doc.save(`tati-check-relatorio-${filtros.dataInicio}-a-${filtros.dataFim}.pdf`)
  toast.success('Relatório PDF exportado com sucesso!')
}
