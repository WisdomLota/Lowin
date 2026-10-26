// Sends an HTML message to the configured Telegram chat.
// Returns false (and logs why) instead of throwing, so callers can decide what to do.
export async function sendTelegram(message: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) {
    console.error('Telegram not configured: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID missing')
    return false
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    })
    if (!res.ok) {
      console.error('Telegram sendMessage failed:', res.status, await res.text())
      return false
    }
    return true
  } catch (error) {
    console.error('Telegram request error:', error)
    return false
  }
}
