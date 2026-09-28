import { QRCodeSVG } from 'qrcode.react';

/** Dark code on white with a quiet zone; at least 240px so it scans under venue lighting. */
export function QRBlock({ value, size = 248 }: { value: string; size?: number }) {
  return (
    <div className="inline-block rounded-[22px] bg-white p-4 shadow-[0_14px_30px_-18px_rgba(19,34,46,.5)]">
      <QRCodeSVG value={value} size={size} level="M" marginSize={0} fgColor="#13222E" bgColor="#FFFFFF" title="Card QR code" />
    </div>
  );
}
