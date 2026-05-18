import QRCode from 'qrcode'

export async function createQrDataUrl(value: string) {
  return QRCode.toDataURL(value, {
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 256,
  })
}

export async function createQrSvg(value: string) {
  return QRCode.toString(value, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 1,
    width: 256,
  })
}
