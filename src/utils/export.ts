import Papa from 'papaparse'
import ExcelJS from 'exceljs'

export type ExportRow = Record<string, string | number | boolean | null | undefined>

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function exportRowsToCsv(filename: string, rows: ExportRow[]) {
  const csv = Papa.unparse(rows)
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), filename.endsWith('.csv') ? filename : `${filename}.csv`)
}

export function exportRowsToJson(filename: string, rows: ExportRow[]) {
  const json = JSON.stringify(rows, null, 2)
  downloadBlob(new Blob([json], { type: 'application/json;charset=utf-8;' }), filename.endsWith('.json') ? filename : `${filename}.json`)
}

export async function exportRowsToXlsx(filename: string, rows: ExportRow[], sheetName = 'Export') {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet(sheetName)
  const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))))

  worksheet.columns = headers.map((header) => ({
    header,
    key: header,
    width: Math.max(header.length + 2, 14),
  }))

  rows.forEach((row) => worksheet.addRow(row))
  const buffer = await workbook.xlsx.writeBuffer()
  downloadBlob(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`,
  )
}
