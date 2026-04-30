export async function uploadToCloudinary(localUrl, uploadPreset, cloudName) {
  const blob = await fetch(localUrl).then(r => r.blob())
  const formData = new FormData()
  formData.append('file', blob)
  formData.append('upload_preset', uploadPreset)

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: 'POST', body: formData }
  )
  const data = await res.json()
  return data.secure_url
}

export async function sendAddToCart({
  variantId,
  quantity = 1,
  artworkLocalUrl,
  view,
  printArea,
  cloudName,
  uploadPreset
}) {
  // Upload artwork to Cloudinary first to get a permanent URL
  let designFileUrl = artworkLocalUrl
  try {
    designFileUrl = await uploadToCloudinary(artworkLocalUrl, uploadPreset, cloudName)
  } catch (e) {
    console.warn('[DTF] Cloudinary upload failed, using local URL', e)
  }

  // Fire postMessage to Shopify parent
  window.parent.postMessage({
    type: 'dtf:add-to-cart',
    payload: {
      variantId: Number(variantId),
      quantity,
      properties: {
        '_Design File': designFileUrl,
        '_View': view,
        '_Print Area': JSON.stringify(printArea),
        '_Customized': 'Yes'
      }
    }
  }, 'https://yourdtfplug.com')
}
