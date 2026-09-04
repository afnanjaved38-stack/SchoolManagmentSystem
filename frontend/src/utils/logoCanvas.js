import BRANDING from '../branding';

/** Canvas data URL with AJ monogram — used in PDF vouchers */
export function getAjLogoDataUrl(size = 200) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const r = size / 2;
  ctx.beginPath();
  ctx.arc(r, r, r - 2, 0, Math.PI * 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.strokeStyle = '#2563EB';
  ctx.lineWidth = size * 0.04;
  ctx.stroke();

  ctx.fillStyle = '#2563EB';
  ctx.font = `900 ${size * 0.38}px Arial, Helvetica, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(BRANDING.logoText, r, r + size * 0.02);

  return canvas.toDataURL('image/png', 1.0);
}

export default getAjLogoDataUrl;
