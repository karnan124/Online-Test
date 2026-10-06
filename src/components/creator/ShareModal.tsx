import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import { Test } from '../../types/index';
import { Copy, Check, Download, QrCode, ExternalLink, X, Shield, Lock } from 'lucide-react';

interface ShareModalProps {
  test: Test;
  onClose: () => void;
  onTakeTestDirectly: (publicCode: string) => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ test, onClose, onTakeTestDirectly }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const testUrl = `${window.location.origin}/exam/${test.publicCode}`;

  useEffect(() => {
    QRCode.toDataURL(testUrl, {
      width: 280,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    })
      .then(url => setQrDataUrl(url))
      .catch(err => console.error('Failed to generate QR code:', err));
  }, [testUrl]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(testUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = () => {
    if (test.accessCode) {
      navigator.clipboard.writeText(test.accessCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `TestCloud_QR_${test.publicCode}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 mb-2">
            <QrCode className="w-5 h-5" />
          </div>
          <h3 className="text-base font-semibold text-white">Share Assessment</h3>
          <p className="text-xs text-slate-400 mt-0.5 max-w-xs mx-auto truncate">
            {test.title}
          </p>
        </div>

        {/* QR Code Canvas */}
        <div className="flex flex-col items-center justify-center bg-white p-4 rounded-xl mx-auto w-64 shadow-inner mb-4">
          {qrDataUrl ? (
            <img 
              src={qrDataUrl} 
              alt={`QR Code for ${test.publicCode}`} 
              className="w-56 h-56 rounded"
            />
          ) : (
            <div className="w-56 h-56 bg-slate-100 flex items-center justify-center text-xs text-slate-500">
              Generating QR Code...
            </div>
          )}
          <span className="text-[11px] font-mono font-bold text-slate-800 mt-2">
            CODE: {test.publicCode}
          </span>
        </div>

        {/* Public Link Box */}
        <div className="space-y-3 mb-5">
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Shareable Public Link (No Account Required for Candidates)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={testUrl}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 select-all"
              />
              <button
                onClick={handleCopyLink}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium flex items-center gap-1 shrink-0 transition-colors"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Optional Access Code */}
          {test.accessCode && (
            <div className="bg-amber-950/40 border border-amber-500/30 rounded-lg p-2.5 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-amber-300">
                <Lock className="w-3.5 h-3.5 shrink-0" />
                <span>Access Code: <strong className="font-mono text-white">{test.accessCode}</strong></span>
              </div>
              <button
                onClick={handleCopyCode}
                className="text-[11px] text-amber-400 hover:text-amber-200 underline"
              >
                {copiedCode ? 'Copied' : 'Copy Code'}
              </button>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
          <button
            onClick={handleDownloadQr}
            className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download QR</span>
          </button>

          <button
            onClick={() => {
              onClose();
              onTakeTestDirectly(test.publicCode);
            }}
            className="py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Test Candidate Flow</span>
          </button>
        </div>
      </div>
    </div>
  );
};
