/**
 * 微信支付二维码展示组件
 * 使用第三方库 qrcode.react 生成二维码
 */

import { useEffect, useState } from 'react'

interface Props {
  url: string
  size?: number
}

export default function WechatQRCode({ url, size = 200 }: Props) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  
  useEffect(() => {
    // 动态加载 QRCode 库
    import('qrcode').then((QRCode) => {
      QRCode.toDataURL(url, {
        width: size,
        margin: 2,
        color: {
          dark: '#000',
          light: '#fff'
        }
      }).then((dataUrl: string) => {
        setQrDataUrl(dataUrl)
      }).catch((err: any) => {
        console.error('[QRCode] 生成失败:', err)
      })
    }).catch((err) => {
      console.error('[QRCode] 加载失败:', err)
    })
  }, [url, size])
  
  if (!qrDataUrl) {
    return (
      <div 
        className="animate-pulse bg-gray-200 rounded" 
        style={{ width: size, height: size }}
      />
    )
  }
  
  return (
    <img 
      src={qrDataUrl} 
      alt="微信支付二维码" 
      className="rounded"
      style={{ width: size, height: size }}
    />
  )
}