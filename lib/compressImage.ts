/**
 * Comprime uma imagem no browser antes do upload.
 *
 * Configurações:
 * - Largura máxima: 1280px (mantém proporção)
 * - Qualidade JPEG: 80%
 * - Saída: sempre image/jpeg (menor tamanho)
 * - GIFs são retornados sem compressão (animação seria perdida)
 */
export async function compressImage(file: File): Promise<File> {
  // GIF: não comprime para não perder animação
  if (file.type === 'image/gif') return file

  const MAX_WIDTH  = 1280
  const QUALITY    = 0.8

  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      // Calcula dimensões mantendo proporção
      let { width, height } = img
      if (width > MAX_WIDTH) {
        height = Math.round((height * MAX_WIDTH) / width)
        width  = MAX_WIDTH
      }

      const canvas = document.createElement('canvas')
      canvas.width  = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) { resolve(file); return }

      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return }
          // Mantém nome original mas troca extensão para .jpg
          const nomeBase = file.name.replace(/\.[^.]+$/, '')
          resolve(new File([blob], `${nomeBase}.jpg`, { type: 'image/jpeg' }))
        },
        'image/jpeg',
        QUALITY
      )
    }

    img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
    img.src = url
  })
}
